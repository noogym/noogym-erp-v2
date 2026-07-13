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
  Shield,
  ShoppingCart,
  UserRound,
  UsersRound,
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
  { id: "funcionarios", label: "Funcionarios", icon: UserRound },
  { id: "relatorios", label: "Relatorios", icon: BarChart3 },
  { id: "financas", label: "Financas", icon: CreditCard },
  { id: "super-admin", label: "Super Admin", icon: Shield },
  { id: "configuracoes", label: "Configuracoes", icon: Settings },
];
