import type { ReportConfig, ReportSection, ReportTabKey, TableColumn } from "../data/reportsMock";
import { reportsMock } from "../data/reportsMock";
import { apiRequest } from "./api";

type Entity = Record<string, unknown>;

export type ReportOverview = {
  totalMembers?: number;
  activeMembers?: number;
  overdueMembers?: number;
  activeSubscriptions?: number;
  revenueTotal?: number;
  expensesTotal?: number;
  netProfit?: number;
  checkinsToday?: number;
  weeklyFrequency?: number;
  activeWorkouts?: number;
  completedSales?: number;
  activeProducts?: number;
};

export const reportEndpointByKey: Record<ReportTabKey, string> = {
  financial: "/reports/financial",
  clients: "/reports/members",
  checkins: "/reports/checkins",
  plans: "/reports/sales",
  classes: "/reports/classes",
  workouts: "/reports/workouts",
  sales: "/reports/sales",
  products: "/reports/products",
  employees: "/reports/employees"
};

export const loadReportOverview = (token: string) => apiRequest<ReportOverview>("/reports/overview", { token });

export const loadReportConfig = async (key: ReportTabKey, token: string) => {
  const payload = await apiRequest<Entity>(reportEndpointByKey[key], { token });
  return reportConfigFromApi(key, payload);
};

const reportConfigFromApi = (key: ReportTabKey, payload: Entity): ReportConfig => {
  const base = cloneReport(reportsMock[key]);

  switch (key) {
    case "financial":
      return financialConfig(base, payload);
    case "clients":
      return clientsConfig(base, payload);
    case "checkins":
      return checkinsConfig(base, payload);
    case "plans":
      return plansConfig(base, payload);
    case "classes":
      return classesConfig(base, payload);
    case "workouts":
      return workoutsConfig(base, payload);
    case "sales":
      return salesConfig(base, payload);
    case "products":
      return productsConfig(base, payload);
    case "employees":
      return employeesConfig(base, payload);
  }
};

function financialConfig(config: ReportConfig, payload: Entity) {
  const revenue = num(payload.revenueTotal);
  const pendingRevenue = num(payload.pendingRevenue);
  const expenses = num(payload.expensesTotal);
  const pendingExpenses = num(payload.pendingExpenses);
  const net = num(payload.netProfit);

  config.kpis = [
    { title: "Receita recebida", value: money(revenue), change: "Atualizado pela API", icon: "circle-dollar-sign", tone: "lime" },
    { title: "Receita pendente", value: money(pendingRevenue), change: `${num(payload.pendingPaymentsCount)} pagamentos`, icon: "clock", tone: "yellow" },
    { title: "Despesas pagas", value: money(expenses), change: `${num(payload.paidExpensesCount)} lançamentos`, icon: "circle-x", tone: "red" },
    { title: "Despesas pendentes", value: money(pendingExpenses), change: `${num(payload.pendingExpensesCount)} lançamentos`, icon: "tag", tone: "orange" },
    { title: "Lucro líquido", value: money(net), change: net >= 0 ? "Resultado positivo" : "Resultado negativo", icon: "banknote", tone: net >= 0 ? "green" : "red" }
  ];
  replaceDonut(config, "Receita por categoria", money(revenue), [
    { label: "Recebido", value: percent(revenue, revenue + pendingRevenue), detail: money(revenue), color: "#B6FF00" },
    { label: "Pendente", value: percent(pendingRevenue, revenue + pendingRevenue), detail: money(pendingRevenue), color: "#FACC15" }
  ]);
  replaceSummary(config, "Resumo financeiro", [
    { label: "Receita total", value: money(revenue) },
    { label: "Receita pendente", value: money(pendingRevenue), tone: "yellow" },
    { label: "Despesas pagas", value: money(expenses), tone: "red" },
    { label: "Despesas pendentes", value: money(pendingExpenses), tone: "orange" },
    { label: "Lucro líquido", value: money(net), tone: net >= 0 ? "lime" : "red" }
  ]);
  return config;
}

