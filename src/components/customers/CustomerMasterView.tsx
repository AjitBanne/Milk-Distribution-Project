import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  BookOpen,
  ArrowUpDown,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';
import { Customer } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatIndianCurrency } from '../../services/whatsapp';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { RouteSequenceModal } from './RouteSequenceModal';

interface CustomerMasterViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const CustomerMasterView: React.FC<CustomerMasterViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { customers, saveCustomer, dispatches } = useDairyData();
  const { canEditMasters } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Pagination for 200+ customers
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    address: '',
    openingOutstanding: '0',
    isActive: true,
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterStatus === 'ACTIVE' && !c.isActive) return false;
      if (filterStatus === 'INACTIVE' && c.isActive) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobileNumber.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        String(c.routeSequence).includes(q)
      );
    });
  }, [customers, filterStatus, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    if (pageSize >= 500) return filteredCustomers;
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const openAddModal = () => {
    setFormData({
      name: '',
      mobileNumber: '',
      address: '',
      openingOutstanding: '0',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobileNumber: c.mobileNumber,
      address: c.address,
      openingOutstanding: String(c.openingOutstanding),
      isActive: c.isActive,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onErrorToast('Customer name is required.');
      return;
    }
    const rawMobile = formData.mobileNumber.trim();
    const cleanMobile = rawMobile ? rawMobile.replace(/[^0-9]/g, '') : '';
    if (cleanMobile && cleanMobile.length !== 10) {
      onErrorToast('If entering a mobile number, please enter a valid 10-digit number.');
      return;
    }

    const openingNum = Math.max(0, parseFloat(formData.openingOutstanding) || 0);

    if (editingCustomer) {
      // Edit existing
      const res = saveCustomer({
        ...editingCustomer,
        name: formData.name.trim(),
        mobileNumber: cleanMobile,
        address: formData.address.trim(),
        isActive: formData.isActive,
      });

      if (res.success) {
        onSuccessToast(`Customer "${formData.name}" updated successfully.`);
        setEditingCustomer(null);
      } else {
        onErrorToast(res.error || 'Failed to update customer.');
      }
    } else {
      // Add new
      const nextSeq = customers.length + 1;
      const newCust: Customer = {
        id: `c_${Date.now()}`,
        entityId: 'current',
        name: formData.name.trim(),
        mobileNumber: cleanMobile,
        address: formData.address.trim(),
        routeSequence: nextSeq,
        openingOutstanding: openingNum,
        currentOutstanding: openingNum,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = saveCustomer(newCust);
      if (res.success) {
        onSuccessToast(`Customer "${formData.name}" added to route at sequence #${nextSeq}!`);
        setIsAddModalOpen(false);
      } else {
        onErrorToast(res.error || 'Failed to create customer.');
      }
    }
  };

  // Toggle active/inactive
  const handleToggleActive = (c: Customer) => {
    const res = saveCustomer({ ...c, isActive: !c.isActive });
    if (res.success) {
      onSuccessToast(`Customer ${c.name} is now ${!c.isActive ? 'Active' : 'Inactive'}.`);
    } else {
      onErrorToast(res.error || 'Failed to toggle status.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Customer Master &amp; Route Accounts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain client contact info, opening balances, delivery routes, and ledger records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsRouteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Reorder Route</span>
          </button>

          {canEditMasters && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status segmented tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Accounts ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              filterStatus === 'ACTIVE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Route ({customers.filter((c) => c.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('INACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              filterStatus === 'INACTIVE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactive ({customers.filter((c) => !c.isActive).length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Pagination & Count Header */}
      {filteredCustomers.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
          <div>
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> – <strong>{Math.min(currentPage * pageSize, filteredCustomers.length)}</strong> of <strong>{filteredCustomers.length}</strong> customers
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Page size:</span>
              {[30, 60, 100, 500].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                    pageSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {size >= 500 ? 'All' : size}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-[11px] font-medium px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
              <tr>
                <th className="py-3 px-3 text-center">Seq</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">WhatsApp / Mobile</th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4 text-right">Opening Bal</th>
                <th className="py-3 px-4 text-right">Current Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No customers match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      #{c.routeSequence}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.mobileNumber ? `+91 ${c.mobileNumber}` : <span className="text-slate-400 italic">No mobile</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {c.address || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatIndianCurrency(c.openingOutstanding)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      {formatIndianCurrency(c.currentOutstanding)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLedgerCustomer(c)}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="View Statement of Account"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Ledger</span>
                        </button>

                        {canEditMasters && (
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEditMasters && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                              c.isActive
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={c.isActive ? 'Deactivate Customer' : 'Activate Customer'}
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingCustomer ? 'Edit Customer Details' : 'Add New Customer Account'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Customer / Shop Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahalakshmi Sweet Mart"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mobile Number (WhatsApp) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-mono text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9822012345 (optional)"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Optional. If provided, delivery receipts can be sent directly via WhatsApp.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Delivery Address / Landmark
                </label>
                <textarea
                  rows={2}
                  placeholder="Shop number, market lane, city landmark..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Opening Outstanding Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={formData.openingOutstanding}
                    onChange={(e) => setFormData({ ...formData, openingOutstanding: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Entered opening balance will automatically appear as an opening entry in the customer ledger.
                  </p>
                </div>
              )}

              {editingCustomer && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <label htmlFor="isActiveToggle" className="font-semibold text-slate-700">
                    Active Customer Account (appears on daily route)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger Modal */}
      {ledgerCustomer && (
        <CustomerLedgerModal
          isOpen={true}
          onClose={() => setLedgerCustomer(null)}
          customer={ledgerCustomer}
        />
      )}

      {/* Route Sequence Reordering Modal */}
      {isRouteModalOpen && (
        <RouteSequenceModal
          isOpen={true}
          onClose={() => setIsRouteModalOpen(false)}
          onSuccessToast={onSuccessToast}
        />
      )}
    </div>
  );
};
