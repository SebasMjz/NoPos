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
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { ReceiptPrint } from '../components/ReceiptPrint';
import { exportToExcel } from '../utils/exportExcel';
import { Pagination } from '../components/Pagination';
import type { Sale } from '../types';

const paymentIcons: Record<Sale['paymentMethod'], typeof Banknote> = {
  Efectivo: Banknote,
  Tarjeta: CreditCard,
  Transferencia: Building2,
  Crédito: Clock,
};

export function SalesView() {
  const { sales, cancelSale } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Sale['status'] | 'Todas'>('Todas');
  const [docFilter, setDocFilter] = useState<Sale['documentType'] | 'Todos'>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Sale | null>(null);

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
  const totalRevenue = completed.reduce((s, sa) => s + sa.total, 0);
  const cancelledCount = sales.filter((s) => s.status === 'Cancelada').length;

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
      'Total Pagado (Bs.)',
      'Estado',
      'Fecha',
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
      s.status,
      s.createdAt,
      s.items.map((i) => `${i.quantity}x ${i.name} (SN: ${i.serialNumber || 'N/A'})`).join('; '),
    ]);

    exportToExcel('Registro_Ventas', headers, rows);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Ventas</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{sales.length}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Ingresos Totales</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Ticket Promedio</p>
          <p className="text-xl font-bold text-brand-600 mt-0.5">
            {formatCurrency(completed.length > 0 ? totalRevenue / completed.length : 0)}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Canceladas</p>
          <p className="text-xl font-bold text-red-500 mt-0.5">{cancelledCount}</p>
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

          <div className="flex gap-1">
            {(['Todas', 'Completada', 'Cancelada'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
                }`}
              >
                {st}
              </button>
            ))}
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
                <th className="table-header py-2.5">Tipo Comprobante</th>
                <th className="table-header py-2.5">Cliente</th>
                <th className="table-header py-2.5">Cajero</th>
                <th className="table-header py-2.5">Método Pago</th>
                <th className="table-header py-2.5 text-right">Total</th>
                <th className="table-header py-2.5">Fecha</th>
                <th className="table-header py-2.5">Estado</th>
                <th className="table-header py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {paginatedSales.map((s) => {
                const PIcon = paymentIcons[s.paymentMethod];
                return (
                  <tr key={s.id} className="hover:bg-ink-50/50 transition-colors">
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
                      {s.customerName}
                    </td>
                    <td className="table-cell py-2 text-ink-500 text-xs">{s.cashierName}</td>
                    <td className="table-cell py-2">
                      <span className="flex items-center gap-1.5 text-xs text-ink-600">
                        <PIcon size={13} className="text-ink-400" />
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="table-cell py-2 text-right font-bold text-ink-900 text-xs">
                      {formatCurrency(s.total)}
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
                        {s.status}
                      </Badge>
                    </td>
                    <td className="table-cell py-2">
                      <div className="flex items-center justify-end gap-1">
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
                    No se encontraron ventas
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
                <Badge color={detailSale.status === 'Completada' ? 'green' : 'red'}>
                  {detailSale.status}
                </Badge>
              </div>
            </div>

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