function clientsConfig(config: ReportConfig, payload: Entity) {
  const byStatus = obj(payload.byStatus);
  const total = num(payload.total);
  const active = num(byStatus.active);
  const inactive = num(byStatus.inactive);
  const overdue = num(byStatus.overdue);
  const blocked = num(byStatus.blocked);
  const cancelled = num(byStatus.cancelled);

  config.kpis = [
    { title: "Total de clientes", value: int(total), change: "Atualizado pela API", icon: "users", tone: "lime" },
    { title: "Clientes ativos", value: int(active), change: `${percent(active, total).toFixed(1)}% do total`, icon: "user-check", tone: "blue" },
    { title: "Clientes inativos", value: int(inactive), icon: "user-x", tone: "purple" },
    { title: "Em atraso", value: int(overdue), icon: "circle-x", tone: "red" },
    { title: "Retenção operacional", value: `${percent(active, total).toFixed(1)}%`, change: "Base ativa / total", icon: "refresh-cw", tone: "green" }
  ];
  replaceDonutByTitleIncludes(config, "status", int(total), [
    { label: `Ativos (${active})`, value: percent(active, total), color: "#B6FF00" },
    { label: `Inativos (${inactive})`, value: percent(inactive, total), color: "#FACC15" },
    { label: `Em atraso (${overdue})`, value: percent(overdue, total), color: "#EF4444" },
    { label: `Bloqueados (${blocked})`, value: percent(blocked, total), color: "#A78BFA" },
    { label: `Cancelados (${cancelled})`, value: percent(cancelled, total), color: "#60A5FA" }
  ]);
  replaceTable(config, "Top clientes", [
    { key: "cliente", label: "Cliente" },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "status", label: "Status", align: "right" }
  ], rows(payload.recent).map((member) => ({
    cliente: str(member.name, "Cliente"),
    email: str(member.email, "-"),
    telefone: str(member.phone, "-"),
    status: status(str(member.status))
  })));
  return config;
}

function checkinsConfig(config: ReportConfig, payload: Entity) {
  const today = num(payload.today);
  const week = num(payload.week);
  const month = num(payload.month);
  config.kpis = [
    { title: "Check-ins hoje", value: int(today), change: "Atualizado pela API", icon: "circle-check", tone: "lime" },
    { title: "Check-ins na semana", value: int(week), icon: "calendar-days", tone: "blue" },
    { title: "Check-ins no mês", value: int(month), icon: "clock", tone: "yellow" },
    { title: "Média diária semanal", value: int(Math.round(week / 7)), icon: "refresh-cw", tone: "green" },
    { title: "Registros recentes", value: int(rows(payload.recent).length), icon: "user-check", tone: "purple" }
  ];
  replaceLastTable(config, [
    { key: "cliente", label: "Aluno" },
    { key: "unidade", label: "Unidade" },
    { key: "data", label: "Data e hora" },
    { key: "entrada", label: "Entrada" }
  ], rows(payload.recent).map((checkin) => ({
    cliente: str(obj(checkin.member).name, "Cliente"),
    unidade: str(obj(checkin.gym).name, "-"),
    data: date(str(checkin.checkedAt)),
    entrada: method(str(checkin.method))
  })));
  return config;
}

function plansConfig(config: ReportConfig, payload: Entity) {
  const plans = rows(payload.plans);
  const subscriptions = num(payload.subscriptionsTotal);
  const revenue = plans.reduce((sum, plan) => sum + num(plan.price) * num(plan.subscriptions), 0);
  config.kpis = [
    { title: "Assinaturas", value: int(subscriptions), change: "Atualizado pela API", icon: "clipboard-list", tone: "lime" },
    { title: "Planos com adesão", value: int(plans.filter((plan) => num(plan.subscriptions) > 0).length), icon: "file-plus-2", tone: "yellow" },
    { title: "Receita estimada", value: money(revenue), icon: "circle-dollar-sign", tone: "blue" },
    { title: "Plano líder", value: str(plans[0]?.name, "-"), icon: "trophy", tone: "purple" },
    { title: "Conversão", value: `${percent(num(plans[0]?.subscriptions), subscriptions).toFixed(1)}%`, icon: "users", tone: "green" }
  ];
  replaceTable(config, "Top planos", [
    { key: "plano", label: "Plano" },
    { key: "assinaturas", label: "Assinaturas", align: "right" },
    { key: "receita", label: "Receita estimada", align: "right" },
    { key: "percentual", label: "% da base", align: "right" }
  ], plans.slice(0, 8).map((plan) => ({
    plano: str(plan.name, "Plano"),
    assinaturas: int(num(plan.subscriptions)),
    receita: money(num(plan.price) * num(plan.subscriptions)),
    percentual: `${percent(num(plan.subscriptions), subscriptions).toFixed(1)}%`
  })));
  return config;
}

function classesConfig(config: ReportConfig, payload: Entity) {
  const byStatus = obj(payload.byStatus);
  const total = num(payload.total);
  config.kpis = [
    { title: "Total de aulas", value: int(total), change: "Atualizado pela API", icon: "calendar-days", tone: "purple" },
    { title: "Agendadas", value: int(num(byStatus.scheduled)), icon: "clock", tone: "blue" },
    { title: "Em andamento", value: int(num(byStatus.inProgress)), icon: "user", tone: "green" },
    { title: "Concluídas", value: int(num(byStatus.completed)), icon: "circle-check", tone: "lime" },
    { title: "Canceladas", value: int(num(byStatus.cancelled)), icon: "circle-x", tone: "red" }
  ];
  replaceLastTable(config, [
    { key: "aula", label: "Aula" },
    { key: "instrutor", label: "Instrutor" },
    { key: "horario", label: "Horário" },
    { key: "status", label: "Status", align: "right" }
  ], rows(payload.upcoming).map((lesson) => ({
    aula: str(lesson.name, "Aula"),
    instrutor: str(obj(lesson.instructor).name, "-"),
    horario: date(str(lesson.startAt)),
    status: status(str(lesson.status))
  })));
  return config;
}

