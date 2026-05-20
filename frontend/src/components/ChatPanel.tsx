import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Copy,
  Check,
  RefreshCw,
  Send,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { DebugPanel } from "./DebugPanel";
import { PipelineViz } from "./PipelineViz";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (text: string) => void;
  onRegenerate: () => void;
  onFollowUp: (q: string) => void;
  debugMode: boolean;
  input: string;
  onInput: (v: string) => void;
}

function ConfidenceBadge({ score, label }: { score: number; label?: string }) {
  const high = label === "high" || score >= 78;
  const med = label === "medium" || (score >= 55 && !high);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        high
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : med
            ? "bg-amber-500/15 text-amber-600"
            : "bg-slate-500/15 text-slate-500"
      }`}
    >
      {high ? "High confidence" : med ? "Medium confidence" : "Low confidence"} · {score}%
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-teal-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export function ChatPanel({
  messages,
  loading,
  onSend,
  onRegenerate,
  onFollowUp,
  debugMode,
  input,
  onInput,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PipelineViz
        pipeline={loading ? null : lastAssistant?.pipeline ?? null}
        loading={loading}
      />
      <DebugPanel debug={lastAssistant?.debug ?? null} open={debugMode} />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg py-20 text-center"
          >
            <h2 className="gradient-text text-2xl font-bold">How can I help you today?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Ask about products, employees, contracts, or company policy. Every answer is
              grounded in your knowledge base.
            </p>
          </motion.div>
        )}

        <div className="mx-auto max-w-3xl space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gradient-to-br from-teal-500 to-blue-600 text-white"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-card ${
                        msg.role === "user"
                          ? "rounded-tr-md bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                          : "rounded-tl-md glass dark:bg-slate-800/80"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                        {msg.streaming && (
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-teal-500" />
                        )}
                      </p>
                    </div>
                    <div
                      className={`mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 ${
                        msg.role === "user" ? "justify-end" : ""
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.role === "assistant" && msg.confidence != null && (
                        <ConfidenceBadge
                          score={msg.confidence}
                          label={msg.confidence_label}
                        />
                      )}
                      {msg.role === "assistant" && !msg.streaming && (
                        <>
                          <button
                            onClick={() => copy(msg.id, msg.content)}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {copied === msg.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy
                          </button>
                          <button
                            onClick={onRegenerate}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <RefreshCw className="h-3 w-3" /> Regenerate
                          </button>
                        </>
                      )}
                    </div>
                    {msg.role === "assistant" && msg.follow_ups && msg.follow_ups.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.follow_ups.map((q) => (
                          <button
                            key={q}
                            onClick={() => onFollowUp(q)}
                            className="rounded-full border border-teal-500/30 bg-teal-500/5 px-3 py-1.5 text-xs text-teal-700 transition hover:bg-teal-500/15 dark:text-teal-300"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="glass rounded-2xl rounded-tl-md">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !loading) onSend(input.trim());
          }}
          className="mx-auto flex max-w-3xl gap-2"
        >
          <input
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder="Ask anything about Insurellm…"
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-teal-500/30 focus:ring-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/25 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
