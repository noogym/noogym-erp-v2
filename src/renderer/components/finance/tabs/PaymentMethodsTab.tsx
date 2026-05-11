import { CreditCard, RotateCcw, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { financeDays, paymentMethodsMock } from "../../../data/financeMock";
import { BarChart, DonutChart, LineChart, StackedBarChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function PaymentMethodsTab({ openAction }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe os métodos de pagamento utilizados nas suas transações.",
    main: (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {paymentMethodsMock.kpis.map((kpi) => (
            <FinanceKpiCard key={kpi.title} {...kpi} icon={<CreditCard className="h-5 w-5" />} />
          ))}
        </div>
        <div className="grid grid-cols-[1.45fr_.95fr_.8fr] gap-4">
          <FinanceChartCard title="Evolução por método de pagamento" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Diário</button>}>
            <LineChart series={paymentMethodsMock.evolution} labels={financeDays} height={210} />
          </FinanceChartCard>
          <FinanceChartCard title="Distribuição por método de pagamento">
            <DonutChart items={paymentMethodsMock.distribution} center="245.000 Kz" />
          </FinanceChartCard>
          <FinanceChartCard title="Transações por método" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Total</button>}>
            <BarChart values={paymentMethodsMock.transactions} labels={["Cartão", "Dinheiro", "Transfer.", "Outros"]} height={210} />
          </FinanceChartCard>
        </div>
        <div className="grid grid-cols-[1fr_1.15fr_.9fr] gap-4">
          <FinanceChartCard title="Desempenho por método">
            <FinanceTable columns={["Método", "Receita", "%", "Trans.", "Ticket", "Variação"]}>
              {paymentMethodsMock.performanceRows.map((row) => (
                <tr key={row[0]} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 5 ? (String(cell).startsWith("-") ? "red" : "lime") : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
          <FinanceChartCard title="Receita por método ao longo do tempo" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Diário</button>}>
            <StackedBarChart series={paymentMethodsMock.evolution} labels={financeDays} />
            <FinanceCardLink onClick={() => openAction({ title: "Relatório completo por método", rows: paymentMethodsMock.performanceRows })}>Ver relatório completo</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Formas de pagamento cartão">
            <DonutChart items={paymentMethodsMock.cardForms} center="124.950 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Formas de pagamento cartão", rows: paymentMethodsMock.cardForms.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as formas</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do período">
          <SummaryRow label="Receita total" value="245.000 Kz" />
          <SummaryRow label="Transações" value="1.248" />
          <SummaryRow label="Ticket médio" value="196 Kz" />
          <SummaryRow label="Reembolso total" value="4.250 Kz" tone="red" />
          <SummaryRow label="Chargeback" value="1.250 Kz" tone="red" />
          <SummaryRow label="Taxa de chargeback" value="0,51%" tone="red" />
        </FinancePanelSection>
        <FinancePanelSection title="Método mais utilizado">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-noogym-lime/10 text-noogym-lime"><CreditCard className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Cartão</p>
              <p className="text-sm text-zinc-400">51% das transações</p>
              <p className="mt-2 text-xl font-semibold">124.950 Kz</p>
              <p className="text-xs text-noogym-lime">↑ 6pp vs período anterior</p>
            </div>
          </div>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas">
          <Alert icon={<ShieldAlert className="h-4 w-4" />} title="Aumento de chargeback" desc="1,25 Kz em chargebacks neste período." onClick={() => openAction({ title: "Detalhes de chargeback", rows: [["Chargeback", "1.250 Kz"], ["Taxa", "0,51%"]] })} />
          <Alert icon={<RotateCcw className="h-4 w-4" />} title="Reembolsos acima do esperado" desc="4.250 Kz em reembolsos neste período." onClick={() => openAction({ title: "Reembolsos", rows: [["Total", "4.250 Kz"], ["Status", "Em análise"]] })} />
          <ProgressRow label="Transferência" value="12% da receita" percent={12} tone="blue" />
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}

function Alert({ icon, title, desc, onClick }: { icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">{icon}</span>
      <div>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-zinc-400">{desc}</p>
        <button className="mt-2 text-xs text-noogym-lime" onClick={onClick}>Ver detalhes →</button>
      </div>
    </div>
  );
}
