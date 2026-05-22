import { create } from "zustand";
import { checkinFromApi, checkinToDto, createResource, listResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { CheckinRecord } from "@noogym/types";

const initial: CheckinRecord[] = [
  { id: "CHK-001", clientName: "Ana Clara Silva", clientId: "CLI-001", type: "Presencial", accessType: "Entrada", dateTime: "Hoje, 07:15" },
  { id: "CHK-002", clientName: "Bruno Santos", clientId: "CLI-002", type: "QR Code", accessType: "Entrada", dateTime: "Hoje, 07:32" },
  { id: "CHK-003", clientName: "Carla Menezes", clientId: "CLI-003", type: "App", accessType: "Entrada", dateTime: "Hoje, 09:00" }
];

const persist = (checkins: CheckinRecord[]) => writeLocal("noogym:checkins", checkins);

export const useCheckinsStore = create<{
  checkins: CheckinRecord[];
  todayCount: number;
  loadOnline: () => Promise<void>;
  addCheckin: (checkin: Partial<CheckinRecord>) => void;
}>((set, get) => ({
  checkins: readLocal("noogym:checkins", initial),
  todayCount: readLocal("noogym:checkins", initial).length + 139,
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiCheckins = await listResource<Record<string, unknown>>("checkins", token);
    const checkins = apiCheckins.map(checkinFromApi);
    persist(checkins);
    set({ checkins, todayCount: checkins.filter((checkin) => checkin.dateTime.startsWith("Hoje")).length });
  },
  addCheckin: (checkin) => set((state) => {
    const record: CheckinRecord = {
      id: uid("CHK"),
      clientName: checkin.clientName ?? "Cliente Noogym",
      clientId: checkin.clientId ?? "CLI-000",
      type: checkin.type ?? "Manual",
      accessType: checkin.accessType ?? "Entrada",
      dateTime: checkin.dateTime ?? "Hoje, 10:30",
      observation: checkin.observation
    };
    const checkins = [record, ...state.checkins];
    persist(checkins);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("checkins", token, checkinToDto(record))
        .then((apiCheckin) => {
          const synced = checkinFromApi(apiCheckin);
          const nextCheckins = get().checkins.map((item) => item.id === record.id ? synced : item);
          persist(nextCheckins);
          set({ checkins: nextCheckins, todayCount: nextCheckins.filter((item) => item.dateTime.startsWith("Hoje")).length });
        })
        .catch(console.error);
    }

    return { checkins, todayCount: state.todayCount + 1 };
  })
}));
