import type { ClientRecord, FinanceAccountRecord, FinanceRecord, SaleRecord } from "@noogym/types";
import type { FinanceKpi, FinanceSeries, FinanceSlice } from "../data/financeMock";

export const financePalette = {
  lime: "#B6FF00",
  red: "#FF2D20",
  yellow: "#FACC15",
  orange: "#F59E0B",
  blue: "#38BDF8",
  purple: "#A78BFA",
  cyan: "#2DD4BF",
  gray: "#94A3B8"
};

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const colors = [financePalette.lime, financePalette.orange, financePalette.blue, financePalette.purple, financePalette.cyan, financePalette.yellow, financePalette.gray];

export interface FinanceLocalInput {
  records: FinanceRecord[];
  sales: SaleRecord[];
  clients: ClientRecord[];
  accounts: FinanceAccountRecord[];
}

export interface FinanceLocalData {
  period: string;
  labels: string[];
  weekdays: string[];
  records: FinanceRecord[];
  recentRows: string[][];
  totals: {
    revenue: number;
    received: number;
    receivable: number;
    expenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    net: number;
    posRevenue: number;
    posTransactions: number;
  };
  overview: {
    kpis: FinanceKpi[];
    evolution: FinanceSeries[];
    categorySlices: FinanceSlice[];
    accountRows: string[][];
  };
  revenues: {
    kpis: FinanceKpi[];
    evolution: FinanceSeries[];
    weekday: number[];
    byCategory: FinanceSlice[];
    byPlan: FinanceSlice[];
    detailRows: string[][];
    methods: Array<[string, string, number]>;
    topClients: string[][];
  };
  expenses: {
    kpis: FinanceKpi[];
    evolution: FinanceSeries[];
    weekday: number[];
    byCategory: FinanceSlice[];
    byType: FinanceSlice[];
    detailRows: string[][];
    biggest: Array<[string, string, number]>;
  };
  cashFlow: {
    kpis: FinanceKpi[];
    evolution: FinanceSeries[];
    weekdayEntries: number[];
    weekdayExits: number[];
    dailyRows: string[][];
    origins: FinanceSlice[];
    exits: FinanceSlice[];
    currentBalance: number;
    initialBalance: number;
  };
  accounts: {
    currentBalance: number;
    initialBalance: number;
    cards: string[][];
    table: string[][];
    distribution: FinanceSlice[];
    transactions: string[][];
    cashByAccount: FinanceSeries[];
  };
  payments: {
    kpis: FinanceKpi[];
    evolution: FinanceSeries[];
    distribution: FinanceSlice[];
    transactions: number[];
    performanceRows: string[][];
    cardForms: FinanceSlice[];
  };
  overdue: {
    kpis: FinanceKpi[];
    evolution: FinanceSeries[];
    delayRanges: number[];
    origin: FinanceSlice[];
    clients: string[][];
    byPlan: FinanceSlice[];
    actions: string[][];
    total: number;
    count: number;
  };
}

