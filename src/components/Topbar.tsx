import { Search, Bell, Menu } from 'lucide-react';

export function Topbar({
  title,
  subtitle,
  onSearch,
  searchValue,
}: {
  title: string;
  subtitle: string;
  onSearch?: (v: string) => void;
  searchValue?: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-100 px-6 h-16 flex items-center gap-4">
      <div className="flex items-center gap-2 lg:hidden">
        <Menu size={22} className="text-ink-500" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink-900 leading-tight truncate">{title}</h2>
        <p className="text-xs text-ink-500 leading-tight truncate">{subtitle}</p>
      </div>

      {onSearch !== undefined && (
        <div className="ml-auto relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchValue ?? ''}
            onChange={(e) => onSearch(e.target.value)}
            className="input pl-9 w-64"
          />
        </div>
      )}

      <div className="ml-auto md:ml-0 flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-ink-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
            AP
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-ink-900 leading-tight">Admin Principal</p>
            <p className="text-xs text-ink-500 leading-tight">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
