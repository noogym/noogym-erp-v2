import { create } from "zustand";
import { checkinFromApi, checkinToDto, createResource, createSubscription, listResource } from "../lib/domainApi";
import { readLocal, readLocalDb, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useClientsStore } from "./clientsStore";
import { useNotificationsStore } from "./notificationsStore";
import { useOperationalSettingsStore } from "./operationalSettingsStore";
import type { CheckinRecord } from "@noogym/types";

export type CheckinBlockCode = "CLIENT_INACTIVE" | "GUEST_DISABLED" | "PLAN_OVERDUE" | "METHOD_DISABLED" | "OUTSIDE_ACCESS_WINDOW" | "DAILY_LIMIT";
export type CheckinValidationResult =
  | { allowed: true }
  | { allowed: false; code: CheckinBlockCode; title: string; message: string };

const initial: CheckinRecord[] = [
  { id: "CHK-001", clientName: "Ana Clara Silva", clientId: "CLI-001", type: "Presencial", accessType: "Entrada", dateTime: "Hoje, 07:15" },
  { id: "CHK-002", clientName: "Bruno Santos", clientId: "CLI-002", type: "QR Code", accessType: "Entrada", dateTime: "Hoje, 07:32" },
  { id: "CHK-003", clientName: "Carla Menezes", clientId: "CLI-003", type: "App", accessType: "Entrada", dateTime: "Hoje, 09:00" }
];

const persist = (checkins: CheckinRecord[], sync = false) => writeLocal("noogym:checkins", checkins, { sync });
const isMissingSubscriptionError = (error: unknown) =>
  error instanceof Error && error.message.includes("valid active subscription");
const isActiveSubscriptionError = (error: unknown) =>
  error instanceof Error && error.message.includes("already has an active subscription");
