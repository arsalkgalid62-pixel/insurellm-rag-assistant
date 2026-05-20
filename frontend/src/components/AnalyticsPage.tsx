import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock,
  Database,
  Layers,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Message } from "../types";

interface Props {
  messages: Message[];
  indexReady: boolean;
  kbStats?: {
    vector_count: number;
    document_count: number;
    categories: Record<string, number>;
  } | null;
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function AnalyticsPage({ messages, indexReady, kbStats }: Props) {
  const assistantMsgs = messages.filter((m) => m.role === "assistant" && !m.streaming);
  const latencies = assistantMsgs
    .map((m) => m.pipeline?.latency_ms)
    .filter((n): n is number => n != null);
  const confidences = assistantMsgs
    .map((m) => m.confidence)
    .filter((n): n is number => n != null);
  const tokens = assistantMsgs
    .map((m) => m.pipeline?.tokens_used)
    .filter((n): n is number => n != null);
  const chunksUsed = assistantMsgs
    .map((m) => m.pipeline?.chunks_used)
    .filter((n): n is number => n != null);

  const lastPipeline = assistantMsgs[assistantMsgs.length - 1]?.pipeline;

  const docTypes: Record<string, number> = {};
  assistantMsgs.forEach((m) => {
    m.sources?.forEach((s) => {
      docTypes[s.doc_type] = (docTypes[s.doc_type] || 0) + 1;
    });
  });
  const maxType = Math.max(1, ...Object.values(docTypes));

  const cards = [
    {
      label: "Total queries",
      value: messages.filter((m) => m.role === "user").length,
      icon: MessageSquare,
      color: "from-teal-500 to-teal-600",
    },
    {
      label: "Avg latency",
      value: latencies.length ? `${avg(latencies)}ms` : "—",
      icon: Clock,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Avg confidence",
      value: confidences.length ? `${avg(confidences)}%` : "—",
      icon: TrendingUp,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Tokens used",
      value: tokens.reduce((a, b) => a + b, 0) || "—",
      icon: Zap,
      color: "from-violet-500 to-violet-600",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/80 p-6 dark:bg-[#0f1419]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            RAG pipeline metrics from your session · Index{" "}
            {indexReady ? (
              <span className="text-emerald-600">live</span>
            ) : (
              <span className="text-amber-600">offline</span>
            )}
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 shadow-card"
            >
              <div
                className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${c.color} p-2.5 text-white`}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-teal-600" />
              Knowledge base
            </h2>
            {kbStats ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Vector chunks</dt>
                  <dd className="font-semibold">{kbStats.vector_count.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Source documents</dt>
                  <dd className="font-semibold">{kbStats.document_count}</dd>
                </div>
                {Object.entries(kbStats.categories).map(([k, v]) => (
                  <div key={k} className="flex justify-between capitalize">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium">{v} files</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Loading stats…</p>
            )}
          </div>

          <div className="glass rounded-2xl p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-blue-600" />
              Sources cited (session)
            </h2>
            {Object.keys(docTypes).length === 0 ? (
              <p className="text-sm text-slate-500">Ask questions in Chat to see breakdown.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(docTypes).map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1 flex justify-between text-xs capitalize">
                      <span>{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxType) * 100}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {lastPipeline && (
          <div className="mb-8 glass rounded-2xl p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4" />
              Last query — pipeline breakdown
            </h2>
            <div className="flex flex-wrap gap-4">
              {lastPipeline.timeline.map((stage) => (
                <div
                  key={stage.name}
                  className="min-w-[120px] rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <p className="text-xs text-slate-500">{stage.name}</p>
                  <p className="text-lg font-bold text-teal-600">{stage.ms}ms</p>
                  {stage.detail && (
                    <p className="text-[10px] text-slate-400">{stage.detail}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Rewritten query: &ldquo;{lastPipeline.rewritten_query}&rdquo; ·{" "}
              {lastPipeline.chunks_used}/{lastPipeline.chunks_retrieved} chunks ·{" "}
              {lastPipeline.model}
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" />
            Query history
          </h2>
          {assistantMsgs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No queries yet. Go to <strong>Chat</strong> and ask a question to populate analytics.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-700">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Latency</th>
                    <th className="pb-2 pr-4">Confidence</th>
                    <th className="pb-2 pr-4">Chunks</th>
                    <th className="pb-2">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {assistantMsgs.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-2.5 pr-4 text-slate-500">{m.timestamp}</td>
                        <td className="py-2.5 pr-4">{m.pipeline?.latency_ms ?? "—"}ms</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              (m.confidence ?? 0) >= 78
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-amber-500/15 text-amber-600"
                            }`}
                          >
                            {m.confidence ?? "—"}%
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">{m.pipeline?.chunks_used ?? "—"}</td>
                        <td className="py-2.5">{m.pipeline?.tokens_used ?? "—"}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {chunksUsed.length > 0 && (
          <p className="mt-4 flex items-center gap-2 text-center text-xs text-slate-400">
            <Sparkles className="h-3 w-3" />
            Avg chunks per answer: {avg(chunksUsed)}
          </p>
        )}
      </div>
    </div>
  );
}