export function buildLocalFinance(input: FinanceLocalInput): FinanceLocalData {
  const labels = recentDateLabels(7);
  const completedSales = input.sales.filter((sale) => !includesAny(sale.status ?? "", ["cancel", "reembolso"]));
  const revenueRecords = input.records.filter((record) => record.kind === "Receita");
  const expenseRecords = input.records.filter((record) => record.kind === "Despesa");
  const paidRevenue = sum(revenueRecords.filter((record) => isPaid(record.status)), (record) => record.value);
  const receivable = sum(revenueRecords.filter((record) => !isPaid(record.status)), (record) => record.value);
  const posRevenue = sum(completedSales, (sale) => sale.total);
  const paidExpenses = sum(expenseRecords.filter((record) => isPaid(record.status)), (record) => record.value);
  const pendingExpenses = sum(expenseRecords.filter((record) => !isPaid(record.status)), (record) => record.value);
  const totalRevenue = paidRevenue + receivable + posRevenue;
  const totalReceived = paidRevenue + posRevenue;
  const totalExpenses = paidExpenses + pendingExpenses;
  const net = totalReceived - paidExpenses;
  const revenueByCategory = groupValue([
    ...revenueRecords.map((record) => ({ key: record.category, value: record.value })),
    ...completedSales.map((sale) => ({ key: "Vendas POS", value: sale.total }))
  ]);
  const expenseByCategory = groupValue(expenseRecords.map((record) => ({ key: record.category, value: record.value })));
  const revenueSeries = seriesFromValues("Receitas", valuesBySlots([...revenueRecords.map((record) => record.value), ...completedSales.map((sale) => sale.total)]), financePalette.lime);
  const expenseSeries = seriesFromValues("Despesas", valuesBySlots(expenseRecords.map((record) => record.value)), financePalette.red);
  const netSeries = seriesFromValues("Saldo liquido", revenueSeries.values.map((value, index) => value - expenseSeries.values[index]), financePalette.blue);
  const weekdayRevenue = distributeWeek(totalReceived);
  const weekdayExpenses = distributeWeek(totalExpenses);
  const overdueClients = input.clients.filter(isOverdueClient);
  const overdueTotal = overdueClients.reduce((total, client) => total + overdueAmount(client), 0);
  const methodGroups = groupValue(completedSales.map((sale) => ({ key: sale.paymentMethod || "Dinheiro", value: sale.total })));
  const methodTransactions = groupCount(completedSales.map((sale) => sale.paymentMethod || "Dinheiro"));
  const accounts = buildAccounts(totalReceived, paidExpenses, input.records, completedSales, input.accounts);

  const data: FinanceLocalData = {
    period: currentPeriod(),
    labels,
    weekdays,
    records: input.records,
    recentRows: input.records.slice(0, 10).map((record) => [record.date, record.kind, record.category, money(record.value), record.status, record.note ?? "-"]),
    totals: {
      revenue: totalRevenue,
      received: totalReceived,
      receivable,
      expenses: totalExpenses,
      paidExpenses,
      pendingExpenses,
      net,
      posRevenue,
      posTransactions: completedSales.length
    },
    overview: {
      kpis: [
        kpi("Receita total", money(totalRevenue), "Receitas + vendas POS", "lime"),
        kpi("Receita recebida", money(totalReceived), `${completedSales.length} vendas POS`, "green"),
        kpi("Receita a receber", money(receivable), "Lancamentos pendentes", "yellow"),
        kpi("Despesas totais", money(totalExpenses), `${expenseRecords.length} lancamentos`, "red"),
        kpi("Lucro liquido", money(net), net >= 0 ? "Saldo positivo" : "Saldo negativo", net >= 0 ? "lime" : "red")
      ],
      evolution: [revenueSeries, expenseSeries, netSeries],
      categorySlices: slicesFromGroup(revenueByCategory, totalRevenue),
      accountRows: accounts.table
    },
    revenues: {
      kpis: [
        kpi("Receita total", money(totalRevenue), "Periodo atual", "lime"),
        kpi("Recebido", money(totalReceived), `${percent(totalReceived, totalRevenue)}% do total`, "green"),
        kpi("A receber", money(receivable), "Pendente", "yellow"),
        kpi("Vendas POS", money(posRevenue), `${completedSales.length} transacoes`, "purple"),
        kpi("Ticket medio POS", money(div(posRevenue, completedSales.length || 1)), "Media por venda", "blue")
      ],
      evolution: [revenueSeries, seriesFromValues("Media movel", movingAverage(revenueSeries.values), financePalette.gray)],
      weekday: weekdayRevenue,
      byCategory: slicesFromGroup(revenueByCategory, totalRevenue),
      byPlan: slicesFromGroup(groupValue(completedSales.filter((sale) => includesAny(sale.type, ["plano"])).map((sale) => ({ key: sale.customer || "Plano", value: sale.total }))), posRevenue),
      detailRows: rowsFromGroup(revenueByCategory, totalRevenue),
      methods: topEntries(methodGroups, 5).map(([label, value]) => [label, money(value), Math.round(percentNumber(value, totalReceived))]),
      topClients: topEntries(groupValue(completedSales.map((sale) => ({ key: sale.customer || "Consumidor final", value: sale.total }))), 5).map(([name, value]) => [name, money(value)])
    },
    expenses: {
      kpis: [
        kpi("Despesas totais", money(totalExpenses), "Pagas + pendentes", "red"),
        kpi("Despesas pagas", money(paidExpenses), "Saidas confirmadas", "red"),
        kpi("Despesas pendentes", money(pendingExpenses), "Aguardam pagamento", "yellow"),
        kpi("% da receita", `${percent(totalExpenses, totalRevenue)}%`, "Despesas / receita", "blue"),
        kpi("Maior categoria", topLabel(expenseByCategory) || "-", "Maior gasto", "purple")
      ],
      evolution: [expenseSeries, seriesFromValues("Media movel", movingAverage(expenseSeries.values), financePalette.gray)],
      weekday: weekdayExpenses,
      byCategory: slicesFromGroup(expenseByCategory, totalExpenses),
      byType: slicesFromGroup(groupValue(expenseRecords.map((record) => ({ key: isPaid(record.status) ? "Pagas" : "Pendentes", value: record.value }))), totalExpenses),
      detailRows: rowsFromGroup(expenseByCategory, totalExpenses),
      biggest: topEntries(expenseByCategory, 5).map(([label, value]) => [label, money(value), Math.round(percentNumber(value, totalExpenses))])
    },
    cashFlow: {
      kpis: [
        kpi("Entradas", money(totalReceived), "Recebidas", "lime"),
        kpi("Saidas", money(paidExpenses), "Pagas", "red"),
        kpi("Fluxo liquido", money(net), "Entradas - saidas", net >= 0 ? "lime" : "red"),
        kpi("Saldo atual", money(accounts.currentBalance), "Contas virtuais", "blue"),
        kpi("Pendente", money(receivable - pendingExpenses), "A receber - a pagar", "yellow")
      ],
      evolution: [revenueSeries, expenseSeries, netSeries],
      weekdayEntries: weekdayRevenue,
      weekdayExits: weekdayExpenses,
      dailyRows: labels.map((label, index) => {
        const entries = revenueSeries.values[index];
        const exits = expenseSeries.values[index];
        const flow = entries - exits;
        const balance = accounts.initialBalance + sum(netSeries.values.slice(0, index + 1), (value) => value);
        return [label, money(entries), money(exits), signedMoney(flow), money(balance)];
      }),
      origins: slicesFromGroup(revenueByCategory, totalRevenue),
      exits: slicesFromGroup(expenseByCategory, totalExpenses),
      currentBalance: accounts.currentBalance,
      initialBalance: accounts.initialBalance
    },
    accounts,
    payments: {
      kpis: [
        kpi("Receita por metodos", money(posRevenue), "Vendas POS", "lime"),
        kpi("Transacoes", int(completedSales.length), "Concluidas", "blue"),
        kpi("Ticket medio", money(div(posRevenue, completedSales.length || 1)), "Por metodo", "yellow"),
        kpi("Metodo lider", topLabel(methodGroups) || "-", "Maior volume", "purple"),
        kpi("Reembolsos/cancel.", money(sum(input.sales.filter((sale) => includesAny(sale.status ?? "", ["cancel", "reembolso"])), (sale) => sale.total)), "Fora do total", "red")
      ],
      evolution: topEntries(methodGroups, 4).map(([label, value], index) => seriesFromValues(label, distributeSlots(value), colors[index % colors.length])),
      distribution: slicesFromGroup(methodGroups, posRevenue),
      transactions: topEntries(methodTransactions, 4).map(([, value]) => value),
      performanceRows: topEntries(methodGroups, 6).map(([label, value]) => {
        const transactions = methodTransactions.get(label) ?? 0;
        return [label, money(value), `${percent(value, posRevenue)}%`, int(transactions), money(div(value, transactions || 1)), "Atual"];
      }),
      cardForms: slicesFromGroup(groupValue(completedSales.filter((sale) => includesAny(sale.paymentMethod, ["cart", "card"])).map((sale) => ({ key: sale.paymentMethod, value: sale.total }))), posRevenue)
    },
    overdue: {
      kpis: [
        kpi("Total em atraso", money(overdueTotal), `${overdueClients.length} clientes`, "red"),
        kpi("Clientes em atraso", int(overdueClients.length), "Status/vencimento", "yellow"),
        kpi("Ticket em atraso", money(div(overdueTotal, overdueClients.length || 1)), "Media por cliente", "yellow"),
        kpi("Taxa", `${percent(overdueClients.length, input.clients.length)}%`, "Da base de clientes", "purple"),
        kpi("A recuperar", money(overdueTotal), "Potencial", "lime")
      ],
      evolution: [seriesFromValues("Valor em atraso", distributeSlots(overdueTotal), financePalette.red), seriesFromValues("Clientes", distributeSlots(overdueClients.length), financePalette.gray)],
      delayRanges: delayRanges(overdueClients),
      origin: slicesFromGroup(groupValue(overdueClients.map((client) => ({ key: client.plan || "Sem plano", value: overdueAmount(client) }))), overdueTotal),
      clients: overdueClients.slice(0, 10).map((client) => [client.name, client.plan || "Sem plano", String(daysOverdue(client)), money(overdueAmount(client)), client.expires ?? "-"]),
      byPlan: slicesFromGroup(groupValue(overdueClients.map((client) => ({ key: client.plan || "Sem plano", value: overdueAmount(client) }))), overdueTotal),
      actions: [
        ["Enviar lembrete", "Clientes com vencimento recente", `${overdueClients.filter((client) => daysOverdue(client) <= 15).length} contas`, money(sum(overdueClients.filter((client) => daysOverdue(client) <= 15), overdueAmount)), "Enviar"],
        ["Ligar para cliente", "Atraso acima de 30 dias", `${overdueClients.filter((client) => daysOverdue(client) > 30).length} contas`, money(sum(overdueClients.filter((client) => daysOverdue(client) > 30), overdueAmount)), "Ligar"],
        ["Negociar acordo", "Planos bloqueados ou vencidos", `${overdueClients.length} contas`, money(overdueTotal), "Negociar"]
      ],
      total: overdueTotal,
      count: overdueClients.length
    }
  };

  return data;
}

