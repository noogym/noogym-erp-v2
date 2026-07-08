import { Download, Gift, Mail, Plus, Upload, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ClientRecord } from "@noogym/types";
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
import { FormSelect } from "@noogym/ui";
import { FormTextarea } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Modal } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { ListPagination, ListToolbar, paginateRows } from "../components/tables/ListControls";
import { TableActions } from "../components/tables/TableActions";
import { useCheckinsStore } from "../store/checkinsStore";
import { useClientsStore } from "../store/clientsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

const badgeTone = (tone?: string) => (["lime", "yellow", "purple", "blue", "orange", "red", "gray", "green"].includes(tone ?? "") ? tone as "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "gray" | "green" : "lime");
type ClientModal = "new" | "import" | "export" | "message" | "view" | "edit" | "history" | "deactivate" | null;

const planColors = ["#B6FF00", "#A78BFA", "#FACC15", "#38BDF8", "#84CC16", "#F97316"];
const csvHeaders = ["Nome completo", "E-mail", "Telefone", "Data de nascimento", "Plano", "Codigo do cliente", "Documento", "Status"];
const monthAliases = new Map([
  ["jan", 0], ["janeiro", 0],
  ["fev", 1], ["fevereiro", 1],
  ["mar", 2], ["marco", 2], ["março", 2],
  ["abr", 3], ["abril", 3],
  ["mai", 4], ["maio", 4],
  ["jun", 5], ["junho", 5],
  ["jul", 6], ["julho", 6],
  ["ago", 7], ["agosto", 7],
  ["set", 8], ["setembro", 8],
  ["out", 9], ["outubro", 9],
  ["nov", 10], ["novembro", 10],
  ["dez", 11], ["dezembro", 11]
]);

const escapeCsv = (value?: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
  const textMonth = Array.from(monthAliases.entries()).find(([label]) => normalized.includes(label))?.[1];
  if (textMonth !== undefined) return textMonth;
  const parts = normalized.split(/[/-]/).map((part) => Number(part));
  return parts.length >= 2 && parts[1] >= 1 && parts[1] <= 12 ? parts[1] - 1 : undefined;
};
const formatBirthday = (birthday?: string) => {
  if (!birthday) return undefined;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return birthday;
  const month = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][date.getMonth()];
  return `${String(date.getDate()).padStart(2, "0")} ${month}`;
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
    client.expires
  ]);
  return [["Nome", "E-mail", "Telefone", "Nascimento", "Plano", "Codigo", "Documento", "Status", "Ultimo check-in", "Vencimento"], ...rows]
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
    createdAt: new Date().toISOString()
  };
}

