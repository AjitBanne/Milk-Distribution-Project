export type BusinessEntityId = 'morya' | string;

export interface BusinessEntity {
  id: BusinessEntityId;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  code: string;
  fssaiNumber?: string;
  upiId?: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'OPERATOR';

export interface User {
  id: string;
  entityId: BusinessEntityId;
  username: string;
  email: string;
  password: string; // stored for demo authentication
  name: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  entityId: BusinessEntityId;
  name: string;
  mobileNumber: string; // also WhatsApp number
  address: string;
  routeSequence: number;
  openingOutstanding: number;
  currentOutstanding: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductUnit =
  | 'Nos'
  | 'Packet'
  | 'Bottle'
  | 'Cup'
  | 'Kilogram'
  | 'Gram'
  | 'Litre'
  | 'Millilitre'
  | 'Crate';

export interface Product {
  id: string;
  entityId: BusinessEntityId;
  name: string;
  unit: ProductUnit;
  displaySequence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRate {
  id: string;
  entityId: BusinessEntityId;
  customerId: string;
  productId: string;
  rate: number;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  entityId: BusinessEntityId;
  name: string;
  mobileNumber: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPurchaseRate {
  id: string;
  entityId: BusinessEntityId;
  vendorId: string;
  productId: string;
  agreedRate: number;
  updatedAt: string;
}

export interface PurchaseLine {
  productId: string;
  quantity: number;
  purchaseRate: number;
  lineAmount: number;
}

export type PurchaseStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface Purchase {
  id: string;
  entityId: BusinessEntityId;
  purchaseNumber: string;
  vendorId: string;
  purchaseDate: string; // YYYY-MM-DD
  vendorInvoiceNumber: string;
  remarks: string;
  status: PurchaseStatus;
  lines: PurchaseLine[];
  totalAmount: number; // legacy/gross amount
  grossAmount?: number;
  discount?: number;
  roundoff?: number;
  netAmount?: number;
  paidAmount?: number;
  paymentMode?: PaymentMode | 'NONE';
  cashAmount?: number;
  onlineAmount?: number;
  paymentReference?: string;
  remainingAmount?: number;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface VendorPayment {
  id: string;
  entityId: BusinessEntityId;
  paymentNumber: string;
  vendorId: string;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  discount?: number;
  roundoff?: number;
  paymentMode: PaymentMode;
  cashAmount?: number;
  onlineAmount?: number;
  referenceNumber?: string;
  purchaseId?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface DispatchLine {
  productId: string;
  rate: number;
  billedQuantity: number;
  complimentaryQuantity: number;
  lineAmount: number;
}

export type PaymentMode = 'CASH' | 'ONLINE' | 'SPLIT';

export type DispatchStatus = 'DRAFT' | 'POSTED' | 'CANCELLED' | 'REVISED';

export interface Dispatch {
  id: string;
  entityId: BusinessEntityId;
  billNumber: string;
  customerId: string;
  dispatchDate: string; // YYYY-MM-DD
  lines: DispatchLine[];
  grossAmount: number;
  discount: number;
  netAmount: number;
  paymentReceived: number;
  paymentMode?: PaymentMode;
  cashAmount?: number;
  onlineAmount?: number;
  referenceNumber?: string;
  previousOutstanding: number;
  closingOutstanding: number;
  status: DispatchStatus;
  revisionNumber: number;
  editReason?: string;
  originalDispatchId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type ReturnReason =
  | 'Leakage'
  | 'Damaged'
  | 'Wrong Delivery'
  | 'Excess Quantity'
  | 'Other';

export interface CustomerReturnLine {
  productId: string;
  returnQuantity: number;
  rate: number;
  returnAmount: number;
  reason: ReturnReason;
  remarks?: string;
  isComplimentaryReturn?: boolean;
}

export interface CustomerReturn {
  id: string;
  entityId: BusinessEntityId;
  returnNumber: string;
  dispatchId: string;
  customerId: string;
  returnDate: string; // YYYY-MM-DD
  lines: CustomerReturnLine[];
  totalReturnAmount: number;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export type InventoryMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'CUSTOMER_DISPATCH'
  | 'COMPLIMENTARY_DISPATCH'
  | 'CUSTOMER_RETURN'
  | 'DAMAGE'
  | 'STOCK_ADJUSTMENT';

export interface InventoryMovement {
  id: string;
  entityId: BusinessEntityId;
  productId: string;
  type: InventoryMovementType;
  date: string;
  quantityChange: number; // positive increases, negative reduces
  referenceId?: string;
  referenceType?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export type CustomerLedgerEntryType =
  | 'OPENING_BALANCE'
  | 'DISPATCH'
  | 'COLLECTION'
  | 'RETURN'
  | 'ADJUSTMENT';

export interface CustomerLedgerEntry {
  id: string;
  entityId: BusinessEntityId;
  customerId: string;
  date: string;
  entryType: CustomerLedgerEntryType;
  referenceNumber: string;
  description: string;
  debit: number; // increases outstanding
  credit: number; // decreases outstanding
  runningBalance: number;
  createdBy: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  entityId: BusinessEntityId;
  collectionNumber: string;
  customerId: string;
  collectionDate: string;
  amount: number;
  paymentMode: PaymentMode;
  cashAmount?: number;
  onlineAmount?: number;
  referenceNumber?: string;
  remarks?: string;
  dispatchId?: string;
  createdBy: string;
  createdAt: string;
}

export interface Damage {
  id: string;
  entityId: BusinessEntityId;
  damageNumber: string;
  productId: string;
  damageDate: string;
  quantity: number;
  estimatedUnitCost: number;
  totalCost: number;
  reason: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  entityId: BusinessEntityId;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  entityId: BusinessEntityId;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface WhatsAppShareLog {
  id: string;
  entityId: BusinessEntityId;
  billNumber: string;
  customerId: string;
  customerMobile: string;
  sharedAt: string;
  sharedBy: string;
}
