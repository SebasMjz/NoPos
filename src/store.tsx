import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  Product,
  Supplier,
  Customer,
  User,
  Sale,
  Quote,
  Movement,
  CashRegisterSession,
  CashMovement,
} from './types';
import {
  mockProducts,
  mockSuppliers,
  mockCustomers,
  mockUsers,
  mockSales,
  mockMovements,
} from './mockData';

interface StoreState {
  categories: string[];
  brands: string[];
  paymentMethodsList: string[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  users: User[];
  sales: Sale[];
  quotes: Quote[];
  movements: Movement[];
  activeRegisterSession: CashRegisterSession | null;
  registerHistory: CashRegisterSession[];
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  addBrand: (name: string) => void;
  deleteBrand: (name: string) => void;
  addPaymentMethod: (name: string) => void;
  deletePaymentMethod: (name: string) => void;
  openCashRegister: (openingAmount: number, notes?: string) => void;
  closeCashRegister: (data: {
    actualCash: number;
    confirmedCardSales?: number;
    confirmedTransferSales?: number;
    confirmedOtherSales?: number;
    notes?: string;
  }) => void;
  addCashMovement: (type: 'ingreso' | 'egreso', amount: number, reason: string) => void;
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addSupplier: (s: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addCustomer: (c: Omit<Customer, 'id' | 'totalPurchases' | 'visits' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addUser: (u: Omit<User, 'id' | 'lastLogin'>) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addSale: (sale: Omit<Sale, 'id' | 'folio' | 'createdAt'>) => Sale;
  cancelSale: (id: string) => void;
  addQuote: (quote: Omit<Quote, 'id' | 'folio' | 'createdAt'>) => Quote;
  deleteQuote: (id: string) => void;
  addMovement: (m: Omit<Movement, 'id' | 'createdAt'>) => void;
}

const StoreContext = createContext<StoreState | null>(null);

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}${++idCounter}`;

let folioCounter = 126;
const nextFolio = () => `V-${String(folioCounter++).padStart(5, '0')}`;

let quoteFolioCounter = 501;
const nextQuoteFolio = () => `COT-${String(quoteFolioCounter++).padStart(5, '0')}`;

const initialCategories = [
  'Laptops',
  'Desktops',
  'Componentes',
  'Periféricos',
  'Monitores',
  'Redes',
  'Accesorios',
];

const initialBrands = [
  'ASUS',
  'Lenovo',
  'Dell',
  'HP',
  'Apple',
  'Samsung',
  'Corsair',
  'Kingston',
  'Logitech',
  'HyperX',
  'MSI',
  'Gigabyte',
  'AMD',
  'Intel',
  'NVIDIA',
  'LG',
  'Razer',
  'TP-Link',
  'NoRest PC',
];

const initialPaymentMethods = [
  'Efectivo',
  'Tarjeta',
  'Transferencia',
  'Crédito',
  'Pago Mixto',
  'Tigo Money',
  'Cheque',
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [brands, setBrands] = useState<string[]>(initialBrands);
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(initialPaymentMethods);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [movements, setMovements] = useState<Movement[]>(mockMovements);

  // Quotes state
  const [quotes, setQuotes] = useState<Quote[]>([
    {
      id: 'q-101',
      folio: 'COT-00501',
      documentType: 'Cotización Proforma',
      customerId: 'c1',
      customerName: 'Carlos Mendoza',
      customerPhone: '70123456',
      agentName: 'Admin Principal',
      items: [
        {
          productId: 'p1',
          name: 'Laptop Dell Inspiron 15 3520 Intel i5',
          sku: 'DELL-INSP-3520',
          price: 4600,
          quantity: 1,
          subtotal: 4600,
        },
        {
          productId: 'p7',
          name: 'Audífonos Gamer HyperX Cloud III',
          sku: 'HPX-CLOUD-3',
          price: 1400,
          quantity: 1,
          subtotal: 1400,
        },
      ],
      subtotal: 6000,
      discount: 200,
      tax: 0,
      total: 5800,
      validUntil: '2026-09-12T23:59:59',
      notes: 'Precios válidos por 7 días calendario o hasta agotar stock.',
      createdAt: '2026-09-05T09:00:00',
    },
  ]);

  // Cash Register State
  const [activeRegisterSession, setActiveRegisterSession] = useState<CashRegisterSession | null>({
    id: 'reg-001',
    cashierId: 'u1',
    cashierName: 'Admin Principal',
    openingAmount: 500,
    openedAt: '2026-09-05T08:00:00',
    status: 'open',
    cashSales: 3500,
    cardSales: 5200,
    transferSales: 4100,
    otherSales: 0,
    cashIn: 200,
    cashOut: 150,
    expectedCash: 4050, // 500 + 3500 + 200 - 150
    salesList: mockSales.slice(0, 3),
    cashMovements: [
      {
        id: 'cm-1',
        type: 'ingreso',
        amount: 200,
        reason: 'Sencillo inicial para cambio',
        cashierName: 'Admin Principal',
        createdAt: '2026-09-05T08:30:00',
      },
      {
        id: 'cm-2',
        type: 'egreso',
        amount: 150,
        reason: 'Pago de servicio delivery local',
        cashierName: 'Admin Principal',
        createdAt: '2026-09-05T10:15:00',
      },
    ],
  });

  const [registerHistory, setRegisterHistory] = useState<CashRegisterSession[]>([
    {
      id: 'reg-000',
      cashierId: 'u4',
      cashierName: 'Diego Martínez',
      openingAmount: 500,
      openedAt: '2026-09-04T08:00:00',
      closedAt: '2026-09-04T19:30:00',
      status: 'closed',
      cashSales: 4800,
      cardSales: 6300,
      transferSales: 3200,
      otherSales: 0,
      cashIn: 0,
      cashOut: 200,
      expectedCash: 5100,
      actualCash: 5100,
      difference: 0,
      confirmedCardSales: 6300,
      confirmedTransferSales: 3200,
      notes: 'Cierre de turno perfecto con verificación total de vouchers POS y transferencias QR.',
      salesList: mockSales.slice(3, 7),
      cashMovements: [
        {
          id: 'cm-0',
          type: 'egreso',
          amount: 200,
          reason: 'Compra de suministros de limpieza',
          cashierName: 'Diego Martínez',
          createdAt: '2026-09-04T14:00:00',
        },
      ],
    },
  ]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
  }, []);

  const deleteCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c.toLowerCase() !== name.trim().toLowerCase()));
  }, []);

  const addBrand = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBrands((prev) => {
      if (prev.some((b) => b.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
  }, []);

  const deleteBrand = useCallback((name: string) => {
    setBrands((prev) => prev.filter((b) => b.toLowerCase() !== name.trim().toLowerCase()));
  }, []);

  const addPaymentMethod = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPaymentMethodsList((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const deletePaymentMethod = useCallback((name: string) => {
    setPaymentMethodsList((prev) => prev.filter((m) => m !== name));
  }, []);

  const openCashRegister = useCallback((openingAmount: number, notes?: string) => {
    const newSession: CashRegisterSession = {
      id: nextId('reg'),
      cashierId: 'u1',
      cashierName: 'Admin Principal',
      openingAmount: Number(openingAmount) || 0,
      openedAt: new Date().toISOString(),
      status: 'open',
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      otherSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: Number(openingAmount) || 0,
      notes,
      cashMovements: [],
      salesList: [],
    };
    setActiveRegisterSession(newSession);
  }, []);

  const closeCashRegister = useCallback(
    (data: {
      actualCash: number;
      confirmedCardSales?: number;
      confirmedTransferSales?: number;
      confirmedOtherSales?: number;
      notes?: string;
    }) => {
      if (!activeRegisterSession) return;
      const closedSession: CashRegisterSession = {
        ...activeRegisterSession,
        closedAt: new Date().toISOString(),
        status: 'closed',
        actualCash: Number(data.actualCash),
        difference: Number(data.actualCash) - activeRegisterSession.expectedCash,
        confirmedCardSales: data.confirmedCardSales ?? activeRegisterSession.cardSales,
        confirmedTransferSales: data.confirmedTransferSales ?? activeRegisterSession.transferSales,
        confirmedOtherSales: data.confirmedOtherSales ?? activeRegisterSession.otherSales,
        notes: data.notes || activeRegisterSession.notes,
      };

      setRegisterHistory((prev) => [closedSession, ...prev]);
      setActiveRegisterSession(null);
    },
    [activeRegisterSession],
  );

  const addCashMovement = useCallback(
    (type: 'ingreso' | 'egreso', amount: number, reason: string) => {
      if (!activeRegisterSession) return;
      const parsedAmount = Math.abs(Number(amount)) || 0;
      const movement: CashMovement = {
        id: nextId('cm'),
        type,
        amount: parsedAmount,
        reason: reason.trim() || (type === 'ingreso' ? 'Ingreso de efectivo' : 'Egreso de caja'),
        cashierName: 'Admin Principal',
        createdAt: new Date().toISOString(),
      };

      setActiveRegisterSession((prev) => {
        if (!prev) return null;
        const newCashIn = type === 'ingreso' ? prev.cashIn + parsedAmount : prev.cashIn;
        const newCashOut = type === 'egreso' ? prev.cashOut + parsedAmount : prev.cashOut;
        const newExpected =
          prev.openingAmount + prev.cashSales + newCashIn - newCashOut;

        return {
          ...prev,
          cashIn: newCashIn,
          cashOut: newCashOut,
          expectedCash: newExpected,
          cashMovements: [movement, ...prev.cashMovements],
        };
      });
    },
    [activeRegisterSession],
  );

  const addProduct = useCallback((p: Omit<Product, 'id'>) => {
    const finalStock = p.hasSerialNumber ? (p.serialNumbers?.length ?? 0) : p.stock;
    setProducts((prev) => [{ ...p, stock: finalStock, id: nextId('p') }, ...prev]);
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...patch };
        if (updated.hasSerialNumber) {
          updated.stock = updated.serialNumbers?.length ?? 0;
        }
        return updated;
      }),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addSupplier = useCallback((s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const today = new Date().toISOString().slice(0, 10);
    setSuppliers((prev) => [{ ...s, id: nextId('sup'), createdAt: today }, ...prev]);
  }, []);

  const updateSupplier = useCallback((id: string, patch: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addCustomer = useCallback(
    (c: Omit<Customer, 'id' | 'totalPurchases' | 'visits' | 'createdAt'>) => {
      const today = new Date().toISOString().slice(0, 10);
      const newCustomer: Customer = {
        ...c,
        id: nextId('c'),
        totalPurchases: 0,
        visits: 0,
        createdAt: today,
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      return newCustomer;
    },
    [],
  );

  const updateCustomer = useCallback((id: string, patch: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addUser = useCallback((u: Omit<User, 'id' | 'lastLogin'>) => {
    setUsers((prev) => [{ ...u, id: nextId('u'), lastLogin: '—' }, ...prev]);
  }, []);

  const updateUser = useCallback((id: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const addMovement = useCallback((m: Omit<Movement, 'id' | 'createdAt'>) => {
    const newMovement: Movement = {
      ...m,
      id: nextId('m'),
      createdAt: new Date().toISOString(),
    };
    setMovements((prev) => [newMovement, ...prev]);

    // Update product stock and serial numbers pool
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === m.productId) {
          let updatedSNs = p.serialNumbers ? [...p.serialNumbers] : [];
          if (m.serialNumber) {
            if (m.quantity > 0 && !updatedSNs.includes(m.serialNumber)) {
              updatedSNs.push(m.serialNumber);
            } else if (m.quantity < 0) {
              updatedSNs = updatedSNs.filter((sn) => sn !== m.serialNumber);
            }
          }

          const newStock = p.hasSerialNumber
            ? updatedSNs.length
            : Math.max(0, p.stock + m.quantity);

          return {
            ...p,
            stock: newStock,
            serialNumbers: p.hasSerialNumber ? updatedSNs : p.serialNumbers,
            barcode: m.barcode || p.barcode,
          };
        }
        return p;
      }),
    );
  }, []);

  const addQuote = useCallback((quote: Omit<Quote, 'id' | 'folio' | 'createdAt'>) => {
    const newQuote: Quote = {
      ...quote,
      id: nextId('q'),
      folio: nextQuoteFolio(),
      createdAt: new Date().toISOString(),
    };
    setQuotes((prev) => [newQuote, ...prev]);
    return newQuote;
  }, []);

  const deleteQuote = useCallback((id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const addSale = useCallback(
    (sale: Omit<Sale, 'id' | 'folio' | 'createdAt'>) => {
      const newSale: Sale = {
        ...sale,
        id: nextId('s'),
        folio: nextFolio(),
        registerSessionId: activeRegisterSession?.id,
        createdAt: new Date().toISOString(),
      };
      setSales((prev) => [newSale, ...prev]);

      // Decrement stock & deduct sold serial numbers from pool
      setProducts((prev) =>
        prev.map((p) => {
          const soldItems = sale.items.filter((i) => i.productId === p.id);
          if (soldItems.length === 0) return p;

          const totalSoldQty = soldItems.reduce((sum, item) => sum + item.quantity, 0);
          const soldSNs = soldItems.map((item) => item.serialNumber).filter(Boolean) as string[];

          let updatedSNs = p.serialNumbers ? [...p.serialNumbers] : [];
          if (soldSNs.length > 0) {
            updatedSNs = updatedSNs.filter((sn) => !soldSNs.includes(sn));
          }

          const newStock = p.hasSerialNumber
            ? updatedSNs.length
            : Math.max(0, p.stock - totalSoldQty);

          return {
            ...p,
            stock: newStock,
            serialNumbers: p.hasSerialNumber ? updatedSNs : p.serialNumbers,
          };
        }),
      );

      // Real-time payment calculation (with split payment and advance support)
      setActiveRegisterSession((prev) => {
        if (!prev) return null;
        let cashIncrement = 0;
        let cardIncrement = 0;
        let transferIncrement = 0;
        let otherIncrement = 0;

        const effectivePaymentAmount =
          sale.isAdvance && typeof sale.advanceAmount === 'number'
            ? sale.advanceAmount
            : sale.total;

        if (sale.paymentMethod === 'Pago Mixto' && sale.paymentSplits && sale.paymentSplits.length > 0) {
          sale.paymentSplits.forEach((split) => {
            const m = split.method.toLowerCase();
            if (m.includes('efectivo')) {
              cashIncrement += split.amount;
            } else if (m.includes('tarjeta') || m.includes('pos')) {
              cardIncrement += split.amount;
            } else if (m.includes('transferencia') || m.includes('qr')) {
              transferIncrement += split.amount;
            } else {
              otherIncrement += split.amount;
            }
          });
        } else {
          const m = sale.paymentMethod.toLowerCase();
          if (m.includes('efectivo')) {
            cashIncrement = effectivePaymentAmount;
          } else if (m.includes('tarjeta')) {
            cardIncrement = effectivePaymentAmount;
          } else if (m.includes('transferencia') || m.includes('qr')) {
            transferIncrement = effectivePaymentAmount;
          } else {
            otherIncrement = effectivePaymentAmount;
          }
        }

        const newCashSales = prev.cashSales + cashIncrement;
        const newCardSales = prev.cardSales + cardIncrement;
        const newTransferSales = prev.transferSales + transferIncrement;
        const newOtherSales = prev.otherSales + otherIncrement;
        const newExpected =
          prev.openingAmount + newCashSales + prev.cashIn - prev.cashOut;

        const updatedSalesList = prev.salesList ? [newSale, ...prev.salesList] : [newSale];

        return {
          ...prev,
          cashSales: newCashSales,
          cardSales: newCardSales,
          transferSales: newTransferSales,
          otherSales: newOtherSales,
          expectedCash: newExpected,
          salesList: updatedSalesList,
        };
      });

      // Update customer stats
      if (sale.customerId) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === sale.customerId
              ? {
                  ...c,
                  totalPurchases: c.totalPurchases + sale.total,
                  visits: c.visits + 1,
                }
              : c,
          ),
        );
      }

      return newSale;
    },
    [activeRegisterSession?.id],
  );

  const cancelSale = useCallback((id: string) => {
    setSales((prev) => {
      const sale = prev.find((s) => s.id === id);
      if (!sale || sale.status !== 'Completada') return prev;

      // Restore stock & return serial numbers back to pool
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const cancelledItems = sale.items.filter((i) => i.productId === p.id);
          if (cancelledItems.length === 0) return p;

          const totalRestoreQty = cancelledItems.reduce((sum, item) => sum + item.quantity, 0);
          const restoredSNs = cancelledItems
            .map((item) => item.serialNumber)
            .filter(Boolean) as string[];

          let updatedSNs = p.serialNumbers ? [...p.serialNumbers] : [];
          restoredSNs.forEach((sn) => {
            if (!updatedSNs.includes(sn)) updatedSNs.push(sn);
          });

          const newStock = p.hasSerialNumber
            ? updatedSNs.length
            : p.stock + totalRestoreQty;

          return {
            ...p,
            stock: newStock,
            serialNumbers: p.hasSerialNumber ? updatedSNs : p.serialNumbers,
          };
        }),
      );

      return prev.map((s) => (s.id === id ? { ...s, status: 'Cancelada' as const } : s));
    });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        categories,
        brands,
        paymentMethodsList,
        products,
        suppliers,
        customers,
        users,
        sales,
        quotes,
        movements,
        activeRegisterSession,
        registerHistory,
        addCategory,
        deleteCategory,
        addBrand,
        deleteBrand,
        addPaymentMethod,
        deletePaymentMethod,
        openCashRegister,
        closeCashRegister,
        addCashMovement,
        addProduct,
        updateProduct,
        deleteProduct,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addUser,
        updateUser,
        deleteUser,
        addSale,
        cancelSale,
        addQuote,
        deleteQuote,
        addMovement,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
