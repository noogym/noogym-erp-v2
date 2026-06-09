import type {
  CheckinRecord,
  ClassRecord,
  ClientRecord,
  EmployeeRecord,
  FinanceRecord,
  PlanCategoryRecord,
  PlanRecord,
  ProductRecord,
  SaleRecord,
  SaleItemRecord,
  WorkoutRecord
} from "@noogym/types";
import { apiPath, apiRequest, type PaginatedResponse } from "./api";

type Entity = Record<string, unknown>;

export type ResourceName = "members" | "plans" | "plan-categories" | "products" | "checkins" | "sales" | "classes" | "employees" | "workouts";

export const listResource = async <T>(resource: ResourceName, token: string) => {
  const response = await apiRequest<PaginatedResponse<T>>(apiPath(`/${resource}`, { limit: 100 }), { token });
  return response.items;
};

export const createResource = <T>(resource: ResourceName, token: string, body: unknown) =>
  apiRequest<T>(`/${resource}`, { method: "POST", token, body });

export const updateResource = <T>(resource: ResourceName, id: string, token: string, body: unknown) =>
  apiRequest<T>(`/${resource}/${id}`, { method: "PATCH", token, body });

export const deleteResource = <T>(resource: ResourceName, id: string, token: string) =>
  apiRequest<T>(`/${resource}/${id}`, { method: "DELETE", token });

export const createSubscription = (token: string, body: { memberId: string; planId: string; startDate?: string; autoRenew?: boolean }) =>
  apiRequest<Entity>("/subscriptions", { method: "POST", token, body });

export const listFinanceRecords = async (token: string) => {
  const [payments, expenses] = await Promise.all([
    apiRequest<PaginatedResponse<Entity>>(apiPath("/payments", { limit: 100 }), { token }),
    apiRequest<PaginatedResponse<Entity>>(apiPath("/expenses", { limit: 100 }), { token })
  ]);

  return [
    ...payments.items.map(paymentToFinanceRecord),
    ...expenses.items.map(expenseToFinanceRecord)
  ].sort((a, b) => b.id.localeCompare(a.id));
};

export const createRevenue = (token: string, record: Partial<FinanceRecord>) =>
  apiRequest<Entity>("/payments", { method: "POST", token, body: financeRecordToPaymentDto(record) });

export const createExpense = (token: string, record: Partial<FinanceRecord>) =>
  apiRequest<Entity>("/expenses", { method: "POST", token, body: financeRecordToExpenseDto(record) });

export const clientFromApi = (member: Entity): ClientRecord => {
  const subscription = first<Entity>(member.subscriptions);
  const plan = getEntity(subscription?.plan);
  const expires = asDate(subscription?.endDate);
  const lastCheckin = first<Entity>(member.checkIns);

  return {
    id: asString(member.id),
    name: asString(member.name, "Cliente Noogym"),
    phone: asString(member.phone, "+244 900 000 000"),
    email: asString(member.email, "cliente@email.com"),
    plan: asString(plan?.name, "Sem plano"),
    planId: asString(subscription?.planId ?? plan?.id, undefined),
    planTone: member.status === "OVERDUE" ? "red" : "lime",
    status: statusLabel(member.status, { ACTIVE: "Ativo", INACTIVE: "Inativo", OVERDUE: "Em atraso", BLOCKED: "Bloqueado", CANCELLED: "Cancelado" }),
    lastCheckin: lastCheckin ? relativeDate(asDate(lastCheckin.checkedAt)) : "Sem check-in",
    expires: formatDate(expires),
    birthday: formatBirthday(asDate(member.birthDate)),
    avatar: initials(asString(member.name, "CN")),
    document: asString(member.documentNumber, "000000000LA000"),
    createdAt: asString(member.createdAt, undefined)
  };
};

export const clientToDto = (client: Partial<ClientRecord>) => ({
  name: client.name ?? "Novo cliente",
  email: cleanEmail(client.email),
  phone: client.phone,
  documentNumber: client.document,
  status: client.status === "Inativo" ? "INACTIVE" : "ACTIVE"
});

export const planFromApi = (plan: Entity): PlanRecord => ({
  id: asString(plan.id),
  name: asString(plan.name, "Plano"),
  description: asString(plan.description, ""),
  category: asString(plan.category, asBoolean(plan.includesClasses) ? "Aulas" : "Musculacao"),
  price: `${formatNumber(plan.price)} Kz/${durationLabel(Number(plan.durationDays ?? 30)).toLowerCase()}`,
  duration: durationLabel(Number(plan.durationDays ?? 30)),
  type: asBoolean(plan.isPopular) ? "Popular" : "Recorrente",
  clients: 0,
  status: statusLabel(plan.status, { ACTIVE: "Ativo", INACTIVE: "Inativo" }),
  color: asString(plan.color, "#B6FF00")
});

