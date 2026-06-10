export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  plan: string;
  planId?: string;
  planTone?: string;
  status: string;
  lastCheckin?: string;
  expires?: string;
  birthday?: string;
  birthDate?: string;
  avatar?: string;
  document?: string;
  createdAt?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  profession?: string;
  source?: string;
  goal?: string;
  observations?: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  duration: string;
  type: string;
  clients: number;
  status: string;
  color?: string;
  accessDays?: string[];
}

export interface PlanCategoryRecord {
  id?: string;
  name: string;
  icon: string;
  description?: string;
  color: string;
  status: "Ativo" | "Inativo";
  order: number;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  cost: number;
  emoji: string;
  sku?: string;
  barcode?: string;
  status?: string;
  description?: string;
  unit?: string;
  minStock?: number;
}

export interface ProductCategoryRecord {
  id?: string;
  name: string;
  icon: string;
  description?: string;
  color: string;
  status: "Ativo" | "Inativo";
  order: number;
}

export interface ProductStockMovementRecord {
  id: string;
  productId: string;
  productName: string;
  type: "Entrada" | "Saida" | "Ajuste";
  quantity: number;
  previousStock: number;
  nextStock: number;
  reason: string;
  user: string;
  dateTime: string;
}

export interface CheckinRecord {
  id: string;
  clientName: string;
  clientId: string;
  type: string;
  accessType: string;
  dateTime: string;
  checkedAtIso?: string;
  observation?: string;
}

export interface SaleRecord {
  id: string;
  total: number;
  customer?: string;
  memberId?: string;
  seller: string;
  type: string;
  status?: string;
  paymentMethod: string;
  dateTime: string;
  soldAtIso?: string;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  items?: SaleItemRecord[];
}

export interface SaleItemRecord {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  kind?: string;
  productId?: string;
}

export interface ClassRecord {
  id: string;
  name: string;
  room: string;
  category: string;
  instructor: string;
  time: string;
  duration: string;
  seats: number;
  participants: number;
  status: string;
  description?: string;
  equipment?: string;
  allowWaitlist?: boolean;
  requiresCheckIn?: boolean;
  color?: string;
  startAtIso?: string;
  endAtIso?: string;
  modality?: string;
  level?: string;
  price?: number;
}

export interface WorkoutRecord {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  goal: string;
  author: string;
  updated: string;
  status: string;
  exercises: number;
  level?: string;
  duration?: string;
  frequency?: string;
  type?: string;
  reviewDate?: string;
  notes?: string;
  blocks?: WorkoutBlockRecord[];
}

export interface WorkoutBlockRecord {
  id: string;
  name: string;
  exercises: WorkoutExerciseRecord[];
}

export interface WorkoutExerciseRecord {
  id: string;
  name: string;
  group: string;
  equipment: string;
  sets: number;
  reps: string;
  load?: string;
  rest: string;
  notes?: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  salary: string;
  userId?: string;
  gymId?: string;
  hireDate?: string;
  department?: string;
  contractType?: string;
  supervisor?: string;
  shift?: string;
  accessStatus?: string;
  accountMode?: "Sem acesso" | "Convidar nova conta" | "Vincular usuario existente";
  accountEmail?: string;
  accountStatus?: string;
  gymScope?: "Organizacao" | "Unidade especifica" | "Multiunidade";
  gymIds?: string[];
  inviteSentAt?: string;
  inviteUrl?: string;
  lastAccess?: string;
  permissions?: string[];
  notes?: string;
}

export interface EmployeeRoleRecord {
  id: string;
  name: string;
  description?: string;
  modules: string[];
  status: "Ativo" | "Inativo";
  employees: number;
}

export interface EmployeeActivityRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  action: string;
  module: string;
  dateTime: string;
  detail?: string;
}

export interface FinanceRecord {
  id: string;
  kind: "Receita" | "Despesa";
  category: string;
  value: number;
  date: string;
  status: string;
  note?: string;
  accountId?: string;
  accountName?: string;
  method?: string;
  supplier?: string;
  dueDate?: string;
  paidAt?: string;
}

export interface FinanceAccountRecord {
  id: string;
  name: string;
  bank?: string;
  type: "Caixa" | "Corrente" | "Poupanca" | "Carteira movel" | "Cartao" | "Outro";
  openingBalance: number;
  balance: number;
  status: "Ativa" | "Inativa";
  isDefault?: boolean;
  color?: string;
}
