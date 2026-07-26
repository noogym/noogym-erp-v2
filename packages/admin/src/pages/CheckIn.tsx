import { Barcode, Calendar, Camera, ClipboardCheck, Download, History, Keyboard, RefreshCw, Settings, UserCheck } from "lucide-react";
import { classifyScanValue, createKeyboardScanner } from "@noogym/scanner";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckinRecord } from "@noogym/types";
import { NewCheckinModal, QrScannerModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { DropdownMenu } from "@noogym/ui";
import { LineChart } from "../components/ui/Charts";
import { Modal } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { ListPagination, ListToolbar, paginateRows } from "../components/tables/ListControls";
import { useCheckinsStore } from "../store/checkinsStore";
import { useClientsStore } from "../store/clientsStore";
import { useAppStore } from "../store/appStore";
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

const dateTimeLabel = (date: Date) => {
  const time = new Intl.DateTimeFormat("pt-AO", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (date.toDateString() === new Date().toDateString()) return `Hoje, ${time}`;
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
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
  const [qrOpen, setQrOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [entryCode, setEntryCode] = useState("");
  const [entryStatus, setEntryStatus] = useState("Scanner USB pronto para leitura.");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Todos os tipos");
  const [date, setDate] = useState(todayInputValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const checkins = useCheckinsStore((state) => state.checkins);
  const addCheckin = useCheckinsStore((state) => state.addCheckin);
  const addQrCheckin = useCheckinsStore((state) => state.addQrCheckin);
  const validateCheckin = useCheckinsStore((state) => state.validateCheckin);
  const loadOnline = useCheckinsStore((state) => state.loadOnline);
  const clients = useClientsStore((state) => state.clients);
  const activeGymId = useAppStore((state) => state.activeGymId);

  const filtered = useMemo(() => checkins.filter((checkin) => {
    const matchesQuery = `${checkin.clientName} ${checkin.clientId}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === "Todos os tipos" || checkin.type === type;
    const matchesDate = normalizeCheckinDate(checkin.dateTime) === date;
    return matchesQuery && matchesType && matchesDate;
  }), [checkins, date, query, type]);
  const pageData = useMemo(() => paginateRows(filtered, page, pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [date, pageSize, query, type]);
  const chartValues = useMemo(() => chartBuckets(filtered), [filtered]);
  const todayRows = useMemo(() => checkins.filter((checkin) => normalizeCheckinDate(checkin.dateTime) === todayInputValue()), [checkins]);
  const manualToday = useMemo(() => todayRows.filter((checkin) => ["manual", "presencial"].includes(checkin.type.toLowerCase())).length, [todayRows]);
  const qrToday = useMemo(() => todayRows.filter((checkin) => checkin.type.toLowerCase().includes("qr") || checkin.type.toLowerCase().includes("app")).length, [todayRows]);
  const lastCheckin = todayRows[0];

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

  const processEntryCode = useCallback(async (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    setEntryStatus("A validar entrada...");
    const scanType = classifyScanValue(value);

    if (scanType === "qr" || value.startsWith("noogym://") || value.startsWith("{")) {
      try {
        const checkin = await addQrCheckin(value, { gymId: activeGymId ?? undefined });
        if (!checkin) {
          setEntryStatus("QR Code nao encontrado ou revogado.");
          toastInfo("QR Code invalido", "Nao encontrei este QR em clientes ativos desta unidade.");
          return;
        }
        setEntryCode("");
        setEntryStatus(`${checkin.clientName} liberado por QR/Scanner.`);
        toastSuccess("Entrada liberada", `${checkin.clientName} registado com sucesso.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel validar este QR Code.";
        setEntryStatus(message);
        toastInfo("Entrada bloqueada", message);
      }
      return;
    }

    const normalized = value.toLowerCase();
    const client = clients.find((item) => {
      const remoteId = (item as { remoteId?: string }).remoteId;
      return [item.id, remoteId, item.qrToken, item.phone, item.email, item.document]
        .filter(Boolean)
        .some((entry) => String(entry).toLowerCase() === normalized);
    });

    if (!client) {
      setEntryStatus("Cliente nao encontrado para este codigo.");
      toastInfo("Cliente nao encontrado", "Confirme o codigo, telefone, BI ou use a busca manual.");
      return;
    }

    const checkedAt = new Date();
    const payload = {
      gymId: activeGymId ?? client.gymId,
      clientName: client.name,
      clientId: client.id,
      type: scanType === "barcode" ? "Codigo" : "Manual",
      accessType: "Entrada",
      dateTime: dateTimeLabel(checkedAt),
      checkedAtIso: checkedAt.toISOString(),
    };
    const validation = validateCheckin(payload);
    if (!validation.allowed) {
      setEntryStatus(validation.message);
      toastInfo(validation.title, validation.message);
      return;
    }
    if (!addCheckin(payload)) {
      setEntryStatus("Check-in bloqueado pelas regras da unidade.");
      toastInfo("Check-in bloqueado", "Nao foi possivel registrar o check-in agora.");
      return;
    }

    setEntryCode("");
    setEntryStatus(`${client.name} liberado por codigo.`);
    toastSuccess("Entrada liberada", `${client.name} registado com sucesso.`);
  }, [activeGymId, addCheckin, addQrCheckin, clients, validateCheckin]);

  useEffect(() => {
    if (modalOpen || qrOpen || historyOpen) return undefined;
    const scanner = createKeyboardScanner({
      onScan: (scan) => {
        setEntryCode(scan.value);
        void processEntryCode(scan.value);
      },
      preventDefaultOnTerminator: true,
    });

    scanner.start();
    return () => scanner.stop();
  }, [historyOpen, modalOpen, processEntryCode, qrOpen]);

  return (
    <div className="checkin-grid min-w-0">
      <div className="panel min-w-0 p-4 sm:p-5 lg:p-6">
        <PageHeader
          title="Check-in"
          subtitle="Controle a entrada da unidade por scanner, QR, codigo ou check-in manual."
          actions={
            <>
              <Button variant="primary" icon={<Barcode className="h-4 w-4" />} onClick={() => setQrOpen(true)}>Scanner / QR</Button>
              <DropdownMenu actions={[
                { label: "Exportar check-ins", onClick: exportCheckins },
                { label: "Relatorio do dia", onClick: () => toastSuccess("Relatorio do dia gerado") },
                { label: "Historico de acesso", onClick: () => setHistoryOpen(true) },
                { label: "Configurar metodos de entrada", onClick: () => toastInfo("Configuracoes", "Abra Configuracoes > Check-in para ajustar os metodos de entrada.") },
                { label: "Limpar filtros", onClick: resetFilters },
                { label: "Sincronizar check-ins", onClick: syncCheckins }
              ]} />
            </>
          }
        />
        <Card className="mt-5 p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Entrada rapida</h2>
                  <p className="text-sm text-zinc-400">Leia cartao/QR no scanner USB ou digite o codigo do cliente.</p>
                </div>
                <div className="rounded-md border border-noogym-lime/30 bg-noogym-lime/10 px-3 py-2 text-sm text-noogym-lime">Scanner USB pronto</div>
              </div>
              <form
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void processEntryCode(entryCode);
                }}
              >
                <label className="relative block">
                  <Keyboard className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                  <input
                    className="h-14 w-full rounded-md border border-white/10 bg-black/30 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
                    value={entryCode}
                    onChange={(event) => setEntryCode(event.target.value)}
                    placeholder="Passe o cartao, leia o QR ou digite codigo/BI/telefone..."
                  />
                </label>
                <Button className="h-14" variant="primary" icon={<UserCheck className="h-5 w-5" />}>
                  Liberar entrada
                </Button>
              </form>
              <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">{entryStatus}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button className="justify-start" icon={<Barcode className="h-4 w-4" />} onClick={() => setQrOpen(true)}>Scanner / QR</Button>
                <Button className="justify-start" icon={<Camera className="h-4 w-4" />} onClick={() => setQrOpen(true)}>Camera QR</Button>
                <Button className="justify-start" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>Manual / avulso</Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Metric label="Entradas hoje" value={String(todayRows.length)} />
              <Metric label="QR / Scanner" value={String(qrToday)} />
              <Metric label="Manual / Codigo" value={String(manualToday)} />
              <Metric label="Ultima entrada" value={lastCheckin?.clientName ?? "Sem entrada"} />
            </div>
          </div>
        </Card>
        <div className="mt-5">
        <ListToolbar query={query} onQueryChange={setQuery} queryPlaceholder="Buscar por cliente, BI ou codigo..." pageSize={pageSize} onPageSizeChange={setPageSize} onClear={resetFilters}>
          <label className="relative block">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input className="h-10 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition focus:border-noogym-lime/70" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <Select value={type} onChange={(event) => setType(event.target.value)}><option>Todos os tipos</option><option>Presencial</option><option>QR Code</option><option>Codigo</option><option>App</option><option>Manual</option></Select>
        </ListToolbar>
        </div>
        <Card className="mt-4 p-3 sm:p-4">
          <Table columns={["Cliente", "Codigo", "Entrada", "Tipo", "Acesso", "Observacao", "Status"]} containerClassName="max-h-[min(58dvh,620px)]">
            {pageData.pageRows.map((checkin) => (
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
          <ListPagination page={pageData.page} totalPages={pageData.totalPages} totalItems={filtered.length} start={pageData.start} end={pageData.end} label={`check-ins em ${formatInputDate(date)}`} onPageChange={setPage} />
        </Card>
      </div>
      <aside className="grid min-w-0 content-start gap-3">
        <Card className="overflow-hidden p-4 sm:p-5"><h2 className="font-semibold">Resumo do dia</h2><p className="mt-4 text-3xl font-semibold">{filtered.length}</p><p className="text-sm text-noogym-lime">{formatInputDate(date)}</p><div className="mt-3 min-w-0"><LineChart values={chartValues} labels={["00h", "05h", "10h", "15h", "20h"]} heightClassName="h-24" /></div></Card>
        <Card className="p-4 sm:p-5"><h2 className="mb-4 font-semibold">Acoes rapidas</h2><div className="space-y-2"><Button className="w-full justify-start" icon={<Barcode className="h-4 w-4" />} onClick={() => setQrOpen(true)}>Scanner / QR</Button><Button className="w-full justify-start" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>Manual / avulso</Button><Button className="w-full justify-start" icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen(true)}>Historico de acesso</Button><Button className="w-full justify-start" icon={<Download className="h-4 w-4" />} onClick={exportCheckins}>Exportar check-ins</Button><Button className="w-full justify-start" icon={<RefreshCw className="h-4 w-4" />} onClick={syncCheckins}>Sincronizar check-ins</Button><Button className="w-full justify-start" icon={<Settings className="h-4 w-4" />} onClick={() => toastInfo("Configuracoes", "Abra Configuracoes > Check-in para ajustar os metodos de entrada.")}>Configurar metodos</Button></div></Card>
      </aside>
      <NewCheckinModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <QrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} />
      <AccessHistoryModal open={historyOpen} checkins={checkins} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-noogym-lime" title={value}>{value}</p>
    </div>
  );
}

function AccessHistoryModal({ open, checkins, onClose }: { open: boolean; checkins: CheckinRecord[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filtered = useMemo(() => checkins.filter((checkin) => `${checkin.clientName} ${checkin.clientId} ${checkin.type}`.toLowerCase().includes(query.toLowerCase())), [checkins, query]);
  const pageData = useMemo(() => paginateRows(filtered, page, pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [pageSize, query]);

  return (
    <Modal open={open} title="Historico de acesso" description="Consulte os check-ins registrados por cliente, codigo ou tipo." size="lg" onClose={onClose}>
      <div className="space-y-4">
        <ListToolbar query={query} onQueryChange={setQuery} queryPlaceholder="Buscar no historico..." pageSize={pageSize} onPageSizeChange={setPageSize} onClear={() => setQuery("")} />
        <Table columns={["Cliente", "Codigo", "Entrada", "Tipo", "Acesso", "Observacao"]} containerClassName="max-h-[58dvh]">
          {pageData.pageRows.map((checkin) => (
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
        <ListPagination page={pageData.page} totalPages={pageData.totalPages} totalItems={filtered.length} start={pageData.start} end={pageData.end} label="registros" onPageChange={setPage} />
      </div>
    </Modal>
  );
}
