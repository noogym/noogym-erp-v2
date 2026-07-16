import {
  Copy,
  Download,
  Gift,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Upload,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toDataURL } from "qrcode";
import type {
  ClientRecord,
  FinanceAccountRecord,
  FinanceRecord,
  PlanRecord,
} from "@noogym/types";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { ExportModal } from "../components/modals/ExportModal";
import { ImportModal } from "../components/modals/ImportModal";
import { NewClientModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { DonutChart } from "../components/ui/Charts";
import { DropdownMenu } from "@noogym/ui";
import { FormInput } from "@noogym/ui";
import { FormSelect } from "@noogym/ui";
import { FormTextarea } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Modal } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import {
  ListPagination,
  ListToolbar,
  paginateRows,
} from "../components/tables/ListControls";
import { TableActions } from "../components/tables/TableActions";
import { useCheckinsStore } from "../store/checkinsStore";
import { useClientsStore } from "../store/clientsStore";
import { useFinanceStore } from "../store/financeStore";
import { usePlansStore } from "../store/plansStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

const badgeTone = (tone?: string) =>
  [
    "lime",
    "yellow",
    "purple",
    "blue",
    "orange",
    "red",
    "gray",
    "green",
  ].includes(tone ?? "")
    ? (tone as
        | "lime"
        | "yellow"
        | "purple"
        | "blue"
        | "orange"
        | "red"
        | "gray"
        | "green")
    : "lime";
type ClientModal =
  | "new"
  | "import"
  | "export"
  | "message"
  | "view"
  | "edit"
  | "payment"
  | "history"
  | "qr"
  | "deactivate"
  | null;

const planColors = [
  "#B6FF00",
  "#A78BFA",
  "#FACC15",
  "#38BDF8",
  "#84CC16",
  "#F97316",
];
const csvHeaders = [
  "Nome completo",
  "E-mail",
  "Telefone",
  "Data de nascimento",
  "Plano",
  "Codigo do cliente",
  "Documento",
  "Status",
];
const monthAliases = new Map([
  ["jan", 0],
  ["janeiro", 0],
  ["fev", 1],
  ["fevereiro", 1],
  ["mar", 2],
  ["marco", 2],
  ["março", 2],
  ["abr", 3],
  ["abril", 3],
  ["mai", 4],
  ["maio", 4],
  ["jun", 5],
  ["junho", 5],
  ["jul", 6],
  ["julho", 6],
  ["ago", 7],
  ["agosto", 7],
  ["set", 8],
  ["setembro", 8],
  ["out", 9],
  ["outubro", 9],
  ["nov", 10],
  ["novembro", 10],
  ["dez", 11],
  ["dezembro", 11],
]);

const escapeCsv = (value?: string) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const planSituationOptions = [
  "Todas as situacoes",
  "Em dia",
  "A vencer",
  "Vence hoje",
  "Vencido",
  "Sem plano",
  "Sem vencimento",
] as const;
type PlanSituation =
  (typeof planSituationOptions)[number] extends "Todas as situacoes"
    ? never
    : Exclude<(typeof planSituationOptions)[number], "Todas as situacoes">;
