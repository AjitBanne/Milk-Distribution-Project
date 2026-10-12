import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Customer, Dispatch, ReturnReason } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency } from '../../services/whatsapp';

interface CustomerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  dispatch: Dispatch | null;
  onSuccess: (returnNumber: string) => void;
  onErrorToast: (msg: string) => void;
}

const REASONS: ReturnReason[] = [
  'Leakage',
  'Damaged',
  'Wrong Delivery',
  'Excess Quantity',
  'Other',
];

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  isOpen,
  onClose,
  customer,
  dispatch,
  onSuccess,
  onErrorToast,
}) => {
  const { products, returns, postReturn } = useDairyData();
  const [returnQtys, setReturnQtys] = useState<Record<string, string>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, ReturnReason>>({});
  const [returnRemarks, setReturnRemarks] = useState<Record<string, string>>({});
  const [returnDate, setReturnDate] = useState(TODAY_STR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !dispatch) return;
    setReturnQtys({});
    setReturnReasons({});
    setReturnRemarks({});
    setReturnDate(TODAY_STR);
  }, [isOpen, dispatch]);

  if (!isOpen || !customer || !dispatch) return null;

  // Calculate previously returned quantities for this dispatch
  const priorReturns = returns.filter((r) => r.dispatchId === dispatch.id);
  const alreadyReturnedMap: Record<string, number> = {};
  priorReturns.forEach((r) => {
    r.lines.forEach((l) => {
      alreadyReturnedMap[l.productId] = (alreadyReturnedMap[l.productId] || 0) + l.returnQuantity;
    });
  });

  const availableLines = dispatch.lines.map((l) => {
    const prod = products.find((p) => p.id === l.productId);
    const returnedSoFar = alreadyReturnedMap[l.productId] || 0;
    const totalSupplied = l.billedQuantity + l.complimentaryQuantity;
    const maxReturnable = Math.max(0, totalSupplied - returnedSoFar);
    const currentReturnQty = parseInt(returnQtys[l.productId] || '0', 10);
    const reason = returnReasons[l.productId] || 'Leakage';
    const remarks = returnRemarks[l.productId] || '';

    // Billed returns credit the customer at selling rate; complimentary portion restores stock without billing credit
    const isComp = l.billedQuantity === 0 && l.complimentaryQuantity > 0;
    const lineReturnAmount = isComp ? 0 : currentReturnQty * l.rate;

    return {
      line: l,
      product: prod,
      returnedSoFar,
      maxReturnable,
      currentReturnQty,
      reason,
      remarks,
      lineReturnAmount,
      isComp,
    };
  });

  const totalReturnAmount = availableLines.reduce((acc, l) => acc + l.lineReturnAmount, 0);
  const totalReturnUnits = availableLines.reduce((acc, l) => acc + l.currentReturnQty, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (totalReturnUnits <= 0) {
      onErrorToast('Please enter return quantity for at least one item.');
      return;
    }

    // Validate quantities and reasons
    for (const item of availableLines) {
      if (item.currentReturnQty > 0) {
        if (item.currentReturnQty > item.maxReturnable) {
          onErrorToast(`Return quantity for ${item.product?.name} exceeds maximum returnable (${item.maxReturnable}).`);
          return;
        }
        if (item.reason === 'Other' && !item.remarks.trim()) {
          onErrorToast(`Additional remarks required for ${item.product?.name} when reason is "Other".`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    const postLines = availableLines
      .filter((item) => item.currentReturnQty > 0)
      .map((item) => ({
        productId: item.line.productId,
        returnQuantity: item.currentReturnQty,
        rate: item.line.rate,
        returnAmount: item.lineReturnAmount,
        reason: item.reason,
        remarks: item.remarks.trim() || undefined,
        isComplimentaryReturn: item.isComp,
      }));

    const result = postReturn({
      dispatchId: dispatch.id,
      customerId: customer.id,
      returnDate,
      lines: postLines,
    });

    setIsSubmitting(false);

    if (result.success && result.customerReturn) {
      onSuccess(result.customerReturn.returnNumber);
      onClose();
    } else {
      onErrorToast(result.error || 'Failed to post customer return.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-rose-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-sm">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Record Customer Return</h3>
                <span className="text-[10px] bg-rose-800 text-rose-200 border border-rose-700 px-2 py-0.5 rounded font-mono">
                  Bill #{dispatch.billNumber}
                </span>
              </div>
              <p className="text-xs text-rose-200">
                {customer.name} · Current Due: {formatIndianCurrency(customer.currentOutstanding)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500">Return Date:</span>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="ml-2 px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 font-medium"
              />
            </div>
            <div className="text-right">
              <span className="text-slate-500">Original Dispatch Date: </span>
              <strong className="text-slate-800">{dispatch.dispatchDate}</strong>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-2 text-center">Billed / Free</th>
                  <th className="py-2.5 px-2 text-center">Returned</th>
                  <th className="py-2.5 px-2 text-center">Available</th>
                  <th className="py-2.5 px-3 w-24 text-center bg-rose-50 text-rose-900">
                    Return Qty
                  </th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {availableLines.map((item) => (
                  <tr key={item.line.productId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {item.product?.name}
                      <div className="text-[10px] text-slate-500">
                        Rate: ₹{item.line.rate.toFixed(2)} / {item.product?.unit}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-700">
                      {item.line.billedQuantity}
                      {item.line.complimentaryQuantity > 0 && ` + ${item.line.complimentaryQuantity} Free`}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500">
                      {item.returnedSoFar}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                      {item.maxReturnable}
                    </td>
                    <td className="py-1 px-3 text-center bg-rose-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        disabled={item.maxReturnable === 0}
                        value={returnQtys[item.line.productId] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && !/^\d+$/.test(val)) return;
                          setReturnQtys((prev) => ({ ...prev, [item.line.productId]: val }));
                        }}
                        className="w-16 text-center py-1 px-2 font-bold text-rose-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-rose-600 text-xs disabled:bg-slate-100"
                      />
                    </td>
                    <td className="py-1 px-3">
                      <select
                        disabled={!returnQtys[item.line.productId] || returnQtys[item.line.productId] === '0'}
                        value={returnReasons[item.line.productId] || 'Leakage'}
                        onChange={(e) =>
                          setReturnReasons((prev) => ({
                            ...prev,
                            [item.line.productId]: e.target.value as ReturnReason,
                          }))
                        }
                        className="w-full py-1 px-2 text-xs bg-white border border-slate-300 rounded"
                      >
                        {REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {returnReasons[item.line.productId] === 'Other' && (
                        <input
                          type="text"
                          required
                          placeholder="Specify reason..."
                          value={returnRemarks[item.line.productId] || ''}
                          onChange={(e) =>
                            setReturnRemarks((prev) => ({
                              ...prev,
                              [item.line.productId]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full px-2 py-0.5 text-[11px] border border-slate-300 rounded"
                        />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      {item.lineReturnAmount > 0 ? formatIndianCurrency(item.lineReturnAmount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Impact Summary */}
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-rose-900">Total Return Credit:</span>{' '}
              <span className="font-bold text-rose-900 text-sm">
                {formatIndianCurrency(totalReturnAmount)}
              </span>
              <div className="text-[11px] text-rose-700 mt-0.5">
                Restores {totalReturnUnits} units to stock and credits customer ledger
              </div>
            </div>
            <div>
              <span className="text-slate-600">New Customer Outstanding: </span>
              <strong className="text-slate-900 text-sm">
                {formatIndianCurrency(customer.currentOutstanding - totalReturnAmount)}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={totalReturnUnits <= 0 || isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Posting Return...' : 'Post Customer Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
