import { AnimatePresence, motion } from "framer-motion";
import { Binary, ChevronDown, Layers, MessageSquare, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import type { PipelineData } from "../types";

const ICONS: Record<string, typeof Search> = {
  message: MessageSquare,
  binary: Binary,
  search: Search,
  layers: Layers,
  sparkles: Sparkles,
};

interface Props {
  pipeline: PipelineData | null;
  loading?: boolean;
}

export function PipelineViz({ pipeline, loading }: Props) {
  const [open, setOpen] = useState(true);

  if (!pipeline && !loading) return null;

  return (
    <div className="mx-4 mb-2 rounded-xl border border-slate-200/80 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        RAG pipeline
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 pb-4"
          >
            <div className="flex items-center justify-between gap-2 py-2">
              {pipeline?.stages.map((s, i) => {
                const Icon = ICONS[s.icon] || Search;
                const done = pipeline.timeline[i];
                return (
                  <div key={s.key} className="flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        loading && i === pipeline.timeline.length
                          ? "bg-teal-500/20 animate-pulse"
                          : done
                            ? "bg-teal-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="mt-1 text-[9px] font-medium text-slate-500">{s.label}</span>
                    {done && (
                      <span className="text-[9px] text-teal-600">{done.ms}ms</span>
                    )}
                  </div>
                );
              })}
            </div>
            {pipeline && (
              <p className="text-center text-[10px] text-slate-400">
                Rewritten: &ldquo;{pipeline.rewritten_query}&rdquo; · {pipeline.chunks_used}/
                {pipeline.chunks_retrieved} chunks
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
