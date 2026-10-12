import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Package,
} from 'lucide-react';
import { Customer, Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';

interface CustomerRatesViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const CustomerRatesView: React.FC<CustomerRatesViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { customers, products, customerRates, bulkSaveCustomerRates } = useDairyData();
  const { canEditMasters } = useAuth();

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive).sort((a, b) => a.routeSequence - b.routeSequence),
    [customers]
  );
  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive).sort((a, b) => a.displaySequence - b.displaySequence),
    [products]
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    activeCustomers[0]?.id || ''
  );
  const [searchCust, setSearchCust] = useState('');
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // When selected customer changes, populate rates
  useEffect(() => {
    if (!selectedCustomerId) return;
    const ratesForCust: Record<string, string> = {};
    activeProducts.forEach((p) => {
      const match = customerRates.find(
        (r) => r.customerId === selectedCustomerId && r.productId === p.id
      );
      ratesForCust[p.id] = match ? String(match.rate) : '';
    });
    setRateInputs(ratesForCust);
  }, [selectedCustomerId, activeProducts, customerRates]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleRateChange = (productId: string, val: string) => {
    setRateInputs((prev) => ({ ...prev, [productId]: val }));
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    const payload: { customerId: string; productId: string; rate: number }[] = [];
    for (const p of activeProducts) {
      const raw = rateInputs[p.id];
      if (raw !== undefined && raw.trim() !== '') {
        const num = parseFloat(raw);
        if (isNaN(num) || num <= 0) {
          onErrorToast(`Please enter a valid positive rate for ${p.name}.`);
          return;
        }
        payload.push({
          customerId: selectedCustomerId,
          productId: p.id,
          rate: num,
        });
      }
    }

    if (payload.length === 0) {
      onErrorToast('No rates entered to update.');
      return;
    }

    setIsSaving(true);
    bulkSaveCustomerRates(payload);
    setIsSaving(false);
    onSuccessToast(`Selling rates successfully updated for ${selectedCustomer?.name}!`);
  };

  const filteredCustomerList = activeCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCust.toLowerCase()) ||
      c.mobileNumber.includes(searchCust)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Customer-Specific Selling Rates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain personalized selling prices for each customer account across all dairy SKUs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Customer Selector on Left, Rates Grid on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Customer Selector */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Customer
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {activeCustomers.length} Active Accounts
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer..."
              value={searchCust}
              onChange={(e) => setSearchCust(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {filteredCustomerList.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              // Check how many rates are configured for this customer
              const configuredCount = customerRates.filter((r) => r.customerId === c.id).length;
              const hasMissing = configuredCount < activeProducts.length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-500">#{c.routeSequence}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      +91 {c.mobileNumber}
                    </div>
                  </div>

                  {hasMissing && (
                    <span
                      className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium shrink-0"
                      title="Some product rates are not set"
                    >
                      Incomplete
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Rate Management Grid */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          {selectedCustomer ? (
            <form onSubmit={handleSaveRates} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Route Sequence #{selectedCustomer.routeSequence} · Mobile: +91 {selectedCustomer.mobileNumber}
                  </p>
                </div>

                {canEditMasters && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Customer Rates'}</span>
                  </button>
                )}
              </div>

              {/* Table of Active Products and Rates */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">Current Configured Rate</th>
                      <th className="py-2.5 px-3 w-40 text-center bg-blue-50 text-blue-900">
                        Selling Rate (₹)
                      </th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeProducts.map((p) => {
                      const val = rateInputs[p.id] || '';
                      const isConfigured = val !== '' && parseFloat(val) > 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {p.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                            {isConfigured ? `₹${parseFloat(val).toFixed(2)}` : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-center bg-blue-50/20">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-slate-400 font-semibold">₹</span>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                disabled={!canEditMasters}
                                value={val}
                                onChange={(e) => handleRateChange(p.id, e.target.value)}
                                className="w-28 text-center py-1.5 px-2 font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-mono"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isConfigured ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Configured
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Missing
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                <span>
                  Fast keyboard tip: Click any rate input and press <kbd className="px-1 py-0.5 bg-white border rounded">Tab</kbd> to move to the next product SKU.
                </span>
                {canEditMasters && (
                  <button
                    type="submit"
                    className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Save All Rates
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a customer from the left column to view and edit selling rates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
