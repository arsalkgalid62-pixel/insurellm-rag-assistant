import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ChatPanel } from "./components/ChatPanel";
import { SourcePanel } from "./components/SourcePanel";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { KnowledgePage } from "./components/KnowledgePage";
import { SettingsPage } from "./components/SettingsPage";
import { fetchExamples, fetchHealth, fetchStats, streamChat } from "./lib/api";
import type { Message, NavPage, SourceChunk } from "./types";

function ts() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export type KbStats = {
  vector_count: number;
  document_count: number;
  categories: Record<string, number>;
};

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [page, setPage] = useState<NavPage>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<SourceChunk[]>([]);
  const [sourceFilter, setSourceFilter] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [model, setModel] = useState("openai/gpt-4.1-mini");
  const [models] = useState(["openai/gpt-4.1-mini", "openai/gpt-4.1-nano"]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tokens, setTokens] = useState(0);
  const [indexReady, setIndexReady] = useState(true);
  const [kbStats, setKbStats] = useState<KbStats | null>(null);
  const [examples, setExamples] = useState<
    { id: string; label: string; icon: string; queries: string[] }[]
  >([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const loadStats = useCallback(() => {
    fetchStats()
      .then(setKbStats)
      .catch(() => setKbStats(null));
  }, []);

  useEffect(() => {
    fetchHealth()
      .then((h) => {
        setIndexReady(h.index_ready);
        if (h.default_model) setModel(h.default_model);
      })
      .catch(() => setIndexReady(false));
    fetchExamples()
      .then((e) => setExamples(e.categories || []))
      .catch(() => {});
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (page === "analytics" || page === "knowledge") loadStats();
  }, [page, loadStats]);

  const runChat = useCallback(
    (text: string) => {
      if (!text.trim() || loading) return;
      setPage("chat");

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: text.trim(),
        timestamp: ts(),
      };
      const assistantId = uid();
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setSources([]);
      setActiveSource(null);

      const assistantPlaceholder: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: ts(),
        streaming: true,
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      streamChat(
        text.trim(),
        history,
        debugMode,
        model,
        (meta) => {
          setSources(meta.sources);
          setLatencyMs(meta.pipeline.latency_ms);
          setTokens((t) => t + (meta.pipeline.tokens_used || 0));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    sources: meta.sources,
                    pipeline: meta.pipeline,
                    confidence: meta.confidence,
                    confidence_label: meta.confidence_label,
                    follow_ups: meta.follow_ups,
                    debug: meta.debug,
                  }
                : m
            )
          );
        },
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m
            )
          );
        },
        () => {
          setLoading(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false, timestamp: ts() } : m
            )
          );
        },
        (err) => {
          setLoading(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${err.message}`, streaming: false }
                : m
            )
          );
        }
      );
    },
    [messages, loading, debugMode, model]
  );

  const regenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setMessages((prev) => {
        let idx = prev.length - 1;
        while (idx >= 0 && prev[idx].role !== "user") idx--;
        return idx >= 0 ? prev.slice(0, idx) : prev;
      });
      runChat(lastUser.content);
    }
  };

  const mainContent = () => {
    switch (page) {
      case "analytics":
        return (
          <AnalyticsPage messages={messages} indexReady={indexReady} kbStats={kbStats} />
        );
      case "knowledge":
        return <KnowledgePage kbStats={kbStats} indexReady={indexReady} />;
      case "settings":
        return (
          <SettingsPage
            dark={dark}
            onToggleTheme={() => setDark(!dark)}
            debugMode={debugMode}
            onDebugMode={setDebugMode}
            model={model}
            models={models}
            onModel={setModel}
          />
        );
      default:
        return (
          <div className="flex min-h-0 flex-1">
            <ChatPanel
              messages={messages}
              loading={loading}
              onSend={runChat}
              onRegenerate={regenerate}
              onFollowUp={runChat}
              debugMode={debugMode}
              input={input}
              onInput={setInput}
            />
            <SourcePanel
              sources={sources}
              filter={sourceFilter}
              activeId={activeSource}
              onSelect={setActiveSource}
              loading={loading && sources.length === 0}
            />
          </div>
        );
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? "dark" : ""}`}>
      <Sidebar
        page={page}
        onPage={setPage}
        dark={dark}
        onToggleTheme={() => setDark(!dark)}
        examples={examples}
        onExample={(q) => runChat(q)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          model={model}
          models={models}
          onModel={setModel}
          latencyMs={latencyMs}
          tokens={tokens}
          search={sourceFilter}
          onSearch={setSourceFilter}
          indexReady={indexReady}
          showSourceSearch={page === "chat"}
          pageTitle={page === "chat" ? "" : page}
        />
        {mainContent()}
      </div>
      {page === "chat" && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`fixed bottom-4 left-[300px] z-50 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg ${
            debugMode ? "bg-amber-500 text-white" : "glass text-slate-500"
          }`}
        >
          Debug {debugMode ? "ON" : "OFF"}
        </button>
      )}
    </div>
  );
}
