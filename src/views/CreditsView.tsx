import { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  Truck,
  FileText,
  Building2,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { SearchableSelect, type SearchableOption } from '../components/SearchableSelect';
import { Pagination } from '../components/Pagination';
import { posSound } from '../utils/sound';
import type { CreditAccount } from '../types';

export function CreditsView() {
  const {
    creditAccounts,
    customers,
    suppliers,
    paymentMethodsList,
    addCreditAccount,
    addCreditPayment,
    deleteCreditAccount,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'cobrar' | 'pagar'>('cobrar');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CreditAccount['status'] | 'Todos'>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [newCreditModalOpen, setNewCreditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditAccount | null>(null);

  // New Credit Form
  const [entityId, setEntityId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [documentRef, setDocumentRef] = useState('');
  const [creditNotes, setCreditNotes] = useState('');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethodsList[0] || 'Efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Filtered list
  const tabCredits = useMemo(() => {
    return creditAccounts.filter((c) => c.type === activeTab);
  }, [creditAccounts, activeTab]);

  const filteredCredits = useMemo(() => {
    return tabCredits.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        c.folio.toLowerCase().includes(q) ||
        c.entityName.toLowerCase().includes(q) ||
        (c.relatedDocumentFolio && c.relatedDocumentFolio.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'Todos' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tabCredits, search, statusFilter]);

  const paginatedCredits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCredits.slice(start, start + pageSize);
  }, [filteredCredits, currentPage, pageSize]);

  // Calculations
  const totalPending = tabCredits.reduce((s, c) => s + c.remainingAmount, 0);
  const totalPaid = tabCredits.reduce((s, c) => s + c.paidAmount, 0);
  const overdueCount = tabCredits.filter(
    (c) => c.status === 'vigente' && new Date(c.dueDate) < new Date(),
  ).length;

  // Options for entity selector
  const customerOptions: SearchableOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: `Tel: ${c.phone} | ${c.company || 'Particular'}`,
    }));
  }, [customers]);

  const supplierOptions: SearchableOption[] = useMemo(() => {
    return suppliers.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: `${s.city} - Tel: ${s.phone}`,
    }));
  }, [suppliers]);

  const handleOpenNewCredit = () => {
    setEntityId('');
    setTotalAmount('');
    setDocumentRef('');
    setCreditNotes('');
    setNewCreditModalOpen(true);
  };

  const handleSaveNewCredit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(totalAmount);
    if (!entityId || isNaN(amount) || amount <= 0) {
      alert('Por favor selecciona una entidad y especifica un monto válido.');
      return;
    }

    const entityName =
      activeTab === 'cobrar'
        ? customers.find((c) => c.id === entityId)?.name || 'Cliente'
        : suppliers.find((s) => s.id === entityId)?.name || 'Proveedor';

    const entityPhone =
      activeTab === 'cobrar'
        ? customers.find((c) => c.id === entityId)?.phone
        : suppliers.find((s) => s.id === entityId)?.phone;

    addCreditAccount({
      type: activeTab,
      entityId,
      entityName,
      entityPhone,
      totalAmount: amount,
      dueDate: `${dueDate}T23:59:59`,
      relatedDocumentFolio: documentRef.trim() || undefined,
      notes: creditNotes.trim() || undefined,
    });

    posSound.playSuccessChime();
    setNewCreditModalOpen(false);
  };

  const handleOpenPayment = (credit: CreditAccount) => {
    setSelectedCredit(credit);
    setPaymentAmount(String(credit.remainingAmount));
    setPaymentMethod(paymentMethodsList[0] || 'Efectivo');
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedCredit.remainingAmount) {
      alert(`El monto debe estar entre Bs. 1 y Bs. ${selectedCredit.remainingAmount}`);
      return;
    }

    addCreditPayment(selectedCredit.id, {
      amount,
      method: paymentMethod,
      reference: paymentRef.trim() || undefined,
      cashierName: 'Admin Principal',
      notes: paymentNotes.trim() || undefined,
    });

    posSound.playSuccessChime();
    setPaymentModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Top Nav Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-ink-200 pb-3">
        <div className="flex bg-ink-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('cobrar');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cobrar'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <ArrowDownLeft size={14} className="text-emerald-500" />
            Cuentas por Cobrar (Clientes)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pagar');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pagar'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <ArrowUpRight size={14} className="text-purple-600" />
            Cuentas por Pagar (Proveedores)
          </button>
        </div>

        <button
          onClick={handleOpenNewCredit}
          className="btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
        >
          <Plus size={15} />
          {activeTab === 'cobrar' ? 'Otorgar Nuevo Crédito' : 'Registrar Deuda / Compra a Crédito'}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Cuentas</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{tabCredits.length}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign size={14} className="text-red-500" />
            <span className="text-xs text-ink-500 font-medium">Saldo Pendiente</span>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs text-ink-500 font-medium">Total Amortizado / Cobrado</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-xs text-ink-500 font-medium">Cuentas por Vencer / Vencidas</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{overdueCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder={`Buscar por folio, ${activeTab === 'cobrar' ? 'cliente' : 'proveedor'} o documento...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input pl-9 text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CreditAccount['status'] | 'Todos');
            setCurrentPage(1);
          }}
          className="input text-xs w-auto"
        >
          <option value="Todos">Todos los Estados</option>
          <option value="vigente">Vigentes (Con saldo)</option>
          <option value="pagado">Pagados / Liquidados</option>
        </select>
      </div>

      {/* Credit Accounts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-100 sticky top-0 z-10">
              <tr>
                <th className="table-header py-2.5">Folio Crédito</th>
                <th className="table-header py-2.5">
                  {activeTab === 'cobrar' ? 'Cliente' : 'Proveedor'}
                </th>
                <th className="table-header py-2.5">Documento Ref.</th>
                <th className="table-header py-2.5 text-right">Monto Total</th>
                <th className="table-header py-2.5 text-right">Abonado</th>
                <th className="table-header py-2.5 text-right">Saldo Pendiente</th>
                <th className="table-header py-2.5">Vencimiento</th>
                <th className="table-header py-2.5">Estado</th>
                <th className="table-header py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {paginatedCredits.map((c) => {
                const isOverdue =
                  c.status === 'vigente' && new Date(c.dueDate) < new Date();

                return (
                  <tr key={c.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="table-cell py-2 font-mono font-bold text-xs text-brand-600">
                      {c.folio}
                    </td>
                    <td className="table-cell py-2">
                      <p className="font-semibold text-ink-900 text-xs">{c.entityName}</p>
                      {c.entityPhone && (
                        <p className="text-[10px] text-ink-400">Tel: {c.entityPhone}</p>
                      )}
                    </td>
                    <td className="table-cell py-2 text-xs font-mono text-ink-600">
                      {c.relatedDocumentFolio || '—'}
                    </td>
                    <td className="table-cell py-2 text-right font-medium text-xs text-ink-700">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="table-cell py-2 text-right font-bold text-xs text-emerald-600">
                      {formatCurrency(c.paidAmount)}
                    </td>
                    <td className="table-cell py-2 text-right font-bold text-xs text-red-600">
                      {formatCurrency(c.remainingAmount)}
                    </td>
                    <td className="table-cell py-2 text-xs">
                      <span className={isOverdue ? 'text-red-600 font-bold' : 'text-ink-600'}>
                        {c.dueDate.split('T')[0]}
                      </span>
                      {isOverdue && (
                        <span className="block text-[10px] text-red-500 font-semibold">
                          ¡Vencido!
                        </span>
                      )}
                    </td>
                    <td className="table-cell py-2">
                      <Badge color={c.status === 'pagado' ? 'green' : isOverdue ? 'red' : 'amber'}>
                        {c.status === 'pagado' ? 'Pagado' : isOverdue ? 'Mora' : 'Vigente'}
                      </Badge>
                    </td>
                    <td className="table-cell py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.remainingAmount > 0 && (
                          <button
                            onClick={() => handleOpenPayment(c)}
                            className="btn-primary py-1 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <DollarSign size={12} />
                            {activeTab === 'cobrar' ? 'Cobrar Cuota' : 'Abonar'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`¿Deseas eliminar el registro de crédito ${c.folio}?`)) {
                              deleteCreditAccount(c.id);
                            }
                          }}
                          className="p-1 rounded text-ink-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar crédito"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCredits.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-ink-400">
                    No se encontraron cuentas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCredits.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* New Credit Account Modal */}
      <Modal
        open={newCreditModalOpen}
        onClose={() => setNewCreditModalOpen(false)}
        title={
          activeTab === 'cobrar'
            ? 'Otorgar Crédito a Cliente (Cuenta por Cobrar)'
            : 'Registrar Cuenta por Pagar a Proveedor'
        }
        subtitle="Registra el compromiso de pago, fecha límite y documento asociado"
      >
        <form onSubmit={handleSaveNewCredit} className="space-y-3 text-xs">
          <div>
            <label className="label text-xs">
              {activeTab === 'cobrar' ? 'Seleccionar Cliente' : 'Seleccionar Proveedor'}
            </label>
            <SearchableSelect
              options={activeTab === 'cobrar' ? customerOptions : supplierOptions}
              value={entityId}
              onChange={setEntityId}
              placeholder={
                activeTab === 'cobrar'
                  ? '-- Buscar cliente por nombre o empresa --'
                  : '-- Buscar proveedor --'
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Monto Total del Crédito (Bs.)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="input text-xs font-bold"
              />
            </div>
            <div>
              <label className="label text-xs">Fecha Límite de Vencimiento</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Folio o N° de Comprobante Relacionado</label>
            <input
              type="text"
              placeholder="Ej. Factura #8820 o V-00120"
              value={documentRef}
              onChange={(e) => setDocumentRef(e.target.value)}
              className="input text-xs font-mono"
            />
          </div>

          <div>
            <label className="label text-xs">Observaciones / Términos de Pago</label>
            <textarea
              rows={2}
              placeholder="Ej. Pagadero en 2 cuotas quincenales sin interés..."
              value={creditNotes}
              onChange={(e) => setCreditNotes(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setNewCreditModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 font-bold">
              Guardar Crédito
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment / Amortization Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Registrar ${activeTab === 'cobrar' ? 'Cobro / Abono de Cliente' : 'Pago a Proveedor'}`}
        subtitle={`Folio: ${selectedCredit?.folio} | Entidad: ${selectedCredit?.entityName}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
          <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 flex justify-between items-center">
            <div>
              <p className="text-ink-500 font-medium">Saldo Pendiente Actual</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(selectedCredit?.remainingAmount || 0)}
              </p>
            </div>
            <div>
              <p className="text-ink-500 font-medium text-right">Vencimiento</p>
              <p className="text-xs font-bold text-ink-800 text-right">
                {selectedCredit?.dueDate.split('T')[0]}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Monto a Abonar (Bs.)</label>
              <input
                type="number"
                min="0.5"
                max={selectedCredit?.remainingAmount}
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="input text-xs font-bold text-brand-700"
              />
            </div>
            <div>
              <label className="label text-xs">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input text-xs font-semibold"
              >
                {paymentMethodsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs">N° de Operación / Transferencia / Cheque</label>
            <input
              type="text"
              placeholder="Ej. TRF-BNB-99201"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="input text-xs font-mono"
            />
          </div>

          <div>
            <label className="label text-xs">Nota de Recibo</label>
            <input
              type="text"
              placeholder="Comprobante entregado a cliente..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              Confirmar Abono
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
