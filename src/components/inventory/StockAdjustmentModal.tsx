import React, { useState } from 'react';
import { X, Sliders, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { TODAY_STR } from '../../services/seedData';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  onErrorToast,
}) => {
  const { products, stockMap, recordStockAdjustment } = useDairyData();
  const activeProducts = products.filter((p) => p.isActive);

  const [productId, setProductId] = useState(activeProducts[0]?.id || '');
  const [date, setDate] = useState(TODAY_STR);
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [quantityStr, setQuantityStr] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === productId);
  const currentStock = productId ? stockMap[productId] || 0 : 0;
  const adjQty = parseFloat(quantityStr) || 0;
  const projectedStock =
    adjustmentType === 'INCREASE' ? currentStock + adjQty : currentStock - adjQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (adjQty <= 0) {
      onErrorToast('Please enter an adjustment quantity greater than zero.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      onErrorToast('A mandatory reason (minimum 5 characters) is required for physical inventory adjustments.');
      return;
    }

    setIsSubmitting(true);
    const finalDelta = adjustmentType === 'INCREASE' ? adjQty : -adjQty;

    const res = recordStockAdjustment({
      productId,
      date,
      adjustmentQuantity: finalDelta,
      reason: reason.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccessToast(`Stock adjustment recorded for ${selectedProduct?.name}! New balance is ${projectedStock}.`);
      onClose();
    } else {
      onErrorToast(res.error || 'Failed to record adjustment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Physical Stock Adjustment</h3>
              <p className="text-xs text-slate-300">
                Audited inventory correction with mandatory justification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Product SKU <span className="text-rose-600">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Current Stock on Ledger:</span>
              <strong className="text-slate-900 font-mono">
                {currentStock} {selectedProduct?.unit}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Adjustment Direction
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as 'INCREASE' | 'DECREASE')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
              >
                <option value="INCREASE">+ Found Surplus / Add</option>
                <option value="DECREASE">- Shortage / Deduct</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Quantity Units <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                placeholder="0"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-blue-900 font-medium">Projected Closing Stock:</span>
            <strong className="text-blue-950 font-mono text-sm">
              {projectedStock} {selectedProduct?.unit}
            </strong>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Mandatory Audit Reason <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Physical inventory count verified at 6 PM cold store shift handover"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Record Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
