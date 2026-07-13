import { create } from "zustand";
import {
  isHttpOnlyAuthEnabled,
  loginWithApi,
  logoutWithApi,
  refreshWithApi,
  registerWithApi,
  type ApiAuthUser,
  type RegisterPayload,
} from "../lib/api";
import { createGymSettings } from "../lib/settingsApi";

export interface AuthUser {
  id?: string;
  name: string;
  role: string;
  employeeRole?: string;
  permissions?: string[];
  gyms?: Array<{ id: string; name: string }>;
  gym: string;
  email?: string;
  organizationId?: string;
  organizationName?: string;
  supportMode?: boolean;
  supportSessionId?: string;
  supportReason?: string;
  supportActorEmail?: string;
}

interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  authenticatedAt: string;
  supportOriginalSession?: Omit<AuthSession, "supportOriginalSession">;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  supportOriginalSession: Omit<AuthSession, "supportOriginalSession"> | null;
  login: (email: string, password: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  loginMock: () => void;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    organizationName: string;
  }) => Promise<void>;
  registerMock: (name?: string) => void;
  startSupportSession: (session: { accessToken: string; user: ApiAuthUser }) => void;
  exitSupportSession: () => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "noogym:auth";

const defaultUser: AuthUser = {
  name: "Admin",
  role: "Administrador",
  gym: "Noogym Fitness Center - Unidade Central",
};

const getStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as Partial<AuthSession>;
    if (!session.user?.name || !session.user.role || !session.user.gym)
      return null;

    return {
      user: session.user,
      accessToken: isHttpOnlyAuthEnabled() ? undefined : session.accessToken,
      refreshToken: isHttpOnlyAuthEnabled() ? undefined : session.refreshToken,
      authenticatedAt: session.authenticatedAt ?? new Date().toISOString(),
      supportOriginalSession: session.supportOriginalSession,
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const saveSession = (
  user: AuthUser,
  accessToken?: string,
  refreshToken?: string,
  supportOriginalSession?: Omit<AuthSession, "supportOriginalSession">,
) => {
  const session: AuthSession = {
    user,
    accessToken: isHttpOnlyAuthEnabled() ? undefined : accessToken,
    refreshToken: isHttpOnlyAuthEnabled() ? undefined : refreshToken,
    authenticatedAt: new Date().toISOString(),
    supportOriginalSession,
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super administrador",
    OWNER: "Proprietario",
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    TRAINER: "Personal Trainer",
    RECEPTIONIST: "Recepcionista",
    FINANCE: "Financeiro",
    NUTRITIONIST: "Nutricionista",
    STAFF: "Funcionario",
  };

  return labels[role] ?? role;
};

const fromApiUser = (user: ApiAuthUser): AuthUser => ({
  id: user.id,
  name: user.name,
  role: user.employeeRole ?? roleLabel(user.role),
  employeeRole: user.employeeRole,
  permissions: user.permissions,
  gyms: user.gyms,
  gym: user.gyms?.[0]?.name ?? user.organizationName ?? "Noogym Fitness Center",
  email: user.email,
  organizationId: user.organizationId,
  organizationName: user.organizationName,
  supportMode: user.supportMode,
  supportSessionId: user.supportSessionId,
  supportReason: user.supportReason,
  supportActorEmail: user.supportActorEmail,
});

const slugify = (value: string) => {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `noogym-${Date.now()}`;
};

const buildRegisterPayload = (data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  organizationName: string;
}): RegisterPayload => ({
  name: data.name.trim(),
  email: data.email.trim(),
  password: data.password,
  phone: data.phone?.trim() || undefined,
  organizationName: data.organizationName.trim(),
  organizationSlug: slugify(data.organizationName),
});

const initialSession = getStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSession?.user ?? null,
  accessToken: initialSession?.accessToken ?? null,
  refreshToken: initialSession?.refreshToken ?? null,
  isAuthenticated: Boolean(initialSession),
  isLoading: false,
  supportOriginalSession: initialSession?.supportOriginalSession ?? null,
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const session = await loginWithApi({ email: email.trim(), password });
      const user = fromApiUser(session.user);
      saveSession(user, session.accessToken, session.refreshToken);
      set({
        user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        supportOriginalSession: null,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  refreshSession: async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken && !isHttpOnlyAuthEnabled()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        supportOriginalSession: null,
      });
      return;
    }

    try {
      const session = await refreshWithApi(refreshToken ?? undefined);
      const user = fromApiUser(session.user);
      saveSession(user, session.accessToken, session.refreshToken);
      set({
        user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        isAuthenticated: true,
        supportOriginalSession: null,
      });
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        supportOriginalSession: null,
      });
      throw error;
    }
  },
  loginMock: () => {
    saveSession(defaultUser);
    set({
      user: defaultUser,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: true,
      supportOriginalSession: null,
    });
  },
  register: async (data) => {
    set({ isLoading: true });
    try {
      const session = await registerWithApi(buildRegisterPayload(data));
      const createdGym = await createGymSettings(session.accessToken, {
        name: data.organizationName.trim(),
        slug: slugify(data.organizationName),
        isActive: true,
      }).catch((error) => {
        console.error(error);
        return null;
      });
      const user = fromApiUser({
        ...session.user,
        gyms: createdGym
          ? [{ id: createdGym.id, name: createdGym.name }]
          : session.user.gyms,
      });
      saveSession(user, session.accessToken, session.refreshToken);
      set({
        user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        supportOriginalSession: null,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  registerMock: (name) => {
    const user = { ...defaultUser, name: name?.trim() || defaultUser.name };
    saveSession(user);
    set({ user, accessToken: null, refreshToken: null, isAuthenticated: true });
  },
  startSupportSession: (session) => {
    const current = useAuthStore.getState();
    if (!current.user || !current.accessToken) return;

    const originalSession: Omit<AuthSession, "supportOriginalSession"> =
      current.supportOriginalSession ?? {
        user: current.user,
        accessToken: current.accessToken,
        refreshToken: current.refreshToken ?? undefined,
        authenticatedAt: new Date().toISOString(),
      };
    const user = fromApiUser(session.user);
    saveSession(user, session.accessToken, undefined, originalSession);
    set({
      user,
      accessToken: session.accessToken,
      refreshToken: null,
      isAuthenticated: true,
      supportOriginalSession: originalSession,
    });
  },
  exitSupportSession: () => {
    const original = useAuthStore.getState().supportOriginalSession;
    if (!original) return;
    saveSession(original.user, original.accessToken, original.refreshToken);
    set({
      user: original.user,
      accessToken: original.accessToken ?? null,
      refreshToken: original.refreshToken ?? null,
      isAuthenticated: true,
      supportOriginalSession: null,
    });
  },
  logout: () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken || isHttpOnlyAuthEnabled()) {
      void logoutWithApi(refreshToken ?? undefined).catch(() => undefined);
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      supportOriginalSession: null,
    });
  },
}));