function buildAccounts(received: number, paidExpenses: number, records: FinanceRecord[], sales: SaleRecord[], accounts: FinanceAccountRecord[]) {
  if (accounts.length) {
    const accountRows = accounts.map((account) => {
      const linkedRecords = records.filter((record) => record.accountId === account.id || record.accountName === account.name);
      const entries = sum(linkedRecords.filter((record) => record.kind === "Receita" && isPaid(record.status)), (record) => record.value) + inferredSalesForAccount(account, sales);
      const exits = sum(linkedRecords.filter((record) => record.kind === "Despesa" && isPaid(record.status)), (record) => record.value);
      const balance = account.balance + inferredSalesForAccount(account, sales);
      return [account.name, account.bank ?? "-", account.type, money(balance), money(balance), money(entries), money(exits), account.status];
    });
    const currentBalance = sum(accountRows, (row) => parseMoney(row[3]));
    const initialBalance = sum(accounts, (account) => account.openingBalance);
    const distributionGroup = new Map(accountRows.map((row) => [row[0], parseMoney(row[3])]));
    return {
      currentBalance,
      initialBalance,
      cards: accountRows.map((row, index) => [row[0], row[3], row[5], row[6], accounts[index]?.isDefault ? "Principal" : "", accounts[index]?.color ?? colors[index % colors.length]]),
      table: accountRows,
      distribution: slicesFromGroup(distributionGroup, currentBalance),
      transactions: records.slice(0, 10).map((record) => [record.date, record.accountName ?? "-", record.note ?? record.category, record.kind, record.category, `${record.kind === "Receita" ? "+" : "-"}${money(record.value)}`, money(currentBalance)]),
      cashByAccount: accountRows.map((row, index) => seriesFromValues(row[0], distributeSlots(parseMoney(row[5])), accounts[index]?.color ?? colors[index % colors.length]))
    };
  }

  const cash = sum(sales.filter((sale) => includesAny(sale.paymentMethod, ["dinheiro", "cash"])), (sale) => sale.total);
  const card = sum(sales.filter((sale) => includesAny(sale.paymentMethod, ["cart", "multi"])), (sale) => sale.total);
  const transfer = sum(sales.filter((sale) => includesAny(sale.paymentMethod, ["transfer", "pix", "refer"])), (sale) => sale.total);
  const otherRevenue = Math.max(0, received - cash - card - transfer);
  const accountValues: Array<[string, number, number]> = [
    ["Caixa principal", cash + otherRevenue * 0.4, paidExpenses * 0.2],
    ["Conta operacional", transfer + otherRevenue * 0.4, paidExpenses * 0.6],
    ["Conta cartoes", card + otherRevenue * 0.2, paidExpenses * 0.2]
  ];
  const rows = accountValues.map(([name, entries, exits], index) => {
    const balance = Math.max(0, entries - exits);
    return [name, index === 0 ? "Interno" : "Banco", index === 0 ? "Caixa" : "Corrente", money(balance), money(balance), money(entries), money(exits), balance > 0 ? "Ativa" : "Sem movimento"];
  });
  const currentBalance = sum(accountValues, ([, entries, exits]) => Math.max(0, entries - exits));
  const initialBalance = Math.max(0, currentBalance - (received - paidExpenses));
  const distributionGroup = new Map(accountValues.map(([name, entries, exits]) => [name, Math.max(0, entries - exits)]));
  return {
    currentBalance,
    initialBalance,
    cards: rows.map((row, index) => [row[0], row[3], row[5], row[6], index === 0 ? "Principal" : "", colors[index]]),
    table: rows,
    distribution: slicesFromGroup(distributionGroup, currentBalance),
    transactions: records.slice(0, 10).map((record) => [record.date, record.kind === "Receita" ? "Conta operacional" : "Caixa principal", record.note ?? record.category, record.kind, record.category, `${record.kind === "Receita" ? "+" : "-"}${money(record.value)}`, money(currentBalance)]),
    cashByAccount: accountValues.map(([name, entries], index) => seriesFromValues(name, distributeSlots(entries), colors[index]))
  };
}

