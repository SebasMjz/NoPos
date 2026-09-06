import { useState, useMemo } from 'react';
import {
  Receipt,
  Eye,
  Ban,
  Search,
  CreditCard,
  Banknote,
  Building2,
  Clock,
  FileText,
  Printer,
  FileSpreadsheet,
  Coins,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { ReceiptPrint } from '../components/ReceiptPrint';
import { exportToExcel } from '../utils/exportExcel';
import { Pagination } from '../components/Pagination';
import { posSound } from '../utils/sound';
import type { Sale } from '../types';

const paymentIcons: Record<string, typeof Banknote> = {
  Efectivo: Banknote,
  Tarjeta: CreditCard,
  Transferencia: Building2,
  Crédito: Clock,
  'Pago Mixto': CreditCard,
  'QR Simple': Building2,
};

export function SalesView() {
  const { sales, cancelSale, settlePendingSale, paymentMethodsList } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Sale['status'] | 'Todas'>('Todas');
  const [docFilter, setDocFilter] = useState<Sale['documentType'] | 'Todos'>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Sale | null>(null);

  // Settle Debt Modal State
  const [settleSale, setSettleSale] = useState<Sale | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Efectivo');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleError, setSettleError] = useState('');

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.folio.toLowerCase().includes(search.toLowerCase()) ||
        s.customerName.toLowerCase().includes(search.toLowerCase()) ||
        s.cashierName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'Todas' || s.status === statusFilter;
      const matchDoc = docFilter === 'Todos' || s.documentType === docFilter;
      return matchSearch && matchStatus && matchDoc;
    });
  }, [sales, search, statusFilter, docFilter]);

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const completed = sales.filter((s) => s.status === 'Completada');
  const pendingSales = sales.filter((s) => s.status === 'Pendiente');
  const cancelledSales = sales.filter((s) => s.status === 'Cancelada');

  const totalRevenue = completed.reduce((s, sa) => s + sa.total, 0) +
    pendingSales.reduce((s, sa) => s + (sa.advanceAmount || 0), 0);
  const totalPendingDebt = pendingSales.reduce(
    (sum, sa) => sum + (sa.pendingBalance !== undefined ? sa.pendingBalance : sa.total - (sa.advanceAmount || 0)),
    0,
  );

  const openSettleModal = (sale: Sale) => {
    setSettleSale(sale);
    const pending = sale.pendingBalance ?? (sale.total - (sale.advanceAmount || 0));
    setSettleAmount(pending.toString());
    setSettleMethod(paymentMethodsList[0] || 'Efectivo');
    setSettleNotes('');
    setSettleError('');
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleSale) return;

    const amount = parseFloat(settleAmount);
    const maxPending = settleSale.pendingBalance ?? (settleSale.total - (settleSale.advanceAmount || 0));

    if (isNaN(amount) || amount <= 0) {
      setSettleError('Ingresa un monto en Bolivianos válido mayor a 0');
      posSound.playErrorAlert();
      return;
    }
    if (amount > maxPending + 0.01) {
      setSettleError(`El monto no puede exceder el saldo pendiente (${formatCurrency(maxPending)})`);
      posSound.playErrorAlert();
      return;
    }

    settlePendingSale(settleSale.id, {
      amount,
      paymentMethod: settleMethod,
      notes: settleNotes || undefined,
    });

    posSound.playSuccessChime();
    setSettleSale(null);
  };

  const handleExportToExcel = () => {
    const headers = [
      'Folio',
      'Tipo Comprobante',
      'Cliente',
      'Cajero',
      'Método de Pago',
      'Subtotal (Bs.)',
      'Descuento (Bs.)',
      'IVA (13%)',
      'Total Venta (Bs.)',
      'Anticipo Cobrado (Bs.)',
      'Saldo Pendiente (Bs.)',
      'Estado',
      'Fecha Venta',
      'Fecha Liquidación',
      'Artículos Vendidos',
    ];

    const rows = filtered.map((s) => [
      s.folio,
      s.documentType,
      s.customerName,
      s.cashierName,
      s.paymentMethod,
      s.subtotal,
      s.discount,
      s.tax,
      s.total,
      s.advanceAmount || (s.status === 'Completada' ? s.total : 0),
      s.pendingBalance || 0,
      s.status,
      s.createdAt,
      s.settledAt || 'N/A',
      s.items.map((i) => `${i.quantity}x ${i.name} (SN: ${i.serialNumber || 'N/A'})`).join('; '),
    ]);

    exportToExcel('Historial_Ventas_y_Saldos_Bs', headers, rows);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Ventas Registradas</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-ink-900">{sales.length}</p>
            <span className="text-[11px] text-ink-500">({completed.length} liquidadas)</span>
          </div>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Ingresos Cobrados en Caja (Bs.)</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card p-3.5 border-l-4 border-l-amber-500">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <Clock size={13} className="text-amber-600" />
            Saldos por Cobrar (Deudas en Bs.)
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPendingDebt)}</p>
            <span className="text-[11px] font-semibold text-amber-700">({pendingSales.length} ventas con saldo)</span>
          </div>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Ventas Anuladas</p>
          <p className="text-xl font-bold text-red-500 mt-0.5">{cancelledSales.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por folio, cliente o cajero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto items-center flex-wrap justify-between sm:justify-end">
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value as Sale['documentType'] | 'Todos')}
            className="input text-xs w-auto py-1.5"
          >
            <option value="Todos">Todos los Comprobantes</option>
            <option value="Factura">Facturas</option>
            <option value="Nota de venta">Notas de Venta</option>
          </select>

          {/* Quick status tabs */}
          <div className="flex gap-1 bg-ink-100 p-0.5 rounded-lg">
            <button
              onClick={() => setStatusFilter('Todas')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === 'Todas'
                  ? 'bg-white text-ink-900 shadow-sm font-bold'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Todas ({sales.length})
            </button>
            <button
              onClick={() => setStatusFilter('Pendiente')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                statusFilter === 'Pendiente'
                  ? 'bg-amber-500 text-white shadow-sm font-bold'
                  : 'text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <Clock size={12} />
              Con Saldo Pendiente ({pendingSales.length})
            </button>
            <button
              onClick={() => setStatusFilter('Completada')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === 'Completada'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Liquidadas ({completed.length})
            </button>
            <button
              onClick={() => setStatusFilter('Cancelada')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === 'Cancelada'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Anuladas ({cancelledSales.length})
            </button>
          </div>

          <button
            onClick={handleExportToExcel}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-emerald-700 hover:bg-emerald-50"
            title="Descargar Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel
          </button>
        </div>
      </div>

      {/* Table with Independent Scroll */}
      <div className="card overflow-hidden">
        <div className="max-h-[calc(100vh-17rem)] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-100 sticky top-0 z-10">
              <tr>
                <th className="table-header py-2.5">Folio</th>
                <th className="table-header py-2.5">Comprobante</th>
                <th className="table-header py-2.5">Cliente</th>
                <th className="table-header py-2.5">Cajero</th>
                <th className="table-header py-2.5">Método Pago</th>
                <th className="table-header py-2.5 text-right">Total Venta / Saldo</th>
                <th className="table-header py-2.5">Fecha</th>
                <th className="table-header py-2.5">Estado de Operación</th>
                <th className="table-header py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {paginatedSales.map((s) => {
                const PIcon = paymentIcons[s.paymentMethod] || Banknote;
                const isPending = s.status === 'Pendiente' && (s.pendingBalance !== undefined ? s.pendingBalance > 0 : true);
                const pendingBal = isPending ? (s.pendingBalance ?? (s.total - (s.advanceAmount || 0))) : 0;

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isPending ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-ink-50/50'
                    }`}
                  >
                    <td className="table-cell py-2 font-mono font-bold text-brand-600 text-xs">
                      {s.folio}
                    </td>
                    <td className="table-cell py-2">
                      <Badge color={s.documentType === 'Factura' ? 'blue' : 'purple'}>
                        {s.documentType === 'Factura' ? <FileText size={11} /> : <Receipt size={11} />}
                        {s.documentType}
                      </Badge>
                    </td>
                    <td className="table-cell py-2 font-medium text-ink-800 text-xs">
                      <div>{s.customerName}</div>
                      {s.customerPhone && (
                        <div className="text-[10px] text-ink-400">Tel: {s.customerPhone}</div>
                      )}
                    </td>
                    <td className="table-cell py-2 text-ink-500 text-xs">{s.cashierName}</td>
                    <td className="table-cell py-2">
                      <span className="flex items-center gap-1.5 text-xs text-ink-600">
                        <PIcon size={13} className="text-ink-400" />
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="table-cell py-2 text-right text-xs">
                      <div className="font-bold text-ink-900">{formatCurrency(s.total)}</div>
                      {isPending && (
                        <div className="text-[10px] mt-0.5 space-y-0.5">
                          <div className="text-emerald-700 font-medium">
                            Abonado: {formatCurrency(s.advanceAmount || 0)}
                          </div>
                          <div className="text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded inline-block">
                            Debe Saldo: {formatCurrency(pendingBal)}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="table-cell py-2 text-ink-500 text-[11px]">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="table-cell py-2">
                      <Badge
                        color={
                          s.status === 'Completada' ? 'green' : s.status === 'Cancelada' ? 'red' : 'amber'
                        }
                      >
                        {s.status === 'Pendiente' ? ' Saldo Pendiente de Pago' : s.status === 'Completada' ? ' Liquidada' : ' Anulada'}
                      </Badge>
                    </td>
                    <td className="table-cell py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isPending && (
                          <button
                            onClick={() => openSettleModal(s)}
                            className="btn-primary py-1 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm rounded-lg"
                            title="Cobrar saldo pendiente / amortizar deuda"
                          >
                            <Coins size={13} />
                            Cobrar Saldo
                          </button>
                        )}
                        <button
                          onClick={() => setPrintSale(s)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          title="Imprimir comprobante"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => setDetailSale(s)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </button>
                        {s.status === 'Completada' && (
                          <button
                            onClick={() => setConfirmCancel(s)}
                            className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Cancelar venta"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-ink-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                    No se encontraron ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Settle Debt Modal (Interactive Payment & Simulator in Bolivianos) */}
      <Modal
        open={!!settleSale}
        onClose={() => setSettleSale(null)}
        title={`Cobro de Saldo / Amortización en Bolivianos — Folio ${settleSale?.folio ?? ''}`}
        subtitle="Registro de cobro de saldo pendiente o abono a cuenta en caja"
        size="md"
      >
        {settleSale && (
          <form onSubmit={handleSettleSubmit} className="space-y-4">
            {(() => {
              const currentPending = settleSale.pendingBalance ?? (settleSale.total - (settleSale.advanceAmount || 0));
              const enteredAmount = parseFloat(settleAmount) || 0;
              const projectedRemaining = Math.max(0, currentPending - enteredAmount);
              const paidPercent = Math.min(100, Math.round(((settleSale.advanceAmount || 0) / settleSale.total) * 100));

              return (
                <div className="space-y-4">
                  {/* Summary card with progress bar */}
                  <div className="bg-ink-50 p-4 rounded-xl border border-ink-100 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-ink-400 text-[11px] block">Cliente:</span>
                        <span className="font-bold text-ink-900 text-sm">{settleSale.customerName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-ink-400 text-[11px] block">Fecha de Venta:</span>
                        <span className="text-ink-700 font-medium">{formatDateTime(settleSale.createdAt)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-emerald-700">{paidPercent}% Abonado</span>
                        <span className="text-amber-700">{100 - paidPercent}% Saldo Pendiente</span>
                      </div>
                      <div className="w-full h-2.5 bg-ink-200 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${paidPercent}%` }}
                        />
                        <div
                          className="bg-amber-400 h-full transition-all duration-300"
                          style={{ width: `${100 - paidPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial metrics 3-column grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-ink-200">
                      <div className="bg-white p-2 rounded-lg border border-ink-100 text-center">
                        <p className="text-[10px] text-ink-400 font-medium">Total Venta</p>
                        <p className="text-xs font-bold text-ink-900">{formatCurrency(settleSale.total)}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-ink-100 text-center">
                        <p className="text-[10px] text-emerald-600 font-medium">Total Abonado</p>
                        <p className="text-xs font-bold text-emerald-600">
                          {formatCurrency(settleSale.advanceAmount || (settleSale.total - (settleSale.pendingBalance || 0)))}
                        </p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-center">
                        <p className="text-[10px] text-amber-800 font-semibold">Saldo por Cobrar</p>
                        <p className="text-xs font-bold text-amber-800">{formatCurrency(currentPending)}</p>
                      </div>
                    </div>
                  </div>

                  {settleError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-red-500" />
                      <span>{settleError}</span>
                    </div>
                  )}

                  {/* Payment presets */}
                  <div>
                    <label className="label text-xs font-semibold mb-1.5 block">Opciones Rápidas de Cobro en Bolivianos</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSettleAmount(currentPending.toString());
                          setSettleError('');
                        }}
                        className="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all text-center"
                      >
                        Pagar Todo (100%): Bs. {currentPending.toFixed(2)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettleAmount((currentPending / 2).toFixed(2));
                          setSettleError('');
                        }}
                        className="py-1.5 px-2 rounded-lg bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 text-xs font-bold transition-all text-center"
                      >
                        Abonar 50%: Bs. {(currentPending / 2).toFixed(2)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettleAmount((currentPending / 4).toFixed(2));
                          setSettleError('');
                        }}
                        className="py-1.5 px-2 rounded-lg bg-ink-50 hover:bg-ink-100 border border-ink-200 text-ink-800 text-xs font-bold transition-all text-center"
                      >
                        Abonar 25%: Bs. {(currentPending / 4).toFixed(2)}
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3">
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
                          className="input pl-10 text-base font-bold text-emerald-700"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    {/* Live Simulation feedback */}
                    <div
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        projectedRemaining <= 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="flex justify-between items-center font-semibold">
                        <span>Saldo restante después de este cobro:</span>
                        <span className="text-sm font-bold">{formatCurrency(projectedRemaining)}</span>
                      </div>
                      <p className="text-[11px] mt-1 opacity-90">
                        {projectedRemaining <= 0
                          ? '🎉 ¡Con este pago la deuda quedará 100% saldada y la venta pasará a estado Completada!'
                          : `ℹ️ Se registrará un abono de ${formatCurrency(enteredAmount)} y restará un saldo de ${formatCurrency(projectedRemaining)} exclusivamente en esta venta.`}
                      </p>
                    </div>

                    <div>
                      <label className="label text-xs font-semibold">Método de Pago para el Abono</label>
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

                    <div>
                      <label className="label text-xs font-semibold">Notas / Observaciones de Cobro</label>
                      <input
                        type="text"
                        value={settleNotes}
                        onChange={(e) => setSettleNotes(e.target.value)}
                        placeholder="Ej: Pago de cuota en efectivo en Bolivianos"
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  {/* Previous payments audit */}
                  {settleSale.settlementHistory && settleSale.settlementHistory.length > 0 && (
                    <div className="border-t border-ink-200 pt-3">
                      <p className="text-[11px] font-bold text-ink-700 uppercase mb-1.5">Historial de Abonos Anteriores</p>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                        {settleSale.settlementHistory.map((h, i) => (
                          <div
                            key={i}
                            className="text-[11px] p-2 bg-white rounded-lg border border-ink-100 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-semibold text-ink-800">{formatCurrency(h.amount)}</span>
                              <span className="text-ink-400 text-[10px] ml-2">({h.paymentMethod})</span>
                              {h.notes && <p className="text-[10px] text-ink-500">{h.notes}</p>}
                            </div>
                            <span className="text-[10px] text-ink-400">{formatDateTime(h.date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2 border-t border-ink-100">
                    <button
                      type="button"
                      onClick={() => setSettleSale(null)}
                      className="btn-secondary flex-1 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 py-2"
                    >
                      <CheckCircle2 size={15} />
                      Confirmar Cobro y Registrar en Caja
                    </button>
                  </div>
                </div>
              );
            })()}
          </form>
        )}
      </Modal>

      {/* Print modal */}
      <Modal
        open={!!printSale}
        onClose={() => setPrintSale(null)}
        title="Impresión de Comprobante"
        size="md"
      >
        {printSale && <ReceiptPrint sale={printSale} onClose={() => setPrintSale(null)} />}
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!detailSale}
        onClose={() => setDetailSale(null)}
        title={`Venta ${detailSale?.folio ?? ''}`}
        subtitle={detailSale ? formatDateTime(detailSale.createdAt) : ''}
        size="lg"
      >
        {detailSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-ink-50">
                <p className="text-[11px] text-ink-400 mb-0.5">Comprobante</p>
                <Badge color="blue">{detailSale.documentType}</Badge>
              </div>
              <div className="p-2.5 rounded-lg bg-ink-50">
                <p className="text-[11px] text-ink-400 mb-0.5">Cliente</p>
                <p className="text-xs font-bold text-ink-800 truncate">{detailSale.customerName}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-ink-50">
                <p className="text-[11px] text-ink-400 mb-0.5">Método de Pago</p>
                <p className="text-xs font-semibold text-ink-800">{detailSale.paymentMethod}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-ink-50">
                <p className="text-[11px] text-ink-400 mb-0.5">Estado</p>
                <Badge
                  color={
                    detailSale.status === 'Completada'
                      ? 'green'
                      : detailSale.status === 'Cancelada'
                      ? 'red'
                      : 'amber'
                  }
                >
                  {detailSale.status === 'Pendiente' ? ' Pendiente de Pago' : detailSale.status}
                </Badge>
              </div>
            </div>

            {/* Advance / Settlement status banner if applicable */}
            {(detailSale.isAdvance || (detailSale.pendingBalance !== undefined && detailSale.pendingBalance > 0) || detailSale.settledAt) && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                <div className="flex justify-between items-center font-bold text-amber-900">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-amber-600" />
                    Estado de Reserva y Saldos
                  </span>
                  <span>
                    {detailSale.status === 'Pendiente' ? ' Saldo Pendiente de Cobro' : ' Venta Liquidada Totalmente'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-ink-400 text-[10px]">Total de la Operación:</span>
                    <p className="font-bold text-ink-900">{formatCurrency(detailSale.total)}</p>
                  </div>
                  <div>
                    <span className="text-ink-400 text-[10px]">Anticipo / Abonos:</span>
                    <p className="font-bold text-emerald-600">{formatCurrency(detailSale.advanceAmount || 0)}</p>
                  </div>
                  <div>
                    <span className="text-ink-400 text-[10px]">Saldo por Cobrar:</span>
                    <p className="font-bold text-amber-700">{formatCurrency(detailSale.pendingBalance || 0)}</p>
                  </div>
                </div>
                {detailSale.settledAt && (
                  <div className="pt-1 text-[11px] text-ink-600 border-t border-amber-200/60 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>
                      Última liquidación el {formatDateTime(detailSale.settledAt)} ({detailSale.settlementPaymentMethod || 'Efectivo'})
                      {detailSale.settlementNotes ? ` - Nota: ${detailSale.settlementNotes}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-ink-700 mb-2 uppercase">Artículos Vendidos</h4>
              <div className="rounded-lg border border-ink-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-ink-50">
                    <tr>
                      <th className="table-header py-2">Producto</th>
                      <th className="table-header py-2 text-right">Precio Unit.</th>
                      <th className="table-header py-2 text-center">Cant.</th>
                      <th className="table-header py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {detailSale.items.map((item, i) => (
                      <tr key={i}>
                        <td className="table-cell py-2">
                          <p className="font-semibold text-ink-800">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-ink-400 font-mono">
                            <span>SKU: {item.sku}</span>
                            {item.serialNumber && (
                              <span className="text-purple-700 font-bold bg-purple-50 px-1 py-0.2 rounded">
                                SN: {item.serialNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell py-2 text-right">{formatCurrency(item.price)}</td>
                        <td className="table-cell py-2 text-center font-bold">{item.quantity}</td>
                        <td className="table-cell py-2 text-right font-semibold">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-ink-100">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const s = detailSale;
                    setDetailSale(null);
                    setPrintSale(s);
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-brand-600"
                >
                  <Printer size={14} /> Imprimir Comprobante
                </button>
                {detailSale.status === 'Pendiente' && (
                  <button
                    onClick={() => {
                      const s = detailSale;
                      setDetailSale(null);
                      openSettleModal(s);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Coins size={14} /> Cobrar Saldo Ahora
                  </button>
                )}
              </div>

              <div className="w-48 space-y-1 text-xs">
                <div className="flex justify-between text-ink-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(detailSale.subtotal)}</span>
                </div>
                {detailSale.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(detailSale.discount)}</span>
                  </div>
                )}
                {detailSale.documentType === 'Factura' && (
                  <div className="flex justify-between text-brand-700">
                    <span>IVA (13%):</span>
                    <span>{formatCurrency(detailSale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-ink-200 font-bold text-ink-900">
                  <span>Total:</span>
                  <span className="text-brand-600 text-sm">{formatCurrency(detailSale.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel confirm */}
      <Modal
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title="Cancelar Venta"
        size="sm"
      >
        <p className="text-sm text-ink-600">
          ¿Seguro que deseas cancelar la venta <strong>{confirmCancel?.folio}</strong>? El stock y los números de serie serán restaurados automáticamente.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setConfirmCancel(null)} className="btn-secondary flex-1 text-xs">
            No, mantener
          </button>
          <button
            onClick={() => {
              if (confirmCancel) cancelSale(confirmCancel.id);
              setConfirmCancel(null);
            }}
            className="btn-danger flex-1 text-xs"
          >
            <Ban size={15} />
            Sí, cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
