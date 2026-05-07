import { ChevronDown, Maximize2, Minus, Moon, RefreshCw, Sun, WifiOff, X } from "lucide-react";
import { useAppStore } from "../../store/appStore";

export function Topbar() {
  const isOffline = useAppStore((state) => state.isOffline);
  const syncLabel = useAppStore((state) => state.syncLabel);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const windowControls = window.noogym?.windowControls;

  return (
    <header className="drag-region flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-5">
      <div className="w-[260px]" />
      <button className="no-drag flex h-11 min-w-[380px] items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm">
        Noogym Fitness Center - Unidade Central
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>
      <div className="no-drag flex min-w-0 items-center gap-4 text-sm">
        <button
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 transition hover:bg-white/[0.07]"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {theme === "dark" ? <Moon className="h-4 w-4 text-noogym-lime" /> : <Sun className="h-4 w-4 text-noogym-lime" />}
          {theme === "dark" ? "Dark" : "Light"}
        </button>
        <button className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 px-4">
          <WifiOff className="h-5 w-5" />
          {isOffline ? "Offline" : "Online"}
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </button>
        <div className="flex min-w-0 items-center gap-2 truncate text-zinc-200">
          <RefreshCw className="h-4 w-4" />
          {syncLabel}
        </div>
        <div className="flex shrink-0 items-center gap-1 pl-3 text-zinc-200">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
            onClick={() => void windowControls?.minimize()}
            aria-label="Minimizar"
            title="Minimizar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
            onClick={() => void windowControls?.maximize()}
            aria-label="Maximizar"
            title="Maximizar"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-red-500/20 hover:text-red-300"
            onClick={() => void windowControls?.close()}
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
