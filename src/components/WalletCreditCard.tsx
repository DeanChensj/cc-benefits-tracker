import { useState } from 'react';
import { Trash2, ExternalLink, Edit3, ChevronDown } from 'lucide-react';
import { CARDS_DB, CARD_MULTIPLIERS } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import { translations, formatCardName, resolveCardNetwork } from '../utils/i18n';
import { parseLogEntry } from '../utils/logUtils';
import { obfuscateKey } from '../utils/cryptoUtils';
import { calculateCardRoi } from '../utils/valuationUtils';

interface WalletCreditCardProps {
  instance: OwnedCardInstance;
  isCardExpanded: boolean;
  toggleCardExpanded: (id: string) => void;
  getCardRecoupedValue: (id: string) => number;
  handleRemoveCard: (instanceId: string) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  setAddOfferInstanceId: (instanceId: string) => void;
  onEditCard: (instance: OwnedCardInstance) => void;
  themeClass: (dark: string, light: string) => string;
  isCompactView?: boolean;
}

export function WalletCreditCard({
  instance,
  isCardExpanded,
  toggleCardExpanded,
  getCardRecoupedValue,
  handleRemoveCard,
  removeInstanceOffer,
  setAddOfferInstanceId,
  onEditCard,
  themeClass,
  isCompactView = false,
}: WalletCreditCardProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']): string => (translations[language][key] || translations['en'][key]) as string;

  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [gloss, setGloss] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - card.left;
    const mouseY = e.clientY - card.top;
    
    // Calculate rotation based on mouse position relative to center (tilt up to 8 degrees)
    const rX = ((mouseY / card.height) - 0.5) * -16;
    const rY = ((mouseX / card.width) - 0.5) * 16;
    
    // Calculate reflection gloss position (0% to 100%)
    const gX = (mouseX / card.width) * 100;
    const gY = (mouseY / card.height) * 100;
    
    setRotate({ x: rX, y: rY });
    setGloss({ x: gX, y: gY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setGloss({ x: 50, y: 50 });
  };

  const handleTouchStart = () => {
    setIsPressed(true);
  };
 
  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const logs = useCardStore((state) => state.logs);
  const ownedCards = useCardStore((state) => state.ownedCards);
  const setAiPrompt = useCardStore((state) => state.setAiPrompt);
  const roi = calculateCardRoi(instance.id, ownedCards, logs);
  const subOffer = instance.instanceOffers?.find((o) => o.type === 'welcome-offer');
  
  let subSpent = 0;
  let subRequirement = 0;
  let subDaysLeft = 0;
  let showSub = false;
  
  if (subOffer) {
    subRequirement = subOffer.spendingLimit || 0;
    const logKey = subOffer.resetPeriod === 'once' 
      ? `once:${instance.id}:${subOffer.id}` 
      : `fixed:${instance.id}:${subOffer.id}:${subOffer.expirationDate}`;
    const logVal = logs[obfuscateKey(logKey)];
    const parsed = parseLogEntry(logVal);
    subSpent = parsed?.spentProgress || 0;
    
    if (subOffer.expirationDate) {
      const expDate = new Date(subOffer.expirationDate);
      const today = new Date();
      const diffTime = expDate.getTime() - today.getTime();
      subDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    showSub = true;
  }

  const template = CARDS_DB.find((t) => t.id === instance.templateId);
  const cardColor = instance.templateId === 'custom' 
    ? (instance.color || 'from-purple-950/50 to-slate-950')
    : (template?.color || 'from-slate-800 to-slate-900');
  const baseBenefits = instance.templateId === 'custom' ? (instance.customBenefits || []) : (template?.benefits || []);
  const rawBenefits = [...baseBenefits, ...(instance.instanceOffers || [])];
  
  const getPeriodScore = (period: string) => {
    if (period === 'monthly') return 1;
    if (period === 'quarterly') return 2;
    if (period === 'annual-calendar' || period === 'annual-anniversary') return 3;
    return 4;
  };

  const benefits = [...rawBenefits].sort((a, b) => getPeriodScore(a.resetPeriod) - getPeriodScore(b.resetPeriod));
  
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
  const currency = instance.pointCurrency || (template?.pointCurrency || 'cash');
  const pointValuations = useCardStore((state) => state.pointValuations);
  const cpp = pointValuations?.[currency] || 1.0;


  if (isCompactView) {
    return (
      <div className={`flex items-center justify-between p-2.5 rounded-xl border ${themeClass('bg-slate-900/40 border-slate-850', 'bg-white border-slate-200 shadow-sm')} transition-all duration-200 hover:scale-[1.01]`}>
        <div className="flex items-center gap-2.5">
          {/* Mini Card Color Block */}
          <div className={`w-8 h-5 rounded bg-gradient-to-tr ${cardColor} border border-white/10`} />
          <span className={`text-xs font-extrabold ${themeClass('text-white', 'text-slate-900')}`}>
            {instance.customName || formatCardName(template?.name || 'Card')}
          </span>
        </div>
        
        {/* Mini Progress Bar / Savings Display */}
        <div className="flex items-center gap-2">
          {cardFee > 0 ? (
            <>
              <div className="w-20 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min((recouped / cardFee) * 100, 100)}%` }} />
              </div>
              <span className="text-[10px] font-mono font-bold">${recouped} / ${cardFee}</span>
            </>
          ) : (
            <span className="text-[10px] font-mono font-bold text-emerald-500 dark:text-emerald-400">
              {language === 'zh' ? `已省 $${recouped}` : `$${recouped} saved`}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0">
      {/* A. Upper Part: Realistic Virtual Credit Card Face (1.58:1 Ratio) */}
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: isPressed
            ? 'scale3d(0.98, 0.98, 1)'
            : isHovered 
            ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)` 
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isPressed
            ? 'transform 0.1s ease-out'
            : isHovered 
            ? 'none' 
            : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
        className={`aspect-[1.58/1] w-full rounded-2xl relative p-4 flex flex-col justify-between overflow-hidden shadow-xl select-none bg-gradient-to-tr ${cardColor} border hover:shadow-2xl hover:shadow-purple-500/10 dark:hover:shadow-purple-500/15 hover:border-purple-500/30 group/card ${
          isSilverCard ? 'text-slate-900 font-extrabold' : 'text-white'
        } ${
          isRecouped 
            ? 'ring-2 ring-amber-500/50 dark:ring-amber-400/35 border-amber-500/30 shadow-lg shadow-amber-500/5'
            : isSilverCard
            ? 'border-slate-300/60 shadow-md shadow-slate-200/10'
            : 'border-purple-900/20'
        }`}
      >
        {/* Hover Dynamic Metallic Gloss Sheen (Moves with cursor) */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-350 opacity-0 group-hover/card:opacity-100 z-20"
          style={{
            background: `radial-gradient(circle at ${gloss.x}% ${gloss.y}%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 65%)`
          }}
        />

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

        {/* Dynamic Welcome Offer (SUB) Progress Bar (Glanceable at card face!) */}
        {showSub && (
          <div className="z-10 relative mb-1.5 mt-auto">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider mb-1">
              <span className={isSilverCard ? 'text-slate-900' : 'text-white/80'}>
                {t('welcomeOffer')}
              </span>
              <span className={`font-bold ${isSilverCard ? 'text-amber-900' : 'text-amber-400'} ${subDaysLeft <= 7 && subDaysLeft > 0 ? 'animate-pulse text-red-500' : ''}`}>
                {subDaysLeft <= 0 
                  ? t('expired') 
                  : t('daysLeft').replace('{days}', String(subDaysLeft))}
              </span>
            </div>
            <div className={`w-full h-1 rounded-full overflow-hidden border ${isSilverCard ? 'bg-slate-200/60 border-slate-300/30' : 'bg-white/10 border-white/10'}`}>
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${Math.min((subSpent / (subRequirement || 1)) * 100, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[7.5px] font-mono font-bold mt-0.5">
              <span className={isSilverCard ? 'text-slate-800' : 'text-white/60'}>${subSpent.toLocaleString()} / ${subRequirement.toLocaleString()}</span>
              <span className={isSilverCard ? 'text-slate-800' : 'text-white/60'}>{Math.round((subSpent / (subRequirement || 1)) * 100)}%</span>
            </div>
          </div>
        )}

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
            {resolveCardNetwork(instance.bank || template?.bank, instance.templateId, currency)}
          </span>
        </div>
      </div>

      {/* B. Lower Part: Glassmorphic Analytics & Action Tray (Attached) */}
      <div className={`p-4 rounded-2xl border border-t-0 rounded-t-none flex flex-col justify-between transition-all duration-250 -mt-3 shadow-md ${
        isCardExpanded ? 'pt-5.5 pb-4' : 'pt-4.5 pb-3'
      } ${
        themeClass(
          'bg-slate-900/45 border-slate-850/80 shadow-black/10', 
          'bg-white/90 border-slate-200 shadow-slate-100/50'
        )
      }`}>
        {/* Accordion Toggle & Actions Panel (One single elegant full-width control button!) */}
        <div className={`w-full flex transition-all duration-300 ${isCardExpanded ? 'mt-2.5' : 'mt-1.5'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCardExpanded(instance.id);
            }}
            className={`w-full px-4.5 py-2.5 rounded-xl border text-[9.5px] font-black tracking-widest uppercase flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
              themeClass(
                'bg-white/5 hover:bg-white/10 border-white/10 text-slate-100',
                'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-800 shadow-sm'
              )
            }`}
          >
            <span className="flex items-center gap-1">
              <span>📊 {isCardExpanded ? t('hideDetails') : t('showDetails')}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 transform ${
              isCardExpanded ? 'rotate-180' : 'rotate-0'
            }`} />
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
                      {t('flatRateCard')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 🧠 ROI Intelligence & AI Advisor */}
            <div className={`mt-3 p-3 rounded-xl border text-left ${
              themeClass('bg-white/5 border-white/5', 'bg-slate-955/5 border-slate-800/10')
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`text-[9px] font-black uppercase tracking-wider ${themeClass('text-purple-400', 'text-purple-600')}`}>
                  {t('roiAdvisor')}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAiPrompt(language === 'zh' 
                      ? `分析我的卡片 ${instance.customName || template?.name} 的 ROI。数据如下：年费 $${roi.totalAnnualFee}，已回血 $${roi.totalRecouped}，ROI 为 ${roi.roiPercent}%，有效年费 $${roi.effectiveAnnualFee}。请给出降级或保留的建议。`
                      : `Analyze the ROI for my card ${instance.customName || template?.name}. Data: Annual Fee $${roi.totalAnnualFee}, Recouped $${roi.totalRecouped}, ROI is ${roi.roiPercent}%, Effective Annual Fee $${roi.effectiveAnnualFee}. Please suggest whether to downgrade or keep it.`);
                  }}
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-600 text-white hover:bg-purple-500 transition active:scale-95 cursor-pointer"
                >
                  {t('wakeAi')}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className={`text-[8px] uppercase font-extrabold ${themeClass('text-slate-400', 'text-slate-500')}`}>{t('roiPercent')}</p>
                  <p className={`font-mono font-black text-lg mt-0.5 ${roi.roiPercent >= 100 || roi.roiPercent === Infinity ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {roi.roiPercent === Infinity ? t('pureProfit') : `${roi.roiPercent}%`}
                  </p>
                </div>
                <div>
                  <p className={`text-[8px] uppercase font-extrabold ${themeClass('text-slate-400', 'text-slate-500')}`}>{t('effectiveAf')}</p>
                  <p className={`font-mono font-black text-lg mt-0.5 ${themeClass('text-white', 'text-slate-900')}`}>
                    ${roi.effectiveAnnualFee}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits preview inline list */}
          <div className="space-y-1 text-left">
            {benefits.map((b) => (
              <div key={b.id} className={`flex flex-col text-[10px] p-2 rounded border gap-1 ${
                themeClass(
                  'bg-slate-955/40 border-white/5 text-slate-200',
                  'bg-slate-50 border-slate-250/60 text-slate-800 font-semibold shadow-sm'
                )
              }`}>
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate pr-2 flex items-center gap-1.5 min-w-0">
                    <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider shrink-0 ${
                      b.resetPeriod === 'monthly'
                        ? themeClass('bg-blue-500/20 text-blue-300 border border-blue-500/20', 'bg-blue-50 text-blue-600 border border-blue-200')
                        : b.resetPeriod === 'quarterly'
                        ? themeClass('bg-purple-500/20 text-purple-300 border border-purple-500/20', 'bg-purple-50 text-purple-600 border border-purple-200')
                        : (b.resetPeriod === 'annual-calendar' || b.resetPeriod === 'annual-anniversary')
                        ? themeClass('bg-amber-500/20 text-amber-300 border border-amber-500/20', 'bg-amber-50 text-amber-600 border border-amber-200')
                        : themeClass('bg-slate-500/20 text-slate-300 border border-slate-500/20', 'bg-slate-100 text-slate-600 border border-slate-250')
                    }`}>
                      {b.resetPeriod === 'monthly' ? t('perkPeriodMonthly') :
                       b.resetPeriod === 'quarterly' ? t('perkPeriodQuarterly') :
                       (b.resetPeriod === 'annual-calendar' || b.resetPeriod === 'annual-anniversary') ? t('perkPeriodAnnual') :
                       t('perkPeriodOnce')}
                    </span>
                    <span className="truncate font-bold">{b.name}</span>
                  </span>
                  <span className={`font-extrabold shrink-0 ${themeClass('text-white', 'text-slate-900')}`}>${b.value}</span>
                </div>

                {/* Sub-categories pill badges for rotating benefits */}
                {b.subCategories && b.subCategories.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pl-6 pt-0.5">
                    {b.subCategories.map((sub, idx) => (
                      <span key={idx} className={`px-1.5 py-0.2 rounded-[4px] text-[8.5px] font-black tracking-wider uppercase border ${
                        themeClass('bg-slate-900 text-amber-400 border-slate-800', 'bg-slate-100 text-amber-700 border-slate-200')
                      }`}>
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Active Temporary Offers Block (Always visible, with contextual + Add button!) */}
          <div className="mt-3.5 pt-3.5 border-t border-white/10 dark:border-black/5 text-left">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-[8px] font-black uppercase tracking-widest ${
                themeClass('text-teal-400', 'text-teal-800')
              }`}>
                {t('tempOffers')}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddOfferInstanceId(instance.id);
                }}
                className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border transition active:scale-95 cursor-pointer ${
                  themeClass(
                    'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300',
                    'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-700'
                  )
                }`}
              >
                {language === 'zh' ? '+ 新增临时福利' : '+ Add Offer'}
              </button>
            </div>
            
            {instance.instanceOffers && instance.instanceOffers.length > 0 ? (
              <div className="space-y-1 mt-2.5">
                {instance.instanceOffers.map((offer) => (
                  <div 
                    key={offer.id} 
                    className={`flex items-center justify-between text-[10px] p-1.5 rounded border ${
                      themeClass(
                        'bg-teal-500/10 border-teal-500/15 text-slate-200',
                        'bg-teal-50 border-teal-100 text-teal-950 font-bold'
                      )
                    }`}
                  >
                    <span className="truncate pr-2">{offer.name}</span>
                    <div className={`flex items-center gap-1.5 shrink-0 font-extrabold ${themeClass('text-white', 'text-teal-950')}`}>
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
            ) : (
              <p className={`text-[9px] font-medium italic opacity-60 mt-2 ${themeClass('text-slate-405', 'text-slate-500')}`}>
                {language === 'zh' ? '无活跃的临时返点福利 (点击右上角添加)' : 'No active temporary offers linked yet.'}
              </p>
            )}
            {/* ⚙️ Premium Guarded Danger & Utility Zone (Symmetrical divided row!) */}
            <div className="flex items-center justify-between gap-2 pt-3.5 mt-3.5 border-t border-dashed border-slate-200/60 dark:border-white/10 select-none text-[9.5px] font-extrabold uppercase tracking-widest">
              {/* Website link */}
              {template?.officialUrl ? (
                <a
                  href={template.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center gap-1 transition cursor-pointer hover:underline ${
                    themeClass('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-900')
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('cardActionWebsite')}</span>
                </a>
              ) : (
                <div className="opacity-0 pointer-events-none" />
              )}
              
              {/* Delete Card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCard(instance.id);
                }}
                className="text-rose-500 hover:text-rose-450 dark:text-rose-400 dark:hover:text-rose-350 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('cardActionDelete')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
