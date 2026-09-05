import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  CheckCircle2,
  CreditCard,
  Banknote,
  Building2,
  Clock,
  Tag,
  FileText,
  Receipt,
  UserPlus,
  UserCheck,
  Barcode,
  Phone,
  Package,
  Printer,
  Unlock,
  Lock,
  QrCode,
  Check,
  AlertCircle,
  Sliders,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { ReceiptPrint } from '../components/ReceiptPrint';
import type { SaleItem, Sale, Category, Brand, Product, PaymentSplit } from '../types';

interface CartItem extends SaleItem {}

export function PosView() {
  const {
    products,
    categories,
    brands,
    paymentMethodsList,
    customers,
    addSale,
    addCustomer,
    activeRegisterSession,
    openCashRegister,
  } = useStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const snModalInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [brandFilter, setBrandFilter] = useState<string>('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Cash Register Barrier
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [initialAmountInput, setInitialAmountInput] = useState('500');
  const [openRegisterNotes, setOpenRegisterNotes] = useState('');

  // Document type state
  const [documentType, setDocumentType] = useState<'Factura' | 'Nota de venta'>('Nota de venta');

  // Customer state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Serial Number Picker Modal State
  const [snModalProduct, setSnModalProduct] = useState<Product | null>(null);
  const [snModalScanInput, setSnModalScanInput] = useState('');
  const [scanToast, setScanToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(
    null,
  );

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  // Advance / Anticipo Partial Payment State
  const [isAdvance, setIsAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

  // Split Payment (Pago Mixto) State
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [splitTransfer, setSplitTransfer] = useState<string>('');
  const [splitOther, setSplitOther] = useState<string>('');

  // Auto hide scan toast
  useEffect(() => {
    if (scanToast) {
      const timer = setTimeout(() => setScanToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanToast]);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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

  const reservedSerialNumbers = useMemo(() => {
    return new Set(cart.map((item) => item.serialNumber).filter(Boolean) as string[]);
  }, [cart]);

  const allCategoryPills = useMemo(() => ['Todos', ...categories], [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        (p.serialNumbers ?? []).some((sn) => sn.toLowerCase().includes(search.toLowerCase()));
      const matchCat = category === 'Todos' || p.category === category;
      const matchBrand = brandFilter === 'Todas' || p.brand === brandFilter;
      return matchSearch && matchCat && matchBrand;
    });
  }, [products, search, category, brandFilter]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const tax = documentType === 'Factura' ? (subtotal - discount) * 0.13 : 0;
  const total = Math.max(0, subtotal - discount + tax);

  // Calculations for advance payment
  const parsedAdvance = Number(advanceAmount) || 0;
  const targetChargeAmount = isAdvance && parsedAdvance > 0 ? parsedAdvance : total;
  const pendingBalance = isAdvance ? Math.max(0, total - parsedAdvance) : 0;

  // Split payment totals
  const totalSplitSum =
    (Number(splitCash) || 0) +
    (Number(splitCard) || 0) +
    (Number(splitTransfer) || 0) +
    (Number(splitOther) || 0);

  const splitDifference = targetChargeAmount - totalSplitSum;

  // Add non-serial product
  const addRegularProductToCart = (product: Product) => {
    if (product.stock <= 0) {
      setScanToast({ message: `"${product.name}" está agotado en inventario`, type: 'warning' });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && !i.serialNumber);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setScanToast({
            message: `Stock máximo alcanzado para ${product.name} (${product.stock} unidades)`,
            type: 'warning',
          });
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id && !i.serialNumber
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

    setScanToast({ message: `+1 ${product.name} agregado al carrito`, type: 'success' });
  };

  // Add specific serial number product
  const addSerialProductToCart = (product: Product, serialNumber: string) => {
    if (reservedSerialNumbers.has(serialNumber)) {
      setScanToast({
        message: `El número de serie ${serialNumber} ya se encuentra en el carrito`,
        type: 'warning',
      });
      return false;
    }

    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        serialNumber,
        price: product.price,
        quantity: 1,
        subtotal: product.price,
      },
    ]);

    setScanToast({
      message: `Serie [${serialNumber}] vinculada: ${product.name}`,
      type: 'success',
    });
    return true;
  };

  // Handle click on product catalog
  const handleProductCardClick = (product: Product) => {
    if (product.stock <= 0) return;

    if (product.hasSerialNumber) {
      setSnModalProduct(product);
      setSnModalScanInput('');
      setTimeout(() => snModalInputRef.current?.focus(), 150);
    } else {
      addRegularProductToCart(product);
    }
  };

  // Barcode / SN Hardware Scanner Handler (Enter key)
  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = search.trim();
      if (!code) return;

      // 1. Direct SN Match across all products
      const matchedSNProduct = products.find((p) =>
        p.hasSerialNumber && p.serialNumbers?.some((sn) => sn.toLowerCase() === code.toLowerCase()),
      );

      if (matchedSNProduct) {
        const exactSN = matchedSNProduct.serialNumbers?.find(
          (sn) => sn.toLowerCase() === code.toLowerCase(),
        );
        if (exactSN) {
          addSerialProductToCart(matchedSNProduct, exactSN);
          setSearch('');
          searchInputRef.current?.focus();
          return;
        }
      }

      // 2. Direct Barcode or SKU Match
      const matchedBarcodeProduct = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
          p.sku.toLowerCase() === code.toLowerCase(),
      );

      if (matchedBarcodeProduct) {
        if (matchedBarcodeProduct.hasSerialNumber) {
          setSnModalProduct(matchedBarcodeProduct);
          setSnModalScanInput('');
          setTimeout(() => snModalInputRef.current?.focus(), 150);
        } else {
          addRegularProductToCart(matchedBarcodeProduct);
        }
        setSearch('');
        searchInputRef.current?.focus();
        return;
      }

      // 3. If exactly 1 product match in filtered list
      if (filteredProducts.length === 1) {
        handleProductCardClick(filteredProducts[0]);
        setSearch('');
        searchInputRef.current?.focus();
        return;
      }

      setScanToast({
        message: `Código no reconocido: "${code}"`,
        type: 'warning',
      });
    }
  };

  // Handle SN Modal Scan or Enter
  const handleSnModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!snModalProduct) return;

    const inputVal = snModalScanInput.trim();
    if (!inputVal) return;

    const matchedSN = snModalProduct.serialNumbers?.find(
      (sn) => sn.toLowerCase() === inputVal.toLowerCase(),
    );

    if (matchedSN) {
      const added = addSerialProductToCart(snModalProduct, matchedSN);
      if (added) {
        setSnModalScanInput('');
        setSnModalProduct(null);
        searchInputRef.current?.focus();
      }
    } else {
      setScanToast({
        message: `El SN "${inputVal}" no pertenece a este producto o no está disponible`,
        type: 'warning',
      });
    }
  };

  const updateQty = (cartIndex: number, delta: number) => {
    setCart((prev) => {
      const item = prev[cartIndex];
      if (!item) return prev;

      if (item.serialNumber) {
        if (delta < 0) {
          return prev.filter((_, idx) => idx !== cartIndex);
        }
        return prev;
      }

      const product = products.find((p) => p.id === item.productId);
      const newQty = Math.max(0, Math.min(item.quantity + delta, product?.stock ?? 0));

      if (newQty === 0) {
        return prev.filter((_, idx) => idx !== cartIndex);
      }

      return prev.map((i, idx) =>
        idx === cartIndex ? { ...i, quantity: newQty, subtotal: newQty * i.price } : i,
      );
    });
  };

  const removeCartIndex = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomerId(null);
    setCustomerSearchQuery('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setIsAdvance(false);
    setAdvanceAmount('');
    setSplitCash('');
    setSplitCard('');
    setSplitTransfer('');
    setSplitOther('');
  };

  const handleOpenCashRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(initialAmountInput);
    if (isNaN(amount) || amount < 0) return;
    openCashRegister(amount, openRegisterNotes);
    setOpenRegisterModal(false);
    setScanToast({ message: `Caja abierta con Bs. ${amount.toFixed(2)}`, type: 'success' });
  };

  const completeSale = () => {
    if (cart.length === 0) return;

    if (!activeRegisterSession || activeRegisterSession.status !== 'open') {
      setOpenRegisterModal(true);
      return;
    }

    if (paymentMethod === 'Pago Mixto' && Math.abs(splitDifference) > 0.01) {
      alert(`El desglose del pago mixto debe sumar exactamente ${formatCurrency(targetChargeAmount)}`);
      return;
    }

    let finalCustomerId: string | null = selectedCustomerId;
    let finalCustomerName = 'Cliente General';

    if (customerMode === 'new' && newCustomerName.trim()) {
      const created = addCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || 'S/N',
      });
      finalCustomerId = created.id;
      finalCustomerName = created.name;
    } else if (selectedCustomerObj) {
      finalCustomerName = selectedCustomerObj.name;
    }

    const splits: PaymentSplit[] = [];
    if (paymentMethod === 'Pago Mixto') {
      if (Number(splitCash) > 0) splits.push({ method: 'Efectivo', amount: Number(splitCash) });
      if (Number(splitCard) > 0) splits.push({ method: 'Tarjeta', amount: Number(splitCard) });
      if (Number(splitTransfer) > 0)
        splits.push({ method: 'Transferencia QR', amount: Number(splitTransfer) });
      if (Number(splitOther) > 0) splits.push({ method: 'Otro', amount: Number(splitOther) });
    }

    const sale = addSale({
      documentType,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      cashierId: activeRegisterSession.cashierId,
      cashierName: activeRegisterSession.cashierName,
      items: cart,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      isAdvance,
      advanceAmount: isAdvance ? parsedAdvance : undefined,
      pendingBalance: isAdvance ? pendingBalance : undefined,
      paymentSplits: splits.length > 0 ? splits : undefined,
      status: 'Completada',
    });

    setReceipt(sale);
    setCheckoutOpen(false);
    clearCart();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden animate-slide-up relative">
      {/* Toast Notification */}
      {scanToast && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold transition-all animate-bounce ${
            scanToast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          {scanToast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          <span>{scanToast.message}</span>
        </div>
      )}

      {/* Top Banner: Cash Register Status Indicator */}
      <div className="bg-white border border-ink-100 rounded-xl px-4 py-2 mb-3 shrink-0 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {activeRegisterSession?.status === 'open' ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Caja Abierta ({activeRegisterSession.id})
              </span>
              <span className="text-xs text-ink-600 hidden sm:inline">
                Cajero: <strong>{activeRegisterSession.cashierName}</strong> • Inicial:{' '}
                <strong>{formatCurrency(activeRegisterSession.openingAmount)}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                Caja Cerrada (Ventas Bloqueadas)
              </span>
              <span className="text-xs text-ink-500 hidden sm:inline">
                Abre turno de caja para habilitar transacciones
              </span>
            </div>
          )}
        </div>

        <div>
          {activeRegisterSession?.status === 'open' ? (
            <span className="text-xs text-ink-500 font-medium font-mono">
              Esperado en caja: <strong>{formatCurrency(activeRegisterSession.expectedCash)}</strong>
            </span>
          ) : (
            <button
              onClick={() => setOpenRegisterModal(true)}
              className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Unlock size={14} /> Abrir Caja Ahora
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Catalog / Right Cart */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Product Catalog Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-white rounded-xl border border-ink-100 p-3 shadow-sm">
          {/* Search Bar with Hardware Scanner Support */}
          <div className="space-y-2 pb-2 shrink-0 border-b border-ink-100">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-600" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanear Barcode / Serial (SN) o buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleScannerKeyDown}
                  className="input pl-10 pr-24 text-sm bg-ink-50/70 focus:bg-white border-ink-200 font-medium"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="text-[10px] font-mono bg-ink-200 text-ink-700 px-1.5 py-0.5 rounded font-bold">
                    ↵ ENTER
                  </span>
                </div>
              </div>

              {/* Brand Filter */}
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
              {filteredProducts.map((product) => {
                const availableSNCount = product.hasSerialNumber
                  ? (product.serialNumbers?.filter((sn) => !reservedSerialNumbers.has(sn)).length ?? 0)
                  : product.stock;

                const isOutOfStock = availableSNCount <= 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductCardClick(product)}
                    disabled={isOutOfStock}
                    className="card card-hover p-2.5 text-left group disabled:opacity-50 disabled:cursor-not-allowed relative flex flex-col justify-between bg-white border border-ink-100 transition-all hover:border-brand-300"
                  >
                    <div>
                      {/* Product Image Thumbnail */}
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

                        {product.hasSerialNumber && (
                          <span className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-0.5 shadow-sm">
                            <QrCode size={9} /> SN
                          </span>
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
                      <Badge
                        color={
                          isOutOfStock ? 'red' : availableSNCount <= product.minStock ? 'amber' : 'green'
                        }
                      >
                        {availableSNCount} {product.hasSerialNumber ? 'SNs' : 'unid.'}
                      </Badge>
                    </div>

                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-white/85 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          AGOTADO
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-16 text-ink-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No se encontraron productos coincidentes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Sidebar Column (Fixed Height, Independent Scroll) */}
        <div className="w-full lg:w-96 shrink-0 card flex flex-col h-full bg-white shadow-sm overflow-hidden border border-ink-100">
          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between shrink-0 bg-ink-50/50">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-brand-600" />
              <h3 className="font-bold text-ink-900 text-sm">Carrito de Compra</h3>
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

          {/* Document Type Selector (Nota de Venta / Factura) */}
          <div className="px-4 py-2 border-b border-ink-100 bg-ink-50/30 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDocumentType('Nota de venta')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                  documentType === 'Nota de venta'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-100'
                }`}
              >
                <Receipt size={13} />
                Nota de venta
              </button>
              <button
                type="button"
                onClick={() => setDocumentType('Factura')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                  documentType === 'Factura'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-100'
                }`}
              >
                <FileText size={13} />
                Factura (13%)
              </button>
            </div>
          </div>

          {/* Customer Selection Box (Searchable by Name OR Phone) */}
          <div className="px-4 py-2 border-b border-ink-100 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
              <span>Cliente</span>
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
                      title="Quitar cliente"
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
                          <span>Cliente General (Mostrador)</span>
                          <span className="text-[10px] text-ink-400">Sin registro</span>
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
                            <span className="badge bg-ink-100 text-ink-600 text-[9px]">
                              {c.visits} compras
                            </span>
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

          {/* Scrollable Cart Items Container */}
          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ink-400 py-8">
                <ShoppingCart size={36} className="mb-2 opacity-30" />
                <p className="text-xs font-medium text-center">
                  Escanea códigos o haz clic en los productos para agregarlos
                </p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={`${item.productId}-${item.serialNumber || index}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-ink-50 border border-ink-100 hover:border-brand-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink-800 truncate">{item.name}</p>
                    {item.serialNumber ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-bold mt-0.5">
                        <QrCode size={10} /> SN: {item.serialNumber}
                      </span>
                    ) : (
                      <p className="text-[11px] text-ink-500 font-medium">
                        {formatCurrency(item.price)}
                      </p>
                    )}
                  </div>

                  {!item.serialNumber ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(index, -1)}
                        className="w-5 h-5 rounded bg-white border border-ink-200 flex items-center justify-center hover:bg-ink-100 transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(index, 1)}
                        className="w-5 h-5 rounded bg-white border border-ink-200 flex items-center justify-center hover:bg-ink-100 transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-ink-500 px-1">1 unid.</span>
                  )}

                  <span className="text-xs font-bold text-ink-900 w-16 text-right">
                    {formatCurrency(item.subtotal)}
                  </span>

                  <button
                    onClick={() => removeCartIndex(index)}
                    className="p-1 text-ink-300 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Bottom Fixed Summary & Checkout Button */}
          {cart.length > 0 && (
            <div className="border-t border-ink-100 px-4 py-3 space-y-2 bg-ink-50/80 shrink-0">
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

              {documentType === 'Factura' && (
                <div className="flex items-center justify-between text-xs text-brand-700 bg-brand-50 p-1.5 rounded-md">
                  <span className="font-semibold">IVA Ley (13%)</span>
                  <span className="font-bold">{formatCurrency(tax)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-ink-200">
                <span className="text-sm font-bold text-ink-900">Total Venta</span>
                <span className="text-lg font-bold text-brand-600">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={() => {
                  if (!activeRegisterSession || activeRegisterSession.status !== 'open') {
                    setOpenRegisterModal(true);
                  } else {
                    setCheckoutOpen(true);
                  }
                }}
                className="btn-primary w-full py-2.5 font-bold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Cobrar {documentType} ({formatCurrency(total)})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Serial Number Selector Rapid Modal */}
      <Modal
        open={!!snModalProduct}
        onClose={() => setSnModalProduct(null)}
        title="Seleccionar Número de Serie (SN)"
        subtitle={snModalProduct?.name}
        size="md"
      >
        {snModalProduct && (
          <div className="space-y-4">
            <form onSubmit={handleSnModalSubmit} className="space-y-1.5">
              <label className="label text-xs">Escanear o Escribir Número de Serie Físico:</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" />
                  <input
                    ref={snModalInputRef}
                    type="text"
                    placeholder="Ej. SN-DELL-XPS-001..."
                    value={snModalScanInput}
                    onChange={(e) => setSnModalScanInput(e.target.value)}
                    className="input pl-9 text-xs font-mono font-bold"
                  />
                </div>
                <button type="submit" className="btn-primary text-xs px-3 bg-purple-600 hover:bg-purple-700">
                  Confirmar SN
                </button>
              </div>
            </form>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink-500 uppercase">
                  Series Disponibles en Stock ({snModalProduct.serialNumbers?.length ?? 0}):
                </span>
                <span className="text-[11px] text-purple-600 font-medium">
                  Haz clic en un SN para asignarlo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                {snModalProduct.serialNumbers?.map((sn) => {
                  const isReserved = reservedSerialNumbers.has(sn);
                  return (
                    <button
                      key={sn}
                      type="button"
                      disabled={isReserved}
                      onClick={() => {
                        const added = addSerialProductToCart(snModalProduct, sn);
                        if (added) setSnModalProduct(null);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isReserved
                          ? 'bg-ink-100 border-ink-200 opacity-40 cursor-not-allowed'
                          : 'bg-white border-purple-200 hover:border-purple-500 hover:bg-purple-50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-purple-700">
                        <QrCode size={12} />
                        <span className="font-mono text-xs font-bold truncate">{sn}</span>
                      </div>
                      <span className="text-[10px] text-ink-400 mt-1">
                        {isReserved ? 'En Carrito' : 'Disponible'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-ink-100">
              <button
                type="button"
                onClick={() => setSnModalProduct(null)}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cash Register Opening Barrier Modal */}
      <Modal
        open={openRegisterModal}
        onClose={() => setOpenRegisterModal(false)}
        title="Apertura de Caja Obligatoria"
        subtitle="Se requiere abrir el turno de caja antes de procesar ventas"
        size="sm"
      >
        <form onSubmit={handleOpenCashRegisterSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800">
            <Lock size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs">
              No es posible realizar cobros sin una caja activa. Ingresa el fondo de cambio o monto
              inicial para iniciar el turno.
            </p>
          </div>

          <div>
            <label className="label">Monto Inicial en Efectivo (Bs.)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-400 text-sm">
                Bs.
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={initialAmountInput}
                onChange={(e) => setInitialAmountInput(e.target.value)}
                className="input pl-10 text-base font-bold text-ink-900"
                placeholder="500.00"
              />
            </div>
          </div>

          <div>
            <label className="label">Observaciones o Notas de Apertura</label>
            <input
              type="text"
              value={openRegisterNotes}
              onChange={(e) => setOpenRegisterNotes(e.target.value)}
              className="input text-xs"
              placeholder="Ej. Billetes de 20 y 50 para cambio..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenRegisterModal(false)}
              className="btn-secondary flex-1 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              <Unlock size={14} /> Confirmar Apertura
            </button>
          </div>
        </form>
      </Modal>

      {/* Checkout Modal with Advance and Mixed Payment options */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title={`Cobro de ${documentType}`}
        subtitle={`Total Transacción: ${formatCurrency(total)}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Method Selection */}
          <div>
            <label className="label text-xs">Método de Pago</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethodsList.map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === pm
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                      : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-white'
                  }`}
                >
                  <CreditCard size={13} />
                  <span>{pm}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mixed Payment Split Fields */}
          {paymentMethod === 'Pago Mixto' && (
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2 animate-slide-up">
              <span className="text-xs font-bold text-purple-950 block">
                Desglose de Pago Combinado / Mixto (Bs.):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-ink-500 font-bold uppercase">Efectivo</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="input text-xs py-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-ink-500 font-bold uppercase">Tarjeta / POS</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="input text-xs py-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-ink-500 font-bold uppercase">Transferencia QR</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={splitTransfer}
                    onChange={(e) => setSplitTransfer(e.target.value)}
                    className="input text-xs py-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-ink-500 font-bold uppercase">Otro / Cheque</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={splitOther}
                    onChange={(e) => setSplitOther(e.target.value)}
                    className="input text-xs py-1"
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs pt-1 border-t border-purple-200">
                <span className="font-semibold text-purple-900">Total distribuido:</span>
                <span
                  className={`font-bold ${
                    Math.abs(splitDifference) < 0.01 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(totalSplitSum)} de {formatCurrency(targetChargeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Advance / Partial Payment Toggle */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  <Wallet size={14} className="text-amber-700" />
                  ¿Registrar con Adelanto / Pago a Cuenta?
                </span>
                <p className="text-[11px] text-amber-800">
                  Permite abonar un anticipo y dejar saldo pendiente por cobrar.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdvance}
                  onChange={(e) => {
                    setIsAdvance(e.target.checked);
                    if (e.target.checked && !advanceAmount) {
                      setAdvanceAmount(String(Math.round(total / 2)));
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {isAdvance && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200 text-xs animate-slide-up">
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase">
                    Monto Adelanto (Bs.) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={total}
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="input text-xs font-bold text-emerald-700 bg-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase">
                    Saldo Pendiente
                  </label>
                  <p className="text-sm font-extrabold text-red-600 pt-1.5">
                    {formatCurrency(pendingBalance)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Financial summary breakdown */}
          <div className="p-3.5 rounded-xl bg-ink-50 space-y-1.5 border border-ink-100 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-500">Comprobante</span>
              <Badge color="blue">{documentType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Cliente</span>
              <span className="font-semibold text-ink-900">
                {customerMode === 'new'
                  ? newCustomerName || 'Nuevo Cliente'
                  : selectedCustomerObj?.name ?? 'Cliente General'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Total Venta</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            {isAdvance && (
              <div className="flex justify-between text-amber-800 font-bold">
                <span>Cobro de Adelanto Hoy:</span>
                <span className="text-emerald-700">{formatCurrency(parsedAdvance)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCheckoutOpen(false)} className="btn-secondary flex-1 text-xs">
              Cancelar
            </button>
            <button
              onClick={completeSale}
              className="btn-primary flex-1 text-xs font-bold bg-brand-600 hover:bg-brand-700"
            >
              <CheckCircle2 size={16} />
              Confirmar Transacción
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal with Print Support */}
      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Venta Registrada Exitosamente"
        size="md"
      >
        {receipt && <ReceiptPrint sale={receipt} onClose={() => setReceipt(null)} />}
      </Modal>
    </div>
  );
}
