import { Sparkles } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface EmptyWalletStateProps {
  onBrowse: () => void;
  themeClass: (dark: string, light: string) => string;
}

export function EmptyWalletState({ onBrowse, themeClass }: EmptyWalletStateProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  return (
    <div className={`text-center py-16 border border-dashed rounded-2xl p-8 space-y-2.5 ${
      themeClass('bg-slate-900/20 border-slate-850', 'bg-white border-slate-200 shadow-sm')
    }`}>
      <Sparkles className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
      <h3 className={`text-base font-bold ${themeClass('text-slate-300', 'text-slate-800')}`}>
        {t('emptyWalletTitle')}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
        {t('emptyWalletDesc')}
      </p>
      <button
        onClick={onBrowse}
        className="mt-3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-4.5 py-2 rounded-xl text-[10px] transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
      >
        {t('emptyWalletBtn')}
      </button>
    </div>
  );
}
