import { BarChart3, CreditCard, Dumbbell, LayoutDashboard, LogOut, Settings, UsersRound } from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Clientes", icon: UsersRound },
  { label: "Planos", icon: CreditCard },
  { label: "Operacao", icon: Dumbbell },
  { label: "Configuracoes", icon: Settings }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_72%_-12%,rgba(182,255,0,0.09),transparent_28%),radial-gradient(circle_at_18%_16%,rgba(0,255,187,0.04),transparent_30%),#050708] text-white">
      <div className="grid min-h-dvh grid-cols-[260px_1fr]">
        <aside className="border-r border-white/10 bg-[#071014]/85 p-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-noogym-lime/40 bg-noogym-lime/10 text-noogym-lime">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Noogym</p>
              <p className="text-xs text-zinc-400">Web Admin</p>
            </div>
          </Link>
          <nav className="mt-8 grid gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition ${index === 0 ? "bg-white/10 text-noogym-lime" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <Link href="/login" className="mt-8 flex h-10 items-center gap-3 rounded-md px-3 text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-white">
            <LogOut className="h-4 w-4" />
            Sair
          </Link>
        </aside>
        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#071014]/70 px-6 backdrop-blur">
            <div>
              <p className="text-sm text-zinc-400">Luanda, Angola</p>
              <h1 className="text-lg font-semibold">Painel Administrativo</h1>
            </div>
            <div className="rounded-md border border-noogym-lime/30 bg-noogym-lime/10 px-3 py-1 text-sm text-noogym-lime">Online</div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
