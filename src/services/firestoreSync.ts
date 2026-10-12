import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from './firebase';
import {
  Customer,
  Product,
  CustomerRate,
  Vendor,
  VendorPurchaseRate,
  Purchase,
  Dispatch,
  Collection,
  Damage,
  Expense,
  ExpenseCategory,
  CustomerReturn,
  CustomerLedgerEntry,
  User,
  BusinessEntity,
  VendorPayment,
} from '../types/dairy';

// Test connection on boot per Firebase guidelines
testConnection();

export const FIRESTORE_COLLECTIONS = {
  ENTITIES: 'entities',
  USERS: 'users',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  CUSTOMER_RATES: 'customerRates',
  VENDORS: 'vendors',
  VENDOR_RATES: 'vendorPurchaseRates',
  PURCHASES: 'purchases',
  DISPATCHES: 'dispatches',
  COLLECTIONS: 'collections',
  DAMAGES: 'damages',
  EXPENSES: 'expenses',
  EXPENSE_CATEGORIES: 'expenseCategories',
  RETURNS: 'returns',
  LEDGER: 'customerLedger',
  VENDOR_PAYMENTS: 'vendorPayments',
};

/**
 * Recursively removes keys with undefined values from objects and arrays.
 * Firestore setDoc / updateDoc rejects undefined values with:
 * "Unsupported field value: undefined"
 */
export function cleanDataForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanDataForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleaned[key] = cleanDataForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Generic single doc upsert
export async function syncDocToFirestore<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  const path = `${collectionName}/${data.id}`;
  try {
    const docRef = doc(db, collectionName, data.id);
    const sanitized = cleanDataForFirestore(data);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Generic single doc delete
export async function deleteDocFromFirestore(
  collectionName: string,
  id: string
): Promise<void> {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Batch upload helper (for initializing cloud storage from local data)
export async function batchUploadToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    // Firestore batches are limited to 500 operations
    const chunkSize = 450;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const ref = doc(db, collectionName, item.id);
        const sanitized = cleanDataForFirestore(item);
        batch.set(ref, sanitized, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionName);
  }
}

// Subscribe to real-time changes for a specific collection filtered by entityId
export function subscribeToEntityCollection<T extends { id: string }>(
  collectionName: string,
  entityId: string,
  onData: (items: T[]) => void
): Unsubscribe {
  const colRef = collection(db, collectionName);
  const q = query(colRef, where('entityId', '==', entityId));

  return onSnapshot(
    q,
    (snapshot) => {
      const results: T[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as T);
      });
      onData(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  );
}

// Subscribe to users collection
export function subscribeToUsers(onData: (users: User[]) => void): Unsubscribe {
  const colRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const results: User[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as User);
      });
      onData(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.USERS);
    }
  );
}

// Subscribe to entities collection
export function subscribeToEntities(onData: (entities: BusinessEntity[]) => void): Unsubscribe {
  const colRef = collection(db, FIRESTORE_COLLECTIONS.ENTITIES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const results: BusinessEntity[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as BusinessEntity);
      });
      onData(results);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.ENTITIES);
    }
  );
}

// Fetch all items once for initial checks
export async function fetchCollectionOnce<T>(
  collectionName: string,
  entityId?: string
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const q = entityId ? query(colRef, where('entityId', '==', entityId)) : colRef;
    const snap = await getDocs(q);
    const results: T[] = [];
    snap.forEach((d) => results.push(d.data() as T));
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, collectionName);
  }
}

// Bootstrap cloud from local storage if cloud is newly initialized or empty
export async function bootstrapCloudFromLocal(entityId: string): Promise<void> {
  try {
    const cloudCustomers = await fetchCollectionOnce<Customer>(FIRESTORE_COLLECTIONS.CUSTOMERS, entityId);
    
    // If cloud has 0 customers for this entity, upload whatever is in local storage
    if (!cloudCustomers || cloudCustomers.length === 0) {
      console.log(`Cloud storage is empty for entity ${entityId}. Uploading local data to Firestore...`);
      await forceUploadAllToFirestore(entityId);
    }
  } catch (err) {
    console.warn('Bootstrap cloud sync check error:', err);
  }
}

// Upload all local items for an entity to Firestore
export async function forceUploadAllToFirestore(entityId: string): Promise<void> {
  try {
    // Read local items directly
    const getStoredLocal = <T>(key: string): T[] => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
      } catch {
        return [];
      }
    };

    const customers = getStoredLocal<Customer>('df_customers_v1').filter((c) => c.entityId === entityId);
    const products = getStoredLocal<Product>('df_products_v1').filter((p) => p.entityId === entityId);
    const customerRates = getStoredLocal<CustomerRate>('df_customer_rates_v1').filter((r) => r.entityId === entityId);
    const vendors = getStoredLocal<Vendor>('df_vendors_v1').filter((v) => v.entityId === entityId);
    const vendorRates = getStoredLocal<VendorPurchaseRate>('df_vendor_rates_v1').filter((vr) => vr.entityId === entityId);
    const purchases = getStoredLocal<Purchase>('df_purchases_v1').filter((p) => p.entityId === entityId);
    const dispatches = getStoredLocal<Dispatch>('df_dispatches_v1').filter((d) => d.entityId === entityId);
    const collections = getStoredLocal<Collection>('df_collections_v1').filter((c) => c.entityId === entityId);
    const damages = getStoredLocal<Damage>('df_damages_v1').filter((dm) => dm.entityId === entityId);
    const expenses = getStoredLocal<Expense>('df_expenses_v1').filter((e) => e.entityId === entityId);
    const expenseCategories = getStoredLocal<ExpenseCategory>('df_expense_categories_v1').filter((c) => c.entityId === entityId);
    const returns = getStoredLocal<CustomerReturn>('df_returns_v1').filter((r) => r.entityId === entityId);
    const ledger = getStoredLocal<CustomerLedgerEntry>('df_ledger_v1').filter((l) => l.entityId === entityId);
    const vendorPayments = getStoredLocal<VendorPayment>('df_vendor_payments_v1').filter((vp) => vp.entityId === entityId);
    const users = getStoredLocal<User>('df_users_v1');
    const entities = getStoredLocal<BusinessEntity>('df_entities_v1');

    await Promise.all([
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.CUSTOMERS, customers),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, products),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.CUSTOMER_RATES, customerRates),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.VENDORS, vendors),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.VENDOR_RATES, vendorRates),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.PURCHASES, purchases),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.DISPATCHES, dispatches),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.COLLECTIONS, collections),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.DAMAGES, damages),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.EXPENSES, expenses),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.EXPENSE_CATEGORIES, expenseCategories),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.RETURNS, returns),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.LEDGER, ledger),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.VENDOR_PAYMENTS, vendorPayments),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.USERS, users),
      batchUploadToFirestore(FIRESTORE_COLLECTIONS.ENTITIES, entities),
    ]);
    console.log(`Successfully synced all local records for entity ${entityId} to Firestore.`);
  } catch (err) {
    console.error('Error uploading local data to Firestore:', err);
  }
}