function workoutsConfig(config: ReportConfig, payload: Entity) {
  const byStatus = obj(payload.byStatus);
  const total = num(payload.total);
  const activeAssignments = num(payload.activeAssignments);
  config.kpis = [
    { title: "Total de treinos", value: int(total), change: "Atualizado pela API", icon: "dumbbell", tone: "purple" },
    { title: "Treinos ativos", value: int(num(byStatus.active)), icon: "circle-check", tone: "lime" },
    { title: "Rascunhos", value: int(num(byStatus.draft)), icon: "file-plus-2", tone: "yellow" },
    { title: "Pausados", value: int(num(byStatus.paused)), icon: "clock", tone: "blue" },
    { title: "Alunos atribuídos", value: int(activeAssignments), icon: "users", tone: "green" }
  ];
  replaceDonutByTitleIncludes(config, "treinos", int(total), [
    { label: `Ativos (${num(byStatus.active)})`, value: percent(num(byStatus.active), total), color: "#B6FF00" },
    { label: `Rascunhos (${num(byStatus.draft)})`, value: percent(num(byStatus.draft), total), color: "#FACC15" },
    { label: `Pausados (${num(byStatus.paused)})`, value: percent(num(byStatus.paused), total), color: "#60A5FA" },
    { label: `Arquivados (${num(byStatus.archived)})`, value: percent(num(byStatus.archived), total), color: "#A78BFA" }
  ]);
  return config;
}

function salesConfig(config: ReportConfig, payload: Entity) {
  const posTotal = num(payload.posSalesTotal);
  const posCount = num(payload.posSalesCount);
  const total = num(payload.salesTotal);
  config.kpis = [
    { title: "Receita POS", value: money(posTotal), change: "Atualizado pela API", icon: "banknote", tone: "lime" },
    { title: "Transações POS", value: int(posCount), icon: "shopping-cart", tone: "yellow" },
    { title: "Ticket médio", value: money(posCount ? posTotal / posCount : 0), icon: "wallet-cards", tone: "blue" },
    { title: "Receita total paga", value: money(total), icon: "circle-dollar-sign", tone: "purple" },
    { title: "Pagamentos", value: int(num(payload.salesCount)), icon: "shopping-bag", tone: "green" }
  ];
  replaceLastTable(config, [
    { key: "hora", label: "Hora" },
    { key: "produto", label: "Produto" },
    { key: "cliente", label: "Cliente" },
    { key: "pagamento", label: "Forma de pagamento" },
    { key: "valor", label: "Valor", align: "right" }
  ], rows(payload.recentSales).map((sale) => ({
    hora: date(str(sale.soldAt)),
    produto: rows(sale.items)[0] ? str(rows(sale.items)[0].productName, "Venda POS") : "Venda POS",
    cliente: str(sale.customerName, str(obj(sale.member).name, "Consumidor final")),
    pagamento: method(str(sale.paymentMethod)),
    valor: money(num(sale.total))
  })));
  return config;
}

function productsConfig(config: ReportConfig, payload: Entity) {
  const total = num(payload.total);
  const byStatus = obj(payload.byStatus);
  const inventoryValue = num(payload.inventoryValue);
  config.kpis = [
    { title: "Produtos cadastrados", value: int(total), change: "Atualizado pela API", icon: "package", tone: "orange" },
    { title: "Produtos ativos", value: int(num(byStatus.active)), icon: "circle-check", tone: "lime" },
    { title: "Produtos inativos", value: int(num(byStatus.inactive)), icon: "circle-x", tone: "purple" },
    { title: "Estoque baixo", value: int(rows(payload.lowStock).length), icon: "tag", tone: "red" },
    { title: "Valor do estoque", value: money(inventoryValue), icon: "layers", tone: "green" }
  ];
  replaceTable(config, "Produtos mais vendidos", [
    { key: "produto", label: "Produto" },
    { key: "itens", label: "Itens vendidos", align: "right" },
    { key: "receita", label: "Receita", align: "right" }
  ], rows(payload.topItems).map((item) => ({
    produto: str(item.productName, "Produto"),
    itens: int(num(item.quantity)),
    receita: money(num(item.revenue))
  })));
  replaceTable(config, "Estoque baixo", [
    { key: "produto", label: "Produto" },
    { key: "atual", label: "Estoque atual", align: "right" },
    { key: "minimo", label: "Estoque mínimo", align: "right" },
    { key: "status", label: "Status", align: "right" }
  ], rows(payload.lowStock).map((product) => ({
    produto: str(product.name, "Produto"),
    atual: `${num(product.stock)} un.`,
    minimo: `${num(product.minStock)} un.`,
    status: "Baixo"
  })));
  return config;
}

