import { CalendarDays, Copy, Grid2X2, Pencil, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { CategoryModal, PlanFormModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MetricCard } from "../components/ui/MetricCard";
import { Select } from "../components/ui/Select";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { usePlansStore } from "../store/plansStore";
import { toastSuccess } from "../store/toastStore";
import type { PlanRecord } from "../store/domainTypes";

export default function Planos() {
  const [tab, setTab] = useState("Planos ativos");
  const [modal, setModal] = useState<"new" | "edit" | "category" | "deactivate" | null>(null);
  const [selected, setSelected] = useState<PlanRecord | undefined>();
  const plans = usePlansStore((state) => state.plans);
  const duplicatePlan = usePlansStore((state) => state.duplicatePlan);
  const deactivatePlan = usePlansStore((state) => state.deactivatePlan);
  const visiblePlans = plans.filter((plan) => tab === "Planos inativos" ? plan.status === "Inativo" : tab === "Categorias" ? true : plan.status !== "Inativo");
  const active = selected ?? visiblePlans[0];

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Planos" subtitle="Gerencie os planos da sua academia." actions={<><Button icon={<Grid2X2 className="h-4 w-4" />} onClick={() => setModal("category")}>Categorias</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setSelected(undefined); setModal("new"); }}>Novo plano</Button></>} />
        <Tabs tabs={["Planos ativos", "Planos inativos", "Categorias"]} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-[1fr_170px_150px] gap-3"><Input placeholder="Buscar por nome do plano..." /><Select><option>Todos os tipos</option></Select><Select><option>Status: Todos</option></Select></div>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <MetricCard title="Total de planos ativos" value={String(plans.filter((plan) => plan.status === "Ativo").length)} change="+ 7% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} />
          <MetricCard title="Receita mensal recorrente" value="2.450.000 Kz" change="+ 18% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Clientes em planos" value="1.050" change="+ 12% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Ticket médio" value="28.450 Kz" change="+ 9% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} tone="blue" />
        </div>
        <div className="mt-4">
          <Table columns={["Plano", "Categoria", "Preço", "Duração", "Tipo", "Clientes", "Status", "Ações"]}>
            {visiblePlans.map((plan) => (
              <tr key={plan.id} className="table-row">
                <td className="px-4 py-3"><p>{plan.name}</p><p className="text-xs text-zinc-400">{plan.description}</p></td>
                <td className="px-4 py-3"><Badge>{plan.category}</Badge></td>
                <td className="px-4 py-3 font-semibold text-noogym-lime">{plan.price}</td>
                <td className="px-4 py-3">{plan.duration}</td>
                <td className="px-4 py-3">{plan.type}</td>
                <td className="px-4 py-3">{plan.clients || "-"}</td>
                <td className="px-4 py-3"><StatusDot label={plan.status} tone={plan.status === "Ativo" ? "lime" : "red"} /></td>
                <td className="px-4 py-3"><div className="flex gap-3"><button onClick={() => { setSelected(plan); setModal("edit"); }}><Pencil className="h-4 w-4" /></button><button onClick={() => { duplicatePlan(plan.id); toastSuccess("Plano duplicado com sucesso"); }}><Copy className="h-4 w-4" /></button><button className="text-red-300" onClick={() => { setSelected(plan); setModal("deactivate"); }}>Desativar</button></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Categorias</h2>{["Musculação|12 planos", "Funcional|5 planos", "Lutas|4 planos", "Natação|3 planos"].map((row) => { const [name, total] = row.split("|"); return <p key={name} className="flex justify-between border-b border-white/[0.07] py-3 text-sm"><span>{name}</span><span>{total}</span></p>; })}<button className="mt-3 text-noogym-lime" onClick={() => setModal("category")}>+ Nova categoria</button></Card>
        <Card className="p-5"><h2 className="font-semibold">Plano mais popular</h2><Badge>Mais contratado</Badge><p className="mt-4">{active?.name ?? "Plano Premium Mensal"}</p><p className="text-sm text-zinc-400">{active?.clients ?? 420} clientes</p></Card>
      </aside>
      <PlanFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <PlanFormModal open={modal === "edit"} plan={selected} onClose={() => setModal(null)} />
      <CategoryModal open={modal === "category"} title="Nova categoria" onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "deactivate"} title="Desativar plano" message="O plano ficará oculto para novas vendas, mas contratos existentes permanecem ativos." confirmLabel="Desativar plano" danger onClose={() => setModal(null)} onConfirm={() => { if (selected) deactivatePlan(selected.id); toastSuccess("Plano desativado com sucesso"); setModal(null); }} />
    </div>
  );
}
