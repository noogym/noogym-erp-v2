import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  Home,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  UserRound,
  UsersRound
} from "lucide-react";
import type { RouteId } from "../store/appStore";

export const navItems: Array<{ id: RouteId; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "checkin", label: "Check-in", icon: ClipboardCheck },
  { id: "clientes", label: "Clientes", icon: UsersRound },
  { id: "planos", label: "Planos", icon: ReceiptText },
  { id: "vendas", label: "Vendas (POS)", icon: ShoppingCart },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "aulas", label: "Aulas", icon: CalendarDays },
  { id: "treinos", label: "Treinos", icon: Dumbbell },
  { id: "funcionarios", label: "Funcionários", icon: UserRound },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "financas", label: "Finanças", icon: CreditCard },
  { id: "configuracoes", label: "Configurações", icon: Settings }
];
