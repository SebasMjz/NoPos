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
  CreditCard,
  Building2,
  Settings,
  X,
} from 'lucide-react';
import type { ViewKey } from '../types';

const navItems: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
  { key: 'cash', label: 'Cajas & Arqueo', icon: Wallet },
  { key: 'products', label: 'Productos', icon: Package },
  { key: 'sales', label: 'Ventas', icon: Receipt },
  { key: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { key: 'credits', label: 'Créditos & Deudas', icon: CreditCard },
  { key: 'branches', label: 'Sucursales & Bodegas', icon: Building2 },
  { key: 'customers', label: 'Clientes', icon: Users },
  { key: 'distributors', label: 'Distribuidores', icon: Truck },
  { key: 'users', label: 'Usuarios', icon: UserCog },
  { key: 'statistics', label: 'Estadísticas', icon: BarChart3 },
  { key: 'quotes', label: 'Cotizaciones', icon: FileCheck },
  { key: 'settings', label: 'Ajustes Enterprise', icon: Settings },
];

export function Sidebar({
  current,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  current: ViewKey;
  onNavigate: (key: ViewKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const handleItemClick = (key: ViewKey) => {
    onNavigate(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 lg:static lg:z-auto
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
          w-72 max-w-[85vw]
          bg-ink-950 text-ink-100 flex flex-col transition-all duration-300 h-screen
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo & Mobile Close */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-ink-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-lg shadow-brand-900/50">
              <Cpu size={22} className="text-white" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold text-white tracking-tight">NoPos</h1>
                <p className="text-[11px] text-ink-400 leading-none">Electrónica & PC</p>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-800 lg:hidden transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const active = current === item.key;
            const Icon = item.icon;
            const showLabel = !collapsed || mobileOpen;

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-300 hover:bg-ink-800/50 hover:text-white'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {showLabel && <span className="animate-fade-in truncate">{item.label}</span>}
                {active && showLabel && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:block border-t border-ink-800/50 p-3 shrink-0">
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
    </>
  );
}
