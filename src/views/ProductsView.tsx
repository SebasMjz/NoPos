import { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  Search,
  Barcode,
  Image as ImageIcon,
  LayoutGrid,
  List,
  QrCode,
  Tag,
  CheckCircle2,
  X,
  FileText,
  FileSpreadsheet,
  FolderPlus,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatNumber } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { exportToExcel } from '../utils/exportExcel';
import type { Product, Category } from '../types';

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  hasSerialNumber: boolean;
  serialNumbers: string[];
  category: Category;
  price: number;
  stock: number;
  minStock: number;
  brand: string;
  image: string;
  description: string;
}

const emptyForm: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  hasSerialNumber: false,
  serialNumbers: [],
  category: 'Componentes',
  price: 0,
  stock: 0,
  minStock: 5,
  brand: '',
  image: '',
  description: '',
};

export function ProductsView() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
  } = useStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'Todos'>('Todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'general' | 'serials'>('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [newSnInput, setNewSnInput] = useState('');
  const [bulkSnInput, setBulkSnInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  // Category Manager Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        (p.serialNumbers ?? []).some((sn) => sn.toLowerCase().includes(search.toLowerCase()));
      const matchCat = categoryFilter === 'Todos' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const openCreate = () => {
    setForm({ ...emptyForm, category: categories[0] || 'Componentes' });
    setNewSnInput('');
    setBulkSnInput('');
    setShowBulkInput(false);
    setEditingId(null);
    setModalTab('general');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? '',
      hasSerialNumber: !!p.hasSerialNumber,
      serialNumbers: p.serialNumbers ? [...p.serialNumbers] : [],
      category: p.category,
      price: p.price,
      stock: p.stock,
      minStock: p.minStock,
      brand: p.brand,
      image: p.image ?? '',
      description: p.description ?? '',
    });
    setNewSnInput('');
    setBulkSnInput('');
    setShowBulkInput(false);
    setEditingId(p.id);
    setModalTab('general');
    setModalOpen(true);
  };

  const handleAddSingleSN = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sn = newSnInput.trim();
    if (!sn) return;
    if (form.serialNumbers.includes(sn)) {
      alert('Este número de serie ya está en la lista');
      return;
    }
    const updated = [...form.serialNumbers, sn];
    setForm({ ...form, serialNumbers: updated, stock: updated.length });
    setNewSnInput('');
  };

  const handleAddBulkSN = () => {
    if (!bulkSnInput.trim()) return;
    const splitSNs = bulkSnInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const existingSet = new Set(form.serialNumbers);
    const addedList: string[] = [];

    splitSNs.forEach((sn) => {
      if (!existingSet.has(sn)) {
        existingSet.add(sn);
        addedList.push(sn);
      }
    });

    const updated = [...form.serialNumbers, ...addedList];
    setForm({ ...form, serialNumbers: updated, stock: updated.length });
    setBulkSnInput('');
    setShowBulkInput(false);
  };

  const removeSN = (snToRemove: string) => {
    const updated = form.serialNumbers.filter((sn) => sn !== snToRemove);
    setForm({ ...form, serialNumbers: updated, stock: updated.length });
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const save = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      alert('Nombre y SKU son campos obligatorios');
      return;
    }

    const payload = {
      ...form,
      stock: form.hasSerialNumber ? form.serialNumbers.length : Number(form.stock) || 0,
      price: Number(form.price) || 0,
      minStock: Number(form.minStock) || 0,
    };

    if (editingId) {
      updateProduct(editingId, payload);
    } else {
      addProduct(payload);
    }
    setModalOpen(false);
  };

  const handleExportToExcel = () => {
    const headers = [
      'ID',
      'Producto',
      'SKU',
      'Barcode',
      'Control SN',
      'Números de Serie',
      'Marca',
      'Categoría',
      'Precio Venta (Bs.)',
      'Stock Actual',
      'Stock Mínimo',
    ];

    const rows = filtered.map((p) => [
      p.id,
      p.name,
      p.sku,
      p.barcode ?? '',
      p.hasSerialNumber ? 'SÍ' : 'NO',
      p.hasSerialNumber ? (p.serialNumbers ?? []).join(', ') : 'N/A',
      p.brand,
      p.category,
      p.price,
      p.stock,
      p.minStock,
    ]);

    exportToExcel('Catalogo_Productos', headers, rows);
  };

  const totalStockUnits = products.reduce((s, p) => s + p.stock, 0);
  const totalRetailValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const serializedCount = products.filter((p) => p.hasSerialNumber).length;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Productos</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{formatNumber(products.length)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Unidades en Stock</p>
          <p className="text-xl font-bold text-brand-600 mt-0.5">{formatNumber(totalStockUnits)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Valor Total Venta</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">
            {formatCurrency(totalRetailValue)}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium flex items-center gap-1">
            <QrCode size={13} className="text-purple-600" /> Control por Series (SN)
          </p>
          <p className="text-xl font-bold text-purple-700 mt-0.5">{serializedCount} SKUs</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-xl w-full">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, código de barras o número de serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | 'Todos')}
            className="input w-auto text-xs"
          >
            <option value="Todos">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-ink-700 hover:bg-ink-50"
            title="Administrar categorías del sistema"
          >
            <FolderPlus size={14} className="text-brand-600" />
            Categorías
          </button>

          <button
            onClick={handleExportToExcel}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-emerald-700 hover:bg-emerald-50"
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel
          </button>

          <div className="flex items-center bg-white border border-ink-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold ${
                viewMode === 'table'
                  ? 'bg-brand-50 text-brand-600 shadow-sm'
                  : 'text-ink-400 hover:text-ink-700'
              }`}
              title="Vista de Tabla"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-semibold ${
                viewMode === 'cards'
                  ? 'bg-brand-50 text-brand-600 shadow-sm'
                  : 'text-ink-400 hover:text-ink-700'
              }`}
              title="Vista de Cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button onClick={openCreate} className="btn-primary text-xs py-1.5 px-3 font-bold">
            <Plus size={15} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="max-h-[calc(100vh-17rem)] overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-ink-50 border-b border-ink-100 sticky top-0 z-10">
                <tr>
                  <th className="table-header py-2.5">Producto</th>
                  <th className="table-header py-2.5">SKU / Barcode</th>
                  <th className="table-header py-2.5">Control SN</th>
                  <th className="table-header py-2.5">Categoría</th>
                  <th className="table-header py-2.5 text-right">Precio Venta</th>
                  <th className="table-header py-2.5 text-right">Stock</th>
                  <th className="table-header py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="table-cell py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center shrink-0 overflow-hidden border border-ink-200">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package size={16} className="text-ink-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-ink-900 text-xs truncate max-w-xs">{p.name}</p>
                          <p className="text-[11px] text-ink-400">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell py-2">
                      <p className="font-mono text-xs font-semibold text-ink-700">{p.sku}</p>
                      {p.barcode && (
                        <p className="text-[10px] text-brand-600 font-mono flex items-center gap-1 mt-0.5">
                          <Barcode size={10} /> {p.barcode}
                        </p>
                      )}
                    </td>
                    <td className="table-cell py-2">
                      {p.hasSerialNumber ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                          <QrCode size={11} /> {p.serialNumbers?.length ?? 0} Series (SN)
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400 font-medium">Estándar</span>
                      )}
                    </td>
                    <td className="table-cell py-2">
                      <Badge color="blue">{p.category}</Badge>
                    </td>
                    <td className="table-cell py-2 text-right font-bold text-ink-900 text-xs">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="table-cell py-2 text-right">
                      <Badge
                        color={p.stock === 0 ? 'red' : p.stock <= p.minStock ? 'amber' : 'green'}
                      >
                        {p.stock} unid.
                      </Badge>
                    </td>
                    <td className="table-cell py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          title="Editar producto"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-ink-400">
                      <Package size={32} className="mx-auto mb-2 opacity-40" />
                      No se encontraron productos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Compact Card Grid */
        <div className="max-h-[calc(100vh-17rem)] overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="card p-3 flex flex-col justify-between bg-white border border-ink-100 hover:shadow-md transition-all"
              >
                <div>
                  <div className="h-28 w-full rounded-lg bg-ink-50 mb-2 flex items-center justify-center overflow-hidden border border-ink-100 relative">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package size={28} className="text-ink-300" />
                    )}
                    {p.hasSerialNumber && (
                      <span className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                        <QrCode size={9} /> SN
                      </span>
                    )}
                    {p.barcode && (
                      <span className="absolute bottom-1 right-1 bg-ink-950/80 text-white text-[9px] font-mono px-1 py-0.5 rounded backdrop-blur-sm flex items-center gap-0.5">
                        <Barcode size={9} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
                      {p.brand}
                    </span>
                    <Badge color="blue">{p.category}</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-ink-800 leading-snug line-clamp-2 mb-2">
                    {p.name}
                  </h4>
                </div>

                <div className="pt-2 border-t border-ink-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand-600">
                      {formatCurrency(p.price)}
                    </span>
                    <Badge color={p.stock === 0 ? 'red' : p.stock <= p.minStock ? 'amber' : 'green'}>
                      {p.stock} unid.
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="btn-secondary flex-1 py-1 text-xs"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal with Reference Tabs */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Ficha de Producto' : 'Crear Nuevo Producto'}
        subtitle="Configura datos generales, códigos de barra y trazabilidad por números de serie"
        size="lg"
      >
        <div className="space-y-4">
          {/* Internal Form Navigation Tabs */}
          <div className="flex border-b border-ink-200">
            <button
              type="button"
              onClick={() => setModalTab('general')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                modalTab === 'general'
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              <FileText size={14} />
              Datos Generales
            </button>
            <button
              type="button"
              onClick={() => setModalTab('serials')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                modalTab === 'serials'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              <QrCode size={14} />
              Códigos & Series (SN)
              {form.hasSerialNumber && (
                <span className="badge bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2">
                  {form.serialNumbers.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: General Details */}
          {modalTab === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-slide-up">
              <div className="sm:col-span-2">
                <label className="label text-xs">Nombre o Descripción del Producto *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input text-xs"
                  placeholder="Ej. Laptop ASUS ROG Strix G16 RTX 4070"
                />
              </div>

              <div>
                <label className="label text-xs">SKU / Código Interno *</label>
                <input
                  type="text"
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="input text-xs font-mono"
                  placeholder="Ej. ROG-G16-4070"
                />
              </div>

              <div>
                <label className="label text-xs">Marca</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="input text-xs"
                  placeholder="Ej. ASUS"
                />
              </div>

              <div>
                <label className="label text-xs">Categoría</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                  className="input text-xs"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Precio de Venta (Bs.) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="input text-xs font-bold text-brand-600"
                  placeholder="0.00"
                />
              </div>

              {!form.hasSerialNumber && (
                <div>
                  <label className="label text-xs">Stock Regular</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock || ''}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="input text-xs"
                    placeholder="0"
                  />
                </div>
              )}

              <div>
                <label className="label text-xs">Stock Mínimo de Alerta</label>
                <input
                  type="number"
                  min="0"
                  value={form.minStock || ''}
                  onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                  className="input text-xs"
                  placeholder="5"
                />
              </div>

              <div className={form.hasSerialNumber ? 'sm:col-span-2' : ''}>
                <label className="label text-xs">URL de Imagen</label>
                <div className="relative">
                  <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="input pl-8 text-xs"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label text-xs">Descripción / Especificaciones</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[60px] resize-none text-xs"
                  placeholder="Detalles técnicos, garantía o notas del producto..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: Barcode and Serial Number Tracking */}
          {modalTab === 'serials' && (
            <div className="space-y-4 animate-slide-up">
              {/* General Barcode / EAN Input */}
              <div className="p-3.5 rounded-xl bg-ink-50 border border-ink-100">
                <label className="label text-xs font-bold text-ink-800">
                  Código de Barras Principal (EAN / GTIN / Barcode del Producto)
                </label>
                <div className="relative">
                  <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-600" />
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="input pl-9 text-xs font-mono font-bold"
                    placeholder="Escanear o ingresar código de barras (ej. 7791234500019)"
                  />
                </div>
                <p className="text-[11px] text-ink-500 mt-1">
                  Este código permite buscar y vender el producto rápidamente desde el lector de caja.
                </p>
              </div>

              {/* Serial Number Switch */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <QrCode size={16} className="text-purple-600" />
                      ¿Requiere Control por Número de Serie (SN)?
                    </span>
                    <p className="text-[11px] text-purple-700">
                      Activa esta opción para productos con garantía individualizada (Laptops, GPUs,
                      CPUs, Monitores, etc.).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hasSerialNumber}
                      onChange={(e) => {
                        const active = e.target.checked;
                        setForm({
                          ...form,
                          hasSerialNumber: active,
                          stock: active ? form.serialNumbers.length : form.stock,
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {form.hasSerialNumber && (
                  <div className="pt-2 border-t border-purple-200 space-y-3">
                    {/* Alert about auto-calculated stock */}
                    <div className="p-2.5 rounded-lg bg-purple-100/70 text-purple-900 text-xs flex items-center justify-between font-medium">
                      <span>Stock sincronizado por número de serie:</span>
                      <span className="font-bold text-sm bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
                        {form.serialNumbers.length} unidades disponibles
                      </span>
                    </div>

                    {/* Single SN add input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <QrCode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                        <input
                          type="text"
                          placeholder="Escanear o ingresar Número de Serie (SN) individual..."
                          value={newSnInput}
                          onChange={(e) => setNewSnInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSingleSN();
                            }
                          }}
                          className="input pl-8 text-xs font-mono font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSingleSN}
                        className="btn-primary text-xs px-3 bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus size={14} /> Añadir SN
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBulkInput(!showBulkInput)}
                        className="btn-secondary text-xs px-2.5"
                        title="Carga masiva"
                      >
                        Lote
                      </button>
                    </div>

                    {/* Bulk SN input */}
                    {showBulkInput && (
                      <div className="p-3 rounded-lg bg-white border border-purple-200 space-y-2">
                        <label className="text-xs font-semibold text-purple-950">
                          Pegar lista de Números de Serie (separados por coma o salto de línea):
                        </label>
                        <textarea
                          rows={3}
                          value={bulkSnInput}
                          onChange={(e) => setBulkSnInput(e.target.value)}
                          placeholder="SN-DELL-001&#10;SN-DELL-002&#10;SN-DELL-003"
                          className="input font-mono text-xs resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowBulkInput(false)}
                            className="btn-secondary text-xs py-1"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddBulkSN}
                            className="btn-primary text-xs py-1 bg-purple-600 hover:bg-purple-700"
                          >
                            Procesar Lote
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Chips list of added serial numbers */}
                    <div>
                      <span className="text-[11px] font-bold text-ink-500 uppercase block mb-1.5">
                        Listado de Series en Inventario ({form.serialNumbers.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-white rounded-lg border border-purple-100 custom-scrollbar">
                        {form.serialNumbers.map((sn) => (
                          <span
                            key={sn}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-800 text-xs font-mono font-semibold border border-purple-200"
                          >
                            <QrCode size={11} className="text-purple-500" />
                            {sn}
                            <button
                              type="button"
                              onClick={() => removeSN(sn)}
                              className="ml-1 text-purple-400 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {form.serialNumbers.length === 0 && (
                          <p className="text-xs text-ink-400 p-2 italic text-center w-full">
                            No has agregado números de serie aún. Escanea o escribe para sumar stock.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-ink-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="button" onClick={save} className="btn-primary flex-1 font-bold">
              <CheckCircle2 size={16} />
              {editingId ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Gestión de Categorías de Productos"
        subtitle="Crea nuevas familias o categorías de artículos y administra las existentes"
        size="md"
      >
        <div className="space-y-4">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategorySubmit} className="space-y-1.5">
            <label className="label text-xs">Nueva Categoría</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej. Gaming, Impresoras, Almacenamiento..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="input text-xs"
              />
              <button type="submit" className="btn-primary text-xs px-3 font-bold shrink-0">
                <Plus size={14} /> Crear Categoría
              </button>
            </div>
          </form>

          {/* Current Categories List */}
          <div>
            <label className="label text-xs font-bold text-ink-800">
              Categorías Activas ({categories.length}):
            </label>
            <div className="divide-y divide-ink-100 max-h-56 overflow-y-auto border border-ink-200 rounded-xl bg-ink-50/50 p-2 custom-scrollbar">
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <div key={cat} className="flex items-center justify-between py-2 px-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-brand-600" />
                      <span className="font-semibold text-ink-900">{cat}</span>
                      <span className="text-[10px] text-ink-400">({count} productos)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (count > 0) {
                          if (
                            !confirm(
                              `Esta categoría contiene ${count} productos. ¿Deseas eliminarla igualmente?`,
                            )
                          )
                            return;
                        }
                        deleteCategory(cat);
                      }}
                      className="p-1 text-ink-400 hover:text-red-500 rounded transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Producto"
        size="sm"
      >
        <p className="text-sm text-ink-600">
          ¿Seguro que deseas eliminar el producto <strong>{confirmDelete?.name}</strong>?
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) deleteProduct(confirmDelete.id);
              setConfirmDelete(null);
            }}
            className="btn-danger flex-1"
          >
            <Trash2 size={16} />
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
