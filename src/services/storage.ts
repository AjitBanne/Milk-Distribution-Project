import {
  BusinessEntity,
  BusinessEntityId,
  User,
  Customer,
  Product,
  CustomerRate,
  Vendor,
  VendorPurchaseRate,
  Purchase,
  Dispatch,
  CustomerReturn,
  InventoryMovement,
  CustomerLedgerEntry,
  Collection,
  Damage,
  ExpenseCategory,
  Expense,
  WhatsAppShareLog,
  PaymentMode,
  VendorPayment,
} from '../types/dairy';
import {
  SEED_ENTITIES,
  SEED_USERS,
  SEED_PRODUCTS_YASH,
  SEED_PRODUCTS_MORYA,
  SEED_CUSTOMERS_YASH,
  SEED_CUSTOMERS_MORYA,
  SEED_VENDORS_YASH,
  SEED_VENDORS_MORYA,
  SEED_VENDOR_RATES_YASH,
  SEED_VENDOR_RATES_MORYA,
  generateSeedCustomerRates,
  SEED_EXPENSE_CATEGORIES,
  SEED_PURCHASES_YASH,
  SEED_PURCHASES_MORYA,
  SEED_INITIAL_MOVEMENTS_YASH,
  SEED_INITIAL_MOVEMENTS_MORYA,
  generateSeedLedgerEntries,
  SEED_EXPENSES_YASH,
  SEED_DAMAGES_YASH,
} from './seedData';
import {
  syncDocToFirestore,
  batchUploadToFirestore,
  deleteDocFromFirestore,
  FIRESTORE_COLLECTIONS,
} from './firestoreSync';

export const STORAGE_KEYS = {
  ENTITIES: 'df_entities_v1',
  USERS: 'df_users_v1',
  CUSTOMERS: 'df_customers_v1',
  PRODUCTS: 'df_products_v1',
  CUSTOMER_RATES: 'df_customer_rates_v1',
  VENDORS: 'df_vendors_v1',
  VENDOR_RATES: 'df_vendor_rates_v1',
  PURCHASES: 'df_purchases_v1',
  DISPATCHES: 'df_dispatches_v1',
  RETURNS: 'df_returns_v1',
  MOVEMENTS: 'df_movements_v1',
  LEDGER: 'df_ledger_v1',
  COLLECTIONS: 'df_collections_v1',
  DAMAGES: 'df_damages_v1',
  EXPENSE_CATEGORIES: 'df_expense_categories_v1',
  EXPENSES: 'df_expenses_v1',
  WHATSAPP_LOGS: 'df_whatsapp_logs_v1',
  VENDOR_PAYMENTS: 'df_vendor_payments_v1',
  INITIALIZED: 'df_initialized_v9_morya_single_entity',
};

// Safe JSON parser
export function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Failed to read ${key} from localStorage:`, err);
    return defaultValue;
  }
}

export function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write ${key} to localStorage:`, err);
  }
}

// Atomically replaces an entity's slice in localStorage with cloud documents
export function replaceEntityCollectionInStorage<T extends { id: string; entityId?: string }>(
  key: string,
  entityId: string,
  cloudItems: T[]
): void {
  const current = getStored<T[]>(key, []);
  const others = current.filter((item) => item.entityId && item.entityId !== entityId);
  const updated = [...others, ...cloudItems];
  setStored(key, updated);
}

// Initialize seed data if first time
export function initializeStorageIfNeeded(): void {
  const isMigrated = localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
  if (!isMigrated) {
    // Set entities to Morya Enterprises only
    setStored(STORAGE_KEYS.ENTITIES, SEED_ENTITIES);

    // Update or initialize users: ensure Ajit Banne is on Morya
    const users = getAllUsers();
    if (users.length > 0) {
      users.forEach((u) => {
        if (u.entityId === 'yash' || !u.entityId) {
          u.entityId = 'morya';
        }
      });
      setStored(STORAGE_KEYS.USERS, users);
    } else {
      setStored(STORAGE_KEYS.USERS, SEED_USERS);
    }

    // Ensure Morya has product catalog
    const existingProducts = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const moryaProds = existingProducts.filter((p) => p.entityId === 'morya');
    if (moryaProds.length === 0) {
      const migrated = existingProducts.map((p) => ({ ...p, entityId: 'morya' as BusinessEntityId }));
      const finalProducts = migrated.length > 0 ? migrated : SEED_PRODUCTS_MORYA;
      setStored(STORAGE_KEYS.PRODUCTS, finalProducts);
    } else {
      existingProducts.forEach((p) => {
        if (p.entityId === 'yash') p.entityId = 'morya';
      });
      setStored(STORAGE_KEYS.PRODUCTS, existingProducts);
    }

    // Migrate any existing customer records from 'yash' to 'morya'
    const migrateKey = (key: string) => {
      const items = getStored<any[]>(key, []);
      if (items.length > 0) {
        items.forEach((item) => {
          if (item && item.entityId === 'yash') {
            item.entityId = 'morya';
          }
        });
        setStored(key, items);
      }
    };

    [
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.CUSTOMER_RATES,
      STORAGE_KEYS.VENDORS,
      STORAGE_KEYS.VENDOR_RATES,
      STORAGE_KEYS.PURCHASES,
      STORAGE_KEYS.DISPATCHES,
      STORAGE_KEYS.RETURNS,
      STORAGE_KEYS.MOVEMENTS,
      STORAGE_KEYS.LEDGER,
      STORAGE_KEYS.COLLECTIONS,
      STORAGE_KEYS.DAMAGES,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.WHATSAPP_LOGS,
    ].forEach(migrateKey);

    // Expense categories
    const categories = getStored<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
    if (categories.length === 0 || !categories.some((c) => c.entityId === 'morya')) {
      setStored(STORAGE_KEYS.EXPENSE_CATEGORIES, SEED_EXPENSE_CATEGORIES);
    } else {
      categories.forEach((c) => {
        if (c.entityId === 'yash') c.entityId = 'morya';
      });
      setStored(STORAGE_KEYS.EXPENSE_CATEGORIES, categories);
    }

    // Update active session in localStorage if pointing to 'yash'
    try {
      const sessStr = localStorage.getItem('df_auth_session_v1');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        sess.entityId = 'morya';
        localStorage.setItem('df_auth_session_v1', JSON.stringify(sess));
      }
    } catch {
      // ignore
    }

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // Guarantee that AjitBanne with Pass@123 is present for Morya
  const users = getAllUsers();
  const ajit = users.find((u) => u.username.toLowerCase() === 'ajitbanne');
  if (!ajit) {
    users.unshift(SEED_USERS[0]);
    setStored(STORAGE_KEYS.USERS, users);
  } else {
    let changed = false;
    if (ajit.entityId !== 'morya') {
      ajit.entityId = 'morya';
      changed = true;
    }
    if (ajit.password !== 'Pass@123') {
      ajit.password = 'Pass@123';
      changed = true;
    }
    if (changed) {
      saveUser(ajit);
    }
  }
}

