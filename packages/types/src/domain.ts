export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  plan: string;
  planTone?: string;
  status: string;
  lastCheckin?: string;
  expires?: string;
  birthday?: string;
  avatar?: string;
  document?: string;
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
}

export interface CheckinRecord {
  id: string;
  clientName: string;
  clientId: string;
  type: string;
  accessType: string;
  dateTime: string;
  observation?: string;
}

export interface SaleRecord {
  id: string;
  total: number;
  customer?: string;
  seller: string;
  type: string;
  paymentMethod: string;
  dateTime: string;
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
}

export interface WorkoutRecord {
  id: string;
  name: string;
  client: string;
  goal: string;
  author: string;
  updated: string;
  status: string;
  exercises: number;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  salary: string;
}

export interface FinanceRecord {
  id: string;
  kind: "Receita" | "Despesa";
  category: string;
  value: number;
  date: string;
  status: string;
  note?: string;
}
