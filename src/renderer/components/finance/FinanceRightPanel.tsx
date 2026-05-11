import type { ReactNode } from "react";
import { Card } from "../ui/Card";

export function FinanceRightPanel({ children }: { children: ReactNode }) {
  return <aside className="space-y-3">{children}</aside>;
}

export function FinancePanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

export function SummaryRow({
  label,
  value,
  tone = "white"
}: {
  label: string;
  value: ReactNode;
  tone?: "white" | "lime" | "red" | "yellow" | "blue" | "purple" | "muted";
}) {
  const toneClass = tone === "lime" ? "text-noogym-lime" : tone === "red" ? "text-red-400" : tone === "yellow" ? "text-yellow-400" : tone === "blue" ? "text-sky-400" : tone === "purple" ? "text-violet-400" : tone === "muted" ? "text-zinc-400" : "text-zinc-100";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-zinc-300">{label}</span>
      <span className={`text-right font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}

export function ProgressRow({ label, value, percent, tone = "lime" }: { label: string; value: string; percent: number; tone?: "lime" | "red" | "yellow" | "blue" }) {
  const bar = tone === "red" ? "bg-red-500" : tone === "yellow" ? "bg-yellow-400" : tone === "blue" ? "bg-sky-400" : "bg-noogym-lime";
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <span className="text-zinc-200">{label}</span>
        <span className="text-zinc-100">{value}</span>
      </div>
      <span className="block h-1.5 rounded-full bg-white/10">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }} />
      </span>
    </div>
  );
}
