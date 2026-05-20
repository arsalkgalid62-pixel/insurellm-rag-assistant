import { Activity, ChevronDown, Search, User, Zap } from "lucide-react";

interface Props {
  model: string;
  models: string[];
  onModel: (m: string) => void;
  latencyMs: number | null;
  tokens: number;
  search: string;
  onSearch: (s: string) => void;
  indexReady: boolean;
  showSourceSearch?: boolean;
  pageTitle?: string;
}

export function TopBar({
  model,
  models,
  onModel,
  latencyMs,
  tokens,
  search,
  onSearch,
  indexReady,
  showSourceSearch = true,
  pageTitle = "",
}: Props) {
  return (
    <header className="glass z-10 flex h-14 shrink-0 items-center gap-4 border-b px-5">
      {showSourceSearch ? (
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Filter sources…"
            className="w-full rounded-xl border border-slate-200/80 bg-white/60 py-2 pl-10 pr-4 text-sm outline-none ring-teal-500/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900/50"
          />
        </div>
      ) : (
        <div className="flex-1 text-sm font-medium capitalize text-slate-600 dark:text-slate-300">
          {pageTitle}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
            indexReady
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${indexReady ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
          {indexReady ? "Index live" : "Index offline"}
        </span>
        {latencyMs != null && (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
            <Activity className="h-3 w-3" />
            {latencyMs}ms
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
          <Zap className="h-3 w-3" />
          {tokens} tok
        </span>
      </div>

      <div className="relative">
        <select
          value={model}
          onChange={(e) => onModel(e.target.value)}
          className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m.split("/").pop()}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-md">
        <User className="h-4 w-4" />
      </div>
    </header>
  );
}
