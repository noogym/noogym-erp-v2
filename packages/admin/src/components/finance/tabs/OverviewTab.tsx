import { Wallet } from "lucide-react";
import { Card, MetricCard, Table } from "@noogym/ui";
import { DonutChart, LineChart } from "../FinanceCharts";
import type { FinanceTabProps, FinanceTabView } from "../types";

export function OverviewTab({ data, openAction }: FinanceTabProps): FinanceTabView {
  return {
    subtitle: "Acompanhe o fluxo financeiro do seu negocio.",
    main: (
      <div>
        <div className="finance-kpi-grid">
          {data.overview.kpis.map((kpi, index) => (
            <MetricCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              tone={index === 2 ? "yellow" : kpi.tone === "red" ? "red" : kpi.tone === "blue" ? "blue" : "green"}
              icon={<Wallet className="h-5 w-5" />}
            />
          ))}
        </div>
        <div className="finance-grid-wide mt-4">
          <Card className="p-4">
            <div className="mb-3 flex justify-between">
              <h2 className="font-semibold">Evolucao financeira</h2>
              <button className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-1 text-sm">Periodo</button>
            </div>
            <LineChart series={data.overview.evolution} labels={data.labels} height={240} />
          </Card>
          <Card className="p-4">
            <h2 className="mb-5 font-semibold">Distribuicao por categoria</h2>
            <DonutChart center={money(data.totals.revenue)} items={data.overview.categorySlices} />
          </Card>
        </div>
        <Card className="mt-4 p-4">
          <h2 className="mb-4 font-semibold">Transacoes locais</h2>
          <Table columns={["Data", "Tipo", "Categoria", "Valor", "Status", "Observacao"]}>
            {data.recentRows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="table-row">
                {row.map((cell, cellIndex) => (
                  <td key={`${row[0]}-${cellIndex}`} className={`px-4 py-3 ${cellIndex === 3 ? (row[1] === "Receita" ? "text-noogym-lime" : "text-red-300") : ""}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    ),
    side: (
      <aside className="space-y-3">
        <Card className="p-5">
          <h2 className="font-semibold">Resumo financeiro</h2>
          <div className="mt-4 soft-card p-4">
            <p className="text-sm">Saldo atual</p>
            <p className="mt-2 text-2xl font-semibold">{money(data.cashFlow.currentBalance)}</p>
          </div>
          <h3 className="mt-5 font-semibold">Contas</h3>
          {data.accounts.cards.map(([name, balance, entries, exits], index) => (
            <button key={`${name}-${index}`} className="mt-3 flex w-full justify-between rounded-md bg-white/[0.035] p-3 text-sm" onClick={() => openAction({ title: `Detalhes - ${name}`, rows: [["Saldo", balance], ["Entradas", entries], ["Saidas", exits]] })}>
              <span>{name}</span>
              <span>{balance}</span>
            </button>
          ))}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Inadimplencia</h2>
          <p className="text-sm text-zinc-400">{data.overdue.count} clientes com pagamentos em atraso.</p>
          <button className="mt-4 h-10 w-full rounded-md border border-white/10 bg-white/[0.045] text-sm" onClick={() => openAction({ title: "Inadimplentes", rows: [["Clientes em atraso", String(data.overdue.count)], ["Total", money(data.overdue.total)]] })}>
            Ver inadimplentes
          </button>
        </Card>
      </aside>
    )
  };
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}
