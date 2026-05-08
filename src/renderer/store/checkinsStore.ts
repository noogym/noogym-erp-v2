import { create } from "zustand";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { CheckinRecord } from "./domainTypes";

const initial: CheckinRecord[] = [
  { id: "CHK-001", clientName: "Ana Clara Silva", clientId: "CLI-001", type: "Presencial", accessType: "Entrada", dateTime: "Hoje, 07:15" },
  { id: "CHK-002", clientName: "Bruno Santos", clientId: "CLI-002", type: "QR Code", accessType: "Entrada", dateTime: "Hoje, 07:32" },
  { id: "CHK-003", clientName: "Carla Menezes", clientId: "CLI-003", type: "App", accessType: "Entrada", dateTime: "Hoje, 09:00" }
];

const persist = (checkins: CheckinRecord[]) => writeLocal("noogym:checkins", checkins);

export const useCheckinsStore = create<{
  checkins: CheckinRecord[];
  todayCount: number;
  addCheckin: (checkin: Partial<CheckinRecord>) => void;
}>((set) => ({
  checkins: readLocal("noogym:checkins", initial),
  todayCount: readLocal("noogym:checkins", initial).length + 139,
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
    return { checkins, todayCount: state.todayCount + 1 };
  })
}));
