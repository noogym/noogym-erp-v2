import { Calendar, ClipboardCheck, Download, Filter, History, RefreshCw, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { CheckinRecord } from "@noogym/types";
import { NewCheckinModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { DropdownMenu } from "@noogym/ui";
import { Input } from "@noogym/ui";
import { LineChart } from "../components/ui/Charts";
import { Modal } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { useCheckinsStore } from "../store/checkinsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const formatInputDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const normalizeCheckinDate = (dateTime?: string) => {
  if (!dateTime) return todayInputValue();
  if (dateTime.startsWith("Hoje")) return todayInputValue();

  const match = dateTime.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return todayInputValue();

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

const checkinHour = (checkin: CheckinRecord) => {
  if (checkin.checkedAtIso) {
    const date = new Date(checkin.checkedAtIso);
    if (!Number.isNaN(date.getTime())) return date.getHours();
  }

  const match = checkin.dateTime.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) : 0;
};

const chartBuckets = (rows: CheckinRecord[]) => {
  const buckets = [0, 0, 0, 0, 0];
  rows.forEach((checkin) => {
    const hour = checkinHour(checkin);
    if (hour < 5) buckets[0] += 1;
    else if (hour < 10) buckets[1] += 1;
    else if (hour < 15) buckets[2] += 1;
    else if (hour < 20) buckets[3] += 1;
    else buckets[4] += 1;
  });
  return buckets;
};

const downloadCsv = (rows: CheckinRecord[], selectedDate: string) => {
  const headers = ["Cliente", "Codigo", "Entrada", "Tipo", "Acesso", "Observacao"];
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((checkin) => [
      checkin.clientName,
      checkin.clientId,
      checkin.dateTime,
      checkin.type,
      checkin.accessType,
      checkin.observation ?? ""
    ].map(escapeCsv).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `checkins-${selectedDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function CheckIn() {
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Todos os tipos");
  const [date, setDate] = useState(todayInputValue);
  const checkins = useCheckinsStore((state) => state.checkins);
  const loadOnline = useCheckinsStore((state) => state.loadOnline);

  const filtered = useMemo(() => checkins.filter((checkin) => {
    const matchesQuery = `${checkin.clientName} ${checkin.clientId}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === "Todos os tipos" || checkin.type === type;
    const matchesDate = normalizeCheckinDate(checkin.dateTime) === date;
    return matchesQuery && matchesType && matchesDate;
  }), [checkins, date, query, type]);
  const chartValues = useMemo(() => chartBuckets(filtered), [filtered]);

  const resetFilters = () => {
    setQuery("");
    setType("Todos os tipos");
    setDate(todayInputValue());
  };

  const exportCheckins = () => {
    if (!filtered.length) {
      toastInfo("Sem check-ins", "Nao ha check-ins para exportar nesta data.");
      return;
    }

    downloadCsv(filtered, date);
    toastSuccess("Check-ins exportados com sucesso");
  };

  const syncCheckins = async () => {
    await loadOnline();
    toastSuccess("Check-ins sincronizados");
  };

  return (
    <div className="checkin-grid min-w-0">
      <div className="panel min-w-0 p-4 sm:p-5 lg:p-6">
        <PageHeader
          title="Check-in"
          subtitle="Gerencie os check-ins realizados na unidade."
          actions={
            <>
              <Button variant="primary" icon={<UserCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>Novo check-in</Button>
              <DropdownMenu actions={[
                { label: "Exportar check-ins", onClick: exportCheckins },
                { label: "Relatorio do dia", onClick: () => toastSuccess("Relatorio do dia gerado") },
                { label: "Historico de acesso", onClick: () => setHistoryOpen(true) },
                { label: "Limpar filtros", onClick: resetFilters },
                { label: "Sincronizar check-ins", onClick: syncCheckins }
              ]} />
            </>
          }
        />
        <div className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)_120px]">
          <label className="relative block">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input className="h-10 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition focus:border-noogym-lime/70" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <Select value={type} onChange={(event) => setType(event.target.value)}><option>Todos os tipos</option><option>Presencial</option><option>QR Code</option><option>App</option><option>Manual</option></Select>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, BI ou codigo..." />
          <Button icon={<Filter className="h-4 w-4" />} onClick={resetFilters}>Filtros</Button>
        </div>
        <Card className="mt-4 p-3 sm:p-4">
          <Table columns={["Cliente", "Codigo", "Entrada", "Tipo", "Acesso", "Observacao", "Status"]} containerClassName="max-h-[min(58dvh,620px)]">
            {filtered.map((checkin) => (
              <tr key={checkin.id} className="table-row">
                <td className="px-4 py-3"><div className="flex min-w-52 items-center gap-3"><Avatar label={checkin.clientName.slice(0, 2)} /><span className="truncate">{checkin.clientName}</span></div></td>
                <td className="max-w-56 truncate px-4 py-3" title={checkin.clientId}>{checkin.clientId}</td>
                <td className="px-4 py-3">{checkin.dateTime}</td>
                <td className="px-4 py-3">{checkin.type}</td>
                <td className="px-4 py-3">{checkin.accessType}</td>
                <td className="max-w-56 truncate px-4 py-3 text-zinc-400" title={checkin.observation ?? "-"}>{checkin.observation ?? "-"}</td>
                <td className="px-4 py-3"><StatusDot label="Confirmado" /></td>
              </tr>
            ))}
          </Table>
          <p className="mt-4 text-sm text-zinc-400">Mostrando {filtered.length} de {checkins.length} check-ins em {formatInputDate(date)}</p>
        </Card>
      </div>
      <aside className="grid min-w-0 content-start gap-3 xl:grid-cols-2 2xl:grid-cols-1">
        <Card className="overflow-hidden p-4 sm:p-5"><h2 className="font-semibold">Resumo do dia</h2><p className="mt-4 text-3xl font-semibold">{filtered.length}</p><p className="text-sm text-noogym-lime">{formatInputDate(date)}</p><div className="mt-3 min-w-0"><LineChart values={chartValues} labels={["00h", "05h", "10h", "15h", "20h"]} heightClassName="h-24" /></div></Card>
        <Card className="p-4 sm:p-5"><h2 className="mb-4 font-semibold">Acoes rapidas</h2><div className="space-y-2"><Button className="w-full justify-start" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>Novo check-in</Button><Button className="w-full justify-start" icon={<Download className="h-4 w-4" />} onClick={exportCheckins}>Exportar check-ins</Button><Button className="w-full justify-start" icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen(true)}>Historico de acesso</Button><Button className="w-full justify-start" icon={<RefreshCw className="h-4 w-4" />} onClick={syncCheckins}>Sincronizar check-ins</Button></div></Card>
      </aside>
      <NewCheckinModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AccessHistoryModal open={historyOpen} checkins={checkins} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

