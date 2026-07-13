import { AlertTriangle, CheckCircle2, Cloud, Database, RefreshCw, Server, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, Card, MetricCard } from "@noogym/ui";
import { PageHeader } from "../components/layout/PageHeader";
import {
  getDesktopLocalDbStatus,
  isDesktopLocalDbAvailable,
  listDesktopSyncConflicts,
  listDesktopSyncEvents,
  retryDesktopSyncEvent,
  resolveDesktopSyncConflict,
  type DesktopBinding,
  type DesktopLocalDbStatus,
  type DesktopSyncConflict,
  type DesktopSyncEvent,
} from "../lib/desktopLocalDb";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

export default function Sincronizacao() {
  const [status, setStatus] = useState<DesktopLocalDbStatus | null>(null);
  const [conflicts, setConflicts] = useState<DesktopSyncConflict[]>([]);
  const [queueStatus, setQueueStatus] = useState<"pending" | "failed" | "conflict">("failed");
  const [syncEvents, setSyncEvents] = useState<DesktopSyncEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const syncNow = useAppStore((state) => state.syncNow);
  const refreshSyncStatus = useAppStore((state) => state.refreshSyncStatus);
  const syncState = useAppStore((state) => state.syncState);
  const syncLabel = useAppStore((state) => state.syncLabel);
  const connectionState = useAppStore((state) => state.connectionState);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const activeGymId = useAppStore((state) => state.activeGymId);
  const appPendingSync = useAppStore((state) => state.pendingSync);
  const appConflictSync = useAppStore((state) => state.conflictSync);
  const user = useAuthStore((state) => state.user);
  const isDesktop = isDesktopLocalDbAvailable();
  const binding = status?.binding ?? null;
  const activeGymName = useMemo(() => activeGymLabel(binding, activeGymId, user?.gym), [activeGymId, binding, user?.gym]);
  const pendingSync = status?.pendingSync ?? appPendingSync;
  const failedSync = status?.failedSync ?? 0;
  const conflictSync = status?.conflictSync ?? appConflictSync ?? conflicts.length;

  const load = () => {
    setIsLoading(true);
    Promise.all([
      isDesktop ? getDesktopLocalDbStatus() : Promise.resolve(null),
      isDesktop ? listDesktopSyncConflicts("open") : Promise.resolve([]),
      isDesktop ? listDesktopSyncEvents(queueStatus, 25) : Promise.resolve([]),
      refreshSyncStatus().catch(() => undefined),
    ])
      .then(([nextStatus, nextConflicts, nextEvents]) => {
        setStatus(nextStatus);
        setConflicts(nextConflicts);
        setSyncEvents(nextEvents);
      })
      .catch((error) => {
        toastInfo("Sincronizacao", error instanceof Error ? error.message : "Nao foi possivel carregar o estado.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, [isDesktop, queueStatus]);

  const runSync = () => {
    setIsLoading(true);
    syncNow()
      .then(() => {
        toastSuccess("Sincronizacao concluida", "Estado local atualizado.");
        load();
      })
      .catch((error) => {
        toastInfo("Sincronizacao falhou", error instanceof Error ? error.message : "Tente novamente.");
      })
      .finally(() => setIsLoading(false));
  };

  const resolveConflict = (conflict: DesktopSyncConflict, resolution: "keep_local" | "use_remote") => {
    setResolvingId(conflict.id);
    resolveDesktopSyncConflict(conflict.id, resolution)
      .then(() => {
        toastSuccess(
          "Conflito resolvido",
          resolution === "keep_local"
            ? "A alteracao local voltou para a fila."
            : "A versao do servidor foi aplicada localmente.",
        );
        load();
      })
      .catch((error) => {
        toastInfo("Conflito nao resolvido", error instanceof Error ? error.message : "Tente novamente.");
      })
      .finally(() => setResolvingId(null));
  };

  const retryEvent = (event: DesktopSyncEvent) => {
    setRetryingId(event.id);
    retryDesktopSyncEvent(event.id)
      .then(() => {
        toastSuccess("Evento reenfileirado", `${entityLabel(event.entity)} voltara a sincronizar.`);
        load();
      })
      .catch((error) => {
        toastInfo("Nao foi possivel reenviar", error instanceof Error ? error.message : "Tente novamente.");
      })
      .finally(() => setRetryingId(null));
  };

  return (
    <div className="space-y-4">
      <section className="panel min-w-0 p-4 sm:p-5 lg:p-6">
        <PageHeader
          title="Sincronizacao"
          subtitle="Controle a fila local, conflitos e estado de ligacao entre Desktop, SQLite e API."
          actions={
            <>
              <Button disabled={isLoading} icon={<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />} onClick={load}>
                Atualizar
              </Button>
              <Button
                variant="primary"
                disabled={syncState === "syncing" || !isDesktop}
                icon={<Cloud className={`h-4 w-4 ${syncState === "syncing" ? "animate-pulse" : ""}`} />}
                onClick={runSync}
              >
                {syncState === "syncing" ? "Sincronizando..." : "Sincronizar agora"}
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Pendentes" value={String(pendingSync)} change="Eventos aguardando envio" icon={<Cloud className="h-5 w-5" />} tone={pendingSync > 0 ? "orange" : "green"} />
          <MetricCard title="Falhados" value={String(failedSync)} change="Eventos com erro local" icon={<AlertTriangle className="h-5 w-5" />} tone={failedSync > 0 ? "red" : "green"} />
          <MetricCard title="Conflitos" value={String(conflictSync)} change="Precisam de decisao" icon={<AlertTriangle className="h-5 w-5" />} tone={conflictSync > 0 ? "orange" : "green"} />
          <MetricCard title="Modo" value={onlineOnly ? "Web" : isDesktop ? "Desktop" : "Web"} change={connectionLabel(connectionState, syncLabel)} icon={onlineOnly || connectionState !== "offline" ? <Server className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />} tone={connectionState === "offline" && !onlineOnly ? "orange" : "blue"} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
        <Card className="min-w-0 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Fila de sincronizacao</h2>
              <p className="mt-1 text-sm text-zinc-400">Veja eventos locais pendentes, falhados ou bloqueados por conflito.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["failed", "conflict", "pending"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-xs transition ${queueStatus === item ? "border-noogym-lime bg-noogym-lime/10 text-noogym-lime" : "border-white/10 text-zinc-300 hover:bg-white/10"}`}
                  onClick={() => setQueueStatus(item)}
                >
                  {queueStatusLabel(item)}
                </button>
              ))}
            </div>
          </div>

          {!isDesktop ? (
            <EmptyState
              icon={<Server className="h-5 w-5" />}
              title="Fila local indisponivel na web"
              description="A fila SQLite existe apenas na versao desktop."
            />
          ) : syncEvents.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title={`Sem eventos ${queueStatusLabel(queueStatus).toLowerCase()}`}
              description="Quando houver eventos neste estado, eles aparecem aqui com entidade, tentativas e erro."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {syncEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{entityLabel(event.entity)}</Badge>
                        <Badge>{operationLabel(event.operation)}</Badge>
                        <Badge>{queueStatusLabel(event.status ?? queueStatus)}</Badge>
                      </div>
                      <p className="mt-2 truncate text-base font-semibold">{eventTitle(event)}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Tentativas: {event.attempts} · Atualizado em {formatDate(event.updatedAt ?? event.createdAt)}
                      </p>
                      {event.error ? <p className="mt-2 text-xs text-red-200">{event.error}</p> : null}
                    </div>
                    {event.status === "failed" || event.status === "conflict" ? (
                      <Button disabled={retryingId === event.id} icon={<RefreshCw className={`h-4 w-4 ${retryingId === event.id ? "animate-spin" : ""}`} />} onClick={() => retryEvent(event)}>
                        Reenviar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Conflitos pendentes</h2>
              <p className="mt-1 text-sm text-zinc-400">Resolva alteracoes paralelas entre SQLite local e API.</p>
            </div>
            <Badge>{conflicts.length ? `${conflicts.length} aberto(s)` : "Sem conflitos"}</Badge>
          </div>

          {!isDesktop ? (
            <EmptyState
              icon={<Server className="h-5 w-5" />}
              title="Fila local indisponivel na web"
              description="A versao web opera diretamente pela API. Abra esta area no Desktop para ver SQLite, fila pendente e conflitos locais."
            />
          ) : conflicts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Nenhum conflito aberto"
              description="A fila local pode sincronizar normalmente quando a API estiver acessivel."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{entityLabel(conflict.entity)}</Badge>
                        <Badge>{operationLabel(conflict.operation)}</Badge>
                      </div>
                      <p className="mt-2 truncate text-base font-semibold">{conflictTitle(conflict)}</p>
                      <p className="mt-1 text-xs text-zinc-400">Criado em {formatDate(conflict.createdAt)}</p>
                      {conflict.error ? <p className="mt-2 text-xs text-amber-200">{conflict.error}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={resolvingId === conflict.id} onClick={() => resolveConflict(conflict, "use_remote")}>
                        Usar servidor
                      </Button>
                      <Button variant="primary" disabled={resolvingId === conflict.id} onClick={() => resolveConflict(conflict, "keep_local")}>
                        Manter local
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Estado local</h2>
            <div className="mt-4 space-y-3 text-sm">
              <InfoLine label="SQLite" value={status?.path ?? (isDesktop ? "A carregar..." : "Indisponivel na web")} />
              <InfoLine label="Organizacao" value={binding?.organizationName ?? user?.organizationName ?? "-"} />
              <InfoLine label="Unidade ativa" value={activeGymName} />
              <InfoLine label="Ultimo bootstrap" value={formatDate(binding?.lastBootstrapAt)} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Regras do sync</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <RuleLine active text="Enviar pendencias locais antes de puxar dados novos da API." />
              <RuleLine active={conflictSync === 0} text="Sincronizacao automatica so avanca sem conflitos abertos." />
              <RuleLine active text="Manter local reenfileira o evento; usar servidor aplica a versao remota." />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function activeGymLabel(binding: DesktopBinding | null, activeGymId: string | null, fallback?: string) {
  const gyms = binding?.gyms ?? [];
  const active = gyms.find((gym) => String(gym.id ?? "") === activeGymId);
  const name = active?.name;
  return typeof name === "string" && name.trim() ? name : fallback ?? "-";
}

function connectionLabel(connectionState: string, syncLabel: string) {
  if (connectionState === "offline") return "API indisponivel";
  if (connectionState === "online_without_session") return "Login online necessario";
  if (connectionState === "syncing") return "Sincronizando";
  return syncLabel;
}

function conflictTitle(conflict: DesktopSyncConflict) {
  const localName = displayValue(conflict.localPayload.name ?? conflict.localPayload.title ?? conflict.localPayload.customer);
  const remoteName = displayValue(conflict.remotePayload?.name ?? conflict.remotePayload?.title ?? conflict.remotePayload?.customerName);
  return localName ?? remoteName ?? conflict.remoteId ?? conflict.entityId;
}

function eventTitle(event: DesktopSyncEvent) {
  return displayValue(event.payload.name ?? event.payload.title ?? event.payload.customer ?? event.payload.customerName) ?? event.entityId;
}

function queueStatusLabel(status: "pending" | "failed" | "conflict" | "synced") {
  const labels: Record<"pending" | "failed" | "conflict" | "synced", string> = {
    pending: "Pendentes",
    failed: "Falhados",
    conflict: "Conflitos",
    synced: "Sincronizados",
  };

  return labels[status];
}

function entityLabel(entity: string) {
  const labels: Record<string, string> = {
    clients: "Clientes",
    plans: "Planos",
    "plan-categories": "Categorias",
    products: "Produtos",
    sales: "Vendas",
    checkins: "Check-ins",
    classes: "Aulas",
    employees: "Funcionarios",
    "finance-records": "Financeiro",
    "finance-categories": "Categorias financeiras",
    "finance-accounts": "Contas financeiras",
    workouts: "Treinos",
    "operational-settings": "Operacao",
  };

  return labels[entity] ?? entity;
}

function operationLabel(operation: DesktopSyncConflict["operation"]) {
  const labels: Record<DesktopSyncConflict["operation"], string> = {
    create: "Criacao",
    update: "Alteracao",
    delete: "Remocao",
  };

  return labels[operation];
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function displayValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-2 last:border-b-0">
      <span className="text-zinc-400">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-zinc-100">{value || "-"}</span>
    </div>
  );
}

function RuleLine({ active, text }: { active: boolean; text: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-noogym-lime" : "bg-zinc-600"}`} />
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
      <div className="flex items-start gap-3">
        <span className="icon-tile h-10 w-10 text-noogym-lime">{icon}</span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