export const planToDto = (plan: Partial<PlanRecord>) => ({
  name: plan.name ?? "Novo plano",
  description: plan.description,
  category: plan.category,
  color: plan.color,
  price: parseMoney(plan.price),
  durationDays: durationDays(plan.duration),
  status: plan.status === "Inativo" ? "INACTIVE" : "ACTIVE",
  includesClasses: true,
  includesWorkouts: plan.category?.toLowerCase().includes("muscula") ?? false,
  isPopular: plan.type === "Popular"
});

export const planCategoryFromApi = (category: Entity): PlanCategoryRecord => ({
  id: asString(category.id, undefined),
  name: asString(category.name, "Categoria"),
  icon: asString(category.icon, asString(category.name, "Categoria")),
  description: asString(category.description, undefined),
  color: asString(category.color, "#B6FF00"),
  status: statusLabel(category.status, { ACTIVE: "Ativo", INACTIVE: "Inativo" }) as "Ativo" | "Inativo",
  order: asNumber(category.displayOrder, 1)
});

export const planCategoryToDto = (category: Partial<PlanCategoryRecord>) => ({
  name: category.name ?? "Categoria",
  icon: category.icon ?? category.name ?? "Categoria",
  description: category.description,
  color: category.color ?? "#B6FF00",
  status: category.status === "Inativo" ? "INACTIVE" : "ACTIVE",
  displayOrder: category.order ?? 1
});

export const productFromApi = (product: Entity): ProductRecord => ({
  id: asString(product.id),
  name: asString(product.name, "Produto"),
  category: asString(product.category, "Outros"),
  stock: asNumber(product.stock),
  price: asNumber(product.price),
  cost: asNumber(product.cost),
  emoji: asString(product.label, "PRD"),
  sku: asString(product.sku, undefined),
  barcode: asString(product.barcode, undefined),
  status: statusLabel(product.status, { ACTIVE: "Ativo", INACTIVE: "Inativo", ARCHIVED: "Arquivado" }),
  description: asString(product.description, undefined),
  unit: asString(product.unit, "Unidade"),
  minStock: asNumber(product.minStock, 10)
});

export const productToDto = (product: Partial<ProductRecord>) => ({
  name: product.name ?? "Novo produto",
  category: product.category ?? "Suplementos",
  sku: product.sku,
  barcode: product.barcode,
  price: product.price ?? 0,
  cost: product.cost ?? 0,
  stock: product.stock ?? 0,
  minStock: product.minStock ?? 0,
  description: product.description,
  unit: product.unit ?? "Unidade",
  label: product.emoji ?? "PRD",
  status: product.status === "Inativo" ? "INACTIVE" : "ACTIVE"
});

export const checkinFromApi = (checkin: Entity): CheckinRecord => {
  const member = getEntity(checkin.member);
  const checkedAt = asDate(checkin.checkedAt);
  return {
    id: asString(checkin.id),
    clientName: asString(member?.name, "Cliente Noogym"),
    clientId: asString(checkin.memberId),
    type: methodLabel(checkin.method),
    accessType: "Entrada",
    dateTime: relativeDate(checkedAt),
    checkedAtIso: checkedAt?.toISOString(),
    observation: asString(checkin.notes, undefined)
  };
};

export const checkinToDto = (checkin: Partial<CheckinRecord>) => ({
  memberId: checkin.clientId ?? "",
  method: methodValue(checkin.type),
  checkedAt: checkin.checkedAtIso,
  notes: checkin.observation
});

export const saleFromApi = (sale: Entity): SaleRecord => ({
  id: asString(sale.id),
  total: asNumber(sale.total),
  subtotal: asNumber(sale.subtotal),
  discountAmount: asNumber(sale.discountAmount),
  taxAmount: asNumber(sale.taxAmount),
  customer: asString(sale.customerName, undefined) || asString(getEntity(sale.member)?.name, undefined),
  memberId: asString(sale.memberId, undefined),
  seller: asString(sale.sellerName, "Admin"),
  type: saleTypeLabel(sale.type),
  status: statusLabel(sale.status, { DRAFT: "Orcamento", COMPLETED: "Concluida", CANCELLED: "Cancelada", REFUNDED: "Reembolsada" }),
  paymentMethod: paymentMethodLabel(sale.paymentMethod),
  dateTime: relativeDate(asDate(sale.soldAt)),
  soldAtIso: asDate(sale.soldAt)?.toISOString(),
  notes: asString(sale.notes, undefined),
  items: rows(sale.items).map(saleItemFromApi)
});

