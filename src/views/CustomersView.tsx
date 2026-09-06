import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  Phone,
  Building2,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  FileText,
  Printer,
  ShoppingBag,
  Coins,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { ReceiptPrint } from '../components/ReceiptPrint';
import { exportToExcel } from '../utils/exportExcel';
import { Pagination } from '../components/Pagination';
import { posSound } from '../utils/sound';
import type { Customer, Sale } from '../types';

const emptyForm: Omit<Customer, 'id' | 'totalPurchases' | 'visits' | 'createdAt'> = {
  name: '',
  phone: '',
  company: '',
};

export function CustomersView() {
  const { customers, sales, addCustomer, updateCustomer, deleteCustomer, settlePendingSale, paymentMethodsList } =
    useStore();
  const [search, setSearch] = useState('');
  const [onlyWithDebt, setOnlyWithDebt] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  // Customer Debt Settlement State
  const [debtModalCustomer, setDebtModalCustomer] = useState<Customer | null>(null);
  const [selectedSaleToSettle, setSelectedSaleToSettle] = useState<Sale | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Efectivo');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleError, setSettleError] = useState('');

  // Purchase History State
  const [historyModalCustomer, setHistoryModalCustomer] = useState<Customer | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  // Reset page when search or debt filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, onlyWithDebt]);

  // Map customer debt & sales (ONLY for sales where status is strictly 'Pendiente')
  const customerDebts = useMemo(() => {
    const map = new Map<string, { pendingSales: Sale[]; totalDebt: number }>();
    customers.forEach((c) => {
      const pendingSales = sales.filter(
        (s) =>
          (s.customerId === c.id || s.customerName.toLowerCase() === c.name.toLowerCase()) &&
          s.status === 'Pendiente' &&
          (s.pendingBalance !== undefined ? s.pendingBalance > 0 : (s.total - (s.advanceAmount || 0)) > 0),
      );
      const totalDebt = pendingSales.reduce(
        (sum, s) => sum + (s.pendingBalance !== undefined ? s.pendingBalance : s.total - (s.advanceAmount || 0)),
        0,
      );
      map.set(c.id, { pendingSales, totalDebt });
    });
    return map;
  }, [customers, sales]);

  const customersWithDebtCount = useMemo(() => {
    let count = 0;
    customerDebts.forEach((val) => {
      if (val.totalDebt > 0) count++;
    });
    return count;
  }, [customerDebts]);

  const totalSystemCustomerDebt = useMemo(() => {
    let sum = 0;
    customerDebts.forEach((val) => {
      sum += val.totalDebt;
    });
    return sum;
  }, [customerDebts]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.toLowerCase().includes(search.toLowerCase()) ||
        (c.company ?? '').toLowerCase().includes(search.toLowerCase());

      const debtInfo = customerDebts.get(c.id);
      const matchDebt = !onlyWithDebt || (debtInfo && debtInfo.totalDebt > 0);

      return matchSearch && matchDebt;
    });
  }, [customers, search, onlyWithDebt, customerDebts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      phone: c.phone,
      company: c.company ?? '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name || !form.phone) return;
    if (editingId) {
      updateCustomer(editingId, form);
    } else {
      addCustomer(form);
    }
    setModalOpen(false);
  };

  const openCustomerDebtModal = (c: Customer, specificSale?: Sale) => {
    setDebtModalCustomer(c);
    const debtInfo = customerDebts.get(c.id);
    const targetSale = specificSale || (debtInfo && debtInfo.pendingSales.length > 0 ? debtInfo.pendingSales[0] : null);

    if (targetSale) {
      setSelectedSaleToSettle(targetSale);
      const pending = targetSale.pendingBalance ?? (targetSale.total - (targetSale.advanceAmount || 0));
      setSettleAmount(pending.toString());
    } else {
      setSelectedSaleToSettle(null);
      setSettleAmount('');
    }
    setSettleMethod(paymentMethodsList[0] || 'Efectivo');
    setSettleNotes('');
    setSettleError('');
  };

  const selectSaleForSettlement = (sale: Sale) => {
    setSelectedSaleToSettle(sale);
    const pending = sale.pendingBalance ?? (sale.total - (sale.advanceAmount || 0));
    setSettleAmount(pending.toString());
    setSettleError('');
  };

  const handleSettleSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleToSettle) return;

    const amount = parseFloat(settleAmount);
    const maxPending = selectedSaleToSettle.pendingBalance ?? (selectedSaleToSettle.total - (selectedSaleToSettle.advanceAmount || 0));

    if (isNaN(amount) || amount <= 0) {
      setSettleError('Ingresa un monto en Bolivianos válido mayor a 0');
      posSound.playErrorAlert();
      return;
    }
    if (amount > maxPending + 0.01) {
      setSettleError(`El monto no puede superar el saldo pendiente de esta venta (${formatCurrency(maxPending)})`);
      posSound.playErrorAlert();
      return;
    }

    const saleIdToSettle = selectedSaleToSettle.id;

    settlePendingSale(saleIdToSettle, {
      amount,
      paymentMethod: settleMethod,
      notes: settleNotes || undefined,
    });

    posSound.playSuccessChime();

    // After settlement, check remaining pending sales for this customer
    if (debtModalCustomer) {
      const remainingPending = sales
        .filter((s) => s.id !== saleIdToSettle)
        .filter(
          (s) =>
            (s.customerId === debtModalCustomer.id ||
              s.customerName.toLowerCase() === debtModalCustomer.name.toLowerCase()) &&
            s.status === 'Pendiente' &&
            (s.pendingBalance !== undefined ? s.pendingBalance : s.total - (s.advanceAmount || 0)) > 0,
        );

      if (remainingPending.length > 0) {
        const nextSale = remainingPending[0];
        setSelectedSaleToSettle(nextSale);
        const nextPending = nextSale.pendingBalance ?? (nextSale.total - (nextSale.advanceAmount || 0));
        setSettleAmount(nextPending.toString());
      } else {
        setSelectedSaleToSettle(null);
        setSettleAmount('');
      }
    }

    setSettleNotes('');
    setSettleError('');
  };

  const handleExportToExcel = () => {
    const headers = [
      'ID',
      'Nombre',
      'Celular',
      'Empresa',
      'Compras Totales (Bs.)',
      'Saldo Pendiente (Bs.)',
      'Visitas',
      'Fecha Registro',
    ];
    const rows = filtered.map((c) => {
      const debt = customerDebts.get(c.id)?.totalDebt || 0;
      return [
        c.id,
        c.name,
        c.phone,
        c.company ?? '',
        c.totalPurchases,
        debt,
        c.visits,
        c.createdAt,
      ];
    });
    exportToExcel('Cartera_Clientes_y_Deudas', headers, rows);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Clientes Registrados</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{customers.length}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Compras Totales Acumuladas</p>
          <p className="text-xl font-bold text-brand-600 mt-0.5">
            {formatCurrency(customers.reduce((s, c) => s + c.totalPurchases, 0))}
          </p>
        </div>
        <div className="card p-3.5 border-l-4 border-l-amber-500">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <Clock size={13} className="text-amber-600" />
            Saldos por Cobrar (Deudas en Bs.)
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalSystemCustomerDebt)}</p>
            <span className="text-[11px] font-semibold text-amber-700">({customersWithDebtCount} clientes)</span>
          </div>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Visitas Registradas</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">
            {customers.reduce((s, c) => s + c.visits, 0)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por número de celular, nombre o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto items-center flex-wrap justify-between sm:justify-end">
          {/* Quick debt filter toggle */}
          <div className="flex gap-1 bg-ink-100 p-0.5 rounded-lg">
            <button
              onClick={() => setOnlyWithDebt(false)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                !onlyWithDebt
                  ? 'bg-white text-ink-900 shadow-sm font-bold'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Todos ({customers.length})
            </button>
            <button
              onClick={() => setOnlyWithDebt(true)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                onlyWithDebt
                  ? 'bg-amber-500 text-white shadow-sm font-bold'
                  : 'text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <Clock size={12} />
              Con Saldo Pendiente ({customersWithDebtCount})
            </button>
          </div>

          <button
            onClick={handleExportToExcel}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-emerald-700 hover:bg-emerald-50"
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5 px-3 font-bold">
            <Plus size={15} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paginatedCustomers.map((c) => {
            const debtInfo = customerDebts.get(c.id);
            const hasDebt = debtInfo && debtInfo.totalDebt > 0;
            const customerSalesCount = sales.filter(
              (s) => s.customerId === c.id || s.customerName.toLowerCase() === c.name.toLowerCase(),
            ).length;

            return (
              <div
                key={c.id}
                className={`card card-hover p-4 transition-all flex flex-col justify-between ${
                  hasDebt ? 'border-amber-300 bg-gradient-to-b from-amber-50/20 to-white shadow-sm ring-1 ring-amber-200' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md ${
                          hasDebt
                            ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20'
                            : 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand-500/20'
                        }`}
                      >
                        {c.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-ink-900 text-xs">{c.name}</h4>
                        {c.company && <p className="text-[11px] text-ink-500 font-medium">{c.company}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setHistoryModalCustomer(c)}
                        className="p-1 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        title="Ver historial de compras"
                      >
                        <Receipt size={13} />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        title="Editar cliente"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="p-1 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mb-3">
                    <div className="flex items-center gap-2 text-ink-800 font-medium">
                      <Phone size={13} className="text-brand-500 shrink-0" />
                      <span>Celular: {c.phone}</span>
                    </div>
                    {c.company && (
                      <div className="flex items-center gap-2 text-ink-600 text-[11px]">
                        <Building2 size={13} className="text-ink-400 shrink-0" />
                        <span>{c.company}</span>
                      </div>
                    )}
                  </div>

                  {/* Outstanding debt badge & action button (ONLY if customer really has debt) */}
                  {hasDebt && (
                    <div className="mb-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 flex items-center justify-between gap-2 shadow-xs">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold block flex items-center gap-1">
                          <Clock size={11} className="text-amber-600" /> Saldo Pendiente por Cobrar:
                        </span>
                        <p className="text-xs font-bold text-amber-900">
                          {formatCurrency(debtInfo.totalDebt)}
                          <span className="text-[10px] font-normal text-amber-700 ml-1">
                            ({debtInfo.pendingSales.length} venta{debtInfo.pendingSales.length > 1 ? 's' : ''})
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => openCustomerDebtModal(c)}
                        className="btn-primary py-1 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm rounded-lg"
                        title="Cobrar saldo / amortizar deuda"
                      >
                        <Coins size={12} />
                        Cobrar Saldo
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-ink-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-ink-400">Compras acumuladas</p>
                      <p className="text-xs font-bold text-ink-900">{formatCurrency(c.totalPurchases)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-ink-400">Visitas</p>
                      <Badge color="blue">{c.visits}</Badge>
                    </div>
                  </div>

                  <button
                    onClick={() => setHistoryModalCustomer(c)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-ink-50 hover:bg-brand-50 text-ink-600 hover:text-brand-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-ink-100"
                  >
                    <Receipt size={13} className="text-brand-500" />
                    Ver Historial de Compras ({customerSalesCount})
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-ink-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              {onlyWithDebt ? 'No hay clientes con saldo pendiente de pago' : 'No se encontraron clientes'}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <Pagination
            currentPage={safePage}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[6, 9, 12, 24, 48]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Customer Purchase History Modal */}
      <Modal
        open={!!historyModalCustomer}
        onClose={() => setHistoryModalCustomer(null)}
        title={`Historial de Compras — ${historyModalCustomer?.name ?? ''}`}
        subtitle={`Celular: ${historyModalCustomer?.phone ?? ''} ${
          historyModalCustomer?.company ? `| Empresa: ${historyModalCustomer.company}` : ''
        }`}
        size="lg"
      >
        {historyModalCustomer && (
          <div className="space-y-4">
            {/* Summary badges */}
            {(() => {
              const customerSales = sales.filter(
                (s) =>
                  s.customerId === historyModalCustomer.id ||
                  s.customerName.toLowerCase() === historyModalCustomer.name.toLowerCase(),
              );
              const debtInfo = customerDebts.get(historyModalCustomer.id);
              const totalDebt = debtInfo?.totalDebt || 0;
              const completedSales = customerSales.filter((s) => s.status === 'Completada');
              const totalPaid = completedSales.reduce((sum, s) => sum + s.total, 0) +
                customerSales.filter((s) => s.status === 'Pendiente').reduce((sum, s) => sum + (s.advanceAmount || 0), 0);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-ink-50 border border-ink-100">
                      <p className="text-[10px] text-ink-400 font-medium">Ventas Registradas</p>
                      <p className="text-base font-bold text-ink-900 mt-0.5">{customerSales.length}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-ink-50 border border-ink-100">
                      <p className="text-[10px] text-ink-400 font-medium">Total Pagado en Caja</p>
                      <p className="text-base font-bold text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-[10px] text-amber-700 font-medium">Saldo por Cobrar</p>
                      <p className="text-base font-bold text-amber-700 mt-0.5">{formatCurrency(totalDebt)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-ink-50 border border-ink-100">
                      <p className="text-[10px] text-ink-400 font-medium">Visitas a Tienda</p>
                      <p className="text-base font-bold text-brand-600 mt-0.5">{historyModalCustomer.visits}</p>
                    </div>
                  </div>

                  {customerSales.length === 0 ? (
                    <div className="text-center py-10 text-ink-400">
                      <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No hay historial de compras registradas para este cliente aún.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto custom-scrollbar pr-1">
                      {customerSales.map((s) => {
                        const isPending = s.status === 'Pendiente' && (s.pendingBalance !== undefined ? s.pendingBalance > 0 : true);
                        const pendingBal = isPending ? (s.pendingBalance ?? (s.total - (s.advanceAmount || 0))) : 0;

                        return (
                          <div
                            key={s.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isPending
                                ? 'bg-amber-50/50 border-amber-300 shadow-sm'
                                : 'bg-white border-ink-100 shadow-sm hover:border-ink-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-brand-600">{s.folio}</span>
                                <Badge color={s.documentType === 'Factura' ? 'blue' : 'purple'}>
                                  {s.documentType === 'Factura' ? <FileText size={10} /> : <Receipt size={10} />}
                                  {s.documentType}
                                </Badge>
                                <span className="text-[11px] text-ink-500">{formatDateTime(s.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  color={
                                    s.status === 'Completada'
                                      ? 'green'
                                      : s.status === 'Cancelada'
                                      ? 'red'
                                      : 'amber'
                                  }
                                >
                                  {s.status === 'Pendiente' ? ' Saldo Pendiente de Pago' : s.status}
                                </Badge>
                                <button
                                  onClick={() => setPrintSale(s)}
                                  className="p-1 rounded-md text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                                  title="Imprimir comprobante"
                                >
                                  <Printer size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Products table */}
                            <div className="py-2">
                              <div className="rounded-lg border border-ink-100 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-ink-50 text-[10px] text-ink-500 font-semibold">
                                    <tr>
                                      <th className="py-1.5 px-2 text-left">Producto</th>
                                      <th className="py-1.5 px-2 text-right">Precio</th>
                                      <th className="py-1.5 px-2 text-center">Cant.</th>
                                      <th className="py-1.5 px-2 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-ink-50">
                                    {s.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="py-1.5 px-2">
                                          <span className="font-medium text-ink-800">{item.name}</span>
                                          <div className="flex items-center gap-2 text-[10px] text-ink-400 font-mono">
                                            <span>SKU: {item.sku}</span>
                                            {item.serialNumber && (
                                              <span className="text-purple-700 font-bold bg-purple-50 px-1 py-0.2 rounded">
                                                SN: {item.serialNumber}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-ink-600">{formatCurrency(item.price)}</td>
                                        <td className="py-1.5 px-2 text-center font-bold text-ink-800">{item.quantity}</td>
                                        <td className="py-1.5 px-2 text-right font-semibold text-ink-900">
                                          {formatCurrency(item.subtotal)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Financial totals footer */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink-100 text-xs">
                              <div className="text-ink-500 text-[11px] flex items-center gap-2">
                                <span>Cajero: <strong>{s.cashierName}</strong></span>
                                <span>•</span>
                                <span>Pago: <strong>{s.paymentMethod}</strong></span>
                              </div>

                              <div className="flex items-center gap-3">
                                {isPending ? (
                                  <div className="flex items-center gap-2.5">
                                    <div className="text-right">
                                      <span className="text-[10px] text-ink-400 block">
                                        Total: {formatCurrency(s.total)} | Abonado: {formatCurrency(s.advanceAmount || 0)}
                                      </span>
                                      <span className="text-xs font-bold text-amber-800">
                                        Saldo por Cobrar: {formatCurrency(pendingBal)}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setHistoryModalCustomer(null);
                                        openCustomerDebtModal(historyModalCustomer, s);
                                      }}
                                      className="btn-primary py-1 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm rounded-lg"
                                      title="Cobrar saldo de esta venta específica"
                                    >
                                      <Coins size={12} /> Cobrar Saldo Pendiente
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-right">
                                    <span className="text-[10px] text-ink-400">Total Pagado: </span>
                                    <span className="text-xs font-bold text-emerald-700">{formatCurrency(s.total)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-2 border-t border-ink-100 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalCustomer(null)}
                className="btn-secondary text-xs px-4"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print receipt modal */}
      <Modal
        open={!!printSale}
        onClose={() => setPrintSale(null)}
        title="Impresión de Comprobante"
        size="md"
      >
        {printSale && <ReceiptPrint sale={printSale} onClose={() => setPrintSale(null)} />}
      </Modal>

      {/* Customer Debt Settlement Modal (Simulator & Payment) */}
      <Modal
        open={!!debtModalCustomer}
        onClose={() => setDebtModalCustomer(null)}
        title={`Cobro de Saldos y Deudas en Bolivianos (Bs.) — ${debtModalCustomer?.name ?? ''}`}
        subtitle={`Celular: ${debtModalCustomer?.phone ?? ''} ${
          debtModalCustomer?.company ? `| Empresa: ${debtModalCustomer.company}` : ''
        }`}
        size="lg"
      >
        {debtModalCustomer && (
          <div className="space-y-4">
            {(() => {
              const currentDebtInfo = customerDebts.get(debtModalCustomer.id);
              const pendingSales = currentDebtInfo?.pendingSales || [];
              const totalDebt = currentDebtInfo?.totalDebt || 0;

              if (pendingSales.length === 0) {
                return (
                  <div className="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
                    <p className="font-bold text-sm">¡Cliente al día!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Este cliente no tiene reservas ni saldos pendientes de pago en el sistema.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Total debt summary header */}
                  <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-300 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-amber-800 font-bold flex items-center gap-1">
                        <Clock size={13} className="text-amber-600" /> Total Deuda Acumulada del Cliente
                      </p>
                      <p className="text-xl font-bold text-amber-900 mt-0.5">{formatCurrency(totalDebt)}</p>
                    </div>
                    <Badge color="amber">
                      <Clock size={12} /> {pendingSales.length} Venta{pendingSales.length > 1 ? 's' : ''} con Saldo Pendiente
                    </Badge>
                  </div>

                  {/* List of pending sales with distinct selection */}
                  <div>
                    <p className="text-xs font-bold text-ink-700 uppercase mb-2">
                      Ventas con Saldo Pendiente:
                    </p>
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {pendingSales.map((s) => {
                        const isSelected = selectedSaleToSettle?.id === s.id;
                        const pendingBal = s.pendingBalance ?? (s.total - (s.advanceAmount || 0));
                        return (
                          <div
                            key={s.id}
                            onClick={() => selectSaleForSettlement(s)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500'
                                : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50/60 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-ink-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="font-mono font-bold text-xs text-brand-600">{s.folio}</span>
                                <Badge color={s.documentType === 'Factura' ? 'blue' : 'purple'}>{s.documentType}</Badge>
                                <span className="text-[11px] text-ink-400">{formatDateTime(s.createdAt)}</span>
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Venta Seleccionada para Cobro
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-ink-400 block">Saldo por Cobrar:</span>
                                <span className="text-xs font-bold text-amber-800">
                                  {formatCurrency(pendingBal)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1.5 flex justify-between items-center text-[11px] text-ink-600 border-t border-ink-100 pt-1.5">
                              <span>
                                {s.items.length} producto{s.items.length > 1 ? 's' : ''}:{' '}
                                {s.items.map((i) => i.name).join(', ')}
                              </span>
                              <div className="flex gap-2 text-[10px]">
                                <span>Total: {formatCurrency(s.total)}</span>
                                <span className="text-emerald-600 font-semibold">
                                  Abonado: {formatCurrency(s.advanceAmount || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment form for selected sale */}
                  {selectedSaleToSettle && (() => {
                    const currentPending = selectedSaleToSettle.pendingBalance ?? (selectedSaleToSettle.total - (selectedSaleToSettle.advanceAmount || 0));
                    const enteredAmount = parseFloat(settleAmount) || 0;
                    const projectedRemaining = Math.max(0, currentPending - enteredAmount);
                    const paidPercent = Math.min(100, Math.round(((selectedSaleToSettle.advanceAmount || 0) / selectedSaleToSettle.total) * 100));

                    return (
                      <form
                        onSubmit={handleSettleSale}
                        className="p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-3.5"
                      >
                        <div className="flex justify-between items-center border-b border-ink-200 pb-2.5">
                          <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                            <Coins size={14} className="text-emerald-600" />
                            Cobrar Saldo Exclusivo de Venta: <strong className="text-brand-600">{selectedSaleToSettle.folio}</strong>
                          </span>
                          <span className="text-xs text-amber-800 font-bold">
                            Saldo Pendiente: {formatCurrency(currentPending)}
                          </span>
                        </div>

                        {/* Progress bar in customer debt modal */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span className="text-emerald-700">{paidPercent}% Abonado</span>
                            <span className="text-amber-700">{100 - paidPercent}% Saldo Restante</span>
                          </div>
                          <div className="w-full h-2 bg-ink-200 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${paidPercent}%` }} />
                            <div className="bg-amber-400 h-full" style={{ width: `${100 - paidPercent}%` }} />
                          </div>
                        </div>

                        {/* Presets in Bs. */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSettleAmount(currentPending.toString());
                              setSettleError('');
                            }}
                            className="py-1 px-2 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-all text-center"
                          >
                            Pagar Todo (100%): Bs. {currentPending.toFixed(2)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSettleAmount((currentPending / 2).toFixed(2));
                              setSettleError('');
                            }}
                            className="py-1 px-2 rounded-md bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 text-[11px] font-bold transition-all text-center"
                          >
                            Abonar 50%: Bs. {(currentPending / 2).toFixed(2)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSettleAmount((currentPending / 4).toFixed(2));
                              setSettleError('');
                            }}
                            className="py-1 px-2 rounded-md bg-ink-100 hover:bg-ink-200 text-ink-800 text-[11px] font-bold transition-all text-center"
                          >
                            Abonar 25%: Bs. {(currentPending / 4).toFixed(2)}
                          </button>
                        </div>

                        {settleError && (
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0 text-red-500" />
                            <span>{settleError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="label text-xs font-semibold">Monto a Cobrar / Abonar (en Bolivianos)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-500">Bs.</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={currentPending}
                                value={settleAmount}
                                onChange={(e) => {
                                  setSettleAmount(e.target.value);
                                  setSettleError('');
                                }}
                                className="input pl-10 text-sm font-bold text-emerald-700"
                                placeholder="0.00"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="label text-xs font-semibold">Método de Pago</label>
                            <select
                              value={settleMethod}
                              onChange={(e) => setSettleMethod(e.target.value)}
                              className="input text-xs"
                            >
                              {paymentMethodsList.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Live calculation banner */}
                        <div
                          className={`p-2.5 rounded-lg border text-xs ${
                            projectedRemaining <= 0
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                              : 'bg-blue-50 border-blue-200 text-blue-900'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>Saldo que restará en esta venta ({selectedSaleToSettle.folio}):</span>
                            <span className="font-bold text-sm">{formatCurrency(projectedRemaining)}</span>
                          </div>
                          <p className="text-[11px] mt-1 opacity-90">
                            {projectedRemaining <= 0
                              ? '🎉 Con este pago se liquidará completamente esta venta.'
                              : `ℹ️ Se abonará ${formatCurrency(enteredAmount)} y quedará pendiente ${formatCurrency(projectedRemaining)} en esta venta.`}
                          </p>
                        </div>

                        <div>
                          <label className="label text-xs font-semibold">Notas / Observaciones de Cobro</label>
                          <input
                            type="text"
                            value={settleNotes}
                            onChange={(e) => setSettleNotes(e.target.value)}
                            placeholder="Ej: Pago de cuota al contado en Bolivianos"
                            className="input text-xs"
                          />
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="submit"
                            className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 py-2 px-4"
                          >
                            <CheckCircle2 size={14} />
                            Confirmar Cobro de Venta {selectedSaleToSettle.folio}
                          </button>
                        </div>
                      </form>
                    );
                  })()}
                </div>
              );
            })()}

            <div className="pt-2 border-t border-ink-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDebtModalCustomer(null)}
                className="btn-secondary text-xs px-4"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal create/edit customer */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label text-xs">Nombre Completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input text-xs"
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="label text-xs">Número de Celular</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input pl-8 text-xs"
                placeholder="70000000"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Empresa / Negocio (opcional)</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="input text-xs"
              placeholder="Nombre de empresa"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1 text-xs">
            Cancelar
          </button>
          <button onClick={save} className="btn-primary flex-1 text-xs font-bold">
            {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Cliente"
        size="sm"
      >
        <p className="text-xs text-ink-600">
          ¿Seguro que deseas eliminar a <strong>{confirmDelete?.name}</strong>?
        </p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 text-xs">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) deleteCustomer(confirmDelete.id);
              setConfirmDelete(null);
            }}
            className="btn-danger flex-1 text-xs font-bold"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
