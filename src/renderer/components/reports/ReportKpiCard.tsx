import {
  Banknote,
  CalendarDays,
  CalendarX,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  ClipboardList,
  Clock,
  Dumbbell,
  FilePlus2,
  Flame,
  Layers,
  Network,
  Package,
  Presentation,
  RefreshCw,
  Route,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  Timer,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  WalletCards
} from "lucide-react";
import type { ReportKpi, ReportTone } from "../../data/reportsMock";

const toneClasses: Record<ReportTone, string> = {
  lime: "bg-noogym-lime/10 text-noogym-lime",
  yellow: "bg-yellow-400/10 text-yellow-300",
  purple: "bg-purple-400/10 text-purple-300",
  blue: "bg-sky-400/10 text-sky-300",
  orange: "bg-orange-400/10 text-orange-300",
  red: "bg-red-400/10 text-red-300",
  green: "bg-green-400/10 text-green-300"
};

const icons = {
  banknote: Banknote,
  "calendar-days": CalendarDays,
  "calendar-x": CalendarX,
  "circle-check": CircleCheck,
  "circle-dollar-sign": CircleDollarSign,
  "circle-x": CircleX,
  "clipboard-list": ClipboardList,
  clock: Clock,
  dumbbell: Dumbbell,
  "file-plus-2": FilePlus2,
  flame: Flame,
  layers: Layers,
  network: Network,
  package: Package,
  presentation: Presentation,
  "refresh-cw": RefreshCw,
  route: Route,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  star: Star,
  tag: Tag,
  timer: Timer,
  trophy: Trophy,
  user: User,
  "user-check": UserCheck,
  "user-plus": UserPlus,
  users: Users,
  "user-x": UserX,
  "wallet-cards": WalletCards
};

export function ReportKpiCard({ kpi }: { kpi: ReportKpi }) {
  const Icon = icons[kpi.icon as keyof typeof icons] ?? CircleCheck;
  const negative = kpi.change?.startsWith("-");

  return (
    <div className="soft-card min-w-0 p-4">
      <div className="flex items-start gap-3">
        <div className={`icon-tile shrink-0 ${toneClasses[kpi.tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-zinc-400">{kpi.title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal text-white">{kpi.value}</p>
          {kpi.detail ? <p className="mt-1 text-sm text-noogym-lime">{kpi.detail}</p> : null}
        </div>
      </div>
      {kpi.change ? <p className={`mt-3 text-xs ${negative ? "text-red-400" : "text-noogym-lime"}`}>{kpi.change}</p> : null}
    </div>
  );
}
