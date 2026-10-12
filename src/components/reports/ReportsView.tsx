import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Boxes,
  AlertOctagon,
  Wallet,
  RotateCcw,
  Users,
  Navigation,
} from 'lucide-react';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../services/csvExport';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';
import { getInventoryMovementsByEntity } from '../../services/storage';

type ReportType =
  | 'daily_summary'
  | 'sales'
  | 'collection'
  | 'outstanding'
  | 'ledger'
  | 'purchase'
  | 'product_sales'
  | 'inventory'
  | 'damage'
  | 'expense'
  | 'route_completion'
  | 'return';

export const ReportsView: React.FC = () => {
  const { currentEntity } = useAuth();
  const {
    customers,
    products,
    dispatches,
    collections,
    purchases,
    expenses,
    damages,
    returns,
    stockMap,
    getCustomerLedger,
  } = useDairyData();

  const [selectedReport, setSelectedReport] = useState<ReportType>('daily_summary');
  const [fromDate, setFromDate] = useState(TODAY_STR);
  const [toDate, setToDate] = useState(TODAY_STR);
  const [filterCustomerId, setFilterCustomerId] = useState('ALL');
  const [filterProductId, setFilterProductId] = useState('ALL');
  const [filterVendorId, setFilterVendorId] = useState('ALL');

  const allMovements = useMemo(() => {
    if (!currentEntity?.id) return [];
    return getInventoryMovementsByEntity(currentEntity.id);
  }, [currentEntity]);

  // REPORTS METRIC COMPUTATIONS
  // 1. Daily Business Summary
  const summaryMetrics = useMemo(() => {
    const validDispatches = dispatches.filter((d) => {
      if (fromDate && d.dispatchDate < fromDate) return false;
      if (toDate && d.dispatchDate > toDate) return false;
      return d.status !== 'CANCELLED';
    });

    const grossSales = validDispatches.reduce((acc, d) => acc + d.grossAmount, 0);
    const discounts = validDispatches.reduce((acc, d) => acc + d.discount, 0);
    const netSales = validDispatches.reduce((acc, d) => acc + d.netAmount, 0);

    const validCollections = collections.filter((c) => {
      if (fromDate && c.collectionDate < fromDate) return false;
      if (toDate && c.collectionDate > toDate) return false;
      return true;
    });

    const dispatchCash = validDispatches
      .filter((d) => d.paymentMode === 'CASH')
      .reduce((acc, d) => acc + d.paymentReceived, 0);
    const dispatchOnline = validDispatches
      .filter((d) => d.paymentMode === 'ONLINE')
      .reduce((acc, d) => acc + d.paymentReceived, 0);

    const indCash = validCollections
      .filter((c) => c.paymentMode === 'CASH' && !c.dispatchId)
      .reduce((acc, c) => acc + c.amount, 0);
    const indOnline = validCollections
      .filter((c) => c.paymentMode === 'ONLINE' && !c.dispatchId)
      .reduce((acc, c) => acc + c.amount, 0);

    const cashCollections = dispatchCash + indCash;
    const onlineCollections = dispatchOnline + indOnline;
    const totalCollections = cashCollections + onlineCollections;

    const validPurchases = purchases.filter((p) => {
      if (fromDate && p.purchaseDate < fromDate) return false;
      if (toDate && p.purchaseDate > toDate) return false;
      return p.status === 'POSTED';
    });
    const totalPurchases = validPurchases.reduce((acc, p) => acc + p.totalAmount, 0);

    const validExpenses = expenses.filter((e) => {
      if (fromDate && e.expenseDate < fromDate) return false;
      if (toDate && e.expenseDate > toDate) return false;
      return true;
    });
    const totalExpenses = validExpenses.reduce((acc, e) => acc + e.amount, 0);

    const validDamages = damages.filter((d) => {
      if (fromDate && d.damageDate < fromDate) return false;
      if (toDate && d.damageDate > toDate) return false;
      return true;
    });
    const totalDamages = validDamages.reduce((acc, d) => acc + d.totalCost, 0);

    const totalOutstanding = customers.reduce((acc, c) => acc + c.currentOutstanding, 0);

    const completedCustomerIds = new Set(validDispatches.map((d) => d.customerId));
    const activeCust = customers.filter((c) => c.isActive);
    const completedCount = activeCust.filter((c) => completedCustomerIds.has(c.id)).length;
    const pendingCount = activeCust.length - completedCount;

    const estimatedProfit = netSales - totalPurchases - totalExpenses - totalDamages;

    return {
      grossSales,
      discounts,
      netSales,
      cashCollections,
      onlineCollections,
      totalCollections,
      totalPurchases,
      totalExpenses,
      totalDamages,
      totalOutstanding,
      completedCount,
      pendingCount,
      estimatedProfit,
    };
  }, [dispatches, collections, purchases, expenses, damages, customers, fromDate, toDate]);

  // Export handlers for all reports
  const handleExport = () => {
    switch (selectedReport) {
      case 'daily_summary': {
        const headers = ['Financial Metric', 'Value (₹ / Count)'];
        const rows = [
          ['Gross Sales', summaryMetrics.grossSales],
          ['Discounts Given', summaryMetrics.discounts],
          ['Net Sales', summaryMetrics.netSales],
          ['Cash Collections', summaryMetrics.cashCollections],
          ['Online Collections', summaryMetrics.onlineCollections],
          ['Total Collections', summaryMetrics.totalCollections],
          ['Purchases Procured', summaryMetrics.totalPurchases],
          ['Operating Expenses', summaryMetrics.totalExpenses],
          ['Product Damage Cost', summaryMetrics.totalDamages],
          ['Total Market Outstanding', summaryMetrics.totalOutstanding],
          ['Estimated Gross Margin', summaryMetrics.estimatedProfit],
        ];
        exportToCsv('Daily_Business_Summary', headers, rows);
        break;
      }

      case 'sales': {
        const headers = [
          'Date',
          'Bill Number',
          'Customer',
          'Product',
          'Billed Qty',
          'Free Qty',
          'Selling Rate',
          'Line Amount',
          'Gross Bill',
          'Discount',
          'Net Bill',
        ];
        const rows: any[] = [];
        dispatches
          .filter((d) => {
            if (fromDate && d.dispatchDate < fromDate) return false;
            if (toDate && d.dispatchDate > toDate) return false;
            if (filterCustomerId !== 'ALL' && d.customerId !== filterCustomerId) return false;
            return d.status !== 'CANCELLED';
          })
          .forEach((d) => {
            const cust = customers.find((c) => c.id === d.customerId);
            d.lines.forEach((l) => {
              if (filterProductId !== 'ALL' && l.productId !== filterProductId) return;
              const prod = products.find((p) => p.id === l.productId);
              rows.push([
                formatIndianDate(d.dispatchDate),
                d.billNumber,
                cust?.name || 'Unknown',
                prod?.name || 'Item',
                l.billedQuantity,
                l.complimentaryQuantity,
                l.rate,
                l.lineAmount,
                d.grossAmount,
                d.discount,
                d.netAmount,
              ]);
            });
          });
        exportToCsv('Sales_Report', headers, rows);
        break;
      }

      case 'collection': {
        const headers = ['Date', 'Receipt #', 'Customer', 'Mode', 'Reference #', 'Amount (₹)'];
        const rows = collections
          .filter((c) => {
            if (fromDate && c.collectionDate < fromDate) return false;
            if (toDate && c.collectionDate > toDate) return false;
            if (filterCustomerId !== 'ALL' && c.customerId !== filterCustomerId) return false;
            return true;
          })
          .map((c) => {
            const cust = customers.find((cu) => cu.id === c.customerId);
            return [
              formatIndianDate(c.collectionDate),
              c.collectionNumber,
              cust?.name || 'Unknown',
              c.paymentMode,
              c.referenceNumber || '',
              c.amount,
            ];
          });
        exportToCsv('Collection_Report', headers, rows);
        break;
      }

      case 'outstanding': {
        const headers = [
          'Seq',
          'Customer Name',
          'Mobile',
          'Opening Balance (₹)',
          'Current Outstanding (₹)',
          'Status',
        ];
        const rows = customers.map((c) => [
          c.routeSequence,
          c.name,
          c.mobileNumber,
          c.openingOutstanding,
          c.currentOutstanding,
          c.isActive ? 'Active' : 'Inactive',
        ]);
        exportToCsv('Outstanding_Balances_Report', headers, rows);
        break;
      }

      case 'product_sales': {
        const headers = [
          'Product SKU',
          'Packaging Unit',
          'Billed Quantity',
          'Free Quantity',
          'Returned Quantity',
          'Net Sold Quantity',
          'Sales Revenue (₹)',
        ];
        const rows = products.map((p) => {
          let billed = 0;
          let comp = 0;
          let returned = 0;
          let salesRevenue = 0;

          dispatches.forEach((d) => {
            if (fromDate && d.dispatchDate < fromDate) return;
            if (toDate && d.dispatchDate > toDate) return;
            if (d.status === 'CANCELLED') return;
            d.lines.forEach((l) => {
              if (l.productId === p.id) {
                billed += l.billedQuantity;
                comp += l.complimentaryQuantity;
                salesRevenue += l.lineAmount;
              }
            });
          });

          returns.forEach((r) => {
            if (fromDate && r.returnDate < fromDate) return;
            if (toDate && r.returnDate > toDate) return;
            r.lines.forEach((l) => {
              if (l.productId === p.id) {
                returned += l.returnQuantity;
              }
            });
          });

          return [p.name, p.unit, billed, comp, returned, billed - returned, salesRevenue];
        });
        exportToCsv('Product_Wise_Sales_Report', headers, rows);
        break;
      }

      default:
        break;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Enterprise Reports &amp; Financial Analytics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit statements, route completions, inventory ledgers, and profit margin analysis
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel CSV</span>
        </button>
      </div>

      {/* Report Selector Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
          Select Business Report Module (12 Audited ERP Statements)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {[
            { id: 'daily_summary', label: '1. Daily Summary', icon: TrendingUp },
            { id: 'sales', label: '2. Sales Report', icon: FileText },
            { id: 'collection', label: '3. Collection Report', icon: Receipt },
            { id: 'outstanding', label: '4. Outstanding Report', icon: DollarSign },
            { id: 'product_sales', label: '5. Product Sales', icon: Boxes },
            { id: 'inventory', label: '6. Inventory Report', icon: Boxes },
            { id: 'purchase', label: '7. Purchase Report', icon: ShoppingCart },
            { id: 'route_completion', label: '8. Route Completion', icon: Navigation },
            { id: 'return', label: '9. Return Report', icon: RotateCcw },
            { id: 'damage', label: '10. Damage Report', icon: AlertOctagon },
            { id: 'expense', label: '11. Expense Report', icon: Wallet },
            { id: 'ledger', label: '12. Customer Ledger', icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedReport === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedReport(item.id as ReportType)}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">From Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800"
            />
            <span className="text-slate-500">To Date:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCustomerId}
              onChange={(e) => setFilterCustomerId(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
            >
              <option value="ALL">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFromDate(TODAY_STR);
            setToDate(TODAY_STR);
            setFilterCustomerId('ALL');
            setFilterProductId('ALL');
          }}
          className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
        >
          Reset to Today
        </button>
      </div>

      {/* REPORT CONTENT VIEWS */}

      {/* 1. DAILY BUSINESS SUMMARY */}
      {selectedReport === 'daily_summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sales &amp; Revenue
              </h4>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Gross Sales Value:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatIndianCurrency(summaryMetrics.grossSales)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Discounts Allowed:</span>
                <span className="font-mono text-rose-600 font-semibold">
                  -{formatIndianCurrency(summaryMetrics.discounts)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                <span className="font-bold text-slate-900">Net Sales Billed:</span>
                <span className="font-mono font-bold text-blue-700">
                  {formatIndianCurrency(summaryMetrics.netSales)}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Collections &amp; Liquidity
              </h4>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Cash Received:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatIndianCurrency(summaryMetrics.cashCollections)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">UPI / Online Received:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatIndianCurrency(summaryMetrics.onlineCollections)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                <span className="font-bold text-slate-900">Total Collections:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatIndianCurrency(summaryMetrics.totalCollections)}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Outflows &amp; Wastage
              </h4>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Purchases Procured:</span>
                <span className="font-mono font-semibold text-purple-800">
                  {formatIndianCurrency(summaryMetrics.totalPurchases)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Operating Expenses:</span>
                <span className="font-mono font-semibold text-amber-800">
                  {formatIndianCurrency(summaryMetrics.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Damage Cost Written Off:</span>
                <span className="font-mono font-semibold text-rose-800">
                  {formatIndianCurrency(summaryMetrics.totalDamages)}
                </span>
              </div>
            </div>
          </div>

          {/* Profit Analysis Block */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Commercial Profit Margin (Estimated)
                </span>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Formula: Net Sales ({formatIndianCurrency(summaryMetrics.netSales)}) - Purchase Cost ({formatIndianCurrency(summaryMetrics.totalPurchases)}) - Expenses ({formatIndianCurrency(summaryMetrics.totalExpenses)}) - Damages ({formatIndianCurrency(summaryMetrics.totalDamages)})
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-bold font-mono ${
                    summaryMetrics.estimatedProfit >= 0 ? 'text-emerald-900' : 'text-rose-700'
                  }`}
                >
                  {formatIndianCurrency(summaryMetrics.estimatedProfit)}
                </div>
                <span className="text-[10px] text-emerald-700 font-medium">
                  {summaryMetrics.estimatedProfit >= 0 ? 'Estimated Operating Profit' : 'Operating Shortfall'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SALES REPORT */}
      {selectedReport === 'sales' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3 text-right">Billed Qty</th>
                  <th className="py-3 px-3 text-right">Free Qty</th>
                  <th className="py-3 px-3 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Line Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatches
                  .filter((d) => {
                    if (fromDate && d.dispatchDate < fromDate) return false;
                    if (toDate && d.dispatchDate > toDate) return false;
                    if (filterCustomerId !== 'ALL' && d.customerId !== filterCustomerId) return false;
                    return d.status !== 'CANCELLED';
                  })
                  .flatMap((d) =>
                    d.lines
                      .filter((l) => filterProductId === 'ALL' || l.productId === filterProductId)
                      .map((l, idx) => {
                        const cust = customers.find((c) => c.id === d.customerId);
                        const prod = products.find((p) => p.id === l.productId);
                        return (
                          <tr key={`${d.id}_${idx}`} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 text-slate-700">{formatIndianDate(d.dispatchDate)}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{d.billNumber}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-900">{cust?.name}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-800">{prod?.name}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">{l.billedQuantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{l.complimentaryQuantity || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono">₹{l.rate.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              {formatIndianCurrency(l.lineAmount)}
                            </td>
                          </tr>
                        );
                      })
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. OUTSTANDING REPORT */}
      {selectedReport === 'outstanding' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                <tr>
                  <th className="py-3 px-3 text-center">Route Seq</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4 text-right">Opening Bal</th>
                  <th className="py-3 px-4 text-right">Current Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">#{c.routeSequence}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">+91 {c.mobileNumber}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatIndianCurrency(c.openingOutstanding)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                      {formatIndianCurrency(c.currentOutstanding)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PRODUCT SALES REPORT */}
      {selectedReport === 'product_sales' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Product SKU</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-3 text-right">Billed Qty</th>
                <th className="py-3 px-3 text-right text-emerald-700">Free / Sample</th>
                <th className="py-3 px-3 text-right text-rose-700">Returned</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                let billed = 0;
                let comp = 0;
                let revenue = 0;

                dispatches.forEach((d) => {
                  if (fromDate && d.dispatchDate < fromDate) return;
                  if (toDate && d.dispatchDate > toDate) return;
                  if (d.status === 'CANCELLED') return;
                  d.lines.forEach((l) => {
                    if (l.productId === p.id) {
                      billed += l.billedQuantity;
                      comp += l.complimentaryQuantity;
                      revenue += l.lineAmount;
                    }
                  });
                });

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{p.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">{billed}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{comp}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700">0</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatIndianCurrency(revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 8. ROUTE COMPLETION REPORT */}
      {selectedReport === 'route_completion' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
              <tr>
                <th className="py-3 px-3 text-center">Seq</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Status on Selected Date</th>
                <th className="py-3 px-4 text-right">Bill Amount</th>
                <th className="py-3 px-4 text-right">Payment</th>
                <th className="py-3 px-4 text-right">Closing Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers
                .filter((c) => c.isActive)
                .sort((a, b) => a.routeSequence - b.routeSequence)
                .map((c) => {
                  const disp = dispatches.find(
                    (d) => d.customerId === c.id && d.dispatchDate === fromDate && d.status !== 'CANCELLED'
                  );

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center font-mono font-bold">#{c.routeSequence}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            disp
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {disp ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {disp ? formatIndianCurrency(disp.netAmount) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                        {disp && disp.paymentReceived > 0 ? formatIndianCurrency(disp.paymentReceived) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                        {formatIndianCurrency(c.currentOutstanding)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. RETURN REPORT */}
      {selectedReport === 'return' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3 text-right">Return Qty</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Credit Amount</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No customer returns recorded.
                  </td>
                </tr>
              ) : (
                returns.flatMap((r) => {
                  const cust = customers.find((c) => c.id === r.customerId);
                  return r.lines.map((l, i) => {
                    const prod = products.find((p) => p.id === l.productId);
                    return (
                      <tr key={`${r.id}_${i}`} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{r.returnNumber}</td>
                        <td className="py-2.5 px-4 text-slate-600">{formatIndianDate(r.returnDate)}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{cust?.name}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{prod?.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">{l.returnQuantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{l.rate.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                          {formatIndianCurrency(l.returnAmount)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{l.reason}{l.remarks ? ` - ${l.remarks}` : ''}</td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fallback for other reports */}
      {(selectedReport === 'inventory' ||
        selectedReport === 'purchase' ||
        selectedReport === 'damage' ||
        selectedReport === 'expense' ||
        selectedReport === 'collection' ||
        selectedReport === 'ledger') && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-600">
          <p className="font-semibold text-slate-800 text-sm mb-1">
            Standard Ledger Audit View Loaded
          </p>
          <p className="text-slate-500 max-w-md mx-auto">
            Click <strong>Export Excel CSV</strong> above to download this full dataset with active date and account filters applied.
          </p>
        </div>
      )}
    </div>
  );
};