export default function Clientes() {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("Todos os planos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState<ClientModal>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importRows, setImportRows] = useState<Array<Partial<ClientRecord>>>([]);
  const clients = useClientsStore((state) => state.clients);
  const addClient = useClientsStore((state) => state.addClient);
  const deactivateClient = useClientsStore((state) => state.deactivateClient);
  const checkins = useCheckinsStore((state) => state.checkins);
  const lastCheckinsByClient = useMemo(() => {
    const latest = new Map<string, string>();
    checkins.forEach((checkin) => {
      if (!latest.has(checkin.clientId)) latest.set(checkin.clientId, checkin.dateTime);
    });
    return latest;
  }, [checkins]);
  const clientsWithCheckins = useMemo(() => clients.map((client) => ({ ...client, lastCheckin: lastCheckinsByClient.get(client.id) ?? client.lastCheckin })), [clients, lastCheckinsByClient]);
  const plans = useMemo(() => Array.from(new Set(clientsWithCheckins.map((client) => client.plan || "Sem plano"))).sort(), [clientsWithCheckins]);
  const statuses = useMemo(() => Array.from(new Set(clientsWithCheckins.map((client) => client.status || "Sem status"))).sort(), [clientsWithCheckins]);
  const filtered = useMemo(() => clientsWithCheckins.filter((client) => {
    const matchesQuery = `${client.name} ${client.phone} ${client.email} ${client.plan}`.toLowerCase().includes(query.toLowerCase());
    const matchesPlan = planFilter === "Todos os planos" || client.plan === planFilter;
    const matchesStatus = statusFilter === "Todos" || client.status === statusFilter;
    return matchesQuery && matchesPlan && matchesStatus;
  }), [clientsWithCheckins, planFilter, query, statusFilter]);
  const pageData = useMemo(() => paginateRows(filtered, page, pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [pageSize, planFilter, query, statusFilter]);
  const selectedClients = useMemo(() => clientsWithCheckins.filter((client) => selectedIds.includes(client.id)), [clientsWithCheckins, selectedIds]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((client) => selectedIds.includes(client.id));
  const metrics = useMemo(() => {
    const active = clientsWithCheckins.filter((client) => client.status === "Ativo").length;
    const inactive = clientsWithCheckins.filter((client) => client.status !== "Ativo").length;
    const total = clientsWithCheckins.length;
    return { active, inactive, total, recent: clientsWithCheckins.filter(isRecentClient).length };
  }, [clientsWithCheckins]);
  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    clientsWithCheckins.forEach((client) => counts.set(client.plan || "Sem plano", (counts.get(client.plan || "Sem plano") ?? 0) + 1));
    const total = clientsWithCheckins.length || 1;
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count], index) => ({
      label,
      value: Math.round((count / total) * 100),
      color: planColors[index % planColors.length]
    }));
  }, [clientsWithCheckins]);
  const birthdayClients = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return clientsWithCheckins.filter((client) => birthdayMonth(client.birthday) === currentMonth).slice(0, 4);
  }, [clientsWithCheckins]);
  const openClientModal = (nextModal: Exclude<ClientModal, "new" | "import" | "export" | null>, client: ClientRecord) => {
    setSelectedClient(client);
    setModal(nextModal);
  };
  const closeModal = () => {
    setModal(null);
    setSelectedClient(null);
  };
  const toggleSelection = (clientId: string) => setSelectedIds((ids) => ids.includes(clientId) ? ids.filter((id) => id !== clientId) : [...ids, clientId]);
  const toggleFilteredSelection = () => setSelectedIds((ids) => allFilteredSelected ? ids.filter((id) => !filtered.some((client) => client.id === id)) : Array.from(new Set([...ids, ...filtered.map((client) => client.id)])));
  const exportTarget = () => selectedClients.length > 0 ? selectedClients : filtered;
  const exportClients = (format = "CSV") => {
    const target = exportTarget();
    if (!target.length) {
      toastInfo("Sem clientes para exportar", "Ajuste os filtros ou selecione clientes.");
      return;
    }
    const normalizedFormat = normalize(format);
    if (normalizedFormat.includes("json")) {
      downloadFile("clientes.json", JSON.stringify(target, null, 2), "application/json;charset=utf-8");
    } else {
      downloadFile("clientes.csv", `\uFEFF${clientsToCsv(target)}`, "text/csv;charset=utf-8");
      if (normalizedFormat.includes("pdf")) toastInfo("Exportação em CSV", "PDF ainda não está disponível, foi gerado um CSV com os clientes.");
    }
    toastSuccess("Clientes exportados", `${target.length} cliente(s) incluído(s).`);
    setModal(null);
  };
  const downloadTemplate = () => downloadFile("modelo-clientes.csv", `\uFEFF${csvHeaders.map(escapeCsv).join(",")}\n${["Maria Sacalumbo", "maria@email.com", "+244 939 797 66", "15 Mai", "pacote A", "CLI-1001", "000000000LA000", "Ativo"].map(escapeCsv).join(",")}`, "text/csv;charset=utf-8");
  const importFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    const bodyRows = rows.length > 1 && rows[0].some((cell) => normalize(cell).includes("nome")) ? rows.slice(1) : rows;
    const parsed = bodyRows.filter((row) => row[0] && row[2]).map(clientRowsFromCsv);
    setImportFileName(file.name);
    setImportPreview(rows);
    setImportRows(parsed);
    toastInfo("Arquivo carregado", `${parsed.length} cliente(s) pronto(s) para importar.`);
  };
  const confirmImport = () => {
    if (!importRows.length) {
      toastInfo("Selecione um CSV", "Use o modelo CSV ou carregue uma lista de clientes.");
      return;
    }
    const imported = importRows.filter((client) => addClient(client)).length;
    const skipped = importRows.length - imported;
    if (imported) {
      toastSuccess("Clientes importados", `${imported} cliente(s) adicionados.`);
    }
    if (skipped) {
      toastInfo("Duplicados ignorados", `${skipped} cliente(s) ja tinham e-mail, telefone ou BI cadastrado.`);
    }
    setImportRows([]);
    setImportPreview([]);
    setImportFileName("");
    setModal(null);
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Clientes" subtitle="Gerencie os clientes da sua academia." actions={<><Button icon={<Upload className="h-4 w-4" />} onClick={() => setModal("import")}>Importar</Button><Button icon={<Download className="h-4 w-4" />} onClick={() => setModal("export")}>Exportar</Button><Button icon={<Mail className="h-4 w-4" />} onClick={() => setModal("message")}>Enviar mensagem</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>Novo cliente</Button></>} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Clientes ativos" value={String(metrics.active)} change={`${metrics.total ? Math.round((metrics.active / metrics.total) * 100) : 0}% do total`} icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Novos clientes" value={String(metrics.recent)} change="Últimos 30 dias" icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard title="Clientes inativos" value={String(metrics.inactive)} change={`${metrics.total ? Math.round((metrics.inactive / metrics.total) * 100) : 0}% do total`} icon={<UsersRound className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Total de clientes" value={String(metrics.total)} change="Total registrado" icon={<UsersRound className="h-5 w-5" />} tone="purple" />
        </div>
        <Card className="mt-4 p-4">
          <div className="mb-4">
            <ListToolbar query={query} onQueryChange={setQuery} queryPlaceholder="Buscar por nome, telefone ou e-mail..." pageSize={pageSize} onPageSizeChange={setPageSize} onClear={() => { setQuery(""); setPlanFilter("Todos os planos"); setStatusFilter("Todos"); setSelectedIds([]); }}>
            <Select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
              <option>Todos os planos</option>
              {plans.map((plan) => <option key={plan}>{plan}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>Todos</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </Select>
            </ListToolbar>
          </div>
          <Table columns={["", "Cliente", "Plano", "Status", "Último check-in", "Vencimento", "Ações"]} containerClassName="max-h-[430px]">
            {pageData.pageRows.map((client) => (
              <tr key={client.id} className="table-row">
                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 accent-noogym-lime" checked={selectedIds.includes(client.id)} onChange={() => toggleSelection(client.id)} /></td>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar label={client.avatar ?? "CL"} /><div><p>{client.name}</p><p className="text-xs text-zinc-400">{client.phone}</p></div></div></td>
                <td className="px-4 py-3"><Badge tone={badgeTone(client.planTone)}>{client.plan}</Badge></td>
                <td className="px-4 py-3"><StatusDot label={client.status} tone={client.status === "Ativo" ? "lime" : "red"} /></td>
                <td className="px-4 py-3">{client.lastCheckin}</td>
                <td className="px-4 py-3">{client.expires}</td>
                <td className="px-4 py-3"><TableActions onView={() => openClientModal("view", client)} onEdit={() => openClientModal("edit", client)} onMessage={() => openClientModal("message", client)} onHistory={() => openClientModal("history", client)} onDeactivate={() => openClientModal("deactivate", client)} /></td>
              </tr>
            ))}
          </Table>
          <ListPagination page={pageData.page} totalPages={pageData.totalPages} totalItems={filtered.length} start={pageData.start} end={pageData.end} label="clientes" onPageChange={setPage} />
          <div className="mt-3 flex justify-end text-sm">
            <button className="text-noogym-lime" onClick={toggleFilteredSelection}>{allFilteredSelected ? "Limpar seleção filtrada" : "Selecionar filtrados"}</button>
          </div>
        </Card>
      </div>
      <aside className="space-y-3">
        <Card className="p-5"><h2 className="mb-4 font-semibold">Distribuição por plano</h2><DonutChart center={String(clientsWithCheckins.length)} items={planDistribution} /></Card>
        <Card className="p-5"><div className="mb-4 flex justify-between"><h2 className="font-semibold">Aniversariantes do mês</h2><button className="text-xs text-noogym-lime" onClick={() => toastInfo("Aniversariantes", `${birthdayClients.length} cliente(s) com data cadastrada.`)}>Ver todos</button></div>{birthdayClients.length ? birthdayClients.map((client) => <div key={client.id} className="mb-3 flex items-center gap-3"><Avatar label={client.avatar ?? "CL"} /><span className="min-w-0 flex-1 truncate text-sm">{client.name}</span><span className="text-xs text-zinc-400">{client.birthday}</span><Gift className="h-4 w-4" /></div>) : <p className="text-sm text-zinc-400">Sem datas cadastradas.</p>}</Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Ações rápidas</h2><div className="space-y-2"><Button className="w-full justify-start" onClick={() => setModal("import")}>Importar clientes</Button><Button className="w-full justify-start" onClick={() => exportClients("CSV")}>Exportar clientes</Button><Button className="w-full justify-start" onClick={() => setModal("message")}>Enviar mensagem</Button><DropdownMenu label="Mais ações" actions={[{ label: "Limpar seleção", onClick: () => { setSelectedIds([]); toastSuccess("Seleção limpa"); } }, { label: "Exportar selecionados", onClick: () => exportClients("CSV") }]} /></div></Card>
      </aside>
      <NewClientModal open={modal === "new"} onClose={closeModal} />
      <ImportModal open={modal === "import"} title="Importar clientes" fields={csvHeaders.slice(0, 6)} examples={["Carlos Alberto Silva", "carlos@email.com", "+244 923 456 789", "20/05/1990", "Plano Premium Mensal", "10045"]} tips={["A primeira linha deve conter os cabeçalhos.", "E-mails devem ser únicos.", "Telefones devem conter o código do país.", "No momento a importação aceita CSV."]} confirmLabel="Importar clientes" selectedFileName={importFileName} previewRows={importPreview} onDownloadTemplate={downloadTemplate} onFileSelected={importFile} onClose={() => setModal(null)} onConfirm={confirmImport} />
      <ExportModal open={modal === "export"} title="Exportar clientes" dataOptions={["Dados pessoais", "Plano e contrato", "Informações financeiras", "Check-ins", "Avaliações físicas", "Observações"]} onClose={() => setModal(null)} onConfirm={exportClients} />
      {selectedClient ? <ClientMessageModal open={modal === "message"} client={selectedClient} onClose={closeModal} /> : <BulkClientMessageModal open={modal === "message"} clients={clientsWithCheckins} filteredClients={filtered} selectedClients={selectedClients} onClose={closeModal} />}
      <ClientDetailsModal open={modal === "view"} client={selectedClient} onClose={closeModal} />
      <NewClientModal open={modal === "edit"} client={selectedClient} onClose={closeModal} />
      <ClientHistoryModal open={modal === "history"} client={selectedClient} onClose={closeModal} />
      <ConfirmModal open={modal === "deactivate"} title="Desativar cliente" message={`Deseja desativar ${selectedClient?.name ?? "este cliente"}?`} confirmLabel="Desativar" danger onClose={closeModal} onConfirm={() => { if (selectedClient) deactivateClient(selectedClient.id); toastSuccess("Cliente desativado com sucesso"); closeModal(); }} details={selectedClient ? <div className="space-y-1 text-sm"><p>{selectedClient.name}</p><p className="text-zinc-400">{selectedClient.phone}</p><p className="text-zinc-400">{selectedClient.plan}</p></div> : null} />
    </div>
  );
}

function ClientDetailsModal({ open, client, onClose }: { open: boolean; client: ClientRecord | null; onClose: () => void }) {
  if (!client) return null;

  const rows = [
    ["Codigo", client.id],
    ["Telefone", client.phone],
    ["E-mail", client.email],
    ["Documento/BI", client.document ?? "-"],
    ["Plano", client.plan],
    ["Vencimento", client.expires ?? "Sem vencimento"],
    ["Ultimo check-in", client.lastCheckin ?? "Sem check-in"],
    ["Aniversario", client.birthday ?? "-"]
  ];

  return (
    <Modal open={open} title="Detalhes do cliente" description={client.name} size="md" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
          <Avatar label={client.avatar ?? "CL"} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">{client.name}</h3>
            <p className="text-sm text-zinc-400">{client.phone}</p>
          </div>
          <Badge tone={badgeTone(client.planTone)}>{client.plan}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
              <p className="text-zinc-400">{label}</p>
              <p className="mt-1 truncate text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ClientMessageModal({ open, client, onClose }: { open: boolean; client: ClientRecord; onClose: () => void }) {
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
    <Modal open={open} title="Enviar mensagem" description={client.name} size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={send}>Enviar</Button></>}>
      <div className="space-y-3">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="font-medium">{client.name}</p>
          <p className="mt-1 text-zinc-400">{client.phone} | {client.email}</p>
        </div>
        <FormSelect label="Canal" options={["WhatsApp", "E-mail", "SMS"]} />
        <FormTextarea label="Mensagem" placeholder="Escreva a mensagem para este cliente..." value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
    </Modal>
  );
}

