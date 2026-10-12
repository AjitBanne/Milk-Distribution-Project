import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Phone,
  MapPin,
  Trash2,
  Layers,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDairyData } from '../../context/DairyDataContext';
import {
  getEntities,
  saveEntity,
  resetToSeedData,
  clearAllTransactionData,
} from '../../services/storage';
import { BusinessEntity } from '../../types/dairy';

interface SettingsViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { currentEntity, currentUser, isOwner, updateCurrentEntity, switchEntity } = useAuth();
  const { refreshData, isCloudSyncing, syncNow } = useDairyData();
  const allEntities = getEntities();

  // Edit Entity Form State
  const [isEditingEntity, setIsEditingEntity] = useState(false);
  const [entityForm, setEntityForm] = useState<Partial<BusinessEntity>>({
    name: '',
    tagline: '',
    code: '',
    phone: '',
    address: '',
    fssaiNumber: '',
  });

  // Data management modal states
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (currentEntity) {
      setEntityForm({
        name: currentEntity.name,
        tagline: currentEntity.tagline,
        code: currentEntity.code,
        phone: currentEntity.phone,
        address: currentEntity.address,
        fssaiNumber: currentEntity.fssaiNumber || '',
      });
    }
  }, [currentEntity]);

  const handleSaveEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity) return;

    if (!entityForm.name?.trim()) {
      onErrorToast('Entity business name cannot be empty.');
      return;
    }
    if (!entityForm.phone?.trim()) {
      onErrorToast('Contact / WhatsApp phone number is required.');
      return;
    }
    if (!entityForm.address?.trim()) {
      onErrorToast('Facility / Head office address is required.');
      return;
    }

    const updatedEntity: BusinessEntity = {
      ...currentEntity,
      name: entityForm.name.trim(),
      tagline: entityForm.tagline?.trim() || '',
      code: (entityForm.code?.trim() || 'DF').toUpperCase(),
      phone: entityForm.phone.trim(),
      address: entityForm.address.trim(),
      fssaiNumber: entityForm.fssaiNumber?.trim() || '',
    };

    updateCurrentEntity(updatedEntity);
    setIsEditingEntity(false);
    onSuccessToast('Entity details updated successfully! Name, contact, and address updated.');
  };

  const handleClearAllData = () => {
    clearAllTransactionData();
    refreshData();
    setShowClearDataConfirm(false);
    onSuccessToast('All customer accounts and transaction data deleted successfully. Clean slate active.');
  };

  const handleResetToClean = () => {
    resetToSeedData();
    window.location.reload();
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Entity Configuration &amp; System Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize entity details, manage business address and contacts, and manage data
            </p>
          </div>
        </div>
      </div>

      {/* Entity Profile & Editable Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-xs shrink-0">
              {currentEntity?.code || 'DF'}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{currentEntity?.name}</h3>
              <p className="text-xs text-slate-500">{currentEntity?.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingEntity ? (
              <button
                type="button"
                onClick={() => setIsEditingEntity(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Entity Details</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingEntity(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>
        </div>

        {/* Read View */}
        {!isEditingEntity ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Head Office / Facility Address:
              </span>
              <p className="font-semibold text-slate-900 mt-1 leading-relaxed">
                {currentEntity?.address}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Commercial Helpline / WhatsApp:
              </span>
              <p className="font-semibold text-slate-900 mt-1">
                {currentEntity?.phone}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium">Business / Invoice Code:</span>
              <p className="font-semibold font-mono text-slate-900 mt-1">
                {currentEntity?.code}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium">FSSAI / Registration License #:</span>
              <p className="font-semibold font-mono text-slate-900 mt-1">
                {currentEntity?.fssaiNumber || 'N/A'}
              </p>
            </div>
          </div>
        ) : (
          /* Editable Form */
          <form onSubmit={handleSaveEntity} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Entity / Business Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={entityForm.name || ''}
                  onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                  placeholder="e.g. Morya Enterprises"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tagline / Business Subtitle
                </label>
                <input
                  type="text"
                  value={entityForm.tagline || ''}
                  onChange={(e) => setEntityForm({ ...entityForm, tagline: e.target.value })}
                  placeholder="e.g. Wholesale Dairy Logistics & Distribution"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Helpline / WhatsApp Contact <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={entityForm.phone || ''}
                  onChange={(e) => setEntityForm({ ...entityForm, phone: e.target.value })}
                  placeholder="+91 98901 67890"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Business / Invoice Prefix Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={entityForm.code || ''}
                  onChange={(e) => setEntityForm({ ...entityForm, code: e.target.value.toUpperCase() })}
                  placeholder="ME"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Head Office / Facility Address <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={entityForm.address || ''}
                  onChange={(e) => setEntityForm({ ...entityForm, address: e.target.value })}
                  placeholder="Plot No. 14, MIDC Industrial Area, Kolhapur..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  FSSAI License / GST Registration Number
                </label>
                <input
                  type="text"
                  value={entityForm.fssaiNumber || ''}
                  onChange={(e) => setEntityForm({ ...entityForm, fssaiNumber: e.target.value })}
                  placeholder="11521019000341"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingEntity(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Entity Details</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Multi-Entity Workspace Selector */}
      {allEntities.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">Switch Business Entity Workspace</h3>
          </div>
          <p className="text-xs text-slate-500">
            Switch between entities to manage different dairy distribution branches independently.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {allEntities.map((ent) => {
              const isActive = ent.id === currentEntity?.id;
              return (
                <div
                  key={ent.id}
                  onClick={() => {
                    if (!isActive) {
                      switchEntity(ent.id);
                      onSuccessToast(`Switched workspace to ${ent.name}`);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ent.code}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{ent.name}</h4>
                      <p className="text-[11px] text-slate-500">{ent.phone}</p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-md">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Device Cloud Sync Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Multi-Device Cloud Database Sync</h3>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active &amp; Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All phones, tablets, and computers automatically stay in sync in real time.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-3 rounded-lg leading-relaxed">
          When you add customers, post daily route dispatches, receive cash/UPI payments, or enter purchases on one phone, the changes instantly reflect on all your other devices via Firestore Cloud Sync.
        </p>

        <div className="pt-1 flex items-center gap-3">
          <button
            type="button"
            disabled={isCloudSyncing}
            onClick={async () => {
              try {
                await syncNow();
                onSuccessToast('Cloud Sync completed! All records uploaded & synchronized across devices.');
              } catch {
                onErrorToast('Cloud Sync encountered an issue. Please verify network connectivity.');
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{isCloudSyncing ? 'Synchronizing with Cloud...' : 'Sync All Devices Now'}</span>
          </button>
        </div>
      </div>

      {/* Database & Data Maintenance */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Data Management &amp; Database Clean Up</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Delete existing customer accounts and transactional records, or reset the app completely to start fresh.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {!showClearDataConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearDataConfirm(true)}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Customer &amp; Transaction Data</span>
              </button>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs text-rose-900 w-full animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Confirm Delete All Customer &amp; Transaction Records?</span>
                </div>
                <p className="text-slate-700 text-xs">
                  This will delete all customer profiles, route dispatches, purchases, ledgers, collections, and expenses. Your business entity details (name, address, contacts) and product catalog will be kept.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearDataConfirm(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllData}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                  >
                    Yes, Delete All Data
                  </button>
                </div>
              </div>
            )}

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset System to Clean State</span>
              </button>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 w-full animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Reset Entire Application?</span>
                </div>
                <p className="text-slate-700 text-xs">
                  This will clear browser cache and re-initialize the clean state with user <strong>AjitBanne</strong>.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToClean}
                    className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                  >
                    Confirm Reset &amp; Reload
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
