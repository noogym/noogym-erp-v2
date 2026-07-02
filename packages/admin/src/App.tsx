import { useCallback, useEffect, useState } from "react";
import { BottomSyncBar } from "./components/layout/BottomSyncBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { useAppStore } from "./store/appStore";
import { useAuthStore } from "./store/authStore";
import { useCheckinsStore } from "./store/checkinsStore";
import { useClassesStore } from "./store/classesStore";
import { useClientsStore } from "./store/clientsStore";
import { useEmployeesStore } from "./store/employeesStore";
import { useFinanceStore } from "./store/financeStore";
import { usePlansStore } from "./store/plansStore";
import { useProductsStore } from "./store/productsStore";
import { useSalesStore } from "./store/salesStore";
import { useSettingsStore } from "./store/settingsStore";
import { useWorkoutsStore } from "./store/workoutsStore";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Clientes from "./pages/Clientes";
import Planos from "./pages/Planos";
import VendasPOS from "./pages/VendasPOS";
import Produtos from "./pages/Produtos";
import Aulas from "./pages/Aulas";
import Treinos from "./pages/Treinos";
import Funcionarios from "./pages/Funcionarios";
import Relatorios from "./pages/Relatorios";
import Financas from "./pages/Financas";
import Configuracoes from "./pages/Configuracoes";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import { ToastViewport } from "./components/ui/Toast";
import { isHttpOnlyAuthEnabled } from "./lib/api";
import { canAccessRoute, firstAllowedRoute } from "./lib/permissions";
import { navItems } from "./routes/nav";

const pages = {
  dashboard: Dashboard,
  checkin: CheckIn,
  clientes: Clientes,
  planos: Planos,
  vendas: VendasPOS,
  produtos: Produtos,
  aulas: Aulas,
  treinos: Treinos,
  funcionarios: Funcionarios,
  relatorios: Relatorios,
  financas: Financas,
  configuracoes: Configuracoes,
};

type AuthRoute = "login" | "register" | "forgot-password" | "reset-password";

