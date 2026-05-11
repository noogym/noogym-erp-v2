import { create } from "zustand";

export interface AuthUser {
  name: string;
  role: string;
  gym: string;
}

interface AuthSession {
  user: AuthUser;
  authenticatedAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginMock: () => void;
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
      authenticatedAt: session.authenticatedAt ?? new Date().toISOString()
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const saveSession = (user: AuthUser) => {
  const session: AuthSession = {
    user,
    authenticatedAt: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const initialSession = getStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSession?.user ?? null,
  isAuthenticated: Boolean(initialSession),
  loginMock: () => {
    saveSession(defaultUser);
    set({ user: defaultUser, isAuthenticated: true });
  },
  registerMock: (name) => {
    const user = { ...defaultUser, name: name?.trim() || defaultUser.name };
    saveSession(user);
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null, isAuthenticated: false });
  }
}));
