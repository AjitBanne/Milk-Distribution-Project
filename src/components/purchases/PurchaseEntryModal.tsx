import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Purchase, PurchaseLine, Product, PaymentMode } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency } from '../../services/whatsapp';

interface PurchaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPurchase?: Purchase | null;
  onSuccess: (poNumber: string) => void;
  onErrorToast: (msg: string) => void;
}

interface EditablePurchaseLine {
  productId: string;
  quantity: string;
  purchaseRate: string;
}

export const PurchaseEntryModal: React.FC<PurchaseEntryModalProps> = ({
  isOpen,
  onClose,
  editingPurchase,
  onSuccess,
  onErrorToast,
}) => {
  const { currentEntity } = useAuth();
  const { vendors, products, vendorRates, recordPurchase, getVendorRate } = useDairyData();

  const activeVendors = vendors.filter((v) => v.isActive);
  const activeProducts = products.filter((p) => p.isActive);

  const [vendorId, setVendorId] = useState(activeVendors[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState(TODAY_STR);
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'POSTED' | 'DRAFT'>('POSTED');

  // Financial & payment tracking state
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [roundoffStr, setRoundoffStr] = useState<string>('0');
  const [paidAmountStr, setPaidAmountStr] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | 'NONE'>('NONE');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [onlineAmountStr, setOnlineAmountStr] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const [lines, setLines] = useState<EditablePurchaseLine[]>([
    {
      productId: activeProducts[0]?.id || '',
      quantity: '',
      purchaseRate: '',
    },
  ]);

  // Synchronize state when modal opens or editingPurchase changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingPurchase) {
      setVendorId(editingPurchase.vendorId);
      setPurchaseDate(editingPurchase.purchaseDate);
      setVendorInvoiceNumber(editingPurchase.vendorInvoiceNumber || '');
      setRemarks(editingPurchase.remarks || '');
      setStatus(editingPurchase.status === 'DRAFT' ? 'DRAFT' : 'POSTED');
      setDiscountStr(String(editingPurchase.discount || 0));
      setRoundoffStr(String(editingPurchase.roundoff || 0));
      setPaidAmountStr(editingPurchase.paidAmount ? String(editingPurchase.paidAmount) : '');
      setPaymentMode(editingPurchase.paymentMode || (editingPurchase.paidAmount ? 'CASH' : 'NONE'));
      setCashAmountStr(editingPurchase.cashAmount ? String(editingPurchase.cashAmount) : '');
      setOnlineAmountStr(editingPurchase.onlineAmount ? String(editingPurchase.onlineAmount) : '');
      setPaymentReference(editingPurchase.paymentReference || '');
      if (editingPurchase.lines && editingPurchase.lines.length > 0) {
        setLines(
          editingPurchase.lines.map((l) => ({
            productId: l.productId,
            quantity: String(l.quantity),
            purchaseRate: String(l.purchaseRate),
          }))
        );
      }
    } else {
      setVendorId(activeVendors[0]?.id || '');
      setPurchaseDate(TODAY_STR);
      setVendorInvoiceNumber('');
      setRemarks('');
      setStatus('POSTED');
      setDiscountStr('0');
      setRoundoffStr('0');
      setPaidAmountStr('');
      setPaymentMode('NONE');
      setCashAmountStr('');
      setOnlineAmountStr('');
      setPaymentReference('');
      setLines([
        {
          productId: activeProducts[0]?.id || '',
          quantity: '',
          purchaseRate: '',
        },
      ]);
    }
  }, [isOpen, editingPurchase]);

  // When vendor changes on a new purchase, prefill rates
  useEffect(() => {
    if (!vendorId || editingPurchase) return;
    setLines((prev) =>
      prev.map((l) => {
        const agreedRate = getVendorRate(vendorId, l.productId);
        return {
          ...l,
          purchaseRate: agreedRate ? String(agreedRate) : l.purchaseRate || '',
        };
      })
    );
  }, [vendorId, getVendorRate, editingPurchase]);

  if (!isOpen) return null;

  const handleProductChange = (index: number, newProductId: string) => {
    const agreedRate = getVendorRate(vendorId, newProductId);
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              productId: newProductId,
              purchaseRate: agreedRate ? String(agreedRate) : '',
            }
          : l
      )
    );
  };

  const handleLineValueChange = (index: number, field: 'quantity' | 'purchaseRate', val: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: val } : l))
    );
  };

  const addLine = () => {
    // Select first product not already in lines, or first active product
    const usedProductIds = new Set(lines.map((l) => l.productId));
    const available = activeProducts.find((p) => !usedProductIds.has(p.id)) || activeProducts[0];
    const agreedRate = getVendorRate(vendorId, available.id);

    setLines([
      ...lines,
      {
        productId: available.id,
        quantity: '',
        purchaseRate: agreedRate ? String(agreedRate) : '',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedLines = lines.map((l) => {
    const qty = parseFloat(l.quantity) || 0;
    const rate = parseFloat(l.purchaseRate) || 0;
    const lineAmount = qty * rate;
    const prod = products.find((p) => p.id === l.productId);
    return { ...l, qty, rate, lineAmount, prod };
  });

  const grossAmount = calculatedLines.reduce((acc, l) => acc + l.lineAmount, 0);
  const discountNum = Math.max(0, parseFloat(discountStr) || 0);
  const roundoffNum = parseFloat(roundoffStr) || 0;
  const netAmount = Math.max(0, grossAmount - discountNum + roundoffNum);
  const paidNum = Math.max(0, parseFloat(paidAmountStr) || 0);
  const remainingNum = Math.max(0, netAmount - paidNum);

  const handleAutoRound = () => {
    const rawNet = grossAmount - discountNum;
    if (rawNet <= 0) return;
    const rounded = Math.round(rawNet);
    const diff = rounded - rawNet;
    setRoundoffStr(diff.toFixed(2));
  };

  const handlePayFull = () => {
    setPaidAmountStr(String(netAmount));
    if (paymentMode === 'NONE') {
      setPaymentMode('ONLINE');
    }
    if (paymentMode === 'SPLIT') {
      setCashAmountStr(String(netAmount));
      setOnlineAmountStr('0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      onErrorToast('Please select a supplier vendor.');
      return;
    }
    if (!vendorInvoiceNumber.trim()) {
      onErrorToast('Vendor invoice / delivery challan number is required.');
      return;
    }

    // Check duplicate products
    const seen = new Set<string>();
    for (const l of lines) {
      if (seen.has(l.productId)) {
        onErrorToast('Duplicate product lines detected in this purchase order.');
        return;
      }
      seen.add(l.productId);
    }

    // Validate line quantities and rates
    for (const cl of calculatedLines) {
      if (cl.qty <= 0) {
        onErrorToast(`Please enter a valid quantity for ${cl.prod?.name}.`);
        return;
      }
      if (cl.rate <= 0) {
        onErrorToast(`Please enter a valid purchase rate for ${cl.prod?.name}.`);
        return;
      }
    }

    if (paymentMode === 'SPLIT') {
      const c = parseFloat(cashAmountStr) || 0;
      const o = parseFloat(onlineAmountStr) || 0;
      if (Math.abs(c + o - paidNum) > 0.01) {
        onErrorToast(`Split Cash (₹${c}) + Online (₹${o}) must match Paid Amount (₹${paidNum}).`);
        return;
      }
    }

    const code = currentEntity?.code || 'DF';
    const poNumber = editingPurchase
      ? editingPurchase.purchaseNumber
      : `PO-${code}-${purchaseDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const targetId = editingPurchase ? editingPurchase.id : `po_${Date.now()}`;

    const newPurchase: Purchase = {
      ...(editingPurchase || {}),
      id: targetId,
      entityId: editingPurchase?.entityId || 'current',
      purchaseNumber: poNumber,
      vendorId,
      purchaseDate,
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      remarks: remarks.trim(),
      status,
      lines: calculatedLines.map((cl) => ({
        productId: cl.productId,
        quantity: cl.qty,
        purchaseRate: cl.rate,
        lineAmount: cl.lineAmount,
      })),
      totalAmount: netAmount,
      grossAmount,
      discount: discountNum,
      roundoff: roundoffNum,
      netAmount,
      paidAmount: paidNum,
      paymentMode,
      ...(paymentMode === 'SPLIT'
        ? {
            cashAmount: parseFloat(cashAmountStr) || 0,
            onlineAmount: parseFloat(onlineAmountStr) || 0,
          }
        : paymentMode === 'CASH' && paidNum > 0
        ? { cashAmount: paidNum }
        : paymentMode === 'ONLINE' && paidNum > 0
        ? { onlineAmount: paidNum }
        : {}),
      ...(paymentReference.trim() ? { paymentReference: paymentReference.trim() } : {}),
      remainingAmount: remainingNum,
      createdBy: editingPurchase?.createdBy || 'Operator',
      createdAt: editingPurchase?.createdAt || new Date().toISOString(),
      updatedBy: 'Operator',
      updatedAt: new Date().toISOString(),
    };

    const res = recordPurchase(newPurchase);
    if (res.success) {
      onSuccess(poNumber);
      onClose();
    } else {
      onErrorToast(res.error || 'Failed to record purchase.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-950 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {editingPurchase ? `Edit Purchase Order #${editingPurchase.purchaseNumber}` : 'Procure Daily Milk / Product Consignment'}
              </h3>
              <p className="text-xs text-purple-200">
                {editingPurchase
                  ? 'Update product quantities, rates, invoice details, or discounts'
                  : 'Multi-product purchase entry · Automatically updates inventory on posting'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-purple-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Vendor / Supplier <span className="text-rose-600">*</span>
              </label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-600 font-medium"
              >
                {activeVendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Purchase Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-600 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Vendor Challan / Inv # <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GOK/26/9021"
                value={vendorInvoiceNumber}
                onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-600 font-medium font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Posting Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'POSTED' | 'DRAFT')}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-600 font-semibold text-purple-900"
              >
                <option value="POSTED">POSTED (Updates Stock Now)</option>
                <option value="DRAFT">DRAFT (Review Only)</option>
              </select>
            </div>
          </div>

          {/* Product Lines Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                <tr>
                  <th className="py-2.5 px-3">Product SKU</th>
                  <th className="py-2.5 px-2 text-center">Unit</th>
                  <th className="py-2.5 px-3 w-32 text-center">Quantity</th>
                  <th className="py-2.5 px-3 w-36 text-center">Purchase Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Line Amount</th>
                  <th className="py-2.5 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, index) => {
                  const prod = products.find((p) => p.id === l.productId);
                  const lineAmount = (parseFloat(l.quantity) || 0) * (parseFloat(l.purchaseRate) || 0);

                  return (
                    <tr key={index} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3">
                        <select
                          value={l.productId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                        >
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500 font-medium">
                        {prod?.unit}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          required
                          placeholder="0"
                          value={l.quantity}
                          onChange={(e) => handleLineValueChange(index, 'quantity', e.target.value)}
                          className="w-24 text-center py-1 px-2 font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-600 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            placeholder="0.00"
                            value={l.purchaseRate}
                            onChange={(e) => handleLineValueChange(index, 'purchaseRate', e.target.value)}
                            className="w-24 text-center py-1 px-2 font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-600 text-xs font-mono"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {lineAmount > 0 ? formatIndianCurrency(lineAmount) : '—'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Product Line</span>
            </button>

            <div className="text-right">
              <span className="text-xs text-slate-500 mr-2">Total Purchase Bill:</span>
              <strong className="text-base text-slate-900 font-mono">
                {formatIndianCurrency(netAmount)}
              </strong>
            </div>
          </div>

          {/* Consignment Bill Adjustments: Discount & Roundup/Round-off */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700 uppercase">Gross Items Total:</span>
              <strong className="text-sm font-mono text-slate-900">{formatIndianCurrency(grossAmount)}</strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Supplier Discount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase">Round-off / Roundup (₹)</label>
                  <button
                    type="button"
                    onClick={handleAutoRound}
                    className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    Auto Round to ₹
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={roundoffStr}
                  onChange={(e) => setRoundoffStr(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Supplier Payment Section */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3.5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-900 uppercase">Payment to Supplier Today:</span>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded cursor-pointer"
              >
                Pay Full (₹{netAmount.toFixed(2)})
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { mode: 'NONE' as const, label: 'Pay Later / Unpaid' },
                { mode: 'ONLINE' as const, label: 'Online / UPI / Bank' },
                { mode: 'CASH' as const, label: 'Cash' },
                { mode: 'SPLIT' as const, label: 'Split (Cash+UPI)' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPaymentMode(mode);
                    if (mode === 'NONE') setPaidAmountStr('');
                  }}
                  className={`py-1.5 px-2 rounded-md font-bold text-[11px] border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {paymentMode !== 'NONE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-purple-950 uppercase mb-1">
                    Amount Paid Today (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={paidAmountStr}
                    onChange={(e) => setPaidAmountStr(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded font-mono text-xs font-bold text-purple-950 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-purple-950 uppercase mb-1">
                    Reference # / UTR / Cheque (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982181 or Cash Slip"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded text-xs"
                  />
                </div>

                {paymentMode === 'SPLIT' && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-3 p-2 bg-white rounded border border-purple-200">
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">Cash Part (₹)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={cashAmountStr}
                        onChange={(e) => setCashAmountStr(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">Online Part (₹)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={onlineAmountStr}
                        onChange={(e) => setOnlineAmountStr(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Three Metric Summary Boxes Requested by User */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 text-white p-3.5 rounded-xl shadow-xs">
            <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Bill Today
              </span>
              <strong className="text-base font-mono font-bold text-white block mt-0.5">
                {formatIndianCurrency(netAmount)}
              </strong>
              {discountNum > 0 && (
                <span className="text-[10px] text-purple-300">Incl. ₹{discountNum.toFixed(2)} discount</span>
              )}
            </div>

            <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-3">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Today Pay Amount
              </span>
              <strong className="text-base font-mono font-bold text-emerald-400 block mt-0.5">
                {formatIndianCurrency(paidNum)}
              </strong>
              <span className="text-[10px] text-slate-400">
                {paidNum > 0 ? (paymentMode === 'ONLINE' ? 'Online / UPI' : paymentMode === 'CASH' ? 'Cash' : 'Split') : 'Unpaid (Due)'}
              </span>
            </div>

            <div className="text-center sm:text-left">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                Total Remaining Due
              </span>
              <strong className={`text-base font-mono font-bold block mt-0.5 ${remainingNum > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {formatIndianCurrency(remainingNum)}
              </strong>
              <span className="text-[10px] text-slate-400">
                {remainingNum > 0 ? 'Pending to supplier' : 'Fully Settled'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Consignment Remarks / Batch Details
            </label>
            <input
              type="text"
              placeholder="e.g. Morning 4 AM tank batch, Fat 4.2%, SNF 8.5%"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Action Strip */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingPurchase ? 'Update Purchase Order' : 'Post Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
