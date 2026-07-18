import React from 'react';
import { useToastStore } from '../shared/stores/useToastStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[99999] pointer-events-none">
      {toasts.map((t) => (
        <div 
          key={t.id}
          className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto text-white
            ${t.type === 'success' ? 'bg-brand-600 shadow-[0_4px_20px_rgba(14,165,233,0.3)]' : ''}
            ${t.type === 'error' ? 'bg-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.3)]' : ''}
            ${t.type === 'info' ? 'bg-gray-800' : ''}
          `}
        >
          {t.type === 'success' && <CheckCircle size={18} />}
          {t.type === 'error' && <AlertCircle size={18} />}
          {t.type === 'info' && <Info size={18} />}
          <span className="font-semibold text-sm">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
