import { ArrowRight, Building2, Filter, Plus, Search } from "lucide-react";
import { DonutChart, LineChart } from "../FinanceCharts";
import { FinanceCardLink, FinanceChartCard } from "../FinanceChartCard";
import { FinanceCell, FinanceTable } from "../FinanceTable";
import { FinancePanelSection, FinanceRightPanel, SummaryRow } from "../FinanceRightPanel";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function AccountsTab({ openAction, data }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe contas virtuais, saldos e movimentacoes.",
    main: (
      <div className="space-y-4">
        <div className="finance-kpi-grid">
          {data.accounts.cards.map(([name, balance, entries, exits, badge, color], index) => (
            <button key={`${name}-${index}`} className="panel p-4 text-left transition hover:border-noogym-lime/40" onClick={() => openAction({ title: `Detalhes - ${name}`, rows: [["Saldo disponivel", balance], ["Entradas", entries], ["Saidas", exits]] })}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10" style={{ color, backgroundColor: `${color}1A` }}>
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{name}</p>
                  {badge ? <span className="mt-1 inline-flex rounded bg-noogym-lime/15 px-2 py-0.5 text-[11px] text-noogym-lime">{badge}</span> : null}
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">Saldo disponivel</p>
              <p className="mt-1 text-2xl font-semibold">{balance}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="text-zinc-400">Entradas <b className="block text-noogym-lime">{entries}</b></span>
                <span className="text-zinc-400">Saidas <b className="block text-red-400">{exits}</b></span>
              </div>
              <span className="mt-3 inline-flex items-center gap-2 text-sm text-noogym-lime">Ver detalhes <ArrowRight className="h-4 w-4" /></span>
            </button>
          ))}
          <button className="panel flex min-h-[166px] flex-col items-center justify-center border-dashed text-center transition hover:border-noogym-lime/50" onClick={() => openAction({ title: "Adicionar conta", confirmLabel: "Adicionar", rows: [["Tipo", "Conta virtual"], ["Saldo inicial", "0 Kz"]] })}>
            <Plus className="h-9 w-9 rounded-full border border-white/10 p-2 text-zinc-200" />
            <span className="mt-3">Adicionar conta</span>
            <span className="mt-1 text-xs text-zinc-500">Regista uma conta local</span>
          </button>
        </div>

        <div className="finance-grid-wide">
          <FinanceChartCard title="Contas" action={<div className="flex max-w-full flex-wrap gap-2"><SmallInput /><button className="rounded-md border border-white/10 px-3 py-2 text-xs"><Filter className="mr-1 inline h-3.5 w-3.5" />Filtros</button></div>}>
            <FinanceTable columns={["Conta", "Banco", "Tipo", "Saldo disponivel", "Saldo contabil", "Entradas", "Saidas", "Status", "Acoes"]}>
              {data.accounts.table.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 3 || index === 5 ? "lime" : index === 6 ? "red" : undefined}>{cell}</FinanceCell>)}
                  <FinanceCell><button onClick={() => openAction({ title: `Detalhes - ${row[0]}`, rows: [["Saldo", row[3]], ["Entradas", row[5]], ["Saidas", row[6]]] })}>...</button></FinanceCell>
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
          <FinanceChartCard title="Distribuicao do saldo disponivel">
            <DonutChart items={data.accounts.distribution} center={money(data.accounts.currentBalance)} />
            <FinanceCardLink onClick={() => openAction({ title: "Relatorio de contas", rows: data.accounts.distribution.map((item) => [item.label, item.amount ?? ""]) })}>Ver relatorio completo</FinanceCardLink>
          </FinanceChartCard>
        </div>

        <div className="finance-grid-wide">
          <FinanceChartCard title="Transacoes recentes" action={<button className="text-xs text-noogym-lime" onClick={() => openAction({ title: "Transacoes recentes", rows: data.accounts.transactions })}>Ver todas</button>}>
            <FinanceTable columns={["Data", "Conta", "Descricao", "Tipo", "Categoria", "Valor", "Saldo apos"]}>
              {data.accounts.transactions.map((row, index) => (
                <tr key={`${row[0]}-${row[1]}-${row[2]}-${row[5]}-${index}`} className="table-row">
                  {row.map((cell, index) => <FinanceCell key={`${row[0]}-${index}`} tone={index === 5 ? (String(cell).startsWith("+") ? "lime" : "red") : undefined}>{cell}</FinanceCell>)}
                </tr>
              ))}
            </FinanceTable>
          </FinanceChartCard>
          <FinanceChartCard title="Fluxo de caixa por contas" action={<button className="rounded-md border border-white/10 px-3 py-2 text-xs">Periodo</button>}>
            <LineChart series={data.accounts.cashByAccount} labels={data.labels} height={170} />
            <FinanceCardLink onClick={() => openAction({ title: "Fluxo de caixa por contas", rows: [["Entradas", money(data.totals.received)], ["Saidas", money(data.totals.paidExpenses)], ["Saldo liquido", money(data.totals.net)]] })}>Ver fluxo de caixa completo</FinanceCardLink>
          </FinanceChartCard>
        </div>
      </div>
    ),
    side: (
      <FinanceRightPanel>
        <FinancePanelSection title="Resumo do periodo">
          <SummaryRow label="Saldo inicial" value={money(data.accounts.initialBalance)} />
          <SummaryRow label="Entradas totais" value={money(data.totals.received)} tone="lime" />
          <SummaryRow label="Saidas totais" value={money(data.totals.paidExpenses)} tone="red" />
          <SummaryRow label="Saldo atual" value={money(data.accounts.currentBalance)} tone="lime" />
          <button className="w-full text-sm text-noogym-lime" onClick={() => openAction({ title: "Resumo completo de contas", rows: [["Saldo atual", money(data.accounts.currentBalance)], ["Fluxo liquido", money(data.totals.net)]] })}>Ver resumo completo</button>
        </FinancePanelSection>
        <FinancePanelSection title="Acoes rapidas">
          {["Nova transferencia", "Conciliacao bancaria", "Adicionar conta", "Relatorio de contas"].map((label, index) => (
            <button key={`${label}-${index}`} className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.025] px-3 py-3 text-left text-sm hover:border-noogym-lime/40" onClick={() => openAction({ title: label, confirmLabel: label === "Relatorio de contas" ? "Gerar" : "Salvar", rows: [["Periodo", data.period], ["Status", "Local"]] })}>
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

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}
