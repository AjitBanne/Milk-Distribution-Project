import React, { useState } from 'react';
import {
  Menu,
  Bell,
  LogOut,
  Calendar,
  AlertTriangle,
  Send,
  Building2,
  ChevronDown,
  Cloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDairyData } from '../../context/DairyDataContext';
import { TODAY_STR } from '../../services/seedData';
import { formatIndianDate } from '../../services/whatsapp';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onNavigate }) => {
  const { currentUser, currentEntity, logout } = useAuth();
  const { stockMap, products, dispatches, customers, isCloudSyncing, syncNow } = useDairyData();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Calculate low stock items count (< 20 units)
  const lowStockCount = products.filter((p) => {
    if (!p.isActive) return false;
    const stock = stockMap[p.id] || 0;
    return stock <= 20;
  }).length;

  // Calculate pending customers count for today
  const activeCustomers = customers.filter((c) => c.isActive);
  const completedCustomerIds = new Set(
    dispatches.filter((d) => d.dispatchDate === TODAY_STR && d.status !== 'CANCELLED').map((d) => d.customerId)
  );
  const pendingCount = activeCustomers.filter((c) => !completedCustomerIds.has(c.id)).length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
      {/* Left: Mobile hamburger & Entity Branding */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200/60">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {currentEntity?.name || 'Dairy Enterprise'}
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                {currentEntity?.code}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block leading-none mt-0.5">
              {currentEntity?.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Date, Quick Route CTA, Low-stock Warning, User dropdown */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatIndianDate(TODAY_STR)}</span>
        </div>

        {/* Quick Route Action Button */}
        <button
          type="button"
          onClick={() => onNavigate('route')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Today’s Route</span>
          {pendingCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Stock warning pill if low stock exists */}
        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer"
            title={`${lowStockCount} products are low on stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden lg:inline">{lowStockCount} Low Stock</span>
          </button>
        )}

        {/* Live Cloud Database Sync status & force sync button */}
        <button
          type="button"
          onClick={() => syncNow()}
          disabled={isCloudSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          title="Multi-device Cloud Sync: Live connected across all your phones and devices. Tap to force sync now."
        >
          <Cloud className={`w-3.5 h-3.5 text-emerald-600 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline font-semibold text-[11px]">
            {isCloudSyncing ? 'Syncing...' : 'Cloud Synced'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        {/* Profile menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 text-left rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="font-medium text-blue-600">{currentUser?.role}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2 divide-y divide-slate-100 animate-in fade-in">
                <div className="px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-900">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                      Role: {currentUser?.role}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {currentEntity?.name}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span>Entity Profile &amp; Settings</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