// Clear all transactional and customer data from the application
export function clearAllTransactionData(entityId?: BusinessEntityId): void {
  if (entityId) {
    setStored(STORAGE_KEYS.CUSTOMERS, getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, []).filter(c => c.entityId !== entityId));
    setStored(STORAGE_KEYS.DISPATCHES, getStored<Dispatch[]>(STORAGE_KEYS.DISPATCHES, []).filter(d => d.entityId !== entityId));
    setStored(STORAGE_KEYS.RETURNS, getStored<CustomerReturn[]>(STORAGE_KEYS.RETURNS, []).filter(r => r.entityId !== entityId));
    setStored(STORAGE_KEYS.MOVEMENTS, getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []).filter(m => m.entityId !== entityId));
    setStored(STORAGE_KEYS.LEDGER, getStored<CustomerLedgerEntry[]>(STORAGE_KEYS.LEDGER, []).filter(l => l.entityId !== entityId));
    setStored(STORAGE_KEYS.COLLECTIONS, getStored<Collection[]>(STORAGE_KEYS.COLLECTIONS, []).filter(c => c.entityId !== entityId));
    setStored(STORAGE_KEYS.DAMAGES, getStored<Damage[]>(STORAGE_KEYS.DAMAGES, []).filter(d => d.entityId !== entityId));
    setStored(STORAGE_KEYS.EXPENSES, getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter(e => e.entityId !== entityId));
    setStored(STORAGE_KEYS.PURCHASES, getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []).filter(p => p.entityId !== entityId));
    setStored(STORAGE_KEYS.CUSTOMER_RATES, getStored<CustomerRate[]>(STORAGE_KEYS.CUSTOMER_RATES, []).filter(r => r.entityId !== entityId));
  } else {
    setStored(STORAGE_KEYS.CUSTOMERS, []);
    setStored(STORAGE_KEYS.CUSTOMER_RATES, []);
    setStored(STORAGE_KEYS.DISPATCHES, []);
    setStored(STORAGE_KEYS.RETURNS, []);
    setStored(STORAGE_KEYS.MOVEMENTS, []);
    setStored(STORAGE_KEYS.LEDGER, []);
    setStored(STORAGE_KEYS.COLLECTIONS, []);
    setStored(STORAGE_KEYS.DAMAGES, []);
    setStored(STORAGE_KEYS.EXPENSES, []);
    setStored(STORAGE_KEYS.PURCHASES, []);
    setStored(STORAGE_KEYS.WHATSAPP_LOGS, []);
  }
}

// Reset data to pristine clean state
export function resetToSeedData(): void {
  localStorage.clear();
  initializeStorageIfNeeded();
}

// ENTITIES
export function getEntities(): BusinessEntity[] {
  return getStored<BusinessEntity[]>(STORAGE_KEYS.ENTITIES, SEED_ENTITIES);
}

export function getEntityById(entityId: BusinessEntityId): BusinessEntity | undefined {
  return getEntities().find((e) => e.id === entityId);
}

export function saveEntity(entity: BusinessEntity): void {
  const entities = getEntities();
  const idx = entities.findIndex((e) => e.id === entity.id);
  if (idx >= 0) {
    entities[idx] = entity;
  } else {
    entities.push(entity);
  }
  setStored(STORAGE_KEYS.ENTITIES, entities);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.ENTITIES, entity).catch(console.warn);
}

// USERS
export function getUsersByEntity(entityId: BusinessEntityId): User[] {
  const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
  return users.filter((u) => u.entityId === entityId);
}

export function getAllUsers(): User[] {
  return getStored<User[]>(STORAGE_KEYS.USERS, []);
}

export function saveUser(user: User): void {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  setStored(STORAGE_KEYS.USERS, users);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.USERS, user).catch(console.warn);
}

// CUSTOMERS
export function getCustomersByEntity(entityId: BusinessEntityId): Customer[] {
  const customers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  return customers
    .filter((c) => c.entityId === entityId)
    .sort((a, b) => a.routeSequence - b.routeSequence);
}

export function getCustomerById(entityId: BusinessEntityId, customerId: string): Customer | undefined {
  return getCustomersByEntity(entityId).find((c) => c.id === customerId);
}

export function saveCustomer(customer: Customer, user: string): { success: boolean; error?: string } {
  const customers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  
  // Duplicate mobile check in same entity
  const duplicate = customers.find(
    (c) => c.entityId === customer.entityId && c.mobileNumber === customer.mobileNumber && c.id !== customer.id
  );
  if (duplicate) {
    return { success: false, error: `Customer with mobile ${customer.mobileNumber} already exists (${duplicate.name})` };
  }

  const idx = customers.findIndex((c) => c.id === customer.id && c.entityId === customer.entityId);
  const now = new Date().toISOString();

  let savedCustomer: Customer;
  if (idx >= 0) {
    savedCustomer = { ...customer, updatedAt: now };
    customers[idx] = savedCustomer;
  } else {
    // New customer
    savedCustomer = {
      ...customer,
      createdAt: now,
      updatedAt: now,
      currentOutstanding: customer.openingOutstanding,
    };
    customers.push(savedCustomer);

    // If opening outstanding > 0, generate opening ledger entry
    if (customer.openingOutstanding > 0) {
      addLedgerEntry({
        id: `led_${customer.id}_op_${Date.now()}`,
        entityId: customer.entityId,
        customerId: customer.id,
        date: customer.createdAt.substring(0, 10) || new Date().toISOString().substring(0, 10),
        entryType: 'OPENING_BALANCE',
        referenceNumber: 'OP-BAL',
        description: 'Opening Outstanding Balance recorded at customer creation',
        debit: customer.openingOutstanding,
        credit: 0,
        runningBalance: customer.openingOutstanding,
        createdBy: user,
        createdAt: now,
      });
    }
  }

  setStored(STORAGE_KEYS.CUSTOMERS, customers);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.CUSTOMERS, savedCustomer).catch(console.warn);
  return { success: true };
}

export function updateRouteSequences(entityId: BusinessEntityId, customerOrder: { id: string; sequence: number }[]): void {
  const customers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  const map = new Map(customerOrder.map((item) => [item.id, item.sequence]));

  const updated = customers.map((c) => {
    if (c.entityId === entityId && map.has(c.id)) {
      return { ...c, routeSequence: map.get(c.id)! };
    }
    return c;
  });

  setStored(STORAGE_KEYS.CUSTOMERS, updated);
  const entityCusts = updated.filter((c) => c.entityId === entityId);
  batchUploadToFirestore(FIRESTORE_COLLECTIONS.CUSTOMERS, entityCusts).catch(console.warn);
}

// PRODUCTS
export function getProductsByEntity(entityId: BusinessEntityId): Product[] {
  const products = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  return products
    .filter((p) => p.entityId === entityId)
    .sort((a, b) => a.displaySequence - b.displaySequence);
}

export function saveProduct(product: Product): { success: boolean; error?: string } {
  const products = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const duplicate = products.find(
    (p) => p.entityId === product.entityId && p.name.trim().toLowerCase() === product.name.trim().toLowerCase() && p.id !== product.id
  );
  if (duplicate) {
    return { success: false, error: `Product "${product.name}" already exists for this entity.` };
  }

  const idx = products.findIndex((p) => p.id === product.id && p.entityId === product.entityId);
  const now = new Date().toISOString();

  let savedProd: Product;
  if (idx >= 0) {
    savedProd = { ...product, updatedAt: now };
    products[idx] = savedProd;
  } else {
    savedProd = { ...product, createdAt: now, updatedAt: now };
    products.push(savedProd);
  }

  setStored(STORAGE_KEYS.PRODUCTS, products);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, savedProd).catch(console.warn);
  return { success: true };
}

// CUSTOMER RATES
export function getCustomerRatesByEntity(entityId: BusinessEntityId): CustomerRate[] {
  const rates = getStored<CustomerRate[]>(STORAGE_KEYS.CUSTOMER_RATES, []);
  return rates.filter((r) => r.entityId === entityId);
}

export function getCustomerRate(entityId: BusinessEntityId, customerId: string, productId: string): number | undefined {
  const rates = getCustomerRatesByEntity(entityId);
  const r = rates.find((item) => item.customerId === customerId && item.productId === productId);
  return r ? r.rate : undefined;
}

