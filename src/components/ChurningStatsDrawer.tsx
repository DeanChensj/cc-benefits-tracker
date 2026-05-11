import { X, ShieldAlert, ShieldCheck, Compass, Clock } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { CARDS_DB } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations, formatCardName } from '../utils/i18n';

interface ChurningStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCards: OwnedCardInstance[];
  theme: 'dark' | 'light';
}

export function ChurningStatsDrawer({ isOpen, onClose, ownedCards, theme }: ChurningStatsDrawerProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  if (!isOpen) return null;

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  // 1. Calculate Chase 5/24 timeline
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  // Filter and map cards opened in the last 24 months
  const active524Cards = ownedCards
    .filter((card) => {
      if (!card.cardOpenDate) return false;
      const openDate = new Date(card.cardOpenDate);
      return openDate >= twoYearsAgo;
    })
    .map((card) => {
      const openDate = new Date(card.cardOpenDate);
      // Exit date is exactly 24 months after opening
      const exitDate = new Date(openDate.getFullYear() + 2, openDate.getMonth(), openDate.getDate());
      const daysRemaining = Math.max(0, Math.ceil((exitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const template = CARDS_DB.find((t) => t.id === card.templateId);

      return {
        id: card.id,
        name: card.customName,
        bank: card.templateId === 'custom' ? card.bank : (template?.bank || 'Standard'),
        openDateStr: card.cardOpenDate,
        exitDateStr: `${exitDate.getFullYear()}-${(exitDate.getMonth() + 1).toString().padStart(2, '0')}-${exitDate.getDate().toString().padStart(2, '0')}`,
        daysRemaining,
      };
    })
    // Sort by days remaining (so cards exiting first appear at the top!)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const chaseCount = active524Cards.length;

  // 2. Calculate Amex 1/90 Cooling Status
  const amexCards = ownedCards
    .filter((card) => {
      const template = CARDS_DB.find((t) => t.id === card.templateId);
      const bank = card.templateId === 'custom' ? card.bank : template?.bank;
      return bank === 'Amex' && card.cardOpenDate;
    })
    .map((card) => new Date(card.cardOpenDate))
    .sort((a, b) => b.getTime() - a.getTime()); // Most recent first

  const lastAmexOpenDate = amexCards[0] || null;
  const amexDaysElapsed = lastAmexOpenDate
    ? Math.max(0, Math.floor((now.getTime() - lastAmexOpenDate.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isAmexCooling = amexDaysElapsed !== null && amexDaysElapsed < 90;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-955/40 dark:bg-slate-950/75 backdrop-blur-[3px] z-50 flex items-end sm:items-stretch justify-end p-0 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md flex flex-col overflow-hidden transition-all duration-300 transition-colors focus:outline-none
          max-sm:h-[85vh] max-sm:h-[85dvh] max-sm:rounded-t-2xl max-sm:animate-slide-sheet max-sm:pb-6
          sm:h-full sm:rounded-none sm:border-l sm:border-t-0 max-sm:border-t ${
            themeClass('bg-slate-900/80 border-slate-800/70 text-slate-100 backdrop-blur-md saturate-[170%] border-t-white/15 shadow-slate-950/50', 'bg-white/85 border-slate-200 text-slate-800 backdrop-blur-md saturate-[170%] border-t-white/45 shadow-slate-300/30')
          }`}
      >
        {/* Mobile Drag Pull Bar */}
        <div className="sm:hidden w-10 h-1 bg-slate-300/40 dark:bg-slate-700/40 rounded-full mx-auto my-3 shrink-0" />

        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between shrink-0 border-b ${themeClass('border-slate-800/60', 'border-slate-200/60')}`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500 animate-spin-slow" />
            <h4 className="text-xs font-black uppercase tracking-wider">{t('churnDrawerTitle')}</h4>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              themeClass('text-slate-400 hover:text-white hover:bg-white/5', 'text-slate-500 hover:text-slate-800 hover:bg-black/5')
            }`}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-grow overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* 1. CHASE 5/24 GAUGE DASHBOARD */}
          <div className="space-y-3.5">
            <h5 className={`text-[10px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-450', 'text-slate-550')}`}>
              {t('churnChaseStatusHeader')}
            </h5>

            {/* 3D Gauge visual card */}
            <div className={`p-4 rounded-r-xl border border-l-[3.5px] flex items-center justify-between gap-4 transition-all duration-300 ${
              chaseCount >= 5 ? 'border-l-rose-500' : 'border-l-purple-500'
            } ${
              themeClass('bg-slate-950/30 border-slate-850/60', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <div className="space-y-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest border ${
                  chaseCount >= 5
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 animate-pulse'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5'
                }`}>
                  {chaseCount >= 5 ? t('churnChaseLockedLabel') : t('churnChaseActiveLabel')}
                </span>
                <p className={`text-xs leading-relaxed ${themeClass('text-slate-400', 'text-slate-550')}`}>
                  {chaseCount >= 5 ? t('churnChaseLocked') : chaseCount >= 3 ? t('churnChaseWarning') : t('churnChaseSafe')}
                </p>
              </div>
              {/* Large dynamic score ring badge */}
              <div className={`flex flex-col items-center justify-center shrink-0 w-12 h-12 rounded-full border transition-all duration-300 ${
                themeClass('bg-slate-900/80 border-slate-800/60 shadow-inner', 'bg-white border-slate-200 shadow-sm')
              }`}>
                <span className={`text-xl font-black leading-none ${
                  chaseCount >= 5 ? 'text-rose-500' : 'text-purple-600 dark:text-purple-400'
                }`}>
                  {chaseCount}
                </span>
                <span className="text-[8px] font-bold tracking-widest uppercase text-slate-500 opacity-80 mt-0.5">/ 24</span>
              </div>
            </div>
          </div>

          {/* 2. AMEX 1/90 COOLING STATUS */}
          <div className="space-y-3.5">
            <h5 className={`text-[10px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-450', 'text-slate-550')}`}>
              {t('churnAmexTitle')}
            </h5>

            <div className={`p-4 rounded-r-xl border border-l-[3.5px] flex items-center gap-3 transition-all duration-300 ${
              isAmexCooling ? 'border-l-amber-500' : 'border-l-emerald-500'
            } ${
              themeClass('bg-slate-950/30 border-slate-850/60', 'bg-white border-slate-200 shadow-sm')
            }`}>
              {isAmexCooling ? (
                <ShieldAlert className="w-7 h-7 text-amber-500 shrink-0 animate-pulse" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-emerald-500 shrink-0" />
              )}
              <div className="space-y-0.5 min-w-0 flex-grow">
                <h6 className={`text-xs font-bold truncate ${themeClass('text-slate-200', 'text-slate-800')}`}>
                  {isAmexCooling ? t('churnAmexCoolingPeriod') : t('churnAmexSafeRange')}
                </h6>
                <p className={`text-[10px] leading-normal ${themeClass('text-slate-400', 'text-slate-500')}`}>
                  {isAmexCooling 
                    ? t('churnAmexWarning').replace('{days}', String(amexDaysElapsed)) 
                    : t('churnAmexSafe')}
                </p>
              </div>
            </div>
          </div>

          {/* 3. ACTIVE 24-MONTH CARDS TIMELINE */}
          <div className="space-y-3.5">
            <h5 className={`text-[10px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-455', 'text-slate-555')}`}>
              {t('churnActiveTimelineHeader')} ({active524Cards.length})
            </h5>

            {active524Cards.length === 0 ? (
              <div className="text-center py-8 text-slate-500 space-y-1">
                <Compass className="w-6 h-6 text-slate-400 mx-auto opacity-70" />
                <p className="text-xs font-medium">{t('churnTimelineClear')}</p>
              </div>
            ) : (
              <div className={`relative space-y-3.5 pl-5 ml-1.5 border-l ${themeClass('border-slate-800/60', 'border-slate-200/80')}`}>
                {active524Cards.map((c) => (
                  <div 
                    key={c.id}
                    className={`p-3.5 rounded-r-xl border border-l-[3.5px] flex items-center justify-between gap-4 transition-all duration-250 relative ${
                      c.daysRemaining <= 90 ? 'border-l-emerald-500' : 'border-l-slate-500'
                    } ${
                      themeClass('bg-slate-950/20 border-slate-850/60 hover:border-slate-800', 'bg-white border-slate-200 shadow-sm hover:border-slate-250')
                    }`}
                  >
                    {/* Timeline Node Anchor Dot */}
                    <div className={`absolute w-2.5 h-2.5 rounded-full -left-[22px] top-1/2 -translate-y-1/2 border-2 transition-all duration-300 ${
                      c.daysRemaining <= 90 
                        ? 'bg-emerald-500 border-white dark:border-slate-900 shadow-[0_0_6px_rgba(16,185,129,0.6)]' 
                        : 'bg-slate-500 border-white dark:border-slate-900'
                    }`} />
                    <div className="space-y-0.5 min-w-0 flex-grow">
                      <h6 className={`text-xs font-extrabold truncate uppercase tracking-wide ${themeClass('text-slate-200', 'text-slate-800')}`}>
                        {formatCardName(c.name)}
                      </h6>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-450 shrink-0">
                        <span className="px-1 rounded bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/15">{c.bank}</span>
                        <span>{t('churnOpenedLabel')} {c.openDateStr}</span>
                      </div>
                    </div>

                    {/* Days Exit Countdown Capsule */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase border shrink-0 inline-block ${
                        c.daysRemaining <= 90
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15 dark:bg-emerald-500/5'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/15'
                      }`}>
                        {c.daysRemaining} {t('churnDaysLeft')}
                      </span>
                      <p className="text-[8.5px] text-slate-450 font-bold tracking-wider uppercase opacity-80">
                        {t('churnExitDate')} {c.exitDateStr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
