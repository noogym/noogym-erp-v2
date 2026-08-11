import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSyncBar } from "./components/layout/BottomSyncBar";
import { AppRouteErrorBoundary } from "./components/layout/AppRouteErrorBoundary";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { useAppStore, type RouteId } from "./store/appStore";
import { useAuthStore } from "./store/authStore";
import { useCheckinsStore } from "./store/checkinsStore";
import { useClassesStore } from "./store/classesStore";
import { useClientsStore } from "./store/clientsStore";
import { useEmployeesStore } from "./store/employeesStore";
import { useFinanceStore } from "./store/financeStore";
import { useOperationalSettingsStore } from "./store/operationalSettingsStore";
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
import Sincronizacao from "./pages/Sincronizacao";
import SuperAdmin from "./pages/SuperAdmin";
import Configuracoes from "./pages/Configuracoes";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import { ToastViewport } from "./components/ui/Toast";
import { ApiError, isHttpOnlyAuthEnabled } from "./lib/api";
import { isDesktopLocalDbAvailable } from "./lib/desktopLocalDb";
import { canAccessRoute, firstAllowedRoute } from "./lib/permissions";
import { navItems } from "./routes/nav";
import { toastError } from "./store/toastStore";

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
  sincronizacao: Sincronizacao,
  "super-admin": SuperAdmin,
  configuracoes: Configuracoes,
};

const pageLabels: Record<RouteId, string> = {
  dashboard: "Dashboard",
  checkin: "Check-in",
  clientes: "Clientes",
  planos: "Planos",
  vendas: "Vendas POS",
  produtos: "Produtos",
  aulas: "Aulas",
  treinos: "Treinos",
  funcionarios: "Funcionarios",
  relatorios: "Relatorios",
  financas: "Financas",
  sincronizacao: "Sincronizacao",
  "super-admin": "Super Admin",
  configuracoes: "Configuracoes",
};

const reportBackgroundError = (error: unknown) => {
  if (error instanceof ApiError) return;
  console.error(error);
};

const ignoreBackgroundError = () => undefined;

