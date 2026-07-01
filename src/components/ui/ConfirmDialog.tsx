'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${destructive ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`w-6 h-6 ${destructive ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-gray-500 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-opacity ${destructive ? 'bg-red-500 hover:bg-red-600' : ''}`} style={!destructive ? { background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' } : undefined}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
