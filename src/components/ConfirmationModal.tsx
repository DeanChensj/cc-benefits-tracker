import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
  type?: 'warning' | 'danger' | 'info';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  theme,
  type = 'warning'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-sm rounded-2xl border p-6 text-center space-y-4 shadow-2xl animate-scale-up ${
        themeClass(
          'bg-slate-900 border-slate-850 text-slate-200 shadow-slate-950/50',
          'bg-white border-slate-200 text-slate-800 shadow-slate-200/30'
        )
      }`}>
        {/* Header Icon depending on type */}
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center animate-pulse ${
          type === 'danger'
            ? 'bg-rose-500/10 text-rose-500'
            : type === 'warning'
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-blue-500/10 text-blue-500'
        }`}>
          {type === 'danger' ? (
            <Trash2 className="w-6 h-6" />
          ) : type === 'warning' ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className={`text-sm font-black ${themeClass('text-white', 'text-slate-900')}`}>{title}</h3>
          <p className="text-[11px] text-slate-505 leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className={`flex-1 font-bold text-xs py-2.5 rounded-xl border transition cursor-pointer ${
              themeClass(
                'bg-slate-800 hover:bg-slate-750 border-slate-750 text-slate-300',
                'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              )
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-white font-bold text-xs py-2.5 rounded-xl transition active:scale-95 shadow-lg cursor-pointer ${
              type === 'danger'
                ? 'bg-gradient-to-tr from-rose-600 to-red-600 hover:from-rose-550 hover:to-red-550 shadow-rose-500/10'
                : type === 'warning'
                ? 'bg-gradient-to-tr from-amber-500 to-orange-550 hover:from-amber-450 hover:to-orange-500 shadow-amber-500/10'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-550 shadow-blue-500/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
