import { ArrowRight, CalendarCheck, Wallet } from "lucide-react";
import { financeDays, financeWeekdays, revenuesMock } from "../../../data/financeMock";
import { BarChart, DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function RevenuesTab({ openAction }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe o fluxo financeiro do seu negócio.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {revenuesMock.kpis.map((kpi) => (
            <FinanceKpiCard key={kpi.title} {...kpi} icon={<Wallet className="h-5 w-5" />} />
          ))}
        </div>
        <div className="finance-grid-wide">
          <FinanceChartCard title="Evolução das receitas" action={<SmallSelect label="Diário" />}>
            <LineChart series={revenuesMock.evolution} labels={financeDays} />
          </FinanceChartCard>
          <FinanceChartCard title="Receitas por dia da semana" action={<SmallSelect label="Total" />}>
            <BarChart values={revenuesMock.weekday} labels={financeWeekdays} />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-3">
          <FinanceChartCard title="Receitas por categoria">
            <DonutChart items={revenuesMock.byCategory} center="245.000 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Categorias de receita", rows: revenuesMock.byCategory.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as categorias</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Receitas por plano">
            <DonutChart items={revenuesMock.byPlan} center="142.000 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Receitas por plano", rows: revenuesMock.byPlan.map((item) => [item.label, item.amount ?? ""]) })}>Ver todos os planos</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Detalhamento das receitas" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Todas as receitas", rows: revenuesMock.detailRows })}>Ver todos</button>}>
            <FinanceTable columns={["Origem", "Receita (Kz)", "%", "Variação"]}>
              {revenuesMock.detailRows.map(([origin, value, percent, variation]) => (
                <tr key={origin} className="table-row">
                  <FinanceCell>{origin}</FinanceCell>
                  <FinanceCell>{value}</FinanceCell>
                  <FinanceCell>{percent}</FinanceCell>
                  <FinanceCell tone={variation.startsWith("-") ? "red" : "lime"}>{variation}</FinanceCell>
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do período">
          <SummaryRow label="Receita total" value="245.000 Kz" />
          <SummaryRow label="Receita recebida" value="210.450 Kz" />
          <SummaryRow label="Receita a receber" value="34.550 Kz" tone="yellow" />
        </FinancePanelSection>
        <FinancePanelSection title="Receitas por método">
          {revenuesMock.methods.map(([label, value, percent]) => (
            <ProgressRow key={label} label={String(label)} value={String(value)} percent={Number(percent)} />
          ))}
          <button className="flex items-center gap-2 text-sm text-noogym-lime" onClick={() => openAction({ title: "Métodos de receita", rows: revenuesMock.methods.map(([label, value]) => [String(label), String(value)]) })}>
            Ver todos os métodos <ArrowRight className="h-4 w-4" />
          </button>
        </FinancePanelSection>
        <FinancePanelSection title="Top clientes por receita">
          {revenuesMock.topClients.map(([name, value]) => (
            <SummaryRow key={name} label={name} value={value} />
          ))}
          <button className="flex items-center gap-2 text-sm text-noogym-lime" onClick={() => openAction({ title: "Top clientes por receita", rows: revenuesMock.topClients })}>
            Ver todos <ArrowRight className="h-4 w-4" />
          </button>
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}

function SmallSelect({ label }: { label: string }) {
  return (
    <button className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200">
      <CalendarCheck className="mr-2 inline h-3.5 w-3.5" />
      {label}
    </button>
  );
}
