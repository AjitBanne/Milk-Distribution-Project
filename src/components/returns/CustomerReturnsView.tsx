import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Download,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { CustomerReturn, Customer, Dispatch } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { exportToCsv } from '../../services/csvExport';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';
import { CustomerReturnModal } from './CustomerReturnModal';

interface CustomerReturnsViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const CustomerReturnsView: React.FC<CustomerReturnsViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { returns, customers, products, dispatches } = useDairyData();
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      if (fromDate && r.returnDate < fromDate) return false;
      if (toDate && r.returnDate > toDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cust = customers.find((c) => c.id === r.customerId);
      return (
        r.returnNumber.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q)
      );
    });
  }, [returns, fromDate, toDate, searchQuery, customers]);

  const totalReturnCredits = filteredReturns.reduce((acc, r) => acc + r.totalReturnAmount, 0);

  const handleExportCsv = () => {
    const headers = [
      'Return #',
      'Date',
      'Customer',
      'Original Bill #',
      'Product SKU',
      'Quantity',
      'Credit Amount (₹)',
      'Reason',
      'Recorded By',
    ];

    const rows: any[] = [];
    filteredReturns.forEach((r) => {
      const cust = customers.find((c) => c.id === r.customerId);
      const disp = dispatches.find((d) => d.id === r.dispatchId);
      r.lines.forEach((l) => {
        const prod = products.find((p) => p.id === l.productId);
        rows.push([
          r.returnNumber,
          formatIndianDate(r.returnDate),
          cust?.name || 'Unknown',
          disp?.billNumber || '—',
          prod?.name || 'Item',
          l.returnQuantity,
          l.returnAmount,
          l.reason,
          r.createdBy,
        ]);
      });
    });

    exportToCsv('Customer_Returns_Report', headers, rows);
  };

  const selectedDispatch = dispatches.find((d) => d.id === selectedDispatchId) || null;
  const selectedCustomer = selectedDispatch
    ? customers.find((c) => c.id === selectedDispatch.customerId) || null
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Customer Sales Returns &amp; Quantity Reversals
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Restores warehouse stock, credits customer ledger running balance, and preserves audit trail
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
            onClick={() => {
              // Open first posted dispatch if exists
              if (dispatches.length > 0) {
                setSelectedDispatchId(dispatches[0].id);
                setIsAddModalOpen(true);
              } else {
                onErrorToast('No completed dispatches available to record return against.');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Return</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Return Credits Given
          </span>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-0.5">
            {formatIndianCurrency(totalReturnCredits)}
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          {filteredReturns.length} return voucher(s) logged
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
          />
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
          />
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search return # or customer..."
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
              <th className="py-3 px-4">Return #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Items Returned</th>
              <th className="py-3 px-4 text-right">Total Credit (₹)</th>
              <th className="py-3 px-4">Authorized By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No return vouchers match current filters.
                </td>
              </tr>
            ) : (
              filteredReturns.map((r) => {
                const cust = customers.find((c) => c.id === r.customerId);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.returnNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatIndianDate(r.returnDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cust?.name || 'Customer'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="space-y-0.5">
                        {r.lines.map((l, i) => {
                          const prod = products.find((p) => p.id === l.productId);
                          return (
                            <div key={i} className="text-[11px]">
                              <strong>{l.returnQuantity}</strong> {prod?.unit} {prod?.name} ({l.reason})
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                      {formatIndianCurrency(r.totalReturnAmount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.createdBy}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Select Dispatch before opening Return modal */}
      {isAddModalOpen && !selectedDispatch && dispatches.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70">
          <div className="bg-white p-5 rounded-xl max-w-md w-full">
            <h3 className="font-bold text-sm mb-3">Select Dispatch to Return From</h3>
            <select
              value={selectedDispatchId}
              onChange={(e) => setSelectedDispatchId(e.target.value)}
              className="w-full p-2 border rounded text-xs mb-3"
            >
              {dispatches.map((d) => {
                const c = customers.find((cu) => cu.id === d.customerId);
                return (
                  <option key={d.id} value={d.id}>
                    {d.billNumber} · {c?.name} ({d.dispatchDate})
                  </option>
                );
              })}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  /* Proceed */
                }}
                className="px-3 py-1.5 text-xs bg-rose-600 text-white rounded font-bold"
              >
                Proceed to Item Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Return Modal */}
      {isAddModalOpen && selectedDispatch && selectedCustomer && (
        <CustomerReturnModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          dispatch={selectedDispatch}
          customer={selectedCustomer}
          onSuccess={(retNo) => {
            onSuccessToast(`Customer Return #${retNo} posted successfully!`);
          }}
          onErrorToast={onErrorToast}
        />
      )}
    </div>
  );
};
