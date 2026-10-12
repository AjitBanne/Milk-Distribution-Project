import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { Customer, Dispatch, Product, Collection } from '../../types/dairy';
import { exportToCsv } from '../../services/csvExport';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';

export interface RouteExportRow {
  sequence: number;
  customerId: string;
  customerName: string;
  mobileNumber: string;
  isDispatched: boolean;
  productsSummary: string;
  itemCount: number;
  totalBill: number;
  collectionAmount: number;
  pendingAmount: number;
  remainingAmount: number;
}

interface RouteExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  customers: Customer[];
  completedMap: Map<string, Dispatch>;
  products: Product[];
  collections: Collection[];
  onSuccessToast: (msg: string) => void;
}

export const RouteExportModal: React.FC<RouteExportModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  customers,
  completedMap,
  products,
  collections,
  onSuccessToast,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Build rows for each customer on today's route
  const allRows: RouteExportRow[] = useMemo(() => {
    return customers.map((c) => {
      const disp = completedMap.get(c.id);

      // Collections today for this customer
      const standaloneColls = collections
        .filter((col) => col.customerId === c.id && col.collectionDate === selectedDate && !col.dispatchId)
        .reduce((sum, col) => sum + col.amount, 0);

      const dispatchPaid = disp?.paymentReceived || 0;
      const totalCollected = dispatchPaid + standaloneColls;

      let productsSummary = 'Pending / Not Delivered';
      let itemCount = 0;

      if (disp && disp.lines && disp.lines.length > 0) {
        const lineParts = disp.lines.map((l) => {
          const p = prodMap.get(l.productId);
          const name = p ? p.name : 'Item';
          const unit = p ? p.unit : '';
          let part = `${name}: ${l.billedQuantity} ${unit}`;
          if (l.complimentaryQuantity > 0) {
            part += ` (+${l.complimentaryQuantity} free)`;
          }
          itemCount += l.billedQuantity;
          return part;
        });
        productsSummary = lineParts.join(', ');
      }

      const totalBill = disp ? disp.netAmount : 0;
      const pendingAmount = disp ? disp.previousOutstanding : c.currentOutstanding;
      const remainingAmount = disp ? disp.closingOutstanding : c.currentOutstanding;

      return {
        sequence: c.routeSequence,
        customerId: c.id,
        customerName: c.name,
        mobileNumber: c.mobileNumber || '',
        isDispatched: Boolean(disp),
        productsSummary,
        itemCount,
        totalBill,
        collectionAmount: totalCollected,
        pendingAmount,
        remainingAmount,
      };
    });
  }, [customers, completedMap, collections, selectedDate, prodMap]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (filterType === 'COMPLETED' && !row.isDispatched) return false;
      if (filterType === 'PENDING' && row.isDispatched) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.customerName.toLowerCase().includes(q) ||
        row.mobileNumber.includes(q) ||
        String(row.sequence).includes(q) ||
        row.productsSummary.toLowerCase().includes(q)
      );
    });
  }, [allRows, filterType, searchQuery]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.totalBill += r.totalBill;
        acc.totalCollection += r.collectionAmount;
        acc.totalPending += r.pendingAmount;
        acc.totalRemaining += r.remainingAmount;
        return acc;
      },
      { totalBill: 0, totalCollection: 0, totalPending: 0, totalRemaining: 0 }
    );
  }, [filteredRows]);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const headers = [
      'Seq #',
      'Customer Name',
      'Mobile Number',
      'Status',
      'Products Given & Quantity',
      'Total Bill (₹)',
      'Collection Amount (₹)',
      'Pending Amount (₹)',
      'Remaining Amount (₹)',
    ];

    const rows = filteredRows.map((r) => [
      r.sequence,
      r.customerName,
      r.mobileNumber ? `+91 ${r.mobileNumber}` : 'N/A',
      r.isDispatched ? 'Completed' : 'Pending',
      r.productsSummary,
      r.totalBill,
      r.collectionAmount,
      r.pendingAmount,
      r.remainingAmount,
    ]);

    // Grand totals summary row
    rows.push([
      'TOTALS',
      `${filteredRows.length} Customer(s) on Route`,
      '',
      '',
      '',
      totals.totalBill,
      totals.totalCollection,
      totals.totalPending,
      totals.totalRemaining,
    ]);

    exportToCsv(`Route_Report_${selectedDate}`, headers, rows);
    onSuccessToast(`Today's route report successfully exported to CSV for ${selectedDate}!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Today’s Route Distribution &amp; Financial Sheet
              </h3>
              <p className="text-xs text-slate-300">
                Date: {formatIndianDate(selectedDate)} · {filteredRows.length} customer deliveries
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Strip */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 bg-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Route ({allRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('COMPLETED')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'COMPLETED' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({allRows.filter((r) => r.isDispatched).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('PENDING')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  filterType === 'PENDING' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({allRows.filter((r) => !r.isDispatched).length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-white border-b border-slate-200 text-xs shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Customers</span>
            <strong className="text-sm font-mono text-slate-900 block mt-0.5">
              {filteredRows.length} Stops
            </strong>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
            <span className="text-[10px] text-purple-700 font-bold uppercase block">Total Today Bill</span>
            <strong className="text-sm font-mono text-purple-900 block mt-0.5">
              {formatIndianCurrency(totals.totalBill)}
            </strong>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Total Collection</span>
            <strong className="text-sm font-mono text-emerald-900 block mt-0.5">
              {formatIndianCurrency(totals.totalCollection)}
            </strong>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            <span className="text-[10px] text-rose-700 font-bold uppercase block">Total Remaining</span>
            <strong className="text-sm font-mono text-rose-900 block mt-0.5">
              {formatIndianCurrency(totals.totalRemaining)}
            </strong>
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold select-none border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2.5 text-center w-12">Seq</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Products Given &amp; Quantity</th>
                  <th className="py-2.5 px-3 text-right">Total Bill</th>
                  <th className="py-2.5 px-3 text-right">Collection</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No customer route stops match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700">
                        #{row.sequence}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div>{row.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {row.mobileNumber ? `+91 ${row.mobileNumber}` : 'No mobile'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                        <span className={row.isDispatched ? 'font-medium text-slate-900' : 'text-slate-400 italic'}>
                          {row.productsSummary}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {row.isDispatched ? formatIndianCurrency(row.totalBill) : '₹0'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                        {row.collectionAmount > 0 ? formatIndianCurrency(row.collectionAmount) : '₹0'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatIndianCurrency(row.pendingAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {formatIndianCurrency(row.remainingAmount)}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            row.isDispatched
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.isDispatched ? 'Delivered' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px]">
                      Route Totals:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-900 font-bold">
                      {formatIndianCurrency(totals.totalBill)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-900 font-bold">
                      {formatIndianCurrency(totals.totalCollection)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatIndianCurrency(totals.totalPending)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-900 font-bold">
                      {formatIndianCurrency(totals.totalRemaining)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Export includes: Customer Name, Products Given &amp; Qty, Total Bill, Collection Amount, Pending Amount, Remaining Amount.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
