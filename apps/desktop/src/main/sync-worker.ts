import { getSQLiteLocalDb, type DesktopBinding, type SyncQueueEvent } from "./sqlite-localdb";

type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error?: {
        message?: string | string[];
        code?: string;
      };
    };

type Entity = Record<string, unknown>;

type PaginatedResponse<T> = {
  items: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
};

type DesktopBootstrap = {
  generatedAt?: string;
  organization?: Entity | null;
  data?: {
    gyms?: Entity[];
    users?: Entity[];
    members?: Entity[];
  };
};

export type SQLiteSyncOptions = {
  apiUrl: string;
  token: string;
  gymId?: string;
  limit?: number;
  session?: {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
      organizationId?: string;
      organizationName?: string;
      gyms?: Array<{ id?: string; name?: string }>;
    };
  };
};

export type SQLiteSyncResult = {
  success: boolean;
  pushed: number;
  pulled: number;
  failed: number;
  pendingSync: number;
  failedSync: number;
  conflictSync: number;
  errors: string[];
  binding?: DesktopBinding | null;
};

type ClientPayload = Record<string, unknown> & {
  id: string;
  remoteId?: string;
  gymId?: string;
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  status?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  avatar?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API_TIMEOUT_MS = 20_000;
const API_MAX_PAGE_LIMIT = 100;
const API_MAX_PAGES = 1_000;
const CONFLICT_MESSAGE = "Conflito detectado: o servidor foi alterado depois da base local.";

export async function runSQLiteSync(options: SQLiteSyncOptions): Promise<SQLiteSyncResult> {
  const db = getSQLiteLocalDb();
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;
  let binding: DesktopBinding | null | undefined;
  let failed = 0;

  if (options.session?.user) {
    binding = db.saveDesktopBinding({
      apiUrl: options.apiUrl,
      user: options.session.user,
      activeGymId: options.gymId
    });
  }

  const pendingEvents = db.getPendingSyncEvents(options.limit ?? 50);

  for (const event of pendingEvents) {
    try {
      const outcome = await pushEvent(options, event);
      if (outcome === "conflict") {
        failed += 1;
        errors.push(CONFLICT_MESSAGE);
        continue;
      }
      db.markSyncEventSynced(event.id);
      pushed += 1;
    } catch (error) {
      failed += 1;
      const message = errorMessage(error);
      errors.push(message);
      db.markSyncEventFailed(event.id, message, event.attempts);
    }
  }

  try {
    const result = await pullRemoteClients(options);
    pulled = result.pulled;
    binding = db.saveDesktopBinding({
      apiUrl: options.apiUrl,
      user: options.session?.user,
      organization: result.bootstrap.organization ?? null,
      gyms: result.bootstrap.data?.gyms ?? [],
      users: result.bootstrap.data?.users ?? [],
      activeGymId: options.gymId,
      lastBootstrapAt: asString(result.bootstrap.generatedAt, new Date().toISOString())
    });
  } catch (error) {
    failed += 1;
    errors.push(errorMessage(error));
  }

  try {
    const result = await pullRemoteCollections(options);
    pulled += result.pulled;
    failed += result.errors.length;
    errors.push(...result.errors);
  } catch (error) {
    failed += 1;
    errors.push(errorMessage(error));
  }

  return {
    success: errors.length === 0,
    pushed,
    pulled,
    failed,
    pendingSync: db.getPendingSyncCount(),
    failedSync: db.getFailedSyncCount(),
    conflictSync: db.getOpenSyncConflictCount(),
    errors,
    binding: binding ?? db.getDesktopBinding()
  };
}

async function pushEvent(options: SQLiteSyncOptions, event: SyncQueueEvent): Promise<"synced" | "conflict"> {
  if (event.entity !== "clients") {
    return pushGenericEvent(options, event);
  }

  if (event.operation === "delete") {
    const remoteId = remoteIdFor(event.payload);
    if (!remoteId) return "synced";
    await apiRequest(options, `/members/${remoteId}`, { method: "DELETE" });
    return "synced";
  }

  const remoteId = remoteIdFor(event.payload);
  const body = clientToMemberDto(event.payload, options.gymId);

  if (remoteId && shouldCheckRemoteConflict(event.payload)) {
    const remote = await apiRequest<Entity>(options, `/members/${remoteId}`);
    if (hasRemoteConflict(event.payload, remote)) {
      getSQLiteLocalDb().createSyncConflict({
        eventId: event.id,
        entity: event.entity,
        entityId: event.entityId,
        remoteId,
        operation: event.operation,
        localPayload: event.payload,
        remotePayload: clientFromApi(remote, event.payload.id),
        error: CONFLICT_MESSAGE
      });
      getSQLiteLocalDb().markSyncEventConflict(event.id, CONFLICT_MESSAGE);
      return "conflict";
    }
  }

  const response = remoteId
    ? await apiRequest<Entity>(options, `/members/${remoteId}`, {
        method: "PATCH",
        body
      })
    : await apiRequest<Entity>(options, "/members", {
        method: "POST",
        body
      });

  const synced = clientFromApi(response, event.payload.id);
  getSQLiteLocalDb().markClientSynced(event.payload.id, String(response.id), {
    ...event.payload,
    ...synced
  });
  return "synced";
}

async function pushGenericEvent(options: SQLiteSyncOptions, event: SyncQueueEvent): Promise<"synced" | "conflict"> {
  const config = syncConfigFor(event.entity, event.payload);
  if (!config) throw new Error(`Sync de ${event.entity} ainda nao suportado.`);

  const remoteId = remoteIdForGeneric(event.payload);
  if (event.operation === "delete") {
    if (!remoteId || !config.deletePath) return "synced";
    await apiRequest(options, config.deletePath(remoteId), { method: "DELETE" });
    return "synced";
  }

  const specialResponse = await pushSpecialGenericEvent(options, event, remoteId);
  if (specialResponse.handled) {
    const responseId = asString(specialResponse.response?.id, remoteId ?? undefined);
    if (responseId) getSQLiteLocalDb().markLocalEntitySynced(event.entity, event.entityId, responseId, specialResponse.response);
    return "synced";
  }

  const method = config.method ?? (remoteId && config.patchPath ? "PATCH" : "POST");
  const path = method === "PATCH" && config.patchPath ? config.patchPath(remoteId ?? event.entityId) : config.postPath;

  if (method === "PATCH" && remoteId && config.getPath && shouldCheckRemoteConflict(event.payload)) {
    const remote = await apiRequest<Entity>(options, config.getPath(remoteId));
    if (hasRemoteConflict(event.payload, remote)) {
      getSQLiteLocalDb().createSyncConflict({
        eventId: event.id,
        entity: event.entity,
        entityId: event.entityId,
        remoteId,
        operation: event.operation,
        localPayload: event.payload,
        remotePayload: config.fromApi ? config.fromApi(remote, event.entityId) : remote,
        error: CONFLICT_MESSAGE
      });
      getSQLiteLocalDb().markSyncEventConflict(event.id, CONFLICT_MESSAGE);
      return "conflict";
    }
  }

  const response = await apiRequest<Entity>(options, path, {
    method,
    body: config.toDto(event.payload, options.gymId)
  });
  const responseId = asString(response.id, undefined);
  if (responseId) getSQLiteLocalDb().markLocalEntitySynced(event.entity, event.entityId, responseId, response);
  return "synced";
}

async function pushSpecialGenericEvent(options: SQLiteSyncOptions, event: SyncQueueEvent, remoteId?: string) {
  if (!remoteId || event.operation !== "update") return { handled: false as const };

  if (event.entity === "sales") {
    if (event.payload.status === "Cancelada") {
      const response = await apiRequest<Entity>(options, `/sales/${remoteId}/cancel`, { method: "PATCH" });
      return { handled: true as const, response };
    }

    throw new Error("Alteracao de venda existente ainda nao tem endpoint de sincronizacao suportado.");
  }

  if (event.entity === "finance-records" && event.payload.kind !== "Despesa") {
    if (event.payload.status === "Recebido" || event.payload.status === "Pago") {
      const response = await apiRequest<Entity>(options, `/payments/${remoteId}/mark-paid`, { method: "PATCH" });
      return { handled: true as const, response };
    }

    throw new Error("Alteracao de pagamento existente ainda nao tem endpoint de sincronizacao suportado.");
  }

  return { handled: false as const };
}

async function pullRemoteClients(options: SQLiteSyncOptions) {
  const params = new URLSearchParams({ limit: String(options.limit ?? 500) });
  const bootstrap = await apiRequest<DesktopBootstrap>(
    options,
    `/entrypoints/desktop/sync/bootstrap?${params.toString()}`
  );

  const members = bootstrap.data?.members ?? [];
  const db = getSQLiteLocalDb();

  members.forEach((member) => {
    const remoteId = asString(member.id);
    const existing = remoteId ? db.findClientByRemoteId(remoteId) : null;
    if (existing?.id && db.hasPendingSyncEvent("clients", existing.id)) return;
    db.upsertRemoteClient(clientFromApi(member, existing?.id ?? remoteId));
  });

  return { pulled: members.length, bootstrap };
}

async function pullRemoteCollections(options: SQLiteSyncOptions) {
  const errors: string[] = [];
  let pulled = 0;
  const db = getSQLiteLocalDb();
  const scopedQuery = options.gymId ? { gymId: options.gymId } : undefined;

  const pullList = async (
    label: string,
    entityName: string,
    path: string,
    mapper: (item: Entity) => Record<string, unknown>,
    query?: Record<string, string | number | boolean | undefined>
  ) => {
    try {
      const items = await apiList<Entity>(options, path, query);
      pulled += db.mergeRemoteCollection(entityName, items.map(mapper));
    } catch (error) {
      errors.push(`${label}: ${errorMessage(error)}`);
    }
  };

  await Promise.all([
    pullList("Planos", "plans", "/plans", planFromApi, scopedQuery),
    pullList("Categorias de planos", "plan-categories", "/plan-categories", planCategoryFromApi),
    pullList("Produtos", "products", "/products", productFromApi, scopedQuery),
    pullList("Vendas", "sales", "/sales", saleFromApi, scopedQuery),
    pullList("Check-ins", "checkins", "/checkins", checkinFromApi, scopedQuery),
    pullList("Aulas", "classes", "/classes", classFromApi, scopedQuery),
    pullList("Funcionarios", "employees", "/employees", employeeFromApi, scopedQuery),
    pullList("Treinos", "workouts", "/workouts", workoutFromApi)
  ]);

  try {
    const records = await listFinanceRecords(options, scopedQuery);
    pulled += db.mergeRemoteCollection("finance-records", records);
  } catch (error) {
    errors.push(`Financeiro: ${errorMessage(error)}`);
  }

  try {
    const accounts = await apiRequest<Entity[]>(options, "/finance/accounts");
    pulled += db.mergeRemoteCollection("finance-accounts", accounts.map(financeAccountFromApi));
  } catch (error) {
    errors.push(`Contas financeiras: ${errorMessage(error)}`);
  }

  try {
    const categories = await apiRequest<Entity[]>(options, "/finance/categories");
    pulled += db.mergeRemoteCollection("finance-categories", categories.map(financeCategoryFromApi));
  } catch (error) {
    errors.push(`Categorias financeiras: ${errorMessage(error)}`);
  }

  try {
    const settings = await apiRequest<Entity>(options, "/settings/operational");
    if (db.mergeRemoteObject("operational-settings", settings)) pulled += 1;
  } catch (error) {
    errors.push(`Configuracoes operacionais: ${errorMessage(error)}`);
  }

  const productCategories = deriveProductCategories(db.getLocalCollection("noogym:products"));
  if (productCategories.length) db.setLocalCollection("noogym:product-categories", productCategories);

  const planCategories = db.getLocalCollection("noogym:plan-category-details");
  if (Array.isArray(planCategories)) {
    db.setLocalCollection("noogym:plan-categories", planCategories.map((category) => asString(entity(category)?.name)).filter(Boolean));
  }

  return { pulled, errors };
}

async function apiList<T extends Entity>(
  options: SQLiteSyncOptions,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const limit = apiPageLimit(options.limit);
  const items: T[] = [];
  let page = 1;
  let pages = 1;

  do {
    const response = await apiRequest<PaginatedResponse<T>>(options, apiPath(path, { ...query, page, limit }));
    items.push(...(response.items ?? []));
    pages = Math.min(API_MAX_PAGES, Math.max(1, Number(response.meta?.pages) || 1));
    page += 1;
  } while (page <= pages);

  return items;
}

function apiPageLimit(limit?: number) {
  if (!Number.isFinite(limit) || !limit) return API_MAX_PAGE_LIMIT;
  return Math.min(Math.max(Math.floor(limit), 1), API_MAX_PAGE_LIMIT);
}

async function listFinanceRecords(options: SQLiteSyncOptions, query?: Record<string, string | number | boolean | undefined>) {
  const [payments, expenses] = await Promise.all([
    apiList<Entity>(options, "/payments", query),
    apiList<Entity>(options, "/expenses", query)
  ]);

  return [
    ...payments.map(paymentFromApi),
    ...expenses.map(expenseFromApi)
  ].sort((a, b) => asString(b.id).localeCompare(asString(a.id)));
}

function clientToMemberDto(client: ClientPayload, fallbackGymId?: string) {
  return {
    name: asString(client.name, "Novo cliente"),
    email: cleanEmail(client.email),
    phone: cleanString(client.phone),
    documentNumber: cleanString(client.document),
    gymId: cleanString(client.gymId) ?? cleanString(fallbackGymId),
    status: client.status === "Inativo" ? "INACTIVE" : "ACTIVE",
    birthDate: cleanString(client.birthDate),
    address: cleanString(client.address),
    city: cleanString(client.city),
    avatarUrl: cleanString(client.avatar),
    notes: cleanString(client.observations)
  };
}

function clientFromApi(member: Entity, localId?: string): ClientPayload {
  const subscription = first(member.subscriptions);
  const plan = entity(subscription?.plan);
  const checkIn = first(member.checkIns);
  const name = asString(member.name, "Cliente Noogym");

  return {
    id: localId || asString(member.id),
    remoteId: asString(member.id, undefined),
    gymId: asString(member.gymId ?? entity(member.gym)?.id, undefined),
    name,
    phone: asString(member.phone, ""),
    email: asString(member.email, ""),
    plan: asString(plan?.name, "Sem plano"),
    planId: asString(subscription?.planId ?? plan?.id, undefined),
    planTone: member.status === "OVERDUE" ? "red" : "lime",
    status: statusLabel(member.status),
    lastCheckin: checkIn ? relativeDate(asDate(checkIn.checkedAt)) : "Sem check-in",
    expires: formatDate(asDate(subscription?.endDate)),
    birthday: formatBirthday(asDate(member.birthDate)),
    avatar: initials(name),
    document: asString(member.documentNumber, ""),
    createdAt: asString(member.createdAt, undefined),
    updatedAt: asString(member.updatedAt, undefined)
  };
}

function planFromApi(plan: Entity): Entity {
  const gymLinks = rows(plan.gyms);
  return withRemoteFields(plan, {
    id: asString(plan.id),
    name: asString(plan.name, "Plano"),
    description: asString(plan.description, ""),
    category: asString(plan.category, plan.includesClasses === true ? "Aulas" : "Musculacao"),
    price: `${formatNumber(plan.price)} Kz/${durationLabel(Number(plan.durationDays ?? 30)).toLowerCase()}`,
    duration: durationLabel(Number(plan.durationDays ?? 30)),
    type: plan.isPopular === true ? "Popular" : "Recorrente",
    clients: 0,
    status: statusLabel(plan.status, { ACTIVE: "Ativo", INACTIVE: "Inativo" }),
    color: asString(plan.color, "#B6FF00"),
    gymIds: gymLinks.map((link) => asString(link.gymId ?? entity(link.gym)?.id, "")).filter(Boolean),
    gymNames: gymLinks.map((link) => asString(entity(link.gym)?.name, "")).filter(Boolean)
  });
}

function planCategoryFromApi(category: Entity): Entity {
  return withRemoteFields(category, {
    id: asString(category.id),
    name: asString(category.name, "Categoria"),
    icon: asString(category.icon, asString(category.name, "Categoria")),
    description: asString(category.description, undefined),
    color: asString(category.color, "#B6FF00"),
    status: statusLabel(category.status, { ACTIVE: "Ativo", INACTIVE: "Inativo" }),
    order: asNumber(category.displayOrder, 1)
  });
}

function productFromApi(product: Entity): Entity {
  return withRemoteFields(product, {
    id: asString(product.id),
    gymId: asString(product.gymId ?? entity(product.gym)?.id, undefined),
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
}

function saleFromApi(sale: Entity): Entity {
  return withRemoteFields(sale, {
    id: asString(sale.id),
    gymId: asString(sale.gymId ?? entity(sale.gym)?.id, undefined),
    total: asNumber(sale.total),
    subtotal: asNumber(sale.subtotal),
    discountAmount: asNumber(sale.discountAmount),
    taxAmount: asNumber(sale.taxAmount),
    customer: asString(sale.customerName, undefined) || asString(entity(sale.member)?.name, undefined),
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
}

function saleItemFromApi(item: Entity) {
  return {
    id: asString(item.id),
    productId: asString(item.productId, undefined),
    name: asString(item.productName, "Item POS"),
    sku: asString(item.sku, undefined),
    quantity: asNumber(item.quantity, 1),
    unitPrice: asNumber(item.unitPrice)
  };
}

function checkinFromApi(checkin: Entity): Entity {
  const member = entity(checkin.member);
  const checkedAt = asDate(checkin.checkedAt);
  return withRemoteFields(checkin, {
    id: asString(checkin.id),
    gymId: asString(checkin.gymId ?? entity(checkin.gym)?.id, undefined),
    clientName: asString(member?.name, "Cliente Noogym"),
    clientId: asString(checkin.memberId),
    type: methodLabel(checkin.method),
    accessType: "Entrada",
    dateTime: relativeDate(checkedAt),
    checkedAtIso: checkedAt?.toISOString(),
    observation: asString(checkin.notes, undefined)
  });
}

function classFromApi(lesson: Entity): Entity {
  return withRemoteFields(lesson, {
    id: asString(lesson.id),
    gymId: asString(lesson.gymId ?? entity(lesson.gym)?.id, undefined),
    name: asString(lesson.name, "Aula"),
    room: asString(entity(lesson.room)?.name, "Sala 1"),
    category: asString(lesson.category, "Cardio"),
    instructor: asString(entity(lesson.instructor)?.name, "Instrutor"),
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
}

function employeeFromApi(employee: Entity): Entity {
  return withRemoteFields(employee, {
    id: asString(employee.id),
    name: asString(employee.name, "Funcionario"),
    role: asString(employee.role, "Recepcionista"),
    email: asString(employee.email, "funcionario@noogym.com"),
    phone: asString(employee.phone, "+244 900 000 000"),
    status: statusLabel(employee.status, { ACTIVE: "Ativo", INACTIVE: "Inativo", ON_LEAVE: "Licenca", TERMINATED: "Desligado" }),
    salary: `${formatNumber(employee.salary)} Kz`,
    userId: asString(employee.userId ?? entity(employee.user)?.id, undefined),
    gymId: asString(employee.gymId ?? entity(employee.gym)?.id, undefined),
    hireDate: asString(employee.hireDate, undefined),
    department: asString(employee.department, undefined),
    contractType: asString(employee.contractType, undefined),
    supervisor: asString(employee.supervisor, undefined),
    shift: asString(employee.shift, undefined),
    accountEmail: asString(entity(employee.user)?.email, asString(employee.email, undefined)),
    accountStatus: statusLabel(entity(employee.user)?.status, { ACTIVE: "Conta vinculada", INVITED: "Convite pendente", SUSPENDED: "Suspensa", INACTIVE: "Inativa" }),
    accessStatus: statusLabel(entity(employee.user)?.status, { ACTIVE: "Liberado", INVITED: "Convite pendente", SUSPENDED: "Bloqueado", INACTIVE: "Bloqueado" }),
    lastAccess: relativeDate(asDate(employee.lastLoginAt)),
    notes: asString(employee.notes, undefined)
  });
}

function workoutFromApi(workout: Entity): Entity {
  const assignmentMember = entity(first(workout.assignments)?.member);
  const blocks = Array.isArray(workout.exercises)
    ? [{
        id: "api-block",
        name: "Exercicios",
        exercises: workout.exercises.map((item, index) => {
          const row = entity(item) ?? {};
          const exercise = entity(row.exercise);
          return {
            id: asString(row.id, `api-exercise-${index}`),
            name: asString(exercise?.name, `Exercicio ${index + 1}`),
            group: asString(entity(exercise?.muscleGroup)?.name, "Geral"),
            equipment: asString(exercise?.equipment, "Livre"),
            sets: asNumber(row.sets, 3),
            reps: asString(row.reps, "10"),
            load: asString(row.load, ""),
            rest: `${asNumber(row.restSeconds, 60)}s`,
            notes: asString(row.notes, "")
          };
        })
      }]
    : undefined;

  return withRemoteFields(workout, {
    id: asString(workout.id),
    name: asString(workout.name, "Treino"),
    client: asString(assignmentMember?.name, "Sem cliente"),
    clientId: asString(assignmentMember?.id, undefined),
    goal: asString(workout.goal, "Condicionamento"),
    author: asString(entity(workout.createdBy)?.name, "Admin"),
    updated: relativeDate(asDate(workout.updatedAt)),
    status: statusLabel(workout.status, { ACTIVE: "Ativo", PAUSED: "Pausado", DRAFT: "Rascunho", ARCHIVED: "Arquivado" }),
    exercises: Array.isArray(workout.exercises) ? workout.exercises.length : 0,
    level: statusLabel(workout.level, { BEGINNER: "Iniciante", INTERMEDIATE: "Intermediario", ADVANCED: "Avancado" }),
    duration: `${asNumber(workout.durationMinutes, 60)} min`,
    notes: asString(workout.description, ""),
    blocks
  });
}

function financeAccountFromApi(account: Entity): Entity {
  return withRemoteFields(account, {
    id: asString(account.id),
    name: asString(account.name, "Conta"),
    bank: asString(account.bank, undefined),
    type: financeAccountType(account.type),
    openingBalance: asNumber(account.openingBalance),
    balance: asNumber(account.balance),
    status: account.status === "INACTIVE" || account.status === "Inativa" ? "Inativa" : "Ativa",
    isDefault: account.isDefault === true,
    color: asString(account.color, "#B6FF00")
  });
}

function financeCategoryFromApi(category: Entity): Entity {
  return withRemoteFields(category, {
    id: asString(category.id),
    kind: category.kind === "Despesa" ? "Despesa" : "Receita",
    name: asString(category.name, "Categoria"),
    description: asString(category.description, undefined),
    color: asString(category.color, undefined),
    status: asString(category.status, undefined),
    order: asNumber(category.displayOrder, 1)
  });
}

function paymentFromApi(payment: Entity): Entity {
  return withRemoteFields(payment, {
    id: asString(payment.id),
    gymId: asString(entity(payment.member)?.gymId ?? entity(entity(payment.sale)?.gym)?.id ?? entity(payment.sale)?.gymId, undefined),
    kind: "Receita",
    category: "Receitas",
    value: asNumber(payment.amount),
    date: relativeDate(asDate(payment.paidAt) ?? asDate(payment.createdAt)),
    status: statusLabel(payment.status, { PAID: "Recebido", PENDING: "Pendente", FAILED: "Falhou", CANCELLED: "Cancelado", REFUNDED: "Reembolsado" }),
    method: paymentMethodLabel(payment.method),
    note: asString(payment.notes, asString(payment.reference, undefined))
  });
}

function expenseFromApi(expense: Entity): Entity {
  return withRemoteFields(expense, {
    id: asString(expense.id),
    gymId: asString(expense.gymId, undefined),
    kind: "Despesa",
    category: asString(expense.category, "Operacional"),
    value: asNumber(expense.amount),
    date: relativeDate(asDate(expense.paidAt) ?? asDate(expense.createdAt)),
    status: statusLabel(expense.status, { PAID: "Pago", PENDING: "Pendente", FAILED: "Falhou", CANCELLED: "Cancelado", REFUNDED: "Reembolsado" }),
    method: paymentMethodLabel(expense.method),
    supplier: asString(expense.supplier, undefined),
    note: asString(expense.description, asString(expense.notes, undefined))
  });
}

type SyncConfig = {
  postPath: string;
  getPath?: (id: string) => string;
  patchPath?: (id: string) => string;
  deletePath?: (id: string) => string;
  method?: "POST" | "PATCH";
  toDto: (payload: Entity, fallbackGymId?: string) => Entity;
  fromApi?: (payload: Entity, localId?: string) => Entity;
};

function syncConfigFor(entity: string, payload: Entity): SyncConfig | null {
  const configs: Record<string, SyncConfig> = {
    plans: crudConfig("/plans", planToDto, { fromApi: planFromApi }),
    "plan-categories": crudConfig("/plan-categories", planCategoryToDto, { fromApi: planCategoryFromApi }),
    products: crudConfig("/products", productToDto, { canFetchOne: true, fromApi: productFromApi }),
    sales: {
      postPath: "/sales",
      getPath: (id) => `/sales/${id}`,
      patchPath: (id) => `/sales/${id}`,
      deletePath: (id) => `/sales/${id}`,
      toDto: saleToDto,
      fromApi: saleFromApi
    },
    checkins: {
      postPath: "/checkins",
      toDto: checkinToDto
    },
    classes: crudConfig("/classes", classToDto, { canFetchOne: true, fromApi: classFromApi }),
    employees: crudConfig("/employees", employeeToDto, { canFetchOne: true, fromApi: employeeFromApi }),
    workouts: crudConfig("/workouts", workoutToDto, { canFetchOne: true, fromApi: workoutFromApi }),
    "finance-categories": {
      postPath: "/finance/categories",
      patchPath: (id) => `/finance/categories/${id}`,
      deletePath: (id) => `/finance/categories/${id}`,
      toDto: financeCategoryToDto,
      fromApi: financeCategoryFromApi
    },
    "finance-accounts": {
      postPath: "/finance/accounts",
      patchPath: (id) => `/finance/accounts/${id}`,
      toDto: financeAccountToDto,
      fromApi: financeAccountFromApi
    },
    "operational-settings": {
      postPath: "/settings/operational",
      patchPath: () => "/settings/operational",
      method: "PATCH",
      toDto: (settings) => ({ settings })
    }
  };

  if (entity === "finance-records") {
    return financeRecordConfig(payload);
  }

  return configs[entity] ?? null;
}

function crudConfig(path: string, toDto: SyncConfig["toDto"], options: { canFetchOne?: boolean; fromApi?: SyncConfig["fromApi"] } = {}): SyncConfig {
  return {
    postPath: path,
    getPath: options.canFetchOne ? (id) => `${path}/${id}` : undefined,
    patchPath: (id) => `${path}/${id}`,
    deletePath: (id) => `${path}/${id}`,
    toDto,
    fromApi: options.fromApi
  };
}

function financeRecordConfig(payload: Entity): SyncConfig {
  if (payload.kind === "Despesa") {
    return {
      postPath: "/expenses",
      patchPath: (id) => `/expenses/${id}`,
      deletePath: (id) => `/expenses/${id}`,
      toDto: financeRecordToExpenseDto,
      fromApi: expenseFromApi
    };
  }

  return {
    postPath: "/payments",
    toDto: financeRecordToPaymentDto,
    fromApi: paymentFromApi
  };
}

function planToDto(plan: Entity) {
  return {
    name: asString(plan.name, "Novo plano"),
    description: cleanString(plan.description),
    category: cleanString(plan.category),
    color: cleanString(plan.color),
    price: parseMoney(plan.price),
    durationDays: durationDays(plan.duration),
    status: plan.status === "Inativo" ? "INACTIVE" : "ACTIVE",
    includesClasses: true,
    includesWorkouts: String(plan.category ?? "").toLowerCase().includes("muscula"),
    isPopular: plan.type === "Popular",
    gymIds: Array.isArray(plan.gymIds) ? plan.gymIds : undefined
  };
}

function planCategoryToDto(category: Entity) {
  return {
    name: asString(category.name, "Categoria"),
    icon: asString(category.icon, asString(category.name, "Categoria")),
    description: cleanString(category.description),
    color: asString(category.color, "#B6FF00"),
    status: category.status === "Inativo" ? "INACTIVE" : "ACTIVE",
    displayOrder: Number(category.order ?? 1)
  };
}

function productToDto(product: Entity, fallbackGymId?: string) {
  return {
    name: asString(product.name, "Novo produto"),
    category: asString(product.category, "Suplementos"),
    sku: cleanString(product.sku),
    barcode: cleanString(product.barcode),
    price: asNumber(product.price),
    cost: asNumber(product.cost),
    stock: asNumber(product.stock),
    minStock: asNumber(product.minStock),
    description: cleanString(product.description),
    unit: asString(product.unit, "Unidade"),
    gymId: cleanString(product.gymId) ?? cleanString(fallbackGymId),
    label: asString(product.emoji, "PRD"),
    status: product.status === "Inativo" ? "INACTIVE" : "ACTIVE"
  };
}

function saleToDto(sale: Entity, fallbackGymId?: string) {
  const items = Array.isArray(sale.items) ? sale.items.filter(entity) : [];
  return {
    memberId: cleanString(sale.memberId),
    customerName: cleanString(sale.customer),
    sellerName: asString(sale.seller, "Admin"),
    gymId: cleanString(sale.gymId) ?? cleanString(fallbackGymId),
    type: saleTypeValue(sale.type),
    status: String(sale.status).toLowerCase().includes("orc") ? "DRAFT" : sale.status === "Cancelada" ? "CANCELLED" : "COMPLETED",
    paymentMethod: paymentMethodValue(sale.paymentMethod),
    discountAmount: asNumber(sale.discountAmount),
    taxAmount: asNumber(sale.taxAmount),
    soldAt: cleanString(sale.soldAtIso) ?? new Date().toISOString(),
    notes: cleanString(sale.notes),
    items: items.length
      ? items.map((item) => ({
          productId: cleanString(item.productId),
          productName: asString(item.name, "Item POS"),
          sku: cleanString(item.sku),
          quantity: Math.max(1, asNumber(item.quantity, 1)),
          unitPrice: asNumber(item.unitPrice)
        }))
      : [{ productName: "Venda POS", quantity: 1, unitPrice: asNumber(sale.total) }]
  };
}

function checkinToDto(checkin: Entity, fallbackGymId?: string) {
  return {
    memberId: asString(checkin.clientId),
    gymId: cleanString(checkin.gymId) ?? cleanString(fallbackGymId),
    method: methodValue(checkin.type),
    checkedAt: cleanString(checkin.checkedAtIso) ?? new Date().toISOString(),
    notes: cleanString(checkin.observation)
  };
}

function classToDto(lesson: Entity, fallbackGymId?: string) {
  return {
    name: asString(lesson.name, "Nova aula"),
    category: asString(lesson.category, "Cardio"),
    gymId: cleanString(lesson.gymId) ?? cleanString(fallbackGymId),
    description: cleanString(lesson.description),
    equipment: cleanString(lesson.equipment),
    startAt: cleanString(lesson.startAtIso),
    endAt: cleanString(lesson.endAtIso),
    durationMinutes: parseDuration(lesson.duration),
    capacity: asNumber(lesson.seats, 25),
    participants: asNumber(lesson.participants),
    status: classStatusValue(lesson.status),
    allowWaitlist: lesson.allowWaitlist !== false,
    requiresCheckIn: lesson.requiresCheckIn === true,
    color: cleanString(lesson.color)
  };
}

function employeeToDto(employee: Entity, fallbackGymId?: string) {
  return {
    name: asString(employee.name, "Novo funcionario"),
    userId: isUuidLike(cleanString(employee.userId)) ? cleanString(employee.userId) : undefined,
    gymId: isUuidLike(cleanString(employee.gymId)) ? cleanString(employee.gymId) : cleanString(fallbackGymId),
    role: asString(employee.role, "Recepcionista"),
    email: cleanEmail(employee.email),
    phone: cleanString(employee.phone),
    salary: parseMoney(employee.salary),
    department: cleanString(employee.department),
    hireDate: cleanString(employee.hireDate),
    notes: cleanString(employee.notes),
    status: employee.status === "Inativo" ? "INACTIVE" : "ACTIVE"
  };
}

function workoutToDto(workout: Entity) {
  return {
    name: asString(workout.name, "Novo treino"),
    description: cleanString(workout.notes),
    goal: cleanString(workout.goal),
    level: workout.level === "Avancado" ? "ADVANCED" : workout.level === "Iniciante" ? "BEGINNER" : "INTERMEDIATE",
    status: workout.status === "Ativo" ? "ACTIVE" : workout.status === "Rascunho" ? "DRAFT" : workout.status === "Arquivado" ? "ARCHIVED" : "PAUSED",
    durationMinutes: parseDuration(workout.duration) || 60
  };
}

function financeCategoryToDto(category: Entity) {
  return {
    kind: category.kind === "Despesa" ? "Despesa" : "Receita",
    name: asString(category.name, "Categoria"),
    description: cleanString(category.description),
    color: cleanString(category.color),
    status: cleanString(category.status),
    displayOrder: asNumber(category.order, 1)
  };
}

function financeAccountToDto(account: Entity) {
  return {
    name: asString(account.name, "Conta"),
    bank: cleanString(account.bank),
    type: cleanString(account.type),
    openingBalance: asNumber(account.openingBalance),
    balance: asNumber(account.balance),
    status: cleanString(account.status),
    isDefault: account.isDefault === true,
    color: cleanString(account.color)
  };
}

function financeRecordToPaymentDto(record: Entity) {
  return {
    memberId: cleanString(record.memberId),
    amount: asNumber(record.value),
    method: paymentMethodValue(record.method),
    status: record.status === "Pendente" ? "PENDING" : "PAID",
    dueDate: dateToIso(record.date),
    reference: cleanString(record.note),
    notes: cleanString(record.note)
  };
}

function financeRecordToExpenseDto(record: Entity) {
  return {
    category: asString(record.category, "Operacional"),
    description: asString(record.note, asString(record.category, "Despesa")),
    amount: asNumber(record.value),
    method: paymentMethodValue(record.method),
    status: record.status === "Pago" ? "PAID" : "PENDING",
    paidAt: record.status === "Pago" ? dateToIso(record.date) : undefined,
    dueDate: dateToIso(record.date),
    supplier: cleanString(record.supplier),
    notes: cleanString(record.note)
  };
}

async function apiRequest<T>(
  options: SQLiteSyncOptions,
  path: string,
  request: { method?: string; body?: unknown } = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${options.apiUrl.replace(/\/+$/, "")}${path}`, {
      method: request.method ?? "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.token}`
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body)
    });

    let payload: ApiEnvelope<T> | T | null = null;
    try {
      payload = (await response.json()) as ApiEnvelope<T> | T;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(resolveApiMessage(payload, response.status));
    }

    if (isApiEnvelope(payload)) {
      if (!payload.success) throw new Error(resolveApiMessage(payload, response.status));
      return payload.data;
    }

    if (!payload) {
      throw new Error("Resposta vazia da API.");
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Tempo limite ao comunicar com a API.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function apiPath(path: string, query?: Record<string, string | number | boolean | undefined>) {
  if (!query) return path;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function remoteIdFor(client: ClientPayload) {
  return cleanString(client.remoteId) ?? (isUuidLike(client.id) ? client.id : undefined);
}

function remoteIdForGeneric(payload: Entity) {
  const remoteId = cleanString(payload.remoteId);
  const id = cleanString(payload.id);
  return remoteId ?? (isUuidLike(id) ? id : undefined);
}

function shouldCheckRemoteConflict(payload: Entity) {
  if (payload.__forceSync === true) return false;
  return Boolean(conflictBaseUpdatedAt(payload));
}

function hasRemoteConflict(localPayload: Entity, remotePayload: Entity) {
  const baseUpdatedAt = conflictBaseUpdatedAt(localPayload);
  const remoteUpdatedAt = cleanString(remotePayload.updatedAt);
  if (!baseUpdatedAt || !remoteUpdatedAt) return false;

  const baseTime = Date.parse(baseUpdatedAt);
  const remoteTime = Date.parse(remoteUpdatedAt);
  if (!Number.isFinite(baseTime) || !Number.isFinite(remoteTime)) return false;

  return remoteTime > baseTime + 1000;
}

function conflictBaseUpdatedAt(payload: Entity) {
  return cleanString(payload.__syncBaseUpdatedAt) ?? cleanString(payload.remoteUpdatedAt) ?? cleanString(payload.updatedAt);
}

function isApiEnvelope<T>(payload: ApiEnvelope<T> | T | null): payload is ApiEnvelope<T> {
  return Boolean(payload && typeof payload === "object" && "success" in payload);
}

function resolveApiMessage<T>(payload: ApiEnvelope<T> | T | null, status: number) {
  if (isApiEnvelope(payload) && !payload.success) {
    const message = payload.error?.message;
    if (Array.isArray(message)) return message.join(" ");
    return message ?? `API respondeu com erro ${status}.`;
  }

  return `API respondeu com erro ${status}.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha desconhecida na sincronizacao.";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanEmail(value: unknown) {
  const email = cleanString(value);
  return email?.includes("@") ? email.toLowerCase() : undefined;
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Entity => Boolean(entity(item))) : [];
}

function withRemoteFields(source: Entity, payload: Entity) {
  return {
    ...payload,
    remoteId: asString(source.id, asString(payload.id)),
    updatedAt: asString(source.updatedAt, undefined),
    remoteUpdatedAt: asString(source.updatedAt, undefined),
    syncStatus: "synced"
  };
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "0").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function durationDays(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("anual")) return 365;
  if (text.includes("semestral")) return 180;
  if (text.includes("trimestral")) return 90;
  return 30;
}

function formatNumber(value: unknown) {
  return asNumber(value).toLocaleString("pt-AO");
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

function saleTypeValue(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("orc")) return "QUOTE";
  if (text.includes("plano")) return "SUBSCRIPTION";
  if (text.includes("serv")) return "SERVICE";
  return "NORMAL";
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

function methodValue(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("qr")) return "QR_CODE";
  if (text.includes("bio")) return "BIOMETRIC";
  if (text.includes("app")) return "APP";
  if (text.includes("nfc")) return "NFC";
  return "MANUAL";
}

function methodLabel(value: unknown) {
  const labels: Record<string, string> = { QR_CODE: "QR Code", MANUAL: "Manual", BIOMETRIC: "Biometria", APP: "App", NFC: "NFC" };
  return labels[String(value)] ?? "Manual";
}

function saleTypeLabel(value: unknown) {
  const labels: Record<string, string> = { NORMAL: "Venda normal", QUOTE: "Orcamento", SUBSCRIPTION: "Plano", SERVICE: "Servico" };
  return labels[String(value)] ?? "Venda normal";
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

function financeAccountType(value: unknown) {
  const text = asString(value, "Corrente");
  const allowed = ["Caixa", "Corrente", "Poupanca", "Carteira movel", "Cartao", "Outro"];
  return allowed.includes(text) ? text : "Corrente";
}

function deriveProductCategories(products: unknown) {
  if (!Array.isArray(products)) return [];
  const colors = ["#B6FF00", "#38BDF8", "#A855F7", "#F59E0B", "#2DD4BF", "#FB7185", "#94A3B8"];
  const seen = new Set<string>();
  const categories: Entity[] = [];

  products.forEach((item) => {
    const product = entity(item);
    const name = cleanString(product?.category);
    const key = name?.toLowerCase();
    if (!name || !key || seen.has(key)) return;
    seen.add(key);
    categories.push({
      id: `PCAT-${categories.length + 1}`,
      name,
      icon: "Produto",
      color: colors[categories.length % colors.length],
      status: "Ativo",
      order: categories.length + 1
    });
  });

  return categories;
}

function classStatusValue(value: unknown) {
  if (value === "Encerrada") return "COMPLETED";
  if (value === "Cancelada") return "CANCELLED";
  if (value === "Em andamento") return "IN_PROGRESS";
  return "SCHEDULED";
}

function dateToIso(value: unknown) {
  return (asDate(value) ?? new Date()).toISOString();
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function first(value: unknown) {
  return Array.isArray(value) ? entity(value[0]) : undefined;
}

function entity(value: unknown) {
  return value && typeof value === "object" ? (value as Entity) : undefined;
}

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusLabel(value: unknown, customLabels?: Record<string, string>) {
  const labels: Record<string, string> = customLabels ?? {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    OVERDUE: "Em atraso",
    BLOCKED: "Bloqueado",
    CANCELLED: "Cancelado"
  };
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

function isUuidLike(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value));
}
