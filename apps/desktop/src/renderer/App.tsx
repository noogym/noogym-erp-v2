import { useCallback, useEffect, useState } from "react";
import { BottomSyncBar } from "./components/layout/BottomSyncBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { useAppStore } from "./store/appStore";
import { useAuthStore } from "./store/authStore";
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
import { ToastViewport } from "./components/ui/Toast";

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
  configuracoes: Configuracoes
};

type AuthRoute = "login" | "register" | "forgot-password";

const authRouteFromValue = (value: string): AuthRoute | null => {
  const normalized = value.toLowerCase().replace(/^#?\/?/, "").split(/[/?#]/)[0];
  if (normalized === "register") return "register";
  if (normalized === "forgot-password") return "forgot-password";
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
  return Boolean(authRouteFromValue(window.location.hash) ?? authRouteFromValue(window.location.pathname));
};

const updateAuthUrl = (route: AuthRoute, method: "pushState" | "replaceState") => {
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

export default function App() {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setRoute = useAppStore((state) => state.setRoute);
  const theme = useAppStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [authRoute, setAuthRoute] = useState<AuthRoute>(getAuthRoute);
  const Page = pages[activeRoute];

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

  const navigateAuth = useCallback((route: AuthRoute) => {
    setAuthRoute(route);
    updateAuthUrl(route, "pushState");
  }, []);

  if (!isAuthenticated) {
    if (authRoute === "register") return <Register onNavigateToLogin={() => navigateAuth("login")} />;
    if (authRoute === "forgot-password") return <ForgotPassword onNavigateToLogin={() => navigateAuth("login")} />;

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
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto p-3">
          <Page />
        </main>
      </div>
      <BottomSyncBar />
      <ToastViewport />
    </div>
  );
}
