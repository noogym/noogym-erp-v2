import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@noogym/ui";

export function FinanceChartCard({
  title,
  action,
  children,
  className = ""
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-normal">
          {title}
          <Info className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        </h2>
        {action ? <div className="max-w-full min-w-0">{action}</div> : null}
      </div>
      {children}
    </Card>
  );
}

export function FinanceCardLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-noogym-lime hover:text-white" onClick={onClick}>
      {children}
      <span aria-hidden="true">→</span>
    </button>
  );
}
