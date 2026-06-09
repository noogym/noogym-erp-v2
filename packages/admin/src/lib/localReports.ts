import type {
  CheckinRecord,
  ClassRecord,
  ClientRecord,
  EmployeeRecord,
  FinanceRecord,
  PlanRecord,
  ProductRecord,
  SaleRecord,
  WorkoutRecord
} from "@noogym/types";
import type { ReportConfig, ReportSection, ReportTabKey, ReportTone } from "../data/reportsMock";
import type { ReportOverview } from "./reportApi";

const weekLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const palette = ["#B6FF00", "#38BDF8", "#A855F7", "#F59E0B", "#2DD4BF", "#FB7185", "#94A3B8"];

export interface LocalReportsInput {
  clients: ClientRecord[];
  checkins: CheckinRecord[];
  plans: PlanRecord[];
  classes: ClassRecord[];
  workouts: WorkoutRecord[];
  sales: SaleRecord[];
  products: ProductRecord[];
  employees: EmployeeRecord[];
  finance: FinanceRecord[];
}

export function buildLocalReportOverview(input: LocalReportsInput): ReportOverview {
  const completedSales = input.sales.filter((sale) => !isCancelled(sale));
  const salesRevenue = sum(completedSales, (sale) => sale.total);
  const revenue = sum(input.finance.filter((record) => record.kind === "Receita" && isPaid(record.status)), (record) => record.value) + salesRevenue;
  const expenses = sum(input.finance.filter((record) => record.kind === "Despesa" && isPaid(record.status)), (record) => record.value);
  const activeMembers = input.clients.filter((client) => client.status === "Ativo").length;

  return {
    totalMembers: input.clients.length,
    activeMembers,
    overdueMembers: input.clients.filter((client) => includesAny(client.status, ["atras", "bloque"])).length,
    activeSubscriptions: input.clients.filter((client) => hasPlan(client)).length,
    revenueTotal: revenue,
    expensesTotal: expenses,
    netProfit: revenue - expenses,
    checkinsToday: input.checkins.filter((checkin) => isTodayLike(checkin.dateTime, checkin.checkedAtIso)).length,
    weeklyFrequency: input.checkins.length,
    activeWorkouts: input.workouts.filter((workout) => workout.status === "Ativo").length,
    completedSales: completedSales.length,
    activeProducts: input.products.filter((product) => product.status !== "Inativo").length
  };
}

export function buildLocalReportConfigs(input: LocalReportsInput): Record<ReportTabKey, ReportConfig> {
  return {
    financial: financialReport(input),
    clients: clientsReport(input),
    checkins: checkinsReport(input),
    plans: plansReport(input),
    classes: classesReport(input),
    workouts: workoutsReport(input),
    sales: salesReport(input),
    products: productsReport(input),
    employees: employeesReport(input)
  };
}

