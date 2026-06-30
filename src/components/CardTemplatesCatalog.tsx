import { useState } from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';
import { CARDS_DB } from '../data/cards.db';
import type { CardTemplate } from '../data/cards.db';
import { getCardPotentialValue } from '../utils/valuationUtils';
import { BankHeader } from './WalletCardsTab'; // Re-use bank header styles
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface CardTemplatesCatalogProps {
  themeClass: (dark: string, light: string) => string;
  selectedTemplates: string[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  onViewTemplateDetail: (card: CardTemplate) => void;
}

export function CardTemplatesCatalog({
  themeClass,
  selectedTemplates,
  setSelectedTemplates,
  onViewTemplateDetail,
}: CardTemplatesCatalogProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']): string => (translations[language][key] || translations['en'][key]) as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [templateFeeFilter, setTemplateFeeFilter] = useState<'all' | 'free' | 'mid' | 'premium'>('all');
  const [manualCollapsedBanks, setManualCollapsedBanks] = useState<Record<string, boolean>>({});
  const [isCompactCatalog, setIsCompactCatalog] = useState(() => {
    return localStorage.getItem('cc-tracker-compact-catalog') === 'true';
  });

  // Filter templates
  const filteredTemplates = CARDS_DB.filter((card) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !card.name.toLowerCase().includes(query) &&
        !card.bank.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (templateFeeFilter === 'free') return card.annualFee === 0;
    if (templateFeeFilter === 'mid') return card.annualFee > 0 && card.annualFee < 250;
    if (templateFeeFilter === 'premium') return card.annualFee >= 250;
    return true;
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplates((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  const isBankCollapsed = (bankName: string) => {
    if (searchQuery.trim() !== '') {
      return false; // Always auto-expand matching banks when actively searching
    }
    if (manualCollapsedBanks[bankName] !== undefined) {
      return manualCollapsedBanks[bankName];
    }
    return true; // Default collapsed when not searching to ensure 0 initial DOM bloat!
  };

  return (
    <div 
      id="templates-library-section"
      className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
        themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-555')}`}>
            <Sparkles className="w-4 h-4 text-purple-500 animate-spin-slow" />
            {t('templatesLibraryTitle')}
          </h3>
          <p className={`text-[9.5px] mt-0.5 font-medium ${themeClass('text-slate-455', 'text-slate-500')}`}>
            {t('templatesLibraryDesc')}
          </p>
        </div>

        {/* Standard Segmented Fee Filters & Compact View Toggle */}
        <div className="flex items-center gap-2 flex-wrap select-none">
          <div className="flex gap-0.5 p-0.5 rounded-xl border border-slate-250 dark:border-slate-800/40 bg-slate-100 dark:bg-slate-955 select-none">
            {(['all', 'free', 'mid', 'premium'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTemplateFeeFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-250 cursor-pointer ${
                  templateFeeFilter === filter
                    ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm')
                    : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-855')
                }`}
              >
                {filter === 'all' ? t('feeAll') : filter === 'free' ? t('feeFree') : filter === 'mid' ? t('feeMid') : t('feePremium')}
              </button>
            ))}
          </div>

          {/* Compact View Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !isCompactCatalog;
              setIsCompactCatalog(nextVal);
              localStorage.setItem('cc-tracker-compact-catalog', String(nextVal));
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-250 cursor-pointer border ${
              isCompactCatalog
                ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md border-slate-200', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm border-slate-800')
                : themeClass('text-slate-400 hover:text-slate-200 border-slate-800', 'text-slate-500 hover:text-slate-855 border-slate-250')
            }`}
            title={isCompactCatalog ? "Switch to Grid View" : "Switch to Compact List"}
          >
            {isCompactCatalog ? t('gridView') : t('compactList')}
          </button>
        </div>
      </div>

      {/* Dynamic Search Input */}
      <div className="mb-5">
        <input
          type="text"
          placeholder={t('searchTemplatesPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 font-medium transition ${
            themeClass('bg-slate-955 border-slate-850 text-slate-200', 'bg-slate-50 border-slate-255 text-slate-800 shadow-inner')
          }`}
        />
      </div>

      <div className="space-y-8 mt-6">
        {(['Amex', 'Chase', 'Citi', 'Bilt', 'Other'] as const).map((bankName) => {
          const bankCards = filteredTemplates.filter((c) => {
            if (bankName === 'Other') {
              return c.bank !== 'Amex' && c.bank !== 'Chase' && c.bank !== 'Citi' && c.bank !== 'Bilt';
            }
            return c.bank === bankName;
          });
          if (bankCards.length === 0) return null;

          const isCollapsed = isBankCollapsed(bankName);

          return (
            <div key={bankName} className="space-y-3.5">
              <BankHeader
                bankName={bankName}
                count={bankCards.length}
                suffix="Card Templates"
                themeClass={themeClass}
                collapsible={true}
                isCollapsed={isCollapsed}
                onToggle={() => setManualCollapsedBanks((prev) => ({ ...prev, [bankName]: !isBankCollapsed(bankName) }))}
              />
              
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isCollapsed 
                  ? 'max-h-0 opacity-0 pointer-events-none' 
                  : 'max-h-[4000px] opacity-100 mt-3.5'
              }`}>
                {isCompactCatalog ? (
                  <div className="space-y-2">
                    {bankCards.map((card) => {
                      const isSelected = selectedTemplates.includes(card.id);
                      return (
                        <div
                          key={card.id}
                          onClick={() => onViewTemplateDetail(card)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 transition cursor-pointer hover:bg-slate-500/5 duration-200 ${
                            isSelected
                              ? 'ring-1 ring-inset ring-teal-600 border-teal-600 bg-teal-500/5'
                              : themeClass('bg-slate-900/40 border-slate-850', 'bg-white border-slate-200 shadow-sm')
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${card.color} shrink-0 shadow-sm`} />
                            <span className={`text-xs font-extrabold truncate ${themeClass('text-white', 'text-slate-900')}`}>
                              {card.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase border shrink-0 ${
                              card.annualFee > 0
                                ? themeClass('bg-slate-955 text-amber-400 border-slate-850', 'bg-slate-100 text-teal-750 border-slate-200')
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-505/10'
                            }`}>
                              {card.annualFee > 0 ? `$${card.annualFee}` : t('noFee')}
                            </span>
                            <span className={`text-[9px] font-medium truncate hidden sm:inline ${themeClass('text-slate-450', 'text-slate-500')}`}>
                              • {card.benefits.length} {t('perksSuffix')} (${getCardPotentialValue(card.benefits)}/yr)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(card.id);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition active:scale-95 border shrink-0 cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-teal-600 text-white border-transparent shadow-sm'
                                : themeClass('bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700', 'bg-white border-slate-250 text-slate-700 hover:border-slate-300 shadow-sm')
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3 stroke-[3]" />}
                            <span>{isSelected ? t('selected') : t('add')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {bankCards.map((card) => {
                      const isSelected = selectedTemplates.includes(card.id);
                      return (
                        <div
                          key={card.id}
                          onClick={() => onViewTemplateDetail(card)}
                          className={`p-4 rounded-xl border flex flex-col justify-between transition cursor-pointer hover:scale-[1.01] duration-200 relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] ${
                            isSelected
                              ? 'ring-2 ring-inset ring-teal-600 border-teal-600 bg-teal-500/5'
                              : themeClass('bg-slate-900/50 border-slate-850 hover:border-slate-800', 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm')
                          }`}
                        >
                          <div className="flex gap-3.5 items-start flex-grow pb-2 min-w-0">
                            <div className={`w-16 h-10 rounded-md bg-gradient-to-r ${card.color} shrink-0 relative shadow-md border border-white/10 overflow-hidden`}>
                              <div className="w-2.5 h-2 bg-amber-400/30 border border-amber-400/20 rounded-sm absolute top-1.5 left-1.5" />
                              <div className="absolute bottom-1 right-1.5 text-[4px] font-black uppercase tracking-widest text-white/20 font-sans">
                                {card.bank}
                              </div>
                            </div>

                            <div className="min-w-0 flex-grow">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`text-[8px] font-black px-1 rounded uppercase border ${
                                  themeClass('bg-slate-955 text-slate-400 border-slate-850', 'bg-white text-slate-555 border-slate-200')
                                }`}>
                                  {card.bank}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                                  card.annualFee > 0
                                    ? themeClass('bg-slate-955 text-amber-400 border-slate-850/80', 'bg-slate-100 text-teal-750 border-slate-200')
                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-505/10'
                                }`}>
                                  {card.annualFee > 0 
                                    ? t('feePrefix') + card.annualFee
                                    : t('noFee')}
                                </span>
                              </div>
                              <h4 className={`text-sm font-extrabold mt-1.5 ${themeClass('text-white', 'text-slate-900')}`}>{card.name}</h4>
                              <p className={`text-[11px] mt-1.5 leading-relaxed font-medium ${themeClass('text-slate-405', 'text-slate-555')}`}>
                                {t('containsBuiltIn')} ({card.benefits.length} {t('perksSuffix')}) <br /> {t('potentialValPrefix')} ${getCardPotentialValue(card.benefits)}/yr
                              </p>
                              <span className="text-[9px] text-teal-650 dark:text-teal-400 font-bold mt-2.5 block animate-pulse">
                                {t('clickToViewDetail')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(card.id);
                            }}
                            className={`w-full mt-4 flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.97] border cursor-pointer ${
                              isSelected
                                ? 'bg-teal-600 text-white border-transparent shadow shadow-teal-600/10'
                                : themeClass('bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700', 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm')
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                {t('selected')}
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                {t('selectTemplate')}
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
