import { Search, Bell, Menu } from 'lucide-react';

export function Topbar({
  title,
  subtitle,
  onSearch,
  searchValue,
  onToggleMobileMenu,
}: {
  title: string;
  subtitle: string;
  onSearch?: (v: string) => void;
  searchValue?: string;
  onToggleMobileMenu?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-ink-100 px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-ink-100 lg:hidden transition-colors shrink-0"
          title="Abrir menú"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-ink-900 leading-tight truncate">{title}</h2>
          <p className="text-[11px] sm:text-xs text-ink-500 leading-tight truncate">{subtitle}</p>
        </div>
      </div>

      {onSearch !== undefined && (
        <div className="relative hidden md:block max-w-xs w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchValue ?? ''}
            onChange={(e) => onSearch(e.target.value)}
            className="input pl-9 w-full text-xs py-1.5"
          />
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button className="relative p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-ink-100">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-sm">
            AP
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-ink-900 leading-tight">Admin Principal</p>
            <p className="text-[10px] text-ink-500 leading-tight">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
