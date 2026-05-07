import type { ReactNode } from "react";
import { Maximize2, Minus, X } from "lucide-react";
import { AuthFeatureItem } from "./AuthFeatureItem";

interface Feature {
  icon: ReactNode;
  title: string;
  description?: string;
}

interface AuthLayoutProps {
  headline: ReactNode;
  description: string;
  features: Feature[];
  children: ReactNode;
  footer?: ReactNode;
  compactFeatures?: boolean;
}

export function AuthLayout({ headline, description, features, children, footer, compactFeatures = false }: AuthLayoutProps) {
  const windowControls = window.noogym?.windowControls;

  return (
    <div className="auth-screen">
      <div className="drag-region absolute inset-x-0 top-0 z-20 h-10" />
      <div className="no-drag absolute right-4 top-3 z-30 flex items-center gap-1 text-zinc-300">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
          onClick={() => void windowControls?.minimize()}
          aria-label="Minimizar"
          title="Minimizar"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
          onClick={() => void windowControls?.maximize()}
          aria-label="Maximizar"
          title="Maximizar"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-red-500/20 hover:text-red-300"
          onClick={() => void windowControls?.close()}
          aria-label="Fechar"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(182,255,0,0.08),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(0,180,140,0.055),transparent_24%)]" />
      <section className="auth-card">
        <aside className="auth-visual">
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,0.82),rgba(0,0,0,0.42)),radial-gradient(circle_at_78%_58%,rgba(182,255,0,0.23),transparent_15%),linear-gradient(150deg,#050708_0%,#071010_34%,#111614_35%,#050606_46%,#0b120e_62%,#020303_100%)]" />
          <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(162deg,transparent_0_18%,rgba(255,255,255,0.18)_18.3%,transparent_19.2%_100%),linear-gradient(0deg,transparent_0_68%,rgba(255,255,255,0.16)_68.2%,transparent_69.2%_100%)]" />
          <div className="auth-visual-content">
            <div className="auth-logo-block">
              <div className="flex items-end gap-2 sm:gap-3">
                <div className="auth-logo-mark">n</div>
                <div className="auth-logo-text">
                  <span className="text-noogym-lime">noo</span>gym
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-300">Sistema de gestao para academias</p>
            </div>

            <div className="auth-copy">
              <h1 className="auth-headline">{headline}</h1>
              <p className="auth-description">{description}</p>
            </div>

            <div className="auth-feature-list">
              {features.map((feature, index) => (
                <AuthFeatureItem
                  key={`${feature.title}-${index}`}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  compact={compactFeatures}
                />
              ))}
            </div>

            {footer ? <div className="auth-footer">{footer}</div> : null}
          </div>
        </aside>

        <main className="auth-form-panel">
          <div className="auth-form-wrap">{children}</div>
        </main>
      </section>
    </div>
  );
}
