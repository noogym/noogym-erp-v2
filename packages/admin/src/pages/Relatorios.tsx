import { CalendarDays, Download, Filter, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ExportReportModal } from "../components/reports/ExportReportModal";
import { ReportTabContent } from "../components/reports/ReportTabContent";
import { ReportsTabs, reportsTabs, type ReportsTabLabel } from "../components/reports/ReportsTabs";
import { OverviewReport } from "../components/reports/tabs/OverviewReport";
import { Button } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { reportUnits, reportsMock, type ReportTabKey } from "../data/reportsMock";
import { buildLocalReportConfigs, buildLocalReportOverview } from "../lib/localReports";
import { useCheckinsStore } from "../store/checkinsStore";
import { useClassesStore } from "../store/classesStore";
import { useClientsStore } from "../store/clientsStore";
import { useEmployeesStore } from "../store/employeesStore";
import { useFinanceStore } from "../store/financeStore";
import { usePlansStore } from "../store/plansStore";
import { useProductsStore } from "../store/productsStore";
import { useReportsStore } from "../store/reportsStore";
import { useSalesStore } from "../store/salesStore";
import { toastInfo, toastSuccess } from "../store/toastStore";
import { useWorkoutsStore } from "../store/workoutsStore";

const tabSubtitles: Record<ReportsTabLabel, string> = {
  [reportsTabs[0]]: "Acompanhe indicadores e desempenho da academia.",
  [reportsTabs[1]]: reportsMock.financial.subtitle,
  [reportsTabs[2]]: reportsMock.clients.subtitle,
  [reportsTabs[3]]: reportsMock.checkins.subtitle,
  [reportsTabs[4]]: reportsMock.plans.subtitle,
  [reportsTabs[5]]: reportsMock.classes.subtitle,
  [reportsTabs[6]]: reportsMock.workouts.subtitle,
  [reportsTabs[7]]: reportsMock.sales.subtitle,
  [reportsTabs[8]]: reportsMock.products.subtitle,
  [reportsTabs[9]]: reportsMock.employees.subtitle
};

const reportKeyByTab: Partial<Record<ReportsTabLabel, ReportTabKey>> = {
  [reportsTabs[1]]: "financial",
  [reportsTabs[2]]: "clients",
  [reportsTabs[3]]: "checkins",
  [reportsTabs[4]]: "plans",
  [reportsTabs[5]]: "classes",
  [reportsTabs[6]]: "workouts",
  [reportsTabs[7]]: "sales",
  [reportsTabs[8]]: "products",
  [reportsTabs[9]]: "employees"
};

const compareOptions = buildComparePeriods();
type ReportsInput = Parameters<typeof buildLocalReportOverview>[0];

