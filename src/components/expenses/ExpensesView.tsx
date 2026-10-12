import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Tag,
} from 'lucide-react';
import { Expense } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../services/csvExport';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';

interface ExpensesViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { expenses, expenseCategories, recordExpense, addExpenseCategory } = useDairyData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CASH' | 'ONLINE'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form State
  const [formData, setFormData] = useState<{
    expenseDate: string;
    categoryId: string;
    amount: string;
    paymentMode: 'CASH' | 'ONLINE';
    referenceNumber: string;
    description: string;
  }>({
    expenseDate: TODAY_STR,
    categoryId: expenseCategories[0]?.id || '',
    amount: '',
    paymentMode: 'CASH',
    referenceNumber: '',
    description: '',
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== 'ALL' && e.categoryId !== selectedCategory) return false;
      if (filterMode !== 'ALL' && e.paymentMode !== filterMode) return false;
      if (fromDate && e.expenseDate < fromDate) return false;
      if (toDate && e.expenseDate > toDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.expenseNumber.toLowerCase().includes(q) ||
        e.categoryName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    });
  }, [expenses, selectedCategory, filterMode, fromDate, toDate, searchQuery]);

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      onErrorToast('Expense amount must be greater than zero.');
      return;
    }
    if (!formData.description.trim()) {
      onErrorToast('Please enter an expense description.');
      return;
    }

    const res = recordExpense({
      expenseDate: formData.expenseDate,
      categoryId: formData.categoryId || expenseCategories[0]?.id,
      amount: amt,
      paymentMode: formData.paymentMode,
      referenceNumber: formData.referenceNumber.trim() || undefined,
      description: formData.description.trim(),
    });

    if (res.success && res.expense) {
      onSuccessToast(`Expense #${res.expense.expenseNumber} of ₹${amt} recorded!`);
      setIsAddModalOpen(false);
      setFormData({
        expenseDate: TODAY_STR,
        categoryId: expenseCategories[0]?.id || '',
        amount: '',
        paymentMode: 'CASH',
        referenceNumber: '',
        description: '',
      });
    } else {
      onErrorToast(res.error || 'Failed to record expense.');
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addExpenseCategory(newCategoryName.trim());
    onSuccessToast(`Expense category "${newCategoryName}" created!`);
    setNewCategoryName('');
    setIsNewCategoryModalOpen(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Expense #',
      'Date',
      'Category',
      'Payment Mode',
      'Reference #',
      'Amount (₹)',
      'Description',
      'Recorded By',
    ];

    const rows = filteredExpenses.map((e) => [
      e.expenseNumber,
      formatIndianDate(e.expenseDate),
      e.categoryName,
      e.paymentMode,
      e.referenceNumber || '',
      e.amount,
      e.description,
      e.createdBy,
    ]);

    exportToCsv('Expense_Report', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Daily Operational Expenses
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track distribution fuel, delivery hamali, cold store electricity, vehicle maintenance, and driver wages
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
            onClick={() => setIsNewCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Filtered Expense Total
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
            {formatIndianCurrency(totalExpenseAmount)}
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <span>{filteredExpenses.length} expense voucher(s) recorded</span>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">All Categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="ONLINE">Online</option>
          </select>

          <div className="flex items-center gap-1.5 ml-1">
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
            placeholder="Search expense description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
            <tr>
              <th className="py-3 px-4">Expense #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-3">Mode</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4">Particulars / Description</th>
              <th className="py-3 px-4">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No expense records match the specified filters.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {e.expenseNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatIndianDate(e.expenseDate)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {e.categoryName}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        e.paymentMode === 'CASH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {e.paymentMode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatIndianCurrency(e.amount)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-sm">
                    {e.description}
                    {e.referenceNumber && (
                      <span className="block text-[10px] font-mono text-slate-500">
                        Ref: {e.referenceNumber}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {e.createdBy}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-amber-950 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">Record Operational Expense</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-amber-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Expense Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Amount (₹) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMode: 'CASH' })}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      formData.paymentMode === 'CASH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
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
                    Online UPI / Card
                  </button>
                </div>
              </div>

              {formData.paymentMode === 'ONLINE' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PETROL-PUMP-TXN-4112"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Description / Purpose <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Diesel for Route Vehicle MH-09 morning delivery run"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-2">Add New Expense Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Category name (e.g. Packing Material)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
