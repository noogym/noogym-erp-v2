import { CalendarDays, Edit, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { ClassFormModal, EndClassModal, StudentsClassModal, WeeklyScheduleModal } from "../components/modals/OperationalModals";
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
import { useClassesStore } from "../store/classesStore";
import { useClientsStore } from "../store/clientsStore";
import type { ClassRecord } from "../store/domainTypes";

export default function Aulas() {
  const [modal, setModal] = useState<"new" | "schedule" | "edit" | "end" | "students" | null>(null);
  const [selected, setSelected] = useState<ClassRecord | undefined>();
  const classes = useClassesStore((state) => state.classes);
  const clients = useClientsStore((state) => state.clients);
  const lesson = selected ?? classes[0];

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Aulas" subtitle="Gerencie as aulas, horários e instrutores." actions={<><Button icon={<CalendarDays className="h-4 w-4" />} onClick={() => setModal("schedule")}>Horário semanal</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setModal("new")}>Nova aula</Button></>} />
        <div className="grid grid-cols-4 gap-4"><MetricCard title="Aulas hoje" value="12" change="+ 20% vs ontem" icon={<CalendarDays className="h-5 w-5" />} tone="purple" /><MetricCard title="Aulas esta semana" value="56" change="+ 15% vs semana passada" icon={<UsersRound className="h-5 w-5" />} tone="orange" /><MetricCard title="Total de aulas" value={String(classes.length)} change="+ 18% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} tone="blue" /><MetricCard title="Participações hoje" value="182" change="+ 22% vs ontem" icon={<UsersRound className="h-5 w-5" />} tone="green" /></div>
        <Tabs tabs={["Todas as aulas", "Aulas de hoje", "Aulas recorrentes", "Aulas encerradas"]} active="Todas as aulas" onChange={() => undefined} />
        <div className="mt-4 grid grid-cols-[1fr_200px_210px] gap-3"><Input placeholder="Buscar aula por nome..." /><Select><option>Todos os instrutores</option></Select><Select><option>Todas as modalidades</option></Select></div>
        <div className="mt-4">
          <Table columns={["Aula", "Categoria", "Instrutor", "Horário", "Vagas", "Participantes", "Status", "Ações"]}>
            {classes.map((item, index) => <tr key={item.id} className="table-row cursor-pointer" onClick={() => setSelected(item)}><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="icon-tile text-noogym-lime"><CalendarDays className="h-5 w-5" /></span><div><p>{item.name}</p><p className="text-xs text-zinc-400">{item.room}</p></div></div></td><td className="px-4 py-3"><Badge>{item.category}</Badge></td><td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={clients[index % clients.length]?.avatar ?? "IN"} />{item.instructor}</div></td><td className="px-4 py-3"><p>{item.time}</p><p className="text-xs text-zinc-400">{item.duration}</p></td><td className="px-4 py-3">{item.seats}</td><td className="px-4 py-3">{item.participants}</td><td className="px-4 py-3"><StatusDot label={item.status} tone={item.status === "Encerrada" ? "red" : item.status === "Agendada" ? "blue" : "lime"} /></td><td className="px-4 py-3"><button onClick={(event) => { event.stopPropagation(); setSelected(item); setModal("edit"); }}><Edit className="h-4 w-4" /></button></td></tr>)}
          </Table>
        </div>
      </div>
      <aside className="panel p-5">
        <div className="flex items-start gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-lg bg-noogym-lime/20 text-noogym-lime"><CalendarDays className="h-7 w-7" /></span><div className="flex-1"><h2 className="text-xl font-semibold">{lesson?.name}</h2><p className="text-sm text-zinc-400">{lesson?.time}</p></div><Badge>{lesson?.status}</Badge></div>
        <div className="mt-6 space-y-4 border-t border-white/10 pt-4 text-sm"><p className="text-zinc-400">Aula de alta intensidade com foco em condicionamento e presença controlada por check-in.</p>{["Categoria|" + lesson?.category, "Capacidade|" + lesson?.seats + " alunos", "Duração|" + lesson?.duration, "Instrutor|" + lesson?.instructor].map((row) => { const [label, value] = row.split("|"); return <p key={label} className="flex justify-between"><span className="text-zinc-400">{label}</span><span>{value}</span></p>; })}</div>
        <div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={() => setModal("students")}>Ver lista de alunos</Button><Button onClick={() => setModal("edit")}>Editar aula</Button>{lesson?.status === "Em andamento" ? <Button className="col-span-2" variant="danger" onClick={() => setModal("end")}>Encerrar aula</Button> : null}</div>
      </aside>
      <ClassFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <ClassFormModal open={modal === "edit"} lesson={lesson} onClose={() => setModal(null)} />
      <WeeklyScheduleModal open={modal === "schedule"} onClose={() => setModal(null)} />
      <EndClassModal open={modal === "end"} lesson={lesson} onClose={() => setModal(null)} />
      <StudentsClassModal open={modal === "students"} onClose={() => setModal(null)} />
    </div>
  );
}