export function saveCustomerRate(entityId: BusinessEntityId, customerId: string, productId: string, rate: number): void {
  const rates = getStored<CustomerRate[]>(STORAGE_KEYS.CUSTOMER_RATES, []);
  const idx = rates.findIndex(
    (r) => r.entityId === entityId && r.customerId === customerId && r.productId === productId
  );
  const now = new Date().toISOString();

  let savedRate: CustomerRate;
  if (idx >= 0) {
    savedRate = { ...rates[idx], rate, updatedAt: now };
    rates[idx] = savedRate;
  } else {
    savedRate = {
      id: `cr_${customerId}_${productId}_${Date.now()}`,
      entityId,
      customerId,
      productId,
      rate,
      updatedAt: now,
    };
    rates.push(savedRate);
  }

  setStored(STORAGE_KEYS.CUSTOMER_RATES, rates);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.CUSTOMER_RATES, savedRate).catch(console.warn);
}

export function bulkSaveCustomerRates(entityId: BusinessEntityId, items: { customerId: string; productId: string; rate: number }[]): void {
  const rates = getStored<CustomerRate[]>(STORAGE_KEYS.CUSTOMER_RATES, []);
  const now = new Date().toISOString();
  const modifiedRates: CustomerRate[] = [];

  items.forEach(({ customerId, productId, rate }) => {
    const idx = rates.findIndex(
      (r) => r.entityId === entityId && r.customerId === customerId && r.productId === productId
    );
    if (idx >= 0) {
      rates[idx] = { ...rates[idx], rate, updatedAt: now };
      modifiedRates.push(rates[idx]);
    } else {
      const newR: CustomerRate = {
        id: `cr_${customerId}_${productId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        entityId,
        customerId,
        productId,
        rate,
        updatedAt: now,
      };
      rates.push(newR);
      modifiedRates.push(newR);
    }
  });

  setStored(STORAGE_KEYS.CUSTOMER_RATES, rates);
  batchUploadToFirestore(FIRESTORE_COLLECTIONS.CUSTOMER_RATES, modifiedRates).catch(console.warn);
}

// VENDORS & VENDOR RATES
export function getVendorsByEntity(entityId: BusinessEntityId): Vendor[] {
  const vendors = getStored<Vendor[]>(STORAGE_KEYS.VENDORS, []);
  return vendors.filter((v) => v.entityId === entityId);
}

export function saveVendor(vendor: Vendor): { success: boolean; error?: string } {
  const vendors = getStored<Vendor[]>(STORAGE_KEYS.VENDORS, []);
  const idx = vendors.findIndex((v) => v.id === vendor.id && v.entityId === vendor.entityId);
  const now = new Date().toISOString();

  let savedV: Vendor;
  if (idx >= 0) {
    savedV = { ...vendor, updatedAt: now };
    vendors[idx] = savedV;
  } else {
    savedV = { ...vendor, createdAt: now, updatedAt: now };
    vendors.push(savedV);
  }

  setStored(STORAGE_KEYS.VENDORS, vendors);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.VENDORS, savedV).catch(console.warn);
  return { success: true };
}

export function getVendorRatesByEntity(entityId: BusinessEntityId): VendorPurchaseRate[] {
  const rates = getStored<VendorPurchaseRate[]>(STORAGE_KEYS.VENDOR_RATES, []);
  return rates.filter((r) => r.entityId === entityId);
}

export function getVendorPurchaseRate(entityId: BusinessEntityId, vendorId: string, productId: string): number | undefined {
  const rates = getVendorRatesByEntity(entityId);
  const r = rates.find((item) => item.vendorId === vendorId && item.productId === productId);
  return r ? r.agreedRate : undefined;
}

export function saveVendorPurchaseRate(entityId: BusinessEntityId, vendorId: string, productId: string, agreedRate: number): void {
  const rates = getStored<VendorPurchaseRate[]>(STORAGE_KEYS.VENDOR_RATES, []);
  const idx = rates.findIndex(
    (r) => r.entityId === entityId && r.vendorId === vendorId && r.productId === productId
  );
  const now = new Date().toISOString();

  let savedVR: VendorPurchaseRate;
  if (idx >= 0) {
    savedVR = { ...rates[idx], agreedRate, updatedAt: now };
    rates[idx] = savedVR;
  } else {
    savedVR = {
      id: `vr_${vendorId}_${productId}_${Date.now()}`,
      entityId,
      vendorId,
      productId,
      agreedRate,
      updatedAt: now,
    };
    rates.push(savedVR);
  }

  setStored(STORAGE_KEYS.VENDOR_RATES, rates);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.VENDOR_RATES, savedVR).catch(console.warn);
}

// INVENTORY MOVEMENTS & CURRENT STOCK CALCULATION
export function getInventoryMovementsByEntity(entityId: BusinessEntityId): InventoryMovement[] {
  const movements = getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  return movements.filter((m) => m.entityId === entityId);
}

export function addInventoryMovement(movement: InventoryMovement): void {
  const movements = getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  movements.push(movement);
  setStored(STORAGE_KEYS.MOVEMENTS, movements);
}

export function addInventoryMovements(newMovements: InventoryMovement[]): void {
  const movements = getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  movements.push(...newMovements);
  setStored(STORAGE_KEYS.MOVEMENTS, movements);
}

// Current stock formula:
// Opening Stock + Purchases + Customer Returns - Billed Dispatches - Complimentary - Damage ± Adjustments
export function getProductCurrentStock(entityId: BusinessEntityId, productId: string): number {
  const movements = getInventoryMovementsByEntity(entityId).filter((m) => m.productId === productId);
  return movements.reduce((acc, m) => acc + m.quantityChange, 0);
}

export function getAllProductsCurrentStock(entityId: BusinessEntityId): Record<string, number> {
  const movements = getInventoryMovementsByEntity(entityId);
  const map: Record<string, number> = {};
  movements.forEach((m) => {
    map[m.productId] = (map[m.productId] || 0) + m.quantityChange;
  });
  return map;
}

// PURCHASES
export function getPurchasesByEntity(entityId: BusinessEntityId): Purchase[] {
  const purchases = getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  return purchases
    .filter((p) => p.entityId === entityId)
    .sort((a, b) => (b.purchaseDate > a.purchaseDate ? 1 : -1));
}

export function savePurchase(purchase: Purchase, user: string): { success: boolean; error?: string } {
  const purchases = getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  const idx = purchases.findIndex((p) => p.id === purchase.id && p.entityId === purchase.entityId);
  const now = new Date().toISOString();

  // Financial calculations with discount, round-off and payment
  const linesTotal = purchase.lines.reduce((acc, l) => acc + (l.lineAmount || l.quantity * l.purchaseRate), 0);
  const grossAmount = purchase.grossAmount ?? (purchase.totalAmount || linesTotal);
  const discount = purchase.discount || 0;
  const roundoff = purchase.roundoff || 0;
  const netAmount = purchase.netAmount ?? Math.max(0, grossAmount - discount + roundoff);
  const paidAmount = purchase.paidAmount || 0;
  const remainingAmount = purchase.remainingAmount ?? Math.max(0, netAmount - paidAmount);

  const normalizedPurchase: Purchase = {
    ...purchase,
    totalAmount: netAmount,
    grossAmount,
    discount,
    roundoff,
    netAmount,
    paidAmount,
    remainingAmount,
    paymentMode: purchase.paymentMode || (paidAmount > 0 ? 'CASH' : 'NONE'),
  };

  let savedPurchase: Purchase;
  if (idx >= 0) {
    const existing = purchases[idx];
    savedPurchase = {
      ...existing,
      ...normalizedPurchase,
      updatedBy: user,
      updatedAt: now,
    };
    purchases[idx] = savedPurchase;

    // Roll back old inventory movements for this purchase and re-apply with new quantities
    let movements = getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
    movements = movements.filter((m) => !(m.referenceId === savedPurchase.id && m.referenceType === 'PURCHASE'));

    if (savedPurchase.status === 'POSTED') {
      const newMovements: InventoryMovement[] = savedPurchase.lines.map((l, i) => ({
        id: `mov_po_${savedPurchase.id}_${i}_${Date.now()}`,
        entityId: savedPurchase.entityId,
        productId: l.productId,
        type: 'PURCHASE',
        date: savedPurchase.purchaseDate,
        quantityChange: l.quantity,
        referenceId: savedPurchase.id,
        referenceType: 'PURCHASE',
        reason: `Purchase PO #${savedPurchase.purchaseNumber}`,
        createdBy: user,
        createdAt: now,
      }));
      movements.push(...newMovements);
    }
    setStored(STORAGE_KEYS.MOVEMENTS, movements);
  } else {
    savedPurchase = { ...normalizedPurchase, createdBy: user, createdAt: now };
    purchases.push(savedPurchase);

    // If status is POSTED, post inventory movements
    if (savedPurchase.status === 'POSTED') {
      const movements: InventoryMovement[] = savedPurchase.lines.map((l, i) => ({
        id: `mov_po_${savedPurchase.id}_${i}_${Date.now()}`,
        entityId: savedPurchase.entityId,
        productId: l.productId,
        type: 'PURCHASE',
        date: savedPurchase.purchaseDate,
        quantityChange: l.quantity,
        referenceId: savedPurchase.id,
        referenceType: 'PURCHASE',
        reason: `Purchase PO #${savedPurchase.purchaseNumber}`,
        createdBy: user,
        createdAt: now,
      }));
      addInventoryMovements(movements);
    }
  }

  setStored(STORAGE_KEYS.PURCHASES, purchases);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.PURCHASES, savedPurchase).catch(console.warn);
  return { success: true };
}

