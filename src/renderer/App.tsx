import { BottomSyncBar } from "./components/layout/BottomSyncBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { useAppStore } from "./store/appStore";
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

export default function App() {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const Page = pages[activeRoute];

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
    </div>
  );
}
