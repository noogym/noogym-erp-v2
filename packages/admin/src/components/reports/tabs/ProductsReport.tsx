import { reportsMock } from "../../../data/reportsMock";
import { ReportTabContent } from "../ReportTabContent";

export function ProductsReport({ factor, showComparison }: { factor: number; showComparison: boolean }) {
  return <ReportTabContent config={reportsMock.products} factor={factor} showComparison={showComparison} />;
}
