import type { ReportConfig } from "../../data/reportsMock";
import { ReportChartCard } from "./ReportChartCard";
import { ReportKpiCard } from "./ReportKpiCard";

export function ReportTabContent({ config, factor, showComparison = true }: { config: ReportConfig; factor: number; showComparison?: boolean }) {
  return (
    <>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
        {config.kpis.map((kpi) => <ReportKpiCard key={kpi.title} kpi={kpi} />)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {config.sections.map((section) => <ReportChartCard key={section.title} section={section} factor={factor} showComparison={showComparison} />)}
      </div>
    </>
  );
}
