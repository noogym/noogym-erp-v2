import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { navItems } from "../../routes/nav";
import { useAppStore } from "../../store/appStore";
import { WifiOff } from "lucide-react";

export function Sidebar() {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setRoute = useAppStore((state) => state.setRoute);

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-white/10 bg-black/25 p-3">
      <div className="mb-5 flex h-12 items-center gap-3 px-2">
        <div className="flex items-center gap-2">
          <div className="text-4xl font-bold leading-none text-noogym-lime">∿</div>
          <div className="text-2xl font-semibold">noogym</div>
        </div>
        <Badge>Desktop</Badge>
      </div>

      <div className="panel mb-4 flex items-center gap-3 p-4 shadow-none">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-noogym-lime text-noogym-lime">N</div>
        <div>
          <p className="text-sm font-medium">Admin</p>
          <p className="text-xs text-zinc-400">Administrador</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`no-drag flex h-11 w-full items-center gap-3 rounded-md border-l-2 px-3 text-left text-sm transition ${
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

      <div className="panel mt-4 p-4 shadow-none">
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
