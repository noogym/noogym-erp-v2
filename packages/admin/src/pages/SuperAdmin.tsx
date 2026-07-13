import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Search,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { Badge, Button } from "@noogym/ui";
import { PageHeader } from "../components/layout/PageHeader";
import {
  getSuperAdminOverview,
  requestSuperAdminPasswordReset,
  startSuperAdminSupportSession,
  type SuperAdminOrganization,
  type SuperAdminOverview,
  type SuperAdminUser,
} from "../lib/superAdminApi";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

const emptyOverview: SuperAdminOverview = {
  totals: {
    organizations: 0,
    gyms: 0,
    users: 0,
    members: 0,
    plans: 0,
    products: 0,
    sales: 0,
  },
  organizations: [],
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Proprietario",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  TRAINER: "Personal Trainer",
  RECEPTIONIST: "Recepcionista",
  FINANCE: "Financeiro",
  NUTRITIONIST: "Nutricionista",
};

export default function SuperAdmin() {
  const token = useAuthStore((state) => state.accessToken);
  const startSupportSession = useAuthStore((state) => state.startSupportSession);
  const setActiveGymId = useAppStore((state) => state.setActiveGymId);
  const setRoute = useAppStore((state) => state.setRoute);
  const [overview, setOverview] = useState<SuperAdminOverview>(emptyOverview);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [supportTarget, setSupportTarget] = useState<SuperAdminOrganization | null>(null);
  const [supportReason, setSupportReason] = useState("");
  const [isStartingSupport, setIsStartingSupport] = useState(false);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await getSuperAdminOverview(token);
      setOverview(data);
      setSelectedId((current) => current ?? data.organizations[0]?.id ?? null);
    } catch (error) {
      toastInfo("Console indisponivel", error instanceof Error ? error.message : "Nao foi possivel carregar o Super Admin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const filteredOrganizations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return overview.organizations;
    return overview.organizations.filter((organization) => {
      const values = [
        organization.name,
        organization.slug,
        organization.email ?? "",
        ...organization.gyms.map((gym) => gym.name),
        ...organization.users.map((user) => `${user.name} ${user.email}`),
      ];
      return values.some((value) => value.toLowerCase().includes(term));
    });
  }, [overview.organizations, search]);

  const selected =
    filteredOrganizations.find((organization) => organization.id === selectedId) ??
    filteredOrganizations[0] ??
    null;

  const handlePasswordReset = async (user: SuperAdminUser) => {
    if (!token) return;
    setResettingUserId(user.id);
    try {
      const result = await requestSuperAdminPasswordReset(token, user.id);
      if (result.resetUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(result.resetUrl).catch(() => undefined);
      }
      toastSuccess(
        "Recuperacao enviada",
        result.resetUrl
          ? "O link foi gerado e copiado para a area de transferencia."
          : `Foi solicitado reset de senha para ${user.email}.`,
      );
    } catch (error) {
      toastInfo("Nao foi possivel gerar reset", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setResettingUserId(null);
    }
  };

  const handleStartSupport = async () => {
    if (!token || !supportTarget) return;
    const reason = supportReason.trim();
    if (reason.length < 8) {
      toastInfo("Motivo obrigatorio", "Descreva o motivo com pelo menos 8 caracteres.");
      return;
    }

    setIsStartingSupport(true);
    try {
      const session = await startSuperAdminSupportSession(token, {
        organizationId: supportTarget.id,
        reason,
      });
      startSupportSession(session);
      setActiveGymId(supportTarget.gyms[0]?.id ?? null);
      setRoute("dashboard");
      toastSuccess("Modo suporte ativo", `Agora esta a visualizar ${supportTarget.name}.`);
    } catch (error) {
      toastInfo("Nao foi possivel iniciar suporte", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setIsStartingSupport(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="Super Admin"
            subtitle="Console interno para suporte, auditoria e recuperacao de contas em todas as organizacoes."
          />
          <Button icon={<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />} onClick={() => void load()}>
            Atualizar
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Organizacoes" value={overview.totals.organizations} icon={Building2} />
          <Metric label="Unidades" value={overview.totals.gyms} icon={Shield} />
          <Metric label="Usuarios" value={overview.totals.users} icon={Users} />
          <Metric label="Clientes" value={overview.totals.members} icon={CheckCircle2} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="panel min-h-[520px] p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar organizacao, unidade ou usuario"
              className="h-10 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
            />
          </label>

          <div className="mt-4 space-y-2">
            {filteredOrganizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                onClick={() => setSelectedId(organization.id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selected?.id === organization.id
                    ? "border-noogym-lime/70 bg-noogym-lime/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{organization.name}</p>
                    <p className="truncate text-xs text-zinc-400">{organization.slug}</p>
                  </div>
                  <Badge tone={organization.gyms.some((gym) => gym.isActive) ? "green" : "gray"}>
                    {`${organization._count.gyms} gyms`}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
                  <MiniCount label="users" value={organization._count.users} />
                  <MiniCount label="clientes" value={organization._count.members} />
                  <MiniCount label="planos" value={organization._count.plans} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <OrganizationDetails
            organization={selected}
            resettingUserId={resettingUserId}
            onOpenSupport={(organization) => {
              setSupportTarget(organization);
              setSupportReason("");
            }}
            onPasswordReset={handlePasswordReset}
          />
        ) : (
          <div className="panel flex min-h-[520px] items-center justify-center p-6 text-sm text-zinc-400">
            Nenhuma organizacao encontrada.
          </div>
        )}
      </div>

      {supportTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#071014] p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Acessar em modo suporte</h3>
                <p className="mt-1 text-sm text-zinc-400">{supportTarget.name}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                onClick={() => setSupportTarget(null)}
                aria-label="Fechar"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-4 block text-sm">
              <span className="text-zinc-300">Motivo obrigatorio</span>
              <textarea
                value={supportReason}
                onChange={(event) => setSupportReason(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
                placeholder="Ex: Cliente reportou erro de sincronizacao e autorizou suporte remoto."
              />
            </label>

            <div className="mt-4 rounded-md border border-orange-400/30 bg-orange-400/10 p-3 text-sm text-orange-100">
              Esta sessao e temporaria, auditada e visivel no topo da aplicacao.
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSupportTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={isStartingSupport || supportReason.trim().length < 8}
                onClick={() => void handleStartSupport()}
              >
                {isStartingSupport ? "A iniciar..." : "Iniciar suporte"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrganizationDetails({
  organization,
  resettingUserId,
  onOpenSupport,
  onPasswordReset,
}: {
  organization: SuperAdminOrganization;
  resettingUserId: string | null;
  onOpenSupport: (organization: SuperAdminOrganization) => void;
  onPasswordReset: (user: SuperAdminUser) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{organization.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {organization.email ?? "Sem email"} · {organization.country ?? "Pais nao definido"} · {organization.timezone}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{organization.currency}</Badge>
            <Button
              className="h-9 px-3"
              variant="primary"
              icon={<Shield className="h-4 w-4" />}
              onClick={() => onOpenSupport(organization)}
            >
              Acessar suporte
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniPanel label="Gyms" value={organization._count.gyms} />
          <MiniPanel label="Usuarios" value={organization._count.users} />
          <MiniPanel label="Clientes" value={organization._count.members} />
          <MiniPanel label="Planos" value={organization._count.plans} />
          <MiniPanel label="Produtos" value={organization._count.products} />
          <MiniPanel label="Vendas" value={organization._count.sales} />
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Unidades</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {organization.gyms.map((gym) => (
            <div key={gym.id} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{gym.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{[gym.city, gym.province, gym.country].filter(Boolean).join(", ") || gym.slug}</p>
                </div>
                <Badge tone={gym.isActive ? "green" : "gray"}>{gym.isActive ? "Ativa" : "Inativa"}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-300">
                <MiniCount label="clientes" value={gym._count.members} />
                <MiniCount label="vendas" value={gym._count.sales} />
                <MiniCount label="produtos" value={gym._count.products} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Utilizadores</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Unidades</th>
                <th className="px-3 py-2">Ultimo acesso</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {organization.users.map((user) => (
                <tr key={user.id} className="rounded-md bg-white/[0.035] text-zinc-200">
                  <td className="rounded-l-md px-3 py-3">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </td>
                  <td className="px-3 py-3">{roleLabel[user.role] ?? user.role}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {user.status === "ACTIVE" ? <CheckCircle2 className="h-4 w-4 text-noogym-lime" /> : <XCircle className="h-4 w-4 text-orange-300" />}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-300">
                    {user.gyms.length ? user.gyms.map((gym) => gym.name).join(", ") : "Organizacao"}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-400">{formatDate(user.lastLoginAt)}</td>
                  <td className="rounded-r-md px-3 py-3 text-right">
                    <Button
                      className="h-9 px-3"
                      icon={<KeyRound className="h-4 w-4" />}
                      disabled={resettingUserId === user.id || user.status !== "ACTIVE"}
                      onClick={() => onPasswordReset(user)}
                    >
                      {resettingUserId === user.id ? "A enviar" : "Reset"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Building2 }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-noogym-lime/10 text-noogym-lime">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">{label}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniPanel({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-black/20 px-2 py-2">
      <p className="font-semibold text-white">{value}</p>
      <p className="truncate text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

const formatDate = (value?: string | null) => {
  if (!value) return "Sem acesso";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem acesso";
  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
