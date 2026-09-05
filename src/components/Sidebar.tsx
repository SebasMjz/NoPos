import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  UserCog,
  BarChart3,
  ArrowLeftRight,
  Truck,
  Cpu,
  ChevronLeft,
  Wallet,
  FileCheck,
} from 'lucide-react';
import type { ViewKey } from '../types';

const navItems: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
  { key: 'cash', label: 'Cajas & Arqueo', icon: Wallet },
  { key: 'products', label: 'Productos', icon: Package },
  { key: 'sales', label: 'Ventas', icon: Receipt },
  { key: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { key: 'customers', label: 'Clientes', icon: Users },
  { key: 'distributors', label: 'Distribuidores', icon: Truck },
  { key: 'users', label: 'Usuarios', icon: UserCog },
  { key: 'statistics', label: 'Estadísticas', icon: BarChart3 },
  { key: 'quotes', label: 'Cotizaciones', icon: FileCheck },
];

export function Sidebar({
  current,
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  current: ViewKey;
  onNavigate: (key: ViewKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} shrink-0 bg-ink-950 text-ink-100 flex flex-col transition-all duration-300 h-screen sticky top-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-800/50 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-lg shadow-brand-900/50">
          <Cpu size={22} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-white tracking-tight">NoPos</h1>
            <p className="text-[11px] text-ink-400 leading-none">Electrónica & PC</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = current === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-300 hover:bg-ink-800/50 hover:text-white'
                }`}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-ink-800/50 p-3 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-ink-400 hover:bg-ink-800/50 hover:text-white transition-colors"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span className="text-xs font-medium">Contraer</span>}
        </button>
      </div>
    </aside>
  );
}