function employeesConfig(config: ReportConfig, payload: Entity) {
  const byStatus = obj(payload.byStatus);
  const total = num(payload.total);
  config.kpis = [
    { title: "Total de funcionários", value: int(total), change: "Atualizado pela API", icon: "users", tone: "purple" },
    { title: "Ativos", value: int(num(byStatus.active)), icon: "user-check", tone: "lime" },
    { title: "Inativos", value: int(num(byStatus.inactive)), icon: "user-x", tone: "orange" },
    { title: "Licença", value: int(num(byStatus.onLeave)), icon: "calendar-x", tone: "blue" },
    { title: "Desligados", value: int(num(byStatus.terminated)), icon: "circle-x", tone: "red" }
  ];
  replaceTable(config, "Desempenho da equipe", [
    { key: "funcionario", label: "Funcionário" },
    { key: "funcao", label: "Função" },
    { key: "unidade", label: "Unidade" },
    { key: "aulas", label: "Aulas", align: "right" },
    { key: "status", label: "Status", align: "right" }
  ], rows(payload.recent).map((employee) => ({
    funcionario: str(employee.name, "Funcionário"),
    funcao: str(employee.role, "-"),
    unidade: str(obj(employee.gym).name, "-"),
    aulas: int(num(obj(employee._count).classes)),
    status: status(str(employee.status))
  })));
  return config;
}

function replaceTable(config: ReportConfig, title: string, columns: TableColumn[], tableRows: Array<Record<string, string>>) {
  config.sections = config.sections.map((section) => section.type === "table" && section.title === title ? { ...section, table: { ...section.table, columns, rows: tableRows } } : section);
}

function replaceLastTable(config: ReportConfig, columns: TableColumn[], tableRows: Array<Record<string, string>>) {
  const tableIndexes = config.sections.map((section, index) => section.type === "table" ? index : -1).filter((index) => index >= 0);
  const targetIndex = tableIndexes.at(-1);
  if (targetIndex === undefined) return;
  config.sections = config.sections.map((section, index) => section.type === "table" && index === targetIndex ? { ...section, table: { ...section.table, columns, rows: tableRows } } : section);
}

function replaceDonut(config: ReportConfig, title: string, center: string, items: Extract<ReportSection, { type: "donut" }>["items"]) {
  config.sections = config.sections.map((section) => section.type === "donut" && section.title === title ? { ...section, center, items } : section);
}

function replaceDonutByTitleIncludes(config: ReportConfig, needle: string, center: string, items: Extract<ReportSection, { type: "donut" }>["items"]) {
  config.sections = config.sections.map((section) => section.type === "donut" && section.title.toLowerCase().includes(needle.toLowerCase()) ? { ...section, center, items } : section);
}

function replaceSummary(config: ReportConfig, title: string, items: Extract<ReportSection, { type: "summary" }>["items"]) {
  config.sections = config.sections.map((section) => section.type === "summary" && section.title === title ? { ...section, items } : section);
}

function cloneReport(config: ReportConfig): ReportConfig {
  return {
    ...config,
    kpis: config.kpis.map((kpi) => ({ ...kpi })),
    sections: config.sections.map((section) => JSON.parse(JSON.stringify(section)) as ReportSection)
  };
}

function obj(value: unknown): Entity {
  return value && typeof value === "object" ? value as Entity : {};
}

function rows(value: unknown): Entity[] {
  return Array.isArray(value) ? value.map(obj) : [];
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function int(value: number) {
  return Math.round(value).toLocaleString("pt-AO");
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.max(0, (value / total) * 100) : 0;
}

function date(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "-";
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function status(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    OVERDUE: "Em atraso",
    BLOCKED: "Bloqueado",
    CANCELLED: "Cancelado",
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    ON_LEAVE: "Licença",
    TERMINATED: "Desligado",
    DRAFT: "Rascunho",
    PAUSED: "Pausado",
    ARCHIVED: "Arquivado"
  };
  return labels[value] ?? value;
}

function method(value: string) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    BANK_TRANSFER: "Transferência",
    CARD: "Cartão",
    MULTICAIXA: "Multicaixa",
    PIX: "PIX",
    DIRECT_DEBIT: "Débito direto",
    OTHER: "Outro",
    QR_CODE: "QR Code",
    MANUAL: "Manual",
    BIOMETRIC: "Biometria",
    APP: "App",
    NFC: "NFC"
  };
  return labels[value] ?? value;
}
