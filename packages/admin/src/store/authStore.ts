import { create } from "zustand";
import { loginWithApi, registerWithApi, type ApiAuthUser, type RegisterPayload } from "../lib/api";

export interface AuthUser {
  id?: string;
  name: string;
  role: string;
  gym: string;
  email?: string;
  organizationId?: string;
}

interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  authenticatedAt: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginMock: () => void;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    organizationName: string;
  }) => Promise<void>;
  registerMock: (name?: string) => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "noogym:auth";

const defaultUser: AuthUser = {
  name: "Admin",
  role: "Administrador",
  gym: "Noogym Fitness Center - Unidade Central"
};

const getStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as Partial<AuthSession>;
    if (!session.user?.name || !session.user.role || !session.user.gym) return null;

    return {
      user: session.user,
      accessToken: session.accessToken,
      authenticatedAt: session.authenticatedAt ?? new Date().toISOString()
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const saveSession = (user: AuthUser, accessToken?: string) => {
  const session: AuthSession = {
    user,
    accessToken,
    authenticatedAt: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    OWNER: "Proprietario",
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    STAFF: "Funcionario"
  };

  return labels[role] ?? role;
};

const fromApiUser = (user: ApiAuthUser): AuthUser => ({
  id: user.id,
  name: user.name,
  role: roleLabel(user.role),
  gym: user.organizationName ?? "Noogym Fitness Center",
  email: user.email,
  organizationId: user.organizationId
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
  organizationSlug: slugify(data.organizationName)
});

const initialSession = getStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSession?.user ?? null,
  accessToken: initialSession?.accessToken ?? null,
  isAuthenticated: Boolean(initialSession),
  isLoading: false,
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const session = await loginWithApi({ email: email.trim(), password });
      const user = fromApiUser(session.user);
      saveSession(user, session.accessToken);
      set({ user, accessToken: session.accessToken, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  loginMock: () => {
    saveSession(defaultUser);
    set({ user: defaultUser, accessToken: null, isAuthenticated: true });
  },
  register: async (data) => {
    set({ isLoading: true });
    try {
      const session = await registerWithApi(buildRegisterPayload(data));
      const user = fromApiUser(session.user);
      saveSession(user, session.accessToken);
      set({ user, accessToken: session.accessToken, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  registerMock: (name) => {
    const user = { ...defaultUser, name: name?.trim() || defaultUser.name };
    saveSession(user);
    set({ user, accessToken: null, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  }
}));
