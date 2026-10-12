import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  CreditCard,
  CheckCircle2,
  Edit3,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Purchase } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../services/csvExport';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';
import { TODAY_STR } from '../../services/seedData';
import { PurchaseEntryModal } from './PurchaseEntryModal';
import { VendorPaymentModal } from './VendorPaymentModal';

interface PurchasesViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { purchases, vendors, products, getDailyPurchaseSummary, deletePurchase } = useDairyData();
  const { canPostPurchases } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    vendorId?: string;
    purchaseId?: string;
  }>({ isOpen: false });
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  const todaySummary = useMemo(() => {
    return getDailyPurchaseSummary(TODAY_STR);
  }, [purchases, getDailyPurchaseSummary]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (selectedVendorId !== 'ALL' && p.vendorId !== selectedVendorId) return false;
      if (fromDate && p.purchaseDate < fromDate) return false;
      if (toDate && p.purchaseDate > toDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const vendor = vendors.find((v) => v.id === p.vendorId);
      return (
        p.purchaseNumber.toLowerCase().includes(q) ||
        p.vendorInvoiceNumber.toLowerCase().includes(q) ||
        vendor?.name.toLowerCase().includes(q)
      );
    });
  }, [purchases, selectedVendorId, fromDate, toDate, searchQuery, vendors]);

  const totalProcuredAmount = filteredPurchases.reduce((acc, p) => acc + (p.netAmount ?? p.totalAmount), 0);
  const totalPaidFiltered = filteredPurchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalRemainingFiltered = filteredPurchases.reduce(
    (acc, p) => acc + (p.remainingAmount ?? Math.max(0, (p.netAmount ?? p.totalAmount) - (p.paidAmount || 0))),
    0
  );

  const handleExportCsv = () => {
    const headers = [
      'Purchase Order #',
      'Date',
      'Vendor / Supplier',
      'Invoice / Challan #',
      'Gross Amount (₹)',
      'Discount (₹)',
      'Round-off (₹)',
      'Total Net Bill (₹)',
      'Paid Amount (₹)',
      'Remaining Due (₹)',
      'Payment Status',
      'Recorded By',
    ];

    const rows = filteredPurchases.map((p) => {
      const vendor = vendors.find((v) => v.id === p.vendorId);
      const net = p.netAmount ?? p.totalAmount;
      const paid = p.paidAmount || 0;
      const remaining = p.remainingAmount ?? Math.max(0, net - paid);
      const payStatus = remaining <= 0.01 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

      return [
        p.purchaseNumber,
        formatIndianDate(p.purchaseDate),
        vendor?.name || 'Unknown',
        p.vendorInvoiceNumber,
        p.grossAmount ?? p.totalAmount,
        p.discount || 0,
        p.roundoff || 0,
        net,
        paid,
        remaining,
        payStatus,
        p.createdBy,
      ];
    });

    // Summary row
    rows.push([
      'TOTALS',
      `${filteredPurchases.length} Purchase Consignments`,
      '',
      '',
      '',
      '',
      '',
      totalProcuredAmount,
      totalPaidFiltered,
      totalRemainingFiltered,
      '',
      '',
    ]);

    exportToCsv('Supplier_Purchases_Report', headers, rows);
    onSuccessToast('Supplier purchases exported successfully.');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Daily Milk &amp; Product Purchases
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track incoming consignments, supplier bills, payment settlements, and remaining dues
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            onClick={() => setPaymentModalState({ isOpen: true })}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Record Supplier Payment</span>
          </button>

          {canPostPurchases && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Purchase & Payment Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bill Today</span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2">
            {formatIndianCurrency(todaySummary.totalBillToday)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Consignments procured today ({formatIndianDate(TODAY_STR)})</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Today Pay Amount</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-2">
            {formatIndianCurrency(todaySummary.todayPayAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Paid to suppliers today ({formatIndianDate(TODAY_STR)})</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Remaining Due</span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-2">
            {formatIndianCurrency(todaySummary.totalRemaining)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total pending balance payable to suppliers</p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
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
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            Total Procured: <strong className="text-slate-900 font-mono">{formatIndianCurrency(totalProcuredAmount)}</strong>
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO # or Challan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredPurchases.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No purchase records found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPurchases.map((p) => {
              const vendor = vendors.find((v) => v.id === p.vendorId);
              const isExpanded = expandedPoId === p.id;

              return (
                <div key={p.id} className="p-4 hover:bg-slate-50/60 transition-colors text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedPoId(isExpanded ? null : p.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{p.purchaseNumber}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold font-mono">
                            Inv #{p.vendorInvoiceNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Supplier: <strong>{vendor?.name}</strong> · Date: {formatIndianDate(p.purchaseDate)} · Recorded by: {p.createdBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-right">
                      {/* Financial 3-column breakdown */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Bill</span>
                        <div className="font-bold text-sm text-slate-900 font-mono">
                          {formatIndianCurrency(p.netAmount ?? p.totalAmount)}
                        </div>
                        {((p.discount && p.discount > 0) || (p.roundoff && p.roundoff !== 0)) && (
                          <div className="text-[9px] text-purple-700">
                            {p.discount ? `-₹${p.discount} disc ` : ''}
                            {p.roundoff ? `${p.roundoff > 0 ? '+' : ''}₹${p.roundoff} rnd` : ''}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase block">Paid</span>
                        <div className="font-bold text-sm text-emerald-700 font-mono">
                          {formatIndianCurrency(p.paidAmount || 0)}
                        </div>
                        {p.paidAmount && p.paidAmount > 0 ? (
                          <div className="text-[9px] text-slate-500">
                            {p.paymentMode === 'ONLINE' ? 'UPI / Bank' : p.paymentMode === 'CASH' ? 'Cash' : p.paymentMode === 'SPLIT' ? 'Split' : ''}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <span className="text-[10px] text-rose-600 font-bold uppercase block">Remaining</span>
                        <div className={`font-bold text-sm font-mono ${
                          (p.remainingAmount ?? ((p.netAmount ?? p.totalAmount) - (p.paidAmount || 0))) > 0
                            ? 'text-rose-700'
                            : 'text-slate-400'
                        }`}>
                          {formatIndianCurrency(
                            p.remainingAmount ?? Math.max(0, (p.netAmount ?? p.totalAmount) - (p.paidAmount || 0))
                          )}
                        </div>
                      </div>

                      {/* Payment Status Badge */}
                      {(() => {
                        const net = p.netAmount ?? p.totalAmount;
                        const paid = p.paidAmount || 0;
                        const rem = p.remainingAmount ?? Math.max(0, net - paid);
                        const isPaid = rem <= 0.01;
                        const isPartial = paid > 0 && rem > 0.01;

                        return (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                            </span>

                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPaymentModalState({
                                    isOpen: true,
                                    vendorId: p.vendorId,
                                    purchaseId: p.id,
                                  })
                                }
                                className="px-2 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                                title="Record payment for this consignment"
                              >
                                <IndianRupee className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}

                            {canPostPurchases && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingPurchase(p)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                                  title="Edit purchase quantities, rates, or details"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span className="hidden sm:inline">Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeletingPurchase(p)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                                  title="Delete purchase entry & adjust stock"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Expanded Product Lines */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 pl-8 pr-2">
                      <table className="w-full text-left text-xs bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                        <thead className="text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Product Item</th>
                            <th className="py-2 px-3 text-right">Quantity</th>
                            <th className="py-2 px-3 text-right">Rate (₹)</th>
                            <th className="py-2 px-3 text-right">Total Line (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {p.lines.map((l, idx) => {
                            const prod = products.find((pr) => pr.id === l.productId);
                            return (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {prod?.name || 'Dairy Product'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {l.quantity} {prod?.unit}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  ₹{l.purchaseRate.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatIndianCurrency(l.lineAmount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {p.remarks && (
                        <p className="text-[11px] text-slate-500 mt-2 italic">
                          Remarks: {p.remarks}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Entry / Edit Modal */}
      {(isAddModalOpen || editingPurchase) && (
        <PurchaseEntryModal
          isOpen={true}
          editingPurchase={editingPurchase}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingPurchase(null);
          }}
          onSuccess={(poNo) => {
            if (editingPurchase) {
              onSuccessToast(`Purchase Order #${poNo} updated successfully! Inventory stock adjusted.`);
            } else {
              onSuccessToast(`Purchase Order #${poNo} successfully posted to inventory!`);
            }
            setIsAddModalOpen(false);
            setEditingPurchase(null);
          }}
          onErrorToast={onErrorToast}
        />
      )}

      {/* Delete Purchase Confirmation Modal */}
      {deletingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Purchase Entry?</h3>
                <p className="text-xs text-slate-500">This action will adjust inventory stock accordingly.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">PO Number:</span>
                <strong className="font-mono text-slate-900">{deletingPurchase.purchaseNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <strong>{vendors.find((v) => v.id === deletingPurchase.vendorId)?.name || 'Supplier'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consignment Bill:</span>
                <strong className="font-mono text-purple-900">
                  {formatIndianCurrency(deletingPurchase.netAmount ?? deletingPurchase.totalAmount)}
                </strong>
              </div>
              <p className="text-rose-600 font-semibold pt-1 border-t border-slate-200 text-[11px]">
                ⚠️ Stock received under this purchase will be rolled back from inventory.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPurchase(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = deletePurchase(deletingPurchase.id);
                  if (res.success) {
                    onSuccessToast(`Purchase Order #${deletingPurchase.purchaseNumber} deleted and inventory stock adjusted.`);
                    setDeletingPurchase(null);
                  } else {
                    onErrorToast(res.error || 'Failed to delete purchase.');
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Payment Modal */}
      {paymentModalState.isOpen && (
        <VendorPaymentModal
          isOpen={true}
          onClose={() => setPaymentModalState({ isOpen: false })}
          defaultVendorId={paymentModalState.vendorId}
          defaultPurchaseId={paymentModalState.purchaseId}
          onSuccessToast={onSuccessToast}
          onErrorToast={onErrorToast}
        />
      )}
    </div>
  );
};
