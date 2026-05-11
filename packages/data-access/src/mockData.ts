import type { CheckinRecord, ClientRecord, FinanceRecord, PlanRecord, ProductRecord, SaleRecord } from "@noogym/types";

export const mockClients: ClientRecord[] = [
  {
    id: "CLI-001",
    name: "Ana Luisa Santos",
    phone: "+244 923 456 789",
    email: "ana.santos@email.com",
    plan: "Premium Mensal",
    planTone: "lime",
    status: "Ativo",
    lastCheckin: "Hoje, 09:41",
    expires: "12/06/2026",
    birthday: "15 Mai",
    avatar: "AL"
  },
  {
    id: "CLI-002",
    name: "Carlos Mendes",
    phone: "+244 923 111 222",
    email: "carlos.mendes@email.com",
    plan: "Musculacao",
    planTone: "gray",
    status: "Ativo",
    lastCheckin: "Hoje, 08:15",
    expires: "10/06/2026",
    birthday: "18 Mai",
    avatar: "CM"
  }
];

export const mockPlans: PlanRecord[] = [
  {
    id: "PLAN-001",
    name: "Premium Mensal",
    description: "Musculacao + aulas coletivas",
    category: "Premium",
    price: "35.000 Kz/mes",
    duration: "Mensal",
    type: "Recorrente",
    clients: 420,
    status: "Ativo"
  }
];

export const mockProducts: ProductRecord[] = [
  {
    id: "PRD-001",
    name: "Whey Protein 900g",
    category: "Suplementos",
    stock: 24,
    price: 12500,
    cost: 7500,
    emoji: "WHEY",
    status: "Ativo"
  }
];

export const mockCheckins: CheckinRecord[] = [
  {
    id: "CHK-001",
    clientName: "Ana Luisa Santos",
    clientId: "CLI-001",
    type: "Manual",
    accessType: "Plano ativo",
    dateTime: "Hoje, 09:41"
  }
];

export const mockSales: SaleRecord[] = [
  {
    id: "SAL-001",
    total: 35000,
    customer: "Ana Luisa Santos",
    seller: "Recepcao",
    type: "Plano",
    paymentMethod: "TPA",
    dateTime: "Hoje, 10:20"
  }
];

export const mockFinances: FinanceRecord[] = [
  {
    id: "FIN-001",
    kind: "Receita",
    category: "Mensalidades",
    value: 35000,
    date: "2026-05-11",
    status: "Confirmado",
    note: "Premium Mensal"
  }
];
