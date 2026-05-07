import { Download, Eye, Gift, Pencil, Plus, SlidersHorizontal, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DonutChart } from "../components/ui/Charts";
import { Input } from "../components/ui/Input";
import { MetricCard } from "../components/ui/MetricCard";
import { Select } from "../components/ui/Select";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { clients } from "../data/mock";

export default function Clientes() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => clients.filter((client) => `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Clientes"
          subtitle="Gerencie seus clientes, planos e informações."
          actions={
            <>
              <Button icon={<Download className="h-4 w-4" />}>Importar</Button>
              <Button variant="primary" icon={<Plus className="h-4 w-4" />}>Novo cliente</Button>
            </>
          }
        />
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Clientes ativos" value="1.248" change="+ 12% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Novos clientes" value="86" change="+ 18% vs mês passado" icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard title="Clientes inativos" value="142" change="- 8% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Total de clientes" value="1.390" change="Total registrado" icon={<UsersRound className="h-5 w-5" />} tone="purple" />
        </div>

        <Card className="mt-4 p-4">
          <div className="mb-4 grid grid-cols-[1fr_170px_150px_120px] gap-3">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone ou e-mail..." />
            <Select><option>Todos os planos</option></Select>
            <Select><option>Status: Ativo</option></Select>
            <Button icon={<SlidersHorizontal className="h-4 w-4" />}>Filtros</Button>
          </div>
          <Table columns={["", "Cliente", "Plano", "Status", "Último check-in", "Vencimento", "Ações"]}>
            {filtered.map((client) => (
              <tr key={client.id} className="table-row">
                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-transparent" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar label={client.avatar} />
                    <div><p>{client.name}</p><p className="text-xs text-zinc-400">{client.phone}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge tone={client.planTone}>{client.plan}</Badge></td>
                <td className="px-4 py-3"><StatusDot label={client.status} /></td>
                <td className="px-4 py-3"><p>{client.lastCheckin}</p><p className="text-xs text-zinc-400">Há 1h</p></td>
                <td className="px-4 py-3"><p>{client.expires}</p><p className="text-xs text-zinc-400">Faltam 28 dias</p></td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-zinc-300"><Eye className="h-4 w-4" /><Pencil className="h-4 w-4" /><span>⋮</span></div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <span>Mostrando 1 a {filtered.length} de 1.248 clientes</span>
            <span className="text-noogym-lime">1  2  3  ... 156</span>
          </div>
        </Card>
      </div>

      <aside className="space-y-3">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Distribuição por plano</h2>
          <DonutChart
            items={[
              { label: "Musculação", value: 45, color: "#B6FF00" },
              { label: "Premium", value: 30, color: "#FACC15" },
              { label: "Funcional", value: 15, color: "#F97316" },
              { label: "Aulas", value: 10, color: "#A78BFA" }
            ]}
          />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex justify-between"><h2 className="font-semibold">Aniversariantes do mês</h2><button className="text-xs text-noogym-lime">Ver todos</button></div>
          <div className="space-y-3">
            {clients.slice(0, 4).map((client) => (
              <div key={client.id} className="flex items-center gap-3">
                <Avatar label={client.avatar} />
                <span className="flex-1 text-sm">{client.name}</span>
                <span className="text-xs text-zinc-400">{client.birthday}</span>
                <Gift className="h-4 w-4" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Exportar relatório</h2>
          <p className="mt-3 text-sm text-zinc-400">Gere relatórios completos dos seus clientes.</p>
          <Select className="mt-4"><option>Relatório de clientes ativos</option></Select>
          <Button className="mt-4 w-full" variant="primary" icon={<Download className="h-4 w-4" />}>Exportar</Button>
        </Card>
      </aside>
    </div>
  );
}
