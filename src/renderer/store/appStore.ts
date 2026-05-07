import { create } from "zustand";

export type RouteId =
  | "dashboard"
  | "checkin"
  | "clientes"
  | "planos"
  | "vendas"
  | "produtos"
  | "aulas"
  | "treinos"
  | "funcionarios"
  | "relatorios"
  | "financas"
  | "configuracoes";

type SyncState = "idle" | "syncing";

interface AppState {
  activeRoute: RouteId;
  isOffline: boolean;
  syncState: SyncState;
  syncLabel: string;
  pendingSync: number;
  setRoute: (route: RouteId) => void;
  toggleOffline: () => void;
  syncNow: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  activeRoute: "dashboard",
  isOffline: true,
  syncState: "idle",
  syncLabel: "Sincronizado: Hoje, 10:30",
  pendingSync: 12,
  setRoute: (route) => set({ activeRoute: route }),
  toggleOffline: () => set((state) => ({ isOffline: !state.isOffline })),
  syncNow: async () => {
    set({ syncState: "syncing", syncLabel: "Sincronizando..." });
    await new Promise((resolve) => window.setTimeout(resolve, 1300));
    set({ syncState: "idle", syncLabel: "Sincronizado: Hoje, 10:30", pendingSync: 0 });
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    set({ pendingSync: 12 });
  }
}));