export function deletePurchase(purchaseId: string, user: string = 'Operator'): { success: boolean; error?: string } {
  const purchases = getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  const idx = purchases.findIndex((p) => p.id === purchaseId);
  if (idx < 0) {
    return { success: false, error: 'Purchase record not found.' };
  }

  // Roll back inventory movements for this purchase to adjust stock
  let movements = getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  movements = movements.filter((m) => !(m.referenceId === purchaseId && m.referenceType === 'PURCHASE'));
  setStored(STORAGE_KEYS.MOVEMENTS, movements);

  // Remove purchase record
  purchases.splice(idx, 1);
  setStored(STORAGE_KEYS.PURCHASES, purchases);

  // Delete document in Firestore
  deleteDocFromFirestore(FIRESTORE_COLLECTIONS.PURCHASES, purchaseId).catch(console.warn);

  return { success: true };
}

// VENDOR PAYMENTS & FINANCIAL SUMMARY
export function getVendorPaymentsByEntity(entityId: BusinessEntityId): VendorPayment[] {
  const payments = getStored<VendorPayment[]>(STORAGE_KEYS.VENDOR_PAYMENTS, []);
  return payments
    .filter((p) => p.entityId === entityId)
    .sort((a, b) => (b.paymentDate > a.paymentDate ? 1 : -1));
}

export function saveVendorPayment(payment: VendorPayment, user: string): { success: boolean; error?: string } {
  const payments = getStored<VendorPayment[]>(STORAGE_KEYS.VENDOR_PAYMENTS, []);
  const now = new Date().toISOString();
  const paymentWithMeta: VendorPayment = {
    ...payment,
    createdBy: user,
    createdAt: payment.createdAt || now,
  };
  payments.push(paymentWithMeta);
  setStored(STORAGE_KEYS.VENDOR_PAYMENTS, payments);

  // If linked to a specific purchase, update that purchase's paidAmount & remainingAmount
  if (payment.purchaseId) {
    const purchases = getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
    const pIdx = purchases.findIndex((p) => p.id === payment.purchaseId);
    if (pIdx >= 0) {
      const p = purchases[pIdx];
      const curPaid = p.paidAmount || 0;
      const newPaid = curPaid + payment.amount;
      const net = p.netAmount ?? p.totalAmount;
      const newRemaining = Math.max(0, net - newPaid);
      purchases[pIdx] = {
        ...p,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        updatedBy: user,
        updatedAt: now,
      };
      setStored(STORAGE_KEYS.PURCHASES, purchases);
      syncDocToFirestore(FIRESTORE_COLLECTIONS.PURCHASES, purchases[pIdx]).catch(console.warn);
    }
  }

  syncDocToFirestore(FIRESTORE_COLLECTIONS.VENDOR_PAYMENTS, paymentWithMeta).catch(console.warn);
  return { success: true };
}

export function getVendorFinancialSummary(entityId: BusinessEntityId, vendorId: string): {
  totalPurchases: number;
  totalPaid: number;
  totalDiscounts: number;
  remainingDue: number;
  purchaseCount: number;
} {
  const allPurchases = getPurchasesByEntity(entityId).filter(
    (p) => p.vendorId === vendorId && p.status !== 'CANCELLED'
  );
  const standalonePayments = getVendorPaymentsByEntity(entityId).filter(
    (vp) => vp.vendorId === vendorId && !vp.purchaseId
  );

  let totalPurchases = 0;
  let totalPaid = 0;
  let totalDiscounts = 0;

  allPurchases.forEach((p) => {
    const net = p.netAmount ?? p.totalAmount;
    totalPurchases += net;
    totalPaid += (p.paidAmount || 0);
    totalDiscounts += (p.discount || 0);
  });

  standalonePayments.forEach((vp) => {
    totalPaid += vp.amount;
    totalDiscounts += (vp.discount || 0);
  });

  const remainingDue = Math.max(0, totalPurchases - totalPaid);

  return {
    totalPurchases,
    totalPaid,
    totalDiscounts,
    remainingDue,
    purchaseCount: allPurchases.length,
  };
}

export function getDailyPurchaseFinancialSummary(entityId: BusinessEntityId, dateStr: string): {
  totalBillToday: number;
  todayPayAmount: number;
  totalRemaining: number;
} {
  const allPurchases = getPurchasesByEntity(entityId).filter((p) => p.status !== 'CANCELLED');
  const todayPurchases = allPurchases.filter((p) => p.purchaseDate === dateStr);
  const todayPayments = getVendorPaymentsByEntity(entityId).filter((vp) => vp.paymentDate === dateStr);

  let totalBillToday = 0;
  let todayPayAmount = 0;

  todayPurchases.forEach((p) => {
    const net = p.netAmount ?? p.totalAmount;
    totalBillToday += net;
    todayPayAmount += (p.paidAmount || 0);
  });

  todayPayments.forEach((vp) => {
    if (!vp.purchaseId) {
      todayPayAmount += vp.amount;
    }
  });

  // Total remaining across all purchases
  let totalRemaining = 0;
  allPurchases.forEach((p) => {
    const net = p.netAmount ?? p.totalAmount;
    const paid = p.paidAmount || 0;
    totalRemaining += Math.max(0, net - paid);
  });

  return {
    totalBillToday,
    todayPayAmount,
    totalRemaining,
  };
}

// DISPATCHES & ROUTE
export function getDispatchesByEntity(entityId: BusinessEntityId): Dispatch[] {
  const dispatches = getStored<Dispatch[]>(STORAGE_KEYS.DISPATCHES, []);
  return dispatches.filter((d) => d.entityId === entityId);
}

export function getDispatchesByDate(entityId: BusinessEntityId, dateStr: string): Dispatch[] {
  return getDispatchesByEntity(entityId).filter(
    (d) => d.dispatchDate === dateStr && d.status !== 'CANCELLED'
  );
}

export function getCustomerDispatches(entityId: BusinessEntityId, customerId: string): Dispatch[] {
  return getDispatchesByEntity(entityId)
    .filter((d) => d.customerId === customerId)
    .sort((a, b) => (b.dispatchDate > a.dispatchDate ? 1 : -1));
}

