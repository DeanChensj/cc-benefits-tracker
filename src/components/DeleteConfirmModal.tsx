import { Trash2 } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { translations, formatCardNameForToast } from '../utils/i18n';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  cardName: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
}

export function DeleteConfirmModal({ isOpen, cardName, onConfirm, onCancel, theme }: DeleteConfirmModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

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
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
          <Trash2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className={`text-sm font-black ${themeClass('text-white', 'text-slate-900')}`}>
            {t('deleteCardConfirmTitle')}
          </h3>
          <p className={`text-[11px] leading-normal ${themeClass('text-slate-400', 'text-slate-500')}`}>
            {t('deleteCardConfirmMessage1')}
            <span className={`font-extrabold ${themeClass('text-white', 'text-slate-900')}`}>
              {language === 'zh' ? `“${formatCardNameForToast(cardName)}”` : `"${formatCardNameForToast(cardName)}"`}
            </span>
            {t('deleteCardConfirmMessage2')}
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
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-tr from-rose-600 to-red-600 hover:from-rose-550 hover:to-red-550 text-white font-bold text-xs py-2.5 rounded-xl transition active:scale-95 shadow-lg shadow-rose-500/10 cursor-pointer"
          >
            {t('deleteCardBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