function financialReport(input: LocalReportsInput): ReportConfig {
  const completedSales = input.sales.filter((sale) => !isCancelled(sale));
  const salesRevenue = sum(completedSales, (sale) => sale.total);
  const paidRevenue = sum(input.finance.filter((record) => record.kind === "Receita" && isPaid(record.status)), (record) => record.value) + salesRevenue;
  const pendingRevenue = sum(input.finance.filter((record) => record.kind === "Receita" && !isPaid(record.status)), (record) => record.value);
  const expenses = sum(input.finance.filter((record) => record.kind === "Despesa" && isPaid(record.status)), (record) => record.value);
  const pendingExpenses = sum(input.finance.filter((record) => record.kind === "Despesa" && !isPaid(record.status)), (record) => record.value);
  const net = paidRevenue - expenses;
  const financeRows = input.finance.slice(0, 8).map((record) => ({
    data: record.date,
    tipo: record.kind,
    categoria: record.category,
    status: record.status,
    valor: money(record.value)
  }));

  return report("financial", "Financeiro", "Acompanhe receitas, despesas, lucro e recebimentos.", [
    kpi("Receita recebida", money(paidRevenue), "Financeiro + vendas POS", "circle-dollar-sign", "lime"),
    kpi("Receita pendente", money(pendingRevenue), "Recebimentos em aberto", "clock", "yellow"),
    kpi("Despesas pagas", money(expenses), "Lancamentos pagos", "circle-x", "red"),
    kpi("Despesas pendentes", money(pendingExpenses), "Aguardam pagamento", "tag", "orange"),
    kpi("Lucro liquido", money(net), net >= 0 ? "Resultado positivo" : "Resultado negativo", "banknote", net >= 0 ? "green" : "red")
  ], [
    line("Receita ao longo do tempo", valuesByRecentSlots(input.finance.filter((record) => record.kind === "Receita"), (record) => record.value), "Kz", "wide"),
    donut("Receita por origem", money(paidRevenue), [
      donutItem("Financeiro", paidRevenue - salesRevenue, paidRevenue),
      donutItem("Vendas POS", salesRevenue, paidRevenue),
      donutItem("Pendente", pendingRevenue, paidRevenue + pendingRevenue)
    ]),
    summary("Resultado financeiro", [
      { label: "Receita recebida", value: money(paidRevenue), tone: "lime" },
      { label: "Despesas pagas", value: money(expenses), tone: "red" },
      { label: "Resultado liquido", value: money(net), tone: net >= 0 ? "lime" : "red" },
      { label: "Fluxo em aberto", value: money(pendingRevenue - pendingExpenses), tone: pendingRevenue >= pendingExpenses ? "green" : "orange" }
    ]),
    table("Lancamentos recentes", [
      { key: "data", label: "Data" },
      { key: "tipo", label: "Tipo" },
      { key: "categoria", label: "Categoria" },
      { key: "status", label: "Status" },
      { key: "valor", label: "Valor", align: "right" }
    ], financeRows, "Ver todos")
  ]);
}

function clientsReport(input: LocalReportsInput): ReportConfig {
  const active = input.clients.filter((client) => client.status === "Ativo").length;
  const inactive = input.clients.filter((client) => client.status === "Inativo").length;
  const withPlan = input.clients.filter(hasPlan).length;
  const recent = input.clients.slice(0, 8);
  const planGroups = groupCount(input.clients, (client) => client.plan || "Sem plano");

  return report("clients", "Clientes", "Acompanhe crescimento, retencao e perfil dos clientes.", [
    kpi("Total de clientes", int(input.clients.length), "Base cadastrada", "users", "lime"),
    kpi("Clientes ativos", int(active), `${pct(active, input.clients.length)}% do total`, "user-check", "blue"),
    kpi("Clientes inativos", int(inactive), "Sem atividade", "user-x", "purple"),
    kpi("Clientes com plano", int(withPlan), `${pct(withPlan, input.clients.length)}% vinculados`, "clipboard-list", "green"),
    kpi("Check-ins registrados", int(input.checkins.length), "Historico local", "circle-check", "yellow")
  ], [
    line("Crescimento de clientes", cumulativeSeries(input.clients.length), undefined, "wide"),
    donut("Distribuicao por status", int(input.clients.length), [
      donutItem("Ativos", active, input.clients.length),
      donutItem("Inativos", inactive, input.clients.length),
      donutItem("Outros", input.clients.length - active - inactive, input.clients.length)
    ]),
    horizontal("Clientes por plano", topLabels(planGroups, 6), topValues(planGroups, 6), " clientes"),
    table("Clientes recentes", [
      { key: "cliente", label: "Cliente" },
      { key: "plano", label: "Plano" },
      { key: "status", label: "Status" },
      { key: "ultimo", label: "Ultimo check-in", align: "right" }
    ], recent.map((client) => ({
      cliente: client.name,
      plano: client.plan || "Sem plano",
      status: client.status,
      ultimo: client.lastCheckin || "Sem check-in"
    })), "Ver todos os clientes")
  ]);
}

