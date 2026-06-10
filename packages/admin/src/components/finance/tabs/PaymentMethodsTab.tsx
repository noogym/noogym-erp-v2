import { CreditCard, RotateCcw, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { BarChart, DonutChart, LineChart, StackedBarChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function PaymentMethodsTab({ openAction, data }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe metodos de pagamento utilizados nas vendas POS.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {data.payments.kpis.map((kpi) => <FinanceKpiCard key={kpi.title} {...kpi} icon={<CreditCard className="h-5 w-5" />} />)}
        </div>
        <div className="finance-grid-table">
          <FinanceChartCard title="Evolucao por metodo de pagamento" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Periodo</button>}>
            <LineChart series={data.payments.evolution} labels={data.labels} height={210} />
          </FinanceChartCard>
          <FinanceChartCard title="Distribuicao por metodo de pagamento">
            <DonutChart items={data.payments.distribution} center={money(data.totals.posRevenue)} />
          </FinanceChartCard>
          <FinanceChartCard title="Transacoes por metodo" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Total</button>}>
            <BarChart values={data.payments.transactions.length ? data.payments.transactions : [0]} labels={data.payments.performanceRows.length ? data.payments.performanceRows.map((row) => row[0]) : ["Sem dados"]} height={210} />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-3">
          <FinanceChartCard title="Desempenho por metodo">
            <FinanceTable columns={["Metodo", "Receita", "%", "Trans.", "Ticket", "Estado"]}>
              {data.payments.performanceRows.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 1 ? "lime" : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
          <FinanceChartCard title="Receita por metodo ao longo do tempo" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Periodo</button>}>
            <StackedBarChart series={data.payments.evolution} labels={data.labels} />
            <FinanceCardLink onClick={() => openAction({ title: "Relatorio completo por metodo", rows: data.payments.performanceRows })}>Ver relatorio completo</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Formas de pagamento cartao">
            <DonutChart items={data.payments.cardForms} center={money(data.totals.posRevenue)} />
            <FinanceCardLink onClick={() => openAction({ title: "Formas de pagamento cartao", rows: data.payments.cardForms.map((item) => [item.label, item.amount ?? ""]) })}>Ver todas as formas</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do periodo">
          <SummaryRow label="Receita POS" value={money(data.totals.posRevenue)} />
          <SummaryRow label="Transacoes" value={String(data.totals.posTransactions)} />
          <SummaryRow label="Ticket medio" value={money(data.totals.posRevenue / Math.max(data.totals.posTransactions, 1))} />
        </FinancePanelSection>
        <FinancePanelSection title="Metodo mais utilizado">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-noogym-lime/10 text-noogym-lime"><CreditCard className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">{data.payments.performanceRows[0]?.[0] ?? "-"}</p>
              <p className="text-sm text-zinc-400">{data.payments.performanceRows[0]?.[2] ?? "0%"} das receitas POS</p>
              <p className="mt-2 text-xl font-semibold">{data.payments.performanceRows[0]?.[1] ?? "0 Kz"}</p>
            </div>
          </div>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas">
          <Alert icon={<ShieldAlert className="h-4 w-4" />} title="Cancelamentos e reembolsos" desc="Verifique vendas canceladas no POS." onClick={() => openAction({ title: "Cancelamentos e reembolsos", rows: [["Origem", "Vendas POS"], ["Status", "Ver listagem de vendas"]] })} />
          <Alert icon={<RotateCcw className="h-4 w-4" />} title="Conferencia de metodos" desc="Compare dinheiro, cartao e transferencia no fecho do dia." onClick={() => openAction({ title: "Conferencia de metodos", rows: data.payments.performanceRows })} />
          {data.payments.performanceRows.map((row, index) => <ProgressRow key={`${row[0]}-${index}`} label={row[0]} value={row[2]} percent={Number(String(row[2]).replace(/\D/g, "")) || 0} tone="blue" />)}
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
        <button className="mt-2 text-xs text-noogym-lime" onClick={onClick}>Ver detalhes</button>
      </div>
    </div>
  );
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}
