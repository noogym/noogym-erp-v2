import { CalendarDays, Download, Wallet } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DonutChart, LineChart } from "../components/ui/Charts";
import { MetricCard } from "../components/ui/MetricCard";
import { Table } from "../components/ui/Table";
import { chart15 } from "../data/mock";

export default function Financas() {
  const rows = [
    ["Mensalidades", "142.000", "58%", "0", "0%", "142.000"],
    ["Vendas POS", "53.900", "22%", "18.200", "29%", "35.700"],
    ["Aulas avulsas", "24.500", "10%", "0", "0%", "24.500"],
    ["Taxas e multas", "12.300", "5%", "1.000", "2%", "11.300"],
    ["Outros", "12.300", "5%", "43.100", "69%", "-30.800"]
  ];
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Finanças" subtitle="Acompanhe o fluxo financeiro do seu negócio." actions={<><Button icon={<CalendarDays className="h-4 w-4" />}>01/05/2024 - 15/05/2024</Button><Button variant="primary" icon={<Download className="h-4 w-4" />}>Exportar</Button></>} />
        <div className="flex gap-7 border-b border-white/10 pb-3 text-sm"><span className="text-noogym-lime">Visão geral</span><span>Receitas</span><span>Despesas</span><span>Contas</span><span>Métodos de pagamento</span><span>Inadimplência</span><span>Fluxo de caixa</span></div>
        <div className="mt-4 grid grid-cols-5 gap-3">
          <MetricCard title="Receita total" value="245.000 Kz" change="+ 22% vs período anterior" icon={<Wallet className="h-5 w-5" />} />
          <MetricCard title="Receita recebida" value="210.450 Kz" change="+ 18% vs período anterior" icon={<Wallet className="h-5 w-5" />} />
          <MetricCard title="Receita a receber" value="34.550 Kz" change="+ 12% vs período anterior" icon={<Wallet className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Despesas totais" value="62.300 Kz" change="+ 9% vs período anterior" icon={<Wallet className="h-5 w-5" />} tone="red" />
          <MetricCard title="Lucro líquido" value="148.150 Kz" change="+ 24% vs período anterior" icon={<Wallet className="h-5 w-5" />} />
        </div>
        <div className="mt-4 grid grid-cols-[1.2fr_.8fr] gap-4">
          <Card className="p-4"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Evolução financeira</h2><Button className="h-8">Diário</Button></div><div className="h-64"><LineChart values={chart15.map((v) => v * 1000)} labels={["01/05", "03/05", "05/05", "07/05", "09/05", "11/05", "13/05", "15/05"]} /></div></Card>
          <Card className="p-4"><h2 className="mb-5 font-semibold">Distribuição por categoria</h2><DonutChart center="245.000 Kz" items={[{ label: "Mensalidades", value: 58, color: "#B6FF00" }, { label: "Vendas POS", value: 22, color: "#FACC15" }, { label: "Aulas avulsas", value: 10, color: "#A78BFA" }, { label: "Taxas e multas", value: 5, color: "#38BDF8" }, { label: "Outros", value: 5, color: "#8B5CF6" }]} /></Card>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_.8fr] gap-4">
          <Card className="p-4"><h2 className="mb-4 font-semibold">Resumo por categoria</h2><Table columns={["Categoria", "Receita (Kz)", "%", "Despesas (Kz)", "%", "Lucro (Kz)"]}>{rows.map((row) => <tr key={row[0]} className="table-row">{row.map((cell, index) => <td key={cell} className={`px-4 py-3 ${index === 5 ? (cell.startsWith("-") ? "text-red-400" : "text-noogym-lime") : ""}`}>{cell}</td>)}</tr>)}</Table></Card>
          <Card className="p-4"><h2 className="mb-4 font-semibold">Top despesas</h2>{["Salários|24.000|38%", "Aluguel|12.000|19%", "Marketing|6.500|10%", "Manutenção|5.800|9%", "Serviços|4.500|7%"].map((row) => { const [cat, value, pct] = row.split("|"); return <p key={cat} className="flex justify-between border-b border-white/[0.07] py-3 text-sm"><span>{cat}</span><span>{value} Kz</span><span>{pct}</span></p>; })}<button className="mt-4 text-sm text-noogym-lime">Ver todas as despesas →</button></Card>
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-5"><h2 className="font-semibold">Resumo financeiro</h2><div className="mt-4 soft-card p-4"><p className="text-sm">Saldo atual</p><p className="mt-2 text-2xl font-semibold">158.950 Kz</p></div><h3 className="mt-5 font-semibold">Contas bancárias</h3>{["Conta BCI|105.450 Kz", "Conta BAI|53.500 Kz", "Caixa principal|5.000 Kz"].map((row) => { const [name, value] = row.split("|"); return <p key={name} className="mt-3 flex justify-between rounded-md bg-white/[0.035] p-3 text-sm"><span>{name}</span><span>{value}</span></p>; })}</Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Alertas financeiros</h2>{["35 clientes com pagamentos em atraso|Ver inadimplentes →", "Despesas acima do esperado|Ver despesas →", "Receitas a receber|Ver títulos →"].map((row) => { const [title, link] = row.split("|"); return <div key={title} className="mb-3 rounded-md bg-white/[0.035] p-3 text-sm"><p>{title}</p><p className="mt-1 text-noogym-lime">{link}</p></div>; })}</Card>
        <Card className="p-5"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Transações recentes</h2><span className="text-xs text-noogym-lime">Ver todas</span></div>{["Recebimento - Ana Luísa Santos|35.000 Kz", "Pagamento - Salários|-24.000 Kz", "Recebimento - Carlos Mendes|60.000 Kz", "Pagamento - Aluguel|-12.000 Kz"].map((row) => { const [title, value] = row.split("|"); return <p key={title} className="flex justify-between py-2 text-sm"><span>{title}</span><span className={value.startsWith("-") ? "text-red-400" : "text-noogym-lime"}>{value}</span></p>; })}</Card>
      </aside>
    </div>
  );
}
