import { CalendarDays, Copy, Grid2X2, Pencil, Plus, SlidersHorizontal, UsersRound } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LineChart } from "../components/ui/Charts";
import { Input } from "../components/ui/Input";
import { MetricCard } from "../components/ui/MetricCard";
import { Select } from "../components/ui/Select";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { chart15, plans } from "../data/mock";
import { useState } from "react";

const categoryTone = (category: string) => (category === "Premium" ? "purple" : category === "Avulso" ? "orange" : category === "Aulas" ? "purple" : category === "Personal" ? "blue" : "lime");

export default function Planos() {
  const [tab, setTab] = useState("Planos ativos");
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Planos"
          subtitle="Gerencie os planos e preços do seu ginásio."
          actions={<><Button icon={<Grid2X2 className="h-4 w-4" />}>Categorias</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />}>Novo plano</Button></>}
        />
        <Tabs tabs={["Planos ativos", "Planos inativos", "Categorias"]} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-[1fr_170px_150px_140px] gap-3">
          <Input placeholder="Buscar por nome do plano..." />
          <Select><option>Todos os tipos</option></Select>
          <Select><option>Status: Ativo</option></Select>
          <Button icon={<SlidersHorizontal className="h-4 w-4" />}>Ordenar por</Button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <MetricCard title="Total de planos ativos" value="14" change="+ 7% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} />
          <MetricCard title="Receita mensal recorrente" value="2.450.000 Kz" change="+ 18% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Clientes em planos" value="1.050" change="+ 12% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Ticket médio" value="2.333 Kz" change="+ 9% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} tone="blue" />
        </div>
        <div className="mt-4">
          <Table columns={["Plano", "Categoria", "Preço", "Duração", "Tipo", "Clientes", "Status", "Ações"]}>
            {plans.map((plan) => (
              <tr key={plan.name} className="table-row">
                <td className="px-4 py-3"><p>{plan.name}</p><p className="text-xs text-zinc-400">{plan.description}</p></td>
                <td className="px-4 py-3"><Badge tone={categoryTone(plan.category)}>{plan.category}</Badge></td>
                <td className="px-4 py-3 font-semibold text-noogym-lime">{plan.price}</td>
                <td className="px-4 py-3">{plan.duration}</td>
                <td className="px-4 py-3">{plan.type}</td>
                <td className="px-4 py-3">{plan.clients || "-"}</td>
                <td className="px-4 py-3"><StatusDot label="Ativo" /></td>
                <td className="px-4 py-3"><div className="flex gap-3"><Pencil className="h-4 w-4" /><Copy className="h-4 w-4" /><span>⋮</span></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-5">
          <div className="mb-3 flex justify-between"><h2 className="font-semibold">Categorias de planos</h2><button className="text-xs text-noogym-lime">Gerenciar</button></div>
          {["Musculação|6", "Aulas|3", "Personal Trainer|2", "Geral|2", "Avulso|2"].map((row) => {
            const [label, total] = row.split("|");
            return <p key={label} className="flex justify-between border-b border-white/[0.07] py-3 text-sm"><span>{label}</span><span>{total}</span></p>;
          })}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Dicas rápidas</h2>
          {["Criar novo plano", "Duplicar plano existente", "Definir descontos", "Ver relatórios de planos"].map((item) => <Button key={item} className="mb-2 w-full justify-start">{item}</Button>)}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Plano mais popular</h2>
          <Badge tone="purple">Premium</Badge>
          <p className="mt-3">Plano Premium</p>
          <p className="text-sm text-zinc-400">420 clientes</p>
          <div className="mt-4 h-20"><LineChart values={chart15.slice(0, 9)} /></div>
          <p className="mt-2 text-xs text-noogym-lime">↑ 15% vs mês passado</p>
        </Card>
      </aside>
    </div>
  );
}
