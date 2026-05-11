"use client";

import { Activity, CreditCard, UsersRound, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, MetricCard, Table } from "@noogym/ui";
import { calculateRevenue, countTodayCheckins, formatKz, formatPercent, percentageChange } from "@noogym/core";
import { createWebAdapter } from "@noogym/data-access/webAdapter";
import type { CheckinRecord, ClientRecord, FinanceRecord, SaleRecord } from "@noogym/types";

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);

  useEffect(() => {
    const data = createWebAdapter();
    void Promise.all([
      data.clients.list(),
      data.checkins.list(),
      data.sales.list(),
      data.finance.list()
    ]).then(([nextClients, nextCheckins, nextSales, nextFinance]) => {
      setClients(nextClients);
      setCheckins(nextCheckins);
      setSales(nextSales);
      setFinance(nextFinance);
    });
  }, []);

  const activeClients = useMemo(() => clients.filter((client) => client.status === "Ativo"), [clients]);
  const revenue = useMemo(() => calculateRevenue(sales), [sales]);
  const todayCheckins = useMemo(() => countTodayCheckins(checkins), [checkins]);
  const financeBalance = useMemo(() => finance.reduce((total, record) => total + record.value, 0), [finance]);

  return (
    <div className="p-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard title="Clientes ativos" value={String(activeClients.length)} change={formatPercent(percentageChange(activeClients.length, 1))} icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard title="Check-ins hoje" value={String(todayCheckins)} change="+ operacao local-first" icon={<Activity className="h-5 w-5" />} tone="blue" />
        <MetricCard title="Receita mockada" value={formatKz(revenue)} change="+ REST em breve" icon={<CreditCard className="h-5 w-5" />} tone="green" />
        <MetricCard title="Saldo financeiro" value={formatKz(financeBalance)} change="+ Kz Angola" icon={<Wallet className="h-5 w-5" />} tone="yellow" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Clientes recentes</h2>
              <p className="text-sm text-zinc-400">Dados vindos de @noogym/data-access/webAdapter</p>
            </div>
            <Badge tone="lime">Mock REST-ready</Badge>
          </div>
          <Table columns={["Cliente", "Plano", "Estado", "Vencimento"]}>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-white/[0.07]">
                <td className="px-4 py-3">{client.name}</td>
                <td className="px-4 py-3 text-zinc-300">{client.plan}</td>
                <td className="px-4 py-3"><Badge tone="green">{client.status}</Badge></td>
                <td className="px-4 py-3 text-zinc-300">{client.expires}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <aside className="grid content-start gap-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Arquitetura</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-300">
              <p>Next.js App Router</p>
              <p>UI compartilhada via @noogym/ui</p>
              <p>Regras puras via @noogym/core</p>
              <p>Tipos de dominio via @noogym/types</p>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Proximo backend</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Este adapter web fica pronto para trocar mocks por REST API com cookies/session sem importar Electron, SQLite, fs, path ou IPC.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
