import { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Settings2,
  Search,
  Plus,
  Truck,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  Barcode,
  Package,
  QrCode,
  Tag,
  FileText,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { exportToExcel } from '../utils/exportExcel';
import type { Movement, MovementSubtype, Product } from '../types';

interface MovementSubtypeInfo {
  label: string;
  type: 'entrada' | 'salida' | 'ajuste';
  badgeColor: 'green' | 'red' | 'amber' | 'blue' | 'purple';
  description: string;
}

const subtypeDirectory: Record<MovementSubtype, MovementSubtypeInfo> = {
  // Entradas
  compra_proveedor: {
    label: 'Compra a Proveedor',
    type: 'entrada',
    badgeColor: 'green',
    description: 'Recepción de mercadería de distribuidores',
  },
  devolucion_cliente: {
    label: 'Devolución de Cliente',
    type: 'entrada',
    badgeColor: 'blue',
    description: 'Reingreso de producto retornado por cliente',
  },
  reingreso_rma: {
    label: 'Reingreso por Garantía / RMA',
    type: 'entrada',
    badgeColor: 'purple',
    description: 'Equipo reparado o reemplazado por servicio técnico',
  },
  sobrante_inventario: {
    label: 'Sobrante de Inventario',
    type: 'entrada',
    badgeColor: 'green',
    description: 'Ajuste positivo por sobrante en recuento físico',
  },
  transferencia_entrada: {
    label: 'Transferencia de Sucursal',
    type: 'entrada',
    badgeColor: 'blue',
    description: 'Recepción de stock desde otra sucursal',
  },
  donacion_entrada: {
    label: 'Muestra / Donación Entrada',
    type: 'entrada',
    badgeColor: 'green',
    description: 'Muestras comerciales o promocionales',
  },

  // Salidas
  salida_rma: {
    label: 'Salida por Garantía / RMA',
    type: 'salida',
    badgeColor: 'red',
    description: 'Envío de producto defectuoso a proveedor/fábrica',
  },
  salida_convenio: {
    label: 'Salida por Convenio / Consignación',
    type: 'salida',
    badgeColor: 'purple',
    description: 'Entrega de stock por convenio institucional o préstamo',
  },
  devolucion_proveedor: {
    label: 'Devolución a Proveedor',
    type: 'salida',
    badgeColor: 'red',
    description: 'Retorno de mercadería rechazada o en exceso',
  },
  merma_dano: {
    label: 'Merma / Rotura / Daño',
    type: 'salida',
    badgeColor: 'red',
    description: 'Baja de producto dañado, averiado o caducado',
  },
  uso_interno: {
    label: 'Uso Interno / Exhibición',
    type: 'salida',
    badgeColor: 'amber',
    description: 'Equipo asignado para oficina, local o exhibición',
  },
  faltante_inventario: {
    label: 'Faltante de Inventario',
    type: 'salida',
    badgeColor: 'red',
    description: 'Ajuste negativo por faltante en recuento físico',
  },
  donacion_salida: {
    label: 'Donación / Regalo Comercial',
    type: 'salida',
    badgeColor: 'amber',
    description: 'Entrega gratuita de producto promocional',
  },

  // Ajustes
  auditoria_conteo: {
    label: 'Auditoría / Conteo Físico',
    type: 'ajuste',
    badgeColor: 'amber',
    description: 'Corrección manual tras arqueo de almacén',
  },
  otro: {
    label: 'Otro Ajuste',
    type: 'ajuste',
    badgeColor: 'amber',
    description: 'Operación no categorizada',
  },
};

interface TransactionItemRow {
  productId: string;
  quantity: number;
  unitCost: number;
  barcode: string;
  serialNumber: string;
}

export function MovementsView() {
  const { movements, products, suppliers, addMovement } = useStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<Movement['type'] | 'Todos'>('Todos');
  const [subtypeFilter, setSubtypeFilter] = useState<string>('Todos');

  // Unified Multi-Product Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');
  const [selectedSubtype, setSelectedSubtype] = useState<MovementSubtype>('compra_proveedor');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [movementReference, setMovementReference] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [transactionRows, setTransactionRows] = useState<TransactionItemRow[]>([
    { productId: products[0]?.id ?? '', quantity: 1, unitCost: 0, barcode: '', serialNumber: '' },
  ]);

  // Filter movements (omitting 'venta')
  const inventoryMovements = useMemo(() => {
    return movements.filter((m) => m.type !== ('venta' as Movement['type']));
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return inventoryMovements.filter((m) => {
      const matchSearch =
        m.productName.toLowerCase().includes(search.toLowerCase()) ||
        m.sku.toLowerCase().includes(search.toLowerCase()) ||
        (m.barcode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.serialNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.supplierName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
        m.userName.toLowerCase().includes(search.toLowerCase()) ||
        m.reason.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'Todos' || m.type === typeFilter;
      const matchSubtype = subtypeFilter === 'Todos' || m.subtype === subtypeFilter;
      return matchSearch && matchType && matchSubtype;
    });
  }, [inventoryMovements, search, typeFilter, subtypeFilter]);

  const totalEntradas = inventoryMovements
    .filter((m) => m.quantity > 0)
    .reduce((s, m) => s + m.quantity, 0);
  const totalSalidas = inventoryMovements
    .filter((m) => m.quantity < 0)
    .reduce((s, m) => s + Math.abs(m.quantity), 0);

  // Open modal handler
  const openNewMovementModal = (initialType: 'entrada' | 'salida' | 'ajuste') => {
    setModalType(initialType);
    if (initialType === 'entrada') {
      setSelectedSubtype('compra_proveedor');
    } else if (initialType === 'salida') {
      setSelectedSubtype('salida_rma');
    } else {
      setSelectedSubtype('auditoria_conteo');
    }
    setSelectedSupplierId('');
    setMovementReference('');
    setMovementReason('');
    setTransactionRows([
      { productId: products[0]?.id ?? '', quantity: 1, unitCost: 0, barcode: '', serialNumber: '' },
    ]);
    setMovementModalOpen(true);
  };

  // Row management
  const addTransactionRow = () => {
    setTransactionRows((prev) => [
      ...prev,
      { productId: products[0]?.id ?? '', quantity: 1, unitCost: 0, barcode: '', serialNumber: '' },
    ]);
  };

  const updateTransactionRow = (
    index: number,
    field: keyof TransactionItemRow,
    val: string | number,
  ) => {
    setTransactionRows((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  const removeTransactionRow = (index: number) => {
    setTransactionRows((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMultiMovement = () => {
    if (transactionRows.length === 0) return;
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const subInfo = subtypeDirectory[selectedSubtype];

    const defaultReason =
      movementReason.trim() ||
      `${subInfo.label}${movementReference ? ` (${movementReference})` : ''}`;

    transactionRows.forEach((row) => {
      const prod = products.find((p) => p.id === row.productId);
      if (!prod || row.quantity <= 0) return;

      const qty =
        modalType === 'entrada'
          ? Math.abs(Number(row.quantity))
          : -Math.abs(Number(row.quantity));

      addMovement({
        type: modalType,
        subtype: selectedSubtype,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        barcode: row.barcode || prod.barcode,
        serialNumber: row.serialNumber || undefined,
        quantity: qty,
        unitCost: Number(row.unitCost) || undefined,
        reason: defaultReason,
        reference: movementReference || undefined,
        userId: 'u1',
        userName: 'Admin Principal',
      });
    });

    setMovementModalOpen(false);
  };

  // Export to Excel handler
  const handleExportToExcel = () => {
    const headers = [
      'Tipo',
      'Motivo / Subtipo',
      'Producto',
      'SKU',
      'Barcode',
      'Serial (SN)',
      'Proveedor',
      'Referencia / Folio',
      'Cantidad',
      'Costo Unitario (Bs.)',
      'Usuario',
      'Fecha',
    ];

    const rows = filteredMovements.map((m) => {
      const subInfo = m.subtype ? subtypeDirectory[m.subtype]?.label : '';
      return [
        m.type,
        subInfo,
        m.productName,
        m.sku,
        m.barcode ?? '',
        m.serialNumber ?? '',
        m.supplierName ?? '',
        m.reference ?? m.reason,
        m.quantity,
        m.unitCost ?? '',
        m.userName,
        m.createdAt,
      ];
    });

    exportToExcel('Movimientos_Inventario', headers, rows);
  };

  // Subtypes available for current modal type
  const availableSubtypes = useMemo(() => {
    return (Object.entries(subtypeDirectory) as [MovementSubtype, MovementSubtypeInfo][]).filter(
      ([, info]) => info.type === modalType,
    );
  }, [modalType]);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Registros</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{inventoryMovements.length}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ArrowDownLeft size={14} className="text-emerald-500" />
            <span className="text-xs text-ink-500 font-medium">Entradas Totales</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">+{totalEntradas} unid.</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ArrowUpRight size={14} className="text-red-500" />
            <span className="text-xs text-ink-500 font-medium">Salidas / Bajas</span>
          </div>
          <p className="text-xl font-bold text-red-500">-{totalSalidas} unid.</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Settings2 size={14} className="text-amber-500" />
            <span className="text-xs text-ink-500 font-medium">Ajustes Realizados</span>
          </div>
          <p className="text-xl font-bold text-amber-600">
            {inventoryMovements.filter((m) => m.type === 'ajuste').length}
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Buscar por producto, proveedor, serial, referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>

          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="input text-xs w-auto"
          >
            <option value="Todos">Todos los Motivos</option>
            {Object.entries(subtypeDirectory).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          <button
            onClick={handleExportToExcel}
            className="btn-secondary px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Exportar Excel
          </button>
          <button
            onClick={() => openNewMovementModal('ajuste')}
            className="btn-secondary px-3 py-1.5 text-xs font-semibold"
          >
            <Settings2 size={14} className="text-amber-500" />
            Ajuste Físico
          </button>
          <button
            onClick={() => openNewMovementModal('salida')}
            className="btn-secondary px-3 py-1.5 text-xs font-semibold"
          >
            <ArrowUpRight size={14} className="text-red-500" />
            Salida (RMA/Convenio)
          </button>
          <button
            onClick={() => openNewMovementModal('entrada')}
            className="btn-primary px-3 py-1.5 text-xs font-bold"
          >
            <Plus size={15} />
            Entrada (Compra/Dev.)
          </button>
        </div>
      </div>

      {/* Table with high-volume scroll */}
      <div className="card overflow-hidden">
        <div className="max-h-[calc(100vh-17rem)] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-100 sticky top-0 z-10">
              <tr>
                <th className="table-header py-2.5">Tipo & Motivo</th>
                <th className="table-header py-2.5">Producto</th>
                <th className="table-header py-2.5">Proveedor / Entidad</th>
                <th className="table-header py-2.5">Referencia / Folio</th>
                <th className="table-header py-2.5 text-right">Cant.</th>
                <th className="table-header py-2.5 text-right">Costo U.</th>
                <th className="table-header py-2.5">Usuario</th>
                <th className="table-header py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filteredMovements.map((m) => {
                const subtypeInfo = m.subtype ? subtypeDirectory[m.subtype] : null;
                const isPositive = m.quantity > 0;

                return (
                  <tr key={m.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="table-cell py-2">
                      <div className="space-y-0.5">
                        <Badge color={isPositive ? 'green' : 'red'}>
                          {isPositive ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                          {m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste'}
                        </Badge>
                        {subtypeInfo && (
                          <p className="text-[11px] font-semibold text-ink-700 block">
                            {subtypeInfo.label}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell py-2">
                      <p className="font-semibold text-ink-900 text-xs">{m.productName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-ink-400 font-mono mt-0.5">
                        <span>SKU: {m.sku}</span>
                        {m.barcode && (
                          <span className="flex items-center gap-0.5 text-brand-600 bg-brand-50 px-1 py-0.2 rounded">
                            <Barcode size={9} /> {m.barcode}
                          </span>
                        )}
                        {m.serialNumber && (
                          <span className="flex items-center gap-0.5 text-purple-700 bg-purple-50 px-1 py-0.2 rounded font-bold">
                            <QrCode size={9} /> SN: {m.serialNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell py-2">
                      {m.supplierName ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-ink-800">
                          <Truck size={12} className="text-brand-600 shrink-0" />
                          {m.supplierName}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="table-cell py-2">
                      {m.reference ? (
                        <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                          {m.reference}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-500">{m.reason}</span>
                      )}
                    </td>
                    <td className="table-cell py-2 text-right">
                      <span
                        className={`font-bold text-xs ${
                          isPositive ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {m.quantity}
                      </span>
                    </td>
                    <td className="table-cell py-2 text-right font-medium text-ink-700 text-xs">
                      {m.unitCost ? formatCurrency(m.unitCost) : '—'}
                    </td>
                    <td className="table-cell py-2 text-ink-500 text-xs">{m.userName}</td>
                    <td className="table-cell py-2 text-ink-500 text-[11px]">
                      {formatDateTime(m.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-ink-400">
                    No se encontraron movimientos de inventario
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Multi-Product Movement Modal */}
      <Modal
        open={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={
          modalType === 'entrada'
            ? 'Registrar Entrada de Inventario (+)'
            : modalType === 'salida'
              ? 'Registrar Salida de Inventario (-)'
              : 'Registrar Ajuste de Inventario'
        }
        subtitle="Registra múltiples productos con su motivo correspondiente en una sola operación"
        size="lg"
      >
        <div className="space-y-4">
          {/* Operation Type Selector Pills */}
          <div>
            <label className="label text-xs">Tipo de Movimiento</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalType('entrada');
                  setSelectedSubtype('compra_proveedor');
                }}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  modalType === 'entrada'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                <ArrowDownLeft size={14} className="text-emerald-500" />
                Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType('salida');
                  setSelectedSubtype('salida_rma');
                }}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  modalType === 'salida'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                <ArrowUpRight size={14} className="text-red-500" />
                Salida / Baja (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType('ajuste');
                  setSelectedSubtype('auditoria_conteo');
                }}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  modalType === 'ajuste'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                <Settings2 size={14} className="text-amber-500" />
                Ajuste Físico
              </button>
            </div>
          </div>

          {/* Subtype & Entity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-ink-50 border border-ink-100">
            <div>
              <label className="label text-xs">Motivo Específico / Subtipo</label>
              <select
                value={selectedSubtype}
                onChange={(e) => setSelectedSubtype(e.target.value as MovementSubtype)}
                className="input text-xs"
              >
                {availableSubtypes.map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-ink-500 mt-1">
                {subtypeDirectory[selectedSubtype]?.description}
              </p>
            </div>

            {modalType === 'entrada' && selectedSubtype === 'compra_proveedor' ? (
              <div>
                <label className="label text-xs">Distribuidor / Proveedor</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">-- Seleccionar Proveedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="label text-xs">Referencia / Documento / Guía</label>
                <input
                  type="text"
                  placeholder="Ej. RMA #8841, Factura #1029..."
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                  className="input text-xs"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="label text-xs">Observaciones Adicionales</label>
              <input
                type="text"
                placeholder="Notas técnicas, número de acta o detalle..."
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Transaction Rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label text-xs font-bold text-ink-800">
                Productos a Incluir en la Transacción ({transactionRows.length})
              </label>
              <button
                type="button"
                onClick={addTransactionRow}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-brand-600"
              >
                <Plus size={13} /> Agregar Línea
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {transactionRows.map((row, index) => {
                const selectedProd = products.find((p) => p.id === row.productId);
                return (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg bg-ink-50 border border-ink-100 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-5 sm:col-span-4">
                      <select
                        value={row.productId}
                        onChange={(e) => updateTransactionRow(index, 'productId', e.target.value)}
                        className="input text-xs py-1"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.brand})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={row.quantity}
                        onChange={(e) =>
                          updateTransactionRow(index, 'quantity', Number(e.target.value))
                        }
                        className="input text-xs py-1 text-center font-bold"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-3">
                      {selectedProd?.hasSerialNumber ? (
                        <input
                          type="text"
                          placeholder="Serial (SN)"
                          value={row.serialNumber}
                          onChange={(e) =>
                            updateTransactionRow(index, 'serialNumber', e.target.value)
                          }
                          className="input text-xs py-1 font-mono font-bold text-purple-700 bg-purple-50/50"
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Costo U. (Bs.)"
                          value={row.unitCost || ''}
                          onChange={(e) =>
                            updateTransactionRow(index, 'unitCost', Number(e.target.value))
                          }
                          className="input text-xs py-1 text-right"
                        />
                      )}
                    </div>

                    <div className="col-span-12 sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Barcode"
                        value={row.barcode}
                        onChange={(e) => updateTransactionRow(index, 'barcode', e.target.value)}
                        className="input text-xs py-1 font-mono"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      {transactionRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransactionRow(index)}
                          className="p-1 text-ink-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setMovementModalOpen(false)}
              className="btn-secondary flex-1 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={saveMultiMovement}
              className="btn-primary flex-1 text-xs font-bold"
            >
              <CheckCircle2 size={15} /> Confirmar y Guardar Registro
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
