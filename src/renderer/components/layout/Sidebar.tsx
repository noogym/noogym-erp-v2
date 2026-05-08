import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { NoogymLogo } from "../brand/NoogymLogo";
import { navItems } from "../../routes/nav";
import { useAppStore } from "../../store/appStore";
import { useAuthStore } from "../../store/authStore";
import { LogOut, WifiOff } from "lucide-react";

export function Sidebar() {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setRoute = useAppStore((state) => state.setRoute);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="flex h-full min-h-0 w-[248px] shrink-0 flex-col border-r border-white/10 bg-black/25 p-3">
      <div className="mb-5 flex h-12 shrink-0 items-center gap-3 px-2">
        <NoogymLogo className="min-w-0 gap-2" markClassName="h-7 w-[58px]" textClassName="text-xl" />
        <Badge>Desktop</Badge>
      </div>

      <div className="panel mb-4 flex shrink-0 items-center gap-3 p-4 shadow-none">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-noogym-lime text-noogym-lime">N</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name ?? "Admin"}</p>
          <p className="truncate text-xs text-zinc-400">{user?.role ?? "Administrador"}</p>
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

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`no-drag flex h-11 w-full shrink-0 items-center gap-3 rounded-md border-l-2 px-3 text-left text-sm transition ${
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

      <div className="panel mt-4 shrink-0 p-4 shadow-none">
        <div className="mb-3 flex items-center gap-2 text-noogym-lime">
          <WifiOff className="h-5 w-5" />
          <span className="text-sm font-medium">Modo Offline</span>
        </div>
        <p className="text-xs leading-6 text-zinc-300">
          O sistema está funcionando sem internet. Seus dados serão sincronizados quando a conexão retornar.
        </p>
        <Button className="mt-4 w-full" variant="secondary">
          Ver sincronização
        </Button>
      </div>
    </aside>
  );
}
