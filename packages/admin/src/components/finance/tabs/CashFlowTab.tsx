import { Activity, AlertTriangle } from "lucide-react";
import { DonutChart, GroupedBarChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function CashFlowTab({ openAction, data }: FinanceTabProps): FinanceTabView {
  const net = data.cashFlow.weekdayEntries.map((value, index) => value - data.cashFlow.weekdayExits[index]);

  return {
    subtitle: "Acompanhe entradas, saidas e saldo acumulado.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {data.cashFlow.kpis.map((kpi) => <FinanceKpiCard key={kpi.title} {...kpi} icon={<Activity className="h-5 w-5" />} />)}
        </div>
        <div className="finance-grid-wide">
          <FinanceChartCard title="Evolucao do fluxo de caixa" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Periodo</button>}>
            <LineChart series={data.cashFlow.evolution} labels={data.labels} />
          </FinanceChartCard>
          <FinanceChartCard title="Entradas e saidas por dia da semana" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Total</button>}>
            <GroupedBarChart
              labels={data.weekdays}
              groups={[
                { name: "Entradas", values: data.cashFlow.weekdayEntries, color: "#B6FF00" },
                { name: "Saidas", values: data.cashFlow.weekdayExits, color: "#FF2D20" },
                { name: "Fluxo liquido", values: net, color: "#2F91FF" }
              ]}
            />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-table">
          <FinanceChartCard title="Fluxo de caixa diario">
            <FinanceTable columns={["Data", "Entradas", "Saidas", "Fluxo liquido", "Saldo acumulado"]}>
              {data.cashFlow.dailyRows.map((row) => (
                <tr key={row[0]} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 3 ? (String(cell).startsWith("-") ? "red" : "lime") : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
            <FinanceCardLink onClick={() => openAction({ title: "Fluxo de caixa completo", rows: data.cashFlow.dailyRows })}>Ver fluxo de caixa completo</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Entradas por origem">
            <DonutChart items={data.cashFlow.origins} center={money(data.totals.received)} />
            <FinanceCardLink onClick={() => openAction({ title: "Entradas por origem", rows: data.cashFlow.origins.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as origens</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Saidas por categoria">
            <DonutChart items={data.cashFlow.exits} center={money(data.totals.expenses)} />
            <FinanceCardLink onClick={() => openAction({ title: "Saidas por categoria", rows: data.cashFlow.exits.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as categorias</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do periodo">
          <SummaryRow label="Saldo inicial" value={money(data.cashFlow.initialBalance)} />
          <SummaryRow label="Entradas totais" value={money(data.totals.received)} tone="lime" />
          <SummaryRow label="Saidas totais" value={money(data.totals.paidExpenses)} tone="red" />
          <SummaryRow label="Saldo atual" value={money(data.cashFlow.currentBalance)} tone="lime" />
          <SummaryRow label="Fluxo liquido" value={money(data.totals.net)} tone={data.totals.net >= 0 ? "lime" : "red"} />
        </FinancePanelSection>
        <FinancePanelSection title="Projecao de caixa">
          <SummaryRow label="Proximos 7 dias" value={money(data.cashFlow.currentBalance + data.totals.receivable - data.totals.pendingExpenses)} />
          <SummaryRow label="A receber" value={money(data.totals.receivable)} tone="yellow" />
          <SummaryRow label="A pagar" value={money(data.totals.pendingExpenses)} tone="red" />
          <button className="text-sm text-noogym-lime" onClick={() => openAction({ title: "Projecao completa de caixa", rows: [["Saldo atual", money(data.cashFlow.currentBalance)], ["A receber", money(data.totals.receivable)], ["A pagar", money(data.totals.pendingExpenses)]] })}>Ver projecao completa</button>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas de fluxo">
          <Alert title={data.totals.net < 0 ? "Fluxo negativo no periodo" : "Fluxo positivo no periodo"} tone={data.totals.net < 0 ? "red" : "yellow"} onClick={() => openAction({ title: "Detalhes do fluxo", rows: [["Fluxo liquido", money(data.totals.net)]] })} />
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}

function Alert({ title, onClick, tone = "red" }: { title: string; onClick: () => void; tone?: "red" | "yellow" }) {
  return (
    <button className="flex w-full gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 text-left" onClick={onClick}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === "red" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
        <AlertTriangle className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm text-zinc-100">{title}</span>
        <span className="mt-1 block text-xs text-noogym-lime">Ver detalhes</span>
      </span>
    </button>
  );
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}
