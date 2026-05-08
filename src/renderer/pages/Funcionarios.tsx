import { Edit, KeyRound, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { EmployeeFormModal, RolesModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MetricCard } from "../components/ui/MetricCard";
import { Select } from "../components/ui/Select";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { useEmployeesStore } from "../store/employeesStore";
import { toastSuccess } from "../store/toastStore";
import type { EmployeeRecord } from "../store/domainTypes";

export default function Funcionarios() {
  const [modal, setModal] = useState<"new" | "roles" | "edit" | "deactivate" | null>(null);
  const [selected, setSelected] = useState<EmployeeRecord | undefined>();
  const employees = useEmployeesStore((state) => state.employees);
  const deactivateEmployee = useEmployeesStore((state) => state.deactivateEmployee);
  const active = selected ?? employees[0];
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Funcionários" subtitle="Gerencie colaboradores e permissões de acesso." actions={<><Button icon={<KeyRound className="h-4 w-4" />} onClick={() => setModal("roles")}>Funções e permissões</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>Novo funcionário</Button></>} />
        <div className="grid grid-cols-4 gap-4"><MetricCard title="Total de funcionários" value={String(employees.length)} change="+ 8% vs mês passado" icon={<UsersRound className="h-5 w-5" />} /><MetricCard title="Ativos" value={String(employees.filter((item) => item.status === "Ativo").length)} change="+ 14% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="green" /><MetricCard title="Inativos" value={String(employees.filter((item) => item.status !== "Ativo").length)} change="- 20% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="red" /><MetricCard title="Funções" value="6" change="Total cadastradas" icon={<KeyRound className="h-5 w-5" />} tone="purple" /></div>
        <div className="mt-5 grid grid-cols-[1fr_170px_190px] gap-3"><Input placeholder="Buscar por nome, e-mail ou telefone..." /><Select><option>Todos os status</option></Select><Select><option>Todas as funções</option></Select></div>
        <div className="mt-4"><Table columns={["Funcionário", "Função", "E-mail", "Telefone", "Status", "Ações"]}>{employees.map((employee) => <tr key={employee.id} className="table-row cursor-pointer" onClick={() => setSelected(employee)}><td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar label={employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2)} /><div><p>{employee.name}</p><p className="text-xs text-zinc-400">ID: {employee.id}</p></div></div></td><td className="px-4 py-3"><Badge>{employee.role}</Badge></td><td className="px-4 py-3">{employee.email}</td><td className="px-4 py-3">{employee.phone}</td><td className="px-4 py-3"><StatusDot label={employee.status} tone={employee.status === "Ativo" ? "lime" : "red"} /></td><td className="px-4 py-3"><div className="flex gap-3"><button onClick={(event) => { event.stopPropagation(); setSelected(employee); setModal("edit"); }}><Edit className="h-4 w-4" /></button><button className="text-red-300" onClick={(event) => { event.stopPropagation(); setSelected(employee); setModal("deactivate"); }}>Desativar</button></div></td></tr>)}</Table></div>
      </div>
      <aside className="space-y-3"><Card className="p-5"><div className="flex items-center gap-4"><Avatar label={active?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "FN"} className="h-20 w-20 text-lg" /><div><h2 className="text-xl font-semibold">{active?.name}</h2><p className="text-zinc-400">{active?.role}</p><p className="text-sm">ID: {active?.id}</p></div><Badge>{active?.status}</Badge></div><Tabs tabs={["Detalhes", "Permissões", "Histórico"]} active="Detalhes" onChange={() => undefined} /><div className="mt-4 space-y-4 text-sm">{["E-mail|" + active?.email, "Telefone|" + active?.phone, "Data de admissão|08/05/2026", "Salário mensal|" + active?.salary].map((row) => { const [label, value] = row.split("|"); return <p key={label} className="flex justify-between"><span className="text-zinc-400">{label}</span><span>{value}</span></p>; })}</div></Card><Button className="w-full" onClick={() => setModal("edit")}>Editar funcionário</Button><Button className="w-full" variant="danger" onClick={() => setModal("deactivate")}>Desativar funcionário</Button></aside>
      <EmployeeFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <EmployeeFormModal open={modal === "edit"} employee={active} onClose={() => setModal(null)} />
      <RolesModal open={modal === "roles"} onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "deactivate"} title="Desativar funcionário" message="O funcionário perderá acesso ao sistema, mas o cadastro permanecerá no histórico." confirmLabel="Desativar funcionário" danger onClose={() => setModal(null)} onConfirm={() => { if (active) deactivateEmployee(active.id); toastSuccess("Funcionário desativado com sucesso"); setModal(null); }} />
    </div>
  );
}
