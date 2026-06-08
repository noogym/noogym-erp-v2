import { CalendarDays, Copy, Grid2X2, Pencil, Plus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { CategoryModal, PlanFormModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { DonutChart } from "../components/ui/Charts";
import { Input } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { useClientsStore } from "../store/clientsStore";
import { usePlansStore } from "../store/plansStore";
import { toastSuccess } from "../store/toastStore";
import type { PlanRecord } from "@noogym/types";
import type { PlanCategory, PlanCategoryInput } from "../store/plansStore";

const parseMoney = (value: string) => Number(value.replace(/[^\d.,]/g, "").replace(/\s/g, "").replace(",", ".")) || 0;
const durationDivisor = (duration: string) => {
  const normalized = duration.toLowerCase();
  if (normalized.includes("anual")) return 12;
  if (normalized.includes("semestral")) return 6;
  if (normalized.includes("trimestral")) return 3;
  return 1;
};
const money = (value: number) => `${Math.round(value).toLocaleString("pt-AO")} Kz`;

export default function Planos() {
  const [tab, setTab] = useState("Planos ativos");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos os tipos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [modal, setModal] = useState<"new" | "edit" | "category" | "editCategory" | "deactivate" | null>(null);
  const [selected, setSelected] = useState<PlanRecord | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<PlanCategory | null>(null);
  const plans = usePlansStore((state) => state.plans);
  const categoryDetails = usePlansStore((state) => state.categoryDetails);
  const addCategory = usePlansStore((state) => state.addCategory);
  const updateCategory = usePlansStore((state) => state.updateCategory);
  const duplicateCategory = usePlansStore((state) => state.duplicateCategory);
  const toggleCategoryStatus = usePlansStore((state) => state.toggleCategoryStatus);
  const duplicatePlan = usePlansStore((state) => state.duplicatePlan);
  const deactivatePlan = usePlansStore((state) => state.deactivatePlan);
  const clients = useClientsStore((state) => state.clients);
  const clientCountByPlan = useMemo(() => {
    const counts = new Map<string, number>();
    clients.forEach((client) => {
      if (client.planId) counts.set(client.planId, (counts.get(client.planId) ?? 0) + 1);
      if (client.plan && client.plan !== "Sem plano") counts.set(client.plan, (counts.get(client.plan) ?? 0) + 1);
    });
    return counts;
  }, [clients]);
  const plansWithClientCount = useMemo(() => plans.map((plan) => ({
    ...plan,
    clients: clientCountByPlan.get(plan.id) ?? clientCountByPlan.get(plan.name) ?? plan.clients ?? 0
  })), [clientCountByPlan, plans]);
  const types = useMemo(() => Array.from(new Set(plansWithClientCount.map((plan) => plan.type))).sort(), [plansWithClientCount]);
  const visiblePlans = useMemo(() => plansWithClientCount.filter((plan) => {
    const matchesTab = tab === "Planos inativos" ? plan.status === "Inativo" : tab === "Categorias" ? true : plan.status !== "Inativo";
    const matchesQuery = `${plan.name} ${plan.description} ${plan.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilter === "Todos os tipos" || plan.type === typeFilter;
    const matchesStatus = statusFilter === "Todos" || plan.status === statusFilter;
    return matchesTab && matchesQuery && matchesType && matchesStatus;
  }), [plansWithClientCount, query, statusFilter, tab, typeFilter]);
  const categoryRows = useMemo(() => categoryDetails.map((category) => {
    const categoryPlans = plansWithClientCount.filter((plan) => plan.category === category.name);
    const activePlans = categoryPlans.filter((plan) => plan.status === "Ativo");
    const clientsInCategory = categoryPlans.reduce((sum, plan) => sum + (plan.clients ?? 0), 0);
    const recurringRevenue = categoryPlans.reduce((sum, plan) => sum + (parseMoney(plan.price) / durationDivisor(plan.duration)) * (plan.clients ?? 0), 0);
    return { name: category.name, color: category.color, icon: category.icon, description: category.description, status: category.status, order: category.order, total: categoryPlans.length, active: activePlans.length, clients: clientsInCategory, revenue: recurringRevenue };
  }).sort((a, b) => a.order - b.order || b.total - a.total || a.name.localeCompare(b.name)), [categoryDetails, plansWithClientCount]);
  const metrics = useMemo(() => {
    const activePlans = plansWithClientCount.filter((plan) => plan.status === "Ativo");
    const clientsInPlans = clients.filter((client) => client.plan && client.plan !== "Sem plano").length;
    const recurringRevenue = activePlans.reduce((sum, plan) => sum + (parseMoney(plan.price) / durationDivisor(plan.duration)) * (plan.clients ?? 0), 0);
    const ticketAverage = clientsInPlans ? recurringRevenue / clientsInPlans : 0;
    return { activePlans: activePlans.length, recurringRevenue, clientsInPlans, ticketAverage };
  }, [clients, plansWithClientCount]);
  const categoryChart = useMemo(() => {
    const total = Math.max(categoryRows.reduce((sum, category) => sum + category.total, 0), 1);
    return categoryRows.slice(0, 6).map((category, index) => ({
      label: category.name,
      value: Math.round((category.total / total) * 100),
      color: category.color
    }));
  }, [categoryRows]);
  const popularPlan = useMemo(() => plansWithClientCount.slice().sort((a, b) => (b.clients ?? 0) - (a.clients ?? 0))[0], [plansWithClientCount]);
  const saveCategory = (category: PlanCategoryInput) => selectedCategory ? updateCategory(selectedCategory.name, category) : addCategory(category);
  const openEditCategory = (category: PlanCategory) => {
    setSelectedCategory(category);
    setModal("editCategory");
  };
  const closeCategoryModal = () => {
    setSelectedCategory(null);
    setModal(null);
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Planos" subtitle="Gerencie os planos da sua academia." actions={<><Button icon={<Grid2X2 className="h-4 w-4" />} onClick={() => setModal("category")}>Categorias</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setSelected(undefined); setModal("new"); }}>Novo plano</Button></>} />
        <Tabs tabs={["Planos ativos", "Planos inativos", "Categorias"]} active={tab} onChange={setTab} />
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_150px]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "Categorias" ? "Buscar por categoria..." : "Buscar por nome do plano..."} />
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option>Todos os tipos</option>
            {types.map((type) => <option key={type}>{type}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>Todos</option>
            <option>Ativo</option>
            <option>Inativo</option>
          </Select>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total de planos ativos" value={String(metrics.activePlans)} change={`${plansWithClientCount.length} planos cadastrados`} icon={<CalendarDays className="h-5 w-5" />} />
          <MetricCard title="Receita mensal recorrente" value={money(metrics.recurringRevenue)} change="Com base nos clientes vinculados" icon={<CalendarDays className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Clientes em planos" value={String(metrics.clientsInPlans)} change={`${clients.length} clientes cadastrados`} icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Ticket médio" value={money(metrics.ticketAverage)} change="Receita / clientes com plano" icon={<CalendarDays className="h-5 w-5" />} tone="blue" />
        </div>
        <div className="mt-4">
          {tab === "Categorias" ? (
            <Table columns={["Categoria", "Planos", "Planos ativos", "Clientes", "Receita mensal estimada", "Status", "Ações"]}>
              {categoryRows.filter((category) => category.name.toLowerCase().includes(query.toLowerCase())).map((category) => (
                <tr key={category.name} className="table-row">
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} /><Badge>{category.name}</Badge></span></td>
                  <td className="px-4 py-3">{category.total}</td>
                  <td className="px-4 py-3">{category.active}</td>
                  <td className="px-4 py-3">{category.clients}</td>
                  <td className="px-4 py-3 font-semibold text-noogym-lime">{money(category.revenue)}</td>
                  <td className="px-4 py-3"><StatusDot label={category.status} tone={category.status === "Ativo" ? "lime" : "red"} /></td>
                  <td className="px-4 py-3"><div className="flex gap-3"><button title="Editar categoria" onClick={() => openEditCategory(category)}><Pencil className="h-4 w-4" /></button><button title="Duplicar categoria" onClick={() => { duplicateCategory(category.name); toastSuccess("Categoria duplicada com sucesso"); }}><Copy className="h-4 w-4" /></button><button className={category.status === "Ativo" ? "text-red-300" : "text-noogym-lime"} onClick={() => { toggleCategoryStatus(category.name); toastSuccess(category.status === "Ativo" ? "Categoria desativada" : "Categoria ativada"); }}>{category.status === "Ativo" ? "Desativar" : "Ativar"}</button></div></td>
                </tr>
              ))}
            </Table>
          ) : (
            <Table columns={["Plano", "Categoria", "Preço", "Duração", "Tipo", "Clientes", "Status", "Ações"]} containerClassName="max-h-[430px]">
              {visiblePlans.map((plan) => (
                <tr key={plan.id} className="table-row">
                  <td className="px-4 py-3"><div className="flex items-start gap-3"><span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: plan.color ?? "#B6FF00" }} /><div><p>{plan.name}</p><p className="text-xs text-zinc-400">{plan.description}</p></div></div></td>
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
          )}
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Categorias</h2>{categoryRows.map((category) => <p key={category.name} className="flex justify-between border-b border-white/[0.07] py-3 text-sm"><span className="inline-flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span className="truncate">{category.name}</span></span><span className="shrink-0">{category.total} planos</span></p>)}<button className="mt-3 text-noogym-lime" onClick={() => { setSelectedCategory(null); setModal("category"); }}>+ Nova categoria</button></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Planos por categoria</h2><DonutChart center={String(plansWithClientCount.length)} items={categoryChart} /></Card>
        <Card className="p-5"><h2 className="font-semibold">Plano mais popular</h2><Badge>Mais contratado</Badge><p className="mt-4 inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: popularPlan?.color ?? "#B6FF00" }} />{popularPlan?.name ?? "Sem planos"}</p><p className="text-sm text-zinc-400">{popularPlan?.clients ?? 0} clientes</p></Card>
      </aside>
      <PlanFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <PlanFormModal open={modal === "edit"} plan={selected} onClose={() => setModal(null)} />
      <CategoryModal open={modal === "category" || modal === "editCategory"} title={selectedCategory ? "Editar categoria" : "Nova categoria"} category={selectedCategory} onSave={saveCategory} onClose={closeCategoryModal} />
      <ConfirmModal open={modal === "deactivate"} title="Desativar plano" message="O plano ficará oculto para novas vendas, mas contratos existentes permanecem ativos." confirmLabel="Desativar plano" danger onClose={() => setModal(null)} onConfirm={() => { if (selected) deactivatePlan(selected.id); toastSuccess("Plano desativado com sucesso"); setModal(null); }} />
    </div>
  );
}
