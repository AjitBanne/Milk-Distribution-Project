import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  Plus,
  Search,
  Download,
  Calendar,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Damage, Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../services/csvExport';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';

interface DamagesViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const DamagesView: React.FC<DamagesViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { damages, products, recordDamage } = useDairyData();
  const activeProducts = products.filter((p) => p.isActive);

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productId: activeProducts[0]?.id || '',
    damageDate: TODAY_STR,
    quantity: '',
    estimatedUnitCost: '',
    reason: '',
    remarks: '',
  });

  const filteredDamages = useMemo(() => {
    return damages.filter((d) => {
      if (fromDate && d.damageDate < fromDate) return false;
      if (toDate && d.damageDate > toDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const prod = products.find((p) => p.id === d.productId);
      return (
        d.damageNumber.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        prod?.name.toLowerCase().includes(q)
      );
    });
  }, [damages, fromDate, toDate, searchQuery, products]);

  const totalDamageCost = filteredDamages.reduce((acc, d) => acc + d.totalCost, 0);
  const totalDamagedUnits = filteredDamages.reduce((acc, d) => acc + d.quantity, 0);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseFloat(formData.quantity);
    const unitCost = parseFloat(formData.estimatedUnitCost) || 0;

    if (!qty || qty <= 0) {
      onErrorToast('Damage quantity must be greater than zero.');
      return;
    }
    if (!formData.reason.trim()) {
      onErrorToast('A descriptive reason is required for recording damage.');
      return;
    }

    const res = recordDamage({
      productId: formData.productId,
      damageDate: formData.damageDate,
      quantity: qty,
      estimatedUnitCost: unitCost,
      reason: formData.reason.trim(),
      remarks: formData.remarks.trim() || undefined,
    });

    if (res.success && res.damage) {
      onSuccessToast(`Damage #${res.damage.damageNumber} recorded! Inventory reduced.`);
      setIsAddModalOpen(false);
      setFormData({
        productId: activeProducts[0]?.id || '',
        damageDate: TODAY_STR,
        quantity: '',
        estimatedUnitCost: '',
        reason: '',
        remarks: '',
      });
    } else {
      onErrorToast(res.error || 'Failed to record damage.');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Damage #',
      'Date',
      'Product SKU',
      'Quantity',
      'Unit Cost (₹)',
      'Total Cost (₹)',
      'Reason',
      'Remarks',
      'Recorded By',
    ];

    const rows = filteredDamages.map((d) => {
      const prod = products.find((p) => p.id === d.productId);
      return [
        d.damageNumber,
        formatIndianDate(d.damageDate),
        prod?.name || 'Unknown',
        d.quantity,
        d.estimatedUnitCost,
        d.totalCost,
        d.reason,
        d.remarks || '',
        d.createdBy,
      ];
    });

    exportToCsv('Damage_Report', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Product Damages &amp; Wastage
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track pouch leaks, transit punctures, cold chain spoiling, and write down physical stock
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Damage</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Damage Loss Cost
          </span>
          <div className="text-2xl font-bold text-rose-700 font-mono">
            {formatIndianCurrency(totalDamageCost)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Deducted from business profit analysis</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Damaged Units
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalDamagedUnits} Units
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across {filteredDamages.length} recorded incidents</p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded"
          />
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded"
          />
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search damage # or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
            <tr>
              <th className="py-3 px-4">Damage #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Product SKU</th>
              <th className="py-3 px-3 text-right">Quantity</th>
              <th className="py-3 px-3 text-right">Unit Cost</th>
              <th className="py-3 px-4 text-right">Total Cost</th>
              <th className="py-3 px-4">Reason / Notes</th>
              <th className="py-3 px-4">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDamages.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No damage incidents recorded.
                </td>
              </tr>
            ) : (
              filteredDamages.map((d) => {
                const prod = products.find((p) => p.id === d.productId);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {d.damageNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatIndianDate(d.damageDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {prod?.name || 'Product'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-rose-700">
                      {d.quantity} {prod?.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ₹{d.estimatedUnitCost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      {formatIndianCurrency(d.totalCost)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{d.reason}</div>
                      {d.remarks && <div className="text-[10px] text-slate-500">{d.remarks}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {d.createdBy}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Damage Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-rose-950 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">Record Damaged / Spoiled Stock</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-rose-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Product SKU <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                >
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Damage Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.damageDate}
                    onChange={(e) => setFormData({ ...formData, damageDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Damaged Quantity <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-rose-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Estimated Unit Purchase Cost (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 25.00"
                  value={formData.estimatedUnitCost}
                  onChange={(e) => setFormData({ ...formData, estimatedUnitCost: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Damage Reason <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pouch punctured during crate unstacking"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Disposal Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discarded in wash drain"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Post Damage Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
