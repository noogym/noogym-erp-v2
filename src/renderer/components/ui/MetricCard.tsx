import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export function MetricCard({
  title,
  value,
  change,
  icon,
  tone = "lime"
}: {
  title: string;
  value: string;
  change?: string;
  icon: ReactNode;
  tone?: "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "green";
}) {
  const negative = change?.includes("-");
  const toneClass = {
    lime: "bg-noogym-lime/10 text-noogym-lime",
    yellow: "bg-yellow-400/10 text-yellow-300",
    purple: "bg-purple-400/10 text-purple-300",
    blue: "bg-sky-400/10 text-sky-300",
    orange: "bg-orange-400/10 text-orange-300",
    red: "bg-red-400/10 text-red-300",
    green: "bg-green-400/10 text-green-300"
  }[tone];

  return (
    <div className="soft-card p-4">
      <div className="flex items-center gap-3">
        <div className={`icon-tile ${toneClass}`}>{icon}</div>
        <div>
          <p className="text-xs text-zinc-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
      </div>
      {change ? (
        <p className={`mt-3 flex items-center gap-1 text-xs ${negative ? "text-red-400" : "text-noogym-lime"}`}>
          {negative ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
          {change}
        </p>
      ) : null}
    </div>
  );
}
