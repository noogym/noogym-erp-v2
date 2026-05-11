import { Phone, Send, TriangleAlert } from "lucide-react";
import { financeDays, overdueMock } from "../../../data/financeMock";
import { BarChart, DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceKpiCard } from "../FinanceKpiCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, ProgressRow, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function OverdueTab({ openAction }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe a inadimplência e os clientes com pagamentos em atraso.",
    main: (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {overdueMock.kpis.map((kpi) => (
            <FinanceKpiCard key={kpi.title} {...kpi} icon={<TriangleAlert className="h-5 w-5" />} />
          ))}
        </div>
        <div className="grid grid-cols-[1.35fr_1.05fr_.75fr] gap-4">
          <FinanceChartCard title="Evolução da inadimplência" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Diário</button>}>
            <LineChart series={overdueMock.evolution} labels={financeDays} height={210} />
          </FinanceChartCard>
          <FinanceChartCard title="Inadimplência por faixa de atraso" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Total</button>}>
            <BarChart values={overdueMock.delayRanges} labels={["1 a 15", "16 a 30", "31 a 60", "61 a 90", "+90"]} color="#FF2D20" height={210} />
          </FinanceChartCard>
          <FinanceChartCard title="Inadimplência por origem">
            <DonutChart items={overdueMock.origin} center="89.500 Kz" size="sm" />
          </FinanceChartCard>
        </div>
        <div className="grid grid-cols-[1.25fr_.85fr_1fr] gap-4">
          <FinanceChartCard title="Clientes inadimplentes (Top 10)" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Clientes inadimplentes", rows: overdueMock.clients })}>Ver todos</button>}>
            <FinanceTable columns={["Cliente", "Plano", "Dias", "Valor", "Último vencimento"]}>
              {overdueMock.clients.map((row) => (
                <tr key={row[0]} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 2 ? "red" : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
            <FinanceCardLink onClick={() => openAction({ title: "Todos os clientes inadimplentes", rows: overdueMock.clients })}>Ver todos os clientes inadimplentes</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Resumo por plano">
            <DonutChart items={overdueMock.byPlan} center="89.500 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Resumo por plano", rows: overdueMock.byPlan.map((item) => [item.label, item.amount ?? ""]) })}>Ver todos os planos</FinanceCardLink>
          </FinanceChartCard>
          <FinanceChartCard title="Ações recomendadas">
            <div className="space-y-3">
              {overdueMock.actions.map(([title, desc, count, value, label]) => (
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
                    <button className="mt-2 rounded border border-noogym-lime/40 px-3 py-1 text-xs text-noogym-lime" onClick={() => openAction({ title: label === "Negociar" ? "Negociar acordo" : `${label} clientes`, confirmLabel: label, rows: [["Ação", title], ["Contas", count], ["Valor", value]] })}>{label}</button>
                  </div>
                </div>
              ))}
            </div>
            <FinanceCardLink onClick={() => openAction({ title: "Histórico de ações", rows: overdueMock.actions.map(([title, desc, count, value]) => [title, `${desc} - ${count} - ${value}`]) })}>Ver histórico de ações</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do período">
          <SummaryRow label="Total em atraso (início)" value="97.200 Kz" />
          <SummaryRow label="Novos em atraso" value="18.600 Kz" tone="red" />
          <SummaryRow label="Pagamentos recebidos" value="-26.300 Kz" tone="lime" />
          <SummaryRow label="Total em atraso (atual)" value="89.500 Kz" />
        </FinancePanelSection>
        <FinancePanelSection title="Taxa de inadimplência">
          <p className="text-3xl font-semibold">4,2%</p>
          <p className="text-sm text-noogym-lime">↓ 0,4pp vs período anterior</p>
          <ProgressRow label="Meta interna" value="5%" percent={42} />
        </FinancePanelSection>
        <FinancePanelSection title="Alertas">
          <button className="w-full text-left" onClick={() => openAction({ title: "Clientes acima de 30 dias", rows: overdueMock.clients.filter((row) => Number(row[2]) > 30) })}><SummaryRow label="35 clientes acima de 30 dias" value="Ver clientes" tone="red" /></button>
          <button className="w-full text-left" onClick={() => openAction({ title: "Planos vencidos", rows: [["Planos vencidos", "12"], ["Período", "últimos 15 dias"]] })}><SummaryRow label="12 planos vencidos" value="Ver planos" tone="yellow" /></button>
          <button className="w-full text-left" onClick={() => openAction({ title: "Acordos de pagamento", rows: [["Aguardando resposta", "3"], ["Valor", "18.200 Kz"]] })}><SummaryRow label="3 acordos aguardando resposta" value="Ver acordos" tone="purple" /></button>
        </FinancePanelSection>
        <FinancePanelSection title="Projeção de recebimentos">
          <SummaryRow label="Próximos 7 dias" value="24.800 Kz" />
          <SummaryRow label="Próximos 15 dias" value="38.600 Kz" />
          <SummaryRow label="Próximos 30 dias" value="67.200 Kz" />
          <button className="text-sm text-noogym-lime" onClick={() => openAction({ title: "Projeção completa de recebimentos", rows: [["7 dias", "24.800 Kz"], ["15 dias", "38.600 Kz"], ["30 dias", "67.200 Kz"]] })}>Ver projeção completa →</button>
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}
