import { AlertTriangle, RefreshCw, Settings } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@noogym/ui";

interface AppRouteErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
  routeLabel: string;
  canOpenSettings: boolean;
  onOpenSettings: () => void;
  onSyncNow: () => void;
}

interface AppRouteErrorBoundaryState {
  error: Error | null;
}

export class AppRouteErrorBoundary extends Component<AppRouteErrorBoundaryProps, AppRouteErrorBoundaryState> {
  state: AppRouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Noogym route render failed", { error, componentStack: info.componentStack });
  }

  componentDidUpdate(previousProps: AppRouteErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-full items-center justify-center p-3">
        <div className="panel w-full max-w-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-500/35 bg-red-500/10 text-red-300">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-300">Nao foi possivel renderizar esta tela</p>
              <h1 className="mt-2 text-2xl font-semibold">{this.props.routeLabel}</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                A navegacao continua disponivel. Pode tentar recarregar a tela, sincronizar novamente ou abrir as configuracoes para verificar o estado local.
              </p>
              <p className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
                {this.state.error.message || "Erro desconhecido"}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => this.setState({ error: null })}>
                  Tentar novamente
                </Button>
                <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={this.props.onSyncNow}>
                  Sincronizar agora
                </Button>
                {this.props.canOpenSettings ? (
                  <Button icon={<Settings className="h-4 w-4" />} onClick={this.props.onOpenSettings}>
                    Abrir configuracoes
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
