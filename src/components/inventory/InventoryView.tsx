import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Sliders,
  Download,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  AlertOctagon,
  Calendar,
} from 'lucide-react';
import { Product } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { getInventoryMovementsByEntity } from '../../services/storage';
import { exportToCsv } from '../../services/csvExport';
import { formatIndianDate } from '../../services/whatsapp';
import { StockAdjustmentModal } from './StockAdjustmentModal';

interface InventoryViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { currentEntity, canEditMasters } = useAuth();
  const { products, stockMap } = useDairyData();

  const [activeTab, setActiveTab] = useState<'summary' | 'movements'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Retrieve movements for current entity
  const allMovements = useMemo(() => {
    if (!currentEntity?.id) return [];
    return getInventoryMovementsByEntity(currentEntity.id);
  }, [currentEntity]);

  // Compute breakdown metrics per product
  const productSummaries = useMemo(() => {
    return products.map((p) => {
      const pMovements = allMovements.filter((m) => {
        if (m.productId !== p.id) return false;
        if (fromDate && m.date < fromDate) return false;
        if (toDate && m.date > toDate) return false;
        return true;
      });

      let opening = 0;
      let purchased = 0;
      let dispatched = 0;
      let complimentary = 0;
      let returned = 0;
      let damaged = 0;
      let adjustments = 0;

      pMovements.forEach((m) => {
        if (m.type === 'OPENING_STOCK') opening += m.quantityChange;
        else if (m.type === 'PURCHASE') purchased += m.quantityChange;
        else if (m.type === 'CUSTOMER_DISPATCH') dispatched += Math.abs(m.quantityChange);
        else if (m.type === 'COMPLIMENTARY_DISPATCH') complimentary += Math.abs(m.quantityChange);
        else if (m.type === 'CUSTOMER_RETURN') returned += m.quantityChange;
        else if (m.type === 'DAMAGE') damaged += Math.abs(m.quantityChange);
        else if (m.type === 'STOCK_ADJUSTMENT') adjustments += m.quantityChange;
      });

      const currentStock = stockMap[p.id] || 0;

      return {
        product: p,
        opening,
        purchased,
        dispatched,
        complimentary,
        returned,
        damaged,
        adjustments,
        closing: currentStock,
      };
    });
  }, [products, allMovements, fromDate, toDate, stockMap]);

  // Filtered movements for Ledger tab
  const filteredMovements = useMemo(() => {
    return allMovements
      .filter((m) => {
        if (selectedProductId !== 'ALL' && m.productId !== selectedProductId) return false;
        if (fromDate && m.date < fromDate) return false;
        if (toDate && m.date > toDate) return false;
        return true;
      })
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt > a.createdAt ? 1 : -1));
  }, [allMovements, selectedProductId, fromDate, toDate]);

  const handleExportSummaryCsv = () => {
    const headers = [
      'Product Name',
      'Packaging Unit',
      'Opening Stock',
      'Purchased Qty',
      'Dispatched (Sold)',
      'Complimentary / Free',
      'Customer Returns',
      'Damages',
      'Stock Adjustments',
      'Current Closing Stock',
    ];

    const rows = productSummaries.map((s) => [
      s.product.name,
      s.product.unit,
      s.opening,
      s.purchased,
      s.dispatched,
      s.complimentary,
      s.returned,
      s.damaged,
      s.adjustments,
      s.closing,
    ]);

    exportToCsv('Inventory_Summary_Report', headers, rows);
  };

  const handleExportMovementsCsv = () => {
    const headers = [
      'Date',
      'Product SKU',
      'Movement Type',
      'Quantity Change',
      'Reason / Reference',
      'Recorded By',
    ];

    const rows = filteredMovements.map((m) => {
      const prod = products.find((p) => p.id === m.productId);
      return [
        formatIndianDate(m.date),
        prod?.name || 'Unknown',
        m.type,
        m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange,
        m.reason || m.referenceId || '',
        m.createdBy,
      ];
    });

    exportToCsv('Stock_Movements_Ledger', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Inventory &amp; Stock Movement Engine
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic stock derived strictly from purchases, daily route dispatches, returns, and damages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={activeTab === 'summary' ? handleExportSummaryCsv : handleExportMovementsCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {canEditMasters && (
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Stock Adjustment</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tab Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Product Stock Balance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              activeTab === 'movements'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Trail ({allMovements.length})
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 border border-slate-200 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-1.5 py-0.5 border border-slate-200 rounded"
          />
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-1.5 py-0.5 border border-slate-200 rounded"
          />
        </div>
      </div>

      {/* SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-right">Opening</th>
                  <th className="py-3 px-3 text-right text-purple-700">Purchased (+)</th>
                  <th className="py-3 px-3 text-right text-blue-700">Dispatched (-)</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Free / Sample (-)</th>
                  <th className="py-3 px-3 text-right text-rose-700">Returns (+)</th>
                  <th className="py-3 px-3 text-right text-amber-700">Damaged (-)</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-100/60">
                    Closing Physical Stock
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productSummaries.map((s) => {
                  const isLow = s.closing <= 10;
                  const isNegative = s.closing < 0;

                  return (
                    <tr key={s.product.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.product.name}
                        {!s.product.isActive && (
                          <span className="ml-1.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                            Seasonal Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {s.product.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">{s.opening}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-purple-800">
                        {s.purchased > 0 ? `+${s.purchased}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-blue-800">
                        {s.dispatched > 0 ? `-${s.dispatched}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800">
                        {s.complimentary > 0 ? `-${s.complimentary}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-800">
                        {s.returned > 0 ? `+${s.returned}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-800">
                        {s.damaged > 0 ? `-${s.damaged}` : '0'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-slate-100/60">
                        <span
                          className={`text-sm ${
                            isNegative
                              ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-slate-950'
                          }`}
                        >
                          {s.closing} {s.product.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MOVEMENTS AUDIT TAB */}
      {activeTab === 'movements' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">All Product SKUs</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Product SKU</th>
                    <th className="py-3 px-3">Movement Type</th>
                    <th className="py-3 px-4 text-right">Qty Change</th>
                    <th className="py-3 px-4">Reason / Reference</th>
                    <th className="py-3 px-4">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map((m) => {
                    const prod = products.find((p) => p.id === m.productId);
                    const isPositive = m.quantityChange > 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {formatIndianDate(m.date)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {prod?.name || 'Dairy Item'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-semibold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={
                              isPositive ? 'text-emerald-700' : 'text-rose-700'
                            }
                          >
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange} {prod?.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-sm truncate">
                          {m.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {m.createdBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          isOpen={true}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSuccessToast={onSuccessToast}
          onErrorToast={onErrorToast}
        />
      )}
    </div>
  );
};
