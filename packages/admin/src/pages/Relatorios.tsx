import { CalendarDays, Download, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ExportReportModal } from "../components/reports/ExportReportModal";
import { ReportTabContent } from "../components/reports/ReportTabContent";
import { ReportsTabs, reportsTabs, type ReportsTabLabel } from "../components/reports/ReportsTabs";
import { OverviewReport } from "../components/reports/tabs/OverviewReport";
import { Button } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { comparePeriods, reportPeriods, reportUnits, reportsMock, type ReportTabKey } from "../data/reportsMock";
import { useReportsStore } from "../store/reportsStore";
import { toastInfo } from "../store/toastStore";

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

export default function Relatorios() {
  const [tab, setTab] = useState<ReportsTabLabel>(reportsTabs[0]);
  const [period, setPeriod] = useState(reportPeriods[0]);
  const [comparePeriod, setComparePeriod] = useState(comparePeriods[0]);
  const [unit, setUnit] = useState(reportUnits[0]);
  const [exportOpen, setExportOpen] = useState(false);
  const overview = useReportsStore((state) => state.overview);
  const configs = useReportsStore((state) => state.configs);
  const isLoading = useReportsStore((state) => state.isLoading);
  const loadAllReports = useReportsStore((state) => state.loadAllReports);

  const factor = useMemo(() => {
    const periodFactor = period === reportPeriods[1] ? 0.88 : period === reportPeriods[2] ? 1.12 : 1;
    const compareFactor = comparePeriod === comparePeriods[1] ? 0.94 : 1;
    const unitFactor = unit === reportUnits[1] ? 0.82 : unit === reportUnits[2] ? 0.74 : 1;
    return periodFactor * compareFactor * unitFactor;
  }, [comparePeriod, period, unit]);
  const showComparison = comparePeriod !== comparePeriods[1];
  const activeKey = reportKeyByTab[tab];
  const activeConfig = activeKey ? configs[activeKey] ?? reportsMock[activeKey] : null;

  useEffect(() => {
    loadAllReports().catch((error) => {
      toastInfo("Relatorios locais", error instanceof Error ? error.message : "Nao foi possivel carregar relatorios da API.");
    });
  }, [loadAllReports]);

  return (
    <div className="panel p-6">
      <PageHeader
        title="Relatorios"
        subtitle={tabSubtitles[tab]}
        actions={
          <>
            <Select className="w-72" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {reportPeriods.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Select className="w-80" value={comparePeriod} onChange={(event) => setComparePeriod(event.target.value)}>
              {comparePeriods.map((option) => <option key={option} value={option}>Comparar com: {option}</option>)}
            </Select>
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
        <span>{comparePeriod === comparePeriods[1] ? "Sem comparacao ativa" : `Comparacao: ${comparePeriod}`}</span>
        {isLoading ? <span className="ml-3 text-noogym-lime">Sincronizando API...</span> : null}
      </div>
      <ReportsTabs active={tab} onChange={setTab} />
      {tab === reportsTabs[0] ? <OverviewReport overview={overview} /> : null}
      {activeConfig ? <ReportTabContent config={activeConfig} factor={factor} showComparison={showComparison} /> : null}
      <ExportReportModal open={exportOpen} activeReport={tab} period={period} unit={unit} onClose={() => setExportOpen(false)} />
    </div>
  );
}
