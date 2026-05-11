"use client";

import { BarChart3, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, FormInput } from "@noogym/ui";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_70%_-10%,rgba(182,255,0,0.10),transparent_30%),radial-gradient(circle_at_15%_15%,rgba(0,255,187,0.045),transparent_28%),#050708] p-6">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-[#071014] shadow-soft md:grid-cols-[0.9fr_1.1fr]">
        <aside className="border-b border-white/10 p-8 md:border-b-0 md:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-noogym-lime/40 bg-noogym-lime/10 text-noogym-lime">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold">Noogym</p>
              <p className="text-sm text-zinc-400">Web Admin</p>
            </div>
          </div>
          <div className="mt-12 max-w-sm">
            <h1 className="text-3xl font-semibold tracking-normal">Gestao SaaS para a operacao Noogym.</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-300">Painel web preparado para REST API, cookies de sessao e administracao multiunidade em Angola.</p>
          </div>
          <div className="mt-10 grid gap-3 text-sm text-zinc-300">
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-noogym-lime" /> Identidade dark premium/neon lime</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-noogym-lime" /> Regras compartilhadas com o desktop</p>
          </div>
        </aside>
        <form
          className="p-8"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/dashboard");
          }}
        >
          <p className="text-sm text-noogym-lime">Acesso administrativo</p>
          <h2 className="mt-2 text-2xl font-semibold">Entrar no painel</h2>
          <div className="mt-8 grid gap-4">
            <FormInput label="Email" type="email" placeholder="admin@noogym.co.ao" required icon={<Mail className="h-4 w-4" />} />
            <FormInput label="Senha" type="password" placeholder="********" required icon={<Lock className="h-4 w-4" />} />
          </div>
          <Button type="submit" className="mt-7 w-full" variant="primary">Entrar</Button>
          <p className="mt-5 text-center text-xs text-zinc-500">Sessao web mockada nesta fase da migracao.</p>
        </form>
      </section>
    </main>
  );
}