// POST DISPATCH TRANSACTION (Atomic update of dispatch, inventory, customer ledger, collections, and customer balance)
export interface PostDispatchInput {
  entityId: BusinessEntityId;
  customerId: string;
  dispatchDate: string;
  lines: {
    productId: string;
    rate: number;
    billedQuantity: number;
    complimentaryQuantity: number;
    lineAmount: number;
  }[];
  discount: number;
  paymentReceived: number;
  paymentMode?: PaymentMode;
  cashAmount?: number;
  onlineAmount?: number;
  referenceNumber?: string;
  user: string;
}

export function postDispatch(input: PostDispatchInput): { success: boolean; error?: string; dispatch?: Dispatch } {
  const { entityId, customerId, dispatchDate, lines, discount, user } = input;

  const customer = getCustomerById(entityId, customerId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }
  if (!customer.isActive) {
    return { success: false, error: 'Cannot dispatch to an inactive customer.' };
  }

  // Filter valid non-zero lines
  const activeLines = lines.filter((l) => l.billedQuantity > 0 || l.complimentaryQuantity > 0);
  if (activeLines.length === 0) {
    return { success: false, error: 'Please enter quantity for at least one product.' };
  }

  // Validate rates and inventory
  const stockMap = getAllProductsCurrentStock(entityId);
  for (const line of activeLines) {
    if (line.billedQuantity > 0 && (line.rate <= 0 || isNaN(line.rate))) {
      return { success: false, error: `Invalid selling rate for a billed product line.` };
    }
    const neededStock = line.billedQuantity + line.complimentaryQuantity;
    const currentStock = stockMap[line.productId] || 0;
    if (neededStock > currentStock) {
      const prod = getProductsByEntity(entityId).find((p) => p.id === line.productId);
      return {
        success: false,
        error: `Insufficient stock for "${prod?.name || 'Product'}". Current stock is ${currentStock}, requested is ${neededStock}.`,
      };
    }
  }

  const grossAmount = activeLines.reduce((acc, l) => acc + l.lineAmount, 0);
  if (discount < 0 || discount > grossAmount) {
    return { success: false, error: 'Discount cannot be negative or greater than gross bill amount.' };
  }

  const netAmount = Math.max(0, grossAmount - discount);

  // Compute payment breakdown (supports CASH, ONLINE, and SPLIT: Cash + Online)
  const mode: PaymentMode = input.paymentMode || 'CASH';
  let totalPaymentReceived = 0;
  let cashPaid = 0;
  let onlinePaid = 0;

  if (mode === 'SPLIT') {
    cashPaid = Math.max(0, input.cashAmount || 0);
    onlinePaid = Math.max(0, input.onlineAmount || 0);
    totalPaymentReceived = cashPaid + onlinePaid;
    if (onlinePaid > 0 && !input.referenceNumber?.trim()) {
      return { success: false, error: 'Reference / UTR number is required for the online payment portion.' };
    }
  } else if (mode === 'ONLINE') {
    onlinePaid = Math.max(0, input.onlineAmount !== undefined ? input.onlineAmount : input.paymentReceived);
    cashPaid = 0;
    totalPaymentReceived = onlinePaid;
    if (totalPaymentReceived > 0 && !input.referenceNumber?.trim()) {
      return { success: false, error: 'Online payments require an online reference / transaction number.' };
    }
  } else {
    // CASH
    cashPaid = Math.max(0, input.cashAmount !== undefined ? input.cashAmount : input.paymentReceived);
    onlinePaid = 0;
    totalPaymentReceived = cashPaid;
  }

  const previousOutstanding = customer.currentOutstanding;
  const closingOutstanding = previousOutstanding + netAmount - totalPaymentReceived;

  const now = new Date().toISOString();
  const entity = getEntityById(entityId);
  const code = entity?.code || 'DF';
  const billCount = getDispatchesByEntity(entityId).length + 1;
  const billNumber = `INV-${code}-${dispatchDate.replace(/-/g, '')}-${String(billCount).padStart(4, '0')}`;

  const dispatch: Dispatch = {
    id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityId,
    billNumber,
    customerId,
    dispatchDate,
    lines: activeLines,
    grossAmount,
    discount,
    netAmount,
    paymentReceived: totalPaymentReceived,
    paymentMode: mode,
    cashAmount: cashPaid > 0 ? cashPaid : undefined,
    onlineAmount: onlinePaid > 0 ? onlinePaid : undefined,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    previousOutstanding,
    closingOutstanding,
    status: 'POSTED',
    revisionNumber: 1,
    createdBy: user,
    createdAt: now,
  };

  // 1. Save dispatch
  const dispatches = getStored<Dispatch[]>(STORAGE_KEYS.DISPATCHES, []);
  dispatches.push(dispatch);
  setStored(STORAGE_KEYS.DISPATCHES, dispatches);

  // 2. Inventory movements (billed + complimentary)
  const newMovements: InventoryMovement[] = [];
  activeLines.forEach((l, i) => {
    if (l.billedQuantity > 0) {
      newMovements.push({
        id: `mov_disp_b_${dispatch.id}_${i}_${Date.now()}`,
        entityId,
        productId: l.productId,
        type: 'CUSTOMER_DISPATCH',
        date: dispatchDate,
        quantityChange: -l.billedQuantity,
        referenceId: dispatch.id,
        referenceType: 'DISPATCH',
        reason: `Billed Dispatch to ${customer.name} (${billNumber})`,
        createdBy: user,
        createdAt: now,
      });
    }
    if (l.complimentaryQuantity > 0) {
      newMovements.push({
        id: `mov_disp_c_${dispatch.id}_${i}_${Date.now()}`,
        entityId,
        productId: l.productId,
        type: 'COMPLIMENTARY_DISPATCH',
        date: dispatchDate,
        quantityChange: -l.complimentaryQuantity,
        referenceId: dispatch.id,
        referenceType: 'DISPATCH',
        reason: `Complimentary Sample/Free Dispatch to ${customer.name} (${billNumber})`,
        createdBy: user,
        createdAt: now,
      });
    }
  });
  addInventoryMovements(newMovements);

  // 3. Customer Ledger Debit for Net Bill
  if (netAmount > 0) {
    addLedgerEntry({
      id: `led_disp_${dispatch.id}_${Date.now()}`,
      entityId,
      customerId,
      date: dispatchDate,
      entryType: 'DISPATCH',
      referenceNumber: billNumber,
      description: `Daily delivery dispatch bill #${billNumber} (${activeLines.length} items)`,
      debit: netAmount,
      credit: 0,
      runningBalance: previousOutstanding + netAmount,
      createdBy: user,
      createdAt: now,
    });
  }

  // 4. Customer Ledger Credit for payment received + Collection record
  if (totalPaymentReceived > 0) {
    const colCount = getCollectionsByEntity(entityId).length + 1;
    const colNumber = `COL-${code}-${dispatchDate.replace(/-/g, '')}-${String(colCount).padStart(4, '0')}`;

    addCollection({
      id: `col_${dispatch.id}_${Date.now()}`,
      entityId,
      collectionNumber: colNumber,
      customerId,
      collectionDate: dispatchDate,
      amount: totalPaymentReceived,
      paymentMode: mode,
      cashAmount: cashPaid > 0 ? cashPaid : undefined,
      onlineAmount: onlinePaid > 0 ? onlinePaid : undefined,
      referenceNumber: input.referenceNumber?.trim() || undefined,
      remarks: mode === 'SPLIT'
        ? `Split payment: Cash ₹${cashPaid} + Online ₹${onlinePaid}`
        : `Payment received during daily route dispatch #${billNumber}`,
      dispatchId: dispatch.id,
      createdBy: user,
      createdAt: now,
    });

    const paymentDescription = mode === 'SPLIT'
      ? `Payment received (Cash: ₹${cashPaid} + Online: ₹${onlinePaid}${input.referenceNumber ? ` ref: ${input.referenceNumber}` : ''}) for bill #${billNumber}`
      : `Payment received (${mode}${input.referenceNumber ? ` ref: ${input.referenceNumber}` : ''}) for bill #${billNumber}`;

    addLedgerEntry({
      id: `led_col_${dispatch.id}_${Date.now()}`,
      entityId,
      customerId,
      date: dispatchDate,
      entryType: 'COLLECTION',
      referenceNumber: colNumber,
      description: paymentDescription,
      debit: 0,
      credit: totalPaymentReceived,
      runningBalance: closingOutstanding,
      createdBy: user,
      createdAt: now,
    });
  }

  // 5. Update Customer Current Outstanding
  updateCustomerBalance(entityId, customerId, closingOutstanding);

  syncDocToFirestore(FIRESTORE_COLLECTIONS.DISPATCHES, dispatch).catch(console.warn);
  return { success: true, dispatch };
}

