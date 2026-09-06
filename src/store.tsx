import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
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
  Branch,
  CreditAccount,
  CreditPayment,
  SystemSettings,
} from './types';
import {
  mockProducts,
  mockSuppliers,
  mockCustomers,
  mockUsers,
  mockSales,
  mockMovements,
  mockBranches,
  mockCreditAccounts,
  defaultSystemSettings,
} from './mockData';
import { posSound } from './utils/sound';

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
  branches: Branch[];
  creditAccounts: CreditAccount[];
  systemSettings: SystemSettings;
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
  addBranch: (b: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, b: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  addCreditAccount: (c: Omit<CreditAccount, 'id' | 'folio' | 'createdAt' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments'>) => void;
  addCreditPayment: (accountId: string, payment: Omit<CreditPayment, 'id' | 'date'>) => void;
  updateCreditAccount: (id: string, c: Partial<CreditAccount>) => void;
  deleteCreditAccount: (id: string) => void;
  updateSystemSettings: (s: Partial<SystemSettings>) => void;
  restoreDatabase: (data: {
    products?: Product[];
    suppliers?: Supplier[];
    customers?: Customer[];
    movements?: Movement[];
    sales?: Sale[];
    branches?: Branch[];
    creditAccounts?: CreditAccount[];
    systemSettings?: SystemSettings;
  }) => void;
}

const StoreContext = createContext<StoreState | null>(null);

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}${++idCounter}`;

let folioCounter = 126;
const nextFolio = () => `V-${String(folioCounter++).padStart(5, '0')}`;

let quoteFolioCounter = 501;
const nextQuoteFolio = () => `COT-${String(quoteFolioCounter++).padStart(5, '0')}`;

let creditFolioCounter = 103;
const nextCreditFolio = (type: 'cobrar' | 'pagar') =>
  `${type === 'cobrar' ? 'CC' : 'CP'}-${String(creditFolioCounter++).padStart(5, '0')}`;

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
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>(mockCreditAccounts);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

  // Sync sound settings with Audio synthesizer
  useEffect(() => {
    posSound.setEnabled(systemSettings.scannerBeepEnabled);
  }, [systemSettings.scannerBeepEnabled]);

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
    transferSales: 4600,
    otherSales: 0,
    cashIn: 100,
    cashOut: 50,
    expectedCash: 4050,
    cashMovements: [
      {
        id: 'cm-1',
        type: 'ingreso',
        amount: 100,
        reason: 'Cambio inicial adicional',
        cashierName: 'Admin Principal',
        createdAt: '2026-09-05T09:30:00',
      },
      {
        id: 'cm-2',
        type: 'egreso',
        amount: 50,
        reason: 'Compra de insumos de limpieza',
        cashierName: 'Admin Principal',
        createdAt: '2026-09-05T11:00:00',
      },
    ],
  });

  const [registerHistory, setRegisterHistory] = useState<CashRegisterSession[]>([
    {
      id: 'reg-000',
      cashierId: 'u2',
      cashierName: 'Ricardo Hernández',
      openingAmount: 500,
      openedAt: '2026-09-04T08:00:00',
      closedAt: '2026-09-04T20:00:00',
      status: 'closed',
      cashSales: 12400,
      cardSales: 8900,
      transferSales: 6500,
      otherSales: 0,
      cashIn: 0,
      cashOut: 150,
      expectedCash: 12750,
      actualCash: 12750,
      difference: 0,
      confirmedCardSales: 8900,
      confirmedTransferSales: 6500,
      confirmedOtherSales: 0,
      notes: 'Cierre de turno sin novedades. Cuadre exacto.',
      cashMovements: [
        {
          id: 'cm-0a',
          type: 'egreso',
          amount: 150,
          reason: 'Pago taxi mensajería urgente',
          cashierName: 'Ricardo Hernández',
          createdAt: '2026-09-04T14:10:00',
        },
      ],
    },
  ]);

  const addCategory = useCallback((name: string) => {
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const deleteCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  }, []);

  const addBrand = useCallback((name: string) => {
    setBrands((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const deleteBrand = useCallback((name: string) => {
    setBrands((prev) => prev.filter((b) => b !== name));
  }, []);

  const addPaymentMethod = useCallback((name: string) => {
    setPaymentMethodsList((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const deletePaymentMethod = useCallback((name: string) => {
    setPaymentMethodsList((prev) => prev.filter((m) => m !== name));
  }, []);

  const openCashRegister = useCallback((openingAmount: number, notes?: string) => {
    const newSession: CashRegisterSession = {
      id: nextId('reg-'),
      cashierId: 'u1',
      cashierName: 'Admin Principal',
      openingAmount,
      openedAt: new Date().toISOString(),
      status: 'open',
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      otherSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingAmount,
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
        status: 'closed',
        closedAt: new Date().toISOString(),
        actualCash: data.actualCash,
        difference: data.actualCash - activeRegisterSession.expectedCash,
        confirmedCardSales: data.confirmedCardSales ?? activeRegisterSession.cardSales,
        confirmedTransferSales:
          data.confirmedTransferSales ?? activeRegisterSession.transferSales,
        confirmedOtherSales: data.confirmedOtherSales ?? activeRegisterSession.otherSales,
        notes: data.notes ?? activeRegisterSession.notes,
      };

      setRegisterHistory((prev) => [closedSession, ...prev]);
      setActiveRegisterSession(null);
    },
    [activeRegisterSession],
  );

  const addCashMovement = useCallback(
    (type: 'ingreso' | 'egreso', amount: number, reason: string) => {
      if (!activeRegisterSession) return;
      const movement: CashMovement = {
        id: nextId('cm-'),
        type,
        amount,
        reason,
        cashierName: activeRegisterSession.cashierName,
        createdAt: new Date().toISOString(),
      };

      setActiveRegisterSession((prev) => {
        if (!prev) return null;
        const newCashIn = type === 'ingreso' ? prev.cashIn + amount : prev.cashIn;
        const newCashOut = type === 'egreso' ? prev.cashOut + amount : prev.cashOut;
        const newExpected = prev.openingAmount + prev.cashSales + newCashIn - newCashOut;

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
    const newProduct: Product = {
      ...p,
      id: nextId('p'),
      stock: p.hasSerialNumber ? (p.serialNumbers?.length ?? 0) : p.stock,
    };
    setProducts((prev) => [newProduct, ...prev]);
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...patch };
          if (updated.hasSerialNumber && updated.serialNumbers) {
            updated.stock = updated.serialNumbers.length;
          }
          return updated;
        }
        return p;
      }),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addSupplier = useCallback((s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...s,
      id: nextId('sup'),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
  }, []);

  const updateSupplier = useCallback((id: string, patch: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addCustomer = useCallback(
    (c: Omit<Customer, 'id' | 'totalPurchases' | 'visits' | 'createdAt'>) => {
      const today = new Date().toISOString().split('T')[0];
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

  // Enhanced addMovement supporting multiple SNs in single transaction
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

          // Collect all SNs from this movement
          const incomingSNs: string[] = [];
          if (m.serialNumbers && m.serialNumbers.length > 0) {
            incomingSNs.push(...m.serialNumbers.filter(Boolean));
          } else if (m.serialNumber) {
            incomingSNs.push(m.serialNumber);
          }

          if (incomingSNs.length > 0) {
            if (m.quantity > 0) {
              // Entrada: add SNs
              incomingSNs.forEach((sn) => {
                if (!updatedSNs.includes(sn)) {
                  updatedSNs.push(sn);
                }
              });
            } else {
              // Salida: remove SNs
              updatedSNs = updatedSNs.filter((sn) => !incomingSNs.includes(sn));
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

  // Branch management
  const addBranch = useCallback((b: Omit<Branch, 'id'>) => {
    const newBranch: Branch = {
      ...b,
      id: nextId('br-'),
    };
    setBranches((prev) => [...prev, newBranch]);
  }, []);

  const updateBranch = useCallback((id: string, patch: Partial<Branch>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBranch = useCallback((id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Credits / Accounts Receivable & Payable management
  const addCreditAccount = useCallback(
    (c: Omit<CreditAccount, 'id' | 'folio' | 'createdAt' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments'>) => {
      const newCredit: CreditAccount = {
        ...c,
        id: nextId('crd-'),
        folio: nextCreditFolio(c.type),
        paidAmount: 0,
        remainingAmount: c.totalAmount,
        status: 'vigente',
        payments: [],
        createdAt: new Date().toISOString(),
      };
      setCreditAccounts((prev) => [newCredit, ...prev]);
    },
    [],
  );

  const addCreditPayment = useCallback(
    (accountId: string, payment: Omit<CreditPayment, 'id' | 'date'>) => {
      const newPayment: CreditPayment = {
        ...payment,
        id: nextId('cp-'),
        date: new Date().toISOString(),
      };

      setCreditAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === accountId) {
            const updatedPayments = [newPayment, ...acc.payments];
            const newPaid = acc.paidAmount + payment.amount;
            const newRemaining = Math.max(0, acc.totalAmount - newPaid);
            const newStatus: CreditAccount['status'] = newRemaining <= 0 ? 'pagado' : 'vigente';

            return {
              ...acc,
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              status: newStatus,
              payments: updatedPayments,
            };
          }
          return acc;
        }),
      );
    },
    [],
  );

  const updateCreditAccount = useCallback((id: string, patch: Partial<CreditAccount>) => {
    setCreditAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...acc, ...patch } : acc)));
  }, []);

  const deleteCreditAccount = useCallback((id: string) => {
    setCreditAccounts((prev) => prev.filter((acc) => acc.id !== id));
  }, []);

  const updateSystemSettings = useCallback((patch: Partial<SystemSettings>) => {
    setSystemSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const restoreDatabase = useCallback(
    (data: {
      products?: Product[];
      suppliers?: Supplier[];
      customers?: Customer[];
      movements?: Movement[];
      sales?: Sale[];
      branches?: Branch[];
      creditAccounts?: CreditAccount[];
      systemSettings?: SystemSettings;
    }) => {
      if (data.products) setProducts(data.products);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.customers) setCustomers(data.customers);
      if (data.movements) setMovements(data.movements);
      if (data.sales) setSales(data.sales);
      if (data.branches) setBranches(data.branches);
      if (data.creditAccounts) setCreditAccounts(data.creditAccounts);
      if (data.systemSettings) setSystemSettings(data.systemSettings);
    },
    [],
  );

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
        branches,
        creditAccounts,
        systemSettings,
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
        addBranch,
        updateBranch,
        deleteBranch,
        addCreditAccount,
        addCreditPayment,
        updateCreditAccount,
        deleteCreditAccount,
        updateSystemSettings,
        restoreDatabase,
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
