import type { CheckinRecord, ClientRecord } from "@noogym/types";

export function canClientCheckIn(client: Pick<ClientRecord, "status">) {
  return client.status.toLowerCase() === "ativo";
}

export function countTodayCheckins(checkins: Array<Pick<CheckinRecord, "dateTime">>, todayLabel = "Hoje") {
  return checkins.filter((checkin) => checkin.dateTime.includes(todayLabel)).length;
}

export function calculateCheckinRetention(currentPeriod: number, previousPeriod: number) {
  if (previousPeriod <= 0) return currentPeriod > 0 ? 100 : 0;
  return ((currentPeriod - previousPeriod) / previousPeriod) * 100;
}
