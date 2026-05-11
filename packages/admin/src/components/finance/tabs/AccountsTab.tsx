import { ArrowRight, Building2, Filter, Plus, Search } from "lucide-react";
import { accountsMock, financeDays } from "../../../data/financeMock";
import { DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function AccountsTab({ openAction }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe suas contas bancárias e o saldo disponível.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {accountsMock.cards.map(([name, balance, entries, exits, badge, color]) => (
            <button key={name} className="panel p-4 text-left transition hover:border-noogym-lime/40" onClick={() => openAction({ title: `Detalhes - ${name}`, rows: [["Saldo disponível", balance], ["Entradas", entries], ["Saídas", exits]] })}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10" style={{ color: String(color), backgroundColor: `${color}1A` }}>
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{name}</p>
                  {badge ? <span className="mt-1 inline-flex rounded bg-noogym-lime/15 px-2 py-0.5 text-[11px] text-noogym-lime">{badge}</span> : null}
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">Saldo disponível</p>
              <p className="mt-1 text-2xl font-semibold">{balance}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="text-zinc-400">Entradas <b className="block text-noogym-lime">{entries}</b></span>
                <span className="text-zinc-400">Saídas <b className="block text-red-400">{exits}</b></span>
              </div>
              <span className="mt-3 inline-flex items-center gap-2 text-sm text-noogym-lime">Ver detalhes <ArrowRight className="h-4 w-4" /></span>
            </button>
          ))}
          <button className="panel flex min-h-[166px] flex-col items-center justify-center border-dashed text-center transition hover:border-noogym-lime/50" onClick={() => openAction({ title: "Adicionar conta", confirmLabel: "Adicionar", rows: [["Banco", "Banco BIC"], ["Tipo", "Corrente"], ["Saldo inicial", "0 Kz"]] })}>
            <Plus className="h-9 w-9 rounded-full border border-white/10 p-2 text-zinc-200" />
            <span className="mt-3">Adicionar conta</span>
            <span className="mt-1 text-xs text-zinc-500">Conecte uma nova conta bancária</span>
          </button>
        </div>

        <div className="finance-grid-wide">
          <FinanceChartCard
            title="Contas bancárias"
            action={<div className="flex max-w-full flex-wrap gap-2"><SmallInput /><button className="rounded-md border border-white/10 px-3 py-2 text-xs"><Filter className="mr-1 inline h-3.5 w-3.5" />Filtros</button></div>}
          >
            <FinanceTable columns={["Conta", "Banco", "Tipo", "Saldo disponível", "Saldo contábil", "Entradas", "Saídas", "Status", "Ações"]}>
              {accountsMock.table.map((row) => (
                <tr key={row[0]} className="table-row">
                  {row.map((cell, index) => (
                    <FinanceCell key={`${row[0]}-${index}`} tone={index === 3 || index === 5 ? "lime" : index === 6 ? "red" : undefined}>{cell}</FinanceCell>
                  ))}
                  <FinanceCell><button onClick={() => openAction({ title: `Detalhes - ${row[0]}`, rows: [["Banco", row[1]], ["Saldo", row[3]], ["Status", row[7]]] })}>...</button></FinanceCell>
                </tr>
              ))}
              <tr className="table-row font-semibold">
                <FinanceCell>Total geral</FinanceCell><FinanceCell> </FinanceCell><FinanceCell> </FinanceCell><FinanceCell tone="lime">203.950 Kz</FinanceCell><FinanceCell>203.950 Kz</FinanceCell><FinanceCell tone="lime">533.050 Kz</FinanceCell><FinanceCell tone="red">328.100 Kz</FinanceCell><FinanceCell> </FinanceCell><FinanceCell> </FinanceCell>
              </tr>
            </FinanceTable>
          </FinanceChartCard>
          <FinanceChartCard title="Distribuição do saldo disponível">
            <DonutChart items={accountsMock.distribution} center="203.950 Kz" />
            <FinanceCardLink onClick={() => openAction({ title: "Relatório de contas", rows: accountsMock.distribution.map((item) => [item.label, item.amount ?? ""]) })}>Ver relatório completo</FinanceCardLink>
          </FinanceChartCard>
        </div>

        <div className="finance-grid-wide">
          <FinanceChartCard title="Transações recentes" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Transações recentes", rows: accountsMock.transactions })}>Ver todas →</button>}>
            <FinanceTable columns={["Data e hora", "Conta", "Descrição", "Tipo", "Categoria", "Valor", "Saldo após"]}>
              {accountsMock.transactions.map((row) => (
                <tr key={`${row[0]}-${row[2]}`} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 5 ? (String(cell).startsWith("+") ? "lime" : "red") : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
          <FinanceChartCard title="Fluxo de caixa por contas" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Diários</button>}>
            <LineChart series={accountsMock.cashByAccount} labels={financeDays} height={170} />
            <FinanceCardLink onClick={() => openAction({ title: "Fluxo de caixa por contas", rows: [["Entradas", "533.050 Kz"], ["Saídas", "328.100 Kz"], ["Saldo líquido", "204.950 Kz"]] })}>Ver fluxo de caixa completo</FinanceCardLink>
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
          <SummaryRow label="Variação" value="+45.000 Kz ↑ 28,3%" tone="lime" />
          <button className="w-full text-sm text-noogym-lime" onClick={() => openAction({ title: "Resumo completo de contas", rows: [["Saldo atual", "203.950 Kz"], ["Variação", "+45.000 Kz"]] })}>Ver resumo completo →</button>
        </FinancePanelSection>
        <FinancePanelSection title="Alertas de contas">
          <SummaryRow label="Saldo baixo na Conta Millennium" value="12.150 Kz" tone="yellow" />
          <SummaryRow label="Conciliação pendente" value="2 contas" tone="blue" />
          <SummaryRow label="Tudo certo!" value="Operacional" tone="lime" />
        </FinancePanelSection>
        <FinancePanelSection title="Ações rápidas">
          {["Nova transferência", "Conciliação bancária", "Adicionar conta", "Relatório de contas"].map((label) => (
            <button key={label} className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.025] px-3 py-3 text-left text-sm hover:border-noogym-lime/40" onClick={() => openAction({ title: label, confirmLabel: label === "Relatório de contas" ? "Gerar" : "Salvar", rows: [["Período", "01/05/2024 - 15/05/2024"], ["Status", "Simulado"]] })}>
              {label}
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </button>
          ))}
        </FinancePanelSection>
      </FinanceRightPanel>
    )
  };
}

function SmallInput() {
  return (
    <label className="relative min-w-0 flex-1 sm:flex-none">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      <input className="h-9 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-xs outline-none focus:border-noogym-lime/70 sm:w-44" placeholder="Buscar conta..." />
    </label>
  );
}
