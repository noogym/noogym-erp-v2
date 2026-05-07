import { CalendarDays, Edit, Plus, UsersRound } from "lucide-react";
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
import { classes, clients } from "../data/mock";

export default function Aulas() {
  const selected = classes[0];
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Aulas" subtitle="Gerencie as aulas, horários, instrutores e participantes." actions={<><Button icon={<CalendarDays className="h-4 w-4" />}>Horário semanal</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />}>Nova aula</Button></>} />
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Aulas hoje" value="12" change="+ 20% vs ontem" icon={<CalendarDays className="h-5 w-5" />} tone="purple" />
          <MetricCard title="Aulas esta semana" value="56" change="+ 15% vs semana passada" icon={<UsersRound className="h-5 w-5" />} tone="orange" />
          <MetricCard title="Total de aulas" value="248" change="+ 18% vs mês passado" icon={<CalendarDays className="h-5 w-5" />} tone="blue" />
          <MetricCard title="Participações hoje" value="182" change="+ 22% vs ontem" icon={<UsersRound className="h-5 w-5" />} tone="green" />
        </div>
        <Tabs tabs={["Todas as aulas", "Aulas de hoje", "Aulas recorrentes", "Aulas encerradas"]} active="Todas as aulas" onChange={() => undefined} />
        <div className="mt-4 grid grid-cols-[1fr_200px_210px_110px] gap-3">
          <Input placeholder="Buscar aula por nome..." /><Select><option>Todos os instrutores</option></Select><Select><option>Todas as modalidades</option></Select><Button>Filtros</Button>
        </div>
        <div className="mt-4">
          <Table columns={["Aula", "Modalidade", "Instrutor", "Horário", "Vagas", "Participantes", "Status", "Ações"]}>
            {classes.map((lesson, index) => (
              <tr key={lesson.name} className="table-row">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="icon-tile text-noogym-lime"><CalendarDays className="h-5 w-5" /></span><div><p>{lesson.name}</p><p className="text-xs text-zinc-400">{lesson.room}</p></div></div></td>
                <td className="px-4 py-3"><Badge tone={lesson.category === "Cardio" ? "lime" : lesson.category === "Funcional" ? "orange" : "purple"}>{lesson.category}</Badge></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar label={clients[index % clients.length].avatar} />{lesson.instructor}</div></td>
                <td className="px-4 py-3"><p>{lesson.time}</p><p className="text-xs text-zinc-400">{lesson.duration}</p></td>
                <td className="px-4 py-3">{lesson.seats}</td>
                <td className="px-4 py-3"><p>{lesson.participants}</p><p className="text-xs text-noogym-lime">{Math.round((lesson.participants / lesson.seats) * 100)}%</p></td>
                <td className="px-4 py-3"><StatusDot label={lesson.status} tone={lesson.status === "Agendada" ? "blue" : "lime"} /></td>
                <td className="px-4 py-3"><div className="flex gap-3"><Edit className="h-4 w-4" /><span>⋮</span></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="panel p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-noogym-lime/20 text-noogym-lime"><CalendarDays className="h-7 w-7" /></span>
          <div className="flex-1"><h2 className="text-xl font-semibold">{selected.name}</h2><p className="text-sm text-zinc-400">Sala 1</p><p className="text-sm text-zinc-400">Hoje, 07:00 - 08:00</p></div>
          <Badge>Em andamento</Badge>
        </div>
        <div className="mt-6 space-y-4 border-t border-white/10 pt-4 text-sm">
          <h3 className="font-semibold">Instrutor</h3>
          <div className="flex items-center gap-3"><Avatar label="LF" /><div><p>Lucas Ferreira</p><p className="text-xs text-zinc-400">+244 923 777 888</p></div></div>
          <h3 className="font-semibold">Descrição</h3>
          <p className="text-zinc-400">Aula de ciclismo indoor de alta intensidade para melhorar o condicionamento cardiovascular.</p>
          {["Modalidade|Cardio", "Nível|Todos os níveis", "Equipamentos|Bicicleta ergométrica", "Vagas totais|20", "Check-in liberado até|06:50"].map((row) => {
            const [label, value] = row.split("|");
            return <p key={label} className="flex justify-between"><span className="text-zinc-400">{label}</span><span>{value}</span></p>;
          })}
        </div>
        <div className="mt-6"><div className="mb-2 flex justify-between"><h3 className="font-semibold">Participantes (18/20)</h3><span className="text-xs text-noogym-lime">Ver todos</span></div><div className="h-2 rounded bg-white/10"><span className="block h-full w-[90%] rounded bg-noogym-lime" /></div></div>
        <div className="mt-4 space-y-3">{clients.slice(0, 5).map((client) => <div key={client.id} className="flex items-center gap-3 text-sm"><Avatar label={client.avatar} /><span className="flex-1">{client.name}</span><span className="text-xs text-zinc-400">Check-in realizado</span></div>)}</div>
        <div className="mt-6 grid grid-cols-2 gap-2"><Button>Editar aula</Button><Button variant="danger">Encerrar aula</Button></div>
      </aside>
    </div>
  );
}
