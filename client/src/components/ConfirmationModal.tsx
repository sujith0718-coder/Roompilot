import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText = 'Confirm',
  cancelLabel = 'Cancel',
  variant,
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  const handleClose = onCancel || onClose || (() => {});
  const activeLabel = confirmLabel || confirmText;
  const activeVariant = variant || confirmVariant;

  const btnStyle = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white font-bold',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white font-bold',
    info: 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold',
  }[activeVariant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                activeVariant === 'danger'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-sans">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">{message}</p>

        {children}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/80">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-xs font-mono font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 text-xs font-mono font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${btnStyle} disabled:opacity-50 hover:scale-105 active:scale-95`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
            )}
            {activeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
