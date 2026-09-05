import { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  Percent,
  Calendar,
  CreditCard,
  Building2,
  Users,
  Award,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency } from '../components/format';
import { Badge } from '../components/Badge';

export function StatisticsView() {
  const { sales, products, movements } = useStore();

  const completed = useMemo(() => sales.filter((s) => s.status === 'Completada'), [sales]);
  const totalRevenue = useMemo(() => completed.reduce((s, sa) => s + sa.total, 0), [completed]);

  // Derive estimated cost based on recorded unitCost in movements or realistic 70% product cost basis
  const totalCost = useMemo(() => {
    return completed.reduce((sum, sale) => {
      return (
        sum +
        sale.items.reduce((s, item) => {
          // Find if there was an entry movement with unit cost for this product
          const entry = movements.find((m) => m.productId === item.productId && m.unitCost);
          const unitCost = entry?.unitCost ?? item.price * 0.72;
          return s + unitCost * item.quantity;
        }, 0)
      );
    }, 0);
  }, [completed, movements]);

  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  // Last 14 days revenue & volume mapping
  const last14Days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const targetDateStr = d.toISOString().slice(0, 10);

      const daySales = completed.filter((s) => s.createdAt.slice(0, 10) === targetDateStr);
      const rev = daySales.reduce((sum, s) => sum + s.total, 0);

      return {
        dateStr: targetDateStr,
        day: d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
        weekday: d.toLocaleDateString('es-BO', { weekday: 'narrow' }),
        revenue: rev,
        count: daySales.length,
      };
    });
  }, [completed]);

  const maxRev = useMemo(() => Math.max(...last14Days.map((d) => d.revenue), 1000), [last14Days]);

  // Top products
  const topProducts = useMemo(() => {
    const productSales = new Map<string, { name: string; brand: string; qty: number; revenue: number }>();
    completed.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productSales.get(item.productId) ?? {
          name: item.name,
          brand: products.find((p) => p.id === item.productId)?.brand ?? '',
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity;
        existing.revenue += item.subtotal;
        productSales.set(item.productId, existing);
      });
    });
    return Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [completed, products]);

  const maxProductRev = useMemo(
    () => Math.max(...topProducts.map((p) => p.revenue), 1),
    [topProducts],
  );

  // Sales by category
  const catData = useMemo(() => {
    const catRevenue = new Map<string, number>();
    completed.forEach((sale) => {
      sale.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          catRevenue.set(product.category, (catRevenue.get(product.category) ?? 0) + item.subtotal);
        }
      });
    });
    return Array.from(catRevenue.entries()).sort((a, b) => b[1] - a[1]);
  }, [completed, products]);

  const maxCatRev = useMemo(() => Math.max(...catData.map((c) => c[1]), 1), [catData]);

  // Payment methods breakdown
  const pmData = useMemo(() => {
    const pmMap = new Map<string, { count: number; total: number }>();
    completed.forEach((s) => {
      const existing = pmMap.get(s.paymentMethod) ?? { count: 0, total: 0 };
      existing.count++;
      existing.total += s.total;
      pmMap.set(s.paymentMethod, existing);
    });
    return Array.from(pmMap.entries());
  }, [completed]);

  const totalPmCount = useMemo(() => pmData.reduce((s, [, v]) => s + v.count, 0) || 1, [pmData]);

  // Document type breakdown (Factura vs Nota de venta)
  const docTypeData = useMemo(() => {
    const facturas = completed.filter((s) => s.documentType === 'Factura');
    const notas = completed.filter((s) => s.documentType === 'Nota de venta');
    const facturaTotal = facturas.reduce((s, f) => s + f.total, 0);
    const notaTotal = notas.reduce((s, n) => s + n.total, 0);
    return {
      facturasCount: facturas.length,
      facturaTotal,
      notasCount: notas.length,
      notaTotal,
    };
  }, [completed]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-emerald-500" />
            <span className="text-xs text-ink-500 font-medium">Ingresos Totales</span>
          </div>
          <p className="text-xl font-bold text-ink-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-brand-500" />
            <span className="text-xs text-ink-500 font-medium">Margen Estimado</span>
          </div>
          <p className="text-xl font-bold text-brand-600">{formatCurrency(profit)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent size={16} className="text-violet-500" />
            <span className="text-xs text-ink-500 font-medium">Rentabilidad</span>
          </div>
          <p className="text-xl font-bold text-ink-900">{margin.toFixed(1)}%</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={16} className="text-amber-500" />
            <span className="text-xs text-ink-500 font-medium">Ticket Promedio</span>
          </div>
          <p className="text-xl font-bold text-ink-900">{formatCurrency(avgTicket)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-blue-500" />
            <span className="text-xs text-ink-500 font-medium">Catálogo Activo</span>
          </div>
          <p className="text-xl font-bold text-ink-900">{products.length} items</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-red-500" />
            <span className="text-xs text-ink-500 font-medium">Cancelaciones</span>
          </div>
          <p className="text-xl font-bold text-ink-900">
            {sales.filter((s) => s.status === 'Cancelada').length}
          </p>
        </div>
      </div>

      {/* Main Revenue Chart (Últimos 14 días) */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-ink-900">Evolución de Ingresos Diarios (Últimos 14 días)</h3>
            <p className="text-sm text-ink-500">
              Ventas brutas acumuladas: <strong className="text-ink-800">{formatCurrency(totalRevenue)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-ink-600">
              <span className="w-3 h-3 rounded bg-gradient-to-t from-brand-600 to-brand-400" />
              <span>Ingresos en Bs.</span>
            </div>
            <div className="flex items-center gap-1.5 text-ink-600">
              <Badge color="blue">{completed.length} Ventas Totales</Badge>
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="relative pt-6">
          {/* Y-axis grid references */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-b border-ink-300">
            <div className="border-b border-ink-400 w-full" />
            <div className="border-b border-ink-400 w-full" />
            <div className="border-b border-ink-400 w-full" />
          </div>

          <div className="flex items-end justify-between gap-2 h-64 relative z-10">
            {last14Days.map((d, i) => {
              const heightPercent = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Bar */}
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[38px] rounded-t-lg transition-all duration-300 relative ${
                        d.revenue > 0
                          ? 'bg-gradient-to-t from-brand-600 via-brand-500 to-brand-400 group-hover:from-brand-700 group-hover:to-brand-500 shadow-sm'
                          : 'bg-ink-100 hover:bg-ink-200'
                      }`}
                      style={{ height: `${Math.max(heightPercent, 6)}%` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap text-xs font-semibold bg-ink-950 text-white px-2.5 py-1.5 rounded-lg shadow-xl z-30">
                        <p className="text-[10px] text-ink-400">{d.day}</p>
                        <p className="text-emerald-400 font-bold">{formatCurrency(d.revenue)}</p>
                        <p className="text-[10px] text-ink-300">{d.count} transacciones</p>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="text-center">
                    <span className="text-[11px] font-medium text-ink-600 block">{d.day}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Award size={18} className="text-brand-600" />
              Productos Más Vendidos
            </h3>
            <span className="text-xs text-ink-500">Por volumen de ingresos</span>
          </div>
          <div className="space-y-3.5">
            {topProducts.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-ink-100 text-ink-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-ink-800 truncate">{p.name}</span>
                  </div>
                  <span className="font-bold text-ink-900 shrink-0">{formatCurrency(p.revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden flex">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                    style={{ width: `${(p.revenue / maxProductRev) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-ink-400 text-right">{p.qty} unidades vendidas</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by category & Document Types */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-ink-900 mb-4">Ventas por Categoría</h3>
            <div className="space-y-3">
              {catData.map(([cat, rev]) => (
                <div key={cat}>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium text-ink-700">{cat}</span>
                    <span className="font-bold text-ink-900">{formatCurrency(rev)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-brand-500"
                      style={{ width: `${(rev / maxCatRev) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Types Summary */}
          <div className="card p-5">
            <h4 className="font-bold text-ink-900 text-sm mb-3">Comprobantes Emitidos</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-xs font-bold text-blue-700 uppercase">Facturas Fiscales (13%)</span>
                <p className="text-lg font-bold text-blue-900 mt-1">{formatCurrency(docTypeData.facturaTotal)}</p>
                <p className="text-xs text-blue-600">{docTypeData.facturasCount} emitidas</p>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-xs font-bold text-purple-700 uppercase">Notas de Venta</span>
                <p className="text-lg font-bold text-purple-900 mt-1">{formatCurrency(docTypeData.notaTotal)}</p>
                <p className="text-xs text-purple-600">{docTypeData.notasCount} emitidas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods row */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-ink-900 mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-brand-600" />
          Distribución por Método de Pago
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pmData.map(([pm, data]) => {
            const pct = ((data.count / totalPmCount) * 100).toFixed(0);
            return (
              <div key={pm} className="p-4 rounded-xl bg-ink-50 border border-ink-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-ink-800">{pm}</span>
                  <Badge color="blue">{pct}%</Badge>
                </div>
                <p className="text-xl font-bold text-ink-900 mt-2">{formatCurrency(data.total)}</p>
                <p className="text-xs text-ink-400 mt-1">{data.count} transacciones</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
