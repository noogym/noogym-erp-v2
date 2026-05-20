import { useEffect } from "react";
import { ChevronDown, Maximize2, Minus, Moon, Plus, RefreshCw, Search, Sun, Wifi, WifiOff, X } from "lucide-react";
import { MAX_ZOOM_FACTOR, MIN_ZOOM_FACTOR, useAppStore } from "../../store/appStore";
import { useAuthStore } from "../../store/authStore";

export function Topbar() {
  const decreaseZoom = useAppStore((state) => state.decreaseZoom);
  const increaseZoom = useAppStore((state) => state.increaseZoom);
  const isOffline = useAppStore((state) => state.isOffline);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const syncLabel = useAppStore((state) => state.syncLabel);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const zoomFactor = useAppStore((state) => state.zoomFactor);
  const user = useAuthStore((state) => state.user);
  const windowControls = typeof window !== "undefined" ? window.noogym?.windowControls : undefined;
  const zoomControls = typeof window !== "undefined" ? window.noogym?.zoomControls : undefined;
  const isOnline = onlineOnly || !isOffline;
  const zoomPercent = Math.round(zoomFactor * 100);

  useEffect(() => {
    if (zoomControls) {
      void zoomControls.setZoomFactor(zoomFactor);
      return;
    }

    document.body.style.setProperty("zoom", String(zoomFactor));
  }, [zoomControls, zoomFactor]);

  return (
    <header className="drag-region flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-3 py-3 lg:h-[72px] lg:flex-nowrap lg:px-5 lg:py-0">
      <div className="hidden w-[260px] lg:block" />
      <button className="no-drag order-3 flex h-11 min-w-0 basis-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-4 text-left text-sm lg:order-none lg:min-w-[320px] lg:basis-auto xl:min-w-[380px]">
        <span className="truncate">{user?.gym ?? "Noogym Fitness Center - Unidade Central"}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>
      <div className="no-drag flex min-w-0 flex-1 items-center justify-end gap-2 text-sm lg:flex-none lg:gap-4">
        <button
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 transition hover:bg-white/[0.07] sm:px-4"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {theme === "dark" ? <Moon className="h-4 w-4 text-noogym-lime" /> : <Sun className="h-4 w-4 text-noogym-lime" />}
          <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
        </button>
        <button className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 sm:px-4">
          {isOnline ? <Wifi className="h-5 w-5 text-noogym-lime" /> : <WifiOff className="h-5 w-5" />}
          <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </button>
        <div className="hidden min-w-0 items-center gap-2 truncate text-zinc-200 xl:flex">
          <RefreshCw className="h-4 w-4" />
          {syncLabel}
        </div>
        <div className="hidden h-10 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-1.5 lg:flex">
          <Search className="ml-1 h-4 w-4 text-noogym-lime" />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={decreaseZoom}
            disabled={zoomFactor <= MIN_ZOOM_FACTOR}
            aria-label="Reduzir tela"
            title="Reduzir tela"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="min-w-12 rounded-full px-2 py-1 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
            onClick={resetZoom}
            aria-label="Repor zoom para 100%"
            title="Repor zoom para 100%"
          >
            {zoomPercent}%
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={increaseZoom}
            disabled={zoomFactor >= MAX_ZOOM_FACTOR}
            aria-label="Aumentar tela"
            title="Aumentar tela"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {windowControls ? (
          <div className="hidden shrink-0 items-center gap-1 pl-3 text-zinc-200 lg:flex">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
              onClick={() => void windowControls.minimize()}
              aria-label="Minimizar"
              title="Minimizar"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
              onClick={() => void windowControls.maximize()}
              aria-label="Maximizar"
              title="Maximizar"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-red-500/20 hover:text-red-300"
              onClick={() => void windowControls.close()}
              aria-label="Fechar"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
