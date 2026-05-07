import { ChevronDown, Maximize2, Minus, RefreshCw, WifiOff, X } from "lucide-react";
import { useAppStore } from "../../store/appStore";

export function Topbar() {
  const isOffline = useAppStore((state) => state.isOffline);
  const syncLabel = useAppStore((state) => state.syncLabel);

  return (
    <header className="drag-region flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-5">
      <div className="w-[260px]" />
      <button className="no-drag flex h-11 min-w-[380px] items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm">
        Noogym Fitness Center - Unidade Central
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>
      <div className="no-drag flex items-center gap-4 text-sm">
        <button className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-4">
          <WifiOff className="h-5 w-5" />
          {isOffline ? "Offline" : "Online"}
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </button>
        <div className="flex items-center gap-2 text-zinc-200">
          <RefreshCw className="h-4 w-4" />
          {syncLabel}
        </div>
        <div className="flex items-center gap-5 pl-3 text-zinc-200">
          <Minus className="h-4 w-4" />
          <Maximize2 className="h-4 w-4" />
          <X className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
