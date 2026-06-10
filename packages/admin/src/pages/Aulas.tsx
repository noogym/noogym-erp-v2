import { CalendarDays, Copy, Edit, ListChecks, Plus, RefreshCcw, UsersRound, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClassAgendaModal, ClassRosterModal, ClassSessionModal, EndClassModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { StatusDot } from "../components/ui/StatusDot";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { Table } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { ListPagination, ListToolbar, paginateRows } from "../components/tables/ListControls";
import { useClassesStore } from "../store/classesStore";
import { useClientsStore } from "../store/clientsStore";
import { toastSuccess } from "../store/toastStore";
import type { ClassRecord } from "@noogym/types";

type TabKey = "Aulas" | "Agenda" | "Participantes" | "Relatorios";

const tabs: TabKey[] = ["Aulas", "Agenda", "Participantes", "Relatorios"];
const agendaDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const agendaHours = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "18:00", "19:00", "20:00", "21:00"];

const dateFromClass = (lesson: ClassRecord) => {
  if (!lesson.startAtIso) return null;
  const date = new Date(lesson.startAtIso);
  return Number.isNaN(date.getTime()) ? null : date;
};
const isToday = (lesson: ClassRecord) => {
  const date = dateFromClass(lesson);
  return date ? date.toDateString() === new Date().toDateString() : lesson.time.startsWith("Hoje");
};
const isThisWeek = (lesson: ClassRecord) => {
  const date = dateFromClass(lesson);
  if (!date) return lesson.time === "Hoje" || lesson.time === "Amanha";
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
};
const hourFromClass = (lesson: ClassRecord) => {
  const date = dateFromClass(lesson);
  if (date) return date.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
  return lesson.time.match(/\d{2}:\d{2}/)?.[0] ?? "08:00";
};
const dayIndexFromClass = (lesson: ClassRecord) => {
  const date = dateFromClass(lesson);
  if (!date) return 0;
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
};
const statusTone = (status: string) => status === "Encerrada" || status === "Cancelada" ? "red" : status === "Agendada" ? "blue" : "lime";
const occupancy = (lesson: ClassRecord) => lesson.seats ? Math.round((lesson.participants / lesson.seats) * 100) : 0;

