import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Dispatch, Customer, Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { formatIndianCurrency } from '../../services/whatsapp';

interface DispatchReviseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: Dispatch | null;
  customer: Customer | null;
  onSuccess: (updatedDispatch: Dispatch) => void;
  onErrorToast: (msg: string) => void;
}

interface ProductLineEdit {
  productId: string;
  name: string;
  unit: string;
  rate: number;
  rateStr?: string;
  billedQty: string;
  compQty: string;
}

export const DispatchReviseModal: React.FC<DispatchReviseModalProps> = ({
  isOpen,
  onClose,
  dispatch,
  customer,
  onSuccess,
  onErrorToast,
}) => {
  const { products, reviseDispatch, bulkSaveCustomerRates } = useDairyData();
  const [lines, setLines] = useState<ProductLineEdit[]>([]);
  const [discountStr, setDiscountStr] = useState('0');
  const [paymentReceivedStr, setPaymentReceivedStr] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'SPLIT'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !dispatch) return;

    // Build editable rows from all products or original lines
    const activeProducts = products.filter((p) => p.isActive);
    const existingMap = new Map(dispatch.lines.map((l) => [l.productId, l]));

    const initialLines: ProductLineEdit[] = activeProducts.map((p) => {
      const existing = existingMap.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        rate: existing ? existing.rate : 0,
        billedQty: existing ? String(existing.billedQuantity) : '',
        compQty: existing ? String(existing.complimentaryQuantity) : '',
      };
    });

    setLines(initialLines);
    setDiscountStr(String(dispatch.discount || 0));
    setPaymentReceivedStr(String(dispatch.paymentReceived || 0));
    setCashAmountStr(String(dispatch.cashAmount || (dispatch.paymentMode === 'CASH' ? dispatch.paymentReceived : 0)));
    setOnlineAmountStr(String(dispatch.onlineAmount || (dispatch.paymentMode === 'ONLINE' ? dispatch.paymentReceived : 0)));
    setPaymentMode((dispatch.paymentMode as any) || 'CASH');
    setReferenceNumber(dispatch.referenceNumber || '');
    setEditReason('');
  }, [isOpen, dispatch, products]);

  const [cashAmountStr, setCashAmountStr] = useState<string>('0');
  const [onlineAmountStr, setOnlineAmountStr] = useState<string>('0');

  if (!isOpen || !dispatch || !customer) return null;

  const handleQtyChange = (productId: string, field: 'billedQty' | 'compQty', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, [field]: val } : l))
    );
  };

  const calculatedLines = lines.map((l) => {
    const billedQty = parseInt(l.billedQty, 10) || 0;
    const compQty = parseInt(l.compQty, 10) || 0;
    const lineAmount = billedQty * l.rate;
    return { ...l, billedQtyNum: billedQty, compQtyNum: compQty, lineAmount };
  });

  const grossAmount = calculatedLines.reduce((acc, l) => acc + l.lineAmount, 0);
  const discount = Math.max(0, parseFloat(discountStr) || 0);
  const netBill = Math.max(0, grossAmount - discount);

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
    cashNum = Math.max(0, parseFloat(paymentReceivedStr) || 0);
    effectivePaymentReceived = cashNum;
  }

  // Projected adjustment
  const deltaOutstanding = (netBill - effectivePaymentReceived) - (dispatch.netAmount - dispatch.paymentReceived);
  const projectedCustomerOutstanding = customer.currentOutstanding + deltaOutstanding;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editReason || editReason.trim().length < 5) {
      onErrorToast('A descriptive edit reason (minimum 5 characters) is required for audit history.');
      return;
    }

    if (paymentMode === 'ONLINE' && effectivePaymentReceived > 0 && !referenceNumber.trim()) {
      onErrorToast('Reference / UTR number is required for online payment.');
      return;
    }

    if (paymentMode === 'SPLIT' && onlineNum > 0 && !referenceNumber.trim()) {
      onErrorToast('Reference / UTR number is required for the online portion of split payment.');
      return;
    }

    const postLines = calculatedLines
      .filter((l) => l.billedQtyNum > 0 || l.compQtyNum > 0)
      .map((l) => ({
        productId: l.productId,
        rate: l.rate,
        billedQuantity: l.billedQtyNum,
        complimentaryQuantity: l.compQtyNum,
        lineAmount: l.lineAmount,
      }));

    if (postLines.length === 0) {
      onErrorToast('Please enter at least one billed product.');
      return;
    }

    setIsSubmitting(true);

    const result = reviseDispatch({
      dispatchId: dispatch.id,
      editReason: editReason.trim(),
      lines: postLines,
      discount,
      paymentReceived: effectivePaymentReceived,
      paymentMode: effectivePaymentReceived > 0 ? (paymentMode as any) : undefined,
      referenceNumber: effectivePaymentReceived > 0 && (paymentMode === 'ONLINE' || (paymentMode === 'SPLIT' && onlineNum > 0)) ? referenceNumber.trim() : undefined,
    });

    setIsSubmitting(false);

    if (result.success && result.dispatch) {
      // Auto-update customer rates so subsequent dispatches use revised rates
      const ratesToUpdate = lines
        .filter((l) => l.rate > 0)
        .map((l) => ({
          customerId: customer.id,
          productId: l.productId,
          rate: l.rate,
        }));
      if (ratesToUpdate.length > 0) {
        bulkSaveCustomerRates(ratesToUpdate);
      }

      onSuccess(result.dispatch);
      onClose();
    } else {
      onErrorToast(result.error || 'Failed to revise dispatch.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-amber-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Revise Completed Dispatch · {dispatch.billNumber}
                </h3>
                <span className="text-[10px] bg-amber-800 text-amber-200 border border-amber-700 px-2 py-0.5 rounded font-mono">
                  Current Rev #{(dispatch.revisionNumber || 1)}
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Customer: {customer.name} · Date: {dispatch.dispatchDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Warning */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-900 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Enterprise Audit Notice: Saving this revision updates the inventory ledger, customer ledger running balance, and increments revision number to <strong>#{(dispatch.revisionNumber || 1) + 1}</strong>.
          </span>
        </div>

        {/* Edit Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mandatory Edit Reason <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Quantity correction requested by store manager after physical unloading count"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-2 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 w-28 text-center bg-blue-50 text-blue-900">
                    Billed Qty
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center bg-emerald-50 text-emerald-900">
                    Free / Sample
                  </th>
                  <th className="py-2.5 px-3 text-right">Line Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedLines.map((l) => (
                  <tr key={l.productId} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-medium text-slate-900">{l.name}</td>
                    <td className="py-2 px-2 text-center text-slate-500">{l.unit}</td>
                    <td className="py-1 px-3 text-right">
                      <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-1">
                        <span className="text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={l.rateStr !== undefined ? l.rateStr : (l.rate > 0 ? String(l.rate) : '0')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val);
                            const clean = isNaN(num) || num < 0 ? 0 : num;
                            setLines((prev) =>
                              prev.map((item) =>
                                item.productId === l.productId ? { ...item, rate: clean, rateStr: val } : item
                              )
                            );
                          }}
                          className="w-16 text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-600 rounded text-xs"
                          title="Rate (₹) - auto-updates customer rate master"
                        />
                      </div>
                    </td>
                    <td className="py-1 px-3 text-center bg-blue-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={l.billedQty}
                        onChange={(e) => handleQtyChange(l.productId, 'billedQty', e.target.value)}
                        className="w-20 text-center py-1 px-2 font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-amber-600 text-xs"
                      />
                    </td>
                    <td className="py-1 px-3 text-center bg-emerald-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={l.compQty}
                        onChange={(e) => handleQtyChange(l.productId, 'compQty', e.target.value)}
                        className="w-20 text-center py-1 px-2 font-bold text-emerald-800 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {l.lineAmount > 0 ? formatIndianCurrency(l.lineAmount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Billing Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Payment Received (₹)
              </label>
              <input
                type="number"
                min="0"
                value={paymentReceivedStr}
                onChange={(e) => setPaymentReceivedStr(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold text-emerald-700 border border-slate-300 rounded"
              />
            </div>
            <div className="bg-amber-100/60 p-2.5 rounded border border-amber-200 text-xs">
              <div className="flex justify-between">
                <span>Revised Net Bill:</span>
                <strong>₹{netBill.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between mt-1">
                <span>Customer Due:</span>
                <strong className="text-rose-700">
                  {formatIndianCurrency(projectedCustomerOutstanding)}
                </strong>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Saving Revision...' : `Post Revision #${(dispatch.revisionNumber || 1) + 1}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