function inferredSalesForAccount(account: FinanceAccountRecord, sales: SaleRecord[]) {
  const name = `${account.name} ${account.type}`.toLocaleLowerCase("pt-AO");
  return sum(sales.filter((sale) => {
    const method = sale.paymentMethod.toLocaleLowerCase("pt-AO");
    if (name.includes("cart") || name.includes("pos")) return includesAny(method, ["cart", "multi"]);
    if (name.includes("caixa")) return includesAny(method, ["dinheiro", "cash"]);
    return includesAny(method, ["transfer", "pix", "refer"]);
  }), (sale) => sale.total);
}

function kpi(title: string, value: string, change: string, tone: FinanceKpi["tone"]): FinanceKpi {
  return { title, value, change, tone };
}

function slicesFromGroup(group: Map<string, number>, total: number): FinanceSlice[] {
  const entries = topEntries(group, 6);
  if (!entries.length) return [{ label: "Sem dados", value: 0, amount: "0 Kz", color: colors[0] }];
  return entries.map(([label, value], index) => ({ label, value: percentNumber(value, total), amount: money(value), color: colors[index % colors.length] }));
}

function rowsFromGroup(group: Map<string, number>, total: number) {
  return topEntries(group, 8).map(([label, value]) => [label, money(value), `${percent(value, total)}%`, "Atual"]);
}