// CONTROLLED DISPATCH REVISION
export interface ReviseDispatchInput {
  entityId: BusinessEntityId;
  dispatchId: string;
  editReason: string;
  lines: {
    productId: string;
    rate: number;
    billedQuantity: number;
    complimentaryQuantity: number;
    lineAmount: number;
  }[];
  discount: number;
  paymentReceived: number;
  paymentMode?: 'CASH' | 'ONLINE';
  referenceNumber?: string;
  user: string;
}

export function reviseDispatch(input: ReviseDispatchInput): { success: boolean; error?: string; dispatch?: Dispatch } {
  const { entityId, dispatchId, editReason, lines, discount, paymentReceived, paymentMode, referenceNumber, user } = input;

  if (!editReason || editReason.trim().length < 5) {
    return { success: false, error: 'A mandatory edit reason (min 5 characters) is required for audit traceability.' };
  }

  const dispatches = getStored<Dispatch[]>(STORAGE_KEYS.DISPATCHES, []);
  const oldDispatchIndex = dispatches.findIndex((d) => d.id === dispatchId && d.entityId === entityId);
  if (oldDispatchIndex < 0) {
    return { success: false, error: 'Original dispatch not found.' };
  }

  const oldDispatch = dispatches[oldDispatchIndex];
  const customer = getCustomerById(entityId, oldDispatch.customerId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }

  const activeLines = lines.filter((l) => l.billedQuantity > 0 || l.complimentaryQuantity > 0);
  if (activeLines.length === 0) {
    return { success: false, error: 'Please enter quantity for at least one product.' };
  }

  // Calculate new amounts
  const grossAmount = activeLines.reduce((acc, l) => acc + l.lineAmount, 0);
  if (discount < 0 || discount > grossAmount) {
    return { success: false, error: 'Discount cannot exceed gross amount.' };
  }
  const netAmount = Math.max(0, grossAmount - discount);

  // Recalculate customer balance adjustment
  // Old net contribution to customer = oldDispatch.netAmount - oldDispatch.paymentReceived
  // New net contribution to customer = netAmount - paymentReceived
  const deltaOutstanding = (netAmount - paymentReceived) - (oldDispatch.netAmount - oldDispatch.paymentReceived);
  const newCustomerOutstanding = customer.currentOutstanding + deltaOutstanding;

  const now = new Date().toISOString();
  const nextRevision = (oldDispatch.revisionNumber || 1) + 1;

  // 1. Remove/Revert old movements for this dispatch and create updated movements
  const allMovements = getStored<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  const remainingMovements = allMovements.filter(
    (m) => !(m.referenceId === oldDispatch.id && (m.type === 'CUSTOMER_DISPATCH' || m.type === 'COMPLIMENTARY_DISPATCH'))
  );

  const updatedMovements: InventoryMovement[] = [];
  activeLines.forEach((l, i) => {
    if (l.billedQuantity > 0) {
      updatedMovements.push({
        id: `mov_disp_rev_b_${oldDispatch.id}_${nextRevision}_${i}_${Date.now()}`,
        entityId,
        productId: l.productId,
        type: 'CUSTOMER_DISPATCH',
        date: oldDispatch.dispatchDate,
        quantityChange: -l.billedQuantity,
        referenceId: oldDispatch.id,
        referenceType: 'DISPATCH',
        reason: `Revised Dispatch (Rev #${nextRevision}) to ${customer.name} [Reason: ${editReason}]`,
        createdBy: user,
        createdAt: now,
      });
    }
    if (l.complimentaryQuantity > 0) {
      updatedMovements.push({
        id: `mov_disp_rev_c_${oldDispatch.id}_${nextRevision}_${i}_${Date.now()}`,
        entityId,
        productId: l.productId,
        type: 'COMPLIMENTARY_DISPATCH',
        date: oldDispatch.dispatchDate,
        quantityChange: -l.complimentaryQuantity,
        referenceId: oldDispatch.id,
        referenceType: 'DISPATCH',
        reason: `Revised Complimentary (Rev #${nextRevision}) to ${customer.name}`,
        createdBy: user,
        createdAt: now,
      });
    }
  });

  setStored(STORAGE_KEYS.MOVEMENTS, [...remainingMovements, ...updatedMovements]);

  // 2. Add an audit entry in the customer ledger detailing the revision
  addLedgerEntry({
    id: `led_rev_${oldDispatch.id}_${Date.now()}`,
    entityId,
    customerId: customer.id,
    date: oldDispatch.dispatchDate,
    entryType: 'ADJUSTMENT',
    referenceNumber: `${oldDispatch.billNumber}-R${nextRevision}`,
    description: `Audit Revision #${nextRevision} on ${oldDispatch.billNumber}: Net changed from ₹${oldDispatch.netAmount} to ₹${netAmount}. Reason: ${editReason}`,
    debit: deltaOutstanding > 0 ? deltaOutstanding : 0,
    credit: deltaOutstanding < 0 ? Math.abs(deltaOutstanding) : 0,
    runningBalance: newCustomerOutstanding,
    createdBy: user,
    createdAt: now,
  });

  // 3. Update dispatch record
  const revisedDispatch: Dispatch = {
    ...oldDispatch,
    lines: activeLines,
    grossAmount,
    discount,
    netAmount,
    paymentReceived,
    paymentMode,
    referenceNumber: referenceNumber?.trim(),
    closingOutstanding: oldDispatch.previousOutstanding + netAmount - paymentReceived,
    status: 'REVISED',
    revisionNumber: nextRevision,
    editReason,
    updatedBy: user,
    updatedAt: now,
  };

  dispatches[oldDispatchIndex] = revisedDispatch;
  setStored(STORAGE_KEYS.DISPATCHES, dispatches);

  // 4. Update customer balance
  updateCustomerBalance(entityId, customer.id, newCustomerOutstanding);

  syncDocToFirestore(FIRESTORE_COLLECTIONS.DISPATCHES, revisedDispatch).catch(console.warn);
  return { success: true, dispatch: revisedDispatch };
}

// CUSTOMER RETURNS
export function getReturnsByEntity(entityId: BusinessEntityId): CustomerReturn[] {
  const returns = getStored<CustomerReturn[]>(STORAGE_KEYS.RETURNS, []);
  return returns
    .filter((r) => r.entityId === entityId)
    .sort((a, b) => (b.returnDate > a.returnDate ? 1 : -1));
}

