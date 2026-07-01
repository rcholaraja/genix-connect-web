'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastContextType { toast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const ICONS = { success: CheckCircle, error: XCircle, info: AlertCircle };
  const COLORS = { success: 'bg-green-50 border-green-200 text-green-800', error: 'bg-red-50 border-red-200 text-red-800', info: 'bg-blue-50 border-blue-200 text-blue-800' };
  const ICON_COLORS = { success: 'text-green-500', error: 'text-red-500', info: 'text-blue-500' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 min-w-80 max-w-md items-center">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right-4 ${COLORS[t.type]}`}>
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${ICON_COLORS[t.type]}`} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} className="shrink-0 opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
