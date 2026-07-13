import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, Check, ChevronDown, Cloud, CreditCard, Maximize2, Minus, Moon, Package, Plus, RefreshCw, Search, ShieldCheck, ShoppingCart, Sun, UserRound, Wifi, WifiOff, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MAX_ZOOM_FACTOR, MIN_ZOOM_FACTOR, useAppStore } from "../../store/appStore";
import { useAuthStore } from "../../store/authStore";
import { useClassesStore } from "../../store/classesStore";
import { useClientsStore } from "../../store/clientsStore";
import { allowedGymsForUser, canAccessRoute } from "../../lib/permissions";
import { useEmployeesStore } from "../../store/employeesStore";
import { useFinanceStore } from "../../store/financeStore";
import { useNotificationsStore } from "../../store/notificationsStore";
import type { NotificationCategory, NotificationInput, NotificationRecord } from "../../store/notificationsStore";
import { useProductsStore } from "../../store/productsStore";
import { useSettingsStore } from "../../store/settingsStore";
import { endSuperAdminSupportSession } from "../../lib/superAdminApi";

const iconByCategory: Record<NotificationCategory, LucideIcon> = {
  system: ShieldCheck,
  clients: UserRound,
  finance: CreditCard,
  products: Package,
  classes: CalendarDays,
  checkins: Check,
  sales: ShoppingCart
};

const toneClass = (tone: NotificationRecord["tone"]) => {
  if (tone === "danger") return "text-red-300";
  if (tone === "warning") return "text-orange-300";
  if (tone === "success") return "text-noogym-lime";
  return "text-sky-300";
};