function checkinsReport(input: LocalReportsInput): ReportConfig {
  const today = input.checkins.filter((checkin) => isTodayLike(checkin.dateTime, checkin.checkedAtIso)).length;
  const uniqueClients = new Set(input.checkins.map((checkin) => checkin.clientId)).size;
  const typeGroups = groupCount(input.checkins, (checkin) => checkin.type || "Manual");
  const clientPlan = new Map(input.clients.map((client) => [client.id, client.plan || "Sem plano"]));
  const planGroups = groupCount(input.checkins, (checkin) => clientPlan.get(checkin.clientId) ?? "Sem plano");

  return report("checkins", "Check-ins", "Acompanhe frequencia, horarios de pico e acesso a unidade.", [
    kpi("Total de check-ins", int(input.checkins.length), "Historico local", "circle-check", "lime"),
    kpi("Check-ins hoje", int(today), "Registros do dia", "calendar-days", "blue"),
    kpi("Clientes unicos", int(uniqueClients), "Alunos com entrada", "user-check", "yellow"),
    kpi("Media por cliente", decimal(div(input.checkins.length, Math.max(uniqueClients, 1))), "Check-ins / cliente", "refresh-cw", "green"),
    kpi("Tipo principal", topLabel(typeGroups), "Metodo mais usado", "clock", "purple")
  ], [
    line("Check-ins ao longo do tempo", valuesByRecentSlots(input.checkins, () => 1), undefined, "wide"),
    bar("Check-ins por dia da semana", weekLabels, weekDistribution(input.checkins)),
    heatmap("Horarios de pico", input.checkins),
    donut("Check-ins por plano", int(input.checkins.length), topEntries(planGroups, 5).map(([label, value], index) => ({
      label,
      value: percentValue(value, input.checkins.length),
      detail: int(value),
      color: palette[index % palette.length]
    }))),
    table("Ultimos check-ins", [
      { key: "cliente", label: "Aluno" },
      { key: "tipo", label: "Tipo" },
      { key: "data", label: "Data e hora" },
      { key: "acesso", label: "Acesso", align: "right" }
    ], input.checkins.slice(0, 8).map((checkin) => ({
      cliente: checkin.clientName,
      tipo: checkin.type,
      data: checkin.dateTime,
      acesso: checkin.accessType
    })), "Ver todos")
  ]);
}

function plansReport(input: LocalReportsInput): ReportConfig {
  const activePlans = input.plans.filter((plan) => plan.status === "Ativo");
  const clientGroups = groupCount(input.clients.filter(hasPlan), (client) => client.plan);
  const estimatedRevenue = input.plans.reduce((total, plan) => total + planAmount(plan) * Math.max(plan.clients, clientGroups.get(plan.name) ?? 0), 0);
  const topPlan = topLabel(clientGroups) || "-";

  return report("plans", "Planos", "Acompanhe adesao, receita estimada e distribuicao dos planos.", [
    kpi("Planos ativos", int(activePlans.length), `${input.plans.length} cadastrados`, "clipboard-list", "lime"),
    kpi("Clientes em planos", int(input.clients.filter(hasPlan).length), "Vinculos ativos", "users", "yellow"),
    kpi("Receita estimada", money(estimatedRevenue), "Com base nos clientes", "circle-dollar-sign", "blue"),
    kpi("Ticket medio", money(div(estimatedRevenue, Math.max(input.clients.filter(hasPlan).length, 1))), "Por cliente com plano", "wallet-cards", "green"),
    kpi("Plano lider", topPlan, "Maior adesao", "trophy", "purple")
  ], [
    line("Receita estimada de planos", cumulativeSeries(estimatedRevenue / 1000), "K", "wide"),
    donut("Distribuicao por plano", int(input.clients.filter(hasPlan).length), topEntries(clientGroups, 6).map(([label, value], index) => ({
      label,
      value: percentValue(value, input.clients.filter(hasPlan).length),
      detail: int(value),
      color: planColor(input.plans.find((plan) => plan.name === label), index)
    }))),
    horizontal("Planos por categoria", topLabels(groupCount(input.plans, (plan) => plan.category), 6), topValues(groupCount(input.plans, (plan) => plan.category), 6), " planos"),
    table("Top planos", [
      { key: "plano", label: "Plano" },
      { key: "categoria", label: "Categoria" },
      { key: "clientes", label: "Clientes", align: "right" },
      { key: "receita", label: "Receita estimada", align: "right" }
    ], input.plans.slice(0, 8).map((plan) => {
      const clients = Math.max(plan.clients, clientGroups.get(plan.name) ?? 0);
      return { plano: plan.name, categoria: plan.category, clientes: int(clients), receita: money(planAmount(plan) * clients) };
    }), "Ver planos")
  ]);
}

