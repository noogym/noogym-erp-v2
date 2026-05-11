import { reportsMock } from "../../../data/reportsMock";
import { ReportTabContent } from "../ReportTabContent";

export function EmployeesReport({ factor, showComparison }: { factor: number; showComparison: boolean }) {
  return <ReportTabContent config={reportsMock.employees} factor={factor} showComparison={showComparison} />;
}