type AuthRoute = "login" | "register" | "forgot-password" | "reset-password";
type OnlineModuleError = { module: string; message: string };

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Nao foi possivel carregar este modulo.";

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
  const startConnectivityMonitor = useAppStore((state) => state.startConnectivityMonitor);
  const syncNow = useAppStore((state) => state.syncNow);
  const theme = useAppStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const logout = useAuthStore((state) => state.logout);
  const loadLocalClients = useClientsStore((state) => state.loadLocal);
  const loadClients = useClientsStore((state) => state.loadOnline);
  const loadLocalPlans = usePlansStore((state) => state.loadLocal);
  const loadPlans = usePlansStore((state) => state.loadOnline);
  const loadLocalProducts = useProductsStore((state) => state.loadLocal);
  const loadProducts = useProductsStore((state) => state.loadOnline);
  const loadLocalCheckins = useCheckinsStore((state) => state.loadLocal);
  const loadCheckins = useCheckinsStore((state) => state.loadOnline);
  const loadLocalSales = useSalesStore((state) => state.loadLocal);
  const loadSales = useSalesStore((state) => state.loadOnline);
  const loadLocalClasses = useClassesStore((state) => state.loadLocal);
  const loadClasses = useClassesStore((state) => state.loadOnline);
  const loadLocalEmployees = useEmployeesStore((state) => state.loadLocal);
  const loadEmployees = useEmployeesStore((state) => state.loadOnline);
  const employees = useEmployeesStore((state) => state.employees);
  const roles = useEmployeesStore((state) => state.roles);
  const loadLocalFinance = useFinanceStore((state) => state.loadLocal);
  const loadFinance = useFinanceStore((state) => state.loadOnline);
  const loadLocalOperationalSettings = useOperationalSettingsStore((state) => state.loadLocal);
  const loadOperationalSettings = useOperationalSettingsStore((state) => state.loadOnline);
  const loadSettings = useSettingsStore((state) => state.loadOnline);
  const loadLocalSettings = useSettingsStore((state) => state.loadLocal);
  const gyms = useSettingsStore((state) => state.gyms);
  const loadLocalWorkouts = useWorkoutsStore((state) => state.loadLocal);
  const loadWorkouts = useWorkoutsStore((state) => state.loadOnline);
  const [authRoute, setAuthRoute] = useState<AuthRoute>(getAuthRoute);
  const [onlineModuleErrors, setOnlineModuleErrors] = useState<OnlineModuleError[]>([]);
  const desktopInitKeyRef = useRef<string | null>(null);
  const desktopLoginOnly = isDesktopLocalDbAvailable();
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
  const renderedRoute = canAccessActiveRoute ? activeRoute : allowedRoute;
  const canOpenSettings = canAccessRoute("configuracoes", user, employees, roles);
  const activeGymName =
    gyms.find((gym) => gym.id === activeGymId)?.name ??
    user?.gyms?.find((gym) => gym.id === activeGymId)?.name ??
    user?.gym ??
    "Noogym";
  const loadDesktopLocalModules = useCallback(
    () =>
      Promise.allSettled([
        loadLocalSettings(),
        loadLocalOperationalSettings(),
        loadLocalClients(),
        loadLocalPlans(),
        loadLocalProducts(),
        loadLocalCheckins(),
        loadLocalSales(),
        loadLocalClasses(),
        loadLocalEmployees(),
        loadLocalFinance(),
        loadLocalWorkouts(),
      ]),
    [
      loadLocalCheckins,
      loadLocalClasses,
      loadLocalClients,
      loadLocalEmployees,
      loadLocalFinance,
      loadLocalOperationalSettings,
      loadLocalPlans,
      loadLocalProducts,
      loadLocalSales,
      loadLocalSettings,
      loadLocalWorkouts,
    ],
  );
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
    if (isAuthenticated || !desktopLoginOnly || authRoute !== "register") return;
    setAuthRoute("login");
    updateAuthUrl("login", "replaceState");
  }, [authRoute, desktopLoginOnly, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user || canAccessActiveRoute) return;
    setRoute(allowedRoute);
  }, [allowedRoute, canAccessActiveRoute, isAuthenticated, setRoute, user]);

  useEffect(() => {
    if (!isAuthenticated || accessToken || !isHttpOnlyAuthEnabled()) return;
    void refreshSession().catch(reportBackgroundError);
  }, [accessToken, isAuthenticated, refreshSession]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const handleUnauthorized = () => {
      logout();
      setAuthRoute("login");
      updateAuthUrl("login", "replaceState");
    };

    window.addEventListener("noogym:api-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("noogym:api-unauthorized", handleUnauthorized);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return startConnectivityMonitor();
  }, [isAuthenticated, startConnectivityMonitor]);

  useEffect(() => {
    if (!isAuthenticated || onlineOnly) return;
    void loadDesktopLocalModules().catch(reportBackgroundError);
  }, [isAuthenticated, loadDesktopLocalModules, onlineOnly]);

  useEffect(() => {
    if (!isAuthenticated || onlineOnly) return;

    const handleDesktopSyncComplete = () => {
      void loadDesktopLocalModules().catch(reportBackgroundError);
    };

    window.addEventListener("noogym:desktop-sync-complete", handleDesktopSyncComplete);
    return () => window.removeEventListener("noogym:desktop-sync-complete", handleDesktopSyncComplete);
  }, [isAuthenticated, loadDesktopLocalModules, onlineOnly]);

  useEffect(() => {
    if (!onlineOnly || !isAuthenticated || !accessToken) return;
    void loadSettings().catch(reportBackgroundError);
  }, [accessToken, isAuthenticated, loadSettings, onlineOnly]);

  useEffect(() => {
    if (!isAuthenticated || onlineOnly || !user) return;

    const initKey = `${user.id ?? user.email ?? user.name}:${activeGymId ?? "all"}:${accessToken ? "online" : "local"}`;
    if (desktopInitKeyRef.current === initKey) {
      void loadDesktopLocalModules().catch(reportBackgroundError);
      return;
    }

    desktopInitKeyRef.current = initKey;
    let cancelled = false;
    const startedAt = Date.now();
    setGymDataLoading(true);

    void (async () => {
      await loadDesktopLocalModules().catch(reportBackgroundError);
      if (accessToken) {
        await syncNow().catch(reportBackgroundError);
      }
      await loadDesktopLocalModules().catch(reportBackgroundError);
    })().finally(() => {
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
    loadDesktopLocalModules,
    onlineOnly,
    setGymDataLoading,
    syncNow,
    user,
  ]);

  useEffect(() => {
    if (!onlineOnly || !isAuthenticated || !accessToken) {
      setGymDataLoading(false);
      setOnlineModuleErrors([]);
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    setGymDataLoading(true);
    setOnlineModuleErrors([]);

    const loaders = [
      ["Clientes", loadClients],
      ["Planos", loadPlans],
      ["Produtos", loadProducts],
      ["Check-ins", loadCheckins],
      ["Vendas", loadSales],
      ["Aulas", loadClasses],
      ["Funcionarios", loadEmployees],
      ["Financas", loadFinance],
      ["Operacional", loadOperationalSettings],
      ["Treinos", loadWorkouts],
    ] as const;

    void Promise.allSettled(
      loaders.map(async ([module, load]) => {
        try {
          await load();
        } catch (error) {
          throw { module, message: errorMessage(error) };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason as OnlineModuleError);
      setOnlineModuleErrors(errors);
      if (errors.length) {
        toastError(
          "Alguns modulos nao carregaram",
          errors.map((item) => item.module).join(", "),
        );
      }
    }).finally(() => {
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
    loadOperationalSettings,
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
    if (!desktopLoginOnly && authRoute === "register")
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
          <AppRouteErrorBoundary
            resetKey={`${renderedRoute}:${activeGymId ?? "all"}:${isGymDataLoading ? "loading" : "ready"}`}
            routeLabel={pageLabels[renderedRoute]}
            canOpenSettings={canOpenSettings}
            onOpenSettings={() => setRoute("configuracoes")}
            onSyncNow={() => void syncNow().catch(ignoreBackgroundError)}
          >
            {isGymDataLoading ? (
              <UnitDataLoadingScreen gymName={activeGymName} />
            ) : (
              <>
                {onlineOnly && onlineModuleErrors.length ? (
                  <OnlineModuleErrorBanner errors={onlineModuleErrors} />
                ) : null}
                <Page />
              </>
            )}
          </AppRouteErrorBoundary>
        </main>
      </div>
      <BottomSyncBar />
      <ToastViewport />
    </div>
  );
}

function OnlineModuleErrorBanner({ errors }: { errors: OnlineModuleError[] }) {
  return (
    <div className="mb-3 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Alguns modulos nao carregaram da API.</p>
          <p className="mt-1 text-red-100/80">
            Corrija a conexao ou recarregue para evitar trabalhar com dados incompletos.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-red-200/30 px-3 py-1.5 text-xs font-medium text-red-50 hover:bg-red-500/20"
          onClick={() => window.location.reload()}
        >
          Recarregar
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {errors.map((error) => (
          <span
            key={`${error.module}-${error.message}`}
            className="rounded border border-red-200/20 bg-black/20 px-2 py-1 text-xs"
            title={error.message}
          >
            {error.module}
          </span>
        ))}
      </div>
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