function seriesFromValues(name: string, values: number[], color: string): FinanceSeries {
  return { name, values: values.map((value) => Math.round(value)), color };
}

function valuesBySlots(values: number[]) {
  const slots = new Array(7).fill(0);
  values.forEach((value, index) => {
    slots[index % slots.length] += value;
  });
  return slots;
}

function distributeSlots(total: number) {
  const ratios = [0.1, 0.14, 0.11, 0.16, 0.2, 0.17, 0.12];
  return ratios.map((ratio) => total * ratio);
}

function distributeWeek(total: number) {
  return distributeSlots(total).map((value) => Math.round(value));
}

function movingAverage(values: number[]) {
  return values.map((_, index) => {
    const start = Math.max(0, index - 2);
    const slice = values.slice(start, index + 1);
    return div(sum(slice, (value) => value), slice.length || 1);
  });
}

function groupValue(items: Array<{ key: string; value: number }>) {
  const group = new Map<string, number>();
  items.forEach((item) => {
    const key = item.key || "Sem dados";
    group.set(key, (group.get(key) ?? 0) + item.value);
  });
  return group;
}

function groupCount(items: string[]) {
  const group = new Map<string, number>();
  items.forEach((item) => group.set(item || "Sem dados", (group.get(item || "Sem dados") ?? 0) + 1));
  return group;
}

