import { Copy, Dumbbell, Edit, Eye, Plus } from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { ExerciseLibraryModal, WorkoutFormModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { Input } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { useClientsStore } from "../store/clientsStore";
import { useWorkoutsStore } from "../store/workoutsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";
import type { WorkoutRecord } from "@noogym/types";

export default function Treinos() {
  const [modal, setModal] = useState<"new" | "edit" | "exercises" | "delete" | null>(null);
  const [selected, setSelected] = useState<WorkoutRecord | undefined>();
  const workouts = useWorkoutsStore((state) => state.workouts);
  const duplicateWorkout = useWorkoutsStore((state) => state.duplicateWorkout);
  const deleteWorkout = useWorkoutsStore((state) => state.deleteWorkout);
  const clients = useClientsStore((state) => state.clients);
  const active = selected ?? workouts[0];

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Treinos" subtitle="Gerencie os treinos dos seus clientes." actions={<><Button icon={<Dumbbell className="h-4 w-4" />} onClick={() => setModal("exercises")}>Exercícios</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>Novo treino</Button></>} />
        <div className="grid grid-cols-4 gap-4"><MetricCard title="Treinos ativos" value={String(workouts.filter((item) => item.status === "Ativo").length)} change="+ 14% vs mês passado" icon={<Dumbbell className="h-5 w-5" />} tone="green" /><MetricCard title="Treinos criados" value="320" change="+ 18% vs mês passado" icon={<Dumbbell className="h-5 w-5" />} /><MetricCard title="Exercícios" value="2.850" change="+ 12% vs mês passado" icon={<Dumbbell className="h-5 w-5" />} tone="green" /><MetricCard title="Grupos musculares" value="12" change="Todos cadastrados" icon={<Dumbbell className="h-5 w-5" />} tone="blue" /></div>
        <div className="mt-4 grid grid-cols-[1fr_200px_190px_150px] gap-3"><Input placeholder="Buscar por nome do treino ou cliente..." /><Select><option>Todos os treinadores</option></Select><Select><option>Todos os objetivos</option></Select><Select><option>Status: Todos</option></Select></div>
        <Tabs tabs={["Todos os treinos", "Meus treinos", "Treinos por cliente", "Modelos de treino"]} active="Todos os treinos" onChange={() => undefined} />
        <div className="mt-4">
          <Table columns={["", "Treino", "Cliente", "Objetivo", "Criado por", "Última atualização", "Status", "Ações"]}>
            {workouts.map((workout, index) => <tr key={workout.id} className="table-row"><td className="px-4 py-3"><input type="checkbox" /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="icon-tile"><Dumbbell className="h-5 w-5" /></span><div><p>{workout.name}</p><p className="text-xs text-zinc-400">{workout.exercises} exercícios</p></div></div></td><td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={clients[index % clients.length]?.avatar ?? "CL"} />{workout.client}</div></td><td className="px-4 py-3"><Badge>{workout.goal}</Badge></td><td className="px-4 py-3">{workout.author}</td><td className="px-4 py-3">{workout.updated}</td><td className="px-4 py-3"><StatusDot label={workout.status} tone={workout.status === "Ativo" ? "lime" : workout.status === "Rascunho" ? "orange" : "gray"} /></td><td className="px-4 py-3"><div className="flex gap-3"><button onClick={() => toastInfo("Detalhes do treino", workout.name)}><Eye className="h-4 w-4" /></button><button onClick={() => { setSelected(workout); setModal("edit"); }}><Edit className="h-4 w-4" /></button><button onClick={() => { duplicateWorkout(workout.id); toastSuccess("Treino duplicado com sucesso"); }}><Copy className="h-4 w-4" /></button><button className="text-red-300" onClick={() => { setSelected(workout); setModal("delete"); }}>Excluir</button></div></td></tr>)}
          </Table>
        </div>
      </div>
      <aside className="space-y-3"><Card className="p-5"><div className="h-28 rounded-lg border border-white/10 bg-[linear-gradient(135deg,#151d1f,#080c0e)]" /><h2 className="mt-4 text-xl font-semibold">{active?.name}</h2><Badge>{active?.status}</Badge>{["Criado por|" + active?.author, "Cliente|" + active?.client, "Objetivo|" + active?.goal, "Duração média|60 - 75 min", "Nível|Intermediário"].map((row) => { const [label, value] = row.split("|"); return <p key={label} className="mt-4 flex justify-between text-sm"><span className="text-zinc-400">{label}</span><span>{value}</span></p>; })}<Button className="mt-5 w-full" onClick={() => setModal("edit")}>Editar treino</Button></Card><Card className="p-5"><h2 className="mb-4 font-semibold">Ações rápidas</h2><Button className="mb-2 w-full" onClick={() => { if (active) duplicateWorkout(active.id); toastSuccess("Treino duplicado com sucesso"); }}>Duplicar treino</Button><Button className="w-full" variant="danger" onClick={() => setModal("delete")}>Excluir treino</Button></Card></aside>
      <WorkoutFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <WorkoutFormModal open={modal === "edit"} workout={active} onClose={() => setModal(null)} />
      <ExerciseLibraryModal open={modal === "exercises"} onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "delete"} title="Excluir treino" message="Esta ação remove o treino do estado local simulado." confirmLabel="Excluir treino" danger onClose={() => setModal(null)} onConfirm={() => { if (active) deleteWorkout(active.id); toastSuccess("Treino excluído com sucesso"); setModal(null); }} />
    </div>
  );
}
