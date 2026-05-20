import { motion } from "framer-motion";
import { ChevronRight, FileText } from "lucide-react";
import { useMemo } from "react";
import type { SourceChunk } from "../types";

interface Props {
  sources: SourceChunk[];
  filter: string;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}

function scoreColor(score: number) {
  if (score >= 78) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-slate-400";
}

export function SourcePanel({ sources, filter, activeId, onSelect, loading }: Props) {
  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return sources;
    return sources.filter(
      (s) =>
        s.filename.toLowerCase().includes(q) ||
        s.doc_type.toLowerCase().includes(q) ||
        s.excerpt.toLowerCase().includes(q)
    );
  }, [sources, filter]);

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-[#121a24]">
      <div className="border-b border-slate-200/80 px-4 py-4 dark:border-slate-800">
        <h2 className="text-sm font-semibold">Sources</h2>
        <p className="text-xs text-slate-500">
          {loading ? "Retrieving…" : `${filtered.length} cited chunks`}
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <FileText className="mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm">Sources appear after each answer</p>
          </div>
        )}
        {filtered.map((src, i) => (
          <motion.div
            key={src.id}
            layout
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(activeId === src.id ? null : src.id)}
            className={`cursor-pointer rounded-xl border bg-white p-3 shadow-card transition hover:shadow-md dark:bg-surface-card-dark ${
              activeId === src.id
                ? "border-teal-500 ring-2 ring-teal-500/20"
                : "border-slate-200/80 dark:border-slate-700"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {src.filename}
                </p>
                <p className="text-[10px] capitalize text-slate-500">{src.doc_type}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white ${scoreColor(src.relevance_score)}`}
                >
                  {src.relevance_score}%
                </span>
                <span className="text-[10px] text-slate-400">#{src.chunk_index}</span>
              </div>
            </div>
            <div
              className={`text-xs leading-relaxed text-slate-600 dark:text-slate-400 ${
                activeId === src.id ? "" : "line-clamp-3"
              }`}
              dangerouslySetInnerHTML={{ __html: src.highlighted_html }}
            />
            {activeId === src.id && (
              <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-teal-600">
                <ChevronRight className="h-3 w-3" /> Matched in retrieval
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </aside>
  );
}