export interface PostReturnInput {
  entityId: BusinessEntityId;
  dispatchId: string;
  customerId: string;
  returnDate: string;
  lines: {
    productId: string;
    returnQuantity: number;
    rate: number;
    returnAmount: number;
    reason: 'Leakage' | 'Damaged' | 'Wrong Delivery' | 'Excess Quantity' | 'Other';
    remarks?: string;
    isComplimentaryReturn?: boolean;
  }[];
  user: string;
}

export function postCustomerReturn(input: PostReturnInput): { success: boolean; error?: string; customerReturn?: CustomerReturn } {
  const { entityId, dispatchId, customerId, returnDate, lines, user } = input;

  const dispatch = getDispatchesByEntity(entityId).find((d) => d.id === dispatchId);
  if (!dispatch) {
    return { success: false, error: 'Original dispatch not found.' };
  }

  const customer = getCustomerById(entityId, customerId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }

  const validLines = lines.filter((l) => l.returnQuantity > 0);
  if (validLines.length === 0) {
    return { success: false, error: 'Please enter return quantity for at least one item.' };
  }

  // Calculate return amount and check returnable quantities
  const totalReturnAmount = validLines.reduce((acc, l) => acc + (l.isComplimentaryReturn ? 0 : l.returnAmount), 0);

  const now = new Date().toISOString();
  const entity = getEntityById(entityId);
  const code = entity?.code || 'DF';
  const returnCount = getReturnsByEntity(entityId).length + 1;
  const returnNumber = `RET-${code}-${returnDate.replace(/-/g, '')}-${String(returnCount).padStart(4, '0')}`;

  const customerReturn: CustomerReturn = {
    id: `ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityId,
    returnNumber,
    dispatchId,
    customerId,
    returnDate,
    lines: validLines,
    totalReturnAmount,
    createdBy: user,
    createdAt: now,
  };

  // 1. Save Return
  const returns = getStored<CustomerReturn[]>(STORAGE_KEYS.RETURNS, []);
  returns.push(customerReturn);
  setStored(STORAGE_KEYS.RETURNS, returns);

  // 2. Inventory movements (Returned goods increase inventory)
  const newMovements: InventoryMovement[] = validLines.map((l, i) => ({
    id: `mov_ret_${customerReturn.id}_${i}_${Date.now()}`,
    entityId,
    productId: l.productId,
    type: 'CUSTOMER_RETURN',
    date: returnDate,
    quantityChange: l.returnQuantity, // positive increases inventory
    referenceId: customerReturn.id,
    referenceType: 'RETURN',
    reason: `Customer return from ${customer.name} (Bill #${dispatch.billNumber}, Reason: ${l.reason}${l.remarks ? ` - ${l.remarks}` : ''})`,
    createdBy: user,
    createdAt: now,
  }));
  addInventoryMovements(newMovements);

  // 3. Customer Ledger Credit for the returned amount
  const newBalance = customer.currentOutstanding - totalReturnAmount;
  if (totalReturnAmount > 0) {
    addLedgerEntry({
      id: `led_ret_${customerReturn.id}_${Date.now()}`,
      entityId,
      customerId,
      date: returnDate,
      entryType: 'RETURN',
      referenceNumber: returnNumber,
      description: `Sales return against bill #${dispatch.billNumber} (${validLines.map((l) => `${l.reason}: ${l.returnQuantity} qty`).join(', ')})`,
      debit: 0,
      credit: totalReturnAmount,
      runningBalance: newBalance,
      createdBy: user,
      createdAt: now,
    });
  }

  // 4. Update customer current outstanding
  updateCustomerBalance(entityId, customerId, newBalance);

  syncDocToFirestore(FIRESTORE_COLLECTIONS.RETURNS, customerReturn).catch(console.warn);
  return { success: true, customerReturn };
}

// COLLECTIONS (Independent payment receipts)
export function getCollectionsByEntity(entityId: BusinessEntityId): Collection[] {
  const collections = getStored<Collection[]>(STORAGE_KEYS.COLLECTIONS, []);
  return collections
    .filter((c) => c.entityId === entityId)
    .sort((a, b) => (b.collectionDate > a.collectionDate ? 1 : -1));
}

export function addCollection(collection: Collection): void {
  const collections = getStored<Collection[]>(STORAGE_KEYS.COLLECTIONS, []);
  collections.push(collection);
  setStored(STORAGE_KEYS.COLLECTIONS, collections);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.COLLECTIONS, collection).catch(console.warn);
}