function classesReport(input: LocalReportsInput): ReportConfig {
  const participants = sum(input.classes, (lesson) => lesson.participants);
  const seats = sum(input.classes, (lesson) => lesson.seats);
  const scheduled = input.classes.filter((lesson) => lesson.status === "Agendada").length;
  const statusGroups = groupCount(input.classes, (lesson) => lesson.status);

  return report("classes", "Aulas", "Acompanhe turmas, ocupacao e participacao dos alunos.", [
    kpi("Total de aulas", int(input.classes.length), "Modelos e sessoes", "calendar-days", "purple"),
    kpi("Aulas agendadas", int(scheduled), "Proximas aulas", "clock", "blue"),
    kpi("Participantes", int(participants), "Presencas registradas", "users", "orange"),
    kpi("Ocupacao media", `${pct(participants, seats)}%`, `${int(seats)} vagas`, "star", "yellow"),
    kpi("Instrutores", int(new Set(input.classes.map((lesson) => lesson.instructor)).size), "Equipe envolvida", "user", "green")
  ], [
    bar("Participantes por aula", input.classes.slice(0, 7).map((lesson) => lesson.name), input.classes.slice(0, 7).map((lesson) => lesson.participants), "wide"),
    donut("Aulas por status", int(input.classes.length), topEntries(statusGroups, 5).map(([label, value], index) => ({
      label,
      value: percentValue(value, input.classes.length),
      detail: int(value),
      color: palette[index % palette.length]
    }))),
    horizontal("Participacao por categoria", topLabels(groupCount(input.classes, (lesson) => lesson.category), 6), topValues(groupCount(input.classes, (lesson) => lesson.category), 6), " aulas"),
    table("Aulas recentes", [
      { key: "aula", label: "Aula" },
      { key: "instrutor", label: "Instrutor" },
      { key: "horario", label: "Horario" },
      { key: "ocupacao", label: "Ocupacao", align: "right" }
    ], input.classes.slice(0, 8).map((lesson) => ({
      aula: lesson.name,
      instrutor: lesson.instructor,
      horario: lesson.time,
      ocupacao: `${lesson.participants}/${lesson.seats}`
    })), "Ver aulas")
  ]);
}

