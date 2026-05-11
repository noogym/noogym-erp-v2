import { reportsMock } from "../../../data/reportsMock";
import { ReportTabContent } from "../ReportTabContent";

export function FinancialReport({ factor, showComparison }: { factor: number; showComparison: boolean }) {
  return <ReportTabContent config={reportsMock.financial} factor={factor} showComparison={showComparison} />;
}
