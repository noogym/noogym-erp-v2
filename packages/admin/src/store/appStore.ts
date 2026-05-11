import { create } from "zustand";

export type ThemeMode = "dark" | "light";

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
  theme: ThemeMode;
  onlineOnly: boolean;
  isOffline: boolean;
  syncState: SyncState;
  syncLabel: string;
  pendingSync: number;
  isStatusPanelCollapsed: boolean;
  addPendingSync: (amount?: number) => void;
  setRoute: (route: RouteId) => void;
  setOnlineOnly: (onlineOnly: boolean) => void;
  toggleStatusPanel: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleOffline: () => void;
  syncNow: () => Promise<void>;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("noogym:theme") === "light" ? "light" : "dark";
};

export const useAppStore = create<AppState>((set) => ({
  activeRoute: "dashboard",
  theme: getInitialTheme(),
  onlineOnly: false,
  isOffline: true,
  syncState: "idle",
  syncLabel: "Sincronizado: Hoje, 10:30",
  pendingSync: 12,
  isStatusPanelCollapsed: false,
  addPendingSync: (amount = 1) => set((state) => ({ pendingSync: state.isOffline && !state.onlineOnly ? state.pendingSync + amount : state.pendingSync })),
  setRoute: (route) => set({ activeRoute: route }),
  setOnlineOnly: (onlineOnly) =>
    set((state) => ({
      onlineOnly,
      isOffline: onlineOnly ? false : state.isOffline,
      pendingSync: onlineOnly ? 0 : state.pendingSync,
      syncLabel: onlineOnly ? "Online: sincronizado" : state.syncLabel
    })),
  toggleStatusPanel: () => set((state) => ({ isStatusPanelCollapsed: !state.isStatusPanelCollapsed })),
  setTheme: (theme) => {
    localStorage.setItem("noogym:theme", theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("noogym:theme", theme);
      return { theme };
    }),
  toggleOffline: () => set((state) => (state.onlineOnly ? { isOffline: false, pendingSync: 0 } : { isOffline: !state.isOffline })),
  syncNow: async () => {
    set({ syncState: "syncing", syncLabel: "Sincronizando..." });
    await new Promise((resolve) => window.setTimeout(resolve, 1300));
    set((state) => ({ syncState: "idle", syncLabel: state.onlineOnly ? "Online: sincronizado" : "Sincronizado: Hoje, 10:30", pendingSync: 0 }));
  }
}));