function workoutsReport(input: LocalReportsInput): ReportConfig {
  const active = input.workouts.filter((workout) => workout.status === "Ativo").length;
  const exerciseTotal = sum(input.workouts, (workout) => workout.exercises);
  const statusGroups = groupCount(input.workouts, (workout) => workout.status);
  const goalGroups = groupCount(input.workouts, (workout) => workout.goal);

  return report("workouts", "Treinos", "Acompanhe criacao, adesao e objetivos dos treinos.", [
    kpi("Total de treinos", int(input.workouts.length), "Biblioteca e atribuicoes", "dumbbell", "purple"),
    kpi("Treinos ativos", int(active), `${pct(active, input.workouts.length)}% ativos`, "circle-check", "lime"),
    kpi("Exercicios", int(exerciseTotal), "Nos treinos cadastrados", "layers", "yellow"),
    kpi("Alunos com treino", int(new Set(input.workouts.map((workout) => workout.clientId ?? workout.client)).size), "Atribuicoes", "users", "green"),
    kpi("Objetivo lider", topLabel(goalGroups) || "-", "Mais usado", "trophy", "blue")
  ], [
    line("Evolucao de treinos", cumulativeSeries(input.workouts.length), undefined, "wide"),
    donut("Treinos por status", int(input.workouts.length), topEntries(statusGroups, 5).map(([label, value], index) => ({
      label,
      value: percentValue(value, input.workouts.length),
      detail: int(value),
      color: palette[index % palette.length]
    }))),
    horizontal("Treinos por objetivo", topLabels(goalGroups, 6), topValues(goalGroups, 6), " treinos"),
    table("Treinos recentes", [
      { key: "treino", label: "Treino" },
      { key: "aluno", label: "Aluno" },
      { key: "objetivo", label: "Objetivo" },
      { key: "exercicios", label: "Exercicios", align: "right" }
    ], input.workouts.slice(0, 8).map((workout) => ({
      treino: workout.name,
      aluno: workout.client,
      objetivo: workout.goal,
      exercicios: int(workout.exercises)
    })), "Ver treinos")
  ]);
}

function salesReport(input: LocalReportsInput): ReportConfig {
  const completed = input.sales.filter((sale) => !isCancelled(sale) && !isQuote(sale));
  const quotes = input.sales.filter(isQuote);
  const revenue = sum(completed, (sale) => sale.total);
  const discounts = sum(input.sales, (sale) => sale.discountAmount ?? 0);
  const itemsSold = sum(completed, (sale) => sum(sale.items ?? [], (item) => item.quantity));
  const methodGroups = groupValue(completed, (sale) => sale.paymentMethod, (sale) => sale.total);

  return report("sales", "Vendas (POS)", "Acompanhe desempenho do caixa, pagamentos e itens vendidos.", [
    kpi("Receita POS", money(revenue), "Vendas concluidas", "banknote", "lime"),
    kpi("Transacoes", int(completed.length), `${quotes.length} orcamentos`, "shopping-cart", "yellow"),
    kpi("Ticket medio", money(div(revenue, Math.max(completed.length, 1))), "Por venda", "wallet-cards", "blue"),
    kpi("Itens vendidos", int(itemsSold), "Produtos/servicos", "shopping-bag", "purple"),
    kpi("Descontos", money(discounts), "Concedidos no caixa", "tag", "red")
  ], [
    line("Receita POS ao longo do tempo", valuesByRecentSlots(completed, (sale) => sale.total / 1000), "K", "wide"),
    donut("Receita por forma de pagamento", money(revenue), topEntries(methodGroups, 6).map(([label, value], index) => ({
      label,
      value: percentValue(value, revenue),
      detail: money(value),
      color: palette[index % palette.length]
    }))),
    table("Ultimas vendas", [
      { key: "data", label: "Data" },
      { key: "cliente", label: "Cliente" },
      { key: "pagamento", label: "Pagamento" },
      { key: "valor", label: "Valor", align: "right" }
    ], input.sales.slice(0, 8).map((sale) => ({
      data: sale.dateTime,
      cliente: sale.customer || "Consumidor final",
      pagamento: sale.paymentMethod,
      valor: money(sale.total)
    })), "Ver vendas"),
    table("Itens mais vendidos", [
      { key: "item", label: "Item" },
      { key: "quantidade", label: "Quantidade", align: "right" },
      { key: "receita", label: "Receita", align: "right" }
    ], topSaleItems(input.sales), "Ver itens")
  ]);
}