export function recordIndependentCollection(input: {
  entityId: BusinessEntityId;
  customerId: string;
  collectionDate: string;
  amount: number;
  paymentMode: PaymentMode;
  cashAmount?: number;
  onlineAmount?: number;
  referenceNumber?: string;
  remarks?: string;
  user: string;
}): { success: boolean; error?: string; collection?: Collection } {
  const { entityId, customerId, collectionDate, paymentMode, remarks, user } = input;

  let totalAmount = input.amount;
  let cashPaid = input.cashAmount || 0;
  let onlinePaid = input.onlineAmount || 0;

  if (paymentMode === 'SPLIT') {
    totalAmount = cashPaid + onlinePaid;
    if (onlinePaid > 0 && !input.referenceNumber?.trim()) {
      return { success: false, error: 'Reference / UTR number is mandatory for online payment portion.' };
    }
  } else if (paymentMode === 'ONLINE') {
    onlinePaid = totalAmount;
    cashPaid = 0;
    if (totalAmount > 0 && !input.referenceNumber?.trim()) {
      return { success: false, error: 'Reference number is mandatory for online payments.' };
    }
  } else {
    // CASH
    cashPaid = totalAmount;
    onlinePaid = 0;
  }

  if (totalAmount <= 0) {
    return { success: false, error: 'Collection amount must be greater than zero.' };
  }

  const customer = getCustomerById(entityId, customerId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }

  const now = new Date().toISOString();
  const entity = getEntityById(entityId);
  const code = entity?.code || 'DF';
  const colCount = getCollectionsByEntity(entityId).length + 1;
  const colNumber = `COL-${code}-${collectionDate.replace(/-/g, '')}-${String(colCount).padStart(4, '0')}`;

  const collection: Collection = {
    id: `col_ind_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityId,
    collectionNumber: colNumber,
    customerId,
    collectionDate,
    amount: totalAmount,
    paymentMode,
    cashAmount: cashPaid > 0 ? cashPaid : undefined,
    onlineAmount: onlinePaid > 0 ? onlinePaid : undefined,
    referenceNumber: input.referenceNumber?.trim(),
    remarks: remarks?.trim(),
    createdBy: user,
    createdAt: now,
  };

  addCollection(collection);

  // Update customer balance & ledger
  const newOutstanding = customer.currentOutstanding - totalAmount;
  const paymentDescription = paymentMode === 'SPLIT'
    ? `Payment received (Cash: ₹${cashPaid} + Online: ₹${onlinePaid}${input.referenceNumber ? ` Ref: ${input.referenceNumber}` : ''})${remarks ? ` - ${remarks}` : ''}`
    : `Payment received (${paymentMode}${input.referenceNumber ? ` Ref: ${input.referenceNumber}` : ''})${remarks ? ` - ${remarks}` : ''}`;

  addLedgerEntry({
    id: `led_col_ind_${collection.id}_${Date.now()}`,
    entityId,
    customerId,
    date: collectionDate,
    entryType: 'COLLECTION',
    referenceNumber: colNumber,
    description: paymentDescription,
    debit: 0,
    credit: totalAmount,
    runningBalance: newOutstanding,
    createdBy: user,
    createdAt: now,
  });

  updateCustomerBalance(entityId, customerId, newOutstanding);

  return { success: true, collection };
}

// CUSTOMER LEDGER
export function getLedgerByEntity(entityId: BusinessEntityId): CustomerLedgerEntry[] {
  const ledger = getStored<CustomerLedgerEntry[]>(STORAGE_KEYS.LEDGER, []);
  return ledger.filter((l) => l.entityId === entityId);
}

export function getCustomerLedger(entityId: BusinessEntityId, customerId: string): CustomerLedgerEntry[] {
  return getLedgerByEntity(entityId)
    .filter((l) => l.customerId === customerId)
    .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.createdAt > b.createdAt ? 1 : -1));
}

export function addLedgerEntry(entry: CustomerLedgerEntry): void {
  const ledger = getStored<CustomerLedgerEntry[]>(STORAGE_KEYS.LEDGER, []);
  ledger.push(entry);
  setStored(STORAGE_KEYS.LEDGER, ledger);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.LEDGER, entry).catch(console.warn);
}

export function updateCustomerBalance(entityId: BusinessEntityId, customerId: string, newBalance: number): void {
  const customers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  const idx = customers.findIndex((c) => c.id === customerId && c.entityId === entityId);
  if (idx >= 0) {
    customers[idx].currentOutstanding = newBalance;
    customers[idx].updatedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.CUSTOMERS, customers);
    syncDocToFirestore(FIRESTORE_COLLECTIONS.CUSTOMERS, customers[idx]).catch(console.warn);
  }
}

// DAMAGES
export function getDamagesByEntity(entityId: BusinessEntityId): Damage[] {
  const damages = getStored<Damage[]>(STORAGE_KEYS.DAMAGES, []);
  return damages
    .filter((d) => d.entityId === entityId)
    .sort((a, b) => (b.damageDate > a.damageDate ? 1 : -1));
}

export function recordDamage(input: {
  entityId: BusinessEntityId;
  productId: string;
  damageDate: string;
  quantity: number;
  estimatedUnitCost: number;
  reason: string;
  remarks?: string;
  user: string;
}): { success: boolean; error?: string; damage?: Damage } {
  const { entityId, productId, damageDate, quantity, estimatedUnitCost, reason, remarks, user } = input;

  if (quantity <= 0) {
    return { success: false, error: 'Damage quantity must be greater than zero.' };
  }
  if (!reason.trim()) {
    return { success: false, error: 'A valid reason is required for recording damage.' };
  }

  const now = new Date().toISOString();
  const entity = getEntityById(entityId);
  const code = entity?.code || 'DF';
  const dmgCount = getDamagesByEntity(entityId).length + 1;
  const damageNumber = `DMG-${code}-${damageDate.replace(/-/g, '')}-${String(dmgCount).padStart(4, '0')}`;
  const totalCost = quantity * estimatedUnitCost;

  const damage: Damage = {
    id: `dmg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityId,
    damageNumber,
    productId,
    damageDate,
    quantity,
    estimatedUnitCost,
    totalCost,
    reason,
    remarks,
    createdBy: user,
    createdAt: now,
  };

  // 1. Save damage
  const damages = getStored<Damage[]>(STORAGE_KEYS.DAMAGES, []);
  damages.push(damage);
  setStored(STORAGE_KEYS.DAMAGES, damages);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.DAMAGES, damage).catch(console.warn);

  // 2. Reduce inventory
  addInventoryMovement({
    id: `mov_dmg_${damage.id}_${Date.now()}`,
    entityId,
    productId,
    type: 'DAMAGE',
    date: damageDate,
    quantityChange: -quantity,
    referenceId: damage.id,
    referenceType: 'DAMAGE',
    reason: `Damage (${damageNumber}): ${reason}${remarks ? ` - ${remarks}` : ''}`,
    createdBy: user,
    createdAt: now,
  });

  return { success: true, damage };
}

// STOCK ADJUSTMENTS
export function recordStockAdjustment(input: {
  entityId: BusinessEntityId;
  productId: string;
  date: string;
  adjustmentQuantity: number; // can be positive (found surplus) or negative (shortage)
  reason: string;
  user: string;
}): { success: boolean; error?: string } {
  const { entityId, productId, date, adjustmentQuantity, reason, user } = input;

  if (adjustmentQuantity === 0) {
    return { success: false, error: 'Adjustment quantity cannot be zero.' };
  }
  if (!reason.trim() || reason.trim().length < 5) {
    return { success: false, error: 'A mandatory reason (minimum 5 characters) is required for stock adjustments.' };
  }

  const now = new Date().toISOString();
  addInventoryMovement({
    id: `mov_adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityId,
    productId,
    type: 'STOCK_ADJUSTMENT',
    date,
    quantityChange: adjustmentQuantity,
    reason: `Physical Stock Adjustment: ${reason}`,
    createdBy: user,
    createdAt: now,
  });

  return { success: true };
}

// EXPENSES & CATEGORIES
export function getExpenseCategoriesByEntity(entityId: BusinessEntityId): ExpenseCategory[] {
  const cats = getStored<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
  return cats.filter((c) => c.entityId === entityId);
}

export function saveExpenseCategory(entityId: BusinessEntityId, name: string): void {
  const cats = getStored<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
  const newCat = {
    id: `cat_${Date.now()}`,
    entityId,
    name,
    isActive: true,
  };
  cats.push(newCat);
  setStored(STORAGE_KEYS.EXPENSE_CATEGORIES, cats);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.EXPENSE_CATEGORIES, newCat).catch(console.warn);
}

export function getExpensesByEntity(entityId: BusinessEntityId): Expense[] {
  const expenses = getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  return expenses
    .filter((e) => e.entityId === entityId)
    .sort((a, b) => (b.expenseDate > a.expenseDate ? 1 : -1));
}

export function recordExpense(input: {
  entityId: BusinessEntityId;
  expenseDate: string;
  categoryId: string;
  amount: number;
  paymentMode: 'CASH' | 'ONLINE';
  referenceNumber?: string;
  description: string;
  user: string;
}): { success: boolean; error?: string; expense?: Expense } {
  const { entityId, expenseDate, categoryId, amount, paymentMode, referenceNumber, description, user } = input;

  if (amount <= 0) {
    return { success: false, error: 'Expense amount must be greater than zero.' };
  }
  if (!description.trim()) {
    return { success: false, error: 'Expense description is required.' };
  }

  const category = getExpenseCategoriesByEntity(entityId).find((c) => c.id === categoryId);
  const now = new Date().toISOString();
  const entity = getEntityById(entityId);
  const code = entity?.code || 'DF';
  const expCount = getExpensesByEntity(entityId).length + 1;
  const expenseNumber = `EXP-${code}-${expenseDate.replace(/-/g, '')}-${String(expCount).padStart(4, '0')}`;

  const expense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityId,
    expenseNumber,
    expenseDate,
    categoryId,
    categoryName: category?.name || 'General Expense',
    amount,
    paymentMode,
    referenceNumber: referenceNumber?.trim(),
    description: description.trim(),
    createdBy: user,
    createdAt: now,
  };

  const expenses = getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  expenses.push(expense);
  setStored(STORAGE_KEYS.EXPENSES, expenses);
  syncDocToFirestore(FIRESTORE_COLLECTIONS.EXPENSES, expense).catch(console.warn);

  return { success: true, expense };
}

// WHATSAPP SHARE LOG
export function logWhatsAppShare(log: Omit<WhatsAppShareLog, 'id'>): void {
  const logs = getStored<WhatsAppShareLog[]>(STORAGE_KEYS.WHATSAPP_LOGS, []);
  logs.push({
    ...log,
    id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  });
  setStored(STORAGE_KEYS.WHATSAPP_LOGS, logs);
}

export function getWhatsAppLogsByEntity(entityId: BusinessEntityId): WhatsAppShareLog[] {
  const logs = getStored<WhatsAppShareLog[]>(STORAGE_KEYS.WHATSAPP_LOGS, []);
  return logs.filter((l) => l.entityId === entityId);
}
