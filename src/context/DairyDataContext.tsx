import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  PaymentMode,
  VendorPayment,
} from '../types/dairy';
import { useAuth } from './AuthContext';
import * as storage from '../services/storage';
import {
  subscribeToEntityCollection,
  bootstrapCloudFromLocal,
  forceUploadAllToFirestore,
  FIRESTORE_COLLECTIONS,
} from '../services/firestoreSync';

interface DairyDataContextType {
  customers: Customer[];
  products: Product[];
  customerRates: CustomerRate[];
  vendors: Vendor[];
  vendorRates: VendorPurchaseRate[];
  purchases: Purchase[];
  vendorPayments: VendorPayment[];
  dispatches: Dispatch[];
  collections: Collection[];
  damages: Damage[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  returns: CustomerReturn[];
  stockMap: Record<string, number>;
  refreshData: () => void;
  isCloudSyncing: boolean;
  syncNow: () => Promise<void>;
  // Methods
  getCustomerRate: (customerId: string, productId: string) => number | undefined;
  saveCustomerRate: (customerId: string, productId: string, rate: number) => void;
  bulkSaveCustomerRates: (items: { customerId: string; productId: string; rate: number }[]) => void;
  saveCustomer: (customer: Customer) => { success: boolean; error?: string };
  updateRouteSequences: (customerOrder: { id: string; sequence: number }[]) => void;
  saveProduct: (product: Product) => { success: boolean; error?: string };
  saveVendor: (vendor: Vendor) => { success: boolean; error?: string };
  saveVendorRate: (vendorId: string, productId: string, rate: number) => void;
  getVendorRate: (vendorId: string, productId: string) => number | undefined;
  getVendorSummary: (vendorId: string) => {
    totalPurchases: number;
    totalPaid: number;
    totalDiscounts: number;
    remainingDue: number;
    purchaseCount: number;
  };
  getDailyPurchaseSummary: (dateStr: string) => {
    totalBillToday: number;
    todayPayAmount: number;
    totalRemaining: number;
  };
  recordVendorPayment: (payment: Omit<VendorPayment, 'id' | 'entityId' | 'createdBy' | 'createdAt'> & { id?: string }) => {
    success: boolean;
    error?: string;
  };
  postDispatch: (input: Omit<storage.PostDispatchInput, 'entityId' | 'user'>) => {
    success: boolean;
    error?: string;
    dispatch?: Dispatch;
  };
  reviseDispatch: (input: Omit<storage.ReviseDispatchInput, 'entityId' | 'user'>) => {
    success: boolean;
    error?: string;
    dispatch?: Dispatch;
  };
  postReturn: (input: Omit<storage.PostReturnInput, 'entityId' | 'user'>) => {
    success: boolean;
    error?: string;
    customerReturn?: CustomerReturn;
  };
  recordCollection: (input: {
    customerId: string;
    collectionDate: string;
    amount: number;
    paymentMode: PaymentMode;
    cashAmount?: number;
    onlineAmount?: number;
    referenceNumber?: string;
    remarks?: string;
  }) => { success: boolean; error?: string; collection?: Collection };
  recordPurchase: (purchase: Purchase) => { success: boolean; error?: string };
  deletePurchase: (purchaseId: string) => { success: boolean; error?: string };
  recordDamage: (input: {
    productId: string;
    damageDate: string;
    quantity: number;
    estimatedUnitCost: number;
    reason: string;
    remarks?: string;
  }) => { success: boolean; error?: string; damage?: Damage };
  recordStockAdjustment: (input: {
    productId: string;
    date: string;
    adjustmentQuantity: number;
    reason: string;
  }) => { success: boolean; error?: string };
  recordExpense: (input: {
    expenseDate: string;
    categoryId: string;
    amount: number;
    paymentMode: 'CASH' | 'ONLINE';
    referenceNumber?: string;
    description: string;
  }) => { success: boolean; error?: string; expense?: Expense };
  addExpenseCategory: (name: string) => void;
  getCustomerLedger: (customerId: string) => CustomerLedgerEntry[];
}

const DairyDataContext = createContext<DairyDataContextType | undefined>(undefined);

export const DairyDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const entityId = currentUser?.entityId;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerRates, setCustomerRates] = useState<CustomerRate[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorRates, setVendorRates] = useState<VendorPurchaseRate[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    if (!entityId) {
      setCustomers([]);
      setProducts([]);
      setCustomerRates([]);
      setVendors([]);
      setVendorRates([]);
      setPurchases([]);
      setVendorPayments([]);
      setDispatches([]);
      setCollections([]);
      setDamages([]);
      setExpenses([]);
      setExpenseCategories([]);
      setReturns([]);
      setStockMap({});
      return;
    }

    setCustomers(storage.getCustomersByEntity(entityId));
    setProducts(storage.getProductsByEntity(entityId));
    setCustomerRates(storage.getCustomerRatesByEntity(entityId));
    setVendors(storage.getVendorsByEntity(entityId));
    setVendorRates(storage.getVendorRatesByEntity(entityId));
    setPurchases(storage.getPurchasesByEntity(entityId));
    setVendorPayments(storage.getVendorPaymentsByEntity(entityId));
    setDispatches(storage.getDispatchesByEntity(entityId));
    setCollections(storage.getCollectionsByEntity(entityId));
    setDamages(storage.getDamagesByEntity(entityId));
    setExpenses(storage.getExpensesByEntity(entityId));
    setExpenseCategories(storage.getExpenseCategoriesByEntity(entityId));
    setReturns(storage.getReturnsByEntity(entityId));
    setStockMap(storage.getAllProductsCurrentStock(entityId));
  }, [entityId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time Firestore synchronization across all devices
  useEffect(() => {
    if (!entityId) return;

    let isMounted = true;
    setIsCloudSyncing(true);

    // Initial check: if cloud has no data for entity, upload local data so it's not lost
    bootstrapCloudFromLocal(entityId).finally(() => {
      if (isMounted) setIsCloudSyncing(false);
    });

    // Subscribe to all entity collections in real-time
    const unsubCustomers = subscribeToEntityCollection<Customer>(
      FIRESTORE_COLLECTIONS.CUSTOMERS,
      entityId,
      (cloudCustomers) => {
        if (!isMounted) return;
        if (cloudCustomers && cloudCustomers.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.CUSTOMERS, entityId, cloudCustomers);
          setCustomers(cloudCustomers.sort((a, b) => a.routeSequence - b.routeSequence));
        }
      }
    );

    const unsubProducts = subscribeToEntityCollection<Product>(
      FIRESTORE_COLLECTIONS.PRODUCTS,
      entityId,
      (cloudProducts) => {
        if (!isMounted) return;
        if (cloudProducts && cloudProducts.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.PRODUCTS, entityId, cloudProducts);
          setProducts(cloudProducts.sort((a, b) => a.displaySequence - b.displaySequence));
          setStockMap(storage.getAllProductsCurrentStock(entityId));
        }
      }
    );

    const unsubRates = subscribeToEntityCollection<CustomerRate>(
      FIRESTORE_COLLECTIONS.CUSTOMER_RATES,
      entityId,
      (cloudRates) => {
        if (!isMounted) return;
        if (cloudRates && cloudRates.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.CUSTOMER_RATES, entityId, cloudRates);
          setCustomerRates(cloudRates);
        }
      }
    );

    const unsubVendors = subscribeToEntityCollection<Vendor>(
      FIRESTORE_COLLECTIONS.VENDORS,
      entityId,
      (cloudVendors) => {
        if (!isMounted) return;
        if (cloudVendors && cloudVendors.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.VENDORS, entityId, cloudVendors);
          setVendors(cloudVendors);
        }
      }
    );

    const unsubVendorRates = subscribeToEntityCollection<VendorPurchaseRate>(
      FIRESTORE_COLLECTIONS.VENDOR_RATES,
      entityId,
      (cloudVRates) => {
        if (!isMounted) return;
        if (cloudVRates && cloudVRates.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.VENDOR_RATES, entityId, cloudVRates);
          setVendorRates(cloudVRates);
        }
      }
    );

    const unsubPurchases = subscribeToEntityCollection<Purchase>(
      FIRESTORE_COLLECTIONS.PURCHASES,
      entityId,
      (cloudPurchases) => {
        if (!isMounted) return;
        if (cloudPurchases && cloudPurchases.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.PURCHASES, entityId, cloudPurchases);
          setPurchases(cloudPurchases.sort((a, b) => (b.purchaseDate > a.purchaseDate ? 1 : -1)));
          setStockMap(storage.getAllProductsCurrentStock(entityId));
        }
      }
    );

    const unsubDispatches = subscribeToEntityCollection<Dispatch>(
      FIRESTORE_COLLECTIONS.DISPATCHES,
      entityId,
      (cloudDispatches) => {
        if (!isMounted) return;
        if (cloudDispatches && cloudDispatches.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.DISPATCHES, entityId, cloudDispatches);
          setDispatches(cloudDispatches.sort((a, b) => (b.dispatchDate > a.dispatchDate ? 1 : -1)));
          setStockMap(storage.getAllProductsCurrentStock(entityId));
        }
      }
    );

    const unsubCollections = subscribeToEntityCollection<Collection>(
      FIRESTORE_COLLECTIONS.COLLECTIONS,
      entityId,
      (cloudCollections) => {
        if (!isMounted) return;
        if (cloudCollections && cloudCollections.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.COLLECTIONS, entityId, cloudCollections);
          setCollections(cloudCollections.sort((a, b) => (b.collectionDate > a.collectionDate ? 1 : -1)));
        }
      }
    );

    const unsubDamages = subscribeToEntityCollection<Damage>(
      FIRESTORE_COLLECTIONS.DAMAGES,
      entityId,
      (cloudDamages) => {
        if (!isMounted) return;
        if (cloudDamages && cloudDamages.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.DAMAGES, entityId, cloudDamages);
          setDamages(cloudDamages.sort((a, b) => (b.damageDate > a.damageDate ? 1 : -1)));
          setStockMap(storage.getAllProductsCurrentStock(entityId));
        }
      }
    );

    const unsubExpenses = subscribeToEntityCollection<Expense>(
      FIRESTORE_COLLECTIONS.EXPENSES,
      entityId,
      (cloudExpenses) => {
        if (!isMounted) return;
        if (cloudExpenses && cloudExpenses.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.EXPENSES, entityId, cloudExpenses);
          setExpenses(cloudExpenses.sort((a, b) => (b.expenseDate > a.expenseDate ? 1 : -1)));
        }
      }
    );

    const unsubCats = subscribeToEntityCollection<ExpenseCategory>(
      FIRESTORE_COLLECTIONS.EXPENSE_CATEGORIES,
      entityId,
      (cloudCats) => {
        if (!isMounted) return;
        if (cloudCats && cloudCats.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.EXPENSE_CATEGORIES, entityId, cloudCats);
          setExpenseCategories(cloudCats);
        }
      }
    );

    const unsubReturns = subscribeToEntityCollection<CustomerReturn>(
      FIRESTORE_COLLECTIONS.RETURNS,
      entityId,
      (cloudReturns) => {
        if (!isMounted) return;
        if (cloudReturns && cloudReturns.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.RETURNS, entityId, cloudReturns);
          setReturns(cloudReturns);
          setStockMap(storage.getAllProductsCurrentStock(entityId));
        }
      }
    );

    const unsubLedger = subscribeToEntityCollection<CustomerLedgerEntry>(
      FIRESTORE_COLLECTIONS.LEDGER,
      entityId,
      (cloudLedger) => {
        if (!isMounted) return;
        if (cloudLedger && cloudLedger.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.LEDGER, entityId, cloudLedger);
        }
      }
    );

    const unsubVendorPayments = subscribeToEntityCollection<VendorPayment>(
      FIRESTORE_COLLECTIONS.VENDOR_PAYMENTS,
      entityId,
      (cloudPayments) => {
        if (!isMounted) return;
        if (cloudPayments && cloudPayments.length > 0) {
          storage.replaceEntityCollectionInStorage(storage.STORAGE_KEYS.VENDOR_PAYMENTS, entityId, cloudPayments);
          setVendorPayments(cloudPayments.sort((a, b) => (b.paymentDate > a.paymentDate ? 1 : -1)));
        }
      }
    );

    return () => {
      isMounted = false;
      unsubCustomers();
      unsubProducts();
      unsubRates();
      unsubVendors();
      unsubVendorRates();
      unsubPurchases();
      unsubVendorPayments();
      unsubDispatches();
      unsubCollections();
      unsubDamages();
      unsubExpenses();
      unsubCats();
      unsubReturns();
      unsubLedger();
    };
  }, [entityId]);

  const syncNow = async () => {
    if (!entityId) return;
    setIsCloudSyncing(true);
    try {
      await forceUploadAllToFirestore(entityId);
      refreshData();
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const userName = currentUser?.name || 'System';

  const getCustomerRate = (customerId: string, productId: string) => {
    if (!entityId) return undefined;
    return storage.getCustomerRate(entityId, customerId, productId);
  };

  const saveCustomerRate = (customerId: string, productId: string, rate: number) => {
    if (!entityId) return;
    storage.saveCustomerRate(entityId, customerId, productId, rate);
    refreshData();
  };

  const bulkSaveCustomerRates = (items: { customerId: string; productId: string; rate: number }[]) => {
    if (!entityId) return;
    storage.bulkSaveCustomerRates(entityId, items);
    refreshData();
  };

  const saveCustomer = (customer: Customer) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.saveCustomer({ ...customer, entityId }, userName);
    if (res.success) refreshData();
    return res;
  };

  const updateRouteSequences = (customerOrder: { id: string; sequence: number }[]) => {
    if (!entityId) return;
    storage.updateRouteSequences(entityId, customerOrder);
    refreshData();
  };

  const saveProduct = (product: Product) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.saveProduct({ ...product, entityId });
    if (res.success) refreshData();
    return res;
  };

  const saveVendor = (vendor: Vendor) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.saveVendor({ ...vendor, entityId });
    if (res.success) refreshData();
    return res;
  };

  const saveVendorRate = (vendorId: string, productId: string, rate: number) => {
    if (!entityId) return;
    storage.saveVendorPurchaseRate(entityId, vendorId, productId, rate);
    refreshData();
  };

  const getVendorRate = (vendorId: string, productId: string) => {
    if (!entityId) return undefined;
    return storage.getVendorPurchaseRate(entityId, vendorId, productId);
  };

  const postDispatch = (input: Omit<storage.PostDispatchInput, 'entityId' | 'user'>) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.postDispatch({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const reviseDispatch = (input: Omit<storage.ReviseDispatchInput, 'entityId' | 'user'>) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.reviseDispatch({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const postReturn = (input: Omit<storage.PostReturnInput, 'entityId' | 'user'>) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.postCustomerReturn({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const recordCollection = (input: {
    customerId: string;
    collectionDate: string;
    amount: number;
    paymentMode: PaymentMode;
    cashAmount?: number;
    onlineAmount?: number;
    referenceNumber?: string;
    remarks?: string;
  }) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.recordIndependentCollection({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const recordPurchase = (purchase: Purchase) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.savePurchase({ ...purchase, entityId }, userName);
    if (res.success) refreshData();
    return res;
  };

  const deletePurchase = (purchaseId: string) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.deletePurchase(purchaseId, userName);
    if (res.success) refreshData();
    return res;
  };

  const recordDamage = (input: {
    productId: string;
    damageDate: string;
    quantity: number;
    estimatedUnitCost: number;
    reason: string;
    remarks?: string;
  }) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.recordDamage({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const recordStockAdjustment = (input: {
    productId: string;
    date: string;
    adjustmentQuantity: number;
    reason: string;
  }) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.recordStockAdjustment({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const recordExpense = (input: {
    expenseDate: string;
    categoryId: string;
    amount: number;
    paymentMode: 'CASH' | 'ONLINE';
    referenceNumber?: string;
    description: string;
  }) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const res = storage.recordExpense({ ...input, entityId, user: userName });
    if (res.success) refreshData();
    return res;
  };

  const addExpenseCategory = (name: string) => {
    if (!entityId) return;
    storage.saveExpenseCategory(entityId, name);
    refreshData();
  };

  const getCustomerLedger = (customerId: string): CustomerLedgerEntry[] => {
    if (!entityId) return [];
    return storage.getCustomerLedger(entityId, customerId);
  };

  const getVendorSummary = (vendorId: string) => {
    if (!entityId) {
      return { totalPurchases: 0, totalPaid: 0, totalDiscounts: 0, remainingDue: 0, purchaseCount: 0 };
    }
    return storage.getVendorFinancialSummary(entityId, vendorId);
  };

  const getDailyPurchaseSummary = (dateStr: string) => {
    if (!entityId) {
      return { totalBillToday: 0, todayPayAmount: 0, totalRemaining: 0 };
    }
    return storage.getDailyPurchaseFinancialSummary(entityId, dateStr);
  };

  const recordVendorPayment = (
    input: Omit<VendorPayment, 'id' | 'entityId' | 'createdBy' | 'createdAt'> & { id?: string }
  ) => {
    if (!entityId) return { success: false, error: 'Entity missing' };
    const payment: VendorPayment = {
      ...input,
      id: input.id || `vp_${Date.now()}`,
      entityId,
      createdBy: userName,
      createdAt: new Date().toISOString(),
    };
    const res = storage.saveVendorPayment(payment, userName);
    if (res.success) {
      refreshData();
    }
    return res;
  };

  return (
    <DairyDataContext.Provider
      value={{
        customers,
        products,
        customerRates,
        vendors,
        vendorRates,
        purchases,
        vendorPayments,
        dispatches,
        collections,
        damages,
        expenses,
        expenseCategories,
        returns,
        stockMap,
        refreshData,
        isCloudSyncing,
        syncNow,
        getCustomerRate,
        saveCustomerRate,
        bulkSaveCustomerRates,
        saveCustomer,
        updateRouteSequences,
        saveProduct,
        saveVendor,
        saveVendorRate,
        getVendorRate,
        getVendorSummary,
        getDailyPurchaseSummary,
        recordVendorPayment,
        postDispatch,
        reviseDispatch,
        postReturn,
        recordCollection,
        recordPurchase,
        deletePurchase,
        recordDamage,
        recordStockAdjustment,
        recordExpense,
        addExpenseCategory,
        getCustomerLedger,
      }}
    >
      {children}
    </DairyDataContext.Provider>
  );
};

export function useDairyData(): DairyDataContextType {
  const context = useContext(DairyDataContext);
  if (!context) {
    throw new Error('useDairyData must be used within a DairyDataProvider');
  }
  return context;
}
