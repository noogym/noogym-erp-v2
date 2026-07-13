import { create } from "zustand";
import { apiBaseUrl, isHttpOnlyAuthEnabled } from "../lib/api";
import { runDesktopSync, saveDesktopBinding } from "../lib/desktopLocalDb";
import { useAuthStore } from "./authStore";

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
  | "sincronizacao"
  | "super-admin"
  | "configuracoes";

type SyncState = "idle" | "syncing";
export type DesktopConnectionState =
  | "offline"
  | "online_without_session"
  | "ready_to_sync"
  | "syncing";

type ConnectivityOptions = {
  autoSync?: boolean;
};

interface AppState {
  activeRoute: RouteId;
  activeGymId: string | null;
  theme: ThemeMode;
  onlineOnly: boolean;
  isOffline: boolean;
  connectionState: DesktopConnectionState;
  isGymDataLoading: boolean;
  syncState: SyncState;
  syncLabel: string;
  pendingSync: number;
  conflictSync: number;
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
  refreshSyncStatus: () => Promise<void>;
  checkConnectivity: (options?: ConnectivityOptions) => Promise<void>;
  startConnectivityMonitor: () => () => void;
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

const syncTimestamp = () =>
  new Intl.DateTimeFormat("pt-AO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const desktopBridge = () => {
  if (typeof window === "undefined") return undefined;
  return window.noogym?.localDb;
};

const syncLabelFor = (connectionState: DesktopConnectionState, pendingSync: number, conflictSync = 0) => {
  if (conflictSync > 0) return `${conflictSync} conflito(s) para resolver`;
  if (connectionState === "offline") return "Modo offline: dados guardados localmente";
  if (connectionState === "online_without_session") return "Online: conecte conta para sincronizar";
  if (connectionState === "syncing") return "Sincronizando...";
  return pendingSync > 0 ? `${pendingSync} pendente(s), pronto para sincronizar` : "Online: pronto para sincronizar";
};

const pingApi = async () => {
  if (typeof window === "undefined") return false;
  if (window.navigator.onLine === false) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_000);