function topEntries(group: Map<string, number>, limit = 5) {
  return [...group.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function topLabel(group: Map<string, number>) {
  return topEntries(group, 1)[0]?.[0] ?? "";
}

function isPaid(status: string) {
  return includesAny(status, ["recebido", "pago", "conclu"]);
}

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLocaleLowerCase("pt-AO");
  return needles.some((needle) => normalized.includes(needle));
}

function isOverdueClient(client: ClientRecord) {
  if (includesAny(client.status, ["atras", "bloque"])) return true;
  const expiry = parseDate(client.expires);
  return Boolean(expiry && expiry.getTime() < Date.now());
}

function daysOverdue(client: ClientRecord) {
  const expiry = parseDate(client.expires);
  if (!expiry) return includesAny(client.status, ["atras", "bloque"]) ? 30 : 0;
  return Math.max(0, Math.ceil((Date.now() - expiry.getTime()) / 86400000));
}

function overdueAmount(client: ClientRecord) {
  return planAmount(client.plan) || 10000;
}

function planAmount(value: string) {
  const parsed = Number(String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function delayRanges(clients: ClientRecord[]) {
  const ranges = [0, 0, 0, 0, 0];
  clients.forEach((client) => {
    const days = daysOverdue(client);
    if (days <= 15) ranges[0] += 1;
    else if (days <= 30) ranges[1] += 1;
    else if (days <= 60) ranges[2] += 1;
    else if (days <= 90) ranges[3] += 1;
    else ranges[4] += 1;
  });
  return ranges;
}

function parseDate(value?: string) {
  if (!value || includesAny(value, ["sem"])) return null;
  const [day, month, year] = value.split(/[/-]/).map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function recentDateLabels(count: number) {
  const formatter = new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit" });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index - 1));
    return formatter.format(date);
  });
}

function currentPeriod() {
  const formatter = new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" });
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return `${formatter.format(start)} - ${formatter.format(today)}`;
}

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function div(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function percent(value: number, total: number) {
  return Math.round(percentNumber(value, total)).toLocaleString("pt-AO");
}

function percentNumber(value: number, total: number) {
  return total > 0 ? Math.max(0, (value / total) * 100) : 0;
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function parseMoney(value: string) {
  const parsed = Number(String(value ?? "0").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function int(value: number) {
  return Math.round(value).toLocaleString("pt-AO");
}
