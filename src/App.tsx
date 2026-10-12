import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DairyDataProvider, useDairyData } from './context/DairyDataContext';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import { TodayRouteView } from './components/route/TodayRouteView';
import { CustomerMasterView } from './components/customers/CustomerMasterView';
import { ProductMasterView } from './components/products/ProductMasterView';
import { CustomerRatesView } from './components/rates/CustomerRatesView';
import { VendorMasterView } from './components/vendors/VendorMasterView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { InventoryView } from './components/inventory/InventoryView';
import { CollectionsView } from './components/collections/CollectionsView';
import { CustomerReturnsView } from './components/returns/CustomerReturnsView';
import { DamagesView } from './components/damages/DamagesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { UserManagementView } from './components/users/UserManagementView';
import { SettingsView } from './components/settings/SettingsView';
import { DispatchEntryModal } from './components/dispatch/DispatchEntryModal';
import { WhatsAppModal } from './components/common/WhatsAppModal';
import { RouteSequenceModal } from './components/customers/RouteSequenceModal';
import { Customer, Dispatch } from './types/dairy';
import { Truck } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, currentEntity, isLoading } = useAuth();
  const { customers, products, dispatches } = useDairyData();

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Quick modals accessible from dashboard / shortcuts
  const [quickDispatchCustomerId, setQuickDispatchCustomerId] = useState<string | null>(null);
  const [whatsAppData, setWhatsAppData] = useState<{ dispatch: Dispatch; customer: Customer } | null>(null);
  const [isRouteSequenceModalOpen, setIsRouteSequenceModalOpen] = useState(false);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-4 animate-bounce">
          <Truck className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-white tracking-wide">
          Loading DairyFlow Workspace...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const handleOpenWhatsAppFromId = (dispatchId: string) => {
    const disp = dispatches.find((d) => d.id === dispatchId);
    if (!disp) return;
    const cust = customers.find((c) => c.id === disp.customerId);
    if (!cust) return;
    setWhatsAppData({ dispatch: disp, customer: cust });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <div className="flex flex-1 min-h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header */}
          <Header
            onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
            onNavigate={setCurrentView}
          />

          {/* Page Content */}
          <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentView}
                onOpenDispatch={(cId) => setQuickDispatchCustomerId(cId)}
                onOpenWhatsApp={handleOpenWhatsAppFromId}
              />
            )}

            {currentView === 'route' && (
              <TodayRouteView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
                onOpenRouteReorder={() => setIsRouteSequenceModalOpen(true)}
              />
            )}

            {currentView === 'customers' && (
              <CustomerMasterView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'products' && (
              <ProductMasterView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'rates' && (
              <CustomerRatesView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'vendors' && (
              <VendorMasterView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'purchases' && (
              <PurchasesView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'inventory' && (
              <InventoryView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'collections' && (
              <CollectionsView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'returns' && (
              <CustomerReturnsView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'damages' && (
              <DamagesView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'expenses' && (
              <ExpensesView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'reports' && <ReportsView />}

            {currentView === 'users' && (
              <UserManagementView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}

            {currentView === 'ledgers' && (
              <CustomerMasterView
                onSuccessToast={(msg) => addToast('success', msg)}
                onErrorToast={(msg) => addToast('error', msg)}
              />
            )}
          </main>
        </div>
      </div>

      {/* Quick Dispatch Modal from Dashboard */}
      {quickDispatchCustomerId && (
        <DispatchEntryModal
          isOpen={true}
          customerId={quickDispatchCustomerId}
          onClose={() => setQuickDispatchCustomerId(null)}
          onSuccess={(dispatchId, customer) => {
            addToast('success', `Dispatch posted for ${customer.name}!`);
            const d = dispatches.find((x) => x.id === dispatchId) || {
              id: dispatchId,
              entityId: currentEntity?.id || 'yash',
              billNumber: `INV-${dispatchId}`,
              customerId: customer.id,
              dispatchDate: new Date().toISOString().substring(0, 10),
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
            setWhatsAppData({ dispatch: d as Dispatch, customer });
          }}
          onErrorToast={(msg) => addToast('error', msg)}
        />
      )}

      {/* WhatsApp Modal */}
      {whatsAppData && currentEntity && (
        <WhatsAppModal
          isOpen={true}
          onClose={() => setWhatsAppData(null)}
          entity={currentEntity}
          customer={whatsAppData.customer}
          dispatch={whatsAppData.dispatch}
          products={products}
          isRevised={whatsAppData.dispatch.revisionNumber > 1}
          onSuccessToast={(msg) => addToast('success', msg)}
        />
      )}

      {/* Route Sequence Modal */}
      {isRouteSequenceModalOpen && (
        <RouteSequenceModal
          isOpen={true}
          onClose={() => setIsRouteSequenceModalOpen(false)}
          onSuccessToast={(msg) => addToast('success', msg)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DairyDataProvider>
        <MainApp />
      </DairyDataProvider>
    </AuthProvider>
  );
}
