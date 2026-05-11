import { AlertTriangle, Briefcase, CalendarCheck } from "lucide-react";
import { expensesMock, financeDays, financeWeekdays } from "../../../data/financeMock";
import { BarChart, DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function ExpensesTab({ openAction, records = [] }: FinanceTabProps): FinanceTabView {
  const localExpenses = records.filter((record) => record.kind === "Despesa");

  return {
    subtitle: "Acompanhe o fluxo financeiro do seu negócio.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {expensesMock.kpis.map((kpi) => (
            <FinanceKpiCard key={kpi.title} {...kpi} icon={<Briefcase className="h-5 w-5" />} />
          ))}
        </div>
        <div className="finance-grid-wide">
          <FinanceChartCard title="Evolução das despesas" action={<SmallSelect label="Diário" />}>
            <LineChart series={expensesMock.evolution} labels={financeDays} />
          </FinanceChartCard>
          <FinanceChartCard title="Despesas por dia da semana" action={<SmallSelect label="Total" />}>
            <BarChart values={expensesMock.weekday} labels={financeWeekdays} color="#FF2D20" />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-3">
          <FinanceChartCard title="Despesas por categoria">
            <DonutChart items={expensesMock.byCategory} center="62.300 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Categorias de despesas", rows: expensesMock.byCategory.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as categorias</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Despesas por tipo">
            <DonutChart items={expensesMock.byType} center="62.300 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Despesas por tipo", rows: expensesMock.byType.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as despesas</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Detalhamento das despesas" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Detalhamento das despesas", rows: expensesMock.detailRows })}>Ver todos</button>}>
            <FinanceTable columns={["Categoria", "Despesa", "%", "Variação"]}>
              {expensesMock.detailRows.map(([category, value, percent, variation]) => (
                <tr key={category} className="table-row">
                  <FinanceCell>{category}</FinanceCell>
                  <FinanceCell>{value}</FinanceCell>
                  <FinanceCell>{percent}</FinanceCell>
                  <FinanceCell tone={variation.startsWith("-") ? "lime" : variation === "0%" ? "muted" : "red"}>{variation}</FinanceCell>
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
                  <FinanceCell tone="red">{record.value.toLocaleString("pt-AO")} Kz</FinanceCell>
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
        <FinancePanelSection title="Resumo do período">
          <SummaryRow label="Orçamento do período" value="80.000 Kz" />
          <SummaryRow label="Despesas totais" value="62.300 Kz" tone="red" />
          <ProgressRow label="% do orçamento utilizado" value="77,9%" percent={78} />
          <SummaryRow label="Economia" value="17.700 Kz" tone="lime" />
        </FinancePanelSection>
        <FinancePanelSection title="Maiores despesas">
          {expensesMock.biggest.map(([label, value, percent]) => (
            <ProgressRow key={label} label={String(label)} value={String(value)} percent={Number(percent)} tone="red" />
          ))}
          <button className="text-sm text-noogym-lime" onClick={() => openAction({ title: "Todas as despesas", rows: expensesMock.biggest.map(([label, value]) => [String(label), String(value)]) })}>Ver todas as despesas →</button>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas de despesas">
          <Alert label="Despesas acima do esperado" value="+9% vs período anterior" onClick={() => openAction({ title: "Comparação de despesas", rows: [["Período atual", "62.300 Kz"], ["Variação", "+9%"]] })} />
          <Alert label="Categoria Manutenção" value="acima de 80% do orçamento" tone="yellow" onClick={() => openAction({ title: "Detalhes de manutenção", rows: [["Gasto", "5.800 Kz"], ["Orçamento usado", "82%"]] })} />
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
        <button className="mt-2 text-xs text-noogym-lime" onClick={onClick}>Ver detalhes →</button>
      </div>
    </div>
  );
}
