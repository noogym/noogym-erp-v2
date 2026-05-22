import { Calendar, CheckCircle2, ClipboardCheck, CreditCard, Fingerprint, Keyboard, Plus, QrCode, ShoppingCart, UsersRound } from "lucide-react";
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
import { formatKz as money } from "@noogym/core";
import { chart7, recentActivities } from "../data/mock";
import { useAppStore } from "../store/appStore";
import { useCheckinsStore } from "../store/checkinsStore";
import { useClassesStore } from "../store/classesStore";
import { useClientsStore } from "../store/clientsStore";
import { usePlansStore } from "../store/plansStore";
import { useProductsStore } from "../store/productsStore";
import { toastSuccess } from "../store/toastStore";

const badgeTone = (tone?: string) => (["lime", "yellow", "purple", "blue", "orange", "red", "gray", "green"].includes(tone ?? "") ? tone as "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "gray" | "green" : "lime");

const quickServices = [
  { name: "Avaliação física", price: "8.000 Kz", detail: "Sessão individual" },
  { name: "Personal trainer", price: "12.000 Kz", detail: "Treino acompanhado" },
  { name: "Plano alimentar", price: "10.000 Kz", detail: "Consulta nutricional" },
  { name: "Massagem desportiva", price: "15.000 Kz", detail: "Recuperação muscular" }
];

export default function Dashboard() {
  const [checkinTab, setCheckinTab] = useState("QR Code");
  const [tab, setTab] = useState("Planos");
  const [manualOpen, setManualOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const setRoute = useAppStore((state) => state.setRoute);
  const clients = useClientsStore((state) => state.clients);
  const classes = useClassesStore((state) => state.classes);
  const todayCount = useCheckinsStore((state) => state.todayCount);
  const checkins = useCheckinsStore((state) => state.checkins);
  const plans = usePlansStore((state) => state.plans);
  const products = useProductsStore((state) => state.products);
  const activities = [
    ...checkins.slice(0, 3).map((checkin) => ({ title: "Check-in realizado", subject: checkin.clientName, time: checkin.dateTime, amount: "" })),
    ...recentActivities
  ].slice(0, 5);
  const quickSaleItems = tab === "Produtos"
    ? products.slice(0, 5).map((product) => ({ name: product.name, price: money(product.price), detail: `${product.stock} un` }))
    : tab === "Serviços"
      ? quickServices
      : tab === "Aulas"
        ? classes.slice(0, 5).map((lesson) => ({ name: lesson.name, price: "3.000 Kz", detail: lesson.time }))
        : plans.slice(0, 5).map((plan) => ({ name: plan.name, price: plan.price, detail: plan.duration }));

  const handleQuickCheckin = () => {
    if (checkinTab === "QR Code") {
      setQrOpen(true);
      return;
    }

    if (checkinTab === "Biometria") {
      toastSuccess("Biometria iniciada", "Leitura biométrica simulada.");
      return;
    }

    toastSuccess("Código validado", "Check-in por código simulado.");
  };

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
          <Tabs tabs={["QR Code", "Biometria", "Código"]} active={checkinTab} onChange={setCheckinTab} />
          <div className="mt-4 flex h-44 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 p-4 text-center text-zinc-400">
            {checkinTab === "Biometria" ? (
              <>
                <Fingerprint className="mb-4 h-10 w-10 text-zinc-300" />
                <p className="max-w-56 text-sm">Encoste o dedo no leitor biométrico para identificar o cliente.</p>
              </>
            ) : checkinTab === "Código" ? (
              <>
                <Keyboard className="mb-4 h-10 w-10 text-zinc-300" />
                <Input className="max-w-60 text-center" placeholder="Código do cliente" />
                <p className="mt-3 max-w-56 text-xs">Digite o código do cliente para validar o acesso.</p>
              </>
            ) : (
              <>
                <QrCode className="mb-4 h-10 w-10 text-zinc-300" />
                <p className="max-w-56 text-sm">Aponte a câmera para o QR Code do cliente para realizar o check-in.</p>
              </>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={handleQuickCheckin}>{checkinTab === "QR Code" ? "Escanear QR Code" : checkinTab === "Biometria" ? "Iniciar leitura" : "Validar código"}</Button>
            <Button onClick={() => setManualOpen(true)}>Check-in manual</Button>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Venda rápida (POS)</h2>
          <Tabs tabs={["Planos", "Produtos", "Serviços", "Aulas"]} active={tab} onChange={setTab} />
          <div className="mt-3 space-y-2">
            {quickSaleItems.map((item) => (
              <div key={`${tab}-${item.name}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/[0.07] py-2 text-sm">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="text-right">{item.price}</span>
                <button className="rounded border border-noogym-lime/50 p-1 text-noogym-lime" onClick={() => toastSuccess("Item adicionado", `${item.name} foi adicionado à venda rápida.`)}>
                  <Plus className="h-4 w-4" />
                </button>
                {item.detail ? <span className="col-span-3 text-xs text-zinc-400">{item.detail}</span> : null}
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
