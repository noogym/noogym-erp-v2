import { CalendarDays, ShoppingBag, UsersRound } from "lucide-react";
import { BarChart, DonutChart, LineChart } from "../../ui/Charts";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import type { ReportOverview } from "../../../lib/reportApi";

const money = (value = 0) => `${Math.round(value).toLocaleString("pt-AO")} Kz`;
const int = (value = 0) => Math.round(value).toLocaleString("pt-AO");
const percent = (value = 0, total = 0) => (total > 0 ? Math.round((value / total) * 100) : 0);

interface OverviewCharts {
  revenue: { labels: string[]; values: number[] };
  checkinsByWeekday: { labels: string[]; values: number[] };
  activeClients: { labels: string[]; values: number[] };
}

export function OverviewReport({ overview, charts }: { overview?: ReportOverview | null; charts?: OverviewCharts }) {
  const revenue = overview?.revenueTotal ?? 2245000;
  const expenses = overview?.expensesTotal ?? 62300;
  const totalMembers = overview?.totalMembers ?? 1248;
  const activeMembers = overview?.activeMembers ?? 1070;
  const overdueMembers = overview?.overdueMembers ?? 0;
  const checkinsToday = overview?.checkinsToday ?? 1340;
  const weeklyFrequency = overview?.weeklyFrequency ?? 1340;
  const completedSales = overview?.completedSales ?? 154;
  const netProfit = overview?.netProfit ?? revenue - expenses;
  const revenueChart = charts?.revenue ?? { labels: [], values: [] };
  const checkinsChart = charts?.checkinsByWeekday ?? { labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"], values: [] };
  const activeClientsChart = charts?.activeClients ?? { labels: [], values: [] };

  return (
    <>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <h2 className="font-semibold">Visao geral</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Dados calculados a partir dos registros locais e atualizados pela sincronizacao quando a API esta online.
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Receita total" value={money(revenue)} change={`Lucro liquido: ${money(netProfit)}`} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard title="Clientes ativos" value={int(activeMembers)} change={`${percent(activeMembers, totalMembers)}% de ${int(totalMembers)} clientes`} icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
        <MetricCard title="Check-ins hoje" value={int(checkinsToday)} change={`${int(weeklyFrequency)} na semana`} icon={<CalendarDays className="h-5 w-5" />} tone="blue" />
        <MetricCard title="Treinos ativos" value={int(overview?.activeWorkouts ?? 0)} change={`${int(overview?.activeSubscriptions ?? 0)} assinaturas ativas`} icon={<CalendarDays className="h-5 w-5" />} tone="purple" />
        <MetricCard title="Vendas POS" value={int(completedSales)} change={`${int(overview?.activeProducts ?? 0)} produtos ativos`} icon={<ShoppingBag className="h-5 w-5" />} tone="green" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_.95fr]">
        <Card className="p-4">
          <div className="mb-3 flex justify-between">
            <h2 className="font-semibold">Receita ao longo do tempo</h2>
            <Button className="h-8">Diario</Button>
          </div>
          <div className="h-64">
            <LineChart values={nonEmptyValues(revenueChart.values)} labels={revenueChart.labels} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex justify-between">
            <h2 className="font-semibold">Check-ins por dia da semana</h2>
            <Button className="h-8">Total</Button>
          </div>
          <BarChart values={nonEmptyValues(checkinsChart.values, checkinsChart.labels.length)} labels={checkinsChart.labels} />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1fr_.7fr_.85fr]">
        <Card className="p-4">
          <div className="mb-3 flex justify-between">
            <h2 className="font-semibold">Clientes ativos ao longo do tempo</h2>
            <Button className="h-8">Diario</Button>
          </div>
          <div className="h-48">
            <LineChart values={nonEmptyValues(activeClientsChart.values)} labels={activeClientsChart.labels} />
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-5 font-semibold">Clientes ativos</h2>
          <DonutChart
            center={int(totalMembers)}
            items={[
              { label: "Ativos", value: percent(activeMembers, totalMembers), color: "#B6FF00" },
              { label: "Em atraso", value: percent(overdueMembers, totalMembers), color: "#EF4444" },
              { label: "Outros", value: Math.max(0, 100 - percent(activeMembers, totalMembers) - percent(overdueMembers, totalMembers)), color: "#FACC15" }
            ]}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-5 font-semibold">Receita e despesas</h2>
          <DonutChart
            center={money(revenue)}
            items={[
              { label: "Receitas pagas", value: percent(revenue, revenue + expenses), color: "#B6FF00" },
              { label: "Despesas", value: percent(expenses, revenue + expenses), color: "#EF4444" }
            ]}
          />
        </Card>
      </div>
    </>
  );
}

function nonEmptyValues(values: number[], length = 1) {
  return values.length ? values : new Array(Math.max(length, 1)).fill(0);
}
