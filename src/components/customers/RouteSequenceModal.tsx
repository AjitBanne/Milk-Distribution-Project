import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ArrowUpDown, Search, CheckCircle2 } from 'lucide-react';
import { Customer } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';

interface RouteSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export const RouteSequenceModal: React.FC<RouteSequenceModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { customers, updateRouteSequences } = useDairyData();
  const [orderedCustomers, setOrderedCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      const active = customers
        .filter((c) => c.isActive)
        .sort((a, b) => a.routeSequence - b.routeSequence);
      setOrderedCustomers(active);
      setSearchQuery('');
    }
  }, [isOpen, customers]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const list = [...orderedCustomers];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setOrderedCustomers(list);
  };

  const moveDown = (index: number) => {
    if (index >= orderedCustomers.length - 1) return;
    const list = [...orderedCustomers];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setOrderedCustomers(list);
  };

  const handleSave = () => {
    const payload = orderedCustomers.map((c, i) => ({
      id: c.id,
      sequence: i + 1,
    }));
    updateRouteSequences(payload);
    onSuccessToast('Delivery route sequence successfully reordered and updated!');
    onClose();
  };

  const filtered = orderedCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobileNumber.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Manage Delivery Route Sequence</h3>
              <p className="text-xs text-slate-300">
                Arrange the delivery order in which customers appear on Today’s Route
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer while reordering..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {orderedCustomers.length} Customers
          </div>
        </div>

        {/* List of Customers */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {filtered.map((c) => {
            const actualIndex = orderedCustomers.findIndex((item) => item.id === c.id);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 font-bold font-mono flex items-center justify-center shrink-0">
                    {actualIndex + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      +91 {c.mobileNumber} · {c.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    disabled={actualIndex === 0}
                    onClick={() => moveUp(actualIndex)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={actualIndex === orderedCustomers.length - 1}
                    onClick={() => moveDown(actualIndex)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            Does not modify any historical dispatch or billing transactions.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save New Route Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
