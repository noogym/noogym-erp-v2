import { reportsMock } from "../../../data/reportsMock";
import { ReportTabContent } from "../ReportTabContent";

export function PlansReport({ factor, showComparison }: { factor: number; showComparison: boolean }) {
  return <ReportTabContent config={reportsMock.plans} factor={factor} showComparison={showComparison} />;
}
