import type { ClientRecord, FinanceRecord, PlanRecord, ProductRecord, SaleRecord } from "@noogym/types";

export function calculateSaleTotal(items: Array<{ price: number; quantity: number }>) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function calculateGrossMargin(product: Pick<ProductRecord, "price" | "cost">) {
  if (product.price <= 0) return 0;
  return ((product.price - product.cost) / product.price) * 100;
}

export function calculateFinanceBalance(records: FinanceRecord[]) {
  return records.reduce((total, record) => total + (record.kind === "Receita" ? record.value : -record.value), 0);
}

export function calculateRevenue(records: Array<Pick<SaleRecord, "total">>) {
  return records.reduce((total, sale) => total + sale.total, 0);
}

export function calculateOverdueRate(clients: Array<Pick<ClientRecord, "status">>) {
  if (clients.length === 0) return 0;
  const overdue = clients.filter((client) => client.status.toLowerCase().includes("inadimplente") || client.status.toLowerCase().includes("vencido")).length;
  return (overdue / clients.length) * 100;
}

export function calculatePlanMonthlyRevenue(plans: Array<Pick<PlanRecord, "price" | "clients">>) {
  return plans.reduce((total, plan) => total + parsePlanPrice(plan.price) * plan.clients, 0);
}

function parsePlanPrice(price: string) {
  const [numericPart] = price.split("/");
  const parsed = Number(numericPart.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
