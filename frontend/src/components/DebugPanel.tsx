import { motion } from "framer-motion";
import { Bug } from "lucide-react";
import type { DebugData } from "../types";

interface Props {
  debug: DebugData | null;
  open: boolean;
}

export function DebugPanel({ debug, open }: Props) {
  if (!open || !debug) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 max-h-48 overflow-auto rounded-xl border border-amber-500/30 bg-amber-50/80 p-4 font-mono text-[11px] dark:bg-amber-950/30"
    >
      <div className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Bug className="h-4 w-4" /> Debug mode
      </div>
      <p className="text-slate-600 dark:text-slate-400">
        Chunks: {debug.raw_chunk_count} · Scores: {debug.reranked_scores.join(", ")}
      </p>
      <pre className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
        {debug.prompt_system.slice(0, 1200)}…
      </pre>
    </motion.div>
  );
}
