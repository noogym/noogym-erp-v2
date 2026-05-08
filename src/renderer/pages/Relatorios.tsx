import { CalendarDays, Download, ShoppingBag, UsersRound } from "lucide-react";
import { useState } from "react";
import { ReportExportModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { BarChart, DonutChart, LineChart } from "../components/ui/Charts";
import { MetricCard } from "../components/ui/MetricCard";
import { Select } from "../components/ui/Select";
import { Tabs } from "../components/ui/Tabs";
import { Card } from "../components/ui/Card";
import { chart15 } from "../data/mock";

const tabs = ["Visão geral", "Financeiro", "Clientes", "Check-ins", "Planos", "Aulas", "Treinos", "Vendas POS", "Produtos", "Funcionários"];

export default function Relatorios() {
  const [tab, setTab] = useState("Visão geral");
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <div className="panel p-6">
      <PageHeader title="Relatórios" subtitle="Acompanhe indicadores e desempenho da academia." actions={<><Button icon={<CalendarDays className="h-4 w-4" />}>01/05/2026 - 08/05/2026</Button><Select className="w-80"><option>Período customizado</option><option>Hoje</option><option>Este mês</option></Select><Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>Exportar</Button></>} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <h2 className="font-semibold">{tab}</h2>
        <p className="mt-1 text-sm text-zinc-400">Dados mockados filtrados para {tab.toLowerCase()} no contexto da unidade central.</p>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-4"><MetricCard title="Receita total" value="2.245.000 Kz" change="+ 18% vs período anterior" icon={<UsersRound className="h-5 w-5" />} /><MetricCard title="Novos clientes" value="56" change="+ 12% vs período anterior" icon={<UsersRound className="h-5 w-5" />} tone="yellow" /><MetricCard title="Check-ins realizados" value="1.340" change="+ 15% vs período anterior" icon={<CalendarDays className="h-5 w-5" />} tone="blue" /><MetricCard title="Aulas realizadas" value="248" change="+ 8% vs período anterior" icon={<CalendarDays className="h-5 w-5" />} tone="purple" /><MetricCard title="Vendas POS" value="154" change="+ 22% vs período anterior" icon={<ShoppingBag className="h-5 w-5" />} tone="green" /></div>
      <div className="mt-4 grid grid-cols-[1fr_.95fr] gap-4"><Card className="p-4"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Receita ao longo do tempo</h2><Button className="h-8">Diário</Button></div><div className="h-64"><LineChart values={chart15.map((v) => v * 38000)} labels={["01/05", "03/05", "05/05", "07/05", "08/05"]} /></div></Card><Card className="p-4"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Check-ins por dia da semana</h2><Button className="h-8">Total</Button></div><BarChart values={[185, 210, 245, 230, 280, 120, 70]} labels={["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]} /></Card></div>
      <div className="mt-4 grid grid-cols-[1fr_.7fr_.85fr] gap-4"><Card className="p-4"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Novos clientes ao longo do tempo</h2><Button className="h-8">Diário</Button></div><div className="h-48"><LineChart values={[10, 19, 26, 20, 25, 30, 19, 20]} /></div></Card><Card className="p-4"><h2 className="mb-5 font-semibold">Clientes ativos</h2><DonutChart center="1.248" items={[{ label: "Ativos", value: 86, color: "#B6FF00" }, { label: "Inativos", value: 10, color: "#FACC15" }, { label: "Cancelados", value: 4, color: "#EF4444" }]} /></Card><Card className="p-4"><h2 className="mb-5 font-semibold">Receita por categoria</h2><DonutChart center="2.245.000 Kz" items={[{ label: "Planos", value: 72, color: "#B6FF00" }, { label: "Aulas", value: 13, color: "#FACC15" }, { label: "Vendas POS", value: 15, color: "#A78BFA" }]} /></Card></div>
      <ReportExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
