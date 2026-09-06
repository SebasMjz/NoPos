import { useState } from 'react';
import { StoreProvider } from './store';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { QuotesView } from './views/QuotesView';
import { ProductsView } from './views/ProductsView';
import { SalesView } from './views/SalesView';
import { CustomersView } from './views/CustomersView';
import { DistributorsView } from './views/DistributorsView';
import { UsersView } from './views/UsersView';
import { StatisticsView } from './views/StatisticsView';
import { MovementsView } from './views/MovementsView';
import { CashRegisterView } from './views/CashRegisterView';
import { CreditsView } from './views/CreditsView';
import { BranchesView } from './views/BranchesView';
import { SettingsView } from './views/SettingsView';
import type { ViewKey } from './types';

const viewMeta: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Resumen general del sistema' },
  pos: { title: 'Punto de Venta', subtitle: 'Registra nuevas ventas y emite comprobantes' },
  quotes: { title: 'Cotizaciones', subtitle: 'Proformas y presupuestos de equipos sin afectar inventario' },
  cash: { title: 'Cajas & Arqueo', subtitle: 'Control de turnos, flujo de dinero y arqueos' },
  products: { title: 'Productos', subtitle: 'Gestión de inventario y trazabilidad por SN' },
  sales: { title: 'Ventas', subtitle: 'Historial de transacciones y comprobantes' },
  movements: { title: 'Movimientos de Inventario', subtitle: 'Entradas, salidas, RMA y convenios' },
  credits: { title: 'Créditos & Deudas', subtitle: 'Cuentas por cobrar a clientes y cuentas por pagar a proveedores' },
  branches: { title: 'Sucursales & Bodegas', subtitle: 'Red de locales, depósitos y transferencias de stock' },
  customers: { title: 'Clientes', subtitle: 'Gestión de clientes y fidelización' },
  distributors: { title: 'Distribuidores', subtitle: 'Gestión de proveedores e importadoras' },
  users: { title: 'Usuarios', subtitle: 'Gestión de personal y roles' },
  statistics: { title: 'Estadísticas', subtitle: 'Análisis y reportes financieros' },
  settings: { title: 'Ajustes Enterprise', subtitle: 'Configuración de empresa, hardware POS, políticas y backups' },
};

function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const meta = viewMeta[view];

  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-ink-50">
        <Sidebar
          current={view}
          onNavigate={setView}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          <main className="flex-1 p-6 overflow-x-hidden">
            {view === 'dashboard' && <DashboardView onNavigate={setView} />}
            {view === 'pos' && <PosView />}
            {view === 'quotes' && <QuotesView />}
            {view === 'cash' && <CashRegisterView />}
            {view === 'products' && <ProductsView />}
            {view === 'sales' && <SalesView />}
            {view === 'movements' && <MovementsView />}
            {view === 'credits' && <CreditsView />}
            {view === 'branches' && <BranchesView />}
            {view === 'customers' && <CustomersView />}
            {view === 'distributors' && <DistributorsView />}
            {view === 'users' && <UsersView />}
            {view === 'statistics' && <StatisticsView />}
            {view === 'settings' && <SettingsView />}
          </main>
        </div>
      </div>
    </StoreProvider>
  );
}


export default App;
