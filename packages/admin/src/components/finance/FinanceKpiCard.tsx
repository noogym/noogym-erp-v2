import { ArrowDownRight, ArrowUpRight, CircleDollarSign } from "lucide-react";
import type { ReactNode } from "react";
import type { FinanceTone } from "../../data/financeMock";

const toneClasses: Record<FinanceTone, string> = {
  lime: "border-noogym-lime/15 bg-noogym-lime/10 text-noogym-lime",
  red: "border-red-500/15 bg-red-500/10 text-red-400",
  yellow: "border-yellow-500/15 bg-yellow-500/10 text-yellow-400",
  blue: "border-sky-500/15 bg-sky-500/10 text-sky-400",
  purple: "border-violet-500/15 bg-violet-500/10 text-violet-400",
  cyan: "border-cyan-500/15 bg-cyan-500/10 text-cyan-400",
  green: "border-emerald-500/15 bg-emerald-500/10 text-emerald-400",
  gray: "border-zinc-500/15 bg-zinc-500/10 text-zinc-400"
};

interface FinanceKpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  tone?: FinanceTone;
  icon?: ReactNode;
}

export function FinanceKpiCard({ title, value, subtitle, change, tone = "lime", icon }: FinanceKpiCardProps) {
  const isNegative = change?.trim().startsWith("-");
  const isPositive = change?.trim().startsWith("+");

  return (
    <section className="panel min-h-[108px] min-w-0 p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
          {icon ?? <CircleDollarSign className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-zinc-300">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
          <p className="mt-2 truncate text-2xl font-semibold tracking-normal text-white">{value}</p>
        </div>
      </div>
      {change ? (
        <p className={`mt-3 flex items-center gap-1 text-xs ${isNegative ? "text-red-400" : isPositive ? "text-noogym-lime" : "text-zinc-400"}`}>
          {isNegative ? <ArrowDownRight className="h-3.5 w-3.5" /> : isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
          {change}
        </p>
      ) : null}
    </section>
  );
}
