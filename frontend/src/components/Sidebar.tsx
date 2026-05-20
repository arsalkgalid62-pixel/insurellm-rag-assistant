import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Building2,
  FileText,
  MessageSquare,
  Moon,
  Package,
  Settings,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import type { NavPage } from "../types";

const NAV: { id: NavPage; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const ICON_MAP: Record<string, typeof Building2> = {
  building: Building2,
  package: Package,
  users: Users,
  "file-text": FileText,
};

interface Props {
  page: NavPage;
  onPage: (p: NavPage) => void;
  dark: boolean;
  onToggleTheme: () => void;
  examples: { id: string; label: string; icon: string; queries: string[] }[];
  onExample: (q: string) => void;
}

export function Sidebar({ page, onPage, dark, onToggleTheme, examples, onExample }: Props) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-surface-card-dark">
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg shadow-teal-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Insurellm</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Enterprise AI</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onPage(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              page === id
                ? "bg-gradient-to-r from-teal-500/10 to-blue-500/10 text-teal-700 dark:text-teal-300 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}

        <div className="pt-6">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Example queries
          </p>
          <div className="space-y-2">
            {examples.flatMap((cat) =>
              cat.queries.slice(0, 1).map((q) => {
                const Icon = ICON_MAP[cat.icon] || BookOpen;
                return (
                  <motion.button
                    key={q}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onExample(q)}
                    className="group w-full rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-left transition hover:border-teal-300/60 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-teal-600/40 dark:hover:bg-teal-900/20"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="text-[10px] font-semibold uppercase text-slate-500">
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs leading-snug text-slate-700 group-hover:text-teal-800 dark:text-slate-300 dark:group-hover:text-teal-200">
                      {q}
                    </p>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <button
          onClick={onToggleTheme}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
