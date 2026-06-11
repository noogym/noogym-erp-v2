import { Fragment, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Modal } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import type { DonutItem, ReportSection, ReportSeries } from "../../data/reportsMock";
import { ReportTable } from "./ReportTable";

export function ReportChartCard({ section, factor = 1, showComparison = true }: { section: ReportSection; factor?: number; showComparison?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const span = section.span === "wide" ? "xl:col-span-2" : "";

  return (
    <>
      <Card className={`min-h-[260px] overflow-hidden p-4 ${span}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate font-semibold">{section.title}</h2>
          {"control" in section && section.control ? (
            <button className="rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-zinc-200">{section.control}</button>
          ) : null}
          {section.type === "table" && section.table.actionLabel ? (
            <button className="ml-auto inline-flex items-center gap-2 text-xs text-noogym-lime hover:text-white" onClick={() => setDetailsOpen(true)}>
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <SectionBody section={section} factor={factor} showComparison={showComparison} />
      </Card>
      {section.type === "table" ? (
        <Modal open={detailsOpen} title={section.title} size="lg" onClose={() => setDetailsOpen(false)} footer={<Button variant="primary" onClick={() => setDetailsOpen(false)}>Fechar</Button>}>
          <ReportTable table={section.table} />
        </Modal>
      ) : null}
    </>
  );
}

function SectionBody({ section, factor, showComparison }: { section: ReportSection; factor: number; showComparison: boolean }) {
  switch (section.type) {
    case "line":
      return <LineVisual series={section.series} factor={factor} showComparison={showComparison} />;
    case "bar":
      return <BarVisual series={section.series} factor={factor} />;
    case "horizontal":
      return <HorizontalBars labels={section.labels} values={section.values.map((value) => value * factor)} suffix={section.suffix} />;
    case "donut":
      return <DonutVisual center={section.center} items={section.items} />;
    case "heatmap":
      return <Heatmap section={section} factor={factor} />;
    case "summary":
      return <Summary items={section.items} />;
    case "funnel":
      return <Funnel section={section} />;
    case "table":
      return <ReportTable table={section.table} dense />;
  }
}

function LineVisual({ series, factor, showComparison }: { series: ReportSeries; factor: number; showComparison: boolean }) {
  const values = series.values.map((value) => value * factor);
  const compare = showComparison ? series.compare?.map((value) => value * Math.max(0.72, factor - 0.08)) : undefined;
  const max = Math.max(...values, ...(compare ?? []), 1);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${92 - (value / max) * 78}`);
  const comparePoints = compare?.map((value, index) => `${(index / Math.max(compare.length - 1, 1)) * 100},${92 - (value / max) * 78}`);
  const area = `0,96 ${points.join(" ")} 100,96`;

  return (
    <div className="min-w-0 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block h-56 w-full">
        {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".35" />)}
        <polygon points={area} fill="rgba(182,255,0,.15)" />
        {comparePoints ? <polyline points={comparePoints.join(" ")} fill="none" stroke="rgba(160,170,170,.55)" strokeDasharray="4 4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
        <polyline points={points.join(" ")} fill="none" stroke="#B6FF00" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        {points.map((point) => {
          const [x, y] = point.split(",");
          return <circle key={point} cx={x} cy={y} r="1.35" fill="#B6FF00" />;
        })}
      </svg>
      <div className="mt-2 grid grid-flow-col text-center text-xs text-zinc-400">
        {series.labels.map((label, index) => <span key={`${label}-${index}`} className="min-w-0 truncate px-0.5">{label}</span>)}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-8 bg-noogym-lime" />Periodo ativo</span>
        {series.compare ? <span className="inline-flex items-center gap-2"><span className="h-0 w-8 border-t border-dashed border-zinc-500" />Comparacao</span> : null}
      </div>
    </div>
  );
}

function BarVisual({ series, factor }: { series: ReportSeries; factor: number }) {
  const values = series.values.map((value) => Math.round(value * factor));
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-56 min-w-0 items-end gap-2 px-1 pt-3 sm:gap-4 sm:px-3">
      {values.map((value, index) => (
        <div key={`${series.labels[index] ?? "bar"}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="text-xs text-zinc-100">{value}</span>
          <div className="w-full max-w-9 rounded-t bg-gradient-to-t from-[#6f9700] to-noogym-lime shadow-glow" style={{ height: `${Math.max(18, (value / max) * 150)}px` }} />
          <span className="max-w-full truncate text-xs text-zinc-400">{series.labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutVisual({ center, items }: { center: string; items: DonutItem[] }) {
  let offset = 25;
  const chartItems = items.map((item) => ({
    ...item,
    value: Number.isFinite(item.value) && item.value > 0 ? item.value : 0
  }));
  const total = chartItems.reduce((sum, item) => sum + item.value, 0);
  const hasSlices = total > 0;
  return (
    <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40">
        <svg viewBox="0 0 42 42" className="-rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
          {hasSlices ? chartItems.map((item, index) => {
            const dash = (item.value / total) * 100;
            const circle = <circle key={`${item.label}-${index}`} cx="21" cy="21" r="15.9" fill="transparent" stroke={item.color} strokeWidth="6" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={offset} />;
            offset -= dash;
            return circle;
          }) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-28 text-xl font-semibold leading-tight">{center}</span>
          <span className="text-xs text-zinc-400">Total</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3 text-sm">
        {chartItems.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <span className="flex min-w-0 items-center gap-2 text-zinc-200">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="text-right text-zinc-100">{item.detail ? `${item.detail} ` : ""}{item.value.toLocaleString("pt-AO")}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ section, factor }: { section: Extract<ReportSection, { type: "heatmap" }>; factor: number }) {
  return (
    <div>
      <div className="grid gap-1 text-xs" style={{ gridTemplateColumns: `42px repeat(${section.columns.length}, minmax(0, 1fr))` }}>
        <span />
        {section.columns.map((column, index) => <span key={`${column}-${index}`} className="text-center text-zinc-300">{column}</span>)}
        {section.rows.map((row, rowIndex) => (
          <Fragment key={`${row}-${rowIndex}`}>
            <span key={`${row}-label`} className="flex items-center text-zinc-300">{row}</span>
            {section.columns.map((column, columnIndex) => {
              const value = Math.min(100, Math.round(section.values[rowIndex][columnIndex] * factor));
              const color = value > 78 ? `rgb(${180 + value / 2}, ${120 - value / 5}, 24)` : value > 52 ? `rgb(${170 + value / 3}, ${210 - value / 3}, 18)` : `rgb(${30 + value}, ${80 + value * 1.2}, 28)`;
              return <span key={`${row}-${rowIndex}-${column}-${columnIndex}`} className="h-6 rounded-sm border border-black/30" style={{ backgroundColor: color }} />;
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 text-xs text-zinc-400">
        <span>{section.lowLabel}</span>
        <span className="h-2 w-48 rounded-full bg-gradient-to-r from-green-800 via-yellow-400 to-red-500" />
        <span>{section.highLabel}</span>
      </div>
    </div>
  );
}

function HorizontalBars({ labels, values, suffix = "" }: { labels: string[]; values: number[]; suffix?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-4 py-3">
      {labels.map((label, index) => (
        <div key={`${label}-${index}`} className="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)_52px] items-center gap-3 text-sm">
          <span className="truncate text-zinc-300">{label}</span>
          <span className="h-7 rounded bg-white/[0.035]"><span className="block h-full rounded bg-gradient-to-r from-[#6f9700] to-noogym-lime" style={{ width: `${(values[index] / max) * 100}%` }} /></span>
          <span className="text-right text-zinc-100">{Math.round(values[index])}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

function Summary({ items }: { items: Extract<ReportSection, { type: "summary" }>["items"] }) {
  const tone = { lime: "text-noogym-lime", yellow: "text-yellow-300", purple: "text-purple-300", blue: "text-sky-300", orange: "text-orange-300", red: "text-red-300", green: "text-green-300" };
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.025] px-4 py-3 text-sm">
          <span className="text-zinc-300">{item.label}</span>
          <span className={`text-right font-medium ${item.tone ? tone[item.tone] : "text-zinc-100"}`}>{item.value}{item.trend ? <span className="ml-3 text-xs text-noogym-lime">{item.trend}</span> : null}</span>
        </div>
      ))}
    </div>
  );
}

function Funnel({ section }: { section: Extract<ReportSection, { type: "funnel" }> }) {
  return (
    <div className="space-y-3">
      {section.items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-4 text-sm">
          <span className="rounded bg-white/[0.06] px-3 py-2 text-zinc-200" style={{ width: `${item.percent}%` }}>{item.label}</span>
          <span className="text-right text-zinc-100">{item.value}</span>
        </div>
      ))}
      {section.footer ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm text-zinc-300">{section.footer.label}</p>
          <p className="mt-1 text-2xl font-semibold text-noogym-lime">{section.footer.value} <span className="text-xs font-normal">{section.footer.trend}</span></p>
        </div>
      ) : null}
    </div>
  );
}