export default function Aulas() {
  const [tab, setTab] = useState<TabKey>("Aulas");
  const [query, setQuery] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("Todos os instrutores");
  const [categoryFilter, setCategoryFilter] = useState("Todas as categorias");
  const [statusFilter, setStatusFilter] = useState("Todos os status");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState<"new" | "schedule" | "edit" | "end" | "students" | null>(null);
  const [selected, setSelected] = useState<ClassRecord | undefined>();
  const classes = useClassesStore((state) => state.classes);
  const duplicateClass = useClassesStore((state) => state.duplicateClass);
  const cancelClass = useClassesStore((state) => state.cancelClass);
  const startClass = useClassesStore((state) => state.startClass);
  const closeClass = useClassesStore((state) => state.closeClass);
  const clients = useClientsStore((state) => state.clients);
  const lesson = selected ?? classes[0];

  const instructors = useMemo(() => ["Todos os instrutores", ...Array.from(new Set(classes.map((item) => item.instructor).filter(Boolean)))], [classes]);
  const categories = useMemo(() => ["Todas as categorias", ...Array.from(new Set(classes.map((item) => item.category).filter(Boolean)))], [classes]);
  const filtered = useMemo(() => classes.filter((item) => {
    const text = `${item.name} ${item.category} ${item.instructor} ${item.room}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesInstructor = instructorFilter === "Todos os instrutores" || item.instructor === instructorFilter;
    const matchesCategory = categoryFilter === "Todas as categorias" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "Todos os status" || item.status === statusFilter;
    return matchesQuery && matchesInstructor && matchesCategory && matchesStatus;
  }), [categoryFilter, classes, instructorFilter, query, statusFilter]);
  const pageData = useMemo(() => paginateRows(filtered, page, pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [categoryFilter, instructorFilter, pageSize, query, statusFilter]);
  const todayClasses = useMemo(() => classes.filter(isToday), [classes]);
  const weekClasses = useMemo(() => classes.filter(isThisWeek), [classes]);
  const activeClasses = useMemo(() => classes.filter((item) => item.status !== "Encerrada" && item.status !== "Cancelada"), [classes]);
  const totalParticipantsToday = todayClasses.reduce((sum, item) => sum + item.participants, 0);
  const mostPopular = useMemo(() => classes.slice().sort((a, b) => occupancy(b) - occupancy(a))[0], [classes]);
  const selectedRoster = lesson ? clients.slice(0, Math.max(lesson.participants, 6)) : [];

  const editLesson = (item: ClassRecord) => {
    setSelected(item);
    setModal("edit");
  };
  const rosterLesson = (item: ClassRecord) => {
    setSelected(item);
    setModal("students");
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Aulas" subtitle="Gerencie modelos, agenda, presencas e ocupacao." actions={<><Button icon={<CalendarDays className="h-4 w-4" />} onClick={() => setModal("schedule")}>Agenda semanal</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setSelected(undefined); setModal("new"); }}>Nova aula</Button></>} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Aulas hoje" value={String(todayClasses.length)} change={`${totalParticipantsToday} participacoes`} icon={<CalendarDays className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Aulas esta semana" value={String(weekClasses.length)} change={`${activeClasses.length} aulas ativas`} icon={<UsersRound className="h-5 w-5" />} tone="orange" />
          <MetricCard title="Total de sessoes" value={String(classes.length)} change={`${categories.length - 1} categorias`} icon={<CalendarDays className="h-5 w-5" />} tone="blue" />
          <MetricCard title="Ocupacao destaque" value={mostPopular ? `${occupancy(mostPopular)}%` : "0%"} change={mostPopular?.name ?? "Sem aulas"} icon={<UsersRound className="h-5 w-5" />} tone="green" />
        </div>
        <div className="mt-5">
          <Tabs tabs={tabs} active={tab} onChange={(value) => setTab(value as TabKey)} />
        </div>

        {tab === "Aulas" ? (
          <>
            <div className="mt-4"><ListToolbar query={query} onQueryChange={setQuery} queryPlaceholder="Buscar aula por nome, sala ou instrutor..." pageSize={pageSize} onPageSizeChange={setPageSize} onClear={() => { setQuery(""); setInstructorFilter("Todos os instrutores"); setCategoryFilter("Todas as categorias"); setStatusFilter("Todos os status"); }}><Select value={instructorFilter} onChange={(event) => setInstructorFilter(event.target.value)}>{instructors.map((item) => <option key={item}>{item}</option>)}</Select><Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</Select><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos os status</option><option>Agendada</option><option>Em andamento</option><option>Encerrada</option><option>Cancelada</option></Select></ListToolbar></div>
            <div className="mt-4">
              <ClassTable classes={pageData.pageRows} clients={clients} onSelect={setSelected} onEdit={editLesson} onRoster={rosterLesson} onDuplicate={(item) => { duplicateClass(item.id); toastSuccess("Aula duplicada com sucesso"); }} onStart={(item) => startClass(item.id)} onEnd={(item) => { setSelected(item); setModal("end"); }} onCancel={(item) => { cancelClass(item.id); toastSuccess("Aula cancelada"); }} />
              <ListPagination page={pageData.page} totalPages={pageData.totalPages} totalItems={filtered.length} start={pageData.start} end={pageData.end} label="aulas" onPageChange={setPage} />
            </div>
          </>
        ) : null}

        {tab === "Agenda" ? (
          <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-8 bg-white/[0.03] text-sm">{["Horarios", ...agendaDays].map((label) => <div key={label} className="border-r border-white/10 p-3 text-center last:border-r-0">{label}</div>)}</div>
            {agendaHours.map((hour) => <div key={hour} className="grid grid-cols-8 border-t border-white/10 text-sm"><div className="p-3 text-center">{hour}</div>{agendaDays.map((day, dayIndex) => {
              const slotLessons = classes.filter((item) => dayIndexFromClass(item) === dayIndex && hourFromClass(item) === hour && item.status !== "Cancelada");
              return <div key={`${day}-${hour}`} className="min-h-16 border-l border-white/10 p-1">{slotLessons.map((item) => <button key={item.id} onClick={() => setSelected(item)} className="mb-1 block w-full rounded p-2 text-xs text-white" style={{ backgroundColor: item.color ?? "#4D7C0F" }}>{item.name}<br />{item.instructor}</button>)}</div>;
            })}</div>)}
          </div>
        ) : null}

        {tab === "Participantes" ? (
          <div className="mt-4">
            <Table columns={["Aula", "Capacidade", "Presentes", "Ocupacao", "Lista/Presenca"]}>
              {activeClasses.map((item) => <tr key={item.id} className="table-row"><td className="px-4 py-3"><p>{item.name}</p><p className="text-xs text-zinc-400">{item.time} - {item.instructor}</p></td><td className="px-4 py-3">{item.seats}</td><td className="px-4 py-3">{item.participants}</td><td className="px-4 py-3"><span className="font-semibold text-noogym-lime">{occupancy(item)}%</span></td><td className="px-4 py-3"><Button className="h-8" icon={<ListChecks className="h-4 w-4" />} onClick={() => rosterLesson(item)}>Gerir presencas</Button></td></tr>)}
            </Table>
          </div>
        ) : null}

        {tab === "Relatorios" ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card className="p-5"><h2 className="font-semibold">Aulas mais ocupadas</h2><div className="mt-4 space-y-3">{classes.slice().sort((a, b) => occupancy(b) - occupancy(a)).slice(0, 6).map((item) => <p key={item.id} className="flex justify-between border-b border-white/[0.07] pb-3 text-sm"><span>{item.name}</span><span className="text-noogym-lime">{occupancy(item)}%</span></p>)}</div></Card>
            <Card className="p-5"><h2 className="font-semibold">Participacao por instrutor</h2><div className="mt-4 space-y-3">{instructors.filter((item) => item !== "Todos os instrutores").map((instructor) => <p key={instructor} className="flex justify-between border-b border-white/[0.07] pb-3 text-sm"><span>{instructor}</span><span className="text-noogym-lime">{classes.filter((item) => item.instructor === instructor).reduce((sum, item) => sum + item.participants, 0)} alunos</span></p>)}</div></Card>
          </div>
        ) : null}
      </div>

      <aside className="panel p-5">
        <div className="flex items-start gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-lg text-white" style={{ backgroundColor: lesson?.color ?? "#4D7C0F" }}><CalendarDays className="h-7 w-7" /></span><div className="flex-1"><h2 className="text-xl font-semibold">{lesson?.name}</h2><p className="text-sm text-zinc-400">{lesson?.time}</p></div>{lesson ? <Badge>{lesson.status}</Badge> : null}</div>
        {lesson ? <div className="mt-6 space-y-4 border-t border-white/10 pt-4 text-sm"><p className="text-zinc-400">{lesson.description ?? "Sem descricao definida."}</p>{["Categoria|" + lesson.category, "Sala|" + lesson.room, "Capacidade|" + lesson.seats + " alunos", "Duracao|" + lesson.duration, "Instrutor|" + lesson.instructor, "Equipamentos|" + (lesson.equipment ?? "Nao informado")].map((row) => { const [label, value] = row.split("|"); return <p key={label} className="flex justify-between gap-3"><span className="text-zinc-400">{label}</span><span className="text-right">{value}</span></p>; })}</div> : null}
        <div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={() => lesson && rosterLesson(lesson)}>Lista de alunos</Button><Button onClick={() => lesson && editLesson(lesson)}>Editar aula</Button>{lesson?.status === "Em andamento" ? <Button className="col-span-2" variant="danger" onClick={() => setModal("end")}>Encerrar aula</Button> : lesson?.status === "Agendada" ? <Button className="col-span-2" onClick={() => lesson && startClass(lesson.id)}>Iniciar aula</Button> : null}</div>
        <div className="mt-5 border-t border-white/10 pt-4">
          <h3 className="font-semibold">Alunos desta sessao</h3>
          <div className="mt-3 space-y-2">{selectedRoster.map((client, index) => <p key={client.id} className="flex items-center gap-2 rounded border border-white/10 p-2 text-sm"><Avatar label={client.avatar ?? "CL"} /> <span className="flex-1 truncate">{client.name}</span><StatusDot label={index < (lesson?.participants ?? 0) ? "Presente" : "Reservado"} tone={index < (lesson?.participants ?? 0) ? "lime" : "gray"} /></p>)}</div>
        </div>
      </aside>

      <ClassSessionModal open={modal === "new"} onClose={() => setModal(null)} />
      <ClassSessionModal open={modal === "edit"} lesson={lesson} onClose={() => setModal(null)} />
      <ClassAgendaModal open={modal === "schedule"} onClose={() => setModal(null)} />
      <EndClassModal open={modal === "end"} lesson={lesson} onClose={() => setModal(null)} />
      <ClassRosterModal open={modal === "students"} lesson={lesson} onClose={() => setModal(null)} />
    </div>
  );
}

function ClassTable({ classes, clients, onSelect, onEdit, onRoster, onDuplicate, onStart, onEnd, onCancel }: { classes: ClassRecord[]; clients: ReturnType<typeof useClientsStore.getState>["clients"]; onSelect: (lesson: ClassRecord) => void; onEdit: (lesson: ClassRecord) => void; onRoster: (lesson: ClassRecord) => void; onDuplicate: (lesson: ClassRecord) => void; onStart: (lesson: ClassRecord) => void; onEnd: (lesson: ClassRecord) => void; onCancel: (lesson: ClassRecord) => void }) {
  return (
    <Table columns={["Aula", "Categoria", "Instrutor", "Horario", "Vagas", "Participantes", "Status", "Acoes"]}>
      {classes.map((item, index) => <tr key={item.id} className="table-row cursor-pointer" onClick={() => onSelect(item)}><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: item.color ?? "#4D7C0F" }}><CalendarDays className="h-5 w-5" /></span><div><p>{item.name}</p><p className="text-xs text-zinc-400">{item.room}</p></div></div></td><td className="px-4 py-3"><Badge>{item.category}</Badge></td><td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={clients[index % Math.max(1, clients.length)]?.avatar ?? "IN"} />{item.instructor}</div></td><td className="px-4 py-3"><p>{item.time}</p><p className="text-xs text-zinc-400">{item.duration}</p></td><td className="px-4 py-3">{item.seats}</td><td className="px-4 py-3">{item.participants}</td><td className="px-4 py-3"><StatusDot label={item.status} tone={statusTone(item.status)} /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><button title="Editar" onClick={(event) => { event.stopPropagation(); onEdit(item); }}><Edit className="h-4 w-4" /></button><button title="Presencas" onClick={(event) => { event.stopPropagation(); onRoster(item); }}><ListChecks className="h-4 w-4" /></button><button title="Duplicar" onClick={(event) => { event.stopPropagation(); onDuplicate(item); }}><Copy className="h-4 w-4" /></button>{item.status === "Agendada" ? <button title="Iniciar" onClick={(event) => { event.stopPropagation(); onStart(item); }}><RefreshCcw className="h-4 w-4" /></button> : null}{item.status === "Em andamento" ? <button title="Encerrar" onClick={(event) => { event.stopPropagation(); onEnd(item); }}><XCircle className="h-4 w-4 text-red-300" /></button> : null}<button title="Cancelar" onClick={(event) => { event.stopPropagation(); onCancel(item); }}><XCircle className="h-4 w-4 text-red-300" /></button></div></td></tr>)}
    </Table>
  );
}
