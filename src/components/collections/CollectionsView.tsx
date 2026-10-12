import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { Collection } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../services/csvExport';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';

interface CollectionsViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { collections, customers, recordCollection } = useDairyData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CASH' | 'ONLINE'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    customerId: string;
    collectionDate: string;
    amount: string;
    cashAmount: string;
    onlineAmount: string;
    paymentMode: 'CASH' | 'ONLINE' | 'SPLIT';
    referenceNumber: string;
    remarks: string;
  }>({
    customerId: customers[0]?.id || '',
    collectionDate: TODAY_STR,
    amount: '',
    cashAmount: '',
    onlineAmount: '',
    paymentMode: 'CASH',
    referenceNumber: '',
    remarks: '',
  });

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      if (filterMode !== 'ALL' && c.paymentMode !== filterMode) return false;
      if (fromDate && c.collectionDate < fromDate) return false;
      if (toDate && c.collectionDate > toDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cust = customers.find((cu) => cu.id === c.customerId);
      return (
        c.collectionNumber.toLowerCase().includes(q) ||
        (c.referenceNumber && c.referenceNumber.toLowerCase().includes(q)) ||
        cust?.name.toLowerCase().includes(q)
      );
    });
  }, [collections, filterMode, fromDate, toDate, searchQuery, customers]);

  const totalCollected = filteredCollections.reduce((acc, c) => acc + c.amount, 0);
  const totalCash = filteredCollections
    .reduce((acc, c) => acc + (c.cashAmount !== undefined ? c.cashAmount : (c.paymentMode === 'CASH' ? c.amount : 0)), 0);
  const totalOnline = filteredCollections
    .reduce((acc, c) => acc + (c.onlineAmount !== undefined ? c.onlineAmount : (c.paymentMode === 'ONLINE' ? c.amount : 0)), 0);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let amt = parseFloat(formData.amount);
    let cashAmt = parseFloat(formData.cashAmount) || 0;
    let onlineAmt = parseFloat(formData.onlineAmount) || 0;

    if (formData.paymentMode === 'SPLIT') {
      amt = cashAmt + onlineAmt;
      if (amt <= 0) {
        onErrorToast('Total split payment amount must be greater than zero.');
        return;
      }
      if (onlineAmt > 0 && !formData.referenceNumber.trim()) {
        onErrorToast('Reference / UTR number is mandatory for online portion.');
        return;
      }
    } else {
      if (!amt || amt <= 0) {
        onErrorToast('Collection payment amount must be greater than zero.');
        return;
      }
      if (formData.paymentMode === 'ONLINE' && !formData.referenceNumber.trim()) {
        onErrorToast('Reference number is mandatory for online / UPI payments.');
        return;
      }
    }

    const res = recordCollection({
      customerId: formData.customerId,
      collectionDate: formData.collectionDate,
      amount: amt,
      paymentMode: formData.paymentMode,
      cashAmount: formData.paymentMode === 'SPLIT' ? cashAmt : (formData.paymentMode === 'CASH' ? amt : undefined),
      onlineAmount: formData.paymentMode === 'SPLIT' ? onlineAmt : (formData.paymentMode === 'ONLINE' ? amt : undefined),
      referenceNumber: formData.referenceNumber.trim() || undefined,
      remarks: formData.remarks.trim() || undefined,
    });

    if (res.success && res.collection) {
      onSuccessToast(`Collection of ₹${amt.toFixed(2)} successfully recorded! Customer ledger credited.`);
      setIsAddModalOpen(false);
      setFormData({
        customerId: customers[0]?.id || '',
        collectionDate: TODAY_STR,
        amount: '',
        cashAmount: '',
        onlineAmount: '',
        paymentMode: 'CASH',
        referenceNumber: '',
        remarks: '',
      });
    } else {
      onErrorToast(res.error || 'Failed to record collection.');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Collection Receipt #',
      'Date',
      'Customer',
      'Payment Mode',
      'Reference #',
      'Amount (₹)',
      'Remarks',
      'Recorded By',
    ];

    const rows = filteredCollections.map((c) => {
      const cust = customers.find((cu) => cu.id === c.customerId);
      return [
        c.collectionNumber,
        formatIndianDate(c.collectionDate),
        cust?.name || 'Unknown',
        c.paymentMode,
        c.referenceNumber || '',
        c.amount,
        c.remarks || '',
        c.createdBy,
      ];
    });

    exportToCsv('Collections_Report', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Customer Payment Collections
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record Cash &amp; Online UPI settlement receipts against customer outstanding ledger
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
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Collections
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatIndianCurrency(totalCollected)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{filteredCollections.length} receipt records</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cash Receipts</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {formatIndianCurrency(totalCash)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Physical cash handed over</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Online UPI / Bank</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 font-mono">
            {formatIndianCurrency(totalOnline)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">With UTR / Reference tracking</p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {/* Mode Segmented Controls */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 font-semibold rounded cursor-pointer ${
                filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Modes
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('CASH')}
              className={`px-3 py-1 font-semibold rounded cursor-pointer ${
                filterMode === 'CASH' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Cash Only
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ONLINE')}
              className={`px-3 py-1 font-semibold rounded cursor-pointer ${
                filterMode === 'ONLINE' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Online Only
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
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
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt #, ref, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
            <tr>
              <th className="py-3 px-4">Receipt #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Customer Account</th>
              <th className="py-3 px-3">Mode</th>
              <th className="py-3 px-4">UTR / Reference</th>
              <th className="py-3 px-4 text-right">Amount Received</th>
              <th className="py-3 px-4">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCollections.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No payment collections found matching the filters.
                </td>
              </tr>
            ) : (
              filteredCollections.map((c) => {
                const cust = customers.find((cu) => cu.id === c.customerId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {c.collectionNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatIndianDate(c.collectionDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cust?.name || 'Customer'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.paymentMode === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {c.referenceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                      {formatIndianCurrency(c.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {c.remarks || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Collection Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-emerald-950 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">Record Customer Payment Collection</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-emerald-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Customer Account <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                >
                  {customers
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Due: {formatIndianCurrency(c.currentOutstanding)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Collection Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.collectionDate}
                    onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Amount Received (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-emerald-800 font-bold font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Payment Mode <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMode: 'CASH' })}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      formData.paymentMode === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMode: 'ONLINE' })}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      formData.paymentMode === 'ONLINE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Online UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const curAmt = parseFloat(formData.amount) || 0;
                      const half = Math.round((curAmt / 2) * 100) / 100;
                      setFormData({
                        ...formData,
                        paymentMode: 'SPLIT',
                        cashAmount: formData.cashAmount || (half > 0 ? String(half) : ''),
                        onlineAmount: formData.onlineAmount || (half > 0 ? String(curAmt - half) : ''),
                      });
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      formData.paymentMode === 'SPLIT'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Split
                  </button>
                </div>
              </div>

              {formData.paymentMode === 'SPLIT' && (
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] uppercase mb-1">
                        Cash Amount (₹) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={formData.cashAmount}
                        onChange={(e) => setFormData({ ...formData, cashAmount: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] uppercase mb-1">
                        Online Portion (₹) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={formData.onlineAmount}
                        onChange={(e) => setFormData({ ...formData, onlineAmount: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-blue-700"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-indigo-900 font-semibold flex justify-between">
                    <span>Total Split Collection:</span>
                    <span className="font-mono">
                      ₹{((parseFloat(formData.cashAmount) || 0) + (parseFloat(formData.onlineAmount) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {(formData.paymentMode === 'ONLINE' || formData.paymentMode === 'SPLIT') && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    UTR / Online Ref Number {formData.paymentMode === 'ONLINE' ? <span className="text-rose-600">*</span> : '(If UPI paid)'}
                  </label>
                  <input
                    type="text"
                    required={formData.paymentMode === 'ONLINE'}
                    placeholder="e.g. UPI/2026/894101"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly ledger settlement"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
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
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Post Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
