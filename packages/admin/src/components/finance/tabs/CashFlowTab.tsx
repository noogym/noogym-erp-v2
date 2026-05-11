import { Activity, AlertTriangle } from "lucide-react";
import { cashFlowMock, financeDays, financeWeekdays } from "../../../data/financeMock";
import { DonutChart, GroupedBarChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function CashFlowTab({ openAction }: FinanceTabProps): FinanceTabView {
  const net = cashFlowMock.weekdayEntries.map((value, index) => value - cashFlowMock.weekdayExits[index]);

  return {
    subtitle: "Acompanhe o fluxo de caixa do seu negócio.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {cashFlowMock.kpis.map((kpi) => (
            <FinanceKpiCard key={kpi.title} {...kpi} icon={<Activity className="h-5 w-5" />} />
          ))}
        </div>
        <div className="finance-grid-wide">
          <FinanceChartCard title="Evolução do fluxo de caixa" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Diário</button>}>
            <LineChart series={cashFlowMock.evolution} labels={financeDays} />
          </FinanceChartCard>
          <FinanceChartCard title="Entradas e saídas por dia da semana" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Total</button>}>
            <GroupedBarChart
              labels={financeWeekdays}
              groups={[
                { name: "Entradas", values: cashFlowMock.weekdayEntries, color: "#B6FF00" },
                { name: "Saídas", values: cashFlowMock.weekdayExits, color: "#FF2D20" },
                { name: "Fluxo líquido", values: net, color: "#2F91FF" }
              ]}
            />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-table">
          <FinanceChartCard title="Fluxo de caixa diário">
            <FinanceTable columns={["Data", "Entradas", "Saídas", "Fluxo líquido", "Saldo acumulado"]}>
              {cashFlowMock.dailyRows.map((row) => (
                <tr key={row[0]} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 3 ? "lime" : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
            <FinanceCardLink onClick={() => openAction({ title: "Fluxo de caixa completo", rows: cashFlowMock.dailyRows })}>Ver fluxo de caixa completo</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Entradas por origem">
            <DonutChart items={cashFlowMock.origins} center="533.050 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Entradas por origem", rows: cashFlowMock.origins.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as origens</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Saídas por categoria">
            <DonutChart items={cashFlowMock.exits} center="328.100 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Saídas por categoria", rows: cashFlowMock.exits.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as categorias</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do período">
          <SummaryRow label="Saldo inicial (01/05/2024)" value="158.950 Kz" />
          <SummaryRow label="Entradas totais" value="533.050 Kz" tone="lime" />
          <SummaryRow label="Saídas totais" value="328.100 Kz" tone="red" />
          <SummaryRow label="Saldo atual" value="203.950 Kz" tone="lime" />
          <SummaryRow label="Fluxo líquido" value="+204.950 Kz" tone="lime" />
        </FinancePanelSection>
        <FinancePanelSection title="Saldo diário">
          <SummaryRow label="Maior saldo" value="203.950 Kz" tone="lime" />
          <SummaryRow label="Menor saldo" value="88.400 Kz" tone="red" />
          <SummaryRow label="Saldo médio diário" value="144.680 Kz" />
        </FinancePanelSection>
        <FinancePanelSection title="Projeção de caixa">
          <SummaryRow label="Próximos 7 dias" value="198.300 Kz" />
          <SummaryRow label="Próximos 15 dias" value="195.450 Kz" />
          <SummaryRow label="Próximos 30 dias" value="187.600 Kz" />
          <button className="text-sm text-noogym-lime" onClick={() => openAction({ title: "Projeção completa de caixa", rows: [["7 dias", "198.300 Kz"], ["15 dias", "195.450 Kz"], ["30 dias", "187.600 Kz"]] })}>Ver projeção completa →</button>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas de fluxo">
          <Alert title="Fluxo negativo previsto para 2 dias" onClick={() => openAction({ title: "Projeção de fluxo negativo", rows: [["Dias previstos", "2"], ["Janela", "próximos 15 dias"]] })} />
          <Alert title="Saldo abaixo de 100.000 Kz previsto" tone="yellow" onClick={() => openAction({ title: "Detalhes de saldo mínimo", rows: [["Data prevista", "01/06/2024"], ["Saldo", "98.700 Kz"]] })} />
          <SummaryRow label="Ótimo! Fluxo positivo no período" value="OK" tone="blue" />
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
        <span className="mt-1 block text-xs text-noogym-lime">Ver detalhes →</span>
      </span>
    </button>
  );
}
