import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  FileCheck,
  X,
  FileText,
  UserPlus,
  UserCheck,
  Barcode,
  Phone,
  Package,
  Printer,
  Calendar,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  QrCode,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency, formatDateTime } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { exportToExcel } from '../utils/exportExcel';
import type { Quote, QuoteItem, Product, Category, Brand } from '../types';

export function QuotesView() {
  const {
    products,
    categories,
    brands,
    customers,
    quotes,
    addQuote,
    deleteQuote,
    addCustomer,
  } = useStore();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'Todos'>('Todos');
  const [brandFilter, setBrandFilter] = useState<Brand | 'Todas'>('Todas');
  const [cart, setCart] = useState<QuoteItem[]>([]);

  // Customer state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [validDays, setValidDays] = useState(7);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('Precios válidos por 7 días calendario o hasta agotar stock.');

  // Generated Quote Modal / Print State
  const [createdQuote, setCreatedQuote] = useState<Quote | null>(null);
  const [inspectQuote, setInspectQuote] = useState<Quote | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Filtered customer list for search by name OR phone
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [customers, customerSearchQuery]);

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const allCategoryPills = useMemo(() => ['Todos', ...categories], [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'Todos' || p.category === category;
      const matchBrand =
        brandFilter === 'Todas' || p.brand.toLowerCase() === brandFilter.toLowerCase();
      return matchSearch && matchCat && matchBrand;
    });
  }, [products, search, category, brandFilter]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newQty = Math.max(0, i.quantity + delta);
          return { ...i, quantity: newQty, subtotal: newQty * i.price };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomerId(null);
    setCustomerSearchQuery('');
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const handleGenerateQuote = () => {
    if (cart.length === 0) return;

    let finalCustomerId: string | null = selectedCustomerId;
    let finalCustomerName = 'Cliente Particular';
    let finalCustomerPhone = '';

    if (customerMode === 'new' && newCustomerName.trim()) {
      const created = addCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || 'S/N',
      });
      finalCustomerId = created.id;
      finalCustomerName = created.name;
      finalCustomerPhone = created.phone;
    } else if (selectedCustomerObj) {
      finalCustomerName = selectedCustomerObj.name;
      finalCustomerPhone = selectedCustomerObj.phone;
    }

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + validDays);

    const newQ = addQuote({
      documentType: 'Cotización Proforma',
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      agentName: 'Admin Principal',
      items: cart,
      subtotal,
      discount,
      tax: 0,
      total,
      validUntil: expDate.toISOString(),
      notes,
    });

    setCreatedQuote(newQ);
    clearCart();
  };

  const handleExportQuotesToExcel = () => {
    const headers = [
      'Folio',
      'Cliente',
      'Celular',
      'Asesor',
      'Subtotal (Bs.)',
      'Descuento (Bs.)',
      'Total Cotizado (Bs.)',
      'Válido Hasta',
      'Fecha Emisión',
      'Detalle de Productos',
    ];

    const rows = quotes.map((q) => [
      q.folio,
      q.customerName,
      q.customerPhone ?? '',
      q.agentName,
      q.subtotal,
      q.discount,
      q.total,
      q.validUntil,
      q.createdAt,
      q.items.map((i) => `${i.quantity}x ${i.name}`).join('; '),
    ]);

    exportToExcel('Cotizaciones_Proformas', headers, rows);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden animate-slide-up relative">
      {/* Top Banner & Quick Quotes History Switch */}
      <div className="bg-white border border-ink-100 rounded-xl px-4 py-2 mb-3 shrink-0 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <FileCheck size={18} className="text-brand-600" />
          <h3 className="font-bold text-ink-900 text-xs sm:text-sm">
            Módulo de Cotizaciones & Proformas
          </h3>
          <span className="badge bg-purple-100 text-purple-800 text-[11px] font-bold">
            No descuenta stock ni caja
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportQuotesToExcel}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel Cotizaciones
          </button>
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-brand-700 hover:bg-brand-50"
          >
            <Eye size={14} />
            Historial ({quotes.length})
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Catalog / Right Quote Builder */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Product Catalog Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-white rounded-xl border border-ink-100 p-3 shadow-sm">
          {/* Search Bar & Filters */}
          <div className="space-y-2 pb-2 shrink-0 border-b border-ink-100">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto para cotizar por nombre, SKU, marca..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 text-xs"
                />
              </div>

              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="input text-xs w-auto py-1.5"
              >
                <option value="Todas">Todas las Marcas</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {allCategoryPills.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    category === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1 pt-2 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="card card-hover p-2.5 text-left group relative flex flex-col justify-between bg-white border border-ink-100 transition-all hover:border-brand-300"
                >
                  <div>
                    <div className="h-24 w-full rounded-lg bg-ink-50 mb-2 flex items-center justify-center overflow-hidden border border-ink-100 relative">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package size={24} className="text-ink-300" />
                      )}
                      {product.barcode && (
                        <span className="absolute bottom-1 right-1 bg-ink-950/80 text-white text-[8px] font-mono px-1 py-0.5 rounded backdrop-blur-sm flex items-center gap-0.5">
                          <Barcode size={8} /> {product.barcode}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-ink-400 font-bold uppercase tracking-wider mb-0.5">
                      {product.brand}
                    </p>
                    <h4 className="text-xs font-bold text-ink-800 leading-snug line-clamp-2 mb-1.5">
                      {product.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-ink-100">
                    <span className="text-xs font-bold text-brand-600">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="text-[10px] font-bold text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded">
                      + Cotizar
                    </span>
                  </div>
                </button>
              ))}

              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-16 text-ink-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No se encontraron productos coincidentes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quote Builder Sidebar Column */}
        <div className="w-full lg:w-96 shrink-0 card flex flex-col h-full bg-white shadow-sm overflow-hidden border border-ink-100">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between shrink-0 bg-ink-50/50">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-brand-600" />
              <h3 className="font-bold text-ink-900 text-sm">Detalle de Cotización</h3>
              {cartCount > 0 && (
                <span className="badge bg-brand-100 text-brand-700 text-xs px-2 py-0.5 font-bold">
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-ink-400 hover:text-red-500 transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 size={13} />
                Vaciar
              </button>
            )}
          </div>

          {/* Customer Selection Box (Searchable by Name OR Phone) */}
          <div className="px-4 py-2 border-b border-ink-100 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
              <span>Cliente a Cotizar</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('existing');
                    setShowCustomerDropdown(false);
                  }}
                  className={`flex items-center gap-1 text-xs ${
                    customerMode === 'existing' ? 'text-brand-600 font-bold' : 'text-ink-400'
                  }`}
                >
                  <UserCheck size={12} /> Existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('new');
                    setShowCustomerDropdown(false);
                  }}
                  className={`flex items-center gap-1 text-xs ${
                    customerMode === 'new' ? 'text-brand-600 font-bold' : 'text-ink-400'
                  }`}
                >
                  <UserPlus size={12} /> Nuevo
                </button>
              </div>
            </div>

            {customerMode === 'existing' ? (
              <div className="relative">
                {selectedCustomerObj ? (
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs">
                    <div className="truncate">
                      <span className="font-bold text-brand-900">{selectedCustomerObj.name}</span>
                      <span className="text-[11px] text-brand-700 ml-1.5 font-mono">
                        (Cel: {selectedCustomerObj.phone})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setCustomerSearchQuery('');
                      }}
                      className="p-1 text-brand-400 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por Nombre o Celular..."
                        value={customerSearchQuery}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        className="input text-xs py-1.5 pl-8"
                      />
                    </div>

                    {showCustomerDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-ink-50 custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(null);
                            setShowCustomerDropdown(false);
                            setCustomerSearchQuery('');
                          }}
                          className="w-full text-left p-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 flex items-center justify-between"
                        >
                          <span>Cliente Particular (Sin registrar)</span>
                          <span className="text-[10px] text-ink-400">—</span>
                        </button>
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setShowCustomerDropdown(false);
                              setCustomerSearchQuery('');
                            }}
                            className="w-full text-left p-2 text-xs hover:bg-brand-50 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-ink-900">{c.name}</p>
                              <p className="text-[10px] text-ink-400 font-mono">Cel: {c.phone}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1 pt-0.5">
                <input
                  type="text"
                  placeholder="Nombre del Cliente"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="input text-xs py-1"
                />
                <div className="relative">
                  <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Número de Celular"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="input text-xs py-1 pl-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Items list */}
          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ink-400 py-8">
                <FileText size={36} className="mb-2 opacity-30" />
                <p className="text-xs font-medium text-center">
                  Haz clic en los productos del catálogo para agregarlos a la proforma
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-ink-50 border border-ink-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-ink-500 font-medium">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="w-5 h-5 rounded bg-white border border-ink-200 flex items-center justify-center hover:bg-ink-100 transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="w-5 h-5 rounded bg-white border border-ink-200 flex items-center justify-center hover:bg-ink-100 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-ink-900 w-16 text-right">
                    {formatCurrency(item.subtotal)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1 text-ink-300 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Bottom Summary & Generate Quote */}
          {cart.length > 0 && (
            <div className="border-t border-ink-100 px-4 py-3 space-y-2 bg-ink-50/80 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Validez Proforma</span>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="input text-xs py-0.5 w-auto"
                >
                  <option value={3}>3 días</option>
                  <option value={7}>7 días (Recomendado)</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Subtotal</span>
                <span className="font-semibold text-ink-700">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500 flex items-center gap-1">
                  <Tag size={12} /> Descuento (Bs.)
                </span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={discount || ''}
                  onChange={(e) =>
                    setDiscount(Math.max(0, Math.min(subtotal, Number(e.target.value))))
                  }
                  placeholder="0"
                  className="w-16 px-1.5 py-0.5 rounded border border-ink-200 text-xs text-right outline-none focus:border-brand-400 bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-ink-200">
                <span className="text-sm font-bold text-ink-900">Total Proforma</span>
                <span className="text-lg font-bold text-brand-600">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={handleGenerateQuote}
                className="btn-primary w-full py-2.5 font-bold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Generar Ticket / Hoja de Cotización
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Generated Quote Modal */}
      <Modal
        open={!!createdQuote || !!inspectQuote}
        onClose={() => {
          setCreatedQuote(null);
          setInspectQuote(null);
        }}
        title="Cotización Proforma Generada"
        size="md"
      >
        {(() => {
          const q = createdQuote || inspectQuote;
          if (!q) return null;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between no-print border-b border-ink-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink-900">Cotización Proforma</h3>
                    <p className="text-xs text-ink-500 font-mono">Folio: {q.folio}</p>
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="btn-primary text-xs py-1.5 px-3 bg-brand-600 hover:bg-brand-700 shadow-sm flex items-center gap-1.5 font-bold"
                >
                  <Printer size={14} /> Imprimir Cotización
                </button>
              </div>

              {/* Printable Ticket */}
              <div className="printable-ticket bg-white text-ink-900 p-5 rounded-2xl border border-ink-200 font-mono text-xs max-w-sm mx-auto shadow-sm space-y-3">
                <div className="text-center space-y-0.5 border-b border-dashed border-ink-300 pb-3">
                  <h2 className="text-sm font-black tracking-wider uppercase text-ink-950">
                    NOPOS ELECTRÓNICA & PC
                  </h2>
                  <p className="text-[10px] text-ink-600">
                    Casa Matriz: Av. 6 de Agosto #2410 - La Paz, Bolivia
                  </p>
                  <p className="text-[10px] text-ink-600">Teléfono: +591 2 2441980 / 70123456</p>
                  <p className="text-[10px] font-bold text-ink-800">NIT: 1029384756</p>
                </div>

                <div className="text-center py-1 border-b border-dashed border-ink-300">
                  <p className="font-extrabold text-xs uppercase text-brand-700">
                    PROFORMA DE COTIZACIÓN
                  </p>
                  <p className="font-bold text-sm text-ink-900 mt-0.5">Nº: {q.folio}</p>
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-ink-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Fecha Emisión:</span>
                    <span>{formatDateTime(q.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Válido Hasta:</span>
                    <span className="font-bold text-red-600">{formatDateTime(q.validUntil)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Cliente:</span>
                    <span className="font-bold text-right truncate max-w-[180px]">
                      {q.customerName}
                    </span>
                  </div>
                  {q.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-ink-500">Celular:</span>
                      <span>{q.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-500">Asesor Comercial:</span>
                    <span>{q.agentName}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 border-b border-dashed border-ink-300 pb-3">
                  <div className="flex justify-between font-bold text-[10px] text-ink-600 border-b border-ink-200 pb-1 uppercase">
                    <span>Cant / Componente</span>
                    <span className="text-right">Importe</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {q.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] items-start">
                        <span className="font-bold leading-tight flex-1 pr-2">
                          {item.quantity} x {item.name}
                        </span>
                        <span className="font-extrabold text-right shrink-0">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Subtotal:</span>
                    <span>{formatCurrency(q.subtotal)}</span>
                  </div>
                  {q.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento Promocional:</span>
                      <span>-{formatCurrency(q.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black pt-1.5 border-t border-ink-300 text-ink-950">
                    <span>TOTAL COTIZADO:</span>
                    <span className="text-sm text-brand-700">{formatCurrency(q.total)}</span>
                  </div>
                </div>

                <div className="text-center pt-3 border-t border-dashed border-ink-300 space-y-1">
                  <p className="text-[9px] text-ink-500 italic">
                    * Precios sujetos a disponibilidad de inventario.
                  </p>
                  <p className="text-[9px] text-ink-400 font-bold uppercase">
                    ¡Gracias por cotizar con nosotros!
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* History of Quotes Modal */}
      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Historial de Cotizaciones Emitidas"
        size="lg"
      >
        <div className="space-y-3">
          <div className="max-h-80 overflow-y-auto divide-y divide-ink-100 border border-ink-200 rounded-xl p-2 custom-scrollbar">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-3 hover:bg-ink-50 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-600">{q.folio}</span>
                    <span className="font-bold text-ink-900">{q.customerName}</span>
                    {q.customerPhone && (
                      <span className="text-ink-400 font-mono">({q.customerPhone})</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {q.items.length} artículos • Emitido: {formatDateTime(q.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-brand-700 text-sm">
                    {formatCurrency(q.total)}
                  </span>
                  <button
                    onClick={() => {
                      setInspectQuote(q);
                    }}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-brand-600 font-bold"
                  >
                    <Eye size={13} /> Ver / Imprimir
                  </button>
                  <button
                    onClick={() => deleteQuote(q.id)}
                    className="p-1 text-ink-400 hover:text-red-500"
                    title="Eliminar cotización"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {quotes.length === 0 && (
              <p className="text-xs text-ink-400 text-center py-8">
                No hay cotizaciones emitidas todavía
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
