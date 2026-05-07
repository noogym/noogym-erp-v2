import { Edit, KeyRound, MoreVertical, Plus, UserRound, UsersRound } from "lucide-react";
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
import { employees } from "../data/mock";

export default function Funcionarios() {
  const selected = employees[0];
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Funcionários" subtitle="Gerencie os colaboradores e permissões de acesso." actions={<><Button icon={<KeyRound className="h-4 w-4" />}>Funções e permissões</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />}>Novo funcionário</Button></>} />
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Total de funcionários" value="28" change="+ 8% vs mês passado" icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard title="Ativos" value="24" change="+ 14% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="green" />
          <MetricCard title="Inativos" value="4" change="- 20% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="red" />
          <MetricCard title="Funções" value="6" change="Total cadastradas" icon={<KeyRound className="h-5 w-5" />} tone="purple" />
        </div>
        <div className="mt-5 grid grid-cols-[1fr_170px_190px_110px] gap-3"><Input placeholder="Buscar por nome, e-mail ou telefone..." /><Select><option>Todos os status</option></Select><Select><option>Todas as funções</option></Select><Button>Filtros</Button></div>
        <div className="mt-4">
          <Table columns={["Funcionário", "Função", "E-mail", "Telefone", "Status", "Ações"]}>
            {employees.map((employee) => (
              <tr key={employee.id} className="table-row">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar label={employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2)} /><div><p>{employee.name}</p><p className="text-xs text-zinc-400">ID: {employee.id}</p></div></div></td>
                <td className="px-4 py-3"><Badge tone={employee.role === "Recepcionista" ? "purple" : employee.role === "Gerente" ? "orange" : employee.role.includes("Aulas") ? "blue" : "lime"}>{employee.role}</Badge></td>
                <td className="px-4 py-3">{employee.email}</td><td className="px-4 py-3">{employee.phone}</td>
                <td className="px-4 py-3"><StatusDot label={employee.status} tone={employee.status === "Ativo" ? "lime" : "red"} /></td>
                <td className="px-4 py-3"><div className="flex gap-3"><Edit className="h-4 w-4" /><MoreVertical className="h-4 w-4" /></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-5">
          <div className="flex items-center gap-4"><Avatar label="LF" className="h-20 w-20 text-lg" /><div><h2 className="text-xl font-semibold">{selected.name}</h2><p className="text-zinc-400">{selected.role}</p><p className="text-sm">ID: {selected.id}</p></div><Badge>Ativo</Badge></div>
          <Tabs tabs={["Detalhes", "Permissões", "Histórico"]} active="Detalhes" onChange={() => undefined} />
          <div className="mt-4 space-y-4 text-sm">
            {["E-mail|" + selected.email, "Telefone|" + selected.phone, "Data de admissão|15/03/2023", "Data de nascimento|12/08/1992", "Gênero|Masculino", "Endereço|Talatona, Luanda", "Salário mensal|" + selected.salary, "Status|Ativo"].map((row) => { const [label, value] = row.split("|"); return <p key={label} className="flex justify-between"><span className="text-zinc-400">{label}</span><span>{value}</span></p>; })}
          </div>
        </Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Função e acesso</h2><p className="flex justify-between text-sm"><span className="text-zinc-400">Função</span><span>{selected.role}</span></p><p className="mt-4 flex justify-between text-sm"><span className="text-zinc-400">Nível de acesso</span><span>Padrão</span></p><p className="mt-4 flex justify-between text-sm"><span className="text-zinc-400">Último acesso</span><span>Hoje, 09:15</span></p></Card>
        <Button className="w-full" icon={<Edit className="h-4 w-4" />}>Editar funcionário</Button>
        <Button className="w-full" variant="danger">Desativar funcionário</Button>
      </aside>
    </div>
  );
}
