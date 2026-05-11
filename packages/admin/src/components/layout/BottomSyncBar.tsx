import { Cloud, FileText, RefreshCw, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@noogym/ui";
import { useAppStore } from "../../store/appStore";

export function BottomSyncBar() {
  const pendingSync = useAppStore((state) => state.pendingSync);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const syncState = useAppStore((state) => state.syncState);
  const syncNow = useAppStore((state) => state.syncNow);

  return (
    <footer className="hidden h-[92px] shrink-0 items-center gap-5 overflow-x-auto border-t border-white/10 bg-noogym-panel/95 px-4 lg:flex 2xl:gap-7 2xl:px-6">
      <div className="flex items-center gap-4 border-r border-white/10 pr-7 text-sm">
        <span className="text-zinc-300">Versao 1.0.0</span>
        <span className="rounded border border-noogym-lime/30 bg-noogym-lime/10 px-3 py-1 text-noogym-lime">
          {onlineOnly ? "Online" : "Local-First"}
        </span>
      </div>
      <div className="flex min-w-[240px] items-center gap-4 border-r border-white/10 pr-5 2xl:min-w-[300px] 2xl:pr-7">
        <span className="icon-tile">
          <FileText className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm">{onlineOnly ? "Sessao Web" : "Armazenamento Local"}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-noogym-lime">
            {onlineOnly ? "Conectado ao servidor" : "2.4 GB utilizados"}
            <span className="h-1.5 w-28 rounded-full bg-white/10">
              <span className="block h-full w-[44%] rounded-full bg-noogym-lime" />
            </span>
          </div>
        </div>
      </div>
      <div className="flex min-w-[230px] items-center gap-4 border-r border-white/10 pr-5 2xl:min-w-[290px] 2xl:pr-7">
        <span className="icon-tile">
          <Cloud className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm">{onlineOnly ? "Sincronizacao online" : "Pendencias de sincronizacao"}</p>
          <p className="text-xs text-zinc-400">{onlineOnly ? "Sem pendencias" : `${pendingSync} registros`}</p>
        </div>
      </div>
      <div className="flex min-w-[210px] items-center gap-4 2xl:min-w-[260px]">
        <span className="icon-tile">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm">Ultimo backup</p>
          <p className="text-xs text-zinc-400">Hoje, 10:30</p>
        </div>
      </div>
      <Button
        className="ml-auto h-12 min-w-[220px] text-sm 2xl:min-w-[280px] 2xl:text-base"
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
