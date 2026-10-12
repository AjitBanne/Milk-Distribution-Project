import React, { useState, useMemo, useEffect } from 'react';
import {
  Navigation,
  CheckCircle2,
  Clock,
  Search,
  Truck,
  MessageSquare,
  Edit3,
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  Calendar,
  AlertCircle,
  Phone,
  Send,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Customer, Dispatch } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';
import { DispatchEntryModal } from '../dispatch/DispatchEntryModal';
import { DispatchReviseModal } from '../dispatch/DispatchReviseModal';
import { CustomerReturnModal } from '../returns/CustomerReturnModal';
import { CustomerLedgerModal } from '../customers/CustomerLedgerModal';
import { WhatsAppModal } from '../common/WhatsAppModal';
import { RouteExportModal } from './RouteExportModal';

interface TodayRouteViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onOpenRouteReorder: () => void;
}

export const TodayRouteView: React.FC<TodayRouteViewProps> = ({
  onSuccessToast,
  onErrorToast,
  onOpenRouteReorder,
}) => {
  const { currentEntity } = useAuth();
  const { customers, dispatches, products, collections } = useDairyData();

  // Selected date defaults to TODAY_STR
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  // Route Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // High performance pagination for 200+ customers
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Modals state
  const [selectedCustomerIdForDispatch, setSelectedCustomerIdForDispatch] = useState<string | null>(null);
  const [selectedDispatchForRevision, setSelectedDispatchForRevision] = useState<Dispatch | null>(null);
  const [selectedDispatchForReturn, setSelectedDispatchForReturn] = useState<Dispatch | null>(null);
  const [selectedCustomerForReturn, setSelectedCustomerForReturn] = useState<Customer | null>(null);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [whatsAppData, setWhatsAppData] = useState<{ dispatch: Dispatch; customer: Customer } | null>(null);

  // Reset page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, pageSize]);

  // Active customers sorted by routeSequence
  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive).sort((a, b) => a.routeSequence - b.routeSequence),
    [customers]
  );

  // Dispatches for selected date
  const dateDispatches = useMemo(
    () => dispatches.filter((d) => d.dispatchDate === selectedDate && d.status !== 'CANCELLED'),
    [dispatches, selectedDate]
  );

  const completedMap = useMemo(() => {
    const map = new Map<string, Dispatch>();
    dateDispatches.forEach((d) => {
      map.set(d.customerId, d);
    });
    return map;
  }, [dateDispatches]);

  // Separate Pending and Completed
  const pendingCustomers = useMemo(
    () => activeCustomers.filter((c) => !completedMap.has(c.id)),
    [activeCustomers, completedMap]
  );

  const completedList = useMemo(() => {
    return activeCustomers
      .filter((c) => completedMap.has(c.id))
      .map((c) => ({
        customer: c,
        dispatch: completedMap.get(c.id)!,
      }));
  }, [activeCustomers, completedMap]);

  // Filter by search query
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingCustomers;
    const q = searchQuery.toLowerCase();
    return pendingCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobileNumber.includes(q) ||
        String(c.routeSequence).includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [pendingCustomers, searchQuery]);

  const filteredCompleted = useMemo(() => {
    if (!searchQuery.trim()) return completedList;
    const q = searchQuery.toLowerCase();
    return completedList.filter(
      (item) =>
        item.customer.name.toLowerCase().includes(q) ||
        item.customer.mobileNumber.includes(q) ||
        String(item.customer.routeSequence).includes(q) ||
        item.dispatch.billNumber.toLowerCase().includes(q)
    );
  }, [completedList, searchQuery]);

  // Paginated chunks for snappy 60fps rendering with 200+ customers
  const paginatedPending = useMemo(() => {
    if (pageSize >= 500) return filteredPending;
    const start = (currentPage - 1) * pageSize;
    return filteredPending.slice(start, start + pageSize);
  }, [filteredPending, currentPage, pageSize]);

  const totalPendingPages = Math.max(1, Math.ceil(filteredPending.length / pageSize));

  const paginatedCompleted = useMemo(() => {
    if (pageSize >= 500) return filteredCompleted;
    const start = (currentPage - 1) * pageSize;
    return filteredCompleted.slice(start, start + pageSize);
  }, [filteredCompleted, currentPage, pageSize]);

  const totalCompletedPages = Math.max(1, Math.ceil(filteredCompleted.length / pageSize));

  const handleDispatchSuccess = (dispatchId: string, customer: Customer, advanceToNext?: boolean) => {
    onSuccessToast(`Daily dispatch successfully saved for ${customer.name}!`);

    // Find dispatch to offer WhatsApp sharing
    const saved = dispatches.find((d) => d.id === dispatchId) || {
      id: dispatchId,
      entityId: currentEntity?.id || 'morya',
      billNumber: `INV-${dispatchId}`,
      customerId: customer.id,
      dispatchDate: selectedDate,
      lines: [],
      grossAmount: 0,
      discount: 0,
      netAmount: 0,
      paymentReceived: 0,
      previousOutstanding: customer.currentOutstanding,
      closingOutstanding: customer.currentOutstanding,
      status: 'POSTED',
      revisionNumber: 1,
      createdBy: 'Operator',
      createdAt: new Date().toISOString(),
    };

    if (advanceToNext) {
      // Find next pending customer in sequence
      const remaining = pendingCustomers.filter((c) => c.id !== customer.id);
      if (remaining.length > 0) {
        setSelectedCustomerIdForDispatch(remaining[0].id);
        return;
      }
    }

    setSelectedCustomerIdForDispatch(null);
    setWhatsAppData({ dispatch: saved as Dispatch, customer });
  };

  return (
    <div className="space-y-5">
      {/* Workspace Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Today’s Distribution Route Workspace
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sequential delivery stops · Active customer queue &amp; completed dispatch ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Business Date selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={onOpenRouteReorder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Manage Route Sequence</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Route Sheet</span>
          </button>
        </div>
      </div>

      {/* Route Filter & Metric Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Tab Filter (Functional Button Controls compliant with Design Guidelines) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Delivery</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pendingCustomers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed Today</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {completedList.length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* PENDING SECTION */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {/* Quick "Next Delivery Stop" Action Banner for Fast Operations */}
          {filteredPending.length > 0 && !searchQuery.trim() && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-blue-800">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-blue-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
                  #{filteredPending[0].routeSequence}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-800/80 px-2 py-0.5 rounded text-blue-200">
                      Next Stop on Route
                    </span>
                    <h3 className="font-bold text-sm text-white">{filteredPending[0].name}</h3>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5 line-clamp-1">
                    {filteredPending[0].address} · Outstanding: {formatIndianCurrency(filteredPending[0].currentOutstanding)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerIdForDispatch(filteredPending[0].id)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
              >
                <Truck className="w-4 h-4" />
                <span>Deliver Now (Stop #{filteredPending[0].routeSequence})</span>
              </button>
            </div>
          )}

          {/* Pagination & Count Header for 200+ customers */}
          {filteredPending.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
              <div>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> – <strong>{Math.min(currentPage * pageSize, filteredPending.length)}</strong> of <strong>{filteredPending.length}</strong> pending customers
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

                {totalPendingPages > 1 && (
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
                      {currentPage} / {totalPendingPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPendingPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPendingPages, p + 1))}
                      className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {filteredPending.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {pendingCustomers.length === 0
                  ? 'All Route Deliveries Completed!'
                  : 'No matching pending customers found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {pendingCustomers.length === 0
                  ? 'Every scheduled customer on today’s active route has received their daily dispatch.'
                  : 'Try adjusting your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedPending.map((cust) => (
                <div
                  key={cust.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Sequence and Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                          {cust.routeSequence}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">
                            {cust.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>
                              {cust.mobileNumber ? `+91 ${cust.mobileNumber}` : <span className="text-slate-400 italic">No mobile</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-1">
                      {cust.address}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Current Outstanding:</span>
                      <span
                        className={`font-bold font-mono ${
                          cust.currentOutstanding > 0 ? 'text-rose-700' : 'text-slate-700'
                        }`}
                      >
                        {formatIndianCurrency(cust.currentOutstanding)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForLedger(cust)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="View Customer Running Ledger"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCustomerIdForDispatch(cust.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Deliver / Dispatch</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED SECTION */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {/* Pagination & Count Header for Completed */}
          {filteredCompleted.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
              <div>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> – <strong>{Math.min(currentPage * pageSize, filteredCompleted.length)}</strong> of <strong>{filteredCompleted.length}</strong> dispatches
              </div>
              {totalCompletedPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="text-[11px] font-medium px-1">
                    {currentPage} / {totalCompletedPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalCompletedPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalCompletedPages, p + 1))}
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {filteredCompleted.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                No dispatches completed for this date yet
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Customers will appear here automatically as soon as their daily dispatch is recorded.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                    <tr>
                      <th className="py-3 px-3 text-center">Seq</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Bill Number</th>
                      <th className="py-3 px-3 text-right">Today’s Bill</th>
                      <th className="py-3 px-3 text-right">Payment</th>
                      <th className="py-3 px-3 text-right">Closing Due</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCompleted.map(({ customer, dispatch }) => (
                      <tr key={dispatch.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center font-bold font-mono text-slate-700">
                          {customer.routeSequence}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{customer.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {customer.mobileNumber ? `+91 ${customer.mobileNumber}` : <span className="text-slate-400 italic">No mobile</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-800 font-medium">
                          {dispatch.billNumber}
                          {dispatch.revisionNumber > 1 && (
                            <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-sans font-bold">
                              Rev #{dispatch.revisionNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatIndianCurrency(dispatch.netAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700 font-mono">
                          {dispatch.paymentReceived > 0 ? (
                            <div>
                              <div>{formatIndianCurrency(dispatch.paymentReceived)}</div>
                              {dispatch.paymentMode === 'SPLIT' && (
                                <div className="text-[10px] text-indigo-700 font-sans font-medium">
                                  ₹{dispatch.cashAmount || 0}c + ₹{dispatch.onlineAmount || 0}u
                                </div>
                              )}
                              {dispatch.paymentMode === 'ONLINE' && (
                                <div className="text-[10px] text-blue-700 font-sans font-medium">
                                  UPI {dispatch.referenceNumber ? `#${dispatch.referenceNumber}` : ''}
                                </div>
                              )}
                              {dispatch.paymentMode === 'CASH' && (
                                <div className="text-[10px] text-emerald-700 font-sans font-medium">
                                  Cash
                                </div>
                              )}
                            </div>
                          ) : (
                            '₹0'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-700 font-mono">
                          {formatIndianCurrency(dispatch.closingOutstanding)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* WhatsApp Share */}
                            <button
                              type="button"
                              onClick={() => setWhatsAppData({ dispatch, customer })}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                              title="Share WhatsApp Bill"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Edit Revision */}
                            <button
                              type="button"
                              onClick={() => setSelectedDispatchForRevision(dispatch)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                              title="Revise Entry"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span className="hidden sm:inline">Revise</span>
                            </button>

                            {/* Return */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDispatchForReturn(dispatch);
                                setSelectedCustomerForReturn(customer);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                              title="Return Product"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="hidden sm:inline">Return</span>
                            </button>

                            {/* Ledger */}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForLedger(customer)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                              title="View Customer Ledger"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DISPATCH ENTRY MODAL */}
      {selectedCustomerIdForDispatch && (
        <DispatchEntryModal
          isOpen={true}
          onClose={() => setSelectedCustomerIdForDispatch(null)}
          customerId={selectedCustomerIdForDispatch}
          onSuccess={handleDispatchSuccess}
          onErrorToast={onErrorToast}
          hasNextCustomer={pendingCustomers.length > 1}
        />
      )}

      {/* DISPATCH REVISION MODAL */}
      {selectedDispatchForRevision && (
        <DispatchReviseModal
          isOpen={true}
          onClose={() => setSelectedDispatchForRevision(null)}
          dispatch={selectedDispatchForRevision}
          customer={customers.find((c) => c.id === selectedDispatchForRevision.customerId) || null}
          onSuccess={(revised) => {
            onSuccessToast(`Dispatch #${revised.billNumber} revised successfully!`);
            const c = customers.find((x) => x.id === revised.customerId);
            if (c) {
              setWhatsAppData({ dispatch: revised, customer: c });
            }
          }}
          onErrorToast={onErrorToast}
        />
      )}

      {/* CUSTOMER RETURN MODAL */}
      {selectedDispatchForReturn && selectedCustomerForReturn && (
        <CustomerReturnModal
          isOpen={true}
          onClose={() => {
            setSelectedDispatchForReturn(null);
            setSelectedCustomerForReturn(null);
          }}
          dispatch={selectedDispatchForReturn}
          customer={selectedCustomerForReturn}
          onSuccess={(retNo) => {
            onSuccessToast(`Customer Return #${retNo} posted successfully! Inventory and balance reconciled.`);
          }}
          onErrorToast={onErrorToast}
        />
      )}

      {/* CUSTOMER LEDGER MODAL */}
      {selectedCustomerForLedger && (
        <CustomerLedgerModal
          isOpen={true}
          onClose={() => setSelectedCustomerForLedger(null)}
          customer={selectedCustomerForLedger}
        />
      )}

      {/* WHATSAPP SHARE MODAL */}
      {whatsAppData && currentEntity && (
        <WhatsAppModal
          isOpen={true}
          onClose={() => setWhatsAppData(null)}
          entity={currentEntity}
          customer={whatsAppData.customer}
          dispatch={whatsAppData.dispatch}
          yesterdayDispatch={
            dispatches
              .filter(
                (d) =>
                  d.customerId === whatsAppData.customer.id &&
                  d.status !== 'CANCELLED' &&
                  d.id !== whatsAppData.dispatch.id
              )
              .sort((a, b) => (b.dispatchDate > a.dispatchDate ? 1 : -1))[0]
          }
          products={products}
          isRevised={whatsAppData.dispatch.revisionNumber > 1}
          onSuccessToast={onSuccessToast}
        />
      )}

      {/* ROUTE EXPORT MODAL */}
      {isExportModalOpen && (
        <RouteExportModal
          isOpen={true}
          onClose={() => setIsExportModalOpen(false)}
          selectedDate={selectedDate}
          customers={activeCustomers}
          completedMap={completedMap}
          products={products}
          collections={collections}
          onSuccessToast={onSuccessToast}
        />
      )}
    </div>
  );
};
