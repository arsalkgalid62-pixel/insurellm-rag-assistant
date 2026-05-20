import { BookOpen, FileText, FolderOpen } from "lucide-react";

interface Props {
  kbStats?: {
    vector_count: number;
    document_count: number;
    categories: Record<string, number>;
  } | null;
  indexReady: boolean;
}

export function KnowledgePage({ kbStats, indexReady }: Props) {
  const categories = kbStats?.categories ?? {
    company: 0,
    products: 0,
    employees: 0,
    contracts: 0,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/80 p-6 dark:bg-[#0f1419]">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indexed corporate documents powering retrieval
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="glass rounded-2xl p-5 shadow-card">
            <FolderOpen className="mb-2 h-8 w-8 text-teal-600" />
            <p className="text-2xl font-bold">{kbStats?.document_count ?? "—"}</p>
            <p className="text-xs text-slate-500">Markdown documents</p>
          </div>
          <div className="glass rounded-2xl p-5 shadow-card">
            <FileText className="mb-2 h-8 w-8 text-blue-600" />
            <p className="text-2xl font-bold">
              {kbStats?.vector_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-xs text-slate-500">Vector chunks</p>
          </div>
          <div className="glass rounded-2xl p-5 shadow-card">
            <BookOpen className="mb-2 h-8 w-8 text-violet-600" />
            <p className="text-2xl font-bold">{indexReady ? "Ready" : "Missing"}</p>
            <p className="text-xs text-slate-500">Index status</p>
          </div>
        </div>

        <div className="mt-8 glass rounded-2xl p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">Categories</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(categories).map(([name, count]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 px-4 py-3 capitalize dark:border-slate-700"
              >
                <span className="font-medium">{name}</span>
                <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-sm font-semibold text-teal-700 dark:text-teal-300">
                  {count} files
                </span>
              </div>
            ))}
          </div>
        </div>

        {!indexReady && (
          <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Run <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">python scripts/ingest.py</code> to build the index.
          </p>
        )}
      </div>
    </div>
  );
}
