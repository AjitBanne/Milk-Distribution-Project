import React from 'react';
import {
  LayoutDashboard,
  Navigation,
  Users,
  Package,
  IndianRupee,
  Truck,
  ShoppingCart,
  Boxes,
  Receipt,
  BookOpen,
  RotateCcw,
  Wallet,
  AlertOctagon,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  X,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDairyData } from '../../context/DairyDataContext';
import { TODAY_STR } from '../../services/seedData';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { currentUser, currentEntity, logout, isOwner, canEditMasters } = useAuth();
  const { customers, dispatches } = useDairyData();

  // Pending customers count for Today's Route
  const activeCustomers = customers.filter((c) => c.isActive);
  const completedCustomerIds = new Set(
    dispatches.filter((d) => d.dispatchDate === TODAY_STR && d.status !== 'CANCELLED').map((d) => d.customerId)
  );
  const pendingCount = activeCustomers.filter((c) => !completedCustomerIds.has(c.id)).length;

  const navItems = [
    {
      group: 'Daily Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'route', label: "Today's Route", icon: Navigation, badge: pendingCount > 0 ? pendingCount : undefined },
        { id: 'collections', label: 'Collections', icon: Receipt },
        { id: 'returns', label: 'Customer Returns', icon: RotateCcw },
      ],
    },
    {
      group: 'Inventory & Purchase',
      items: [
        { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
        { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
        { id: 'damages', label: 'Damages', icon: AlertOctagon },
      ],
    },
    {
      group: 'Master Records',
      items: [
        { id: 'customers', label: 'Customers & Routes', icon: Users },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'rates', label: 'Customer Rates', icon: IndianRupee },
        { id: 'vendors', label: 'Vendors & Rates', icon: Truck },
      ],
    },
    {
      group: 'Accounts & Reports',
      items: [
        { id: 'ledgers', label: 'Customer Ledgers', icon: BookOpen },
        { id: 'expenses', label: 'Expenses', icon: Wallet },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'Administration',
      items: [
        ...(isOwner ? [{ id: 'users', label: 'User Management', icon: UserCheck }] : []),
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            🥛
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate leading-tight">
              {currentEntity?.name || 'DairyFlow ERP'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                {currentEntity?.code} · {currentUser?.role}
              </span>
            </div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-xs">
        {navItems.map((group) => (
          <div key={group.group}>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.group}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer with Quick Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs uppercase">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {currentUser?.name}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {currentUser?.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
