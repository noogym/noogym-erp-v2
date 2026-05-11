import { reportsMock } from "../../../data/reportsMock";
import { ReportTabContent } from "../ReportTabContent";

export function ClientsReport({ factor, showComparison }: { factor: number; showComparison: boolean }) {
  return <ReportTabContent config={reportsMock.clients} factor={factor} showComparison={showComparison} />;
}