export const saleToDto = (sale: Partial<SaleRecord>, items: SaleItemRecord[] = []) => ({
  memberId: sale.memberId,
  customerName: sale.customer,
  sellerName: sale.seller ?? "Admin",
  type: saleTypeValue(sale.type),
  status: sale.type === "Orcamento" || sale.type === "Orçamento" ? "DRAFT" : "COMPLETED",
  paymentMethod: paymentMethodValue(sale.paymentMethod),
  discountAmount: sale.discountAmount ?? 0,
  taxAmount: sale.taxAmount ?? 0,
  soldAt: sale.soldAtIso ?? new Date().toISOString(),
  notes: sale.notes,
  items: items.length
    ? items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        unitPrice: item.unitPrice
      }))
    : [{ productName: "Venda POS", quantity: 1, unitPrice: sale.total ?? 0 }]
});

function saleItemFromApi(item: Entity): SaleItemRecord {
  return {
    id: asString(item.id),
    productId: asString(item.productId, undefined),
    name: asString(item.productName, "Item POS"),
    sku: asString(item.sku, undefined),
    quantity: asNumber(item.quantity, 1),
    unitPrice: asNumber(item.unitPrice)
  };
}

export const classFromApi = (lesson: Entity): ClassRecord => ({
  id: asString(lesson.id),
  name: asString(lesson.name, "Aula"),
  room: asString(getEntity(lesson.room)?.name, "Sala 1"),
  category: asString(lesson.category, "Cardio"),
  instructor: asString(getEntity(lesson.instructor)?.name, "Instrutor"),
  time: relativeDate(asDate(lesson.startAt)),
  duration: `${asNumber(lesson.durationMinutes, 55)} min`,
  seats: asNumber(lesson.capacity),
  participants: asNumber(lesson.participants),
  status: statusLabel(lesson.status, { SCHEDULED: "Agendada", IN_PROGRESS: "Em andamento", COMPLETED: "Encerrada", CANCELLED: "Cancelada" }),
  description: asString(lesson.description, undefined),
  equipment: asString(lesson.equipment, undefined),
  allowWaitlist: lesson.allowWaitlist === true,
  requiresCheckIn: lesson.requiresCheckIn === true,
  color: asString(lesson.color, undefined),
  startAtIso: asDate(lesson.startAt)?.toISOString(),
  endAtIso: asDate(lesson.endAt)?.toISOString()
});

export const classToDto = (lesson: Partial<ClassRecord>) => ({
  name: lesson.name ?? "Nova aula",
  category: lesson.category ?? "Cardio",
  description: lesson.description,
  equipment: lesson.equipment,
  startAt: lesson.startAtIso,
  endAt: lesson.endAtIso,
  durationMinutes: parseDuration(lesson.duration),
  capacity: lesson.seats ?? 25,
  participants: lesson.participants ?? 0,
  status: lesson.status === "Encerrada" ? "COMPLETED" : lesson.status === "Cancelada" ? "CANCELLED" : lesson.status === "Em andamento" ? "IN_PROGRESS" : "SCHEDULED",
  allowWaitlist: lesson.allowWaitlist ?? true,
  requiresCheckIn: lesson.requiresCheckIn ?? false,
  color: lesson.color
});

export const employeeFromApi = (employee: Entity): EmployeeRecord => ({
  id: asString(employee.id),
  name: asString(employee.name, "Funcionario"),
  role: asString(employee.role, "Recepcionista"),
  email: asString(employee.email, "funcionario@noogym.com"),
  phone: asString(employee.phone, "+244 900 000 000"),
  status: statusLabel(employee.status, { ACTIVE: "Ativo", INACTIVE: "Inativo", ON_LEAVE: "Licenca", TERMINATED: "Desligado" }),
  salary: `${formatNumber(employee.salary)} Kz`,
  userId: asString(employee.userId ?? getEntity(employee.user)?.id, undefined),
  gymId: asString(employee.gymId ?? getEntity(employee.gym)?.id, undefined),
  hireDate: asString(employee.hireDate, undefined),
  department: asString(employee.department, undefined),
  contractType: asString(employee.contractType, undefined),
  supervisor: asString(employee.supervisor, undefined),
  shift: asString(employee.shift, undefined),
  accountEmail: asString(getEntity(employee.user)?.email, asString(employee.email, undefined)),
  accountStatus: statusLabel(getEntity(employee.user)?.status, { ACTIVE: "Conta vinculada", INVITED: "Convite pendente", SUSPENDED: "Suspensa", INACTIVE: "Inativa" }),
  accessStatus: statusLabel(getEntity(employee.user)?.status, { ACTIVE: "Liberado", INVITED: "Convite pendente", SUSPENDED: "Bloqueado", INACTIVE: "Bloqueado" }),
  lastAccess: relativeDate(asDate(employee.lastLoginAt)),
  notes: asString(employee.notes, undefined)
});