const expiringSoonDays = 7;
const isRecentClient = (client: ClientRecord) => {
  if (!client.createdAt) return false;
  const createdAt = new Date(client.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() - 30);
  return createdAt >= limit;
};
const birthdayMonth = (birthday?: string) => {
  if (!birthday) return undefined;
  const date = new Date(birthday);
  if (!Number.isNaN(date.getTime())) return date.getMonth();
  const normalized = normalize(birthday);
  const textMonth = Array.from(monthAliases.entries()).find(([label]) =>
    normalized.includes(label),
  )?.[1];
  if (textMonth !== undefined) return textMonth;
  const parts = normalized.split(/[/-]/).map((part) => Number(part));
  return parts.length >= 2 && parts[1] >= 1 && parts[1] <= 12
    ? parts[1] - 1
    : undefined;
};
const formatBirthday = (birthday?: string) => {
  if (!birthday) return undefined;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return birthday;
  const month = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ][date.getMonth()];
  return `${String(date.getDate()).padStart(2, "0")} ${month}`;
};
const parseClientDate = (value?: string) => {
  if (!value || normalize(value).includes("sem")) return null;
  const normalized = normalize(value);
  const numeric = normalized.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const rawYear = numeric[3] ? Number(numeric[3]) : new Date().getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const textMonth = Array.from(monthAliases.entries()).find(([label]) =>
    normalized.includes(label),
  )?.[1];
  const day = Number(normalized.match(/\d{1,2}/)?.[0]);
  if (textMonth !== undefined && day) {
    const date = new Date(new Date().getFullYear(), textMonth, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const daysUntilExpiry = (client: ClientRecord) => {
  const expiry = parseClientDate(client.expires);
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
};
const planSituation = (client: ClientRecord): PlanSituation => {
  if (!client.plan || normalize(client.plan) === "sem plano")
    return "Sem plano";
  if (normalize(client.status).includes("atras")) return "Vencido";
  const days = daysUntilExpiry(client);
  if (days === null) return "Sem vencimento";
  if (days < 0) return "Vencido";
  if (days === 0) return "Vence hoje";
  if (days <= expiringSoonDays) return "A vencer";
  return "Em dia";
};
const planSituationTone = (situation: PlanSituation) => {
  if (situation === "Vencido") return "red";
  if (situation === "A vencer" || situation === "Vence hoje") return "orange";
  if (situation === "Sem plano" || situation === "Sem vencimento")
    return "gray";
  return "lime";
};
const planSituationDetail = (client: ClientRecord) => {
  const situation = planSituation(client);
  const days = daysUntilExpiry(client);
  if (situation === "Vencido" && days !== null)
    return `${Math.abs(days)} dia(s) em atraso`;
  if (situation === "A vencer" && days !== null)
    return `${days} dia(s) restantes`;
  if (situation === "Vence hoje") return "Vence hoje";
  return situation;
};
const parseMoneyValue = (value?: string | number) => {
  if (typeof value === "number") return value;
  const parsed = Number(
    String(value ?? "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoneyValue = (value: number) => value.toLocaleString("pt-AO");
const isUuidLike = (value?: string) =>
  Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
  );
const isoDateInput = (date = new Date()) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};
const formatDatePt = (date: Date) =>
  new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
const planDurationDays = (value?: string) => {
  const normalized = normalize(value ?? "");
  if (normalized.includes("anual") || normalized.includes("ano")) return 365;
  if (normalized.includes("semestr")) return 180;
  if (normalized.includes("trimestr") || normalized.includes("3 meses"))
    return 90;
  if (normalized.includes("quinzen")) return 15;
  if (normalized.includes("dia")) return 1;
  return 30;
};
const nextExpiryDate = (client: ClientRecord, durationDays: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentExpiry = parseClientDate(client.expires);
  currentExpiry?.setHours(0, 0, 0, 0);
  const base = currentExpiry && currentExpiry > today ? currentExpiry : today;
  const next = new Date(base);
  next.setDate(next.getDate() + durationDays);
  return next;
};

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function clientsToCsv(clients: ClientRecord[]) {
  const rows = clients.map((client) => [
    client.name,
    client.email,
    client.phone,
    client.birthday,
    client.plan,
    client.id,
    client.document,
    client.status,
    client.lastCheckin,
    client.expires,
    planSituation(client),
  ]);
  return [
    [
      "Nome",
      "E-mail",
      "Telefone",
      "Nascimento",
      "Plano",
      "Codigo",
      "Documento",
      "Status",
      "Ultimo check-in",
      "Vencimento",
      "Situacao do plano",
    ],
    ...rows,
  ]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function clientRowsFromCsv(rows: string[]): Partial<ClientRecord> {
  const [name, email, phone, birthday, plan, id, document, status] = rows;
  return {
    id: id || undefined,
    name,
    email,
    phone,
    birthday: formatBirthday(birthday),
    plan: plan || "Sem plano",
    planTone: plan ? "lime" : "gray",
    document,
    status: status || "Ativo",
    createdAt: new Date().toISOString(),
  };
}

export default function Clientes() {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("Todos os planos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [planStatusFilter, setPlanStatusFilter] =
    useState<(typeof planSituationOptions)[number]>("Todas as situacoes");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState<ClientModal>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importRows, setImportRows] = useState<Array<Partial<ClientRecord>>>(
    [],
  );
  const clients = useClientsStore((state) => state.clients);
  const addClient = useClientsStore((state) => state.addClient);
  const deactivateClient = useClientsStore((state) => state.deactivateClient);
  const regenerateClientQr = useClientsStore((state) => state.regenerateClientQr);
  const updateClient = useClientsStore((state) => state.updateClient);
  const addRevenue = useFinanceStore((state) => state.addRevenue);
  const financeRecords = useFinanceStore((state) => state.records);
  const financeAccounts = useFinanceStore((state) => state.accounts);
  const availablePlans = usePlansStore((state) => state.plans);
  const checkins = useCheckinsStore((state) => state.checkins);
  const lastCheckinsByClient = useMemo(() => {
    const latest = new Map<string, string>();
    checkins.forEach((checkin) => {
      if (!latest.has(checkin.clientId))
        latest.set(checkin.clientId, checkin.dateTime);
    });
    return latest;
  }, [checkins]);
  const clientsWithCheckins = useMemo(
    () =>
      clients.map((client) => ({
        ...client,
        lastCheckin: lastCheckinsByClient.get(client.id) ?? client.lastCheckin,
      })),
    [clients, lastCheckinsByClient],
  );
  const plans = useMemo(
    () =>
      Array.from(
        new Set(
          clientsWithCheckins.map((client) => client.plan || "Sem plano"),
        ),
      ).sort(),
    [clientsWithCheckins],
  );
  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          clientsWithCheckins.map((client) => client.status || "Sem status"),
        ),
      ).sort(),
    [clientsWithCheckins],
  );
  const filtered = useMemo(
    () =>
      clientsWithCheckins.filter((client) => {
        const matchesQuery =
          `${client.name} ${client.phone} ${client.email} ${client.plan}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesPlan =
          planFilter === "Todos os planos" || client.plan === planFilter;
        const matchesStatus =
          statusFilter === "Todos" || client.status === statusFilter;
        const matchesPlanStatus =
          planStatusFilter === "Todas as situacoes" ||
          planSituation(client) === planStatusFilter;
        return (
          matchesQuery && matchesPlan && matchesStatus && matchesPlanStatus
        );
      }),
    [clientsWithCheckins, planFilter, planStatusFilter, query, statusFilter],
  );
  const pageData = useMemo(
    () => paginateRows(filtered, page, pageSize),
    [filtered, page, pageSize],
  );
  useEffect(
    () => setPage(1),
    [pageSize, planFilter, planStatusFilter, query, statusFilter],
  );
  const selectedClients = useMemo(
    () =>
      clientsWithCheckins.filter((client) => selectedIds.includes(client.id)),
    [clientsWithCheckins, selectedIds],
  );
  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((client) => selectedIds.includes(client.id));
  const metrics = useMemo(() => {
    const active = clientsWithCheckins.filter(
      (client) => client.status === "Ativo",
    ).length;
    const inactive = clientsWithCheckins.filter(
      (client) => client.status !== "Ativo",
    ).length;
    const overdue = clientsWithCheckins.filter(
      (client) => planSituation(client) === "Vencido",
    ).length;
    const expiring = clientsWithCheckins.filter((client) =>
      ["A vencer", "Vence hoje"].includes(planSituation(client)),
    ).length;
    const total = clientsWithCheckins.length;
    return {
      active,
      inactive,
      overdue,
      expiring,
      total,
      recent: clientsWithCheckins.filter(isRecentClient).length,
    };
  }, [clientsWithCheckins]);
  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    clientsWithCheckins.forEach((client) =>
      counts.set(
        client.plan || "Sem plano",
        (counts.get(client.plan || "Sem plano") ?? 0) + 1,
      ),
    );
    const total = clientsWithCheckins.length || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count], index) => ({
        label,
        value: Math.round((count / total) * 100),
        color: planColors[index % planColors.length],
      }));
  }, [clientsWithCheckins]);
  const birthdayClients = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return clientsWithCheckins
      .filter((client) => birthdayMonth(client.birthday) === currentMonth)
      .slice(0, 4);
  }, [clientsWithCheckins]);
  const selectedClientFinanceRecords = useMemo(
    () => clientFinanceRecords(financeRecords, selectedClient),
    [financeRecords, selectedClient],
  );
  const openClientModal = (
    nextModal: Exclude<ClientModal, "new" | "import" | "export" | null>,
    client: ClientRecord,
  ) => {
    setSelectedClient(client);
    setModal(nextModal);
  };
  const closeModal = () => {
    setModal(null);
    setSelectedClient(null);
  };
  const toggleSelection = (clientId: string) =>
    setSelectedIds((ids) =>
      ids.includes(clientId)
        ? ids.filter((id) => id !== clientId)
        : [...ids, clientId],
    );
  const toggleFilteredSelection = () =>
    setSelectedIds((ids) =>
      allFilteredSelected
        ? ids.filter((id) => !filtered.some((client) => client.id === id))
        : Array.from(new Set([...ids, ...filtered.map((client) => client.id)])),
    );
  const exportTarget = () =>
    selectedClients.length > 0 ? selectedClients : filtered;
  const exportClients = (format = "CSV") => {
    const target = exportTarget();
    if (!target.length) {
      toastInfo(
        "Sem clientes para exportar",
        "Ajuste os filtros ou selecione clientes.",
      );
      return;
    }
    const normalizedFormat = normalize(format);
    if (normalizedFormat.includes("json")) {
      downloadFile(
        "clientes.json",
        JSON.stringify(target, null, 2),
        "application/json;charset=utf-8",
      );
    } else {
      downloadFile(
        "clientes.csv",
        `\uFEFF${clientsToCsv(target)}`,
        "text/csv;charset=utf-8",
      );
      if (normalizedFormat.includes("pdf"))
        toastInfo(
          "Exportação em CSV",
          "PDF ainda não está disponível, foi gerado um CSV com os clientes.",
        );
    }
    toastSuccess(
      "Clientes exportados",
      `${target.length} cliente(s) incluído(s).`,
    );
    setModal(null);
  };
  const downloadTemplate = () =>
    downloadFile(
      "modelo-clientes.csv",
      `\uFEFF${csvHeaders.map(escapeCsv).join(",")}\n${["Maria Sacalumbo", "maria@email.com", "+244 939 797 66", "15 Mai", "pacote A", "CLI-1001", "000000000LA000", "Ativo"].map(escapeCsv).join(",")}`,
      "text/csv;charset=utf-8",
    );
  const importFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    const bodyRows =
      rows.length > 1 &&
      rows[0].some((cell) => normalize(cell).includes("nome"))
        ? rows.slice(1)
        : rows;
    const parsed = bodyRows
      .filter((row) => row[0] && row[2])
      .map(clientRowsFromCsv);
    setImportFileName(file.name);
    setImportPreview(rows);
    setImportRows(parsed);
    toastInfo(
      "Arquivo carregado",
      `${parsed.length} cliente(s) pronto(s) para importar.`,
    );
  };
  const confirmImport = () => {
    if (!importRows.length) {
      toastInfo(
        "Selecione um CSV",
        "Use o modelo CSV ou carregue uma lista de clientes.",
      );
      return;
    }
    const imported = importRows.filter((client) => addClient(client)).length;
    const skipped = importRows.length - imported;
    if (imported) {
      toastSuccess(
        "Clientes importados",
        `${imported} cliente(s) adicionados.`,
      );
    }
    if (skipped) {
      toastInfo(
        "Duplicados ignorados",
        `${skipped} cliente(s) ja tinham e-mail, telefone ou BI cadastrado.`,
      );
    }
    setImportRows([]);
    setImportPreview([]);
    setImportFileName("");
    setModal(null);
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Clientes"
          subtitle="Gerencie os clientes da sua academia."
          actions={
            <>
              <Button
                icon={<Upload className="h-4 w-4" />}
                onClick={() => setModal("import")}
              >
                Importar
              </Button>
              <Button
                icon={<Download className="h-4 w-4" />}
                onClick={() => setModal("export")}
              >
                Exportar
              </Button>
              <Button
                icon={<Mail className="h-4 w-4" />}
                onClick={() => setModal("message")}
              >
                Enviar mensagem
              </Button>
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setModal("new")}
              >
                Novo cliente
              </Button>
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Clientes ativos"
            value={String(metrics.active)}
            change={`${metrics.total ? Math.round((metrics.active / metrics.total) * 100) : 0}% do total`}
            icon={<UsersRound className="h-5 w-5" />}
            tone="yellow"
          />
          <MetricCard
            title="Novos clientes"
            value={String(metrics.recent)}
            change="Últimos 30 dias"
            icon={<UsersRound className="h-5 w-5" />}
          />
          <MetricCard
            title="Mensalidades vencidas"
            value={String(metrics.overdue)}
            change="Planos em atraso"
            icon={<UsersRound className="h-5 w-5" />}
            tone="red"
          />
          <MetricCard
            title="A vencer"
            value={String(metrics.expiring)}
            change={`Proximos ${expiringSoonDays} dias`}
            icon={<UsersRound className="h-5 w-5" />}
            tone="orange"
          />
          <MetricCard
            title="Total de clientes"
            value={String(metrics.total)}
            change={`${metrics.inactive} inativo(s)`}
            icon={<UsersRound className="h-5 w-5" />}
            tone="purple"
          />
        </div>
        <Card className="mt-4 p-4">
          <div className="mb-4">
            <ListToolbar
              query={query}
              onQueryChange={setQuery}
              queryPlaceholder="Buscar por nome, telefone ou e-mail..."
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              onClear={() => {
                setQuery("");
                setPlanFilter("Todos os planos");
                setStatusFilter("Todos");
                setPlanStatusFilter("Todas as situacoes");
                setSelectedIds([]);
              }}
            >
              <Select
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
              >
                <option>Todos os planos</option>
                {plans.map((plan) => (
                  <option key={plan}>{plan}</option>
                ))}
              </Select>
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Todos</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
              <Select
                value={planStatusFilter}
                onChange={(event) =>
                  setPlanStatusFilter(
                    event.target.value as (typeof planSituationOptions)[number],
                  )
                }
              >
                {planSituationOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </ListToolbar>
          </div>
          <Table
            columns={[
              "",
              "Cliente",
              "Plano",
              "Status",
              "Último check-in",
              "Vencimento",
              "Ações",
            ]}
            containerClassName="max-h-[430px]"
          >
            {pageData.pageRows.map((client) => (
              <tr key={client.id} className="table-row">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-noogym-lime"
                    checked={selectedIds.includes(client.id)}
                    onChange={() => toggleSelection(client.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar label={client.avatar ?? "CL"} />
                    <div>
                      <p>{client.name}</p>
                      <p className="text-xs text-zinc-400">{client.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={badgeTone(client.planTone)}>{client.plan}</Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusDot
                    label={client.status}
                    tone={client.status === "Ativo" ? "lime" : "red"}
                  />
                </td>
                <td className="px-4 py-3">{client.lastCheckin}</td>
                <td className="px-4 py-3">
                  <PlanExpiryCell client={client} />
                </td>
                <td className="px-4 py-3">
                  <TableActions
                    onView={() => openClientModal("view", client)}
                    onEdit={() => openClientModal("edit", client)}
                    onMessage={() => openClientModal("message", client)}
                    onPayment={() => openClientModal("payment", client)}
                    onHistory={() => openClientModal("history", client)}
                    onDeactivate={() => openClientModal("deactivate", client)}
                  />
                </td>
              </tr>
            ))}
          </Table>
          <ListPagination
            page={pageData.page}
            totalPages={pageData.totalPages}
            totalItems={filtered.length}
            start={pageData.start}
            end={pageData.end}
            label="clientes"
            onPageChange={setPage}
          />
          <div className="mt-3 flex justify-end text-sm">
            <button
              className="text-noogym-lime"
              onClick={toggleFilteredSelection}
            >
              {allFilteredSelected
                ? "Limpar seleção filtrada"
                : "Selecionar filtrados"}
            </button>
          </div>
        </Card>
      </div>
      <aside className="space-y-3">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Distribuição por plano</h2>
          <DonutChart
            center={String(clientsWithCheckins.length)}
            items={planDistribution}
          />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex justify-between">
            <h2 className="font-semibold">Aniversariantes do mês</h2>
            <button
              className="text-xs text-noogym-lime"
              onClick={() =>
                toastInfo(
                  "Aniversariantes",
                  `${birthdayClients.length} cliente(s) com data cadastrada.`,
                )
              }
            >
              Ver todos
            </button>
          </div>
          {birthdayClients.length ? (
            birthdayClients.map((client) => (
              <div key={client.id} className="mb-3 flex items-center gap-3">
                <Avatar label={client.avatar ?? "CL"} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {client.name}
                </span>
                <span className="text-xs text-zinc-400">{client.birthday}</span>
                <Gift className="h-4 w-4" />
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">Sem datas cadastradas.</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Ações rápidas</h2>
          <div className="space-y-2">
            <Button
              className="w-full justify-start"
              onClick={() => setModal("import")}
            >
              Importar clientes
            </Button>
            <Button
              className="w-full justify-start"
              onClick={() => exportClients("CSV")}
            >
              Exportar clientes
            </Button>
            <Button
              className="w-full justify-start"
              onClick={() => setModal("message")}
            >
              Enviar mensagem
            </Button>
            <DropdownMenu
              label="Mais ações"
              actions={[
                {
                  label: "Limpar seleção",
                  onClick: () => {
                    setSelectedIds([]);
                    toastSuccess("Seleção limpa");
                  },
                },
                {
                  label: "Exportar selecionados",
                  onClick: () => exportClients("CSV"),
                },
              ]}
            />
          </div>
        </Card>
      </aside>
      <NewClientModal open={modal === "new"} onClose={closeModal} />
      <ImportModal
        open={modal === "import"}
        title="Importar clientes"
        fields={csvHeaders.slice(0, 6)}
        examples={[
          "Carlos Alberto Silva",
          "carlos@email.com",
          "+244 923 456 789",
          "20/05/1990",
          "Plano Premium Mensal",
          "10045",
        ]}
        tips={[
          "A primeira linha deve conter os cabeçalhos.",
          "E-mails devem ser únicos.",
          "Telefones devem conter o código do país.",
          "No momento a importação aceita CSV.",
        ]}
        confirmLabel="Importar clientes"
        selectedFileName={importFileName}
        previewRows={importPreview}
        onDownloadTemplate={downloadTemplate}
        onFileSelected={importFile}
        onClose={() => setModal(null)}
        onConfirm={confirmImport}
      />
      <ExportModal
        open={modal === "export"}
        title="Exportar clientes"
        dataOptions={[
          "Dados pessoais",
          "Plano e contrato",
          "Informações financeiras",
          "Check-ins",
          "Avaliações físicas",
          "Observações",
        ]}
        onClose={() => setModal(null)}
        onConfirm={exportClients}
      />
      {selectedClient ? (
        <ClientMessageModal
          open={modal === "message"}
          client={selectedClient}
          onClose={closeModal}
        />
      ) : (
        <BulkClientMessageModal
          open={modal === "message"}
          clients={clientsWithCheckins}
          filteredClients={filtered}
          selectedClients={selectedClients}
          onClose={closeModal}
        />
      )}
      <ClientDetailsModal
        open={modal === "view"}
        client={selectedClient}
        financeRecords={selectedClientFinanceRecords}
        onOpenQr={() => setModal("qr")}
        onClose={closeModal}
      />
      <ClientQrModal
        open={modal === "qr"}
        client={selectedClient}
        onRegenerate={async () => {
          if (!selectedClient) return;
          const updated = await regenerateClientQr(selectedClient.id);
          if (updated) setSelectedClient(updated);
          toastSuccess("QR Code atualizado", "O QR antigo deixa de ser valido.");
        }}
        onClose={closeModal}
      />
      <NewClientModal
        open={modal === "edit"}
        client={selectedClient}
        onClose={closeModal}
      />
      <ClientPaymentModal
        open={modal === "payment"}
        client={selectedClient}
        plans={availablePlans}
        accounts={financeAccounts}
        financeRecords={selectedClientFinanceRecords}
        onClose={closeModal}
        onConfirm={(payment) => {
          if (!selectedClient) return;
          const remoteId = (
            selectedClient as ClientRecord & { remoteId?: string }
          ).remoteId;
          const memberId =
            remoteId ??
            (isUuidLike(selectedClient.id) ? selectedClient.id : undefined);
          const receipt = receiptText(selectedClient, payment);
          addRevenue({
            memberId,
            category: "Mensalidades",
            value: payment.amount,
            grossValue: payment.baseAmount,
            discountValue: payment.discountAmount,
            lateFeeValue: payment.lateFeeAmount,
            outstandingValue: payment.outstandingAmount,
            receiptNumber: payment.receiptNumber,
            date: payment.paidAt,
            status: "Recebido",
            method: payment.method,
            accountId: payment.accountId,
            note: `${payment.note} | Recibo ${payment.receiptNumber}`,
          });
          if (
            payment.renewPlan &&
            payment.nextExpires &&
            payment.outstandingAmount <= 0
          ) {
            const nextStatus = normalize(selectedClient.status).includes(
              "atras",
            )
              ? "Ativo"
              : selectedClient.status;
            updateClient(selectedClient.id, {
              expires: payment.nextExpires,
              status: nextStatus,
              planTone: "lime",
            });
          }
          downloadFile(
            `recibo-${payment.receiptNumber}.txt`,
            receipt,
            "text/plain;charset=utf-8",
          );
          if (payment.printReceipt)
            printText(`Recibo ${payment.receiptNumber}`, receipt);
          if (payment.sendWhatsApp)
            window.open(
              whatsappPaymentLink(selectedClient, payment),
              "_blank",
              "noopener,noreferrer",
            );
          if (payment.outstandingAmount > 0) {
            toastInfo(
              "Pagamento parcial registrado",
              `Saldo pendente: ${moneyLabel(payment.outstandingAmount)}.`,
            );
          } else {
            toastSuccess(
              "Pagamento registrado",
              `${selectedClient.name} - ${moneyLabel(payment.amount)}.`,
            );
          }
          closeModal();
        }}
      />
      <ClientHistoryModal
        open={modal === "history"}
        client={selectedClient}
        financeRecords={selectedClientFinanceRecords}
        onClose={closeModal}
      />
      <ConfirmModal
        open={modal === "deactivate"}
        title="Desativar cliente"
        message={`Deseja desativar ${selectedClient?.name ?? "este cliente"}?`}
        confirmLabel="Desativar"
        danger
        onClose={closeModal}
        onConfirm={() => {
          if (selectedClient) deactivateClient(selectedClient.id);
          toastSuccess("Cliente desativado com sucesso");
          closeModal();
        }}
        details={
          selectedClient ? (
            <div className="space-y-1 text-sm">
              <p>{selectedClient.name}</p>
              <p className="text-zinc-400">{selectedClient.phone}</p>
              <p className="text-zinc-400">{selectedClient.plan}</p>
            </div>
          ) : null
        }
      />
    </div>
  );
}

const moneyLabel = (value: number) =>
  `${formatMoneyValue(Math.max(0, value))} Kz`;
const receiptNumber = () =>
  `NG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const clientFinanceRecords = (
  records: FinanceRecord[],
  client: ClientRecord | null,
) => {
  if (!client) return [];
  const clientRemoteId = (client as ClientRecord & { remoteId?: string })
    .remoteId;
  const ids = new Set([client.id, clientRemoteId].filter(Boolean));
  const clientName = normalize(client.name);

  return records
    .filter((record) => record.kind === "Receita")
    .filter((record) => {
      if (record.memberId && ids.has(record.memberId)) return true;
      const text = normalize(`${record.note ?? ""} ${record.category ?? ""}`);
      return Boolean(clientName && text.includes(clientName));
    })
    .sort((a, b) => b.id.localeCompare(a.id));
};
const financeTotals = (records: FinanceRecord[]) => ({
  paid: records
    .filter((record) => record.status === "Recebido")
    .reduce((sum, record) => sum + record.value, 0),
  pending: records.reduce(
    (sum, record) =>
      sum +
      (record.outstandingValue ??
        (record.status === "Pendente" ? record.value : 0)),
    0,
  ),
  discounts: records.reduce(
    (sum, record) => sum + (record.discountValue ?? 0),
    0,
  ),
  lateFees: records.reduce(
    (sum, record) => sum + (record.lateFeeValue ?? 0),
    0,
  ),
});
const receiptText = (client: ClientRecord, payment: ClientPaymentPayload) =>
  [
    "NOOGYM - RECIBO DE PAGAMENTO",
    `Recibo: ${payment.receiptNumber}`,
    `Cliente: ${client.name}`,
    `Telefone: ${client.phone}`,
    `Plano: ${client.plan}`,
    `Data: ${payment.paidAt}`,
    `Metodo: ${payment.method}`,
    `Valor base: ${moneyLabel(payment.baseAmount)}`,
    `Desconto: ${moneyLabel(payment.discountAmount)}`,
    `Multa: ${moneyLabel(payment.lateFeeAmount)}`,
    `Total devido: ${moneyLabel(payment.totalDue)}`,
    `Valor pago: ${moneyLabel(payment.amount)}`,
    `Saldo pendente: ${moneyLabel(payment.outstandingAmount)}`,
    `Status: ${payment.outstandingAmount > 0 ? "Pagamento parcial" : "Pago"}`,
    payment.nextExpires
      ? `Proximo vencimento: ${payment.nextExpires}`
      : "Vencimento: nao alterado",
    payment.note ? `Observacao: ${payment.note}` : "",
    "",
    "Obrigado pela preferencia.",
  ]
    .filter(Boolean)
    .join("\n");
const printText = (title: string, text: string) => {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) {
    toastInfo("Impressao bloqueada", "Permita pop-ups para imprimir o recibo.");
    return;
  }
  printWindow.document.write(
    `<title>${title}</title><pre style="font: 14px/1.45 monospace; white-space: pre-wrap">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
const whatsappPaymentLink = (
  client: ClientRecord,
  payment: ClientPaymentPayload,
) => {
  const phone = client.phone.replace(/\D/g, "");
  const message = [
    `Ola ${client.name}, confirmamos o pagamento no Noogym.`,
    `Recibo: ${payment.receiptNumber}`,
    `Valor pago: ${moneyLabel(payment.amount)}`,
    payment.outstandingAmount > 0
      ? `Saldo pendente: ${moneyLabel(payment.outstandingAmount)}`
      : "Situacao: mensalidade liquidada",
    payment.nextExpires ? `Proximo vencimento: ${payment.nextExpires}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};
const financeRecordReceiptText = (
  client: ClientRecord,
  record: FinanceRecord,
) =>
  [
    "NOOGYM - RECIBO DE PAGAMENTO",
    `Recibo: ${record.receiptNumber ?? record.id}`,
    `Cliente: ${client.name}`,
    `Telefone: ${client.phone}`,
    `Plano: ${client.plan}`,
    `Data: ${record.date}`,
    `Metodo: ${record.method ?? "Nao informado"}`,
    `Valor base: ${moneyLabel(record.grossValue ?? record.value)}`,
    `Desconto: ${moneyLabel(record.discountValue ?? 0)}`,
    `Multa: ${moneyLabel(record.lateFeeValue ?? 0)}`,
    `Valor pago: ${moneyLabel(record.value)}`,
    `Saldo pendente: ${moneyLabel(record.outstandingValue ?? 0)}`,
    `Status: ${record.status}`,
    record.note ? `Observacao: ${record.note}` : "",
    "",
    "Obrigado pela preferencia.",
  ]
    .filter(Boolean)
    .join("\n");
const recordWhatsappLink = (client: ClientRecord, record: FinanceRecord) => {
  const phone = client.phone.replace(/\D/g, "");
  const message = [
    `Ola ${client.name}, confirmamos o pagamento no Noogym.`,
    `Recibo: ${record.receiptNumber ?? record.id}`,
    `Valor pago: ${moneyLabel(record.value)}`,
    (record.outstandingValue ?? 0) > 0
      ? `Saldo pendente: ${moneyLabel(record.outstandingValue ?? 0)}`
      : "Situacao: mensalidade liquidada",
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

type ClientPaymentPayload = {
  amount: number;
  baseAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  totalDue: number;
  outstandingAmount: number;
  method: string;
  paidAt: string;
  accountId?: string;
  note: string;
  renewPlan: boolean;
  nextExpires?: string;
  receiptNumber: string;
  sendWhatsApp: boolean;
  printReceipt: boolean;
};

function PlanExpiryCell({ client }: { client: ClientRecord }) {
  const situation = planSituation(client);
  const tone = planSituationTone(situation);

  return (
    <div className="min-w-[150px] space-y-1">
      <p className="text-sm text-zinc-100">
        {client.expires ?? "Sem vencimento"}
      </p>
      <StatusDot label={planSituationDetail(client)} tone={tone} />
    </div>
  );
}

function ClientPaymentModal({
  open,
  client,
  plans,
  accounts,
  financeRecords,
  onClose,
  onConfirm,
}: {
  open: boolean;
  client: ClientRecord | null;
  plans: PlanRecord[];
  accounts: FinanceAccountRecord[];
  financeRecords: FinanceRecord[];
  onClose: () => void;
  onConfirm: (payment: ClientPaymentPayload) => void;
}) {
  const [paymentMode, setPaymentMode] = useState("Pagar mensalidade");
  const [baseAmount, setBaseAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [lateFeeAmount, setLateFeeAmount] = useState("");
  const [method, setMethod] = useState("Dinheiro");
  const [paidAt, setPaidAt] = useState(isoDateInput());
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [printReceipt, setPrintReceipt] = useState(false);

  const selectedPlan = useMemo(() => {
    if (!client) return undefined;
    return (
      plans.find((plan) => plan.id === client.planId) ??
      plans.find((plan) => normalize(plan.name) === normalize(client.plan))
    );
  }, [client, plans]);
  const durationDays = planDurationDays(selectedPlan?.duration ?? client?.plan);
  const nextExpires = client
    ? formatDatePt(nextExpiryDate(client, durationDays))
    : undefined;
  const renewPlan = paymentMode !== "Valor personalizado";
  const parsedBase = parseMoneyValue(baseAmount);
  const parsedDiscount = Math.min(parseMoneyValue(discountAmount), parsedBase);
  const parsedLateFee = parseMoneyValue(lateFeeAmount);
  const totalDue = Math.max(0, parsedBase - parsedDiscount + parsedLateFee);
  const parsedPaid = parseMoneyValue(paidAmount);
  const outstandingAmount = Math.max(0, totalDue - parsedPaid);
  const totals = useMemo(() => financeTotals(financeRecords), [financeRecords]);

  useEffect(() => {
    if (!open || !client) return;
    const suggestedAmount = parseMoneyValue(selectedPlan?.price);
    const overdueDays = Math.max(0, -(daysUntilExpiry(client) ?? 0));
    const suggestedLateFee =
      overdueDays > 0 && suggestedAmount
        ? Math.round(suggestedAmount * 0.02)
        : 0;
    const due = suggestedAmount + suggestedLateFee;
    setPaymentMode(
      planSituation(client) === "Vencido"
        ? "Pagar mensalidade"
        : "Renovar plano",
    );
    setBaseAmount(suggestedAmount ? String(suggestedAmount) : "");
    setDiscountAmount("");
    setLateFeeAmount(suggestedLateFee ? String(suggestedLateFee) : "");
    setPaidAmount(due ? String(due) : "");
    setMethod("Dinheiro");
    setPaidAt(isoDateInput());
    setAccountId(accounts.find((account) => account.isDefault)?.id ?? "");
    setNote(`Mensalidade - ${client.name} - ${client.plan}`);
    setSendWhatsApp(true);
    setPrintReceipt(false);
  }, [accounts, client, open, selectedPlan]);

  const confirm = () => {
    if (!client) return;
    if (parsedPaid <= 0) {
      toastInfo(
        "Valor obrigatorio",
        "Informe o valor pago antes de registrar.",
      );
      return;
    }
    if (parsedPaid > totalDue) {
      toastInfo(
        "Valor acima do devido",
        "Ajuste desconto, multa ou valor pago.",
      );
      return;
    }

    onConfirm({
      amount: parsedPaid,
      baseAmount: parsedBase,
      discountAmount: parsedDiscount,
      lateFeeAmount: parsedLateFee,
      totalDue,
      outstandingAmount,
      method,
      paidAt,
      accountId: accountId || undefined,
      note: note.trim() || `Mensalidade - ${client.name}`,
      renewPlan,
      nextExpires: renewPlan ? nextExpires : undefined,
      receiptNumber: receiptNumber(),
      sendWhatsApp,
      printReceipt,
    });
  };

  return (
    <Modal
      open={open}
      title="Registrar pagamento"
      description={
        client ? `${client.name} - ${client.plan}` : "Pagamento de mensalidade"
      }
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={confirm}>
            Registrar pagamento
          </Button>
        </>
      }
    >
      {client ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p className="text-zinc-400">Vencimento atual</p>
              <p className="mt-1 font-medium">
                {client.expires ?? "Sem vencimento"}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p className="text-zinc-400">Situacao</p>
              <p className="mt-1 font-medium">{planSituationDetail(client)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p className="text-zinc-400">Proximo vencimento</p>
              <p className="mt-1 font-medium">
                {renewPlan ? nextExpires : "Nao altera"}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p className="text-zinc-400">Saldo em aberto</p>
              <p className="mt-1 font-medium">{moneyLabel(totals.pending)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FormSelect
              label="Operacao"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              options={[
                "Pagar mensalidade",
                "Renovar plano",
                "Valor personalizado",
              ]}
            />
            <FormInput
              label="Valor base (Kz)"
              type="number"
              min="0"
              step="1"
              value={baseAmount}
              onChange={(event) => setBaseAmount(event.target.value)}
              placeholder="0"
            />
            <FormInput
              label="Valor pago (Kz)"
              type="number"
              min="0"
              step="1"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
              placeholder="0"
            />
            <FormInput
              label="Desconto (Kz)"
              type="number"
              min="0"
              step="1"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
              placeholder="0"
            />
            <FormInput
              label="Multa por atraso (Kz)"
              type="number"
              min="0"
              step="1"
              value={lateFeeAmount}
              onChange={(event) => setLateFeeAmount(event.target.value)}
              placeholder="0"
            />
            <FormSelect
              label="Metodo"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              options={[
                "Dinheiro",
                "Transferencia",
                "Cartao",
                "Multicaixa",
                "Outro",
              ]}
            />
            <FormInput
              label="Data do pagamento"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
            <FormSelect
              label="Conta"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">Conta padrao</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Duracao renovada"
              value={`${durationDays} dia(s)`}
              disabled
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryTile label="Total devido" value={moneyLabel(totalDue)} />
            <SummaryTile label="Pago agora" value={moneyLabel(parsedPaid)} />
            <SummaryTile
              label="Saldo pendente"
              value={moneyLabel(outstandingAmount)}
              tone={
                outstandingAmount > 0 ? "text-yellow-300" : "text-noogym-lime"
              }
            />
            <SummaryTile
              label="Descontos acumulados"
              value={moneyLabel(totals.discounts + parsedDiscount)}
            />
          </div>

          <FormTextarea
            label="Observacao"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-noogym-lime"
                checked={printReceipt}
                onChange={(event) => setPrintReceipt(event.target.checked)}
              />
              Imprimir recibo apos registrar
            </label>
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-noogym-lime"
                checked={sendWhatsApp}
                onChange={(event) => setSendWhatsApp(event.target.checked)}
              />
              Enviar confirmacao por WhatsApp
            </label>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function SummaryTile({
  label,
  value,
  tone = "text-zinc-100",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
      <p className="text-zinc-400">{label}</p>
      <p className={`mt-1 font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ClientDetailsModal({
  open,
  client,
  financeRecords,
  onOpenQr,
  onClose,
}: {
  open: boolean;
  client: ClientRecord | null;
  financeRecords: FinanceRecord[];
  onOpenQr: () => void;
  onClose: () => void;
}) {
  if (!client) return null;
  const totals = financeTotals(financeRecords);
  const recentPayments = financeRecords.slice(0, 4);

  const rows = [
    ["Codigo", client.id],
    ["Telefone", client.phone],
    ["E-mail", client.email],
    ["Documento/BI", client.document ?? "-"],
    ["Plano", client.plan],
    ["Vencimento", client.expires ?? "Sem vencimento"],
    ["Ultimo check-in", client.lastCheckin ?? "Sem check-in"],
    ["Aniversario", client.birthday ?? "-"],
  ];

  return (
    <Modal
      open={open}
      title="Detalhes do cliente"
      description={client.name}
      size="xl"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
          <Avatar label={client.avatar ?? "CL"} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">{client.name}</h3>
            <p className="text-sm text-zinc-400">{client.phone}</p>
          </div>
          <Button icon={<QrCode className="h-4 w-4" />} onClick={onOpenQr}>
            QR Code
          </Button>
          <Badge tone={badgeTone(client.planTone)}>{client.plan}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-white/10 bg-black/20 p-3 text-sm"
            >
              <p className="text-zinc-400">{label}</p>
              <p className="mt-1 truncate text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryTile label="Recebido" value={moneyLabel(totals.paid)} />
          <SummaryTile
            label="Pendente"
            value={moneyLabel(totals.pending)}
            tone={totals.pending > 0 ? "text-yellow-300" : "text-noogym-lime"}
          />
          <SummaryTile label="Descontos" value={moneyLabel(totals.discounts)} />
          <SummaryTile label="Multas" value={moneyLabel(totals.lateFees)} />
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="font-semibold">Historico financeiro</h3>
            <span className="text-xs text-zinc-400">
              {financeRecords.length} lancamento(s)
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {recentPayments.length ? (
              recentPayments.map((record) => (
                <FinanceRecordRow
                  key={record.id}
                  client={client}
                  record={record}
                  compact
                />
              ))
            ) : (
              <p className="p-4 text-sm text-zinc-400">
                Sem pagamentos registrados.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ClientQrModal({
  open,
  client,
  onRegenerate,
  onClose,
}: {
  open: boolean;
  client: ClientRecord | null;
  onRegenerate: () => Promise<void>;
  onClose: () => void;
}) {
  const latestClient = useClientsStore((state) =>
    client ? state.clients.find((item) => item.id === client.id) : null,
  );
  const current = latestClient ?? client;
  const payload = current?.qrPayload;
  const [qrImage, setQrImage] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    let active = true;
    if (!open || !payload) {
      setQrImage("");
      return;
    }

    void toDataURL(payload, {
      width: 260,
      margin: 1,
      color: { dark: "#070A0A", light: "#FFFFFF" },
    }).then((image) => {
      if (active) setQrImage(image);
    });

    return () => {
      active = false;
    };
  }, [open, payload]);

  if (!current) return null;

  const copyPayload = async () => {
    if (!payload) {
      toastInfo("QR Code indisponivel", "Gere um QR Code para este cliente primeiro.");
      return;
    }
    await navigator.clipboard?.writeText(payload);
    toastSuccess("Codigo copiado", "Payload do QR Code copiado.");
  };

  const regenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } catch (error) {
      toastInfo(
        "QR Code nao atualizado",
        error instanceof Error ? error.message : "Tente novamente em instantes.",
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Modal
      open={open}
      title="QR Code do cliente"
      description={current.name}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Fechar</Button>
          <Button icon={<Copy className="h-4 w-4" />} onClick={copyPayload}>
            Copiar codigo
          </Button>
          <Button
            variant="primary"
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={isRegenerating}
            onClick={regenerate}
          >
            {payload ? "Regenerar" : "Gerar QR"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
          <Avatar label={current.avatar ?? "CL"} className="h-14 w-14" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{current.name}</p>
            <p className="truncate text-sm text-zinc-400">{current.plan}</p>
          </div>
        </div>
        <div className="flex min-h-[292px] items-center justify-center rounded-md border border-white/10 bg-white p-4">
          {qrImage ? <img src={qrImage} alt={`QR Code de ${current.name}`} className="h-64 w-64" /> : <div className="text-center text-sm text-zinc-700">
            <QrCode className="mx-auto mb-3 h-12 w-12" />
            Gere um QR Code para este cliente.
          </div>}
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
          <p className="mb-1 text-zinc-300">Payload</p>
          <p className="break-all">{payload ?? "Sem QR Code gerado"}</p>
        </div>
      </div>
    </Modal>
  );
}

function ClientMessageModal({
  open,
  client,
  onClose,
}: {
  open: boolean;
  client: ClientRecord;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const send = () => {
    if (!message.trim()) {
      toastInfo("Mensagem obrigatoria", "Escreva a mensagem antes de enviar.");
      return;
    }
    toastSuccess("Mensagem enviada", client.name);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Enviar mensagem"
      description={client.name}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={send}>
            Enviar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="font-medium">{client.name}</p>
          <p className="mt-1 text-zinc-400">
            {client.phone} | {client.email}
          </p>
        </div>
        <FormSelect label="Canal" options={["WhatsApp", "E-mail", "SMS"]} />
        <FormTextarea
          label="Mensagem"
          placeholder="Escreva a mensagem para este cliente..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function BulkClientMessageModal({
  open,
  clients,
  filteredClients,
  selectedClients,
  onClose,
}: {
  open: boolean;
  clients: ClientRecord[];
  filteredClients: ClientRecord[];
  selectedClients: ClientRecord[];
  onClose: () => void;
}) {
  const [audience, setAudience] = useState("Selecionados");
  const [message, setMessage] = useState("");
  const recipients = useMemo(() => {
    if (audience === "Selecionados") return selectedClients;
    if (audience === "Filtrados") return filteredClients;
    if (audience === "Ativos")
      return clients.filter((client) => client.status === "Ativo");
    if (audience === "Inativos")
      return clients.filter((client) => client.status !== "Ativo");
    return clients;
  }, [audience, clients, filteredClients, selectedClients]);
  const send = () => {
    if (!recipients.length) {
      toastInfo(
        "Sem destinatarios",
        "Selecione clientes ou altere o público da mensagem.",
      );
      return;
    }
    if (!message.trim()) {
      toastInfo("Mensagem obrigatoria", "Escreva a mensagem antes de enviar.");
      return;
    }
    toastSuccess(
      "Mensagem enviada",
      `${recipients.length} cliente(s) na fila.`,
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Enviar mensagem"
      description="Envio para clientes"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={send}>
            Enviar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormSelect
            label="Público"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            options={[
              "Selecionados",
              "Filtrados",
              "Ativos",
              "Inativos",
              "Todos",
            ]}
          />
          <FormSelect label="Canal" options={["WhatsApp", "E-mail", "SMS"]} />
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="font-medium">{recipients.length} destinatário(s)</p>
          <p className="mt-1 truncate text-zinc-400">
            {recipients
              .slice(0, 4)
              .map((client) => client.name)
              .join(", ") || "Nenhum cliente selecionado"}
          </p>
        </div>
        <FormTextarea
          label="Mensagem"
          placeholder="Escreva a mensagem para os clientes..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function ClientHistoryModal({
  open,
  client,
  financeRecords,
  onClose,
}: {
  open: boolean;
  client: ClientRecord | null;
  financeRecords: FinanceRecord[];
  onClose: () => void;
}) {
  if (!client) return null;

  const events = [
    ["Cadastro atualizado", "Hoje, 10:30", `Plano atual: ${client.plan}`],
    [
      "Ultimo check-in",
      client.lastCheckin ?? "Sem check-in",
      "Acesso registrado na unidade",
    ],
    [
      "Vencimento do plano",
      client.expires ?? "Sem vencimento",
      "Data prevista de renovacao",
    ],
  ];
  const totals = financeTotals(financeRecords);

  return (
    <Modal
      open={open}
      title="Historico do cliente"
      description={client.name}
      size="xl"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryTile label="Recebido" value={moneyLabel(totals.paid)} />
          <SummaryTile
            label="Pendente"
            value={moneyLabel(totals.pending)}
            tone={totals.pending > 0 ? "text-yellow-300" : "text-noogym-lime"}
          />
          <SummaryTile label="Descontos" value={moneyLabel(totals.discounts)} />
          <SummaryTile label="Multas" value={moneyLabel(totals.lateFees)} />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            {events.map(([title, date, description]) => (
              <div
                key={`${title}-${date}`}
                className="rounded-md border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">{date}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="font-semibold">Pagamentos e recibos</h3>
            </div>
            <div className="max-h-[420px] divide-y divide-white/10 overflow-auto">
              {financeRecords.length ? (
                financeRecords.map((record) => (
                  <FinanceRecordRow
                    key={record.id}
                    client={client}
                    record={record}
                  />
                ))
              ) : (
                <p className="p-4 text-sm text-zinc-400">
                  Sem historico financeiro.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FinanceRecordRow({
  client,
  record,
  compact = false,
}: {
  client: ClientRecord;
  record: FinanceRecord;
  compact?: boolean;
}) {
  const receipt = financeRecordReceiptText(client, record);
  const saveReceipt = () =>
    downloadFile(
      `recibo-${record.receiptNumber ?? record.id}.txt`,
      receipt,
      "text/plain;charset=utf-8",
    );
  const printReceiptAction = () =>
    printText(`Recibo ${record.receiptNumber ?? record.id}`, receipt);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{record.category}</p>
          <Badge tone={record.status === "Recebido" ? "lime" : "yellow"}>
            {record.status}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-zinc-400">
          {record.date} | {record.method ?? "Metodo nao informado"} |{" "}
          {record.receiptNumber ?? record.id}
        </p>
        {!compact && record.note ? (
          <p className="mt-1 truncate text-xs text-zinc-500">{record.note}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className="font-semibold">{moneyLabel(record.value)}</p>
          {(record.outstandingValue ?? 0) > 0 ? (
            <p className="text-xs text-yellow-300">
              {moneyLabel(record.outstandingValue ?? 0)} pendente
            </p>
          ) : null}
        </div>
        <button
          title="Baixar recibo"
          className="rounded-md border border-white/10 p-2 hover:text-noogym-lime"
          onClick={saveReceipt}
        >
          <Receipt className="h-4 w-4" />
        </button>
        <button
          title="Imprimir recibo"
          className="rounded-md border border-white/10 p-2 hover:text-noogym-lime"
          onClick={printReceiptAction}
        >
          <Printer className="h-4 w-4" />
        </button>
        <a
          title="Enviar WhatsApp"
          className="rounded-md border border-white/10 p-2 hover:text-noogym-lime"
          href={recordWhatsappLink(client, record)}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
