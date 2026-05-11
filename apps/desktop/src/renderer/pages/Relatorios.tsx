import { CalendarDays, Download, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ExportReportModal } from "../components/reports/ExportReportModal";
import { ReportsTabs, type ReportsTabLabel } from "../components/reports/ReportsTabs";
import { CheckinsReport } from "../components/reports/tabs/CheckinsReport";
import { ClassesReport } from "../components/reports/tabs/ClassesReport";
import { ClientsReport } from "../components/reports/tabs/ClientsReport";
import { EmployeesReport } from "../components/reports/tabs/EmployeesReport";
import { FinancialReport } from "../components/reports/tabs/FinancialReport";
import { OverviewReport } from "../components/reports/tabs/OverviewReport";
import { PlansReport } from "../components/reports/tabs/PlansReport";
import { ProductsReport } from "../components/reports/tabs/ProductsReport";
import { SalesReport } from "../components/reports/tabs/SalesReport";
import { WorkoutsReport } from "../components/reports/tabs/WorkoutsReport";
import { Button } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { comparePeriods, reportPeriods, reportUnits, reportsMock } from "../data/reportsMock";

const tabSubtitles: Record<ReportsTabLabel, string> = {
  "Visão geral": "Acompanhe indicadores e desempenho da academia.",
  Financeiro: reportsMock.financial.subtitle,
  Clientes: reportsMock.clients.subtitle,
  "Check-ins": reportsMock.checkins.subtitle,
  Planos: reportsMock.plans.subtitle,
  Aulas: reportsMock.classes.subtitle,
  Treinos: reportsMock.workouts.subtitle,
  "Vendas (POS)": reportsMock.sales.subtitle,
  Produtos: reportsMock.products.subtitle,
  Funcionários: reportsMock.employees.subtitle
};

export default function Relatorios() {
  const [tab, setTab] = useState<ReportsTabLabel>("Visão geral");
  const [period, setPeriod] = useState(reportPeriods[0]);
  const [comparePeriod, setComparePeriod] = useState(comparePeriods[0]);
  const [unit, setUnit] = useState(reportUnits[0]);
  const [exportOpen, setExportOpen] = useState(false);

  const factor = useMemo(() => {
    const periodFactor = period === reportPeriods[1] ? 0.88 : period === reportPeriods[2] ? 1.12 : 1;
    const compareFactor = comparePeriod === "Sem comparação" ? 0.94 : 1;
    const unitFactor = unit === reportUnits[1] ? 0.82 : unit === reportUnits[2] ? 0.74 : 1;
    return periodFactor * compareFactor * unitFactor;
  }, [comparePeriod, period, unit]);
  const showComparison = comparePeriod !== "Sem comparação";

  return (
    <div className="panel p-6">
      <PageHeader
        title="Relatórios"
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
        <span>Período ativo: {period}</span>
        <RefreshCw className="ml-3 h-3.5 w-3.5" />
        <span>{comparePeriod === "Sem comparação" ? "Sem comparação ativa" : `Comparação: ${comparePeriod}`}</span>
      </div>
      <ReportsTabs active={tab} onChange={setTab} />
      {tab === "Visão geral" ? <OverviewReport /> : null}
      {tab === "Financeiro" ? <FinancialReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Clientes" ? <ClientsReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Check-ins" ? <CheckinsReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Planos" ? <PlansReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Aulas" ? <ClassesReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Treinos" ? <WorkoutsReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Vendas (POS)" ? <SalesReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Produtos" ? <ProductsReport factor={factor} showComparison={showComparison} /> : null}
      {tab === "Funcionários" ? <EmployeesReport factor={factor} showComparison={showComparison} /> : null}
      <ExportReportModal open={exportOpen} activeReport={tab} period={period} unit={unit} onClose={() => setExportOpen(false)} />
    </div>
  );
}
