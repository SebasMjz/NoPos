export type Category = string;
export type Brand = string;

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hasSerialNumber?: boolean;
  serialNumbers?: string[];
  category: Category;
  brand: Brand;
  price: number;
  stock: number;
  minStock: number;
  image?: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  city: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  totalPurchases: number;
  visits: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Vendedor' | 'Gerente' | 'Cajero';
  status: 'Activo' | 'Inactivo';
  lastLogin: string;
  avatar?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  serialNumber?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface Sale {
  id: string;
  folio: string;
  documentType: 'Factura' | 'Nota de venta';
  customerId: string | null;
  customerName: string;
  cashierId: string;
  cashierName: string;
  registerSessionId?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  isAdvance?: boolean;
  advanceAmount?: number;
  pendingBalance?: number;
  paymentSplits?: PaymentSplit[];
  status: 'Completada' | 'Cancelada' | 'Pendiente';
  createdAt: string;
}

export interface QuoteItem extends SaleItem {}

export interface Quote {
  id: string;
  folio: string;
  documentType: 'Cotización Proforma';
  customerId: string | null;
  customerName: string;
  customerPhone?: string;
  agentName: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  validUntil: string;
  notes?: string;
  createdAt: string;
}

export type MovementSubtype =
  // Entradas
  | 'compra_proveedor'
  | 'devolucion_cliente'
  | 'sobrante_inventario'
  | 'transferencia_entrada'
  | 'reingreso_rma'
  | 'donacion_entrada'
  // Salidas
  | 'salida_rma'
  | 'salida_convenio'
  | 'devolucion_proveedor'
  | 'merma_dano'
  | 'uso_interno'
  | 'faltante_inventario'
  | 'donacion_salida'
  // Ajustes
  | 'auditoria_conteo'
  | 'otro';

export interface Movement {
  id: string;
  type: 'entrada' | 'salida' | 'ajuste';
  subtype?: MovementSubtype;
  supplierId?: string;
  supplierName?: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  serialNumber?: string;
  quantity: number;
  unitCost?: number;
  reason: string;
  reference?: string;
  registerSessionId?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  reason: string;
  cashierName: string;
  createdAt: string;
}

export interface CashRegisterSession {
  id: string;
  cashierId: string;
  cashierName: string;
  openingAmount: number;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  cashSales: number;
  cardSales: number;
  transferSales: number;
  otherSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  confirmedCardSales?: number;
  confirmedTransferSales?: number;
  confirmedOtherSales?: number;
  notes?: string;
  cashMovements: CashMovement[];
  salesList?: Sale[];
}

export type ViewKey =
  | 'dashboard'
  | 'pos'
  | 'quotes'
  | 'cash'
  | 'products'
  | 'sales'
  | 'movements'
  | 'customers'
  | 'distributors'
  | 'users'
  | 'statistics';