function productsReport(input: LocalReportsInput): ReportConfig {
  const active = input.products.filter((product) => product.status !== "Inativo").length;
  const lowStock = input.products.filter((product) => product.stock <= (product.minStock ?? 0));
  const stockValue = sum(input.products, (product) => product.stock * product.price);
  const costValue = sum(input.products, (product) => product.stock * product.cost);
  const soldByProduct = topSaleItems(input.sales);

  return report("products", "Produtos", "Acompanhe estoque, valor em loja e desempenho dos produtos.", [
    kpi("Produtos cadastrados", int(input.products.length), `${active} ativos`, "package", "orange"),
    kpi("Valor do estoque", money(stockValue), "Preco de venda", "layers", "lime"),
    kpi("Custo em estoque", money(costValue), "Custo contabil", "circle-dollar-sign", "blue"),
    kpi("Estoque baixo", int(lowStock.length), "Abaixo do minimo", "tag", "red"),
    kpi("Categorias", int(new Set(input.products.map((product) => product.category)).size), "Organizacao", "shopping-bag", "green")
  ], [
    horizontal("Estoque por categoria", topLabels(groupValue(input.products, (product) => product.category, (product) => product.stock), 6), topValues(groupValue(input.products, (product) => product.category, (product) => product.stock), 6), " un."),
    donut("Valor por categoria", money(stockValue), topEntries(groupValue(input.products, (product) => product.category, (product) => product.stock * product.price), 6).map(([label, value], index) => ({
      label,
      value: percentValue(value, stockValue),
      detail: money(value),
      color: palette[index % palette.length]
    }))),
    table("Produtos mais vendidos", [
      { key: "item", label: "Produto" },
      { key: "quantidade", label: "Quantidade", align: "right" },
      { key: "receita", label: "Receita", align: "right" }
    ], soldByProduct, "Ver produtos"),
    table("Estoque baixo", [
      { key: "produto", label: "Produto" },
      { key: "categoria", label: "Categoria" },
      { key: "atual", label: "Atual", align: "right" },
      { key: "minimo", label: "Minimo", align: "right" }
    ], lowStock.slice(0, 8).map((product) => ({
      produto: product.name,
      categoria: product.category,
      atual: `${product.stock} un.`,
      minimo: `${product.minStock ?? 0} un.`
    })), "Ver estoque")
  ]);
}

function employeesReport(input: LocalReportsInput): ReportConfig {
  const active = input.employees.filter((employee) => employee.status === "Ativo").length;
  const blocked = input.employees.filter((employee) => includesAny(employee.accessStatus ?? "", ["bloque", "susp"])).length;
  const invited = input.employees.filter((employee) => includesAny(employee.accountStatus ?? "", ["convite"])).length;
  const payroll = sum(input.employees, (employee) => parseMoney(employee.salary));
  const roleGroups = groupCount(input.employees, (employee) => employee.role);

  return report("employees", "Funcionarios", "Acompanhe equipa, funcoes, acessos e folha estimada.", [
    kpi("Funcionarios ativos", int(active), `${input.employees.length} cadastrados`, "users", "purple"),
    kpi("Folha estimada", money(payroll), "Salarios informados", "circle-dollar-sign", "lime"),
    kpi("Acessos bloqueados", int(blocked), "Controle de seguranca", "circle-x", "red"),
    kpi("Convites pendentes", int(invited), "Aguardam ativacao", "user-plus", "yellow"),
    kpi("Funcoes", int(new Set(input.employees.map((employee) => employee.role)).size), "Perfis usados", "clipboard-list", "blue")
  ], [
    donut("Distribuicao por funcao", int(input.employees.length), topEntries(roleGroups, 6).map(([label, value], index) => ({
      label,
      value: percentValue(value, input.employees.length),
      detail: int(value),
      color: palette[index % palette.length]
    }))),
    horizontal("Funcionarios por departamento", topLabels(groupCount(input.employees, (employee) => employee.department || "Sem departamento"), 6), topValues(groupCount(input.employees, (employee) => employee.department || "Sem departamento"), 6), " func."),
    summary("Acesso ao sistema", [
      { label: "Liberado", value: int(input.employees.filter((employee) => employee.accessStatus === "Liberado").length), tone: "lime" },
      { label: "Convite pendente", value: int(invited), tone: "yellow" },
      { label: "Bloqueado", value: int(blocked), tone: "red" },
      { label: "Sem acesso", value: int(input.employees.filter((employee) => employee.accountMode === "Sem acesso").length), tone: "orange" }
    ]),
    table("Equipe", [
      { key: "funcionario", label: "Funcionario" },
      { key: "funcao", label: "Funcao" },
      { key: "turno", label: "Turno" },
      { key: "acesso", label: "Acesso", align: "right" }
    ], input.employees.slice(0, 8).map((employee) => ({
      funcionario: employee.name,
      funcao: employee.role,
      turno: employee.shift || "-",
      acesso: employee.accessStatus || "Sem acesso"
    })), "Ver funcionarios")
  ]);
}

