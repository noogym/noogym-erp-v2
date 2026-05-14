import type { FinanceSeries, FinanceSlice } from "../../data/financeMock";

export function Legend({ series }: { series: Array<{ name: string; color: string }> }) {
  return (
    <div className="mb-3 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-300">
      {series.map((item) => (
        <span key={item.name} className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="truncate">{item.name}</span>
        </span>
      ))}
    </div>
  );
}

export function LineChart({ series, labels, height = 220 }: { series: FinanceSeries[]; labels?: string[]; height?: number }) {
  const max = Math.max(...series.flatMap((item) => item.values), 1);
  const min = Math.min(0, ...series.flatMap((item) => item.values));
  const range = Math.max(max - min, 1);

  return (
    <div className="min-w-0 overflow-hidden">
      <Legend series={series} />
      <svg viewBox="0 0 100 72" preserveAspectRatio="none" className="block w-full" style={{ height }}>
        {[14, 28, 42, 56].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".25" />
        ))}
        {series.map((item) => {
          const points = item.values.map((value, index) => {
            const x = (index / Math.max(item.values.length - 1, 1)) * 100;
            const y = 66 - ((value - min) / range) * 58;
            return `${x},${y}`;
          });
          return (
            <g key={item.name}>
              <polyline points={points.join(" ")} fill="none" stroke={item.color} strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
              {points.map((point) => {
                const [x, y] = point.split(",");
                return <circle key={`${item.name}-${point}`} cx={x} cy={y} r="1.15" fill={item.color} />;
              })}
            </g>
          );
        })}
      </svg>
      {labels ? (
        <div className="mt-2 grid grid-flow-col text-center text-[11px] text-zinc-500">
          {labels.map((label) => (
            <span key={label} className="min-w-0 truncate px-0.5">{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BarChart({
  values,
  labels,
  color = "#B6FF00",
  height = 190
}: {
  values: number[];
  labels: string[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex min-w-0 items-end gap-3 px-1 sm:gap-5 sm:px-2" style={{ height }}>
      {values.map((value, index) => (
        <div key={labels[index]} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="max-w-full truncate text-xs text-zinc-100">{value.toLocaleString("pt-AO")}</span>
          <div className="w-full max-w-9 rounded-t shadow-glow" style={{ height: `${Math.max(18, (value / max) * (height - 62))}px`, backgroundColor: color }} />
          <span className="max-w-full truncate text-xs text-zinc-400">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function GroupedBarChart({
  groups,
  labels,
  height = 220
}: {
  groups: Array<{ name: string; values: number[]; color: string }>;
  labels: string[];
  height?: number;
}) {
  const max = Math.max(...groups.flatMap((group) => group.values), 1);
  return (
    <div className="min-w-0 overflow-hidden">
      <Legend series={groups} />
      <div className="flex min-w-0 items-end gap-2 px-1 sm:gap-4 sm:px-2" style={{ height }}>
        {labels.map((label, index) => (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-[150px] items-end gap-1">
              {groups.map((group) => (
                <span key={group.name} className="block w-4 rounded-t" style={{ height: `${Math.max(8, (group.values[index] / max) * 145)}px`, backgroundColor: group.color }} />
              ))}
            </div>
            <span className="max-w-full truncate text-xs text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ items, center, size = "md" }: { items: FinanceSlice[]; center?: string; size?: "sm" | "md" }) {
  let offset = 25;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const box = size === "sm" ? "h-32 w-32" : "h-40 w-40";

  return (
    <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className={`relative shrink-0 ${box}`}>
        <svg viewBox="0 0 42 42" className="-rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
          {items.map((item) => {
            const dash = (item.value / total) * 100;
            const circle = (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.9"
                fill="transparent"
                stroke={item.color}
                strokeWidth="6"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={offset}
              />
            );
            offset -= dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-[92px] text-lg font-semibold leading-tight">{center ?? total.toLocaleString("pt-AO")}</span>
          <span className="text-xs text-zinc-400">Total</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2 text-zinc-200">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 text-right text-zinc-100">
              {item.value.toLocaleString("pt-AO")}%
              {item.amount ? <span className="block text-xs text-zinc-400">{item.amount}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedBarChart({ series, labels }: { series: FinanceSeries[]; labels: string[] }) {
  const totals = labels.map((_, index) => series.reduce((sum, item) => sum + item.values[index], 0));
  const max = Math.max(...totals, 1);
  return (
    <div className="min-w-0 overflow-hidden">
      <Legend series={series} />
      <div className="flex h-48 min-w-0 items-end gap-2 px-1 sm:gap-3 sm:px-2">
        {labels.map((label, index) => (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-t" style={{ height: `${Math.max(24, (totals[index] / max) * 170)}px` }}>
              {series.map((item) => (
                <span key={item.name} className="block w-full" style={{ height: `${(item.values[index] / totals[index]) * 100}%`, backgroundColor: item.color }} />
              ))}
            </div>
            <span className="max-w-full truncate text-[11px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="flex aspect-square items-center justify-center rounded-md border border-white/10 text-xs text-white"
          style={{ backgroundColor: `rgba(182,255,0,${Math.max(0.12, value / max)})` }}
        >
          {value}
        </div>
      ))}
    </div>
  );
}
