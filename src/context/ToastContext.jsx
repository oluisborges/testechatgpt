import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const CONFIG = {
  success: {
    Icon: CheckCircle2,
    cls: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
    iconCls: 'text-emerald-500',
  },
  error: {
    Icon: XCircle,
    cls: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200',
    iconCls: 'text-red-500',
  },
  warning: {
    Icon: AlertTriangle,
    cls: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200',
    iconCls: 'text-amber-500',
  },
};

function ToastItem({ toast, onClose }) {
  const { Icon, cls, iconCls } = CONFIG[toast.type] || CONFIG.error;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg w-80
                     animate-[fadeIn_0.2s_ease-out] ${cls}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onClose={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
