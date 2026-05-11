import type { ClientRecord, PlanRecord } from "@noogym/types";

export function countClientsByPlan(clients: Array<Pick<ClientRecord, "plan">>, planName: string) {
  return clients.filter((client) => client.plan === planName).length;
}

export function isRecurringPlan(plan: Pick<PlanRecord, "type">) {
  return plan.type.toLowerCase() === "recorrente";
}

export function calculateExpirationDate(startDate: Date, durationDays: number) {
  const expiration = new Date(startDate);
  expiration.setDate(expiration.getDate() + durationDays);
  return expiration;
}
