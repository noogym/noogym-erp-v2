import { Phone, Send, TriangleAlert } from "lucide-react";
import { BarChart, DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function OverdueTab({ openAction, data }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe inadimplencia e clientes com pagamentos em atraso.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {data.overdue.kpis.map((kpi) => <FinanceKpiCard key={kpi.title} {...kpi} icon={<TriangleAlert className="h-5 w-5" />} />)}
        </div>
        <div className="finance-grid-table">
          <FinanceChartCard title="Evolucao da inadimplencia" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Periodo</button>}>
            <LineChart series={data.overdue.evolution} labels={data.labels} height={210} />
          </FinanceChartCard>
          <FinanceChartCard title="Inadimplencia por faixa de atraso" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Total</button>}>
            <BarChart values={data.overdue.delayRanges} labels={["1 a 15", "16 a 30", "31 a 60", "61 a 90", "+90"]} color="#FF2D20" height={210} />
          </FinanceChartCard>
          <FinanceChartCard title="Inadimplencia por origem">
            <DonutChart items={data.overdue.origin} center={money(data.overdue.total)} size="sm" />
          </FinanceChartCard>
        </div>
        <div className="finance-grid-3">
          <FinanceChartCard title="Clientes inadimplentes" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Clientes inadimplentes", rows: data.overdue.clients })}>Ver todos</button>}>
            <FinanceTable columns={["Cliente", "Plano", "Dias", "Valor", "Ultimo vencimento"]}>
              {data.overdue.clients.map((row) => (
                <tr key={row[0]} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 2 ? "red" : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
            <FinanceCardLink onClick={() => openAction({ title: "Todos os clientes inadimplentes", rows: data.overdue.clients })}>Ver todos os clientes inadimplentes</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Resumo por plano">
            <DonutChart items={data.overdue.byPlan} center={money(data.overdue.total)} />
            <FinanceCardLink onClick={() => openAction({ title: "Resumo por plano", rows: data.overdue.byPlan.map((item) => [item.label, item.amount ?? ""]) })}>Ver todos os planos</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Acoes recomendadas">
            <div className="space-y-3">
              {data.overdue.actions.map(([title, desc, count, value, label]) => (
                <div key={title} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm">
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400">{label === "Ligar" ? <Phone className="h-4 w-4" /> : <Send className="h-4 w-4" />}</span>
                    <div>
                      <p>{title}</p>
                      <p className="text-xs text-zinc-400">{desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{count}</p>
                    <p className="text-xs text-zinc-200">{value}</p>
                    <button className="mt-2 rounded border border-noogym-lime/40 px-3 py-1 text-xs text-noogym-lime" onClick={() => openAction({ title: label === "Negociar" ? "Negociar acordo" : `${label} clientes`, confirmLabel: label, rows: [["Acao", title], ["Contas", count], ["Valor", value]] })}>{label}</button>
                  </div>
                </div>
              ))}
            </div>
            <FinanceCardLink onClick={() => openAction({ title: "Historico de acoes", rows: data.overdue.actions.map(([title, desc, count, value]) => [title, `${desc} - ${count} - ${value}`]) })}>Ver historico de acoes</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do periodo">
          <SummaryRow label="Clientes em atraso" value={String(data.overdue.count)} tone="red" />
          <SummaryRow label="Total em atraso" value={money(data.overdue.total)} />
          <SummaryRow label="Pagamentos recebidos" value={money(data.totals.received)} tone="lime" />
        </FinancePanelSection>
        <FinancePanelSection title="Taxa de inadimplencia">
          <p className="text-3xl font-semibold">{data.overdue.kpis[3]?.value ?? "0%"}</p>
          <p className="text-sm text-zinc-400">Clientes em atraso / base total</p>
          <ProgressRow label="Meta interna" value="5%" percent={Math.min(100, data.overdue.count * 5)} />
        </FinancePanelSection>
        <FinancePanelSection title="Alertas">
          <button className="w-full text-left" onClick={() => openAction({ title: "Clientes acima de 30 dias", rows: data.overdue.clients.filter((row) => Number(row[2]) > 30) })}><SummaryRow label="Clientes acima de 30 dias" value="Ver clientes" tone="red" /></button>
          <button className="w-full text-left" onClick={() => openAction({ title: "Planos vencidos", rows: data.overdue.clients })}><SummaryRow label="Planos vencidos" value={String(data.overdue.count)} tone="yellow" /></button>
        </FinancePanelSection>
        <FinancePanelSection title="Projecao de recebimentos">
          <SummaryRow label="Potencial recuperavel" value={money(data.overdue.total)} />
          <SummaryRow label="Receita a receber" value={money(data.totals.receivable)} />
          <button className="text-sm text-noogym-lime" onClick={() => openAction({ title: "Projecao completa de recebimentos", rows: [["Atraso", money(data.overdue.total)], ["A receber", money(data.totals.receivable)]] })}>Ver projecao completa</button>
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}
