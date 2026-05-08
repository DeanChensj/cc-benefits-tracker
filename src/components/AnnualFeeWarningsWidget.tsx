import { AlertTriangle, X } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';

interface WarningItem {
  card: OwnedCardInstance;
  fee: number;
  nextAnniversaryDate: Date;
  daysUntil: number;
}

interface AnnualFeeWarningsWidgetProps {
  annualFeeWarnings: WarningItem[];
  activeTab: string;
  dismissWarning: (cardId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  themeClass: (dark: string, light: string) => string;
}

export function AnnualFeeWarningsWidget({
  annualFeeWarnings,
  activeTab,
  dismissWarning,
  showToast,
  themeClass,
}: AnnualFeeWarningsWidgetProps) {
  if (activeTab === 'cards' || annualFeeWarnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4 animate-fade-in">
      {annualFeeWarnings.map((warning) => {
        return (
          <div
            key={warning.card.id}
            className={`p-3 rounded-xl border backdrop-blur-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition duration-300 ${
              warning.daysUntil <= 7
                ? 'bg-red-500/5 border-red-500/30 dark:border-red-400/25 text-red-600 dark:text-red-350 shadow-md shadow-red-500/5'
                : 'bg-amber-500/5 border-amber-500/25 dark:border-amber-400/20 text-amber-600 dark:text-amber-350'
            }`}
          >
            <div className="flex items-start gap-2.5 text-left min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                warning.daysUntil <= 7
                  ? 'bg-red-500/10 text-red-505 animate-pulse'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h5 className={`font-extrabold text-xs flex items-center gap-2 flex-wrap ${themeClass('text-white', 'text-slate-900')}`}>
                  <span>Annual Fee Alert: {warning.card.customName}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded shrink-0 tracking-wider uppercase ${
                    warning.daysUntil <= 7
                      ? 'bg-red-500/20 text-red-600 dark:text-red-350 animate-pulse'
                      : 'bg-amber-500/20 text-amber-650 dark:text-amber-300'
                  }`}>
                    {warning.daysUntil === 0 ? 'Today!' : `${warning.daysUntil} Days Left`}
                  </span>
                </h5>
                <p className={`text-[10px] leading-normal font-medium ${themeClass('text-slate-400', 'text-slate-600')}`}>
                  Card anniversary is approaching! An annual fee of <span className="font-extrabold text-emerald-500">${warning.fee}</span> is expected to post. ➔ Posting Date:{' '}
                  <span className="font-bold underline underline-offset-2">
                    {warning.nextAnniversaryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
                <p className="text-[8.5px] opacity-80 font-medium text-purple-400 dark:text-purple-500 leading-normal mt-1 flex items-center gap-1">
                  <span>💡 Churning Tip: Call the retention line for bonuses, or downgrade to a no-fee option within 30 days after the fee posts to get a 100% refund!</span>
                </p>
              </div>
            </div>
            
            {/* Meticulous OCD Close Button: Manual warning dismissal */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissWarning(warning.card.id);
                showToast(`🧹 Annual Fee warning for "${warning.card.customName}" dismissed!`);
              }}
              className={`absolute top-3 right-3 p-1 rounded-md transition cursor-pointer active:scale-90 shrink-0 ${
                warning.daysUntil <= 7
                  ? 'text-red-500/50 hover:text-red-600 hover:bg-red-500/10 dark:text-red-400/60 dark:hover:text-red-300'
                  : 'text-amber-500/50 hover:text-amber-600 hover:bg-amber-500/10 dark:text-amber-400/60 dark:hover:text-amber-300'
              }`}
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
