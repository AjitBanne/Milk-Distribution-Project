import {
  BusinessEntity,
  User,
  Customer,
  Product,
  CustomerRate,
  Vendor,
  VendorPurchaseRate,
  Purchase,
  Dispatch,
  InventoryMovement,
  CustomerLedgerEntry,
  Collection,
  Damage,
  ExpenseCategory,
  Expense,
} from '../types/dairy';

export const SEED_ENTITIES: BusinessEntity[] = [
  {
    id: 'morya',
    name: 'Morya Enterprises',
    tagline: 'Wholesale Dairy Logistics & Distribution',
    address: 'Shop 4-5, APMC Market Yard, Sangli, Maharashtra 416416',
    phone: '+91 98901 67890',
    code: 'ME',
    fssaiNumber: '11522022000892',
  },
];

export const SEED_USERS: User[] = [
  {
    id: 'usr_ajit_owner',
    entityId: 'morya',
    username: 'AjitBanne',
    email: 'ajitbanne7923@gmail.com',
    password: 'Pass@123',
    name: 'Ajit Banne',
    role: 'OWNER',
    phone: '9822012345',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
  },
];

// Complete standard dairy product catalog for Morya Enterprises
export const SEED_PRODUCTS_MORYA: Product[] = [
  { id: 'p_morya_1', entityId: 'morya', name: 'Cow Milk 500 ml', unit: 'Packet', displaySequence: 1, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_2', entityId: 'morya', name: 'Cow Milk 1 Litre', unit: 'Packet', displaySequence: 2, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_3', entityId: 'morya', name: 'Buffalo Milk 500 ml', unit: 'Packet', displaySequence: 3, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_4', entityId: 'morya', name: 'Buffalo Milk 1 Litre', unit: 'Packet', displaySequence: 4, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_5', entityId: 'morya', name: 'Taaza Milk 500 ml', unit: 'Packet', displaySequence: 5, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_6', entityId: 'morya', name: 'Gold Milk 500 ml', unit: 'Packet', displaySequence: 6, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_7', entityId: 'morya', name: 'Gold Milk 1 Litre', unit: 'Packet', displaySequence: 7, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_8', entityId: 'morya', name: 'Fresh Curd 500g', unit: 'Cup', displaySequence: 8, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_9', entityId: 'morya', name: 'Fresh Paneer 1 Kg', unit: 'Kilogram', displaySequence: 9, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_10', entityId: 'morya', name: 'Table Butter 500g', unit: 'Packet', displaySequence: 10, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_11', entityId: 'morya', name: 'Pure Cow Ghee 1 Litre', unit: 'Bottle', displaySequence: 11, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_12', entityId: 'morya', name: 'Spiced Buttermilk 200ml', unit: 'Packet', displaySequence: 12, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p_morya_13', entityId: 'morya', name: 'Sweet Lassi 200ml', unit: 'Cup', displaySequence: 13, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

export const SEED_PRODUCTS_YASH: Product[] = [];

// Clean slate: No dummy customers, fake dispatches, or synthetic purchases
export const SEED_CUSTOMERS_YASH: Customer[] = [];
export const SEED_CUSTOMERS_MORYA: Customer[] = [];

export const SEED_VENDORS_YASH: Vendor[] = [];
export const SEED_VENDORS_MORYA: Vendor[] = [];

export const SEED_VENDOR_RATES_YASH: VendorPurchaseRate[] = [];
export const SEED_VENDOR_RATES_MORYA: VendorPurchaseRate[] = [];

export function generateSeedCustomerRates(): CustomerRate[] {
  return [];
}

export const SEED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat_m_fuel', entityId: 'morya', name: 'Fuel & Diesel', isActive: true },
  { id: 'cat_m_driver', entityId: 'morya', name: 'Driver & Delivery Charges', isActive: true },
  { id: 'cat_m_loading', entityId: 'morya', name: 'Hamali & Coolie Charges', isActive: true },
  { id: 'cat_m_maint', entityId: 'morya', name: 'Vehicle Maintenance', isActive: true },
  { id: 'cat_m_elec', entityId: 'morya', name: 'Cold Room Electricity', isActive: true },
  { id: 'cat_m_office', entityId: 'morya', name: 'Office & Admin Expense', isActive: true },
  { id: 'cat_m_salary', entityId: 'morya', name: 'Staff Salary & Advance', isActive: true },
];

export const TODAY_STR = new Date().toISOString().substring(0, 10);
export const YESTERDAY_STR = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

export const SEED_PURCHASES_YASH: Purchase[] = [];
export const SEED_PURCHASES_MORYA: Purchase[] = [];

export const SEED_INITIAL_MOVEMENTS_YASH: InventoryMovement[] = [];
export const SEED_INITIAL_MOVEMENTS_MORYA: InventoryMovement[] = [];

export function generateSeedLedgerEntries(): CustomerLedgerEntry[] {
  return [];
}

export const SEED_EXPENSES_YASH: Expense[] = [];
export const SEED_DAMAGES_YASH: Damage[] = [];
