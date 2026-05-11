import { Wallet } from "lucide-react";
import { Card } from "../../ui/Card";
import { DonutChart, LineChart } from "../../ui/Charts";
import { MetricCard } from "../../ui/MetricCard";
import { Table } from "../../ui/Table";
import { chart15 } from "../../../data/mock";
import type { FinanceRecord } from "../../../store/domainTypes";
import type { FinanceActionContent } from "../FinanceActionModal";

export function OverviewTab({
  records,
  openAction
}: {
  records: FinanceRecord[];
  openAction: (action: FinanceActionContent) => void;
}) {
  const revenue = records.filter((record) => record.kind === "Receita").reduce((sum, record) => sum + record.value, 0) + 245000;
  const expenses = records.filter((record) => record.kind === "Despesa").reduce((sum, record) => sum + record.value, 0) + 62300;

  return {
    subtitle: "Acompanhe o fluxo financeiro do seu negócio.",
    main: (
      <div>
        <div className="grid grid-cols-5 gap-3">
          <MetricCard title="Receita total" value={`${revenue.toLocaleString("pt-AO")} Kz`} change="+ 22% vs período anterior" icon={<Wallet className="h-5 w-5" />} />
          <MetricCard title="Receita recebida" value="210.450 Kz" change="+ 18% vs período anterior" icon={<Wallet className="h-5 w-5" />} />
          <MetricCard title="Receita a receber" value="34.550 Kz" change="+ 12% vs período anterior" icon={<Wallet className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Despesas totais" value={`${expenses.toLocaleString("pt-AO")} Kz`} change="+ 9% vs período anterior" icon={<Wallet className="h-5 w-5" />} tone="red" />
          <MetricCard title="Lucro líquido" value={`${(revenue - expenses).toLocaleString("pt-AO")} Kz`} change="+ 24% vs período anterior" icon={<Wallet className="h-5 w-5" />} />
        </div>
        <div className="mt-4 grid grid-cols-[1.2fr_.8fr] gap-4">
          <Card className="p-4">
            <div className="mb-3 flex justify-between">
              <h2 className="font-semibold">Evolução financeira</h2>
              <button className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-1 text-sm">Diário</button>
            </div>
            <div className="h-64">
              <LineChart values={chart15.map((value) => value * 1000)} labels={["01/05", "03/05", "05/05", "07/05", "08/05"]} />
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-5 font-semibold">Distribuição por categoria</h2>
            <DonutChart center={`${revenue.toLocaleString("pt-AO")} Kz`} items={[{ label: "Mensalidades", value: 58, color: "#B6FF00" }, { label: "Vendas POS", value: 22, color: "#FACC15" }, { label: "Aulas avulsas", value: 10, color: "#A78BFA" }, { label: "Outros", value: 10, color: "#38BDF8" }]} />
          </Card>
        </div>
        <Card className="mt-4 p-4">
          <h2 className="mb-4 font-semibold">Transações locais</h2>
          <Table columns={["Tipo", "Categoria", "Valor", "Data", "Status", "Observação"]}>
            {records.map((record) => (
              <tr key={record.id} className="table-row">
                <td className="px-4 py-3">{record.kind}</td>
                <td className="px-4 py-3">{record.category}</td>
                <td className={`px-4 py-3 ${record.kind === "Receita" ? "text-noogym-lime" : "text-red-300"}`}>{record.value.toLocaleString("pt-AO")} Kz</td>
                <td className="px-4 py-3">{record.date}</td>
                <td className="px-4 py-3">{record.status}</td>
                <td className="px-4 py-3">{record.note}</td>
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
            <p className="mt-2 text-2xl font-semibold">158.950 Kz</p>
          </div>
          <h3 className="mt-5 font-semibold">Contas bancárias</h3>
          {["Conta BCI|105.450 Kz", "Conta BAI|53.500 Kz", "Caixa principal|5.000 Kz"].map((row) => {
            const [name, value] = row.split("|");
            return (
              <button key={name} className="mt-3 flex w-full justify-between rounded-md bg-white/[0.035] p-3 text-sm" onClick={() => openAction({ title: "Contas bancárias", rows: [[name, value]] })}>
                <span>{name}</span>
                <span>{value}</span>
              </button>
            );
          })}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Inadimplência</h2>
          <p className="text-sm text-zinc-400">35 clientes com pagamentos em atraso.</p>
          <button className="mt-4 h-10 w-full rounded-md border border-white/10 bg-white/[0.045] text-sm" onClick={() => openAction({ title: "Inadimplentes", rows: [["Clientes em atraso", "35"], ["Total", "89.500 Kz"]] })}>
            Ver inadimplentes
          </button>
        </Card>
      </aside>
    )
  };
}
