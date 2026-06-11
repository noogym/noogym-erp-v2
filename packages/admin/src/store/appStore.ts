import { create } from "zustand";

export type ThemeMode = "dark" | "light";

export const MIN_ZOOM_FACTOR = 0.85;
export const MAX_ZOOM_FACTOR = 1.25;
export const ZOOM_STEP = 0.05;
export const DEFAULT_ZOOM_FACTOR = 1;

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
  activeGymId: string | null;
  theme: ThemeMode;
  onlineOnly: boolean;
  isOffline: boolean;
  isGymDataLoading: boolean;
  syncState: SyncState;
  syncLabel: string;
  pendingSync: number;
  zoomFactor: number;
  isStatusPanelCollapsed: boolean;
  addPendingSync: (amount?: number) => void;
  setActiveGymId: (gymId: string | null) => void;
  setGymDataLoading: (isGymDataLoading: boolean) => void;
  setRoute: (route: RouteId) => void;
  setOnlineOnly: (onlineOnly: boolean) => void;
  decreaseZoom: () => void;
  increaseZoom: () => void;
  resetZoom: () => void;
  setZoomFactor: (zoomFactor: number) => void;
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

const clampZoomFactor = (zoomFactor: number) => {
  const clamped = Math.min(MAX_ZOOM_FACTOR, Math.max(MIN_ZOOM_FACTOR, zoomFactor));
  return Math.round(clamped * 100) / 100;
};

const getInitialZoomFactor = () => {
  if (typeof window === "undefined") return DEFAULT_ZOOM_FACTOR;
  const storedZoomFactor = Number(localStorage.getItem("noogym:desktop-zoom-factor"));
  if (!Number.isFinite(storedZoomFactor)) return DEFAULT_ZOOM_FACTOR;
  return clampZoomFactor(storedZoomFactor);
};

const persistZoomFactor = (zoomFactor: number) => {
  localStorage.setItem("noogym:desktop-zoom-factor", String(zoomFactor));
};

const getInitialActiveGymId = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("noogym:active-gym-id");
};

const persistActiveGymId = (gymId: string | null) => {
  if (typeof window === "undefined") return;
  if (gymId) localStorage.setItem("noogym:active-gym-id", gymId);
  else localStorage.removeItem("noogym:active-gym-id");
};

export const useAppStore = create<AppState>((set) => ({
  activeRoute: "dashboard",
  activeGymId: getInitialActiveGymId(),
  theme: getInitialTheme(),
  onlineOnly: false,
  isOffline: true,
  isGymDataLoading: false,
  syncState: "idle",
  syncLabel: "Sincronizado: Hoje, 10:30",
  pendingSync: 12,
  zoomFactor: getInitialZoomFactor(),
  isStatusPanelCollapsed: true,
  addPendingSync: (amount = 1) => set((state) => ({ pendingSync: state.isOffline && !state.onlineOnly ? state.pendingSync + amount : state.pendingSync })),
  setActiveGymId: (gymId) => {
    persistActiveGymId(gymId);
    set({ activeGymId: gymId });
  },
  setGymDataLoading: (isGymDataLoading) => set({ isGymDataLoading }),
  setRoute: (route) => set({ activeRoute: route }),
  setOnlineOnly: (onlineOnly) =>
    set((state) => ({
      onlineOnly,
      isOffline: onlineOnly ? false : state.isOffline,
      pendingSync: onlineOnly ? 0 : state.pendingSync,
      syncLabel: onlineOnly ? "Online: sincronizado" : state.syncLabel
    })),
  decreaseZoom: () =>
    set((state) => {
      const zoomFactor = clampZoomFactor(state.zoomFactor - ZOOM_STEP);
      persistZoomFactor(zoomFactor);
      return { zoomFactor };
    }),
  increaseZoom: () =>
    set((state) => {
      const zoomFactor = clampZoomFactor(state.zoomFactor + ZOOM_STEP);
      persistZoomFactor(zoomFactor);
      return { zoomFactor };
    }),
  resetZoom: () => {
    persistZoomFactor(DEFAULT_ZOOM_FACTOR);
    set({ zoomFactor: DEFAULT_ZOOM_FACTOR });
  },
  setZoomFactor: (nextZoomFactor) => {
    const zoomFactor = clampZoomFactor(nextZoomFactor);
    persistZoomFactor(zoomFactor);
    set({ zoomFactor });
  },
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
