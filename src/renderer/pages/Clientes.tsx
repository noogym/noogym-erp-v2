import { Download, Gift, Mail, Plus, Upload, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { ExportModal } from "../components/modals/ExportModal";
import { ImportModal } from "../components/modals/ImportModal";
import { MessageModal, NewClientModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DonutChart } from "../components/ui/Charts";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Input } from "../components/ui/Input";
import { MetricCard } from "../components/ui/MetricCard";
import { Select } from "../components/ui/Select";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { TableActions } from "../components/tables/TableActions";
import { useClientsStore } from "../store/clientsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

const badgeTone = (tone?: string) => (["lime", "yellow", "purple", "blue", "orange", "red", "gray", "green"].includes(tone ?? "") ? tone as "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "gray" | "green" : "lime");

export default function Clientes() {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"new" | "import" | "export" | "message" | null>(null);
  const clients = useClientsStore((state) => state.clients);
  const importClients = useClientsStore((state) => state.importClients);
  const deactivateClient = useClientsStore((state) => state.deactivateClient);
  const filtered = useMemo(() => clients.filter((client) => `${client.name} ${client.phone} ${client.email} ${client.plan}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Clientes" subtitle="Gerencie os clientes da sua academia." actions={<><Button icon={<Upload className="h-4 w-4" />} onClick={() => setModal("import")}>Importar</Button><Button icon={<Download className="h-4 w-4" />} onClick={() => setModal("export")}>Exportar</Button><Button icon={<Mail className="h-4 w-4" />} onClick={() => setModal("message")}>Enviar mensagem</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>Novo cliente</Button></>} />
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Clientes ativos" value={String(clients.filter((client) => client.status === "Ativo").length)} change="+ 12% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Novos clientes" value="86" change="+ 18% vs mês passado" icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard title="Clientes inativos" value={String(clients.filter((client) => client.status !== "Ativo").length)} change="- 8% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Total de clientes" value={String(clients.length)} change="Total registrado" icon={<UsersRound className="h-5 w-5" />} tone="purple" />
        </div>
        <Card className="mt-4 p-4">
          <div className="mb-4 grid grid-cols-[1fr_170px_150px] gap-3">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone ou e-mail..." />
            <Select><option>Todos os planos</option></Select>
            <Select><option>Status: Todos</option></Select>
          </div>
          <Table columns={["", "Cliente", "Plano", "Status", "Último check-in", "Vencimento", "Ações"]}>
            {filtered.map((client) => (
              <tr key={client.id} className="table-row">
                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 accent-noogym-lime" /></td>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar label={client.avatar ?? "CL"} /><div><p>{client.name}</p><p className="text-xs text-zinc-400">{client.phone}</p></div></div></td>
                <td className="px-4 py-3"><Badge tone={badgeTone(client.planTone)}>{client.plan}</Badge></td>
                <td className="px-4 py-3"><StatusDot label={client.status} tone={client.status === "Ativo" ? "lime" : "red"} /></td>
                <td className="px-4 py-3">{client.lastCheckin}</td>
                <td className="px-4 py-3">{client.expires}</td>
                <td className="px-4 py-3"><TableActions onView={() => toastInfo("Detalhes do cliente", client.name)} onEdit={() => toastInfo("Editar cliente", "Fluxo simulado aberto.")} onMessage={() => setModal("message")} onHistory={() => toastInfo("Histórico de check-ins", client.name)} onDeactivate={() => { deactivateClient(client.id); toastSuccess("Cliente desativado com sucesso"); }} /></td>
              </tr>
            ))}
          </Table>
          <p className="mt-4 text-sm text-zinc-400">Mostrando 1 a {filtered.length} de {clients.length} clientes</p>
        </Card>
      </div>
      <aside className="space-y-3">
        <Card className="p-5"><h2 className="mb-4 font-semibold">Distribuição por plano</h2><DonutChart center={String(clients.length)} items={[{ label: "Premium", value: 45, color: "#B6FF00" }, { label: "Básico", value: 30, color: "#A78BFA" }, { label: "VIP", value: 15, color: "#FACC15" }, { label: "Day Pass", value: 10, color: "#84CC16" }]} /></Card>
        <Card className="p-5"><div className="mb-4 flex justify-between"><h2 className="font-semibold">Aniversariantes do mês</h2><button className="text-xs text-noogym-lime">Ver todos</button></div>{clients.slice(0, 4).map((client) => <div key={client.id} className="mb-3 flex items-center gap-3"><Avatar label={client.avatar ?? "CL"} /><span className="flex-1 text-sm">{client.name}</span><span className="text-xs text-zinc-400">{client.birthday}</span><Gift className="h-4 w-4" /></div>)}</Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Ações rápidas</h2><div className="space-y-2"><Button className="w-full justify-start" onClick={() => setModal("import")}>Importar clientes</Button><Button className="w-full justify-start" onClick={() => setModal("export")}>Exportar clientes</Button><Button className="w-full justify-start" onClick={() => setModal("message")}>Enviar mensagem</Button><DropdownMenu label="Mais ações" actions={[{ label: "Limpar seleção", onClick: () => toastSuccess("Seleção limpa") }, { label: "Exportar selecionados", onClick: () => setModal("export") }]} /></div></Card>
      </aside>
      <NewClientModal open={modal === "new"} onClose={() => setModal(null)} />
      <ImportModal open={modal === "import"} title="Importar clientes" fields={["Nome completo", "E-mail", "Telefone", "Data de nascimento", "Plano", "Código do cliente"]} examples={["Carlos Alberto Silva", "carlos@email.com", "+244 923 456 789", "20/05/1990", "Plano Premium Mensal", "10045"]} tips={["A primeira linha deve conter os cabeçalhos.", "E-mails devem ser únicos.", "Telefones devem conter o código do país."]} confirmLabel="Importar clientes" onClose={() => setModal(null)} onConfirm={() => { importClients(); toastSuccess("Clientes importados com sucesso"); setModal(null); }} />
      <ExportModal open={modal === "export"} title="Exportar clientes" dataOptions={["Dados pessoais", "Plano e contrato", "Informações financeiras", "Check-ins", "Avaliações físicas", "Observações"]} onClose={() => setModal(null)} onConfirm={() => { toastSuccess("Clientes exportados com sucesso"); setModal(null); }} />
      <MessageModal open={modal === "message"} onClose={() => setModal(null)} />
    </div>
  );
}
