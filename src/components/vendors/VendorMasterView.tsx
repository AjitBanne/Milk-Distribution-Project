import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Edit2,
  Search,
  IndianRupee,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { Vendor, Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatIndianCurrency } from '../../services/whatsapp';
import { VendorPaymentModal } from '../purchases/VendorPaymentModal';

interface VendorMasterViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const VendorMasterView: React.FC<VendorMasterViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { vendors, products, vendorRates, saveVendor, saveVendorRate, getVendorSummary } = useDairyData();
  const { canEditMasters } = useAuth();

  const [activeTab, setActiveTab] = useState<'vendors' | 'rates'>('vendors');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentVendorId, setPaymentVendorId] = useState<string | null>(null);

  // Selected vendor for rate maintenance tab
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');

  // Vendor Form
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    address: '',
    isActive: true,
  });

  // Rates Form
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive).sort((a, b) => a.displaySequence - b.displaySequence),
    [products]
  );

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Populate vendor rate inputs when vendor is selected
  React.useEffect(() => {
    if (!selectedVendorId) return;
    const map: Record<string, string> = {};
    activeProducts.forEach((p) => {
      const match = vendorRates.find(
        (r) => r.vendorId === selectedVendorId && r.productId === p.id
      );
      map[p.id] = match ? String(match.agreedRate) : '';
    });
    setRateInputs(map);
  }, [selectedVendorId, activeProducts, vendorRates]);

  const openAddModal = () => {
    setFormData({
      name: '',
      mobileNumber: '',
      address: '',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (v: Vendor) => {
    setEditingVendor(v);
    setFormData({
      name: v.name,
      mobileNumber: v.mobileNumber,
      address: v.address,
      isActive: v.isActive,
    });
  };

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onErrorToast('Vendor name is required.');
      return;
    }

    const cleanMobile = formData.mobileNumber.replace(/[^0-9]/g, '');

    if (editingVendor) {
      const res = saveVendor({
        ...editingVendor,
        name: formData.name.trim(),
        mobileNumber: cleanMobile,
        address: formData.address.trim(),
        isActive: formData.isActive,
      });

      if (res.success) {
        onSuccessToast(`Vendor "${formData.name}" updated successfully.`);
        setEditingVendor(null);
      } else {
        onErrorToast(res.error || 'Failed to update vendor.');
      }
    } else {
      const newVendor: Vendor = {
        id: `v_${Date.now()}`,
        entityId: 'current',
        name: formData.name.trim(),
        mobileNumber: cleanMobile,
        address: formData.address.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = saveVendor(newVendor);
      if (res.success) {
        onSuccessToast(`Vendor "${formData.name}" added successfully.`);
        setIsAddModalOpen(false);
      } else {
        onErrorToast(res.error || 'Failed to add vendor.');
      }
    }
  };

  const handleToggleActive = (v: Vendor) => {
    const res = saveVendor({ ...v, isActive: !v.isActive });
    if (res.success) {
      onSuccessToast(`Vendor "${v.name}" is now ${!v.isActive ? 'Active' : 'Inactive'}.`);
    } else {
      onErrorToast(res.error || 'Failed to update vendor status.');
    }
  };

  const handleSaveVendorRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    for (const p of activeProducts) {
      const raw = rateInputs[p.id];
      if (raw !== undefined && raw.trim() !== '') {
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) {
          saveVendorRate(selectedVendorId, p.id, num);
        }
      }
    }

    onSuccessToast(`Agreed purchase rates saved for vendor ${selectedVendor?.name}!`);
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.mobileNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Vendor Master &amp; Agreed Purchase Rates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage dairy supplier chilling centers, co-operatives, and agreed purchase price lists
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEditMasters && activeTab === 'vendors' && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier / Vendor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Vendor Profiles ({vendors.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
            activeTab === 'rates'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Agreed Purchase Price Info Records
        </button>
      </div>

      {/* VENDOR PROFILES TAB */}
      {activeTab === 'vendors' && (
        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Facility Address</th>
                  <th className="py-3 px-4 text-right">Remaining Due (₹)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((v) => {
                  const summary = getVendorSummary(v.id);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{v.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {v.mobileNumber ? `+91 ${v.mobileNumber}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{v.address || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={summary.remainingDue > 0 ? 'text-rose-700' : 'text-slate-500'}>
                          {formatIndianCurrency(summary.remainingDue)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            v.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {v.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPaymentVendorId(v.id)}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                            title="Record Payment to Supplier"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                          {canEditMasters && (
                            <button
                              type="button"
                              onClick={() => openEditModal(v)}
                              className="p-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                              title="Edit Vendor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEditMasters && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(v)}
                              className="px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                            >
                              {v.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AGREED PURCHASE PRICE TAB */}
      {activeTab === 'rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Vendor Selector */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Vendor
            </h3>
            <div className="space-y-1">
              {vendors.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVendorId(v.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer text-xs ${
                    v.id === selectedVendorId
                      ? 'bg-blue-50/80 border-blue-400 text-blue-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>{v.name}</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    +91 {v.mobileNumber}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rates Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            {selectedVendor ? (
              <form onSubmit={handleSaveVendorRates} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedVendor.name}</h3>
                    <p className="text-xs text-slate-500">
                      Standard procurement purchase prices prefilled during Purchase Entry
                    </p>
                  </div>
                  {canEditMasters && (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Purchase Rates</span>
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 w-40 text-center bg-blue-50 text-blue-900">
                          Agreed Purchase Rate (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{p.unit}</td>
                          <td className="py-1.5 px-3 text-center bg-blue-50/20">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-slate-400 font-semibold">₹</span>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                disabled={!canEditMasters}
                                value={rateInputs[p.id] || ''}
                                onChange={(e) =>
                                  setRateInputs({ ...rateInputs, [p.id]: e.target.value })
                                }
                                className="w-28 text-center py-1.5 px-2 font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 text-xs font-mono"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </form>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                Select a vendor to configure agreed purchase rates.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {(isAddModalOpen || editingVendor) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingVendor ? 'Edit Vendor Details' : 'Add New Supplier Vendor'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVendor(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVendorSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Vendor / Sangha Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gokul Chilling Center"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-mono text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9822601111"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Facility Address
                </label>
                <textarea
                  rows={2}
                  placeholder="MIDC Area, Taluka, District..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingVendor(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