function report(key: ReportTabKey, label: string, subtitle: string, kpis: ReportConfig["kpis"], sections: ReportSection[]): ReportConfig {
  return { key, label, subtitle, kpis, sections };
}

function kpi(title: string, value: string, detail: string, icon: string, tone: ReportTone) {
  return { title, value, change: detail, icon, tone };
}

function line(title: string, values: number[], unit?: string, span?: "wide" | "normal"): ReportSection {
  return { type: "line", title, span, control: "Ultimos 7 pontos", series: { labels: recentLabels(values.length), values, compare: previousValues(values), unit } };
}

function bar(title: string, labels: string[], values: number[], span?: "wide" | "normal"): ReportSection {
  return { type: "bar", title, span, control: "Total", series: { labels: labels.length ? labels : ["Sem dados"], values: values.length ? values : [0] } };
}

function horizontal(title: string, labels: string[], values: number[], suffix?: string): ReportSection {
  return { type: "horizontal", title, labels: labels.length ? labels : ["Sem dados"], values: values.length ? values : [0], suffix };
}

function donut(title: string, center: string, items: Extract<ReportSection, { type: "donut" }>["items"]): ReportSection {
  return { type: "donut", title, center, items: items.length ? items : [{ label: "Sem dados", value: 0, color: palette[0] }] };
}

function summary(title: string, items: Extract<ReportSection, { type: "summary" }>["items"]): ReportSection {
  return { type: "summary", title, items };
}

function table(title: string, columns: Extract<ReportSection, { type: "table" }>["table"]["columns"], rows: Array<Record<string, string>>, actionLabel?: string): ReportSection {
  return { type: "table", title, span: "wide", table: { columns, rows: rows.length ? rows : [emptyRow(columns)], actionLabel } };
}

function heatmap(title: string, checkins: CheckinRecord[]): ReportSection {
  const rows = ["06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h"];
  const values = rows.map((row) => {
    const hour = Number(row.slice(0, 2));
    return weekLabels.map((_, dayIndex) => {
      const base = checkins.filter((checkin) => {
        const date = dateFromRecord(checkin.checkedAtIso ?? checkin.dateTime);
        return date ? date.getDay() === ((dayIndex + 1) % 7) : false;
      }).length;
      const peak = hour >= 16 && hour <= 20 ? 2.2 : hour >= 6 && hour <= 10 ? 1.6 : 1;
      return Math.min(100, Math.round(base * peak * 12));
    });
  });
  return { type: "heatmap", title, control: "Por hora", rows, columns: weekLabels, values, lowLabel: "Baixo", highLabel: "Alto" };
}

function topSaleItems(sales: SaleRecord[]) {
  const items = new Map<string, { quantity: number; revenue: number }>();
  sales.forEach((sale) => {
    if (isCancelled(sale)) return;
    (sale.items ?? []).forEach((item) => {
      const key = item.name || "Item POS";
      const current = items.get(key) ?? { quantity: 0, revenue: 0 };
      items.set(key, { quantity: current.quantity + item.quantity, revenue: current.revenue + item.quantity * item.unitPrice });
    });
  });

  return [...items.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 8)
    .map(([item, value]) => ({ item, quantidade: int(value.quantity), receita: money(value.revenue) }));
}

