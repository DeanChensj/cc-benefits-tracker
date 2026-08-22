import { DollarSign, CheckCircle2, CreditCard, Sparkles, Target } from 'lucide-react';
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
    <section className={`border rounded-2xl p-2.5 sm:p-4 mb-4 sm:mb-6 transition-all duration-300 backdrop-blur-md shadow-sm ${
      themeClass('bg-slate-900/60 border-slate-800/80', 'bg-white border-slate-200/80')
    }`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/40 dark:divide-slate-800/40 divide-slate-100">
        {/* Metric 1: Potential Value */}
        <div className="p-2 sm:px-4 sm:py-1 flex flex-col justify-between">
          <p className={`text-[10.5px] sm:text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>
            <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
            <span>{t('potentialValue')}</span>
          </p>
          <p className={`text-base sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${themeClass('text-slate-100', 'text-slate-900')}`}>
            ${totalPotentialValue.toLocaleString()}
          </p>
        </div>

        {/* Metric 2: Resolved */}
        <div className="p-2 sm:px-4 sm:py-1 flex flex-col justify-between">
          <p className={`text-[10.5px] sm:text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span>{t('resolved')}</span>
          </p>
          <p className="text-base sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 text-emerald-400">
            ${resolvedValue.toLocaleString()}
          </p>
        </div>

        {/* Metric 3: Total Annual Fee */}
        <div className="p-2 sm:px-4 sm:py-1 flex flex-col justify-between">
          <p className={`text-[10.5px] sm:text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>
            <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.75} />
            <span>{t('totalAnnualFee')}</span>
          </p>
          <p className={`text-base sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${themeClass('text-slate-100', 'text-slate-900')}`}>
            ${totalAnnualFee.toLocaleString()}
          </p>
        </div>

        {/* Metric 4: Maximized */}
        <div className="p-2 sm:px-4 sm:py-1 flex items-center justify-between gap-2">
          <div className="flex flex-col justify-between">
            <p className={`text-[10.5px] sm:text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.75} />
              <span>{t('maximized')}</span>
            </p>
            <p className={`text-base sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${themeClass('text-slate-100', 'text-slate-900')}`}>
              {utilizationRate}%
            </p>
          </div>
          
          <div className="relative w-9 h-9 shrink-0 items-center justify-center flex">
            <svg className="w-9 h-9 transform -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="14"
                className={`fill-none stroke-current ${themeClass('text-slate-800', 'text-slate-100')}`}
                strokeWidth="2.5"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                className="fill-none stroke-current text-emerald-400 transition-all duration-500 ease-out"
                strokeWidth="2.5"
                strokeDasharray="87.96"
                strokeDashoffset={87.96 - (87.96 * Math.min(utilizationRate / 100, 1))}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
              <Target className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
