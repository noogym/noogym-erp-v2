import { Calendar, ClipboardCheck, Download, Filter, History, RefreshCw, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { NewCheckinModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { DropdownMenu } from "@noogym/ui";
import { Input } from "@noogym/ui";
import { LineChart } from "../components/ui/Charts";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { useCheckinsStore } from "../store/checkinsStore";
import { toastSuccess } from "../store/toastStore";

export default function CheckIn() {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Todos os tipos");
  const [date, setDate] = useState("08/05/2026");
  const checkins = useCheckinsStore((state) => state.checkins);
  const todayCount = useCheckinsStore((state) => state.todayCount);
  const filtered = useMemo(() => checkins.filter((checkin) => {
    const matchesQuery = `${checkin.clientName} ${checkin.clientId}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === "Todos os tipos" || checkin.type === type;
    return matchesQuery && matchesType;
  }), [checkins, query, type]);

  return (
    <div className="checkin-grid">
      <div className="panel p-6">
        <PageHeader
          title="Check-in"
          subtitle="Gerencie os check-ins realizados na unidade."
          actions={
            <>
              <Button variant="primary" icon={<UserCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>Novo check-in</Button>
              <DropdownMenu actions={[
                { label: "Exportar check-ins", onClick: () => toastSuccess("Check-ins exportados com sucesso") },
                { label: "Relatório do dia", onClick: () => toastSuccess("Relatório do dia gerado") },
                { label: "Limpar filtros", onClick: () => { setQuery(""); setType("Todos os tipos"); } },
                { label: "Sincronizar check-ins", onClick: () => toastSuccess("Check-ins sincronizados") }
              ]} />
            </>
          }
        />
        <div className="grid grid-cols-[180px_180px_1fr_120px] gap-3">
          <Button icon={<Calendar className="h-4 w-4" />}>{date}</Button>
          <Select value={type} onChange={(event) => setType(event.target.value)}><option>Todos os tipos</option><option>Presencial</option><option>QR Code</option><option>App</option><option>Manual</option></Select>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, BI ou código..." />
          <Button icon={<Filter className="h-4 w-4" />} onClick={() => setDate("08/05/2026")}>Filtros</Button>
        </div>
        <Card className="mt-4 p-4">
          <Table columns={["Cliente", "Código", "Entrada", "Tipo", "Acesso", "Observação", "Status"]}>
            {filtered.map((checkin) => (
              <tr key={checkin.id} className="table-row">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar label={checkin.clientName.slice(0, 2)} /><span>{checkin.clientName}</span></div></td>
                <td className="px-4 py-3">{checkin.clientId}</td>
                <td className="px-4 py-3">{checkin.dateTime}</td>
                <td className="px-4 py-3">{checkin.type}</td>
                <td className="px-4 py-3">{checkin.accessType}</td>
                <td className="px-4 py-3 text-zinc-400">{checkin.observation ?? "-"}</td>
                <td className="px-4 py-3"><StatusDot label="Confirmado" /></td>
              </tr>
            ))}
          </Table>
          <p className="mt-4 text-sm text-zinc-400">Mostrando {filtered.length} de {checkins.length} check-ins</p>
        </Card>
      </div>
      <aside className="space-y-3">
        <Card className="p-5"><h2 className="font-semibold">Resumo do dia</h2><p className="mt-4 text-3xl font-semibold">{todayCount}</p><p className="text-sm text-noogym-lime">+ 12% vs ontem</p><div className="mt-4 h-28"><LineChart values={[10, 18, 16, 34, 28, 42, 38]} labels={["00h", "06h", "12h", "18h", "24h"]} /></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Ações rápidas</h2><div className="space-y-2"><Button className="w-full justify-start" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>Novo check-in</Button><Button className="w-full justify-start" icon={<Download className="h-4 w-4" />} onClick={() => toastSuccess("Check-ins exportados com sucesso")}>Exportar check-ins</Button><Button className="w-full justify-start" icon={<History className="h-4 w-4" />}>Histórico de acesso</Button><Button className="w-full justify-start" icon={<RefreshCw className="h-4 w-4" />}>Sincronizar check-ins</Button></div></Card>
      </aside>
      <NewCheckinModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
