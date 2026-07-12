import {
  Package,
  Layers,
  ClipboardList,
  LayoutDashboard,
  Users,
  Plus,
  Minus,
  X,
  Pencil,
  Trash2,
  Search,
  ShoppingBag,
  Banknote,
  QrCode,
  LogOut,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ticket,
  AlertTriangle,
  Check,
  Delete,
  ArrowLeft,
  TrendingUp,
  MapPin,
  Clock,
  UserPlus,
  Settings,
  ArrowRight,
  ShoppingCart,
  MoreHorizontal,
  MoreVertical,
  Sun,
  Moon
} from 'lucide-react';

const iconMap = {
  product: Package,
  category: Layers,
  orders: ClipboardList,
  dashboard: LayoutDashboard,
  users: Users,
  plus: Plus,
  plusCompact: Plus,
  minus: Minus,
  close: X,
  edit: Pencil,
  delete: Trash2,
  search: Search,
  cart: ShoppingBag,
  cash: Banknote,
  khqr: QrCode,
  logout: LogOut,
  'toggle-visibility': Eye,
  eye: Eye,
  'eye-off': EyeOff,
  disable: Ban,
  enable: CheckCircle,
  menu: Menu,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  discount: Ticket,
  warning: AlertTriangle,
  check: Check,
  backspace: Delete,
  arrowLeft: ArrowLeft,
  trendUp: TrendingUp,
  location: MapPin,
  clock: Clock,
  userPlus: UserPlus,
  settings: Settings,
  arrowRight: ArrowRight,
  shoppingCart: ShoppingCart,
  moreHorizontal: MoreHorizontal,
  moreVertical: MoreVertical,
  sun: Sun,
  moon: Moon
};

export default function Icon({
  name,
  className = 'w-5 h-5',
  strokeWidth = 2.5,
  ...props
}) {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) return null;

  return (
    <LucideIcon
      className={className}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}

