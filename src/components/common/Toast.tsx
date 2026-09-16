import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type = 'success', onClose }) => {
  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
  };

  const borderMap = {
    success: 'border-emerald-500/30 bg-[#0c1e1c]',
    error: 'border-rose-500/30 bg-[#240f17]',
    info: 'border-sky-500/30 bg-[#0d1d2d]',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-sm text-slate-100 animate-in slide-in-from-bottom-5 duration-200 ${borderMap[type]}`}
    >
      {iconMap[type]}
      <span className="flex-1 font-medium">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
