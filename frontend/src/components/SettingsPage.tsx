import { Bug, Cpu, Moon, Sun } from "lucide-react";

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  debugMode: boolean;
  onDebugMode: (v: boolean) => void;
  model: string;
  models: string[];
  onModel: (m: string) => void;
}

export function SettingsPage({
  dark,
  onToggleTheme,
  debugMode,
  onDebugMode,
  model,
  models,
  onModel,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/80 p-6 dark:bg-[#0f1419]">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Appearance and developer options</p>

        <div className="mt-8 space-y-4">
          <div className="glass flex items-center justify-between rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-3">
              {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-xs text-slate-500">{dark ? "Dark" : "Light"} mode</p>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white"
            >
              Toggle
            </button>
          </div>

          <div className="glass rounded-2xl p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-teal-600" />
              <p className="font-medium">LLM model</p>
            </div>
            <select
              value={model}
              onChange={(e) => onModel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="glass flex items-center justify-between rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium">Debug mode</p>
                <p className="text-xs text-slate-500">Show prompts & scores in chat</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => onDebugMode(e.target.checked)}
              className="h-5 w-5 rounded accent-teal-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