export const employeeToDto = (employee: Partial<EmployeeRecord>) => ({
  name: employee.name ?? "Novo funcionario",
  userId: isUuidLike(employee.userId) ? employee.userId : undefined,
  gymId: isUuidLike(employee.gymId) ? employee.gymId : undefined,
  role: employee.role ?? "Recepcionista",
  email: cleanEmail(employee.email),
  phone: employee.phone,
  salary: parseMoney(employee.salary),
  department: employee.department,
  hireDate: employee.hireDate,
  notes: employee.notes,
  status: employee.status === "Inativo" ? "INACTIVE" : "ACTIVE"
});

export const workoutFromApi = (workout: Entity): WorkoutRecord => ({
  id: asString(workout.id),
  name: asString(workout.name, "Treino"),
  client: asString(getEntity(first<Entity>(workout.assignments)?.member)?.name, "Sem cliente"),
  clientId: asString(getEntity(first<Entity>(workout.assignments)?.member)?.id, undefined),
  goal: asString(workout.goal, "Condicionamento"),
  author: asString(getEntity(workout.createdBy)?.name, "Admin"),
  updated: relativeDate(asDate(workout.updatedAt)),
  status: statusLabel(workout.status, { ACTIVE: "Ativo", PAUSED: "Pausado", DRAFT: "Rascunho", ARCHIVED: "Arquivado" }),
  exercises: Array.isArray(workout.exercises) ? workout.exercises.length : 0,
  level: statusLabel(workout.level, { BEGINNER: "Iniciante", INTERMEDIATE: "Intermediario", ADVANCED: "Avancado" }),
  duration: `${asNumber(workout.durationMinutes, 60)} min`,
  notes: asString(workout.description, ""),
  blocks: Array.isArray(workout.exercises) ? [{
    id: "api-block",
    name: "Exercicios",
    exercises: workout.exercises.map((item, index) => {
      const exercise = getEntity((item as Entity).exercise);
      return {
        id: asString((item as Entity).id, `api-exercise-${index}`),
        name: asString(exercise?.name, `Exercicio ${index + 1}`),
        group: asString(getEntity(exercise?.muscleGroup)?.name, "Geral"),
        equipment: asString(exercise?.equipment, "Livre"),
        sets: asNumber((item as Entity).sets, 3),
        reps: asString((item as Entity).reps, "10"),
        load: asString((item as Entity).load, ""),
        rest: `${asNumber((item as Entity).restSeconds, 60)}s`,
        notes: asString((item as Entity).notes, "")
      };
    })
  }] : undefined
});

export const workoutToDto = (workout: Partial<WorkoutRecord>) => ({
  name: workout.name ?? "Novo treino",
  description: workout.notes,
  goal: workout.goal,
  level: workout.level === "Avancado" ? "ADVANCED" : workout.level === "Iniciante" ? "BEGINNER" : "INTERMEDIATE",
  status: workout.status === "Ativo" ? "ACTIVE" : workout.status === "Rascunho" ? "DRAFT" : workout.status === "Arquivado" ? "ARCHIVED" : "PAUSED",
  durationMinutes: parseDuration(workout.duration) || 60
});

function paymentToFinanceRecord(payment: Entity): FinanceRecord {
  return {
    id: asString(payment.id),
    kind: "Receita",
    category: "Receitas",
    value: asNumber(payment.amount),
    date: relativeDate(asDate(payment.paidAt) ?? asDate(payment.createdAt)),
    status: statusLabel(payment.status, { PAID: "Recebido", PENDING: "Pendente", FAILED: "Falhou", CANCELLED: "Cancelado", REFUNDED: "Reembolsado" }),
    note: asString(payment.notes, asString(payment.reference, undefined))
  };
}

function expenseToFinanceRecord(expense: Entity): FinanceRecord {
  return {
    id: asString(expense.id),
    kind: "Despesa",
    category: asString(expense.category, "Operacional"),
    value: asNumber(expense.amount),
    date: relativeDate(asDate(expense.paidAt) ?? asDate(expense.createdAt)),
    status: statusLabel(expense.status, { PAID: "Pago", PENDING: "Pendente", FAILED: "Falhou", CANCELLED: "Cancelado", REFUNDED: "Reembolsado" }),
    note: asString(expense.description, asString(expense.notes, undefined))
  };
}