function groupCount<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item) || "Sem dados";
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });
  return groups;
}

function groupValue<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  const groups = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item) || "Sem dados";
    groups.set(key, (groups.get(key) ?? 0) + getValue(item));
  });
  return groups;
}

function topEntries(groups: Map<string, number>, limit = 5) {
  return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function topLabels(groups: Map<string, number>, limit = 5) {
  return topEntries(groups, limit).map(([label]) => label);
}

function topValues(groups: Map<string, number>, limit = 5) {
  return topEntries(groups, limit).map(([, value]) => value);
}

function topLabel(groups: Map<string, number>) {
  return topEntries(groups, 1)[0]?.[0] ?? "";
}

function valuesByRecentSlots<T>(items: T[], getValue: (item: T) => number) {
  const values = new Array(7).fill(0);
  items.forEach((item, index) => {
    const slot = Math.min(6, Math.floor((index / Math.max(items.length, 1)) * 7));
    values[slot] += getValue(item);
  });
  return values.map((value) => Math.round(value));
}

function cumulativeSeries(total: number) {
  const safeTotal = Math.max(0, total);
  return [0.35, 0.48, 0.56, 0.65, 0.78, 0.88, 1].map((ratio) => Math.round(safeTotal * ratio));
}

function previousValues(values: number[]) {
  return values.map((value, index) => Math.max(0, Math.round(value * (0.72 + index * 0.025))));
}

function weekDistribution(checkins: CheckinRecord[]) {
  const values = new Array(7).fill(0);
  checkins.forEach((checkin, index) => {
    const date = dateFromRecord(checkin.checkedAtIso ?? checkin.dateTime);
    const day = date ? (date.getDay() + 6) % 7 : index % 7;
    values[day] += 1;
  });
  return values;
}

function recentLabels(length: number) {
  return Array.from({ length }, (_, index) => `P${index + 1}`);
}

function donutItem(label: string, value: number, total: number) {
  const index = Math.abs(label.length) % palette.length;
  return { label, value: percentValue(value, total), detail: int(value), color: palette[index] };
}

function planColor(plan: PlanRecord | undefined, index: number) {
  return plan?.color ?? palette[index % palette.length];
}

function planAmount(plan: PlanRecord) {
  return parseMoney(plan.price);
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "0").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function div(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function percentValue(value: number, total: number) {
  return total > 0 ? Math.max(0, (value / total) * 100) : 0;
}

function pct(value: number, total: number) {
  return Math.round(percentValue(value, total)).toLocaleString("pt-AO");
}

function int(value: number) {
  return Math.round(value).toLocaleString("pt-AO");
}

function decimal(value: number) {
  return value.toLocaleString("pt-AO", { maximumFractionDigits: 1 });
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function isPaid(status: string) {
  return includesAny(status, ["recebido", "pago", "conclu"]);
}

function isCancelled(sale: SaleRecord) {
  return includesAny(sale.status ?? "", ["cancel", "reembolso"]);
}

function isQuote(sale: SaleRecord) {
  return includesAny(`${sale.type} ${sale.status ?? ""}`, ["orcamento", "orçamento"]);
}

function hasPlan(client: ClientRecord) {
  return Boolean(client.plan && client.plan !== "Sem plano");
}

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLocaleLowerCase("pt-AO");
  return needles.some((needle) => normalized.includes(needle));
}

function isTodayLike(label: string, iso?: string) {
  if (label.startsWith("Hoje")) return true;
  const date = dateFromRecord(iso ?? label);
  return date ? date.toDateString() === new Date().toDateString() : false;
}

function dateFromRecord(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function emptyRow(columns: Extract<ReportSection, { type: "table" }>["table"]["columns"]) {
  return columns.reduce<Record<string, string>>((row, column) => {
    row[column.key] = "-";
    return row;
  }, {});
}