function BulkClientMessageModal({ open, clients, filteredClients, selectedClients, onClose }: { open: boolean; clients: ClientRecord[]; filteredClients: ClientRecord[]; selectedClients: ClientRecord[]; onClose: () => void }) {
  const [audience, setAudience] = useState("Selecionados");
  const [message, setMessage] = useState("");
  const recipients = useMemo(() => {
    if (audience === "Selecionados") return selectedClients;
    if (audience === "Filtrados") return filteredClients;
    if (audience === "Ativos") return clients.filter((client) => client.status === "Ativo");
    if (audience === "Inativos") return clients.filter((client) => client.status !== "Ativo");
    return clients;
  }, [audience, clients, filteredClients, selectedClients]);
  const send = () => {
    if (!recipients.length) {
      toastInfo("Sem destinatarios", "Selecione clientes ou altere o público da mensagem.");
      return;
    }
    if (!message.trim()) {
      toastInfo("Mensagem obrigatoria", "Escreva a mensagem antes de enviar.");
      return;
    }
    toastSuccess("Mensagem enviada", `${recipients.length} cliente(s) na fila.`);
    onClose();
  };

  return (
    <Modal open={open} title="Enviar mensagem" description="Envio para clientes" size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={send}>Enviar</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormSelect label="Público" value={audience} onChange={(event) => setAudience(event.target.value)} options={["Selecionados", "Filtrados", "Ativos", "Inativos", "Todos"]} />
          <FormSelect label="Canal" options={["WhatsApp", "E-mail", "SMS"]} />
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="font-medium">{recipients.length} destinatário(s)</p>
          <p className="mt-1 truncate text-zinc-400">{recipients.slice(0, 4).map((client) => client.name).join(", ") || "Nenhum cliente selecionado"}</p>
        </div>
        <FormTextarea label="Mensagem" placeholder="Escreva a mensagem para os clientes..." value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
    </Modal>
  );
}

function ClientHistoryModal({ open, client, onClose }: { open: boolean; client: ClientRecord | null; onClose: () => void }) {
  if (!client) return null;

  const events = [
    ["Cadastro atualizado", "Hoje, 10:30", `Plano atual: ${client.plan}`],
    ["Ultimo check-in", client.lastCheckin ?? "Sem check-in", "Acesso registrado na unidade"],
    ["Vencimento do plano", client.expires ?? "Sem vencimento", "Data prevista de renovacao"]
  ];

  return (
    <Modal open={open} title="Historico do cliente" description={client.name} size="md" onClose={onClose}>
      <div className="space-y-3">
        {events.map(([title, date, description]) => (
          <div key={`${title}-${date}`} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
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
    </Modal>
  );
}