  try {
    const response = await fetch(`${apiBaseUrl()}/health/live`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
};

const resolveAccessToken = async () => {
  const auth = useAuthStore.getState();
  if (auth.accessToken) return auth.accessToken;
  if (!auth.refreshToken && !isHttpOnlyAuthEnabled()) return null;

  return refreshAccessToken();
};

const refreshAccessToken = async () => {
  const auth = useAuthStore.getState();
  if (!auth.refreshToken && !isHttpOnlyAuthEnabled()) return null;

  try {
    await auth.refreshSession();
    return useAuthStore.getState().accessToken;
  } catch {
    return null;
  }
};

let connectivityMonitor: number | undefined;
let autoSyncInFlight = false;

export const useAppStore = create<AppState>((set, get) => ({
  activeRoute: "dashboard",
  activeGymId: getInitialActiveGymId(),
  theme: getInitialTheme(),
  onlineOnly: false,
  isOffline: true,
  connectionState: "offline",
  isGymDataLoading: false,
  syncState: "idle",
  syncLabel: syncLabelFor("offline", 0),
  pendingSync: 0,
  conflictSync: 0,
  zoomFactor: getInitialZoomFactor(),
  isStatusPanelCollapsed: true,
  addPendingSync: (amount = 1) =>
    set((state) => ({
      pendingSync: state.onlineOnly ? state.pendingSync : state.pendingSync + amount,
      syncLabel: state.onlineOnly ? state.syncLabel : syncLabelFor(state.connectionState, state.pendingSync + amount, state.conflictSync),
    })),
  setActiveGymId: (gymId) => {
    persistActiveGymId(gymId);
    if (gymId && desktopBridge()?.binding) {
      void saveDesktopBinding({ activeGymId: gymId }).catch(console.error);
    }
    set({ activeGymId: gymId });
  },
  setGymDataLoading: (isGymDataLoading) => set({ isGymDataLoading }),
  setRoute: (route) => set({ activeRoute: route }),
  setOnlineOnly: (onlineOnly) =>
    set((state) => ({
      onlineOnly,
      isOffline: onlineOnly ? false : state.isOffline,
      connectionState: onlineOnly ? "ready_to_sync" : state.connectionState,
      pendingSync: onlineOnly ? 0 : state.pendingSync,
      conflictSync: onlineOnly ? 0 : state.conflictSync,
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
  toggleOffline: () =>
    set((state) => {
      if (state.onlineOnly) return { isOffline: false, pendingSync: 0 };
      const connectionState: DesktopConnectionState = state.isOffline ? "ready_to_sync" : "offline";
      return {
        isOffline: !state.isOffline,
        connectionState,
        syncLabel: syncLabelFor(connectionState, state.pendingSync, state.conflictSync),
      };
    }),
  refreshSyncStatus: async () => {
    const bridge = desktopBridge();
    if (!bridge) return;

    const status = await bridge.status();
    set((state) => ({
      pendingSync: status.pendingSync,
      conflictSync: status.conflictSync ?? 0,
      syncLabel:
        state.syncState === "syncing"
          ? state.syncLabel
          : syncLabelFor(state.connectionState, status.pendingSync, status.conflictSync ?? 0),
    }));
  },
  checkConnectivity: async (options = {}) => {
    const bridge = desktopBridge();
    if (!bridge) return;

    let pendingSync = get().pendingSync;
    let conflictSync = get().conflictSync;
    try {
      const status = await bridge.status();
      pendingSync = status.pendingSync;
      conflictSync = status.conflictSync ?? 0;
    } catch {
      pendingSync = get().pendingSync;
      conflictSync = get().conflictSync;
    }

    const apiReachable = await pingApi();
    if (!apiReachable) {
      set({
        isOffline: true,
        connectionState: "offline",
        pendingSync,
        conflictSync,
        syncLabel: syncLabelFor("offline", pendingSync, conflictSync),
      });
      return;
    }

    const token = await resolveAccessToken();
    if (!token) {
      set({
        isOffline: false,
        connectionState: "online_without_session",
        pendingSync,
        conflictSync,
        syncLabel: syncLabelFor("online_without_session", pendingSync, conflictSync),
      });
      return;
    }

    set({
      isOffline: false,
      connectionState: "ready_to_sync",
      pendingSync,
      conflictSync,
      syncLabel: syncLabelFor("ready_to_sync", pendingSync, conflictSync),
    });

    if (options.autoSync !== false && pendingSync > 0 && conflictSync === 0 && !autoSyncInFlight) {
      autoSyncInFlight = true;
      try {
        await get().syncNow();
      } finally {
        autoSyncInFlight = false;
      }
    }
  },
  startConnectivityMonitor: () => {
    if (typeof window === "undefined") return () => undefined;
    if (connectivityMonitor) window.clearInterval(connectivityMonitor);

    const check = () => void get().checkConnectivity({ autoSync: true });
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    connectivityMonitor = window.setInterval(check, 15_000);

    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      if (connectivityMonitor) {
        window.clearInterval(connectivityMonitor);
        connectivityMonitor = undefined;
      }
    };
  },
  syncNow: async () => {
    set({ syncState: "syncing", connectionState: "syncing", syncLabel: syncLabelFor("syncing", get().pendingSync, get().conflictSync) });
    if (desktopBridge()?.sync) {
      const apiReachable = await pingApi();
      if (!apiReachable) {
        set((state) => ({
          syncState: "idle",
          isOffline: true,
          connectionState: "offline",
          syncLabel: syncLabelFor("offline", state.pendingSync, state.conflictSync),
        }));
        return;
      }

      const token = await resolveAccessToken();
      const user = useAuthStore.getState().user;
      if (!token) {
        set((state) => ({
          syncState: "idle",
          isOffline: false,
          connectionState: "online_without_session",
          syncLabel: syncLabelFor("online_without_session", state.pendingSync, state.conflictSync),
        }));
        return;
      }

      try {
        let result = await runDesktopSync({
          apiUrl: apiBaseUrl(),
          token,
          gymId: get().activeGymId ?? undefined,
          session: {
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  organizationId: user.organizationId,
                  organizationName: user.gym,
                  gyms: user.gyms,
                }
              : undefined,
          },
        });

        if (!result?.success && result?.errors?.some((error) => error.includes("401"))) {
          const refreshedToken = await refreshAccessToken();
          if (refreshedToken && refreshedToken !== token) {
            result = await runDesktopSync({
              apiUrl: apiBaseUrl(),
              token: refreshedToken,
              gymId: get().activeGymId ?? undefined,
              session: {
                user: user
                  ? {
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      role: user.role,
                      organizationId: user.organizationId,
                      organizationName: user.gym,
                      gyms: user.gyms,
                    }
                  : undefined,
              },
            });
          }
        }

        if (!result?.success) {
          set({
            syncState: "idle",
            isOffline: false,
            connectionState: "ready_to_sync",
            syncLabel: result?.message ?? result?.errors?.[0] ?? "Sincronizacao pendente",
            pendingSync: result?.pendingSync ?? get().pendingSync,
            conflictSync: result?.conflictSync ?? get().conflictSync,
          });
          return;
        }

        window.dispatchEvent(new CustomEvent("noogym:desktop-sync-complete"));
        const syncedGymId = result.binding?.activeGymId;
        if (!get().activeGymId && syncedGymId) persistActiveGymId(syncedGymId);
        set({
          syncState: "idle",
          isOffline: false,
          connectionState: "ready_to_sync",
          syncLabel: `Sincronizado: ${syncTimestamp()}`,
          pendingSync: result.pendingSync ?? 0,
          conflictSync: result.conflictSync ?? 0,
          activeGymId: get().activeGymId ?? syncedGymId ?? null,
        });
        return;
      } catch (error) {
        set((state) => ({
          syncState: "idle",
          connectionState: "ready_to_sync",
          syncLabel: error instanceof Error ? error.message : "Falha ao sincronizar",
          pendingSync: state.pendingSync,
          conflictSync: state.conflictSync,
        }));
        return;
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1300));
    set((state) => ({
      syncState: "idle",
      connectionState: state.onlineOnly ? "ready_to_sync" : state.connectionState,
      syncLabel: state.onlineOnly ? "Online: sincronizado" : `Sincronizado: ${syncTimestamp()}`,
      pendingSync: 0,
      conflictSync: 0,
    }));
  }
}));
