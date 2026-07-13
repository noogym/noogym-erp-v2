import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { ChevronDown, ChevronUp, LogOut, Wifi, WifiOff } from "lucide-react";
import { NoogymLogo } from "../brand/NoogymLogo";
import { navItems } from "../../routes/nav";
import { canAccessRoute, effectiveRole } from "../../lib/permissions";
import { useAppStore } from "../../store/appStore";
import { useAuthStore } from "../../store/authStore";
import { useEmployeesStore } from "../../store/employeesStore";

export function Sidebar() {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setRoute = useAppStore((state) => state.setRoute);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const connectionState = useAppStore((state) => state.connectionState);
  const isStatusPanelCollapsed = useAppStore((state) => state.isStatusPanelCollapsed);
  const syncNow = useAppStore((state) => state.syncNow);
  const toggleStatusPanel = useAppStore((state) => state.toggleStatusPanel);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const employees = useEmployeesStore((state) => state.employees);
  const roles = useEmployeesStore((state) => state.roles);
  const canOpenSync = canAccessRoute("sincronizacao", user, employees, roles);
  const isConnected = onlineOnly || connectionState !== "offline";
  const StatusIcon = isConnected ? Wifi : WifiOff;
  const statusTitle = onlineOnly
    ? "Modo Online"
    : connectionState === "offline"
      ? "Modo Offline"
      : connectionState === "online_without_session"
        ? "Online sem sessao"
        : connectionState === "syncing"
          ? "Sincronizando"
          : "Pronto para sync";
  const statusDescription = onlineOnly
    ? "A versao web opera conectada e mantem os dados sincronizados com o servidor."
    : connectionState === "offline"
      ? "O sistema esta funcionando sem internet. Seus dados serao sincronizados quando a conexao retornar."
      : connectionState === "online_without_session"
        ? "A conexao voltou, mas e preciso entrar online para enviar os dados locais ao servidor."
        : connectionState === "syncing"
          ? "O Desktop esta enviando pendencias e recebendo dados atualizados."
          : "A API esta acessivel e a sessao online esta pronta para sincronizar.";
  const visibleNavItems = navItems.filter((item) => canAccessRoute(item.id, user, employees, roles));
  const roleLabel = effectiveRole(user, employees);

  return (
    <aside className="admin-sidebar flex min-h-0 shrink-0 flex-col border-b border-white/10 bg-black/25 p-2 lg:h-full lg:w-[248px] lg:border-b-0 lg:border-r lg:p-3">
      <div className="mb-2 flex h-11 shrink-0 items-center gap-3 px-2 lg:mb-5 lg:h-12">
        <NoogymLogo className="min-w-0 gap-2" markClassName="h-7 w-[58px]" textClassName="text-xl" />
        <Badge>Admin</Badge>
      </div>

      <div className="panel mb-3 hidden shrink-0 items-center gap-3 p-4 shadow-none sm:flex lg:mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-noogym-lime text-noogym-lime">N</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name ?? "Admin"}</p>
          <p className="truncate text-xs text-zinc-400">{roleLabel}</p>
        </div>
        <button
          type="button"
          className="no-drag flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-300 transition hover:bg-red-500/10 hover:text-red-300"
          onClick={logout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex min-h-0 gap-1 overflow-x-auto pb-1 lg:block lg:flex-1 lg:space-y-1 lg:overflow-y-auto lg:pb-0 lg:pr-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = activeRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`no-drag flex h-11 shrink-0 items-center gap-2 rounded-md border-l-2 px-3 text-left text-sm transition lg:w-full lg:gap-3 ${
                active
                  ? "border-noogym-lime bg-white/10 text-noogym-lime"
                  : "border-transparent text-zinc-100 hover:bg-white/[0.055]"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className={`panel mt-4 hidden shrink-0 shadow-none transition-all lg:block ${isStatusPanelCollapsed ? "p-2" : "p-4"}`}>
        <div className={`flex items-center gap-2 text-noogym-lime ${isStatusPanelCollapsed ? "" : "mb-3"}`}>
          <StatusIcon className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{statusTitle}</span>
          <button
            type="button"
            className="no-drag flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/10 hover:text-white"
            onClick={toggleStatusPanel}
            aria-label={isStatusPanelCollapsed ? "Expandir estado de conexao" : "Minimizar estado de conexao"}
            title={isStatusPanelCollapsed ? "Expandir" : "Minimizar"}
          >
            {isStatusPanelCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
        {isStatusPanelCollapsed ? null : (
          <>
            <p className="text-xs leading-6 text-zinc-300">
              {statusDescription}
            </p>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => canOpenSync ? setRoute("sincronizacao") : void syncNow().catch(() => undefined)}>
              {onlineOnly ? "Ver estado online" : "Ver sincronizacao"}
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
