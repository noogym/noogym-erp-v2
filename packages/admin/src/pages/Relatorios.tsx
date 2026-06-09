import { CalendarDays, Download, RefreshCw } from "lucide-react";
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

const periodOptions = buildReportPeriods();
const compareOptions = buildComparePeriods();

export default function Relatorios() {
  const [tab, setTab] = useState<ReportsTabLabel>(reportsTabs[0]);
  const [period, setPeriod] = useState(periodOptions[0]);
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
  const overview = useMemo(() => buildLocalReportOverview(localReportsInput), [localReportsInput]);
  const configs = useMemo(() => buildLocalReportConfigs(localReportsInput), [localReportsInput]);
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
            <Select className="w-72" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periodOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Select className="w-80" value={comparePeriod} onChange={(event) => setComparePeriod(event.target.value)}>
              {compareOptions.map((option) => <option key={option} value={option}>Comparar com: {option}</option>)}
            </Select>
            <Select className="w-72" value={unit} onChange={(event) => setUnit(event.target.value)}>
              {reportUnits.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
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

function buildReportPeriods() {
  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevSameDay = new Date(today.getFullYear(), today.getMonth() - 1, Math.min(today.getDate(), 28));
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return [range(startMonth, today), range(prevStart, prevSameDay), range(startMonth, endMonth)];
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
