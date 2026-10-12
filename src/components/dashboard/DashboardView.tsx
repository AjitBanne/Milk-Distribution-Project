import React from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Receipt,
  AlertTriangle,
  ShoppingCart,
  Wallet,
  AlertOctagon,
  ArrowRight,
  Plus,
  Send,
  Navigation,
  FileText,
  DollarSign,
  BarChart3,
  Boxes,
} from 'lucide-react';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenDispatch: (customerId: string) => void;
  onOpenWhatsApp: (dispatchId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenDispatch,
  onOpenWhatsApp,
}) => {
  const { currentEntity } = useAuth();
  const {
    customers,
    products,
    dispatches,
    collections,
    purchases,
    expenses,
    damages,
    stockMap,
  } = useDairyData();

  // Active customers
  const activeCustomers = customers.filter((c) => c.isActive);
  const totalActiveCustomers = activeCustomers.length;

  // Today's dispatches
  const todayDispatches = dispatches.filter(
    (d) => d.dispatchDate === TODAY_STR && d.status !== 'CANCELLED'
  );
  const completedCustomerIds = new Set(todayDispatches.map((d) => d.customerId));
  const completedCount = activeCustomers.filter((c) => completedCustomerIds.has(c.id)).length;
  const pendingCount = activeCustomers.filter((c) => !completedCustomerIds.has(c.id)).length;

  // Sales totals
  const todayGrossSales = todayDispatches.reduce((acc, d) => acc + d.grossAmount, 0);
  const todayDiscounts = todayDispatches.reduce((acc, d) => acc + d.discount, 0);
  const todayNetSales = todayDispatches.reduce((acc, d) => acc + d.netAmount, 0);

  // Today's collections (from both dispatches and independent collections on today's date)
  const todayDispatchCollectionsCash = todayDispatches
    .filter((d) => d.paymentMode === 'CASH')
    .reduce((acc, d) => acc + d.paymentReceived, 0);
  const todayDispatchCollectionsOnline = todayDispatches
    .filter((d) => d.paymentMode === 'ONLINE')
    .reduce((acc, d) => acc + d.paymentReceived, 0);

  const todayIndependentCollections = collections.filter(
    (c) => c.collectionDate === TODAY_STR && !c.dispatchId
  );
  const indCash = todayIndependentCollections
    .filter((c) => c.paymentMode === 'CASH')
    .reduce((acc, c) => acc + c.amount, 0);
  const indOnline = todayIndependentCollections
    .filter((c) => c.paymentMode === 'ONLINE')
    .reduce((acc, c) => acc + c.amount, 0);

  const todayCashCollections = todayDispatchCollectionsCash + indCash;
  const todayOnlineCollections = todayDispatchCollectionsOnline + indOnline;
  const todayTotalCollections = todayCashCollections + todayOnlineCollections;

  // Total Customer Outstanding (sum of current outstandings of all active customers)
  const totalCustomerOutstanding = customers.reduce((acc, c) => acc + c.currentOutstanding, 0);

  // Today's purchases
  const todayPurchases = purchases.filter(
    (p) => p.purchaseDate === TODAY_STR && p.status === 'POSTED'
  );
  const todayPurchaseAmount = todayPurchases.reduce((acc, p) => acc + p.totalAmount, 0);

  // Today's expenses
  const todayExpensesList = expenses.filter((e) => e.expenseDate === TODAY_STR);
  const todayExpenses = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);

  // Today's damages
  const todayDamagesList = damages.filter((d) => d.damageDate === TODAY_STR);
  const todayDamageCost = todayDamagesList.reduce((acc, d) => acc + d.totalCost, 0);

  // Stock warnings: Active products with stock <= 20
  const stockWarnings = products
    .filter((p) => p.isActive)
    .map((p) => ({
      product: p,
      currentStock: stockMap[p.id] || 0,
    }))
    .filter((item) => item.currentStock <= 20);

  // Estimated Profit
  const estimatedProfit = todayNetSales - todayPurchaseAmount - todayExpenses - todayDamageCost;

  // Completion percentage
  const completionPercent = totalActiveCustomers > 0 ? Math.round((completedCount / totalActiveCustomers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Workspace Greeting & Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <span>Daily Operations Control</span>
            <span>·</span>
            <span>{currentEntity?.name}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Dairy Distribution Executive Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time synchronization across daily route dispatches, stock ledger, billing &amp; collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('route')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>Launch Today’s Route</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (All Required Metrics from Spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Route Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Route Delivery Status</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{completedCount}</span>
            <span className="text-xs text-slate-500">/ {totalActiveCustomers} Completed</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pending: <strong className="text-amber-700">{pendingCount}</strong></span>
            <span>{completionPercent}% Done</span>
          </div>
        </div>

        {/* Today's Net Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today’s Net Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatIndianCurrency(todayNetSales)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Gross: {formatIndianCurrency(todayGrossSales)}</span>
            {todayDiscounts > 0 && (
              <span className="text-rose-600 font-medium">Disc: -₹{todayDiscounts}</span>
            )}
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today’s Collections</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatIndianCurrency(todayTotalCollections)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Cash: {formatIndianCurrency(todayCashCollections)}</span>
            <span>UPI/Online: {formatIndianCurrency(todayOnlineCollections)}</span>
          </div>
        </div>

        {/* Total Customer Outstanding */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Customer Outstanding</span>
            <Wallet className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {formatIndianCurrency(totalCustomerOutstanding)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Across {totalActiveCustomers} active market accounts
          </div>
        </div>

        {/* Today's Purchases */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today’s Purchases</span>
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatIndianCurrency(todayPurchaseAmount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {todayPurchases.length} posted procurement batch(es)
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today’s Expenses</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatIndianCurrency(todayExpenses)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Fuel, Hamali, Driver &amp; Cold room charges
          </div>
        </div>

        {/* Today's Damage Cost */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today’s Damage Cost</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatIndianCurrency(todayDamageCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {todayDamagesList.length} damaged pouch/unit record(s)
          </div>
        </div>

        {/* Estimated Daily Profit */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today’s Est. Gross Margin</span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            className={`text-xl font-bold ${
              estimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatIndianCurrency(estimatedProfit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            (Sales - Purchase - Expenses - Damage)
          </div>
        </div>
      </div>

      {/* Stock Warnings Banner if any low stock exists */}
      {stockWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Current Stock Warnings ({stockWarnings.length} Products Low or Empty)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {stockWarnings.map((item) => (
              <div
                key={item.product.id}
                className="bg-white border border-amber-200 rounded-lg p-2.5 text-xs shadow-2xs"
              >
                <div className="font-semibold text-slate-900 truncate" title={item.product.name}>
                  {item.product.name}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[11px] text-slate-500">{item.product.unit}</span>
                  <span
                    className={`font-bold ${
                      item.currentStock <= 0 ? 'text-rose-600' : 'text-amber-700'
                    }`}
                  >
                    {item.currentStock} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Operational Actions (Direct Shortcuts from Spec) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3.5">
          Quick Operational Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('route')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-blue-100 text-blue-700 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Daily Route</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Start Dispatches</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('purchases')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-purple-100 text-purple-700 rounded-md group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">New Purchase</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Receive Milk Batch</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('collections')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Record Payment</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Cash / UPI Online</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('returns')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-amber-100 text-amber-700 rounded-md group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Customer Return</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Leakage / Reversal</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('damages')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-rose-100 text-rose-700 rounded-md group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Record Damage</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Puncture / Wastage</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-slate-500 hover:bg-slate-50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-slate-100 text-slate-700 rounded-md group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Add Expense</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fuel / Hamali</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-blue-100 text-blue-700 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Add Customer</div>
              <div className="text-[10px] text-slate-500 mt-0.5">New Route Account</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Add Product</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Dairy SKU Master</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('vendors')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-teal-100 text-teal-700 rounded-md group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Add Vendor</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Chilling Center / Coop</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-slate-500 hover:bg-slate-50 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 bg-slate-100 text-slate-700 rounded-md group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">Outstanding Report</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ledger Analysis</div>
            </div>
          </button>
        </div>
      </div>

      {/* Today's Completed Dispatches Table & WhatsApp Sharing */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Today’s Dispatches Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {todayDispatches.length} delivery transaction(s) recorded for today
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('route')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayDispatches.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Navigation className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No dispatches recorded today yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start today’s route to enter customer quantities, compute live bills, and share WhatsApp invoices.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('route')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Start Today's Route
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Net Bill</th>
                  <th className="py-3 px-4 text-right">Payment</th>
                  <th className="py-3 px-4 text-right">Closing Due</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayDispatches.map((d) => {
                  const cust = customers.find((c) => c.id === d.customerId);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {d.billNumber}
                        {d.revisionNumber > 1 && (
                          <span className="ml-1 text-[10px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-sans">
                            Rev #{d.revisionNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cust?.name || 'Customer'}</div>
                        <div className="text-[11px] text-slate-500">{cust?.mobileNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {d.lines.length} items
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatIndianCurrency(d.netAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700">
                        {d.paymentReceived > 0 ? formatIndianCurrency(d.paymentReceived) : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatIndianCurrency(d.closingOutstanding)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(d.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                        >
                          WhatsApp Bill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
