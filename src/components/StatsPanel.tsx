import { DollarSign, CheckCircle2, CreditCard, Sparkles } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface StatsPanelProps {
  totalPotentialValue: number;
  resolvedValue: number;
  totalAnnualFee: number;
  utilizationRate: number;
}

export function StatsPanel({
  totalPotentialValue,
  resolvedValue,
  totalAnnualFee,
  utilizationRate
}: StatsPanelProps) {
  const theme = useCardStore((s) => s.theme);
  const language = useCardStore((s) => s.language);

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
      {/* Card 1: Potential Value */}
      <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 text-center sm:text-left flex flex-col justify-between min-h-[55px] sm:min-h-0 sm:block ${
        themeClass('bg-slate-900/50 border-slate-850/60', 'bg-white border-slate-200 shadow-sm')
      }`}>
        <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
          <DollarSign className="w-3.5 h-3.5 text-slate-505 hidden sm:inline" />
          {t('potentialValue')}
        </p>
        <p className={`text-xs sm:text-xl font-black ${themeClass('text-white', 'text-slate-900')}`}>${totalPotentialValue}</p>
      </div>

      {/* Card 2: Resolved */}
      <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 text-center sm:text-left flex flex-col justify-between min-h-[55px] sm:min-h-0 sm:block ${
        themeClass('bg-slate-900/50 border-slate-850/60', 'bg-white border-slate-200 shadow-sm')
      }`}>
        <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 hidden sm:inline" />
          {t('resolved')}
        </p>
        <p className={`text-xs sm:text-xl font-black text-emerald-500`}>${resolvedValue}</p>
      </div>

      {/* Card 3: Total Annual Fee */}
      <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 text-center sm:text-left flex flex-col justify-between min-h-[55px] sm:min-h-0 sm:block ${
        themeClass('bg-slate-900/50 border-slate-850/60', 'bg-white border-slate-200 shadow-sm')
      }`}>
        <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
          <CreditCard className="w-3.5 h-3.5 text-purple-500 hidden sm:inline" />
          {t('totalAnnualFee')}
        </p>
        <p className={`text-xs sm:text-xl font-black ${themeClass('text-white', 'text-slate-900')}`}>${totalAnnualFee}</p>
      </div>

      {/* Card 4: Maximized */}
      <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 min-h-[55px] sm:min-h-0 ${
        themeClass('bg-slate-900/50 border-slate-850/60', 'bg-white border-slate-200 shadow-sm')
      }`}>
        <div className="text-center sm:text-left flex-grow flex flex-col justify-between sm:justify-start">
          <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
            <Sparkles className="w-3.5 h-3.5 text-purple-500 hidden sm:inline" />
            {t('maximized')}
          </p>
          <p className={`text-xs sm:text-xl font-black ${themeClass('text-white', 'text-slate-900')}`}>{utilizationRate}%</p>
        </div>
        
        <div className="relative w-8 h-8 shrink-0 items-center justify-center hidden sm:flex">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="12"
              className={`fill-none stroke-current ${themeClass('text-white/10', 'text-slate-100')}`}
              strokeWidth="3"
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              className="fill-none stroke-current text-purple-500 dark:text-purple-400 transition-all duration-500 ease-out"
              strokeWidth="3"
              strokeDasharray="75.39"
              strokeDashoffset={75.39 - (75.39 * Math.min(utilizationRate / 100, 1))}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-purple-500 dark:text-purple-400">
            🎯
          </div>
        </div>
      </div>
    </section>
  );
}
