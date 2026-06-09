import { Archive, BarChart3, ClipboardList, Copy, Dumbbell, Edit, Eye, Library, Pause, Play, Plus, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { ExerciseLibraryModal, WorkoutBuilderModal } from "../components/modals/OperationalModals";
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
import type { ClientRecord, WorkoutRecord } from "@noogym/types";

const exerciseCatalog = [
  { name: "Agachamento livre", group: "Pernas", equipment: "Barra", level: "Intermediario", pattern: "Forca", instructions: "Manter tronco firme e controlar a descida." },
  { name: "Supino reto", group: "Peito", equipment: "Barra", level: "Intermediario", pattern: "Forca", instructions: "Escapulas encaixadas durante toda a serie." },
  { name: "Remada baixa", group: "Costas", equipment: "Maquina", level: "Iniciante", pattern: "Puxar", instructions: "Puxar com cotovelos e evitar balanco." },
  { name: "Prancha", group: "Core", equipment: "Peso corporal", level: "Iniciante", pattern: "Estabilidade", instructions: "Quadril alinhado e respiracao controlada." },
  { name: "Bike intervalada", group: "Cardio", equipment: "Bike", level: "Avancado", pattern: "Condicionamento", instructions: "Alternar picos curtos com recuperacao ativa." },
  { name: "Desenvolvimento", group: "Ombros", equipment: "Halteres", level: "Intermediario", pattern: "Empurrar", instructions: "Evitar hiperextensao lombar." }
];

const tabs = ["Planos de treino", "Editor", "Biblioteca", "Alunos", "Relatorios"];

function statusTone(status?: string) {
  if (status === "Ativo") return "lime";
  if (status === "Rascunho") return "orange";
  if (status === "Pausado") return "blue";
  return "gray";
}

function clientAvatar(clients: ClientRecord[], name?: string) {
  return clients.find((client) => client.name === name)?.avatar ?? name?.slice(0, 2).toUpperCase() ?? "TR";
}

function nextStatusLabel(workout?: WorkoutRecord) {
  return workout?.status === "Ativo" ? "Pausar treino" : "Reativar treino";
}

export default function Treinos() {
  const [modal, setModal] = useState<"new" | "edit" | "exercises" | "delete" | null>(null);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [selected, setSelected] = useState<WorkoutRecord | undefined>();
  const [query, setQuery] = useState("");
  const [trainerFilter, setTrainerFilter] = useState("Todos os treinadores");
  const [goalFilter, setGoalFilter] = useState("Todos os objetivos");
  const [statusFilter, setStatusFilter] = useState("Status: Todos");
  const [libraryQuery, setLibraryQuery] = useState("");
  const workouts = useWorkoutsStore((state) => state.workouts);
  const duplicateWorkout = useWorkoutsStore((state) => state.duplicateWorkout);
  const deleteWorkout = useWorkoutsStore((state) => state.deleteWorkout);
  const setWorkoutStatus = useWorkoutsStore((state) => state.setWorkoutStatus);
  const clients = useClientsStore((state) => state.clients);
  const active = selected ?? workouts[0];

  const trainers = useMemo(() => ["Todos os treinadores", ...Array.from(new Set(workouts.map((item) => item.author).filter(Boolean)))], [workouts]);
  const goals = useMemo(() => ["Todos os objetivos", ...Array.from(new Set(workouts.map((item) => item.goal).filter(Boolean)))], [workouts]);
  const assignedClients = useMemo(() => new Set(workouts.filter((item) => item.status === "Ativo").map((item) => item.client)), [workouts]);
  const pendingStudents = clients.filter((client) => !assignedClients.has(client.name));

  const filteredWorkouts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return workouts.filter((workout) => {
      const matchesQuery = !normalizedQuery || [workout.name, workout.client, workout.goal, workout.author].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesTrainer = trainerFilter === "Todos os treinadores" || workout.author === trainerFilter;
      const matchesGoal = goalFilter === "Todos os objetivos" || workout.goal === goalFilter;
      const matchesStatus = statusFilter === "Status: Todos" || workout.status === statusFilter.replace("Status: ", "");
      const matchesTab = activeTab !== "Planos de treino" || true;
      return matchesQuery && matchesTrainer && matchesGoal && matchesStatus && matchesTab;
    });
  }, [activeTab, goalFilter, query, statusFilter, trainerFilter, workouts]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = libraryQuery.trim().toLowerCase();
    return exerciseCatalog.filter((exercise) => !normalizedQuery || [exercise.name, exercise.group, exercise.equipment, exercise.pattern].join(" ").toLowerCase().includes(normalizedQuery));
  }, [libraryQuery]);

  const allExercises = workouts.flatMap((workout) => workout.blocks?.flatMap((block) => block.exercises) ?? []);
  const reviewPending = workouts.filter((workout) => workout.reviewDate === "15 dias" || workout.status === "Rascunho").length;
  const activeWorkouts = workouts.filter((item) => item.status === "Ativo").length;
  const averageExercises = workouts.length ? Math.round(workouts.reduce((sum, item) => sum + item.exercises, 0) / workouts.length) : 0;

  const openEditor = (workout: WorkoutRecord) => {
    setSelected(workout);
    setActiveTab("Editor");
  };

  const toggleStatus = (workout?: WorkoutRecord) => {
    if (!workout) return;
    const nextStatus = workout.status === "Ativo" ? "Pausado" : "Ativo";
    setWorkoutStatus(workout.id, nextStatus);
    toastSuccess(nextStatus === "Ativo" ? "Treino reativado" : "Treino pausado");
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Treinos"
          subtitle="Gerencie fichas, modelos, exercicios e alunos."
          actions={<><Button icon={<Library className="h-4 w-4" />} onClick={() => setActiveTab("Biblioteca")}>Biblioteca</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>Novo treino</Button></>}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Treinos ativos" value={String(activeWorkouts)} change={`${workouts.length} fichas no total`} icon={<Dumbbell className="h-5 w-5" />} tone="green" />
          <MetricCard title="Alunos com treino" value={String(assignedClients.size)} change={`${pendingStudents.length} sem treino ativo`} icon={<UsersRound className="h-5 w-5" />} />
          <MetricCard title="Exercicios cadastrados" value={String(exerciseCatalog.length + allExercises.length)} change={`${averageExercises} por ficha em media`} icon={<ClipboardList className="h-5 w-5" />} tone="green" />
          <MetricCard title="Revisoes pendentes" value={String(reviewPending)} change="Rascunhos e revisoes curtas" icon={<BarChart3 className="h-5 w-5" />} tone="blue" />
        </div>

        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "Planos de treino" && (
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[1fr_210px_190px_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input className="pl-10" placeholder="Buscar por treino, cliente, objetivo ou treinador..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={trainerFilter} onChange={(event) => setTrainerFilter(event.target.value)}>{trainers.map((trainer) => <option key={trainer}>{trainer}</option>)}</Select>
              <Select value={goalFilter} onChange={(event) => setGoalFilter(event.target.value)}>{goals.map((goal) => <option key={goal}>{goal}</option>)}</Select>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{["Status: Todos", "Status: Ativo", "Status: Rascunho", "Status: Pausado", "Status: Arquivado"].map((status) => <option key={status}>{status}</option>)}</Select>
            </div>

            <Table columns={["Treino", "Cliente", "Objetivo", "Frequencia", "Exercicios", "Revisao", "Status", "Acoes"]}>
              {filteredWorkouts.map((workout) => (
                <tr key={workout.id} className="table-row">
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-3 text-left" onClick={() => openEditor(workout)}>
                      <span className="icon-tile"><Dumbbell className="h-5 w-5" /></span>
                      <span><span className="block font-medium">{workout.name}</span><span className="block text-xs text-zinc-400">{workout.level ?? "Intermediario"} - {workout.duration ?? "60 min"}</span></span>
                    </button>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={clientAvatar(clients, workout.client)} />{workout.client}</div></td>
                  <td className="px-4 py-3"><Badge>{workout.goal}</Badge></td>
                  <td className="px-4 py-3">{workout.frequency ?? "3x por semana"}</td>
                  <td className="px-4 py-3">{workout.exercises}</td>
                  <td className="px-4 py-3">{workout.reviewDate ?? "30 dias"}</td>
                  <td className="px-4 py-3"><StatusDot label={workout.status} tone={statusTone(workout.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button title="Ver detalhes" onClick={() => openEditor(workout)}><Eye className="h-4 w-4" /></button>
                      <button title="Editar" onClick={() => { setSelected(workout); setModal("edit"); }}><Edit className="h-4 w-4" /></button>
                      <button title="Duplicar" onClick={() => { duplicateWorkout(workout.id); toastSuccess("Treino duplicado com sucesso"); }}><Copy className="h-4 w-4" /></button>
                      <button title={nextStatusLabel(workout)} onClick={() => toggleStatus(workout)}>{workout.status === "Ativo" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                      <button title="Arquivar" onClick={() => { setWorkoutStatus(workout.id, "Arquivado"); toastSuccess("Treino arquivado"); }}><Archive className="h-4 w-4" /></button>
                      <button className="text-red-300" title="Excluir" onClick={() => { setSelected(workout); setModal("delete"); }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            {!filteredWorkouts.length && <p className="rounded-lg border border-white/10 p-6 text-center text-sm text-zinc-400">Nenhum treino encontrado para os filtros selecionados.</p>}
          </div>
        )}

        {activeTab === "Editor" && (
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <Card className="p-5">
              <h2 className="text-lg font-semibold">{active?.name ?? "Selecione um treino"}</h2>
              <p className="mt-1 text-sm text-zinc-400">{active?.client ?? "Nenhum cliente selecionado"}</p>
              <div className="mt-4 space-y-3 text-sm">
                {active && [["Objetivo", active.goal], ["Nivel", active.level ?? "Intermediario"], ["Frequencia", active.frequency ?? "3x por semana"], ["Duracao", active.duration ?? "60 min"], ["Revisao", active.reviewDate ?? "30 dias"], ["Criado por", active.author]].map(([label, value]) => <p key={label} className="flex justify-between gap-3"><span className="text-zinc-400">{label}</span><span className="text-right">{value}</span></p>)}
              </div>
              <div className="mt-5 grid gap-2">
                <Button onClick={() => setModal("edit")} disabled={!active}>Editar ficha</Button>
                <Button onClick={() => active && duplicateWorkout(active.id)} disabled={!active}>Duplicar como modelo</Button>
              </div>
            </Card>
            <div className="space-y-4">
              {(active?.blocks ?? []).map((block) => (
                <Card key={block.id} className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">{block.name}</h3>
                    <Badge>{`${block.exercises.length} exercicios`}</Badge>
                  </div>
                  <Table columns={["Exercicio", "Grupo", "Series", "Reps", "Carga", "Descanso", "Notas"]}>
                    {block.exercises.map((exercise) => (
                      <tr key={exercise.id} className="table-row">
                        <td className="px-4 py-3 font-medium">{exercise.name}</td>
                        <td className="px-4 py-3">{exercise.group}</td>
                        <td className="px-4 py-3">{exercise.sets}</td>
                        <td className="px-4 py-3">{exercise.reps}</td>
                        <td className="px-4 py-3">{exercise.load || "-"}</td>
                        <td className="px-4 py-3">{exercise.rest}</td>
                        <td className="px-4 py-3 text-zinc-400">{exercise.notes || "-"}</td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              ))}
              {!active?.blocks?.length && <p className="rounded-lg border border-white/10 p-6 text-center text-sm text-zinc-400">Selecione um treino para visualizar os exercicios.</p>}
            </div>
          </div>
        )}

        {activeTab === "Biblioteca" && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input placeholder="Buscar exercicio, grupo ou equipamento..." value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} />
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal("exercises")}>Novo exercicio</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.name} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold">{exercise.name}</h3><p className="mt-1 text-sm text-zinc-400">{exercise.instructions}</p></div>
                    <Badge>{exercise.group}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                    <span>{exercise.equipment}</span>
                    <span>{exercise.level}</span>
                    <span>{exercise.pattern}</span>
                    <button className="text-left text-noogym-lime" onClick={() => toastInfo("Exercicio selecionado", "Edite um treino para adicionar este exercicio.")}>Adicionar a ficha</button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Alunos" && (
          <div className="space-y-4">
            <Table columns={["Aluno", "Plano", "Treino ativo", "Objetivo", "Status", "Acao"]}>
              {clients.map((client) => {
                const workout = workouts.find((item) => item.client === client.name && item.status === "Ativo");
                return (
                  <tr key={client.id} className="table-row">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={client.avatar ?? "CL"} /><span><span className="block font-medium">{client.name}</span><span className="block text-xs text-zinc-400">{client.phone}</span></span></div></td>
                    <td className="px-4 py-3"><Badge>{client.plan}</Badge></td>
                    <td className="px-4 py-3">{workout?.name ?? "Sem treino ativo"}</td>
                    <td className="px-4 py-3">{workout?.goal ?? "-"}</td>
                    <td className="px-4 py-3"><StatusDot label={workout ? "Com treino" : "Pendente"} tone={workout ? "lime" : "orange"} /></td>
                    <td className="px-4 py-3"><Button className="h-8" icon={<UserPlus className="h-4 w-4" />} onClick={() => { setSelected(workout); setModal(workout ? "edit" : "new"); }}>{workout ? "Editar" : "Criar treino"}</Button></td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}

        {activeTab === "Relatorios" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5"><h3 className="font-semibold">Cobertura</h3><p className="mt-4 text-3xl font-bold">{clients.length ? Math.round((assignedClients.size / clients.length) * 100) : 0}%</p><p className="mt-2 text-sm text-zinc-400">alunos com treino ativo</p></Card>
            <Card className="p-5"><h3 className="font-semibold">Objetivo mais usado</h3><p className="mt-4 text-2xl font-bold">{goals[1] ?? "Sem dados"}</p><p className="mt-2 text-sm text-zinc-400">{workouts.filter((item) => item.goal === goals[1]).length} fichas</p></Card>
            <Card className="p-5"><h3 className="font-semibold">Carga operacional</h3><p className="mt-4 text-2xl font-bold">{allExercises.length} exercicios</p><p className="mt-2 text-sm text-zinc-400">em fichas de treino</p></Card>
            <Card className="p-5 lg:col-span-3">
              <h3 className="mb-4 font-semibold">Resumo por objetivo</h3>
              <div className="space-y-3">
                {goals.slice(1).map((goal) => {
                  const total = workouts.filter((item) => item.goal === goal).length;
                  const width = workouts.length ? Math.max(8, (total / workouts.length) * 100) : 0;
                  return <div key={goal} className="grid grid-cols-[160px_1fr_60px] items-center gap-3 text-sm"><span>{goal}</span><span className="h-2 rounded-full bg-white/10"><span className="block h-2 rounded-full bg-noogym-lime" style={{ width: `${width}%` }} /></span><span className="text-right">{total}</span></div>;
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="icon-tile"><Dumbbell className="h-5 w-5" /></span>
            <Badge>{active?.status ?? "Sem treino"}</Badge>
          </div>
          <h2 className="mt-4 text-xl font-semibold">{active?.name ?? "Nenhum treino"}</h2>
          <p className="mt-1 text-sm text-zinc-400">{active?.notes || "Ficha pronta para acompanhamento do aluno."}</p>
          {active && [["Cliente", active.client], ["Objetivo", active.goal], ["Exercicios", String(active.exercises)], ["Frequencia", active.frequency ?? "3x por semana"], ["Revisao", active.reviewDate ?? "30 dias"]].map(([label, value]) => <p key={label} className="mt-4 flex justify-between gap-3 text-sm"><span className="text-zinc-400">{label}</span><span className="text-right">{value}</span></p>)}
          <Button className="mt-5 w-full" onClick={() => setActiveTab("Editor")} disabled={!active}>Abrir editor</Button>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Acoes rapidas</h2>
          <Button className="mb-2 w-full" icon={<Edit className="h-4 w-4" />} onClick={() => setModal("edit")} disabled={!active}>Editar treino</Button>
          <Button className="mb-2 w-full" icon={<Copy className="h-4 w-4" />} onClick={() => { if (active) duplicateWorkout(active.id); toastSuccess("Treino duplicado com sucesso"); }} disabled={!active}>Duplicar treino</Button>
          <Button className="mb-2 w-full" icon={active?.status === "Ativo" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} onClick={() => toggleStatus(active)} disabled={!active}>{nextStatusLabel(active)}</Button>
          <Button className="w-full" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setModal("delete")} disabled={!active}>Excluir treino</Button>
        </Card>
      </aside>

      <WorkoutBuilderModal open={modal === "new"} onClose={() => setModal(null)} />
      <WorkoutBuilderModal open={modal === "edit"} workout={active} onClose={() => setModal(null)} />
      <ExerciseLibraryModal open={modal === "exercises"} onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "delete"} title="Excluir treino" message="Esta acao remove o treino do estado local simulado." confirmLabel="Excluir treino" danger onClose={() => setModal(null)} onConfirm={() => { if (active) deleteWorkout(active.id); toastSuccess("Treino excluido com sucesso"); setModal(null); }} />
    </div>
  );
}
