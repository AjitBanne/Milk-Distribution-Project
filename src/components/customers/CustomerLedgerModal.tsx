import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Customer } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { exportToCsv } from '../../services/csvExport';
import { formatIndianCurrency, formatIndianDate } from '../../services/whatsapp';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { getCustomerLedger } = useDairyData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const entries = useMemo(() => {
    if (!customer) return [];
    const all = getCustomerLedger(customer.id);
    return all.filter((entry) => {
      if (fromDate && entry.date < fromDate) return false;
      if (toDate && entry.date > toDate) return false;
      return true;
    });
  }, [customer, getCustomerLedger, fromDate, toDate]);

  if (!isOpen || !customer) return null;

  const totalDebits = entries.reduce((acc, e) => acc + e.debit, 0);
  const totalCredits = entries.reduce((acc, e) => acc + e.credit, 0);
  const finalBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : customer.openingOutstanding;

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Entry Type',
      'Reference Number',
      'Description',
      'Debit (₹)',
      'Credit (₹)',
      'Running Balance (₹)',
    ];

    const rows = entries.map((e) => [
      formatIndianDate(e.date),
      e.entryType,
      e.referenceNumber,
      e.description,
      e.debit > 0 ? e.debit : '',
      e.credit > 0 ? e.credit : '',
      e.runningBalance,
    ]);

    exportToCsv(`Ledger_${customer.name.replace(/\s+/g, '_')}`, headers, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Customer Statement of Account</h3>
                <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                  {customer.name}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Mobile: +91 {customer.mobileNumber} · Current Due: {formatIndianCurrency(customer.currentOutstanding)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Date Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-[11px] text-blue-600 hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export to Excel (CSV)</span>
          </button>
        </div>

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-100/70 border-b border-slate-200 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Debits (Sales)</span>
            <strong className="text-sm text-slate-900">{formatIndianCurrency(totalDebits)}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Credits (Payments/Returns)</span>
            <strong className="text-sm text-emerald-700">{formatIndianCurrency(totalCredits)}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Closing Running Balance</span>
            <strong className="text-sm text-rose-700">{formatIndianCurrency(finalBalance)}</strong>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {entries.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No transactions recorded for this customer yet.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-3">Ref No</th>
                    <th className="py-2.5 px-3">Particulars / Description</th>
                    <th className="py-2.5 px-3 text-right">Debit (+)</th>
                    <th className="py-2.5 px-3 text-right">Credit (-)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        {formatIndianDate(entry.date)}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {entry.entryType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800 font-medium">
                        {entry.referenceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                        {entry.debit > 0 ? formatIndianCurrency(entry.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 font-mono">
                        {entry.credit > 0 ? formatIndianCurrency(entry.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatIndianCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