const parseDate = (value?: string) => {
  if (!value || value === "Hoje") return null;
  const [datePart] = value.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysFromToday = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

const namesPreview = (names: string[]) => {
  const preview = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${preview} e mais ${names.length - 3}` : preview;
};

export function Topbar() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const activeGymId = useAppStore((state) => state.activeGymId);
  const decreaseZoom = useAppStore((state) => state.decreaseZoom);
  const increaseZoom = useAppStore((state) => state.increaseZoom);
  const isOffline = useAppStore((state) => state.isOffline);
  const connectionState = useAppStore((state) => state.connectionState);
  const isGymDataLoading = useAppStore((state) => state.isGymDataLoading);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const pendingSync = useAppStore((state) => state.pendingSync);
  const conflictSync = useAppStore((state) => state.conflictSync);
  const resetZoom = useAppStore((state) => state.resetZoom);
  const setRoute = useAppStore((state) => state.setRoute);
  const setActiveGymId = useAppStore((state) => state.setActiveGymId);
  const syncLabel = useAppStore((state) => state.syncLabel);
  const syncNow = useAppStore((state) => state.syncNow);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const zoomFactor = useAppStore((state) => state.zoomFactor);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const exitSupportSession = useAuthStore((state) => state.exitSupportSession);
  const classes = useClassesStore((state) => state.classes);
  const clients = useClientsStore((state) => state.clients);
  const employees = useEmployeesStore((state) => state.employees);
  const roles = useEmployeesStore((state) => state.roles);
  const financeRecords = useFinanceStore((state) => state.records);
  const notifications = useNotificationsStore((state) => state.notifications);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const replaceAutomaticNotifications = useNotificationsStore((state) => state.replaceAutomaticNotifications);
  const clearRead = useNotificationsStore((state) => state.clearRead);
  const products = useProductsStore((state) => state.products);
  const gyms = useSettingsStore((state) => state.gyms);
  const windowControls = typeof window !== "undefined" ? window.noogym?.windowControls : undefined;
  const zoomControls = typeof window !== "undefined" ? window.noogym?.zoomControls : undefined;
  const isOnline = onlineOnly || !isOffline;
  const connectionLabel =
    connectionState === "online_without_session"
      ? "Online sem sessao"
      : connectionState === "syncing"
        ? "Sincronizando"
        : isOnline
          ? "Online"
          : "Offline";
  const zoomPercent = Math.round(zoomFactor * 100);
  const settingsAllowedGyms = useMemo(() => allowedGymsForUser(user, employees, gyms), [employees, gyms, user]);
  const userGymOptions = useMemo(
    () =>
      (user?.gyms ?? [])
        .flatMap((gym) =>
          gym.id && gym.name
            ? [{
                id: gym.id,
                name: gym.name,
                slug: gym.name,
                isActive: true,
              }]
            : [],
        ),
    [user?.gyms],
  );
  const allowedGyms = settingsAllowedGyms.length ? settingsAllowedGyms : userGymOptions;
  const fallbackGymName = allowedGyms[0]?.name ?? user?.gym ?? "Noogym Fitness Center";
  const activeGym = allowedGyms.find((gym) => gym.id === activeGymId) ?? allowedGyms[0];
  const activeGymValue = activeGym?.id ?? "";
  const canChangeGym = allowedGyms.length > 1;
  const supportMode = Boolean(user?.supportMode);
  const automaticNotifications = useMemo<NotificationInput[]>(() => {
    const generated: NotificationInput[] = [];
    const activeClients = clients.filter((client) => client.status === "Ativo");
    const expiredClients = activeClients.filter((client) => {
      const date = parseDate(client.expires);
      return date ? daysFromToday(date) < 0 : false;
    });
    const expiringClients = activeClients.filter((client) => {
      const date = parseDate(client.expires);
      if (!date) return false;
      const days = daysFromToday(date);
      return days >= 0 && days <= 7;
    });
    const outOfStock = products.filter((product) => product.status !== "Inativo" && product.stock <= 0);
    const lowStock = products.filter((product) => product.status !== "Inativo" && product.stock > 0 && product.stock <= (product.minStock ?? 10));
    const pendingFinance = financeRecords.filter((record) => record.status === "Pendente" || record.status === "Em atraso");
    const fullClasses = classes.filter((lesson) => lesson.status !== "Cancelada" && lesson.status !== "Encerrada" && lesson.seats > 0 && lesson.participants >= lesson.seats);
    const almostFullClasses = classes.filter((lesson) => lesson.status !== "Cancelada" && lesson.status !== "Encerrada" && lesson.seats > 0 && lesson.participants < lesson.seats && lesson.participants / lesson.seats >= 0.85);

    if (pendingSync > 0) {
      generated.push({
        sourceId: "auto:system:pending-sync",
        title: "Sincronizacao pendente",
        description: `${pendingSync} registro(s) aguardando envio.`,
        category: "system",
        tone: "warning",
        actionType: "sync",
        actionLabel: "Sincronizar"
      });
    }

    if (!isOnline) {
      generated.push({
        sourceId: "auto:system:offline",
        title: "Modo offline ativo",
        description: "Algumas atualizacoes ficam guardadas localmente.",
        category: "system",
        tone: "warning",
        route: "sincronizacao",
        actionLabel: "Ver estado"
      });
    } else if (connectionState === "online_without_session" && pendingSync > 0) {
      generated.push({
        sourceId: "auto:system:online-without-session",
        title: "Conta online necessaria",
        description: "A conexao voltou, mas e preciso entrar online para sincronizar.",
        category: "system",
        tone: "warning",
        actionType: "sync",
        actionLabel: "Sincronizar"
      });
    }

    if (conflictSync > 0) {
      generated.push({
        sourceId: "auto:system:sync-conflicts",
        title: "Conflitos de sincronizacao",
        description: `${conflictSync} conflito(s) precisam de decisao manual.`,
        category: "system",
        tone: "danger",
        route: "sincronizacao",
        actionLabel: "Resolver"
      });
    }

    if (expiredClients.length) {
      generated.push({
        sourceId: "auto:clients:expired",
        title: `${expiredClients.length} plano(s) vencido(s)`,
        description: namesPreview(expiredClients.map((client) => client.name)),
        category: "clients",
        tone: "danger",
        route: "clientes",
        actionLabel: "Ver clientes"
      });
    } else if (expiringClients.length) {
      generated.push({
        sourceId: "auto:clients:expiring",
        title: `${expiringClients.length} plano(s) a vencer`,
        description: namesPreview(expiringClients.map((client) => client.name)),
        category: "clients",
        tone: "warning",
        route: "clientes",
        actionLabel: "Renovar"
      });
    }

    if (outOfStock.length || lowStock.length) {
      generated.push({
        sourceId: "auto:products:stock",
        title: `${outOfStock.length + lowStock.length} produto(s) precisam de reposicao`,
        description: namesPreview([...outOfStock, ...lowStock].map((product) => product.name)),
        category: "products",
        tone: outOfStock.length ? "danger" : "warning",
        route: "produtos",
        actionLabel: "Ver estoque"
      });
    }

    if (pendingFinance.length) {
      generated.push({
        sourceId: "auto:finance:pending",
        title: `${pendingFinance.length} lancamento(s) financeiro(s) pendente(s)`,
        description: namesPreview(pendingFinance.map((record) => record.note || record.category)),
        category: "finance",
        tone: "warning",
        route: "financas",
        actionLabel: "Abrir financas"
      });
    }

    if (fullClasses.length || almostFullClasses.length) {
      generated.push({
        sourceId: "auto:classes:occupancy",
        title: `${fullClasses.length + almostFullClasses.length} aula(s) com alta ocupacao`,
        description: namesPreview([...fullClasses, ...almostFullClasses].map((lesson) => lesson.name)),
        category: "classes",
        tone: fullClasses.length ? "danger" : "info",
        route: "aulas",
        actionLabel: "Ver aulas"
      });
    }

    if (!generated.length) {
      generated.push({
        sourceId: "auto:system:healthy",
        title: "Sistema operacional",
        description: isOnline ? "Conectado e pronto para operar." : "Pronto para trabalhar localmente.",
        category: "system",
        tone: "success",
        route: "dashboard",
        actionLabel: "Dashboard"
      });
    }

    return generated.filter((notification) => !notification.route || canAccessRoute(notification.route, user, employees, roles));
  }, [classes, clients, conflictSync, connectionState, employees, financeRecords, isOnline, pendingSync, products, roles, user]);
  const visibleNotifications = notifications.filter((notification) => !notification.route || canAccessRoute(notification.route, user, employees, roles));
  const unreadCount = visibleNotifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    if (zoomControls) {
      void zoomControls.setZoomFactor(zoomFactor);
      return;
    }

    document.body.style.setProperty("zoom", String(zoomFactor));
  }, [zoomControls, zoomFactor]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    replaceAutomaticNotifications(automaticNotifications);
  }, [automaticNotifications, replaceAutomaticNotifications]);

  useEffect(() => {
    if (!allowedGyms.length) return;
    if (activeGymId && allowedGyms.some((gym) => gym.id === activeGymId)) return;
    setActiveGymId(allowedGyms[0].id);
  }, [activeGymId, allowedGyms, setActiveGymId]);

  const openNotification = (notification: NotificationRecord) => {
    markAsRead(notification.id);
    setNotificationsOpen(false);
    if (notification.route && !canAccessRoute(notification.route, user, employees, roles)) return;
    if (notification.actionType === "sync") {
      void syncNow().catch(() => undefined);
      return;
    }
    if (notification.route) setRoute(notification.route);
  };

  return (
    <header className={`drag-region relative z-40 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-3 py-3 lg:px-5 ${supportMode ? "lg:min-h-[112px] lg:items-end lg:py-3" : "lg:h-[72px] lg:flex-nowrap lg:py-0"}`}>
      {supportMode ? (
        <div className="no-drag order-first flex basis-full flex-wrap items-center justify-between gap-2 rounded-md border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-sm text-orange-100">
          <span className="min-w-0 truncate">
            Modo suporte: {user?.organizationName ?? user?.gym} · {user?.supportReason}
          </span>
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-orange-300/30 px-3 text-xs font-medium transition hover:bg-orange-300/10"
            onClick={() => {
              if (accessToken) void endSuperAdminSupportSession(accessToken).catch(() => undefined);
              exitSupportSession();
              setRoute("super-admin");
            }}
          >
            <X className="h-4 w-4" />
            Sair do suporte
          </button>
        </div>
      ) : null}
      <div className="hidden w-[260px] lg:block" />
      <div className="no-drag relative order-3 flex h-11 min-w-0 basis-full items-center rounded-lg border border-white/10 bg-white/[0.035] text-sm lg:order-none lg:min-w-[320px] lg:basis-auto xl:min-w-[380px]">
        {allowedGyms.length ? (
          <select
            className="h-full w-full min-w-0 appearance-none rounded-lg bg-transparent px-4 pr-10 outline-none disabled:cursor-not-allowed disabled:text-zinc-300"
            value={activeGymValue}
            onChange={(event) => setActiveGymId(event.target.value || null)}
            disabled={!canChangeGym || isGymDataLoading}
            aria-label="Unidade ativa"
            title={isGymDataLoading ? "A carregar dados da unidade" : canChangeGym ? "Trocar unidade" : "Unidade fixa para este perfil"}
          >
            {allowedGyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
          </select>
        ) : (
          <span className="truncate px-4 pr-10">{fallbackGymName}</span>
        )}
        <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-zinc-400" />
      </div>
      <div className="no-drag flex min-w-0 flex-1 items-center justify-end gap-2 text-sm lg:flex-none lg:gap-4">
        <button
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 transition hover:bg-white/[0.07] sm:px-4"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {theme === "dark" ? <Moon className="h-4 w-4 text-noogym-lime" /> : <Sun className="h-4 w-4 text-noogym-lime" />}
          <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
        </button>
        <button className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 sm:px-4">
          {isOnline ? <Wifi className="h-5 w-5 text-noogym-lime" /> : <WifiOff className="h-5 w-5" />}
          <span className="hidden sm:inline">{connectionLabel}</span>
          <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-orange-400"}`} />
        </button>
        <div className="hidden min-w-0 max-w-[280px] items-center gap-2 text-zinc-200 xl:flex 2xl:max-w-[360px]" title={syncLabel}>
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{syncLabel}</span>
        </div>
        <div ref={notificationsRef} className="relative shrink-0">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-200 transition hover:bg-white/[0.07]"
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-label="Abrir notificacoes"
            title="Notificacoes"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-black bg-noogym-lime px-1 text-[11px] font-semibold text-black">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-12 z-50 w-[min(88vw,360px)] overflow-hidden rounded-lg border border-white/10 bg-[#071014] shadow-soft">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="font-semibold">Notificacoes</p>
                  <p className="text-xs text-zinc-400">{unreadCount ? `${unreadCount} nao lida(s)` : "Tudo lido"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="text-xs text-zinc-400 hover:text-zinc-100" onClick={clearRead}>Limpar lidas</button>
                  <button type="button" className="text-xs text-noogym-lime hover:text-white" onClick={markAllAsRead}>Marcar lidas</button>
                </div>
              </div>
              <div className="max-h-80 overflow-auto p-2">
                {visibleNotifications.map((notification) => {
                  const Icon = iconByCategory[notification.category];
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={`flex w-full gap-3 rounded-md px-3 py-3 text-left transition hover:bg-white/[0.06] ${notification.readAt ? "opacity-70" : ""}`}
                      onClick={() => openNotification(notification)}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] ${toneClass(notification.tone)}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                          {!notification.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-noogym-lime" /> : null}
                          <span className="truncate">{notification.title}</span>
                        </span>
                        <span className="mt-1 block text-xs text-zinc-400">{notification.description}</span>
                      </span>
                      <span className="shrink-0 self-center text-xs text-noogym-lime">{notification.actionLabel ?? "Abrir"}</span>
                    </button>
                  );
                })}
                {!visibleNotifications.length ? (
                  <div className="rounded-md border border-white/10 p-4 text-sm text-zinc-400">Sem notificacoes no momento.</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="hidden h-10 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-1.5 lg:flex">
          <Search className="ml-1 h-4 w-4 text-noogym-lime" />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={decreaseZoom}
            disabled={zoomFactor <= MIN_ZOOM_FACTOR}
            aria-label="Reduzir tela"
            title="Reduzir tela"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="min-w-12 rounded-full px-2 py-1 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
            onClick={resetZoom}
            aria-label="Repor zoom para 100%"
            title="Repor zoom para 100%"
          >
            {zoomPercent}%
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={increaseZoom}
            disabled={zoomFactor >= MAX_ZOOM_FACTOR}
            aria-label="Aumentar tela"
            title="Aumentar tela"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {windowControls ? (
          <div className="hidden shrink-0 items-center gap-1 pl-3 text-zinc-200 lg:flex">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
              onClick={() => void windowControls.minimize()}
              aria-label="Minimizar"
              title="Minimizar"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
              onClick={() => void windowControls.maximize()}
              aria-label="Maximizar"
              title="Maximizar"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-red-500/20 hover:text-red-300"
              onClick={() => void windowControls.close()}
              aria-label="Fechar"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
