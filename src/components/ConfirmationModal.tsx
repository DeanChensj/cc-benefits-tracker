import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { ZenModal } from './ZenModal';

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
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  const getIcon = () => {
    if (type === 'danger') return <Trash2 className="w-5 h-5" />;
    if (type === 'warning') return <AlertTriangle className="w-5 h-5" />;
    return <HelpCircle className="w-5 h-5" />;
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onCancel}
      theme={theme}
      title={title}
      description={message}
      icon={getIcon()}
      maxWidthClass="max-w-sm"
    >
        <div className="pt-2">
          <div className="flex gap-2.5">
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
                  : 'bg-gradient-to-tr from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-white dark:from-slate-100 dark:to-slate-200 dark:hover:from-white dark:text-slate-950 border border-slate-700/25'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
    </ZenModal>
  );
}
