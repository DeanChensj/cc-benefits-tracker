import { Plus, Trash2, ExternalLink, Edit3, ChevronDown } from 'lucide-react';
import { CARDS_DB, CARD_MULTIPLIERS } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import { translations, formatCardName } from '../utils/i18n';

interface WalletCreditCardProps {
  instance: OwnedCardInstance;
  isCardExpanded: boolean;
  toggleCardExpanded: (id: string) => void;
  getCardRecoupedValue: (id: string) => number;
  handleAddCard: (templateId: string) => void;
  handleAddCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  handleRemoveCard: (instanceId: string) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  setAddOfferInstanceId: (instanceId: string) => void;
  onEditCard: (instance: OwnedCardInstance) => void;
  themeClass: (dark: string, light: string) => string;
}

export function WalletCreditCard({
  instance,
  isCardExpanded,
  toggleCardExpanded,
  getCardRecoupedValue,
  handleAddCard,
  handleAddCustomCard,
  handleRemoveCard,
  removeInstanceOffer,
  setAddOfferInstanceId,
  onEditCard,
  themeClass,
}: WalletCreditCardProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']): string => (translations[language][key] || translations['en'][key]) as string;

  const template = CARDS_DB.find((t) => t.id === instance.templateId);
  const cardColor = instance.templateId === 'custom' 
    ? (instance.color || 'from-purple-950/50 to-slate-950')
    : (template?.color || 'from-slate-800 to-slate-900');
  const benefits = instance.templateId === 'custom' ? (instance.customBenefits || []) : (template?.benefits || []);
  
  const cardFee = instance.annualFee !== undefined 
    ? instance.annualFee 
    : (template?.annualFee !== undefined ? template.annualFee : 0);
  const recouped = getCardRecoupedValue(instance.id);
  const isRecouped = cardFee > 0 && recouped >= cardFee;
  
  const isSilverCard = instance.templateId === 'amex-platinum' || 
                       instance.templateId === 'amex-biz-platinum' || 
                       instance.templateId === 'amex-gold';

  const multipliers = instance.multipliers || (instance.templateId !== 'custom' ? CARD_MULTIPLIERS[instance.templateId] : null);
  const hasMultipliers = multipliers && Object.values(multipliers).some((v) => typeof v === 'number' && v > 1);
  const currency = instance.templateId === 'custom' ? 'cash' : (template?.pointCurrency || 'cash');
  const cpp = useCardStore.getState().pointValuations?.[currency] || 1.0;


  return (
    <div className="flex flex-col w-full transition duration-200 hover:scale-[1.01]">
      {/* A. Upper Part: Realistic Virtual Credit Card Face (1.58:1 Ratio) */}
      <div
        className={`aspect-[1.58/1] w-full rounded-2xl relative p-4 flex flex-col justify-between overflow-hidden shadow-xl select-none bg-gradient-to-tr ${cardColor} border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 dark:hover:shadow-purple-500/15 hover:border-purple-500/30 group/card ${
          isSilverCard ? 'text-slate-900 font-extrabold' : 'text-white'
        } ${
          isRecouped 
            ? 'ring-2 ring-amber-500/50 dark:ring-amber-400/35 border-amber-500/30 shadow-lg shadow-amber-500/5'
            : isSilverCard
            ? 'border-slate-300/60 shadow-md shadow-slate-200/10'
            : 'border-purple-900/20'
        }`}
      >
        {/* Hover Metallic Gloss Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover/card:opacity-100 duration-1000 transition-all -translate-x-full group-hover/card:translate-x-full skew-x-12 scale-150 pointer-events-none" />

        {/* Card Face Header: Bank/Opened Tag and duplicate actions */}
        <div className="flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${
              isSilverCard
                ? 'bg-slate-955/20 text-slate-900 border border-slate-900/15'
                : 'bg-white/15 text-white border border-white/15'
            }`}>
              {instance.templateId === 'custom' ? (instance.bank || 'Custom') : (template?.bank || 'Standard')}
            </span>
            <span className="text-[7.5px] font-extrabold uppercase tracking-widest opacity-85">
              {language === 'zh' ? '已激活' : 'Opened'}: {instance.cardOpenDate}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-250">
            {template?.officialUrl && (
              <a
                href={template.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`p-1 rounded hover:bg-white/10 transition cursor-pointer ${isSilverCard ? 'text-slate-800' : 'text-white'}`}
                title="Official URL"
              >
                <ExternalLink className="w-3 h-3 stroke-[2.5]" />
              </a>
            )}
            {instance.templateId === 'custom' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddCustomCard({
                    templateId: 'custom',
                    customName: `${instance.customName} (Copy)`,
                    bank: instance.bank,
                    color: instance.color,
                    cardOpenDate: instance.cardOpenDate,
                    annualFee: instance.annualFee,
                    customBenefits: (instance.customBenefits || []).map((b) => ({
                      ...b,
                      id: `benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    })),
                  });
                }}
                className={`p-1 rounded transition cursor-pointer ${isSilverCard ? 'text-slate-700 hover:text-slate-955 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                title="Duplicate"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddCard(instance.templateId);
                }}
                className={`p-1 rounded transition cursor-pointer ${isSilverCard ? 'text-slate-700 hover:text-slate-955 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                title="Add instance"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveCard(instance.id);
              }}
              className={`p-1 rounded transition cursor-pointer ${isSilverCard ? 'text-red-700 hover:text-red-850 hover:bg-red-500/10' : 'text-red-400 hover:text-red-350 hover:bg-red-550/10'}`}
              title="Remove"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card Face Body: EMV Chip & Contactless Antenna */}
        <div className="flex items-center gap-2.5 my-auto z-10 relative">
          {/* CSS Micro-Engineered Gold EMV Chip */}
          <div className="w-8 h-6 rounded-md bg-gradient-to-tr from-amber-200 via-yellow-450 to-amber-350 border border-amber-500/25 shadow-sm relative flex flex-wrap p-0.5 overflow-hidden opacity-95 shrink-0">
            <div className="w-1/2 h-full border-r border-amber-600/30" />
            <div className="w-full h-[1px] bg-amber-600/30 absolute top-1/2 left-0" />
            <div className="w-full h-[1px] bg-amber-600/30 absolute top-1/4 left-0" />
            <div className="w-full h-[1px] bg-amber-600/30 absolute top-3/4 left-0" />
            {/* EMV central metallic contact plate */}
            <div className="absolute top-1.5 left-2.5 w-3 h-3 bg-yellow-100/90 rounded-sm border border-amber-600/25 shadow-inner z-10" />
          </div>

          {/* Contactless antenna waves */}
          <div className={`flex items-center gap-[1.5px] rotate-90 scale-75 origin-center font-extrabold text-[8px] opacity-60 ${isSilverCard ? 'text-slate-900' : 'text-white'}`}>
            <span>(</span><span>(</span><span>(</span>
          </div>
        </div>

        {/* Card Face Footer: Template Name & Custom Label Duet */}
        <div className="flex items-end justify-between z-10 relative">
          <div className="min-w-0 flex-grow mr-2">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onEditCard(instance);
              }}
              className="flex items-center gap-1.5 cursor-pointer group/edit max-w-fit"
              title="Click to edit card details"
            >
              <h4 className="text-sm font-black uppercase tracking-wider truncate">
                {formatCardName(instance.templateId === 'custom' ? instance.customName : (template?.name || 'Card'))}
              </h4>
              <Edit3 className="w-3 h-3 shrink-0 opacity-50 group-hover/edit:opacity-100" />
            </div>
            {/* Custom Sub-label displaying the user-defined customName */}
            {instance.templateId !== 'custom' && (
              <p className="text-[8px] uppercase tracking-widest opacity-75 mt-0.5 truncate font-bold">
                {formatCardName(instance.customName)}
              </p>
            )}
          </div>

          {/* Visual Network Emblem watermark */}
          <span className={`text-[11px] font-black italic tracking-widest opacity-75 ${isSilverCard ? 'text-slate-900' : 'text-white/90'}`}>
            {template?.bank === 'Amex' ? 'AMEX' : template?.bank === 'Chase' ? 'VISA' : 'MC'}
          </span>
        </div>
      </div>

      {/* B. Lower Part: Glassmorphic Analytics & Action Tray (Attached) */}
      <div className={`p-4 rounded-2xl border border-t-0 rounded-t-none flex flex-col justify-between transition duration-250 -mt-3 pt-6 shadow-md ${
        themeClass(
          'bg-slate-900/45 border-slate-850/80 shadow-black/10', 
          'bg-white/90 border-slate-200 shadow-slate-100/50'
        )
      }`}>


    {/* Accordion Toggle & Actions Panel */}
        <div className="mt-3 pt-3 border-t border-white/5 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCardExpanded(instance.id);
            }}
            className={`flex-grow px-2.5 py-1.5 rounded-lg border text-[9px] font-black tracking-wider uppercase flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
              themeClass(
                'bg-white/5 hover:bg-white/10 border-white/10 text-slate-150 hover:text-white',
                'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700'
              )
            }`}
          >
            <span className="flex items-center gap-1">
              <span>📊 {isCardExpanded ? t('hideDetails') : t('showDetails')}</span>
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 transform ${
              isCardExpanded ? 'rotate-180' : 'rotate-0'
            }`} />
          </button>

          {/* Interactive Offer Adder Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAddOfferInstanceId(instance.id);
            }}
            className="px-3 py-1.5 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-purple-500/10 cursor-pointer ml-auto shrink-0"
          >
            <span>{t('addOffer')}</span>
          </button>
        </div>

        {/* 2. Collapsible Drawer Panel */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCardExpanded
            ? 'max-h-[1200px] opacity-100 border-t border-dashed border-white/10 dark:border-black/5 pt-3.5 mt-3'
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}>
          {/* Upper Metadata block inside Collapsible drawer (Recoup Progress and Point Multipliers) */}
          <div className="mb-3.5">
            {/* 💳 Dual-Column Premium ROI & Earning Dashboard */}
            <div className={`p-3 rounded-xl border text-left shadow-inner grid grid-cols-12 gap-3 ${
              themeClass('bg-white/5 border-white/5 text-slate-300', 'bg-slate-955/5 border-slate-800/10 text-slate-800')
            }`}>
              {/* Left Column: Recoup Progress (cardFee > 0 ? Circle Progress : Free Card label) - col-span-5 */}
              <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                {cardFee > 0 ? (
                  <>
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <svg className="w-9 h-9 transform -rotate-90">
                        <circle
                          cx="18"
                          cy="18"
                          r="13.5"
                          className={`fill-none stroke-current ${themeClass('text-white/10', 'text-slate-250')}`}
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="13.5"
                          className={`fill-none stroke-current transition-all duration-500 ${
                            isRecouped 
                              ? 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.25)]' 
                              : themeClass('text-purple-400', 'text-slate-700')
                          }`}
                          strokeWidth="2.5"
                          strokeDasharray="84.82"
                          strokeDashoffset={84.82 - (84.82 * Math.min(recouped / cardFee, 1))}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[8.2px] font-black">
                        {isRecouped ? (
                          <span className="text-emerald-500 dark:text-emerald-400">✓</span>
                        ) : (
                          <span className={themeClass('text-slate-300', 'text-slate-750')}>
                            {Math.round((recouped / cardFee) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className={`text-[8.2px] font-black uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>{t('annualFeeRecoup')}</p>
                      <p className={`text-[10.5px] font-extrabold mt-0.5 leading-none ${themeClass('text-slate-200', 'text-slate-850')}`}>
                        <span className={isRecouped ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}>
                          ${recouped}
                        </span>
                        <span className={`text-[9px] font-bold ml-0.5 ${themeClass('text-slate-455', 'text-slate-500')}`}>/ ${cardFee}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="min-w-0 flex-grow">
                    <p className={`text-[8.2px] font-black uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>{t('annualFeeRecoup')}</p>
                    <p className={`text-[9.5px] font-black flex items-center gap-1 mt-1 ${themeClass('text-emerald-400', 'text-emerald-600')}`}>
                      <span>{t('freeCard')}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Vertical Dashed Separator - col-span-1 */}
              <div className="col-span-1 flex justify-center items-stretch border-r border-dashed border-slate-200/20 dark:border-slate-800/40 my-0.5" />

              {/* Right Column: Earning Multipliers pills container - col-span-6 */}
              <div className="col-span-6 flex flex-col justify-center min-w-0">
                {hasMultipliers ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between min-w-0 gap-1.5">
                      <p className={`text-[8.2px] font-black uppercase tracking-wider truncate ${themeClass('text-purple-450 dark:text-purple-400', 'text-purple-650')}`}>
                        {t(`curr_${currency.replace('-', '_')}` as keyof typeof translations['en'])}
                      </p>
                      {currency !== 'cash' && (
                        <span className="text-[7.5px] font-black px-1 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-450 dark:text-purple-300 border border-purple-500/15 shrink-0">
                          {cpp} cpp
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {multipliers && Object.entries(multipliers)
                        .filter(([, val]) => val && val > 1)
                        .map(([category, val]) => (
                          <span 
                            key={category}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[8.5px] font-black border shadow-sm select-none ${
                              themeClass('bg-slate-955 border-slate-850 text-slate-300', 'bg-slate-100 border-slate-250 text-slate-700')
                            }`}
                            title={`${category}: ${val}x`}
                          >
                            <span>
                              {category === 'dining' ? '🍽️' :
                               category === 'travel' ? '✈️' :
                               category === 'shopping' ? '🛒' : '🎬'}
                            </span>
                            <span className={themeClass('text-purple-400', 'text-purple-650 font-black')}>{val}x</span>
                          </span>
                        ))
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between min-w-0 gap-1.5">
                      <p className={`text-[8.2px] font-black uppercase tracking-wider truncate ${themeClass('text-purple-450 dark:text-purple-400', 'text-purple-650')}`}>
                        {t(`curr_${currency.replace('-', '_')}` as keyof typeof translations['en'])}
                      </p>
                      {currency !== 'cash' && (
                        <span className="text-[7.5px] font-black px-1 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-450 dark:text-purple-300 border border-purple-500/15 shrink-0">
                          {cpp} cpp
                        </span>
                      )}
                    </div>
                    <p className={`text-[9px] font-bold italic mt-1 ${themeClass('text-slate-455', 'text-slate-500')}`}>
                      {language === 'zh' ? '常驻无多倍返点' : 'Flat Rate Card'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Benefits preview inline list */}
          <div className="space-y-1 text-left">
            {benefits.map((b) => (
              <div key={b.id} className={`flex items-center justify-between text-[10px] p-1.5 rounded border ${
                themeClass(
                  'bg-slate-955/40 border-white/5 text-slate-200',
                  'bg-slate-50 border-slate-250/60 text-slate-800 font-semibold shadow-sm'
                )
              }`}>
                <span className="truncate pr-2">{b.name}</span>
                <span className={`font-extrabold ${themeClass('text-white', 'text-slate-900')}`}>{b.value}</span>
              </div>
            ))}
          </div>

          {/* Google Drive / Instance Custom Offers List */}
          {instance.instanceOffers && instance.instanceOffers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 dark:border-black/5 space-y-1.5 text-left">
              <p className={`text-[8px] font-black uppercase tracking-widest ${
                themeClass('text-purple-400 dark:text-purple-500', 'text-purple-805')
              }`}>{t('tempOffers')}</p>
              <div className="space-y-1">
                {instance.instanceOffers.map((offer) => (
                  <div 
                    key={offer.id} 
                    className={`flex items-center justify-between text-[10px] p-1.5 rounded border ${
                      themeClass(
                        'bg-purple-500/10 border-purple-500/15 text-slate-200',
                        'bg-purple-50 border-purple-100 text-purple-950 font-bold'
                      )
                    }`}
                  >
                    <span className="truncate pr-2">{offer.name}</span>
                    <div className={`flex items-center gap-1.5 shrink-0 font-extrabold ${themeClass('text-white', 'text-purple-950')}`}>
                      <span>+${offer.value}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeInstanceOffer(instance.id, offer.id);
                        }}
                        className="text-slate-400 hover:text-red-400 transition cursor-pointer p-0.5 rounded active:scale-90"
                        title="Remove offer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
