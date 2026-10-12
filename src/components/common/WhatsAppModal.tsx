import React, { useState } from 'react';
import { Copy, MessageSquare, Check, X, Share2 } from 'lucide-react';
import { BusinessEntity, Customer, Dispatch, Product } from '../../types/dairy';
import { generateWhatsAppBillText, getWhatsAppShareUrl } from '../../services/whatsapp';
import { logWhatsAppShare } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: BusinessEntity;
  customer: Customer;
  dispatch: Dispatch;
  products: Product[];
  yesterdayDispatch?: Dispatch;
  isRevised?: boolean;
  onSuccessToast?: (msg: string) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  entity,
  customer,
  dispatch,
  products,
  yesterdayDispatch,
  isRevised,
  onSuccessToast,
}) => {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [targetMobile, setTargetMobile] = useState(customer.mobileNumber || '');

  if (!isOpen) return null;

  const billMessage = generateWhatsAppBillText({
    entity,
    customer,
    dispatch,
    products,
    yesterdayDispatch,
    isRevised,
    mode: 'detailed',
  });

  const whatsappUrl = getWhatsAppShareUrl(targetMobile, billMessage);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(billMessage);
      setCopied(true);
      if (onSuccessToast) onSuccessToast('Receipt message copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleShareClick = () => {
    logWhatsAppShare({
      entityId: entity.id,
      billNumber: dispatch.billNumber,
      customerId: customer.id,
      customerMobile: targetMobile || customer.mobileNumber || '',
      sharedAt: new Date().toISOString(),
      sharedBy: currentUser?.name || 'Operator',
    });

    if (onSuccessToast) onSuccessToast(`Opening WhatsApp for ${customer.name}...`);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                Share WhatsApp Delivery Bill
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {customer.name} {targetMobile ? `(+91 ${targetMobile})` : '(No saved mobile)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50">
          {/* Target mobile phone input */}
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">Target WhatsApp Number:</span>
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-xs">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                placeholder="Enter 10-digit mobile"
                value={targetMobile}
                onChange={(e) => setTargetMobile(e.target.value.replace(/[^0-9]/g, ''))}
                className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs max-h-64 overflow-y-auto select-all">
            {billMessage}
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-lg p-2.5">
            {targetMobile ? (
              <>
                Will open WhatsApp targeted to <strong className="text-slate-800">+91 {targetMobile}</strong>.
              </>
            ) : (
              <>
                No number specified. Clicking send will open WhatsApp and allow selecting any contact.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShareClick}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