function financeRecordToPaymentDto(record: Partial<FinanceRecord>) {
  return {
    amount: record.value ?? 0,
    method: paymentMethodValue(record.note),
    status: record.status === "Pendente" ? "PENDING" : "PAID",
    dueDate: dateToIso(record.date),
    notes: record.note
  };
}

function financeRecordToExpenseDto(record: Partial<FinanceRecord>) {
  return {
    category: record.category ?? "Operacional",
    description: record.note ?? record.category ?? "Despesa",
    amount: record.value ?? 0,
    method: "OTHER",
    status: record.status === "Pago" ? "PAID" : "PENDING",
    paidAt: record.status === "Pago" ? dateToIso(record.date) : undefined,
    dueDate: dateToIso(record.date),
    supplier: record.note
  };
}

function isUuidLike(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown) {
  return value === true;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function first<T extends Entity>(value: unknown): T | undefined {
  return Array.isArray(value) ? getEntity(value[0]) as T | undefined : undefined;
}

function rows(value: unknown): Entity[] {
  return Array.isArray(value) ? value.filter((item): item is Entity => Boolean(getEntity(item))) : [];
}

function getEntity(value: unknown) {
  return value && typeof value === "object" ? value as Entity : undefined;
}

function initials(value: string) {
  return value.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function statusLabel(value: unknown, labels: Record<string, string>) {
  return labels[String(value)] ?? String(value ?? "");
}

function formatDate(date: Date | null) {
  if (!date) return "Sem vencimento";
  return new Intl.DateTimeFormat("pt-AO").format(date);
}

function formatBirthday(date: Date | null) {
  if (!date) return "Sem data";
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "short" }).format(date);
}

function relativeDate(date: Date | null) {
  if (!date) return "Hoje";
  const today = new Date();
  const sameDay = today.toDateString() === date.toDateString();
  const time = new Intl.DateTimeFormat("pt-AO", { hour: "2-digit", minute: "2-digit" }).format(date);
  return sameDay ? `Hoje, ${time}` : `${formatDate(date)}, ${time}`;
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "0").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
  return asNumber(value).toLocaleString("pt-AO");
}

function durationDays(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("anual")) return 365;
  if (text.includes("semestral")) return 180;
  if (text.includes("trimestral")) return 90;
  return 30;
}

function durationLabel(days: number) {
  if (days >= 365) return "Anual";
  if (days >= 180) return "Semestral";
  if (days >= 90) return "Trimestral";
  return "Mensal";
}

function parseDuration(value: unknown) {
  const parsed = Number(String(value ?? "").match(/\d+/)?.[0] ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 55;
}

function methodLabel(value: unknown) {
  const labels: Record<string, string> = { QR_CODE: "QR Code", MANUAL: "Manual", BIOMETRIC: "Biometria", APP: "App", NFC: "NFC" };
  return labels[String(value)] ?? "Manual";
}

function methodValue(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("qr")) return "QR_CODE";
  if (text.includes("bio")) return "BIOMETRIC";
  if (text.includes("app")) return "APP";
  if (text.includes("nfc")) return "NFC";
  return "MANUAL";
}

function saleTypeLabel(value: unknown) {
  const labels: Record<string, string> = { NORMAL: "Venda normal", QUOTE: "Orcamento", SUBSCRIPTION: "Plano", SERVICE: "Servico" };
  return labels[String(value)] ?? "Venda normal";
}

function saleTypeValue(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("orc")) return "QUOTE";
  if (text.includes("plano")) return "SUBSCRIPTION";
  if (text.includes("serv")) return "SERVICE";
  return "NORMAL";
}

function paymentMethodLabel(value: unknown) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    BANK_TRANSFER: "Transferencia",
    CARD: "Cartao",
    MULTICAIXA: "Multicaixa",
    PIX: "PIX",
    DIRECT_DEBIT: "Debito direto",
    OTHER: "Outro"
  };
  return labels[String(value)] ?? "Dinheiro";
}

function paymentMethodValue(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("transfer")) return "BANK_TRANSFER";
  if (text.includes("cart")) return "CARD";
  if (text.includes("multi")) return "MULTICAIXA";
  if (text.includes("pix")) return "PIX";
  if (text.includes("debito")) return "DIRECT_DEBIT";
  if (text.includes("dinheiro")) return "CASH";
  return "OTHER";
}

function cleanEmail(value: unknown) {
  const email = asString(value, "");
  return email.includes("@") ? email : undefined;
}

function dateToIso(value: unknown) {
  const date = asDate(value) ?? new Date();
  return date.toISOString();
}