function AccessHistoryModal({ open, checkins, onClose }: { open: boolean; checkins: CheckinRecord[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => checkins.filter((checkin) => `${checkin.clientName} ${checkin.clientId} ${checkin.type}`.toLowerCase().includes(query.toLowerCase())), [checkins, query]);

  return (
    <Modal open={open} title="Historico de acesso" description="Consulte os check-ins registrados por cliente, codigo ou tipo." size="lg" onClose={onClose}>
      <div className="space-y-4">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no historico..." />
        <Table columns={["Cliente", "Codigo", "Entrada", "Tipo", "Acesso", "Observacao"]} containerClassName="max-h-[58dvh]">
          {filtered.map((checkin) => (
            <tr key={checkin.id} className="table-row">
              <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar label={checkin.clientName.slice(0, 2)} /><span>{checkin.clientName}</span></div></td>
              <td className="px-4 py-3">{checkin.clientId}</td>
              <td className="px-4 py-3">{checkin.dateTime}</td>
              <td className="px-4 py-3">{checkin.type}</td>
              <td className="px-4 py-3">{checkin.accessType}</td>
              <td className="px-4 py-3 text-zinc-400">{checkin.observation ?? "-"}</td>
            </tr>
          ))}
        </Table>
        <p className="text-sm text-zinc-400">Mostrando {filtered.length} de {checkins.length} registros</p>
      </div>
    </Modal>
  );
}
