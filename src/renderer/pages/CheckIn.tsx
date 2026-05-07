import { Check, ClipboardCheck, Fingerprint, Headphones, History, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Tabs } from "../components/ui/Tabs";
import { LineChart } from "../components/ui/Charts";
import { clients, chart7 } from "../data/mock";
import { PageHeader } from "../components/layout/PageHeader";

export default function CheckIn() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Check-in rápido");
  const filtered = useMemo(
    () => clients.filter((client) => `${client.name} ${client.phone} ${client.id}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );
  const selected = filtered[0] ?? clients[0];

  return (
    <div className="checkin-grid">
      <div className="panel min-w-0 p-6">
        <PageHeader title="Check-in" subtitle="Realize o check-in dos clientes de forma rápida e segura." />
        <Tabs tabs={["Check-in rápido", "Check-in manual", "Check-ins do dia", "Histórico"]} active={tab} onChange={setTab} />
        <div className="checkin-content">
          <div className="min-w-0 space-y-4">
            <Card className="p-4">
              <Tabs tabs={["Buscar por nome", "Buscar por código", "Buscar por biometria"]} active="Buscar por nome" onChange={() => undefined} />
              <div className="mt-4 grid gap-3 min-[1320px]:grid-cols-[1fr_160px]">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome do cliente..." />
                <Button>Todos os planos</Button>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 font-semibold">Clientes encontrados</h2>
              <div className="space-y-1">
                {filtered.map((client) => (
                  <div key={client.id} className="table-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-3 min-[1500px]:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]">
                    <Avatar label={client.avatar} />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{client.name}</p>
                      <span className="block truncate text-xs text-zinc-400 min-[1500px]:hidden">Último acesso: {client.lastCheckin}</span>
                    </div>
                    <Badge tone={client.planTone}>{client.plan.replace(" Mensal", "")}</Badge>
                    <span className="hidden whitespace-nowrap text-xs text-zinc-400 min-[1500px]:block">Último acesso: {client.lastCheckin}</span>
                    <Check className="hidden h-5 w-5 rounded-full border border-noogym-lime text-noogym-lime min-[1500px]:block" />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <button className="text-noogym-lime">Ver todos os clientes →</button>
                <span className="text-zinc-400">Mostrando {filtered.length} de 1.248 clientes</span>
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Detalhes do cliente</h2>
              <div className="grid gap-5 min-[1480px]:grid-cols-[auto_minmax(0,1fr)_minmax(210px,240px)]">
                <Avatar label={selected.avatar} className="h-16 w-16 text-lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="min-w-0 truncate text-lg font-semibold">{selected.name}</h3>
                    <Badge tone={selected.planTone}>{selected.plan.replace(" Mensal", "")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-noogym-lime">● Ativo</p>
                  <p className="mt-4 truncate text-sm text-zinc-300">{selected.phone}</p>
                  <p className="mt-2 truncate text-sm text-zinc-300">{selected.email}</p>
                </div>
                <div className="soft-card min-w-0 p-4 text-sm">
                  <p className="mb-3 flex flex-wrap justify-between gap-2 text-zinc-300">Plano <span className="text-white">{selected.plan}</span></p>
                  <p className="mb-3 flex flex-wrap justify-between gap-2 text-zinc-300">Início do plano <span className="text-white">12/04/2024</span></p>
                  <p className="flex flex-wrap justify-between gap-2 text-zinc-300">Vencimento <span className="text-white">{selected.expires}</span></p>
                </div>
              </div>
              <h3 className="mb-3 mt-6 font-semibold">Resumo</h3>
              <div className="grid grid-cols-2 gap-2 text-center min-[1420px]:grid-cols-4">
                {["Check-ins este mês|18", "Check-ins totais|86", "Frequência semanal|4x", "Dias consecutivos|3", `Último check-in|${selected.lastCheckin}`, `Plano|${selected.plan}`, "Status|● Ativo", "Acesso liberado até|22:00"].map((item) => {
                  const [label, value] = item.split("|");
                  return (
                    <div key={label} className="soft-card min-w-0 p-3">
                      <p className="text-xs text-zinc-400">{label}</p>
                      <p className="mt-2 truncate text-base font-semibold">{value}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-5 text-center">
              <h2 className="mb-3 text-left font-semibold">Check-in</h2>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-noogym-lime/50 bg-noogym-lime/10">
                <Check className="h-14 w-14 text-noogym-lime" />
              </div>
              <p className="mt-4 font-semibold">Check-in realizado com sucesso!</p>
              <p className="mt-1 text-sm text-zinc-400">Hoje, 15 de Maio de 2024 às 10:30</p>
              <Button className="mt-4 w-full" variant="primary" icon={<UserCheck className="h-5 w-5" />}>
                Novo check-in
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <aside className="min-w-0 space-y-3">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Check-ins do dia</h2>
          <p className="mt-4 text-3xl font-semibold">152</p>
          <p className="mt-2 text-sm text-noogym-lime">↑ 18% vs ontem</p>
          <div className="mt-4 h-28">
            <LineChart values={chart7} labels={["00h", "06h", "12h", "18h", "24h"]} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Status do acesso</h2>
          {["Portaria|Aberta", "Catracas|Online", "Equipamentos|Online"].map((row) => {
            const [label, value] = row.split("|");
            return (
              <p key={label} className="flex justify-between border-b border-white/[0.07] py-3 text-sm last:border-0">
                <span>{label}</span>
                <span className="text-noogym-lime">{value}</span>
              </p>
            );
          })}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Ações rápidas</h2>
          <div className="space-y-2">
            <Button className="w-full justify-start" icon={<ClipboardCheck className="h-4 w-4" />}>Check-in manual</Button>
            <Button className="w-full justify-start" icon={<Fingerprint className="h-4 w-4" />}>Verificar biometria</Button>
            <Button className="w-full justify-start" icon={<History className="h-4 w-4" />}>Histórico de acesso</Button>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Headphones className="h-5 w-5" />
          <div>
            <p className="text-sm">Precisa de ajuda?</p>
            <p className="text-xs text-zinc-400">Fale com o suporte</p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
