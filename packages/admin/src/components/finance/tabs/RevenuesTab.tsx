import { ArrowRight, CalendarCheck, Wallet } from "lucide-react";
import { BarChart, DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function RevenuesTab({ openAction, data }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe entradas, recebimentos e receitas por origem.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {data.revenues.kpis.map((kpi) => <FinanceKpiCard key={kpi.title} {...kpi} icon={<Wallet className="h-5 w-5" />} />)}
        </div>
        <div className="finance-grid-wide">
          <FinanceChartCard title="Evolucao das receitas" action={<SmallSelect label="Periodo" />}>
            <LineChart series={data.revenues.evolution} labels={data.labels} />
          </FinanceChartCard>
          <FinanceChartCard title="Receitas por dia da semana" action={<SmallSelect label="Total" />}>
            <BarChart values={data.revenues.weekday} labels={data.weekdays} />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-3">
          <FinanceChartCard title="Receitas por categoria">
            <DonutChart items={data.revenues.byCategory} center={money(data.totals.revenue)} />
            <FinanceCardLink onClick={() => openAction({ title: "Categorias de receita", rows: data.revenues.byCategory.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as categorias</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Receitas por plano">
            <DonutChart items={data.revenues.byPlan} center={money(data.totals.posRevenue)} />
            <FinanceCardLink onClick={() => openAction({ title: "Receitas por plano", rows: data.revenues.byPlan.map((item) => [item.label, item.amount ?? ""]) })}>Ver todos os planos</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Detalhamento das receitas" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Todas as receitas", rows: data.revenues.detailRows })}>Ver todos</button>}>
            <FinanceTable columns={["Origem", "Receita", "%", "Estado"]}>
              {data.revenues.detailRows.map(([origin, value, percent, status]) => (
                <tr key={origin} className="table-row">
                  <FinanceCell>{origin}</FinanceCell>
                  <FinanceCell tone="lime">{value}</FinanceCell>
                  <FinanceCell>{percent}</FinanceCell>
                  <FinanceCell>{status}</FinanceCell>
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do periodo">
          <SummaryRow label="Receita total" value={money(data.totals.revenue)} />
          <SummaryRow label="Receita recebida" value={money(data.totals.received)} tone="lime" />
          <SummaryRow label="Receita a receber" value={money(data.totals.receivable)} tone="yellow" />
        </FinancePanelSection>
        <FinancePanelSection title="Receitas por metodo">
          {data.revenues.methods.map(([label, value, percent]) => <ProgressRow key={label} label={label} value={value} percent={percent} />)}
          <button className="flex items-center gap-2 text-sm text-noogym-lime" onClick={() => openAction({ title: "Metodos de receita", rows: data.revenues.methods.map(([label, value]) => [label, value]) })}>
            Ver todos os metodos <ArrowRight className="h-4 w-4" />
          </button>
        </FinancePanelSection>
        <FinancePanelSection title="Top clientes por receita">
          {data.revenues.topClients.map(([name, value]) => <SummaryRow key={name} label={name} value={value} />)}
          <button className="flex items-center gap-2 text-sm text-noogym-lime" onClick={() => openAction({ title: "Top clientes por receita", rows: data.revenues.topClients })}>
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

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}
