import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Calendar,
  Building,
} from 'lucide-react';
import { Vendor, PaymentMode } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency } from '../../services/whatsapp';

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVendorId?: string;
  defaultPurchaseId?: string;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultVendorId,
  defaultPurchaseId,
  onSuccessToast,
  onErrorToast,
}) => {
  const { vendors, purchases, recordVendorPayment, getVendorSummary } = useDairyData();

  const activeVendors = useMemo(() => vendors.filter((v) => v.isActive), [vendors]);
  const [vendorId, setVendorId] = useState<string>(
    defaultVendorId || activeVendors[0]?.id || ''
  );
  const [paymentDate, setPaymentDate] = useState<string>(TODAY_STR);
  const [amountStr, setAmountStr] = useState<string>('');
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [roundoffStr, setRoundoffStr] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ONLINE');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [onlineAmountStr, setOnlineAmountStr] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const vendorSummary = useMemo(() => {
    if (!vendorId) return { totalPurchases: 0, totalPaid: 0, remainingDue: 0 };
    return getVendorSummary(vendorId);
  }, [vendorId, getVendorSummary]);

  if (!isOpen) return null;

  const currentDue = vendorSummary.remainingDue;
  const payAmount = parseFloat(amountStr) || 0;
  const discountVal = parseFloat(discountStr) || 0;
  const roundoffVal = parseFloat(roundoffStr) || 0;
  const newProjectedRemaining = Math.max(0, currentDue - (payAmount + discountVal + roundoffVal));

  const handlePayFull = () => {
    setAmountStr(String(currentDue));
    if (paymentMode === 'SPLIT') {
      setCashAmountStr(String(currentDue));
      setOnlineAmountStr('0');
    }
  };

  const handleRoundOff = () => {
    if (currentDue <= 0) return;
    const rounded = Math.round(currentDue);
    const diff = rounded - currentDue;
    setRoundoffStr(diff.toFixed(2));
    setAmountStr(String(rounded));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      onErrorToast('Please select a supplier / vendor.');
      return;
    }
    if (payAmount <= 0) {
      onErrorToast('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (paymentMode === 'SPLIT') {
      const c = parseFloat(cashAmountStr) || 0;
      const o = parseFloat(onlineAmountStr) || 0;
      if (Math.abs(c + o - payAmount) > 0.01) {
        onErrorToast(`Split Cash (₹${c}) + Online (₹${o}) must equal Pay Amount (₹${payAmount}).`);
        return;
      }
    }

    const paymentNumber = `VPAY-${Date.now().toString().slice(-6)}`;

    const res = recordVendorPayment({
      id: `vpay_${Date.now()}`,
      paymentNumber,
      vendorId,
      paymentDate,
      amount: payAmount,
      discount: discountVal,
      roundoff: roundoffVal,
      paymentMode,
      ...(paymentMode === 'SPLIT'
        ? {
            cashAmount: parseFloat(cashAmountStr) || 0,
            onlineAmount: parseFloat(onlineAmountStr) || 0,
          }
        : paymentMode === 'CASH'
        ? { cashAmount: payAmount }
        : paymentMode === 'ONLINE'
        ? { onlineAmount: payAmount }
        : {}),
      ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
      ...(defaultPurchaseId ? { purchaseId: defaultPurchaseId } : {}),
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    });

    if (res.success) {
      onSuccessToast(
        `Supplier payment of ${formatIndianCurrency(payAmount)} to ${selectedVendor?.name} recorded successfully!`
      );
      onClose();
    } else {
      onErrorToast(res.error || 'Failed to record supplier payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Record Supplier / Vendor Payment</h3>
              <p className="text-xs text-slate-300">
                Track payments, settlement discounts, and remaining balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Vendor Selection & Current Due */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Select Supplier / Vendor <span className="text-rose-600">*</span>
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
            >
              {activeVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Financial Status Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Consignments</span>
              <strong className="text-xs font-mono text-slate-800">
                {formatIndianCurrency(vendorSummary.totalPurchases)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Paid So Far</span>
              <strong className="text-xs font-mono text-emerald-700">
                {formatIndianCurrency(vendorSummary.totalPaid)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-rose-600 uppercase font-bold block">Current Remaining Due</span>
              <strong className="text-xs font-mono font-bold text-rose-700">
                {formatIndianCurrency(currentDue)}
              </strong>
            </div>
          </div>

          {/* Payment Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 uppercase">
                  Pay Amount (₹) <span className="text-rose-600">*</span>
                </label>
                {currentDue > 0 && (
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Pay Full (₹{currentDue.toFixed(2)})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                min="1"
                required
                placeholder="e.g. 5000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>
          </div>

          {/* Discount & Round-off */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Discount from Supplier (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 uppercase">Round-off / Roundup (₹)</label>
                <button
                  type="button"
                  onClick={handleRoundOff}
                  className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Auto Round
                </button>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={roundoffStr}
                onChange={(e) => setRoundoffStr(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ONLINE', 'CASH', 'SPLIT'] as PaymentMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-3 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'ONLINE' ? 'Online / UPI / Bank' : mode === 'CASH' ? 'Cash' : 'Split (Cash+Online)'}
                </button>
              ))}
            </div>
          </div>

          {/* Split Mode Inputs */}
          {paymentMode === 'SPLIT' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
              <div>
                <label className="block font-bold text-indigo-900 mb-1">Cash Part (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={cashAmountStr}
                  onChange={(e) => setCashAmountStr(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-md font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-indigo-900 mb-1">Online Part (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={onlineAmountStr}
                  onChange={(e) => setOnlineAmountStr(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-md font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Reference Number & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                UTR / Reference / Cheque #
              </label>
              <input
                type="text"
                placeholder="e.g. UTR12345678 or Cheque 992"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Remarks / Note</label>
              <input
                type="text"
                placeholder="e.g. Cleared morning consignment"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Projected Remaining Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
            <span className="font-semibold text-emerald-900">Remaining Due to Supplier After Payment:</span>
            <strong className="text-sm font-mono text-emerald-900 font-bold">
              {formatIndianCurrency(newProjectedRemaining)}
            </strong>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Supplier Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