const methodEnabled = (type: string) => {
  const checkin = useOperationalSettingsStore.getState().settings.checkin;
  const normalized = type.toLowerCase();
  if (normalized.includes("qr") || normalized.includes("app")) return checkin.qrCode;
  if (normalized.includes("biometr")) return checkin.biometric;
  return checkin.manual;
};
const isWithinAccessWindow = (date: Date) => {
  const checkin = useOperationalSettingsStore.getState().settings.checkin;
  const start = timeToMinutes(checkin.accessStart, 0);
  const end = timeToMinutes(checkin.accessEnd, 24 * 60 - 1);
  const tolerance = checkin.toleranceMinutes;
  const current = date.getHours() * 60 + date.getMinutes();
  const allowedStart = Math.max(0, start - tolerance);
  const allowedEnd = Math.min(24 * 60 - 1, end + tolerance);
  return allowedStart <= allowedEnd ? current >= allowedStart && current <= allowedEnd : current >= allowedStart || current <= allowedEnd;
};
const timeToMinutes = (value: string, fallback: number) => {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : fallback;
};
const sameDay = (value: string | undefined, date: Date) => {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toDateString() === date.toDateString();
};
const normalizeText = (value: string | undefined) =>
  (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const isActiveClientStatus = (status: string | undefined) => ["ativo", "active", "activo", "ativa"].includes(normalizeText(status));
const isOverdueClientStatus = (status: string | undefined) => ["em atraso", "overdue", "vencido", "atrasado"].includes(normalizeText(status));
const isGuestCheckinType = (type: string | undefined) => ["avulso", "check-in avulso", "entrada avulsa"].includes(normalizeText(type));
const parseClientExpiration = (value: string | undefined) => {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const parsed = match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};
const isExpiredForCheckin = (expires: string | undefined, checkedAt: Date) => {
  const parsed = parseClientExpiration(expires);
  if (!parsed) return false;
  const expirationDayEnd = new Date(parsed);
  expirationDayEnd.setHours(23, 59, 59, 999);
  return expirationDayEnd < checkedAt;
};
const mergeSyncedCheckin = (synced: CheckinRecord, fallback: CheckinRecord): CheckinRecord => ({
  ...synced,
  type: isGuestCheckinType(fallback.type) ? fallback.type : synced.type,
  observation: fallback.observation ?? synced.observation
});
const syncClientLastCheckins = (checkins: CheckinRecord[]) => {
  const latestByClient = new Map<string, string>();

  checkins.forEach((checkin) => {
    if (!latestByClient.has(checkin.clientId)) latestByClient.set(checkin.clientId, checkin.dateTime);
  });

  latestByClient.forEach((lastCheckin, clientId) => {
    useClientsStore.getState().updateLastCheckin(clientId, lastCheckin);
  });
};

export const useCheckinsStore = create<{
  checkins: CheckinRecord[];
  todayCount: number;
  loadLocal: () => Promise<void>;
  loadOnline: () => Promise<void>;
  validateCheckin: (checkin: Partial<CheckinRecord>) => CheckinValidationResult;
  addCheckin: (checkin: Partial<CheckinRecord>) => boolean;
}>((set, get) => ({
  checkins: readLocal("noogym:checkins", initial),
  todayCount: readLocal("noogym:checkins", initial).length + 139,
  loadLocal: async () => {
    const checkins = await readLocalDb("noogym:checkins", initial);
    persist(checkins);
    syncClientLastCheckins(checkins);
    set({ checkins, todayCount: checkins.filter((checkin) => checkin.dateTime.startsWith("Hoje")).length });
  },
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const activeGymId = useAppStore.getState().activeGymId ?? undefined;
    const apiCheckins = await listResource<Record<string, unknown>>("checkins", token, { gymId: activeGymId });
    const checkins = apiCheckins.map(checkinFromApi);
    persist(checkins);
    syncClientLastCheckins(checkins);
    set({ checkins, todayCount: checkins.filter((checkin) => checkin.dateTime.startsWith("Hoje")).length });
  },
  validateCheckin: (checkin) => {
    const client = useClientsStore.getState().clients.find((item) => item.id === checkin.clientId);
    const settings = useOperationalSettingsStore.getState().settings.checkin;
    const checkedAt = checkin.checkedAtIso ? new Date(checkin.checkedAtIso) : new Date();
    const type = checkin.type ?? "Manual";
    const isGuestCheckin = isGuestCheckinType(type);

    if (isGuestCheckin && !settings.allowGuestCheckin) {
      return {
        allowed: false,
        code: "GUEST_DISABLED",
        title: "Check-in avulso desativado",
        message: "Ative a opcao Permitir check-in avulso nas configuracoes da unidade para registrar esta entrada."
      };
    }

    if (client && !isActiveClientStatus(client.status)) {
      const overdue = isOverdueClientStatus(client.status) || isExpiredForCheckin(client.expires, checkedAt);
      if (overdue && settings.blockExpiredPlan && !isGuestCheckin) {
        return {
          allowed: false,
          code: "PLAN_OVERDUE",
          title: "Plano vencido",
          message: "A mensalidade deste cliente esta vencida e a regra da unidade bloqueia check-ins em atraso."
        };
      }
      if (!overdue || !isGuestCheckin) {
        return {
          allowed: false,
          code: "CLIENT_INACTIVE",
          title: "Cliente inativo",
          message: "Este cliente nao esta ativo. Reative o cadastro antes de registrar o check-in."
        };
      }
    }

    if (client && settings.blockExpiredPlan && !isGuestCheckin && isExpiredForCheckin(client.expires, checkedAt)) {
      return {
        allowed: false,
        code: "PLAN_OVERDUE",
        title: "Plano vencido",
        message: "A mensalidade deste cliente esta vencida e a regra da unidade bloqueia check-ins em atraso."
      };
    }

    if (!methodEnabled(type) || !isWithinAccessWindow(checkedAt)) {
      if (!methodEnabled(type)) {
        return {
          allowed: false,
          code: "METHOD_DISABLED",
          title: "Metodo desativado",
          message: `O check-in por ${type} esta desativado nas configuracoes da unidade.`
        };
      }
      return {
        allowed: false,
        code: "OUTSIDE_ACCESS_WINDOW",
        title: "Fora do horario",
        message: `Este check-in esta fora da janela permitida (${settings.accessStart} - ${settings.accessEnd}).`
      };
    }

    const clientCheckinsToday = get().checkins.filter((item) => item.clientId === checkin.clientId && sameDay(item.checkedAtIso, checkedAt)).length;
    if (settings.dailyLimit > 0 && clientCheckinsToday >= settings.dailyLimit) {
      return {
        allowed: false,
        code: "DAILY_LIMIT",
        title: "Limite diario atingido",
        message: `Este cliente ja atingiu o limite de ${settings.dailyLimit} check-in(s) hoje.`
      };
    }

    return { allowed: true };
  },
  addCheckin: (checkin) => {
    const validation = get().validateCheckin(checkin);
    if (!validation.allowed) return false;

    const record: CheckinRecord = {
      id: uid("CHK"),
      gymId: checkin.gymId ?? useAppStore.getState().activeGymId ?? undefined,
      clientName: checkin.clientName ?? "Cliente Noogym",
      clientId: checkin.clientId ?? "CLI-000",
      type: checkin.type ?? "Manual",
      accessType: checkin.accessType ?? "Entrada",
      dateTime: checkin.dateTime ?? "Hoje, 10:30",
      checkedAtIso: checkin.checkedAtIso,
      observation: checkin.observation
    };

    const token = useAuthStore.getState().accessToken;
    const shouldSyncOnline = useAppStore.getState().onlineOnly && Boolean(token);

    set((state) => {
      const checkins = [record, ...state.checkins];
      persist(checkins, true);
      useClientsStore.getState().updateLastCheckin(record.clientId, record.dateTime);
      useAppStore.getState().addPendingSync();
      useNotificationsStore.getState().addNotification({
        sourceId: `event:checkins:${record.id}`,
        title: "Check-in realizado",
        description: `${record.clientName} registado por ${record.type}.`,
        category: "checkins",
        tone: "success",
        route: "checkin",
        actionLabel: "Ver check-ins"
      });

      return { checkins, todayCount: state.todayCount + 1 };
    });

    if (shouldSyncOnline && token) {
      createResource<Record<string, unknown>>("checkins", token, checkinToDto(record))
        .then((apiCheckin) => {
          const synced = mergeSyncedCheckin(checkinFromApi(apiCheckin), record);
          const nextCheckins = get().checkins.map((item) => item.id === record.id ? synced : item);
          persist(nextCheckins);
          useClientsStore.getState().updateLastCheckin(synced.clientId, synced.dateTime);
          set({ checkins: nextCheckins, todayCount: nextCheckins.filter((item) => item.dateTime.startsWith("Hoje")).length });
        })
        .catch(async (error) => {
          const client = useClientsStore.getState().clients.find((item) => item.id === record.clientId);
          if (!isMissingSubscriptionError(error) || !client?.planId) {
            console.error(error);
            return;
          }

          try {
            await createSubscription(token, { memberId: record.clientId, planId: client.planId, startDate: record.checkedAtIso });
            const apiCheckin = await createResource<Record<string, unknown>>("checkins", token, checkinToDto(record));
            const synced = mergeSyncedCheckin(checkinFromApi(apiCheckin), record);
            const nextCheckins = get().checkins.map((item) => item.id === record.id ? synced : item);
            persist(nextCheckins);
            useClientsStore.getState().updateLastCheckin(synced.clientId, synced.dateTime);
            set({ checkins: nextCheckins, todayCount: nextCheckins.filter((item) => item.dateTime.startsWith("Hoje")).length });
          } catch (retryError) {
            if (!isActiveSubscriptionError(retryError)) {
              console.error(retryError);
              return;
            }

            try {
              const apiCheckin = await createResource<Record<string, unknown>>("checkins", token, checkinToDto(record));
              const synced = mergeSyncedCheckin(checkinFromApi(apiCheckin), record);
              const nextCheckins = get().checkins.map((item) => item.id === record.id ? synced : item);
              persist(nextCheckins);
              useClientsStore.getState().updateLastCheckin(synced.clientId, synced.dateTime);
              set({ checkins: nextCheckins, todayCount: nextCheckins.filter((item) => item.dateTime.startsWith("Hoje")).length });
            } catch (finalError) {
              console.error(finalError);
            }
          }
        });
    }

    return true;
  }
}));
