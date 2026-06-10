import { create } from "zustand";
import { checkinFromApi, checkinToDto, createResource, createSubscription, listResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useClientsStore } from "./clientsStore";
import { useNotificationsStore } from "./notificationsStore";
import type { CheckinRecord } from "@noogym/types";

const initial: CheckinRecord[] = [
  { id: "CHK-001", clientName: "Ana Clara Silva", clientId: "CLI-001", type: "Presencial", accessType: "Entrada", dateTime: "Hoje, 07:15" },
  { id: "CHK-002", clientName: "Bruno Santos", clientId: "CLI-002", type: "QR Code", accessType: "Entrada", dateTime: "Hoje, 07:32" },
  { id: "CHK-003", clientName: "Carla Menezes", clientId: "CLI-003", type: "App", accessType: "Entrada", dateTime: "Hoje, 09:00" }
];

const persist = (checkins: CheckinRecord[]) => writeLocal("noogym:checkins", checkins);
const isMissingSubscriptionError = (error: unknown) =>
  error instanceof Error && error.message.includes("valid active subscription");
const isActiveSubscriptionError = (error: unknown) =>
  error instanceof Error && error.message.includes("already has an active subscription");
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
  loadOnline: () => Promise<void>;
  addCheckin: (checkin: Partial<CheckinRecord>) => boolean;
}>((set, get) => ({
  checkins: readLocal("noogym:checkins", initial),
  todayCount: readLocal("noogym:checkins", initial).length + 139,
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiCheckins = await listResource<Record<string, unknown>>("checkins", token);
    const checkins = apiCheckins.map(checkinFromApi);
    persist(checkins);
    syncClientLastCheckins(checkins);
    set({ checkins, todayCount: checkins.filter((checkin) => checkin.dateTime.startsWith("Hoje")).length });
  },
  addCheckin: (checkin) => {
    const client = useClientsStore.getState().clients.find((item) => item.id === checkin.clientId);
    if (client && client.status !== "Ativo") {
      return false;
    }

    const record: CheckinRecord = {
      id: uid("CHK"),
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
      persist(checkins);
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
          const synced = checkinFromApi(apiCheckin);
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
            const synced = checkinFromApi(apiCheckin);
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
              const synced = checkinFromApi(apiCheckin);
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