export default function Relatorios() {
  const [tab, setTab] = useState<ReportsTabLabel>(reportsTabs[0]);
  const defaultRange = useMemo(() => defaultReportRange(), []);
  const [draftStartDate, setDraftStartDate] = useState(defaultRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultRange.endDate);
  const [appliedStartDate, setAppliedStartDate] = useState(defaultRange.startDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultRange.endDate);
  const [comparePeriod, setComparePeriod] = useState(compareOptions[0]);
  const [unit, setUnit] = useState(reportUnits[0]);
  const [exportOpen, setExportOpen] = useState(false);
  const isLoading = useReportsStore((state) => state.isLoading);
  const loadAllReports = useReportsStore((state) => state.loadAllReports);
  const clients = useClientsStore((state) => state.clients);
  const loadClients = useClientsStore((state) => state.loadOnline);
  const checkins = useCheckinsStore((state) => state.checkins);
  const loadCheckins = useCheckinsStore((state) => state.loadOnline);
  const plans = usePlansStore((state) => state.plans);
  const loadPlans = usePlansStore((state) => state.loadOnline);
  const classes = useClassesStore((state) => state.classes);
  const loadClasses = useClassesStore((state) => state.loadOnline);
  const workouts = useWorkoutsStore((state) => state.workouts);
  const loadWorkouts = useWorkoutsStore((state) => state.loadOnline);
  const sales = useSalesStore((state) => state.sales);
  const loadSales = useSalesStore((state) => state.loadOnline);
  const products = useProductsStore((state) => state.products);
  const loadProducts = useProductsStore((state) => state.loadOnline);
  const employees = useEmployeesStore((state) => state.employees);
  const loadEmployees = useEmployeesStore((state) => state.loadOnline);
  const finance = useFinanceStore((state) => state.records);
  const loadFinance = useFinanceStore((state) => state.loadOnline);

  const period = useMemo(() => rangeFromInput(appliedStartDate, appliedEndDate), [appliedEndDate, appliedStartDate]);
  const activeRange = useMemo(() => dateRangeFromInput(appliedStartDate, appliedEndDate), [appliedEndDate, appliedStartDate]);
  const localReportsInput = useMemo(() => ({
    clients,
    checkins,
    plans,
    classes,
    workouts,
    sales,
    products,
    employees,
    finance
  }), [checkins, classes, clients, employees, finance, plans, products, sales, workouts]);
  const filteredReportsInput = useMemo(() => filterReportsByDate(localReportsInput, activeRange), [activeRange, localReportsInput]);
  const overview = useMemo(() => buildLocalReportOverview(filteredReportsInput), [filteredReportsInput]);
  const configs = useMemo(() => buildLocalReportConfigs(filteredReportsInput), [filteredReportsInput]);
  const showComparison = comparePeriod !== compareOptions[1];
  const activeKey = reportKeyByTab[tab];
  const activeConfig = activeKey ? configs[activeKey] : null;

  const syncReports = async (notify = true) => {
    const results = await Promise.allSettled([
      loadAllReports(),
      loadClients(),
      loadCheckins(),
      loadPlans(),
      loadClasses(),
      loadWorkouts(),
      loadSales(),
      loadProducts(),
      loadEmployees(),
      loadFinance()
    ]);
    const failed = results.filter((result) => result.status === "rejected").length;
    if (notify) {
      if (failed) toastInfo("Relatorios locais", `${failed} fontes nao sincronizaram agora; a tela continua com os dados locais.`);
      else toastSuccess("Relatorios atualizados", "Dados sincronizados e indicadores recalculados.");
    }
  };

  const applyDateRange = () => {
    const nextRange = dateRangeFromInput(draftStartDate, draftEndDate);
    if (!nextRange.start || !nextRange.end || nextRange.start > nextRange.end) {
      toastInfo("Periodo invalido", "Confirme as datas de inicio e fim do relatorio.");
      return;
    }

    setAppliedStartDate(draftStartDate);
    setAppliedEndDate(draftEndDate);
    toastSuccess("Periodo aplicado", rangeFromInput(draftStartDate, draftEndDate));
  };

  const applyPreset = (preset: ReportPreset) => {
    const nextRange = presetRange(preset);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
  };

  useEffect(() => {
    syncReports(false).catch((error) => {
      toastInfo("Relatorios locais", error instanceof Error ? error.message : "Nao foi possivel carregar relatorios da API.");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="panel p-6">
      <PageHeader
        title="Relatorios"
        subtitle={tabSubtitles[tab]}
        actions={
          <>
            <div className="flex min-w-0 flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-white/[0.025] p-2">
              <ReportDateField label="Inicio" value={draftStartDate} onChange={setDraftStartDate} />
              <ReportDateField label="Fim" value={draftEndDate} onChange={setDraftEndDate} />
              <label className="grid gap-1 text-[11px] text-zinc-400">
                Comparar
                <Select className="h-9 w-48 text-xs" value={comparePeriod} onChange={(event) => setComparePeriod(event.target.value)}>
                  {compareOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </label>
              <label className="grid gap-1 text-[11px] text-zinc-400">
                Unidade
                <Select className="h-9 w-48 text-xs" value={unit} onChange={(event) => setUnit(event.target.value)}>
                  {reportUnits.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </label>
              <div className="flex gap-1">
                <ReportPresetButton onClick={() => applyPreset("today")}>Hoje</ReportPresetButton>
                <ReportPresetButton onClick={() => applyPreset("week")}>7 dias</ReportPresetButton>
                <ReportPresetButton onClick={() => applyPreset("month")}>Mes</ReportPresetButton>
                <ReportPresetButton onClick={() => applyPreset("year")}>Ano</ReportPresetButton>
              </div>
              <Button className="h-9 shrink-0 px-3" icon={<Filter className="h-4 w-4" />} onClick={applyDateRange}>
                Aplicar
              </Button>
            </div>
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => syncReports()}>
              Sincronizar
            </Button>
            <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
              Exportar
            </Button>
          </>
        }
      />
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Periodo ativo: {period}</span>
        <RefreshCw className="ml-3 h-3.5 w-3.5" />
        <span>{comparePeriod === compareOptions[1] ? "Sem comparacao ativa" : `Comparacao: ${comparePeriod}`}</span>
        <span className="ml-3">Unidade: {unit}</span>
        {isLoading ? <span className="ml-3 text-noogym-lime">Sincronizando API...</span> : null}
      </div>
      <ReportsTabs active={tab} onChange={setTab} />
      {tab === reportsTabs[0] ? <OverviewReport overview={overview} /> : null}
      {activeConfig ? <ReportTabContent config={activeConfig} factor={1} showComparison={showComparison} /> : null}
      <ExportReportModal
        open={exportOpen}
        activeReport={tab}
        period={period}
        unit={unit}
        overview={overview}
        config={activeConfig}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}

type ReportPreset = "today" | "week" | "month" | "year";

function ReportDateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[11px] text-zinc-400">
      {label}
      <span className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          className="h-9 w-36 rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-xs text-zinc-100 outline-none focus:border-noogym-lime/70"
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function ReportPresetButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className="h-9 rounded-md border border-white/10 px-2 text-xs text-zinc-200 hover:border-noogym-lime/70 hover:text-noogym-lime" onClick={onClick}>
      {children}
    </button>
  );
}

function defaultReportRange() {
  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: toDateInputValue(startMonth), endDate: toDateInputValue(today) };
}

function presetRange(preset: ReportPreset) {
  const today = new Date();
  if (preset === "today") return { startDate: toDateInputValue(today), endDate: toDateInputValue(today) };
  if (preset === "week") return { startDate: toDateInputValue(addDays(today, -6)), endDate: toDateInputValue(today) };
  if (preset === "year") return { startDate: toDateInputValue(new Date(today.getFullYear(), 0, 1)), endDate: toDateInputValue(today) };
  return { startDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toDateInputValue(today) };
}

function buildComparePeriods() {
  const today = new Date();
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const twoMonthsStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const twoMonthsEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  return [range(prevStart, prevEnd), "Sem comparacao", range(twoMonthsStart, twoMonthsEnd)];
}

function range(start: Date, end: Date) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function rangeFromInput(startDate: string, endDate: string) {
  const rangeDates = dateRangeFromInput(startDate, endDate);
  if (!rangeDates.start || !rangeDates.end) return "Periodo personalizado";
  return range(rangeDates.start, rangeDates.end);
}

function dateRangeFromInput(startDate: string, endDate: string) {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  return { start, end };
}

function filterReportsByDate(input: ReportsInput, rangeDates: { start: Date | null; end: Date | null }): ReportsInput {
  if (!rangeDates.start || !rangeDates.end) return input;
  const inRange = (date: Date | null) => !date || (date >= rangeDates.start! && date <= rangeDates.end!);

  return {
    ...input,
    clients: input.clients.filter((client) => inRange(readRecordDate(client.createdAt))),
    checkins: input.checkins.filter((checkin) => inRange(readRecordDate(checkin.checkedAtIso ?? checkin.dateTime))),
    classes: input.classes.filter((lesson) => inRange(readRecordDate(lesson.startAtIso ?? lesson.time))),
    workouts: input.workouts.filter((workout) => inRange(readRecordDate(workout.updated))),
    sales: input.sales.filter((sale) => inRange(readRecordDate(sale.soldAtIso ?? sale.dateTime))),
    employees: input.employees.filter((employee) => inRange(readRecordDate(employee.hireDate))),
    finance: input.finance.filter((record) => inRange(readRecordDate(record.paidAt ?? record.dueDate ?? record.date)))
  };
}

function readRecordDate(value?: string) {
  if (!value) return null;
  if (value.startsWith("Hoje")) return new Date();
  if (value.startsWith("Ontem")) return addDays(new Date(), -1);
  if (value === "Agora") return new Date();

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function parseInputDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
