import { Copy, Dumbbell, Edit, Eye, Plus, SlidersHorizontal } from "lucide-react";
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
import { clients, workouts } from "../data/mock";

export default function Treinos() {
  const selected = workouts[0];
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Treinos" subtitle="Gerencie os treinos dos seus clientes." actions={<><Button icon={<Dumbbell className="h-4 w-4" />}>Exercícios</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />}>Novo treino</Button></>} />
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Treinos ativos" value="1.340" change="+ 14% vs mês passado" icon={<Dumbbell className="h-5 w-5" />} tone="green" />
          <MetricCard title="Treinos criados" value="320" change="+ 18% vs mês passado" icon={<Dumbbell className="h-5 w-5" />} />
          <MetricCard title="Exercícios" value="2.850" change="+ 12% vs mês passado" icon={<Dumbbell className="h-5 w-5" />} tone="green" />
          <MetricCard title="Grupos musculares" value="12" change="Todos cadastrados" icon={<Dumbbell className="h-5 w-5" />} tone="blue" />
        </div>
        <div className="mt-4 grid grid-cols-[1fr_200px_190px_150px_110px] gap-3">
          <Input placeholder="Buscar por nome do treino ou cliente..." /><Select><option>Todos os treinadores</option></Select><Select><option>Todos os objetivos</option></Select><Select><option>Status: Todos</option></Select><Button icon={<SlidersHorizontal className="h-4 w-4" />}>Filtros</Button>
        </div>
        <Tabs tabs={["Todos os treinos", "Meus treinos", "Treinos por cliente", "Modelos de treino"]} active="Todos os treinos" onChange={() => undefined} />
        <div className="mt-4">
          <Table columns={["", "Treino", "Cliente", "Objetivo", "Criado por", "Última atualização", "Status", "Ações"]}>
            {workouts.map((workout, index) => (
              <tr key={workout.name} className="table-row">
                <td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="icon-tile"><Dumbbell className="h-5 w-5" /></span><div><p>{workout.name}</p><p className="text-xs text-zinc-400">{workout.exercises} exercícios</p></div></div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={clients[index % clients.length].avatar} />{workout.client}</div></td>
                <td className="px-4 py-3"><Badge tone={workout.goal === "Emagrecimento" ? "orange" : workout.goal === "Força" ? "blue" : "lime"}>{workout.goal}</Badge></td>
                <td className="px-4 py-3">{workout.author}</td>
                <td className="px-4 py-3">{workout.updated}</td>
                <td className="px-4 py-3"><StatusDot label={workout.status} tone={workout.status === "Ativo" ? "lime" : workout.status === "Rascunho" ? "orange" : "gray"} /></td>
                <td className="px-4 py-3"><div className="flex gap-3"><Eye className="h-4 w-4" /><Edit className="h-4 w-4" /><Copy className="h-4 w-4" /><span>⋮</span></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-5">
          <div className="h-28 rounded-lg border border-white/10 bg-[linear-gradient(135deg,#151d1f,#080c0e)]" />
          <h2 className="mt-4 text-xl font-semibold">{selected.name}</h2><Badge>Ativo</Badge>
          {["Criado por|Lucas Ferreira", "Clientes atribuídos|32 clientes", "Objetivo|Hipertrofia", "Duração média|60 - 75 min", "Nível|Iniciante"].map((row) => { const [label, value] = row.split("|"); return <p key={label} className="mt-4 flex justify-between text-sm"><span className="text-zinc-400">{label}</span><span>{value}</span></p>; })}
          <p className="mt-4 text-sm text-zinc-400">Treino focado em hipertrofia muscular para iniciantes, com exercícios básicos e progressão gradual de cargas.</p>
          <Button className="mt-5 w-full" icon={<Eye className="h-4 w-4" />}>Ver detalhes do treino</Button>
        </Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Ações rápidas</h2>{["Atribuir a clientes", "Duplicar treino", "Editar treino"].map((item) => <Button key={item} className="mb-2 w-full">{item}</Button>)}<Button className="w-full" variant="danger">Excluir treino</Button></Card>
      </aside>
    </div>
  );
}
