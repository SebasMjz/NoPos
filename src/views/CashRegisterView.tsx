import { useState, useMemo } from 'react';
import {
  Wallet,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  History,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Eye,
  DollarSign,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Building2,
  Banknote,
  QrCode,
  Search,
  Printer,
  Sliders,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { exportToExcel } from '../utils/exportExcel';
import { CashClosingPrint } from '../components/CashClosingPrint';
import type { CashRegisterSession, Sale } from '../types';

export function CashRegisterView() {
  const {
    activeRegisterSession,
    registerHistory,
    paymentMethodsList,
    addPaymentMethod,
    deletePaymentMethod,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
  } = useStore();

  // Modals
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [openAmount, setOpenAmount] = useState('500');
  const [openNotes, setOpenNotes] = useState('');

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Complete Arqueo / Shift Closure Modal with ALL payment methods confirmed
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState('');
  const [confirmedCardInput, setConfirmedCardInput] = useState('');
  const [confirmedTransferInput, setConfirmedTransferInput] = useState('');
  const [confirmedOtherInput, setConfirmedOtherInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Print Closing Ticket Modal
  const [printSession, setPrintSession] = useState<CashRegisterSession | null>(null);

  // Detailed Transaction Inspection Modal
  const [inspectingSession, setInspectingSession] = useState<CashRegisterSession | null>(null);
  const [inspectTab, setInspectTab] = useState<'sales' | 'cashMovements'>('sales');
  const [historySearch, setHistorySearch] = useState('');

  // Payment Methods Manager Modal
  const [paymentMethodsModalOpen, setPaymentMethodsModalOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(openAmount) || 0;
    openCashRegister(amount, openNotes);
    setOpenModalOpen(false);
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(movementAmount);
    if (isNaN(amount) || amount <= 0) return;
    addCashMovement(movementType, amount, movementReason);
    setMovementModalOpen(false);
    setMovementAmount('');
    setMovementReason('');
  };

  const openCloseArqueoModal = () => {
    if (!activeRegisterSession) return;
    setCountedCashInput('');
    setConfirmedCardInput(String(activeRegisterSession.cardSales));
    setConfirmedTransferInput(String(activeRegisterSession.transferSales));
    setConfirmedOtherInput(String(activeRegisterSession.otherSales));
    setClosingNotes('');
    setCloseModalOpen(true);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = Number(countedCashInput);
    if (isNaN(counted) || counted < 0) return;

    closeCashRegister({
      actualCash: counted,
      confirmedCardSales: Number(confirmedCardInput) || activeRegisterSession?.cardSales || 0,
      confirmedTransferSales:
        Number(confirmedTransferInput) || activeRegisterSession?.transferSales || 0,
      confirmedOtherSales: Number(confirmedOtherInput) || activeRegisterSession?.otherSales || 0,
      notes: closingNotes,
    });

    setCloseModalOpen(false);
  };

  const expectedCash = activeRegisterSession?.expectedCash ?? 0;
  const countedCash = countedCashInput === '' ? NaN : Number(countedCashInput);
  const closingDifference = isNaN(countedCash) ? 0 : countedCash - expectedCash;

  // Filter history
  const filteredHistory = useMemo(() => {
    return registerHistory.filter((s) => {
      const matchText =
        s.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.cashierName.toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.notes ?? '').toLowerCase().includes(historySearch.toLowerCase());
      return matchText;
    });
  }, [registerHistory, historySearch]);

  const handleAddMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    addPaymentMethod(newMethodName.trim());
    setNewMethodName('');
  };

  // Export History to Excel
  const handleExportHistoryToExcel = () => {
    const headers = [
      'ID Turno',
      'Cajero',
      'Apertura',
      'Cierre',
      'Monto Inicial (Bs.)',
      'Ventas Efectivo (Bs.)',
      'Ventas Tarjeta (Bs.)',
      'Ventas QR (Bs.)',
      'Ventas Otros (Bs.)',
      'Ingresos Manuales (Bs.)',
      'Egresos / Gastos (Bs.)',
      'Efectivo Esperado (Bs.)',
      'Conteo Físico Real (Bs.)',
      'Diferencia (Bs.)',
      'Notas / Observaciones',
    ];

    const rows = registerHistory.map((s) => [
      s.id,
      s.cashierName,
      s.openedAt,
      s.closedAt ?? 'En curso',
      s.openingAmount,
      s.cashSales,
      s.cardSales,
      s.transferSales,
      s.otherSales,
      s.cashIn,
      s.cashOut,
      s.expectedCash,
      s.actualCash ?? 'N/A',
      s.difference ?? 0,
      s.notes ?? '',
    ]);

    exportToExcel('Reporte_Historico_Cajas', headers, rows);
  };

  const handleExportSessionTransactionsToExcel = (session: CashRegisterSession) => {
    const headers = [
      'ID Sesión',
      'Tipo de Operación',
      'Folio / Referencia',
      'Detalle / Concepto',
      'Método de Pago',
      'Monto (Bs.)',
      'Fecha y Hora',
    ];

    const rows: (string | number)[][] = [];

    session.salesList?.forEach((sale) => {
      rows.push([
        session.id,
        `Venta (${sale.documentType})`,
        sale.folio,
        `Cliente: ${sale.customerName} (${sale.items.length} artículos)`,
        sale.paymentMethod,
        sale.total,
        sale.createdAt,
      ]);
    });

    session.cashMovements.forEach((cm) => {
      rows.push([
        session.id,
        cm.type === 'ingreso' ? 'Ingreso Manual' : 'Egreso de Caja',
        cm.id,
        cm.reason,
        'Efectivo',
        cm.type === 'ingreso' ? cm.amount : -cm.amount,
        cm.createdAt,
      ]);
    });

    exportToExcel(`Transacciones_Caja_${session.id}`, headers, rows);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Active Cash Register Shift Header */}
      {activeRegisterSession?.status === 'open' ? (
        <div className="card p-5 border-l-4 border-l-emerald-500 space-y-4 bg-white shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-ink-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-ink-900">
                  Turno de Caja Activo: {activeRegisterSession.id}
                </h3>
                <Badge color="green">Caja Abierta</Badge>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Cajero: <strong>{activeRegisterSession.cashierName}</strong> • Abierto el{' '}
                {formatDateTime(activeRegisterSession.openedAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPaymentMethodsModalOpen(true)}
                className="btn-secondary text-xs py-1.5 px-3 text-ink-700 hover:bg-ink-50 font-bold"
              >
                <Sliders size={14} className="text-brand-600" />
                Métodos de Pago
              </button>
              <button
                onClick={() => {
                  setMovementType('ingreso');
                  setMovementModalOpen(true);
                }}
                className="btn-secondary text-xs py-1.5 px-3 text-emerald-700 hover:bg-emerald-50 font-bold"
              >
                <TrendingUp size={14} className="text-emerald-600" />
                + Ingreso Dinero
              </button>
              <button
                onClick={() => {
                  setMovementType('egreso');
                  setMovementModalOpen(true);
                }}
                className="btn-secondary text-xs py-1.5 px-3 text-red-700 hover:bg-red-50 font-bold"
              >
                <TrendingDown size={14} className="text-red-600" />
                - Egreso / Gasto
              </button>
              <button
                onClick={() => setInspectingSession(activeRegisterSession)}
                className="btn-secondary text-xs py-1.5 px-3 text-brand-700 hover:bg-brand-50 font-bold"
              >
                <Eye size={14} /> Ver Transacciones
              </button>
              <button
                onClick={openCloseArqueoModal}
                className="btn-primary text-xs py-1.5 px-3 bg-ink-900 hover:bg-ink-800 font-bold shadow-sm"
              >
                <Lock size={14} /> Realizar Arqueo & Cierre
              </button>
            </div>
          </div>

          {/* Breakdown Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl bg-ink-50 border border-ink-100">
              <span className="text-[10px] text-ink-500 font-bold uppercase">Monto Inicial</span>
              <p className="text-base font-bold text-ink-900 mt-0.5">
                {formatCurrency(activeRegisterSession.openingAmount)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold uppercase">Ventas Efectivo</span>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                +{formatCurrency(activeRegisterSession.cashSales)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] text-blue-700 font-bold uppercase">Tarjeta / POS</span>
              <p className="text-base font-bold text-blue-700 mt-0.5">
                {formatCurrency(activeRegisterSession.cardSales)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
              <span className="text-[10px] text-purple-700 font-bold uppercase">Transferencias QR</span>
              <p className="text-base font-bold text-purple-700 mt-0.5">
                {formatCurrency(activeRegisterSession.transferSales)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Ingresos Manuales</span>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                +{formatCurrency(activeRegisterSession.cashIn)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
              <span className="text-[10px] text-red-600 font-bold uppercase">Egresos / Gastos</span>
              <p className="text-base font-bold text-red-600 mt-0.5">
                -{formatCurrency(activeRegisterSession.cashOut)}
              </p>
            </div>
          </div>

          {/* Big Expected Drawer Total Banner */}
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-brand-800 font-bold uppercase tracking-wide">
                Efectivo Físico Calculado en Gaveta:
              </span>
              <p className="text-[11px] text-brand-600 mt-0.5">
                (Fondo Inicial + Ventas Efectivo + Ingresos Manuales - Egresos de Caja)
              </p>
            </div>
            <span className="text-2xl font-extrabold text-brand-700">
              {formatCurrency(activeRegisterSession.expectedCash)}
            </span>
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center space-y-3 bg-amber-50/50 border-amber-200">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
            <Lock size={24} />
          </div>
          <h3 className="text-base font-bold text-ink-900">No hay ninguna Caja Abierta en este momento</h3>
          <p className="text-xs text-ink-600 max-w-md mx-auto">
            Abre un nuevo turno de caja indicando el monto inicial de cambio para habilitar cobros en el
            POS.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPaymentMethodsModalOpen(true)}
              className="btn-secondary text-xs py-2 px-3 font-bold"
            >
              <Sliders size={14} /> Métodos de Pago
            </button>
            <button
              onClick={() => setOpenModalOpen(true)}
              className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 font-bold inline-flex items-center gap-2 shadow-sm"
            >
              <Unlock size={14} /> Abrir Turno de Caja
            </button>
          </div>
        </div>
      )}

      {/* Main Historical Table & Inspection Section */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-ink-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-ink-50/50">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-600" />
            <h4 className="text-sm font-bold text-ink-900">
              Historial Completo de Cajas & Arqueos de Turno
            </h4>
            <span className="badge bg-ink-200 text-ink-700 text-xs font-bold">
              {registerHistory.length} turnos concluidos
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Buscar por ID, cajero, notas..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="input pl-8 py-1.5 text-xs"
              />
            </div>
            <button
              onClick={handleExportHistoryToExcel}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-emerald-700 hover:bg-emerald-50 shrink-0"
              title="Descargar Excel"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Scrollable History Table */}
        <div className="max-h-[calc(100vh-23rem)] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-100 sticky top-0 z-10">
              <tr>
                <th className="table-header py-2.5">Turno / ID</th>
                <th className="table-header py-2.5">Cajero</th>
                <th className="table-header py-2.5">Apertura & Cierre</th>
                <th className="table-header py-2.5 text-right">Inicial</th>
                <th className="table-header py-2.5 text-right">Ventas Totales</th>
                <th className="table-header py-2.5 text-right">Esperado</th>
                <th className="table-header py-2.5 text-right">Conteo Físico</th>
                <th className="table-header py-2.5 text-center">Diferencia</th>
                <th className="table-header py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filteredHistory.map((shift) => (
                <tr key={shift.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="table-cell py-2.5 font-mono font-bold text-brand-600 text-xs">
                    {shift.id}
                  </td>
                  <td className="table-cell py-2.5 font-semibold text-ink-800 text-xs">
                    {shift.cashierName}
                  </td>
                  <td className="table-cell py-2.5 text-xs text-ink-500">
                    <p className="text-ink-700">{formatDateTime(shift.openedAt)}</p>
                    <p className="text-[10px] text-ink-400">
                      Cierre: {shift.closedAt ? formatDateTime(shift.closedAt) : 'En curso'}
                    </p>
                  </td>
                  <td className="table-cell py-2.5 text-right text-xs font-medium text-ink-700">
                    {formatCurrency(shift.openingAmount)}
                  </td>
                  <td className="table-cell py-2.5 text-right text-xs font-bold text-emerald-700">
                    {formatCurrency(shift.cashSales + shift.cardSales + shift.transferSales + shift.otherSales)}
                  </td>
                  <td className="table-cell py-2.5 text-right text-xs font-bold text-ink-800">
                    {formatCurrency(shift.expectedCash)}
                  </td>
                  <td className="table-cell py-2.5 text-right text-xs font-extrabold text-ink-900">
                    {formatCurrency(shift.actualCash ?? 0)}
                  </td>
                  <td className="table-cell py-2.5 text-center">
                    <Badge
                      color={
                        shift.difference === 0
                          ? 'green'
                          : (shift.difference ?? 0) > 0
                            ? 'blue'
                            : 'red'
                      }
                    >
                      {shift.difference === 0
                        ? '0.00'
                        : (shift.difference ?? 0) > 0
                          ? `+${formatCurrency(shift.difference ?? 0)}`
                          : formatCurrency(shift.difference ?? 0)}
                    </Badge>
                  </td>
                  <td className="table-cell py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setPrintSession(shift)}
                        className="p-1.5 rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-600"
                        title="Imprimir Acta de Arqueo"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        onClick={() => setInspectingSession(shift)}
                        className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 text-brand-600 hover:bg-brand-50 font-bold"
                      >
                        <Eye size={13} />
                        Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-ink-400">
                    <History size={32} className="mx-auto mb-2 opacity-30" />
                    No hay registros de cajas coincidentes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arqueo Print Ticket Modal */}
      <Modal
        open={!!printSession}
        onClose={() => setPrintSession(null)}
        title="Acta Oficial de Cierre y Arqueo"
        size="md"
      >
        {printSession && (
          <CashClosingPrint session={printSession} onClose={() => setPrintSession(null)} />
        )}
      </Modal>

      {/* Detailed Shift Transaction Inspector Modal */}
      <Modal
        open={!!inspectingSession}
        onClose={() => setInspectingSession(null)}
        title={`Detalle Minucioso de Transacciones - Turno ${inspectingSession?.id}`}
        subtitle={`Responsable: ${inspectingSession?.cashierName} • Apertura: ${
          inspectingSession ? formatDateTime(inspectingSession.openedAt) : ''
        }`}
        size="lg"
      >
        {inspectingSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-ink-50 border border-ink-100 text-xs">
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-bold">Fondo Inicial</span>
                <span className="font-bold text-ink-900">
                  {formatCurrency(inspectingSession.openingAmount)}
                </span>
              </div>
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-bold">Ventas Totales</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(
                    inspectingSession.cashSales +
                      inspectingSession.cardSales +
                      inspectingSession.transferSales +
                      inspectingSession.otherSales,
                  )}
                </span>
              </div>
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-bold">Efectivo Real</span>
                <span className="font-bold text-ink-900">
                  {formatCurrency(inspectingSession.actualCash ?? inspectingSession.expectedCash)}
                </span>
              </div>
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-bold">Resultado</span>
                <Badge
                  color={
                    inspectingSession.difference === 0
                      ? 'green'
                      : (inspectingSession.difference ?? 0) > 0
                        ? 'blue'
                        : 'red'
                  }
                >
                  {inspectingSession.difference === 0
                    ? 'Cuadrado'
                    : (inspectingSession.difference ?? 0) > 0
                      ? `+${formatCurrency(inspectingSession.difference ?? 0)}`
                      : formatCurrency(inspectingSession.difference ?? 0)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-ink-200">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInspectTab('sales')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                    inspectTab === 'sales'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Receipt size={14} />
                  Ventas Registradas ({inspectingSession.salesList?.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTab('cashMovements')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                    inspectTab === 'cashMovements'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Wallet size={14} />
                  Ingresos & Egresos de Caja ({inspectingSession.cashMovements.length})
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const s = inspectingSession;
                    setInspectingSession(null);
                    setPrintSession(s);
                  }}
                  className="btn-secondary text-[11px] py-1 px-2 font-bold text-brand-600"
                >
                  <Printer size={13} /> Imprimir Acta
                </button>
                <button
                  onClick={() => handleExportSessionTransactionsToExcel(inspectingSession)}
                  className="btn-secondary text-[11px] py-1 px-2 text-emerald-700 hover:bg-emerald-50 font-bold"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  Excel Turno
                </button>
              </div>
            </div>

            {inspectTab === 'sales' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {inspectingSession.salesList && inspectingSession.salesList.length > 0 ? (
                  inspectingSession.salesList.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 rounded-lg bg-ink-50 border border-ink-100 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand-600">{sale.folio}</span>
                          <Badge color="blue">{sale.documentType}</Badge>
                          <span className="font-semibold text-ink-800">{sale.customerName}</span>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {formatCurrency(sale.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 border-t border-ink-200/60">
                        <span>Método: {sale.paymentMethod}</span>
                        <span>{formatDateTime(sale.createdAt)}</span>
                      </div>
                      <div className="text-[11px] text-ink-600 pl-1 border-l-2 border-brand-300">
                        {sale.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              • {i.quantity}x {i.name}
                              {i.serialNumber && (
                                <span className="text-purple-700 font-mono ml-1 font-bold">
                                  [SN: {i.serialNumber}]
                                </span>
                              )}
                            </span>
                            <span>{formatCurrency(i.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink-400 text-center py-8">
                    No se han registrado ventas en este turno
                  </p>
                )}
              </div>
            )}

            {inspectTab === 'cashMovements' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {inspectingSession.cashMovements.length > 0 ? (
                  inspectingSession.cashMovements.map((cm) => (
                    <div
                      key={cm.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        cm.type === 'ingreso'
                          ? 'bg-emerald-50/60 border-emerald-100'
                          : 'bg-red-50/60 border-red-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge color={cm.type === 'ingreso' ? 'green' : 'red'}>
                            {cm.type === 'ingreso' ? '+' : '-'} {cm.type.toUpperCase()}
                          </Badge>
                          <span className="font-bold text-ink-900">{cm.reason}</span>
                        </div>
                        <p className="text-[10px] text-ink-400 mt-0.5">
                          {cm.cashierName} • {formatDateTime(cm.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          cm.type === 'ingreso' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {cm.type === 'ingreso' ? '+' : '-'}
                        {formatCurrency(cm.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink-400 text-center py-8">
                    No hay ingresos o egresos de caja registrados en este turno
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-ink-100">
              <button
                type="button"
                onClick={() => setInspectingSession(null)}
                className="btn-secondary text-xs"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Open Cash Register */}
      <Modal
        open={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Apertura de Turno de Caja"
        subtitle="Ingresa el fondo de cambio para comenzar a operar"
        size="sm"
      >
        <form onSubmit={handleOpenSubmit} className="space-y-4">
          <div>
            <label className="label text-xs">Monto Inicial en Efectivo (Bs.) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-400 text-sm">
                Bs.
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={openAmount}
                onChange={(e) => setOpenAmount(e.target.value)}
                className="input pl-10 text-base font-bold text-ink-900"
                placeholder="500.00"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Observaciones</label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              className="input text-xs"
              placeholder="Ej. Billetes de 20 y 50 para cambio..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModalOpen(false)}
              className="btn-secondary flex-1 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              <Unlock size={14} /> Iniciar Turno
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cash In / Out */}
      <Modal
        open={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={movementType === 'ingreso' ? 'Registrar Ingreso de Efectivo (+)' : 'Registrar Egreso / Retiro (-)'}
        subtitle="Movimiento manual de dinero en la caja activa"
        size="sm"
      >
        <form onSubmit={handleMovementSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMovementType('ingreso')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                movementType === 'ingreso'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-ink-200 text-ink-600'
              }`}
            >
              <TrendingUp size={14} /> + Ingreso
            </button>
            <button
              type="button"
              onClick={() => setMovementType('egreso')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                movementType === 'egreso'
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'bg-white border-ink-200 text-ink-600'
              }`}
            >
              <TrendingDown size={14} /> - Egreso
            </button>
          </div>

          <div>
            <label className="label text-xs">Monto en Efectivo (Bs.) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-400 text-sm">
                Bs.
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="input pl-10 text-base font-bold text-ink-900"
                placeholder="100.00"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Motivo / Justificación *</label>
            <input
              type="text"
              required
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              className="input text-xs"
              placeholder={
                movementType === 'ingreso'
                  ? 'Ej. Sencillo adicional para caja'
                  : 'Ej. Pago a mensajería / delivery'
              }
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMovementModalOpen(false)}
              className="btn-secondary flex-1 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`btn-primary flex-1 text-xs font-bold ${
                movementType === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <CheckCircle2 size={14} /> Registrar
            </button>
          </div>
        </form>
      </Modal>

      {/* Comprehensive Arqueo & Closure with ALL payment methods verification */}
      <Modal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Arqueo Integral y Cierre de Turno"
        subtitle="Verificación y confirmación de todos los métodos de pago recibidos"
        size="md"
      >
        <form onSubmit={handleCloseSubmit} className="space-y-4">
          {/* Method 1: Cash */}
          <div className="p-3 rounded-xl bg-ink-50 border border-ink-100 space-y-2">
            <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
              <Banknote size={15} className="text-emerald-600" />
              1. Conteo Físico de Efectivo en Gaveta (Bs.)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-ink-500 block">Efectivo Esperado:</span>
                <span className="font-bold text-ink-900 text-sm">{formatCurrency(expectedCash)}</span>
              </div>
              <div>
                <span className="text-ink-500 block font-bold">Conteo Real en Caja:</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  className="input text-xs font-bold py-1 text-ink-900 bg-white"
                />
              </div>
            </div>

            {!isNaN(countedCash) && (
              <div
                className={`p-2 rounded-lg text-xs font-bold flex justify-between ${
                  closingDifference === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : closingDifference > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                <span>Diferencia Efectivo:</span>
                <span>
                  {closingDifference === 0
                    ? '0.00 (Cuadre Exacto)'
                    : closingDifference > 0
                      ? `+${formatCurrency(closingDifference)} (Sobrante)`
                      : `${formatCurrency(closingDifference)} (Faltante)`}
                </span>
              </div>
            )}
          </div>

          {/* Method 2: POS Vouchers & QR Verification */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1 text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <CreditCard size={13} /> 2. Vouchers Tarjeta
              </span>
              <p className="text-[10px] text-ink-500">
                Registrado: {formatCurrency(activeRegisterSession?.cardSales ?? 0)}
              </p>
              <input
                type="number"
                step="0.01"
                placeholder="Confirmado Bs."
                value={confirmedCardInput}
                onChange={(e) => setConfirmedCardInput(e.target.value)}
                className="input text-xs py-1 bg-white font-bold text-blue-800"
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1 text-xs">
              <span className="font-bold text-purple-900 flex items-center gap-1">
                <QrCode size={13} /> 3. Transferencias QR
              </span>
              <p className="text-[10px] text-ink-500">
                Registrado: {formatCurrency(activeRegisterSession?.transferSales ?? 0)}
              </p>
              <input
                type="number"
                step="0.01"
                placeholder="Confirmado Bs."
                value={confirmedTransferInput}
                onChange={(e) => setConfirmedTransferInput(e.target.value)}
                className="input text-xs py-1 bg-white font-bold text-purple-800"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Observaciones Finales de Cierre</label>
            <input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="input text-xs"
              placeholder="Ej. Cierre de turno verificado y cuadrado..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCloseModalOpen(false)}
              className="btn-secondary flex-1 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs font-bold bg-ink-900 hover:bg-ink-800"
            >
              <Lock size={14} /> Confirmar Cierre Oficial
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Methods Management Modal */}
      <Modal
        open={paymentMethodsModalOpen}
        onClose={() => setPaymentMethodsModalOpen(false)}
        title="Gestión de Métodos de Pago"
        subtitle="Agrega formas de pago personalizadas (ej. Tigo Money, Cheque, Dólares)"
        size="sm"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddMethodSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Nuevo método de pago..."
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              className="input text-xs"
            />
            <button type="submit" className="btn-primary text-xs px-3 font-bold shrink-0">
              <Plus size={14} /> Añadir
            </button>
          </form>

          <div className="divide-y divide-ink-100 max-h-48 overflow-y-auto border border-ink-200 rounded-xl p-2 bg-ink-50/50 custom-scrollbar text-xs">
            {paymentMethodsList.map((m) => (
              <div key={m} className="flex items-center justify-between py-2 px-1">
                <span className="font-semibold text-ink-900">{m}</span>
                {!['Efectivo', 'Tarjeta', 'Transferencia', 'Pago Mixto'].includes(m) && (
                  <button
                    type="button"
                    onClick={() => deletePaymentMethod(m)}
                    className="p-1 text-ink-400 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setPaymentMethodsModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
