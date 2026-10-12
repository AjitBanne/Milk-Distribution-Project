import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Truck,
  AlertCircle,
  CheckCircle2,
  Gift,
  Search,
  Check,
  Plus,
  Minus,
  ChevronRight,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Customer, Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency } from '../../services/whatsapp';

interface DispatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: (dispatchId: string, customer: Customer, advanceToNext?: boolean) => void;
  onErrorToast: (msg: string) => void;
  hasNextCustomer?: boolean;
}

interface ProductEntryState {
  productId: string;
  rate: number;
  rateStr?: string;
  billedQty: string;
  compQty: string;
}

export const DispatchEntryModal: React.FC<DispatchEntryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  onSuccess,
  onErrorToast,
  hasNextCustomer = false,
}) => {
  const { currentEntity } = useAuth();
  const {
    customers,
    products,
    customerRates,
    dispatches,
    stockMap,
    postDispatch,
    bulkSaveCustomerRates,
  } = useDairyData();

  const customer = customers.find((c) => c.id === customerId);
  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive).sort((a, b) => a.displaySequence - b.displaySequence),
    [products]
  );

  // Form State
  const [entries, setEntries] = useState<Record<string, ProductEntryState>>({});
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [paymentReceivedStr, setPaymentReceivedStr] = useState<string>('0');
  const [cashAmountStr, setCashAmountStr] = useState<string>('0');
  const [onlineAmountStr, setOnlineAmountStr] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'SPLIT'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Mobile flow tab: 'products' gives 100% visible screen space to add products; 'payment' handles checkout
  const [mobileTab, setMobileTab] = useState<'products' | 'payment'>('products');
  // State for showing free sample inputs on mobile
  const [showCompInputs, setShowCompInputs] = useState<Record<string, boolean>>({});

  // Auto-save state (persists form state every 10 seconds to localStorage)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState<string | null>(null);

  const draftStorageKey = useMemo(() => {
    return `df_dispatch_draft_${currentEntity?.id || 'morya'}_${customerId}`;
  }, [currentEntity?.id, customerId]);

  // Find customer's last dispatch to display Last Bill in summary
  const lastCustomerDispatch = useMemo(() => {
    return dispatches
      .filter((d) => d.customerId === customerId && d.status !== 'CANCELLED')
      .sort((a, b) => (b.dispatchDate > a.dispatchDate ? 1 : -1))[0];
  }, [dispatches, customerId]);

  // Initialize entries with customer rates, or restore from auto-saved draft
  useEffect(() => {
    if (!isOpen || !customer) return;

    const initialMap: Record<string, ProductEntryState> = {};
    activeProducts.forEach((p) => {
      const rateObj = customerRates.find(
        (r) => r.customerId === customer.id && r.productId === p.id
      );
      const r = rateObj ? rateObj.rate : 0;
      initialMap[p.id] = {
        productId: p.id,
        rate: r,
        rateStr: r > 0 ? String(r) : '0',
        billedQty: '',
        compQty: '',
      };
    });

    // Check for existing auto-saved draft in localStorage
    let draftRestored = false;
    let draftTimeString = '';

    try {
      const savedRaw = localStorage.getItem(draftStorageKey);
      if (savedRaw) {
        const parsedDraft = JSON.parse(savedRaw);
        if (parsedDraft && parsedDraft.customerId === customer.id && parsedDraft.entries) {
          const mergedMap: Record<string, ProductEntryState> = { ...initialMap };
          Object.keys(parsedDraft.entries).forEach((pId) => {
            if (mergedMap[pId]) {
              const dEntry = parsedDraft.entries[pId];
              mergedMap[pId] = {
                ...mergedMap[pId],
                rate: dEntry?.rate !== undefined ? dEntry.rate : mergedMap[pId].rate,
                rateStr: dEntry?.rateStr !== undefined ? dEntry.rateStr : (dEntry?.rate ? String(dEntry.rate) : mergedMap[pId].rateStr),
                billedQty: dEntry?.billedQty || '',
                compQty: dEntry?.compQty || '',
              };
            }
          });

          const hasSubstantiveData =
            Object.values(mergedMap).some(
              (e) => (e.billedQty && e.billedQty !== '0') || (e.compQty && e.compQty !== '0')
            ) ||
            (parsedDraft.discountStr && parsedDraft.discountStr !== '0') ||
            (parsedDraft.paymentReceivedStr && parsedDraft.paymentReceivedStr !== '0') ||
            (parsedDraft.cashAmountStr && parsedDraft.cashAmountStr !== '0') ||
            (parsedDraft.onlineAmountStr && parsedDraft.onlineAmountStr !== '0');

          if (hasSubstantiveData) {
            setEntries(mergedMap);
            setDiscountStr(parsedDraft.discountStr || '0');
            setPaymentReceivedStr(parsedDraft.paymentReceivedStr || '0');
            setCashAmountStr(parsedDraft.cashAmountStr || '0');
            setOnlineAmountStr(parsedDraft.onlineAmountStr || '0');
            setPaymentMode(parsedDraft.paymentMode || 'CASH');
            setReferenceNumber(parsedDraft.referenceNumber || '');
            if (parsedDraft.showCompInputs) {
              setShowCompInputs(parsedDraft.showCompInputs);
            }
            draftRestored = true;
            draftTimeString = new Date(parsedDraft.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error reading dispatch draft from localStorage:', e);
    }

    if (!draftRestored) {
      setEntries(initialMap);
      setDiscountStr('0');
      setPaymentReceivedStr('0');
      setCashAmountStr('0');
      setOnlineAmountStr('0');
      setPaymentMode('CASH');
      setReferenceNumber('');
      setMobileTab('products');
      setShowCompInputs({});
      setRestoredFromDraft(null);
      setLastSavedAt(null);
    } else {
      setRestoredFromDraft(draftTimeString);
      setLastSavedAt(draftTimeString);
      setMobileTab('products');
    }
    setSearchFilter('');
  }, [isOpen, customer, activeProducts, customerRates, draftStorageKey]);

  // Keep ref to latest state for accurate 10-second auto-save without stale closures
  const latestStateRef = useRef({
    entries,
    discountStr,
    paymentReceivedStr,
    cashAmountStr,
    onlineAmountStr,
    paymentMode,
    referenceNumber,
    showCompInputs,
  });

  useEffect(() => {
    latestStateRef.current = {
      entries,
      discountStr,
      paymentReceivedStr,
      cashAmountStr,
      onlineAmountStr,
      paymentMode,
      referenceNumber,
      showCompInputs,
    };
  }, [
    entries,
    discountStr,
    paymentReceivedStr,
    cashAmountStr,
    onlineAmountStr,
    paymentMode,
    referenceNumber,
    showCompInputs,
  ]);

  // Auto-save feature: saves current form state to localStorage every 10 seconds
  useEffect(() => {
    if (!isOpen || !customer) return;

    const performAutoSave = () => {
      const current = latestStateRef.current;
      if (!current) return;

      const hasContent =
        Object.values(current.entries).some(
          (e) => (e.billedQty && e.billedQty !== '0') || (e.compQty && e.compQty !== '0')
        ) ||
        (current.paymentReceivedStr !== '0' && current.paymentReceivedStr !== '') ||
        (current.discountStr !== '0' && current.discountStr !== '') ||
        (current.cashAmountStr !== '0' && current.cashAmountStr !== '') ||
        (current.onlineAmountStr !== '0' && current.onlineAmountStr !== '') ||
        (current.referenceNumber && current.referenceNumber.trim() !== '');

      if (hasContent) {
        try {
          const draftPayload = {
            customerId: customer.id,
            timestamp: Date.now(),
            ...current,
          };
          localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
          const timeNow = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastSavedAt(timeNow);
        } catch (err) {
          console.warn('Auto-save dispatch error:', err);
        }
      }
    };

    // Auto-save interval runs every 10 seconds
    const intervalTimer = setInterval(performAutoSave, 10000);

    // Also auto-save if mobile browser or window is refreshed/closed
    const handleBeforeUnload = () => {
      performAutoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, customer, draftStorageKey]);

  // Discard draft handler
  const handleDiscardDraft = () => {
    if (!customer) return;
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (e) {
      // ignore
    }
    const cleanMap: Record<string, ProductEntryState> = {};
    activeProducts.forEach((p) => {
      const rateObj = customerRates.find(
        (r) => r.customerId === customer.id && r.productId === p.id
      );
      cleanMap[p.id] = {
        productId: p.id,
        rate: rateObj ? rateObj.rate : 0,
        billedQty: '',
        compQty: '',
      };
    });
    setEntries(cleanMap);
    setDiscountStr('0');
    setPaymentReceivedStr('0');
    setCashAmountStr('0');
    setOnlineAmountStr('0');
    setPaymentMode('CASH');
    setReferenceNumber('');
    setShowCompInputs({});
    setRestoredFromDraft(null);
    setLastSavedAt(null);
  };

  if (!isOpen || !customer) return null;

  const handleQtyChange = (productId: string, field: 'billedQty' | 'compQty', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setEntries((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: val,
      },
    }));
  };

  const handleRateChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    const cleanNum = isNaN(num) || num < 0 ? 0 : num;
    setEntries((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { productId, billedQty: '', compQty: '' }),
        rate: cleanNum,
        rateStr: val,
      },
    }));
  };

  const handleStep = (productId: string, field: 'billedQty' | 'compQty', delta: number) => {
    const currentVal = parseInt(entries[productId]?.[field] || '0', 10) || 0;
    const newVal = Math.max(0, currentVal + delta);
    handleQtyChange(productId, field, newVal > 0 ? String(newVal) : '');
  };

  const handleQuickAdd = (productId: string, qty: number) => {
    handleStep(productId, 'billedQty', qty);
  };

  // Calculations
  const linesCalculation = activeProducts.map((p) => {
    const entry = entries[p.id] || { rate: 0, billedQty: '', compQty: '' };
    const billedQty = parseInt(entry.billedQty, 10) || 0;
    const compQty = parseInt(entry.compQty, 10) || 0;
    const rate = entry.rate || 0;
    const lineAmount = billedQty * rate;
    const currentStock = stockMap[p.id] || 0;
    const totalRequired = billedQty + compQty;
    const hasInsufficientStock = totalRequired > currentStock;
    const missingRate = billedQty > 0 && rate <= 0;

    return {
      product: p,
      rate,
      billedQty,
      compQty,
      lineAmount,
      currentStock,
      totalRequired,
      hasInsufficientStock,
      missingRate,
    };
  });

  const grossAmount = linesCalculation.reduce((acc, l) => acc + l.lineAmount, 0);
  const discount = Math.max(0, parseFloat(discountStr) || 0);
  const netBill = Math.max(0, grossAmount - discount);

  // Auto-fill default full payment when user has entered items and paymentReceived is still 0
  const activeItemsCount = linesCalculation.filter((l) => l.billedQty > 0 || l.compQty > 0).length;

  // Payment Calculation based on mode
  let effectivePaymentReceived = 0;
  let cashNum = 0;
  let onlineNum = 0;

  if (paymentMode === 'SPLIT') {
    cashNum = Math.max(0, parseFloat(cashAmountStr) || 0);
    onlineNum = Math.max(0, parseFloat(onlineAmountStr) || 0);
    effectivePaymentReceived = cashNum + onlineNum;
  } else if (paymentMode === 'ONLINE') {
    onlineNum = Math.max(0, parseFloat(paymentReceivedStr) || 0);
    effectivePaymentReceived = onlineNum;
  } else {
    // CASH
    cashNum = Math.max(0, parseFloat(paymentReceivedStr) || 0);
    effectivePaymentReceived = cashNum;
  }

  const previousOutstanding = customer.currentOutstanding;
  const newOutstanding = previousOutstanding + netBill - effectivePaymentReceived;

  const hasAnyBilledItem = linesCalculation.some((l) => l.billedQty > 0 || l.compQty > 0);
  const hasRateErrors = linesCalculation.some((l) => l.missingRate);
  const hasStockErrors = linesCalculation.some((l) => l.hasInsufficientStock);

  const doSubmit = (advanceToNext: boolean) => {
    if (!hasAnyBilledItem) {
      onErrorToast('Please enter billed or complimentary quantity for at least one product.');
      return;
    }
    if (hasRateErrors) {
      const missing = linesCalculation.find((l) => l.missingRate);
      onErrorToast(`Please enter a delivery rate for ${missing?.product.name || 'product'} (editable directly in the rate box).`);
      return;
    }
    if (hasStockErrors) {
      onErrorToast('Cannot proceed: insufficient stock for one or more requested items.');
      return;
    }
    if (discount > grossAmount) {
      onErrorToast('Discount cannot exceed the gross bill amount.');
      return;
    }
    if (paymentMode === 'ONLINE' && effectivePaymentReceived > 0 && !referenceNumber.trim()) {
      onErrorToast('Reference / UTR number is mandatory for online payment.');
      return;
    }
    if (paymentMode === 'SPLIT' && onlineNum > 0 && !referenceNumber.trim()) {
      onErrorToast('Reference / UTR number is required for the online portion of split payment.');
      return;
    }

    setIsSubmitting(true);

    const postLines = linesCalculation
      .filter((l) => l.billedQty > 0 || l.compQty > 0)
      .map((l) => ({
        productId: l.product.id,
        rate: l.rate,
        billedQuantity: l.billedQty,
        complimentaryQuantity: l.compQty,
        lineAmount: l.lineAmount,
      }));

    const result = postDispatch({
      customerId: customer.id,
      dispatchDate: TODAY_STR,
      lines: postLines,
      discount,
      paymentReceived: effectivePaymentReceived,
      paymentMode: effectivePaymentReceived > 0 ? paymentMode : undefined,
      cashAmount: effectivePaymentReceived > 0 && (paymentMode === 'CASH' || paymentMode === 'SPLIT') ? cashNum : undefined,
      onlineAmount: effectivePaymentReceived > 0 && (paymentMode === 'ONLINE' || paymentMode === 'SPLIT') ? onlineNum : undefined,
      referenceNumber: effectivePaymentReceived > 0 && (paymentMode === 'ONLINE' || (paymentMode === 'SPLIT' && onlineNum > 0)) ? referenceNumber.trim() : undefined,
    });

    setIsSubmitting(false);

    if (result.success && result.dispatch) {
      // Auto-update Customer Rate Master with all entered/customized rates so tomorrow it comes predefined!
      const ratesToUpdate: { customerId: string; productId: string; rate: number }[] = [];
      Object.values(entries).forEach((e) => {
        if (e.rate > 0) {
          ratesToUpdate.push({
            customerId: customer.id,
            productId: e.productId,
            rate: e.rate,
          });
        }
      });
      if (ratesToUpdate.length > 0) {
        bulkSaveCustomerRates(ratesToUpdate);
      }

      // Clear auto-saved draft upon successful submission
      try {
        localStorage.removeItem(draftStorageKey);
      } catch (err) {
        // ignore
      }
      onSuccess(result.dispatch.id, customer, advanceToNext);
      if (!advanceToNext) {
        onClose();
      }
    } else {
      onErrorToast(result.error || 'Failed to post customer dispatch.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit(false);
  };

  const filteredProducts = activeProducts.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      {/* Full-screen drawer on mobile, centered modal on desktop */}
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[94vh] rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-5xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-3.5 sm:px-5 py-3 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">{customer.name}</h3>
                <span className="text-[10px] bg-blue-900 text-blue-200 border border-blue-700 px-1.5 py-0.2 rounded font-mono shrink-0">
                  #{customer.routeSequence}
                </span>
                {lastSavedAt && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Auto-saved {lastSavedAt}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                +91 {customer.mobileNumber} · {customer.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedAt && (
              <span className="sm:hidden inline-flex items-center gap-1 text-[9px] text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Draft Restored Banner */}
        {restoredFromDraft && (
          <div className="bg-amber-50 border-b border-amber-200 px-3.5 sm:px-5 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                Restored unsaved draft ({restoredFromDraft}) · Auto-saving every 10s
              </span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-amber-800 hover:text-red-700 font-bold underline ml-2 text-[11px] cursor-pointer shrink-0 flex items-center gap-1"
              title="Discard draft and reset"
            >
              <RotateCcw className="w-3 h-3" />
              Discard Draft
            </button>
          </div>
        )}

        {/* Mobile Navigation Tabs (Gives 100% of the visible space to Products) */}
        <div className="sm:hidden flex items-center border-b border-slate-200 bg-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              mobileTab === 'products'
                ? 'border-blue-600 text-blue-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>1. Select Products</span>
            {activeItemsCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {activeItemsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('payment')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              mobileTab === 'payment'
                ? 'border-blue-600 text-blue-800 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>2. Payment &amp; Bill</span>
            {netBill > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                ₹{netBill.toFixed(0)}
              </span>
            )}
          </button>
        </div>

        {/* Compact Account Summary Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-3.5 sm:px-5 py-2 shrink-0">
          {/* Mobile 1-row summary */}
          <div className="sm:hidden flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-500">Old Due: </span>
              <strong className="font-mono text-slate-900">{formatIndianCurrency(previousOutstanding)}</strong>
            </div>
            <div className="text-center">
              <span className="text-slate-500">Today: </span>
              <strong className="font-mono text-blue-700 font-bold">{formatIndianCurrency(netBill)}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Closing: </span>
              <strong className={`font-mono font-bold ${newOutstanding > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {formatIndianCurrency(newOutstanding)}
              </strong>
            </div>
          </div>

          {/* Desktop multi-box summary */}
          <div className="hidden sm:grid sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Previous Balance</div>
              <div className="font-bold text-slate-900 text-sm font-mono">
                {formatIndianCurrency(previousOutstanding)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Last Bill Date</div>
              <div className="font-medium text-slate-800 truncate">
                {lastCustomerDispatch ? lastCustomerDispatch.dispatchDate : 'None'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Last Bill Amount</div>
              <div className="font-medium text-slate-800 font-mono">
                {lastCustomerDispatch ? formatIndianCurrency(lastCustomerDispatch.netAmount) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Today’s Net Bill</div>
              <div className="font-bold text-blue-700 text-sm font-mono">
                {formatIndianCurrency(netBill)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Today’s Payment</div>
              <div className="font-bold text-emerald-700 text-sm font-mono">
                {formatIndianCurrency(effectivePaymentReceived)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Projected Due</div>
              <div className="font-bold text-rose-700 text-sm font-mono">
                {formatIndianCurrency(newOutstanding)}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE VIEW - TAB 1: MAXIMUM VISIBLE SPACE PRODUCT CARDS                  */}
        {/* ========================================================================= */}
        <div
          className={`sm:hidden flex-1 flex flex-col overflow-hidden bg-slate-100 ${
            mobileTab === 'products' ? 'flex' : 'hidden'
          }`}
        >
          {/* Search bar */}
          <div className="p-2.5 bg-white border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search milk, curd, paneer..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Touch-Friendly Mobile Product Cards Container with Full Height Scroll */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 overscroll-contain">
            {filteredProducts.map((p) => {
              const entry = entries[p.id] || { rate: 0, billedQty: '', compQty: '' };
              const billedQty = parseInt(entry.billedQty, 10) || 0;
              const compQty = parseInt(entry.compQty, 10) || 0;
              const rate = entry.rate || 0;
              const lineAmount = billedQty * rate;
              const currentStock = stockMap[p.id] || 0;
              const totalReq = billedQty + compQty;
              const isStockShortage = totalReq > currentStock;
              const isMissingRate = billedQty > 0 && rate <= 0;
              const isSelected = billedQty > 0 || compQty > 0;
              const isCompOpen = showCompInputs[p.id] || compQty > 0;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl p-3 border transition-all shadow-xs ${
                    isSelected
                      ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header: Product Name, Rate, Stock */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {p.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5">
                          <span className="text-slate-500 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={entry.rateStr !== undefined ? entry.rateStr : (rate > 0 ? String(rate) : '0')}
                            onChange={(e) => handleRateChange(p.id, e.target.value)}
                            className="w-14 font-mono font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600 rounded text-[11px]"
                            title="Edit customer rate (auto-saved to customer master for next day)"
                          />
                          <span className="text-slate-500 text-[10px]">/{p.unit}</span>
                        </div>
                        <span
                          className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            currentStock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : currentStock < 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Stock: {currentStock}
                        </span>
                      </div>
                    </div>

                    {/* Line Total Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {lineAmount > 0 ? formatIndianCurrency(lineAmount) : '—'}
                      </div>
                      {compQty > 0 && (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          +{compQty} Free
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Errors */}
                  {isMissingRate && (
                    <div className="mt-1.5 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> No rate set for customer!
                    </div>
                  )}
                  {isStockShortage && (
                    <div className="mt-1.5 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Shortage: only {currentStock} available
                    </div>
                  )}

                  {/* Quantity Stepper & Quick Add Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {/* Stepper with Large Touch Targets */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStep(p.id, 'billedQty', -1)}
                        disabled={billedQty <= 0}
                        className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 rounded-lg text-slate-800 font-bold transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={entry.billedQty}
                        onChange={(e) => handleQtyChange(p.id, 'billedQty', e.target.value)}
                        className="w-14 h-9 text-center font-bold text-base text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />

                      <button
                        type="button"
                        onClick={() => handleStep(p.id, 'billedQty', 1)}
                        className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Add Chips for Fast Route Deliveries */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 5, 10].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => handleQuickAdd(p.id, step)}
                          className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-blue-100 text-slate-700 active:text-blue-800 rounded-md transition-colors cursor-pointer"
                        >
                          +{step}
                        </button>
                      ))}

                      {/* Complimentary Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setShowCompInputs((prev) => ({
                            ...prev,
                            [p.id]: !prev[p.id],
                          }))
                        }
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                          compQty > 0
                            ? 'bg-emerald-100 text-emerald-800 font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Add complimentary free sample"
                      >
                        <Gift className="w-3 h-3" />
                        <span>Free</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Free Sample Stepper */}
                  {isCompOpen && (
                    <div className="mt-2 pt-2 border-t border-dashed border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                      <span className="font-semibold text-emerald-900 text-[11px] flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-emerald-600" /> Free / Sample Qty:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStep(p.id, 'compQty', -1)}
                          disabled={compQty <= 0}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-emerald-200 rounded text-emerald-800 font-bold disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={entry.compQty}
                          onChange={(e) => handleQtyChange(p.id, 'compQty', e.target.value)}
                          className="w-10 h-7 text-center font-bold text-xs text-emerald-900 bg-white border border-emerald-300 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleStep(p.id, 'compQty', 1)}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Slim Sticky Mobile Action Bar on Products Tab */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0 shadow-lg flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                {activeItemsCount} item(s) selected
              </div>
              <div className="text-base font-extrabold text-slate-900 font-mono leading-tight">
                {formatIndianCurrency(netBill)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!hasAnyBilledItem || hasRateErrors || hasStockErrors}
                onClick={() => {
                  if (paymentReceivedStr === '0' && effectivePaymentReceived === 0) {
                    setPaymentReceivedStr(String(netBill));
                  }
                  setMobileTab('payment');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Proceed to Pay</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE VIEW - TAB 2: PAYMENT & DISPATCH FINALIZATION                      */}
        {/* ========================================================================= */}
        <div
          className={`sm:hidden flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50 ${
            mobileTab === 'payment' ? 'block' : 'hidden'
          }`}
        >
          {/* Selected items quick summary */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                <span>Selected Items ({activeItemsCount})</span>
              </h4>
              <button
                type="button"
                onClick={() => setMobileTab('products')}
                className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Edit Items
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
              {linesCalculation
                .filter((l) => l.billedQty > 0 || l.compQty > 0)
                .map((l) => (
                  <div key={l.product.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{l.product.name}</span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {l.billedQty > 0 && `${l.billedQty} × ₹${l.rate}`}
                        {l.compQty > 0 && ` (+${l.compQty} Free)`}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatIndianCurrency(l.lineAmount)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between font-bold text-xs">
              <span>Gross Total:</span>
              <span className="font-mono">{formatIndianCurrency(grossAmount)}</span>
            </div>
          </div>

          {/* Discount & Payment Controls for Mobile */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-3 shadow-xs text-xs">
            {/* Discount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Payment Mode Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Payment Mode
                </label>
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (paymentMode === 'SPLIT') {
                        const half = Math.round((netBill / 2) * 100) / 100;
                        setCashAmountStr(String(half));
                        setOnlineAmountStr(String(netBill - half));
                      } else {
                        setPaymentReceivedStr(String(netBill));
                      }
                    }}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                  >
                    Full (₹{netBill.toFixed(0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentReceivedStr('0');
                      setCashAmountStr('0');
                      setOnlineAmountStr('0');
                    }}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                  >
                    Due ₹0
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    paymentMode === 'CASH'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Cash Only
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('ONLINE')}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    paymentMode === 'ONLINE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Online / UPI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('SPLIT');
                    if (cashAmountStr === '0' && onlineAmountStr === '0' && parseFloat(paymentReceivedStr) > 0) {
                      const prevVal = parseFloat(paymentReceivedStr);
                      const half = Math.round((prevVal / 2) * 100) / 100;
                      setCashAmountStr(String(half));
                      setOnlineAmountStr(String(prevVal - half));
                    }
                  }}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    paymentMode === 'SPLIT'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Split Pay
                </button>
              </div>

              {paymentMode === 'CASH' && (
                <div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentReceivedStr}
                    onChange={(e) => setPaymentReceivedStr(e.target.value)}
                    placeholder="Enter cash received"
                    className="w-full px-3 py-2 text-sm font-bold text-emerald-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              {paymentMode === 'ONLINE' && (
                <div className="space-y-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentReceivedStr}
                    onChange={(e) => setPaymentReceivedStr(e.target.value)}
                    placeholder="Enter online amount"
                    className="w-full px-3 py-2 text-sm font-bold text-blue-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {onlineNum > 0 && (
                    <input
                      type="text"
                      required
                      placeholder="UPI / UTR Transaction Reference #"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  )}
                </div>
              )}

              {paymentMode === 'SPLIT' && (
                <div className="space-y-2 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Cash Portion (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={cashAmountStr}
                        onChange={(e) => setCashAmountStr(e.target.value)}
                        placeholder="Cash ₹"
                        className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Online Portion (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={onlineAmountStr}
                        onChange={(e) => setOnlineAmountStr(e.target.value)}
                        placeholder="Online ₹"
                        className="w-full px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  {onlineNum > 0 && (
                    <input
                      type="text"
                      required
                      placeholder="UPI / UTR Transaction Reference #"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Final Calculation Summary Card for Mobile */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Net Today’s Bill:</span>
              <span className="font-bold text-slate-900 font-mono">{formatIndianCurrency(netBill)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Payment Received Today:</span>
              <span className="font-bold text-emerald-700 font-mono">-₹{effectivePaymentReceived.toFixed(2)}</span>
            </div>
            <div className="border-t border-blue-200 pt-1.5 flex items-center justify-between">
              <span className="font-bold text-blue-950">Closing Customer Balance:</span>
              <span className="font-bold text-rose-700 text-sm font-mono">
                {formatIndianCurrency(newOutstanding)}
              </span>
            </div>
          </div>

          {/* Mobile Bottom Action Buttons */}
          <div className="space-y-2 pt-1 pb-4">
            <button
              type="button"
              disabled={!hasAnyBilledItem || hasRateErrors || hasStockErrors || isSubmitting}
              onClick={() => doSubmit(false)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Posting Dispatch...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Save Daily Dispatch</span>
                </>
              )}
            </button>

            {hasNextCustomer && (
              <button
                type="button"
                disabled={!hasAnyBilledItem || hasRateErrors || hasStockErrors || isSubmitting}
                onClick={() => doSubmit(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Truck className="w-4 h-4" />
                <span>Save &amp; Proceed to Next Customer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileTab('products')}
              className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              ← Back to Product Selection
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP VIEW - TABLE & RAPID-ENTRY KEYBOARD WORKFLOW                      */}
        {/* ========================================================================= */}
        <div className="hidden sm:flex flex-1 flex-col overflow-hidden bg-white">
          {/* Product Grid Area with search */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter dairy products..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div className="text-xs text-slate-500">
                Showing {filteredProducts.length} active products · Use <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px]">Tab</kbd> to jump
              </div>
            </div>

            {/* Desktop Rapid-Entry Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2 text-right">In Stock</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-center bg-blue-50/70 text-blue-900">
                      Billed Qty
                    </th>
                    <th className="py-2.5 px-3 w-28 text-center bg-emerald-50/70 text-emerald-900">
                      Free / Sample
                    </th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const entry = entries[p.id] || { rate: 0, billedQty: '', compQty: '' };
                    const billedQty = parseInt(entry.billedQty, 10) || 0;
                    const compQty = parseInt(entry.compQty, 10) || 0;
                    const rate = entry.rate || 0;
                    const lineAmount = billedQty * rate;
                    const currentStock = stockMap[p.id] || 0;
                    const totalReq = billedQty + compQty;
                    const isLow = currentStock < 10;
                    const isStockShortage = totalReq > currentStock;
                    const isMissingRate = billedQty > 0 && rate <= 0;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          billedQty > 0 || compQty > 0
                            ? 'bg-blue-50/30'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {p.name}
                          {isMissingRate && (
                            <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> No selling rate configured!
                            </div>
                          )}
                          {isStockShortage && (
                            <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Stock shortage ({currentStock} available)
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-500">
                          {p.unit}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          <span
                            className={`font-semibold ${
                              currentStock <= 0
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {currentStock}
                          </span>
                        </td>
                        <td className="py-1 px-3 text-right">
                          <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-1">
                            <span className="text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={entry.rateStr !== undefined ? entry.rateStr : (rate > 0 ? String(rate) : '0')}
                              onChange={(e) => handleRateChange(p.id, e.target.value)}
                              className="w-16 text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600 rounded text-xs"
                              title="Customer rate (auto-saved to customer rate master for tomorrow)"
                            />
                          </div>
                        </td>
                        {/* Billed Quantity Input */}
                        <td className="py-1 px-3 text-center bg-blue-50/20">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={entry.billedQty}
                            onChange={(e) => handleQtyChange(p.id, 'billedQty', e.target.value)}
                            className="w-20 text-center py-1.5 px-2 font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                          />
                        </td>
                        {/* Complimentary Quantity Input */}
                        <td className="py-1 px-3 text-center bg-emerald-50/20">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={entry.compQty}
                            onChange={(e) => handleQtyChange(p.id, 'compQty', e.target.value)}
                            className="w-20 text-center py-1.5 px-2 font-bold text-emerald-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {lineAmount > 0 ? formatIndianCurrency(lineAmount) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desktop Bottom Billing, Discount, Payment & Action Strip */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 shrink-0 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Bill Discount */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Gross: ₹{grossAmount.toFixed(2)}
                </span>
              </div>

              {/* Payment Received Today */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 lg:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Payment Mode &amp; Amount Received
                  </label>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMode === 'SPLIT') {
                          const half = Math.round((netBill / 2) * 100) / 100;
                          setCashAmountStr(String(half));
                          setOnlineAmountStr(String(netBill - half));
                        } else {
                          setPaymentReceivedStr(String(netBill));
                        }
                      }}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium cursor-pointer"
                    >
                      Full (₹{netBill.toFixed(0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentReceivedStr('0');
                        setCashAmountStr('0');
                        setOnlineAmountStr('0');
                      }}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium cursor-pointer"
                    >
                      Due ₹0
                    </button>
                  </div>
                </div>

                {/* Mode Selector Buttons */}
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                      paymentMode === 'CASH'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Cash Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('ONLINE')}
                    className={`py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                      paymentMode === 'ONLINE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Online / UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('SPLIT');
                      if (cashAmountStr === '0' && onlineAmountStr === '0' && parseFloat(paymentReceivedStr) > 0) {
                        const prevVal = parseFloat(paymentReceivedStr);
                        const half = Math.round((prevVal / 2) * 100) / 100;
                        setCashAmountStr(String(half));
                        setOnlineAmountStr(String(prevVal - half));
                      }
                    }}
                    className={`py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                      paymentMode === 'SPLIT'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Split (Cash+Online)
                  </button>
                </div>

                {/* Input for CASH */}
                {paymentMode === 'CASH' && (
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={paymentReceivedStr}
                      onChange={(e) => setPaymentReceivedStr(e.target.value)}
                      placeholder="Enter cash amount received"
                      className="w-full px-3 py-1.5 text-sm font-semibold text-emerald-700 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                )}

                {/* Input for ONLINE */}
                {paymentMode === 'ONLINE' && (
                  <div className="space-y-1.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={paymentReceivedStr}
                      onChange={(e) => setPaymentReceivedStr(e.target.value)}
                      placeholder="Enter online amount received"
                      className="w-full px-3 py-1.5 text-sm font-semibold text-emerald-700 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    {onlineNum > 0 && (
                      <input
                        type="text"
                        required
                        placeholder="UPI / UTR Transaction Reference #"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600"
                      />
                    )}
                  </div>
                )}

                {/* Inputs for SPLIT (Cash + Online) */}
                {paymentMode === 'SPLIT' && (
                  <div className="space-y-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Cash Portion (₹)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={cashAmountStr}
                          onChange={(e) => setCashAmountStr(e.target.value)}
                          placeholder="Cash ₹"
                          className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Online Portion (₹)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={onlineAmountStr}
                          onChange={(e) => setOnlineAmountStr(e.target.value)}
                          placeholder="Online ₹"
                          className="w-full px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    {onlineNum > 0 && (
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="UPI / UTR Transaction Reference #"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] pt-0.5 text-indigo-900 font-medium">
                      <span>Total Split Received:</span>
                      <span className="font-bold font-mono">₹{effectivePaymentReceived.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Calculation Summary */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Net Today’s Bill:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{netBill.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Today’s Payment:
                    {paymentMode === 'SPLIT' && effectivePaymentReceived > 0 && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        (₹{cashNum.toFixed(0)}c + ₹{onlineNum.toFixed(0)}u)
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-emerald-700 font-mono">-₹{effectivePaymentReceived.toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-200 pt-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950">Closing Outstanding:</span>
                  <span className="font-bold text-rose-700 text-sm font-mono">
                    {formatIndianCurrency(newOutstanding)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">
                {hasAnyBilledItem ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" /> Ready to post dispatch
                  </span>
                ) : (
                  <span>Enter quantity above to enable save</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {hasNextCustomer && (
                  <button
                    type="button"
                    onClick={() => doSubmit(true)}
                    disabled={!hasAnyBilledItem || hasRateErrors || hasStockErrors || isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Save &amp; Next Stop</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!hasAnyBilledItem || hasRateErrors || hasStockErrors || isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Posting Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Daily Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
