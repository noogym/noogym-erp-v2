import { AlertTriangle, Briefcase, CalendarCheck } from "lucide-react";
import { BarChart, DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function ExpensesTab({ openAction, records = [], data }: FinanceTabProps): FinanceTabView {
  const localExpenses = records.filter((record) => record.kind === "Despesa");

  return {
    subtitle: "Acompanhe saidas, categorias de custo e despesas pendentes.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {data.expenses.kpis.map((kpi) => <FinanceKpiCard key={kpi.title} {...kpi} icon={<Briefcase className="h-5 w-5" />} />)}
        </div>
        <div className="finance-grid-wide">
          <FinanceChartCard title="Evolucao das despesas" action={<SmallSelect label="Periodo" />}>
            <LineChart series={data.expenses.evolution} labels={data.labels} />
          </FinanceChartCard>
          <FinanceChartCard title="Despesas por dia da semana" action={<SmallSelect label="Total" />}>
            <BarChart values={data.expenses.weekday} labels={data.weekdays} color="#FF2D20" />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-3">
          <FinanceChartCard title="Despesas por categoria">
            <DonutChart items={data.expenses.byCategory} center={money(data.totals.expenses)} />
            <FinanceCardLink onClick={() => openAction({ title: "Categorias de despesas", rows: data.expenses.byCategory.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as categorias</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Despesas por status">
            <DonutChart items={data.expenses.byType} center={money(data.totals.expenses)} />
            <FinanceCardLink onClick={() => openAction({ title: "Despesas por status", rows: data.expenses.byType.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as despesas</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Detalhamento das despesas" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Detalhamento das despesas", rows: data.expenses.detailRows })}>Ver todos</button>}>
            <FinanceTable columns={["Categoria", "Despesa", "%", "Estado"]}>
              {data.expenses.detailRows.map(([category, value, percent, status]) => (
                <tr key={category} className="table-row">
                  <FinanceCell>{category}</FinanceCell>
                  <FinanceCell tone="red">{value}</FinanceCell>
                  <FinanceCell>{percent}</FinanceCell>
                  <FinanceCell>{status}</FinanceCell>
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
        </div>
        {localExpenses.length ? (
          <FinanceChartCard title="Despesas adicionadas">
            <FinanceTable columns={["Categoria", "Valor", "Data", "Status", "Observacao"]}>
              {localExpenses.map((record) => (
                <tr key={record.id} className="table-row">
                  <FinanceCell>{record.category}</FinanceCell>
                  <FinanceCell tone="red">{money(record.value)}</FinanceCell>
                  <FinanceCell>{record.date}</FinanceCell>
                  <FinanceCell>{record.status}</FinanceCell>
                  <FinanceCell>{record.note ?? "-"}</FinanceCell>
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
        ) : null}
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do periodo">
          <SummaryRow label="Despesas totais" value={money(data.totals.expenses)} tone="red" />
          <SummaryRow label="Despesas pagas" value={money(data.totals.paidExpenses)} tone="red" />
          <SummaryRow label="Despesas pendentes" value={money(data.totals.pendingExpenses)} tone="yellow" />
          <ProgressRow label="% da receita usado" value={`${percent(data.totals.expenses, data.totals.revenue)}%`} percent={Math.min(100, percent(data.totals.expenses, data.totals.revenue))} />
        </FinancePanelSection>
        <FinancePanelSection title="Maiores despesas">
          {data.expenses.biggest.map(([label, value, percent]) => <ProgressRow key={label} label={label} value={value} percent={percent} tone="red" />)}
          <button className="text-sm text-noogym-lime" onClick={() => openAction({ title: "Todas as despesas", rows: data.expenses.biggest.map(([label, value]) => [label, value]) })}>Ver todas as despesas</button>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas de despesas">
          <Alert label="Despesas pendentes" value={money(data.totals.pendingExpenses)} onClick={() => openAction({ title: "Despesas pendentes", rows: [["Total", money(data.totals.pendingExpenses)]] })} />
          <Alert label="Maior categoria" value={data.expenses.biggest[0]?.[0] ?? "-"} tone="yellow" onClick={() => openAction({ title: "Maior categoria de despesa", rows: data.expenses.biggest.map(([label, value]) => [label, value]) })} />
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}

function SmallSelect({ label }: { label: string }) {
  return <button className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200"><CalendarCheck className="mr-2 inline h-3.5 w-3.5" />{label}</button>;
}

function Alert({ label, value, onClick, tone = "red" }: { label: string; value: string; onClick: () => void; tone?: "red" | "yellow" }) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === "red" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm text-zinc-100">{label}</p>
        <p className="text-xs text-zinc-400">{value}</p>
        <button className="mt-2 text-xs text-noogym-lime" onClick={onClick}>Ver detalhes</button>
      </div>
    </div>
  );
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
