import { Cloud, FileText, RefreshCw, Settings, ShieldCheck } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { Button } from "@noogym/ui";

export function BottomSyncBar() {
  const pendingSync = useAppStore((state) => state.pendingSync);
  const syncState = useAppStore((state) => state.syncState);
  const syncNow = useAppStore((state) => state.syncNow);

  return (
    <footer className="flex h-[92px] shrink-0 items-center gap-7 border-t border-white/10 bg-noogym-panel/95 px-6">
      <div className="flex items-center gap-4 border-r border-white/10 pr-7 text-sm">
        <span className="text-zinc-300">Versão 1.0.0</span>
        <span className="rounded border border-noogym-lime/30 bg-noogym-lime/10 px-3 py-1 text-noogym-lime">Local-First</span>
      </div>
      <div className="flex min-w-[300px] items-center gap-4 border-r border-white/10 pr-7">
        <span className="icon-tile">
          <FileText className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm">Armazenamento Local</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-noogym-lime">
            2.4 GB utilizados
            <span className="h-1.5 w-28 rounded-full bg-white/10">
              <span className="block h-full w-[44%] rounded-full bg-noogym-lime" />
            </span>
          </div>
        </div>
      </div>
      <div className="flex min-w-[290px] items-center gap-4 border-r border-white/10 pr-7">
        <span className="icon-tile">
          <Cloud className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm">Pendências de sincronização</p>
          <p className="text-xs text-zinc-400">{pendingSync} registros</p>
        </div>
      </div>
      <div className="flex min-w-[260px] items-center gap-4">
        <span className="icon-tile">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm">Último backup</p>
          <p className="text-xs text-zinc-400">Hoje, 10:30</p>
        </div>
      </div>
      <Button
        className="ml-auto h-12 min-w-[280px] text-base"
        variant="primary"
        icon={<RefreshCw className={`h-5 w-5 ${syncState === "syncing" ? "animate-spin" : ""}`} />}
        onClick={() => void syncNow()}
        disabled={syncState === "syncing"}
      >
        {syncState === "syncing" ? "Sincronizando..." : "Sincronizar agora"}
      </Button>
      <button className="no-drag icon-tile h-12 w-12">
        <Settings className="h-5 w-5" />
      </button>
    </footer>
  );
}
