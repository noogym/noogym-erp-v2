import { Calendar, CheckCircle2, ClipboardCheck, CreditCard, Plus, QrCode, ShoppingCart, UsersRound } from "lucide-react";
import { useState } from "react";
import { ManualCheckinModal, QrScannerModal } from "../components/modals/OperationalModals";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { DonutChart, LineChart } from "../components/ui/Charts";
import { Input } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { chart7, recentActivities } from "../data/mock";
import { useAppStore } from "../store/appStore";
import { useCheckinsStore } from "../store/checkinsStore";
import { useClientsStore } from "../store/clientsStore";

const badgeTone = (tone?: string) => (["lime", "yellow", "purple", "blue", "orange", "red", "gray", "green"].includes(tone ?? "") ? tone as "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "gray" | "green" : "lime");

export default function Dashboard() {
  const [tab, setTab] = useState("Planos");
  const [manualOpen, setManualOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const setRoute = useAppStore((state) => state.setRoute);
  const clients = useClientsStore((state) => state.clients);
  const todayCount = useCheckinsStore((state) => state.todayCount);
  const checkins = useCheckinsStore((state) => state.checkins);
  const activities = [
    ...checkins.slice(0, 3).map((checkin) => ({ title: "Check-in realizado", subject: checkin.clientName, time: checkin.dateTime, amount: "" })),
    ...recentActivities
  ].slice(0, 5);

  return (
    <div className="page-grid dashboard-page-grid">
      <div className="panel min-w-0 p-4 sm:p-5 lg:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard</h1>
          <Button className="shrink-0" icon={<Calendar className="h-4 w-4" />}>08 de Maio de 2026</Button>
        </div>

        <div className="dashboard-metric-grid">
          <MetricCard title="Check-ins hoje" value={String(todayCount)} change="+ 18% vs ontem" icon={<ClipboardCheck className="h-5 w-5" />} />
          <MetricCard title="Clientes ativos" value="1.248" change="+ 12% vs mês passado" icon={<UsersRound className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Receita hoje" value="245.000 Kz" change="+ 22% vs ontem" icon={<CreditCard className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Planos ativos" value="982" change="+ 15% vs mês passado" icon={<CheckCircle2 className="h-5 w-5" />} tone="blue" />
          <MetricCard title="Aulas hoje" value="8" change="Próxima: 17:00" icon={<Calendar className="h-5 w-5" />} tone="purple" />
        </div>

        <div className="dashboard-chart-grid mt-4">
          <Card className="min-h-[280px] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="min-w-0 font-semibold">Check-ins nos últimos 7 dias</h2>
              <Button className="h-8 shrink-0 px-3">Últimos 7 dias</Button>
            </div>
            <LineChart values={chart7} labels={["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Hoje"]} />
          </Card>
          <Card className="min-h-[280px] p-4">
            <h2 className="mb-4 font-semibold">Distribuição de planos</h2>
            <DonutChart center="982" items={[{ label: "Musculação", value: 45, color: "#B6FF00" }, { label: "Premium", value: 30, color: "#FACC15" }, { label: "Funcional", value: 15, color: "#F97316" }, { label: "Aulas", value: 10, color: "#A78BFA" }]} />
          </Card>
        </div>

        <div className="dashboard-lists-grid mt-4">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold">Atividades recentes</h2>
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={`${activity.title}-${activity.subject}-${activity.time}`} className="flex items-center gap-3 border-b border-white/[0.07] pb-3 last:border-0">
                  <span className="icon-tile h-9 w-9 text-noogym-lime"><ClipboardCheck className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm">{activity.title}</p><p className="text-xs text-zinc-400">{activity.subject}</p></div>
                  <div className="text-right text-xs text-zinc-400"><p>{activity.time}</p>{activity.amount ? <p className="text-noogym-lime">{activity.amount}</p> : null}</div>
                </div>
              ))}
            </div>
            <button className="mt-2 text-sm text-noogym-lime">Ver todas as atividades</button>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Clientes ativos</h2><button className="text-xs text-noogym-lime" onClick={() => setRoute("clientes")}>Ver todos</button></div>
            <div className="space-y-3">
              {clients.slice(0, 5).map((client, index) => (
                <div key={client.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.07] pb-3 last:border-0 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]">
                  <Avatar label={client.avatar ?? "CL"} />
                  <p className="min-w-0 truncate text-sm">{client.name}</p>
                  <Badge tone={badgeTone(client.planTone)}>{client.plan.replace(" Mensal", "")}</Badge>
                  <p className="col-span-2 text-xs text-zinc-400 sm:col-span-1 sm:text-right">Último check-in: {client.lastCheckin}</p>
                  <CheckCircle2 className={`h-5 w-5 ${index === 4 ? "text-zinc-300" : "text-noogym-lime"}`} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <aside className="dashboard-side">
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Check-in rápido</h2>
          <Input placeholder="Buscar cliente (nome, telefone ou ID)" />
          <Tabs tabs={["QR Code", "Biometria", "Código"]} active="QR Code" onChange={() => undefined} />
          <div className="mt-4 flex h-44 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 text-center text-zinc-400">
            <QrCode className="mb-4 h-10 w-10 text-zinc-300" />
            <p className="max-w-56 text-sm">Aponte a câmera para o QR Code do cliente para realizar o check-in.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => setQrOpen(true)}>Escanear QR Code</Button>
            <Button onClick={() => setManualOpen(true)}>Check-in manual</Button>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Venda rápida (POS)</h2>
          <Tabs tabs={["Planos", "Produtos", "Serviços", "Aulas"]} active={tab} onChange={setTab} />
          <div className="mt-3 space-y-2">
            {["Plano Musculação Mensal", "Plano Premium Mensal", "Plano Trimestral", "Plano Anual", "Aula Avulsa"].map((item, index) => (
              <div key={item} className="flex items-center justify-between border-b border-white/[0.07] py-2 text-sm">
                <span>{item}</span><span>{["25.000 Kz", "35.000 Kz", "60.000 Kz", "200.000 Kz", "3.000 Kz"][index]}</span>
                <button className="rounded border border-noogym-lime/50 p-1 text-noogym-lime"><Plus className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="primary" icon={<ShoppingCart className="h-5 w-5" />} onClick={() => setRoute("vendas")}>Abrir PDV</Button>
        </Card>
      </aside>
      <ManualCheckinModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <QrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