const authRouteFromValue = (value: string): AuthRoute | null => {
  const normalized = value
    .toLowerCase()
    .replace(/^#?\/?/, "")
    .split(/[/?#]/)[0];
  if (normalized === "register") return "register";
  if (normalized === "forgot-password") return "forgot-password";
  if (normalized === "reset-password") return "reset-password";
  if (normalized === "login") return "login";
  return null;
};

const getAuthRoute = (): AuthRoute => {
  if (typeof window === "undefined") return "login";
  const hashRoute = authRouteFromValue(window.location.hash);
  if (hashRoute) return hashRoute;

  const pathname = window.location.pathname.toLowerCase();
  const pathRoute = authRouteFromValue(pathname);
  if (pathRoute) return pathRoute;

  return "login";
};

const isAuthPath = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    authRouteFromValue(window.location.hash) ??
    authRouteFromValue(window.location.pathname),
  );
};

const updateAuthUrl = (
  route: AuthRoute,
  method: "pushState" | "replaceState",
) => {
  if (typeof window === "undefined") return;

  try {
    if (window.location.protocol === "file:") {
      const url = new URL(window.location.href);
      url.hash = `/${route}`;
      window.history[method](null, "", url);
      return;
    }

    window.history[method](null, "", `/${route}`);
  } catch {
    window.location.hash = `/${route}`;
  }
};

const clearAuthUrl = () => {
  if (typeof window === "undefined") return;

  try {
    if (window.location.protocol === "file:") {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(null, "", url);
      return;
    }

    window.history.replaceState(null, "", "/");
  } catch {
    window.location.hash = "";
  }
};

interface AdminAppProps {
  onlineOnly?: boolean;
}

export default function App({ onlineOnly = false }: AdminAppProps) {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setRoute = useAppStore((state) => state.setRoute);
  const setOnlineOnly = useAppStore((state) => state.setOnlineOnly);
  const activeGymId = useAppStore((state) => state.activeGymId);
  const isGymDataLoading = useAppStore((state) => state.isGymDataLoading);
  const setGymDataLoading = useAppStore((state) => state.setGymDataLoading);
  const theme = useAppStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const loadClients = useClientsStore((state) => state.loadOnline);
  const loadPlans = usePlansStore((state) => state.loadOnline);
  const loadProducts = useProductsStore((state) => state.loadOnline);
  const loadCheckins = useCheckinsStore((state) => state.loadOnline);
  const loadSales = useSalesStore((state) => state.loadOnline);
  const loadClasses = useClassesStore((state) => state.loadOnline);
  const loadEmployees = useEmployeesStore((state) => state.loadOnline);
  const employees = useEmployeesStore((state) => state.employees);
  const roles = useEmployeesStore((state) => state.roles);
  const loadFinance = useFinanceStore((state) => state.loadOnline);
  const loadSettings = useSettingsStore((state) => state.loadOnline);
  const gyms = useSettingsStore((state) => state.gyms);
  const loadWorkouts = useWorkoutsStore((state) => state.loadOnline);
  const [authRoute, setAuthRoute] = useState<AuthRoute>(getAuthRoute);
  const allowedRoute = firstAllowedRoute(
    navItems.map((item) => item.id),
    user,
    employees,
    roles,
  );
  const canAccessActiveRoute = canAccessRoute(
    activeRoute,
    user,
    employees,
    roles,
  );
  const Page = pages[canAccessActiveRoute ? activeRoute : allowedRoute];
  const activeGymName =
    gyms.find((gym) => gym.id === activeGymId)?.name ?? user?.gym ?? "Noogym";

  useEffect(() => {
    setOnlineOnly(onlineOnly);
  }, [onlineOnly, setOnlineOnly]);

  useEffect(() => {
    const activeTheme = isAuthenticated ? theme : "dark";
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.style.colorScheme = activeTheme;
  }, [isAuthenticated, theme]);

  useEffect(() => {
    const handlePopState = () => setAuthRoute(getAuthRoute());
    const handleHashChange = () => setAuthRoute(getAuthRoute());
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setRoute("dashboard");
      if (isAuthPath()) clearAuthUrl();
      return;
    }

    const nextRoute = getAuthRoute();
    setAuthRoute(nextRoute);
    if (!isAuthPath()) updateAuthUrl(nextRoute, "replaceState");
  }, [isAuthenticated, setRoute]);

  useEffect(() => {
    if (!isAuthenticated || !user || canAccessActiveRoute) return;
    setRoute(allowedRoute);
  }, [allowedRoute, canAccessActiveRoute, isAuthenticated, setRoute, user]);

  useEffect(() => {
    if (!isAuthenticated || accessToken || !isHttpOnlyAuthEnabled()) return;
    void refreshSession().catch(console.error);
  }, [accessToken, isAuthenticated, refreshSession]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    void loadSettings().catch(console.error);
  }, [accessToken, isAuthenticated, loadSettings]);

  useEffect(() => {
    if (!onlineOnly || !isAuthenticated || !accessToken) {
      setGymDataLoading(false);
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    setGymDataLoading(Boolean(activeGymId));

    void Promise.allSettled([
      loadClients(),
      loadPlans(),
      loadProducts(),
      loadCheckins(),
      loadSales(),
      loadClasses(),
      loadEmployees(),
      loadFinance(),
      loadWorkouts(),
    ]).finally(() => {
      const remainingMs = Math.max(0, 550 - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (!cancelled) setGymDataLoading(false);
      }, remainingMs);
    });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    activeGymId,
    isAuthenticated,
    loadCheckins,
    loadClasses,
    loadClients,
    loadEmployees,
    loadFinance,
    loadPlans,
    loadProducts,
    loadSales,
    loadWorkouts,
    onlineOnly,
    setGymDataLoading,
  ]);

  const navigateAuth = useCallback((route: AuthRoute) => {
    setAuthRoute(route);
    updateAuthUrl(route, "pushState");
  }, []);

  if (!isAuthenticated) {
    if (authRoute === "register")
      return <Register onNavigateToLogin={() => navigateAuth("login")} />;
    if (authRoute === "forgot-password")
      return <ForgotPassword onNavigateToLogin={() => navigateAuth("login")} />;
    if (authRoute === "reset-password")
      return <ResetPassword onNavigateToLogin={() => navigateAuth("login")} />;

    return (
      <Login
        onNavigateToRegister={() => navigateAuth("register")}
        onNavigateToForgotPassword={() => navigateAuth("forgot-password")}
      />
    );
  }

  return (
    <div className="app-shell flex flex-col">
      <Topbar />
      <div className="admin-workspace flex min-h-0 flex-1">
        <Sidebar />
        <main className="admin-main min-w-0 flex-1 overflow-auto p-2 sm:p-3">
          {isGymDataLoading ? (
            <UnitDataLoadingScreen gymName={activeGymName} />
          ) : (
            <Page />
          )}
        </main>
      </div>
      <BottomSyncBar />
      <ToastViewport />
    </div>
  );
}

function UnitDataLoadingScreen({ gymName }: { gymName: string }) {
  const modules = [
    "Clientes",
    "Check-ins",
    "Vendas",
    "Aulas",
    "Produtos",
    "Financeiro",
  ];

  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="panel w-full max-w-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-noogym-lime/30 bg-noogym-lime/10">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-noogym-lime border-t-transparent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm uppercase text-noogym-lime">
              A carregar unidade
            </p>
            <h1 className="mt-2 truncate text-2xl font-semibold">{gymName}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              A sincronizar dados operacionais desta unidade.
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, index) => (
            <div
              key={module}
              className="rounded-md border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">{module}</span>
                <span className="h-2 w-2 rounded-full bg-noogym-lime" />
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full animate-pulse rounded-full bg-noogym-lime"
                  style={{ width: `${54 + index * 7}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
