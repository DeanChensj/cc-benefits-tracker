import { Plus, Trash2, ExternalLink, Edit3, ChevronDown } from 'lucide-react';
import { CARDS_DB, CARD_MULTIPLIERS } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import { getCardPotentialValue } from '../utils/dateUtils';

interface WalletCreditCardProps {
  instance: OwnedCardInstance;
  editingInstanceId: string | null;
  setEditingInstanceId: (id: string | null) => void;
  isCardExpanded: boolean;
  toggleCardExpanded: (id: string) => void;
  getCardRecoupedValue: (id: string) => number;
  handleAddCard: (templateId: string) => void;
  handleAddCustomCard: (card: any) => void;
  handleRemoveCard: (instanceId: string) => void;
  renameCard: (instanceId: string, name: string) => void;
  setCardOpenDate: (instanceId: string, dateStr: string) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  updateCardMultipliers: (instanceId: string, multipliers: any) => void;
  toggleSignupBonus: (instanceId: string) => void;
  updateSignupBonusValue: (instanceId: string, value: number) => void;
  setAddOfferInstanceId: (instanceId: string) => void;
  themeClass: (dark: string, light: string) => string;
}

export function WalletCreditCard({
  instance,
  editingInstanceId,
  setEditingInstanceId,
  isCardExpanded,
  toggleCardExpanded,
  getCardRecoupedValue,
  handleAddCard,
  handleAddCustomCard,
  handleRemoveCard,
  renameCard,
  setCardOpenDate,
  removeInstanceOffer,
  updateCardMultipliers,
  toggleSignupBonus,
  updateSignupBonusValue,
  setAddOfferInstanceId,
  themeClass,
}: WalletCreditCardProps) {
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

  const defaultDining = CARD_MULTIPLIERS[instance.templateId]?.dining || 1;
  const defaultTravel = CARD_MULTIPLIERS[instance.templateId]?.travel || 1;
  const defaultShopping = CARD_MULTIPLIERS[instance.templateId]?.shopping || 1;
  const defaultEntertainment = CARD_MULTIPLIERS[instance.templateId]?.entertainment || 1;

  const canCustomizePoints = instance.templateId === 'custom' || 
                             instance.templateId === 'chase-freedom-flex' || 
                             instance.templateId === 'discover-it-cashback';

  return (
    <div 
      className={`p-4 rounded-xl border flex flex-col justify-between transition bg-gradient-to-tr ${cardColor} relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] duration-300 ${
        isRecouped 
          ? 'ring-2 ring-amber-500/50 dark:ring-amber-400/40 shadow-lg shadow-amber-500/5 scale-[1.01] border-amber-500/25' 
          : isSilverCard
          ? themeClass('border-slate-300 text-slate-900 shadow-sm', 'border-slate-300 text-slate-900 shadow-sm')
          : themeClass('border-purple-900/30 hover:border-purple-800/50', 'border-slate-250/40 hover:border-slate-300 shadow-md text-slate-100')
      }`}
    >
      <div className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
              isSilverCard
                ? 'bg-slate-955/15 text-slate-800 border border-slate-955/10 font-black'
                : 'bg-purple-500/15 text-purple-350 dark:text-purple-400 border border-purple-500/20'
            }`}>
              {instance.templateId === 'custom' ? (instance.bank || 'Custom') : (template?.bank || 'Standard')}
            </span>
            {template?.officialUrl && (
              <a
                href={template.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition active:scale-90 cursor-pointer ${
                  isSilverCard ? 'text-slate-800/70 hover:text-slate-955' : 'text-white/60 hover:text-white'
                }`}
                title="View Official Application Details Page"
              >
                <ExternalLink className="w-3 h-3 stroke-[2.5]" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {instance.templateId === 'custom' ? (
              <button
                onClick={() => {
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
                className={`p-1 rounded transition cursor-pointer active:scale-90 ${
                  isSilverCard ? 'text-slate-700 hover:text-slate-950 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title="Duplicate card"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={() => handleAddCard(instance.templateId)}
                className={`p-1 rounded transition cursor-pointer active:scale-90 ${
                  isSilverCard ? 'text-slate-700 hover:text-slate-955 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title="Add another instance"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
            <button
              onClick={() => handleRemoveCard(instance.id)}
              className={`p-1 rounded transition cursor-pointer active:scale-90 ${
                isSilverCard ? 'text-red-700 hover:text-red-850 hover:bg-red-500/10' : 'text-red-400 hover:text-red-350 hover:bg-red-550/10'
              }`}
              title="Delete card instance"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {editingInstanceId === instance.id ? (
        <input
          type="text"
          value={instance.customName}
          onChange={(e) => renameCard(instance.id, e.target.value)}
          onBlur={() => {
            const trimmed = instance.customName.trim();
            const temp = CARDS_DB.find((t) => t.id === instance.templateId);
            const fallback = instance.templateId === 'custom' ? 'Custom Card' : (temp?.name || 'Credit Card');
            renameCard(instance.id, trimmed || fallback);
            setEditingInstanceId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const trimmed = instance.customName.trim();
              const temp = CARDS_DB.find((t) => t.id === instance.templateId);
              const fallback = instance.templateId === 'custom' ? 'Custom Card' : (temp?.name || 'Credit Card');
              renameCard(instance.id, trimmed || fallback);
              setEditingInstanceId(null);
            } else if (e.key === 'Escape') {
              setEditingInstanceId(null);
            }
          }}
          autoFocus
          className="bg-slate-955/80 border border-purple-500/50 text-white text-xs rounded px-2 py-1 font-semibold focus:outline-none w-full mt-2"
        />
      ) : (
        <h4 
          onClick={() => setEditingInstanceId(instance.id)}
          className={`text-base font-bold mt-1.5 flex items-center gap-1 cursor-pointer transition ${
            isSilverCard ? 'hover:text-slate-850 text-slate-950 font-black' : 'hover:text-purple-300 text-white'
          }`}
          title="Click to rename"
        >
          {instance.customName}
          <Edit3 className={`w-3 h-3 shrink-0 ${isSilverCard ? 'text-slate-850/60' : 'text-slate-400'}`} />
        </h4>
      )}

      <p className={`text-[11px] mt-0.5 font-medium ${isSilverCard ? 'text-slate-900/80 font-semibold' : 'text-slate-350'}`}>
        {benefits.length} perks (Potential value: ${getCardPotentialValue(benefits)}/yr)
      </p>

      {/* Annual Fee Recoup Progress circular ring */}
      {cardFee > 0 ? (
        <div className={`flex items-center gap-3 mt-3.5 max-w-[240px] p-2 rounded-xl border text-left shadow-inner ${
          isSilverCard 
            ? 'bg-black/5 border-black/10 text-slate-900' 
            : 'bg-white/5 border-white/5 text-white'
        }`}>
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
            <svg className="w-10 h-10 transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="20"
                cy="20"
                r="15"
                className={`fill-none stroke-current ${isSilverCard ? 'text-black/10' : 'text-white/10'}`}
                strokeWidth="3"
              />
              {/* Foreground Circle */}
              <circle
                cx="20"
                cy="20"
                r="15"
                className={`fill-none stroke-current transition-all duration-500 ${
                  isRecouped 
                    ? 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.35)]' 
                    : isSilverCard ? 'text-slate-800' : 'text-purple-500 dark:text-purple-400'
                }`}
                strokeWidth="3"
                strokeDasharray="94.25"
                strokeDashoffset={94.25 - (94.25 * Math.min(recouped / cardFee, 1))}
                strokeLinecap="round"
              />
            </svg>
            {/* Center Percentage / Checkmark */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isRecouped ? (
                <span className={`text-xs font-black ${isSilverCard ? 'text-slate-905' : 'text-emerald-500 dark:text-emerald-400'}`}>✓</span>
              ) : (
                <span className={`text-[8.5px] font-extrabold font-mono ${isSilverCard ? 'text-slate-900' : 'text-slate-200'}`}>
                  {Math.round((recouped / cardFee) * 100)}%
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-grow flex flex-col justify-center">
            <div className={`flex justify-between items-baseline text-[9.5px] font-extrabold ${isSilverCard ? 'text-slate-900' : 'text-white'}`}>
              <span>Recouped</span>
              <span className={`font-mono text-[11px] font-black ${isRecouped ? (isSilverCard ? 'text-emerald-800' : 'text-emerald-400') : ''}`}>
                ${recouped}
              </span>
            </div>
            <div className={`flex justify-between items-center text-[8.5px] font-extrabold mt-0.5 ${isSilverCard ? 'text-slate-700' : 'text-slate-300'}`}>
              <span>Fee: ${cardFee}</span>
              {isRecouped && (
                <span className={`text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded shrink-0 animate-pulse ${
                  themeClass('bg-emerald-500/10 text-emerald-600 border border-emerald-500/20', 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                }`}>
                  Profit!
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className={`text-[9px] font-bold mt-2.5 flex items-center gap-1 ${isSilverCard ? 'text-emerald-855 font-extrabold' : 'text-emerald-400'}`}>
          <span>✓ No Annual Fee (Free Card!)</span>
        </p>
      )}

      {/* 1. Accordion Expand Toggle Bar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleCardExpanded(instance.id);
        }}
        className={`w-full mt-3 px-2.5 py-1.5 rounded-lg border text-[9px] font-extrabold tracking-wider uppercase flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
          isSilverCard
            ? 'bg-slate-950/5 border-slate-950/10 text-slate-900 hover:bg-slate-950/10'
            : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {isCardExpanded ? '▲ Hide Details' : '▼ Show Details'}
          <span className={`text-[8px] opacity-75 lowercase font-semibold px-1 rounded ${
            isSilverCard ? 'bg-black/10' : 'bg-white/10'
          }`}>
            {benefits.length} perks {instance.instanceOffers && instance.instanceOffers.length > 0 ? `+ ${instance.instanceOffers.length} offers` : ''}
          </span>
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 transform ${
          isCardExpanded ? 'rotate-180' : 'rotate-0'
        }`} />
      </button>

      {/* 2. Collapsible Drawer Panel */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isCardExpanded
          ? 'max-h-[600px] opacity-100 border-t border-dashed border-white/10 dark:border-black/5 pt-3 mt-3'
          : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        {/* Benefits preview inline list */}
        <div className="space-y-1 text-left">
          {benefits.slice(0, 3).map((b) => (
            <div key={b.id} className={`flex items-center justify-between text-[10px] p-1 rounded ${
              isSilverCard 
                ? 'bg-slate-950/10 border border-black/5 text-slate-900 font-bold' 
                : 'bg-slate-955/40 border border-white/5 text-slate-300'
            }`}>
              <span className="truncate">{b.name}</span>
              <span className={`font-bold ${isSilverCard ? 'text-slate-950 font-black' : 'text-white'}`}>${b.value}</span>
            </div>
          ))}
          {benefits.length > 3 && (
            <p className={`text-[9px] text-right font-medium ${isSilverCard ? 'text-slate-900/70 font-semibold' : 'text-slate-400'}`}>+ {benefits.length - 3} more perks</p>
          )}
        </div>

        {/* Google Drive / Instance Custom Offers List */}
        {instance.instanceOffers && instance.instanceOffers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 dark:border-black/5 space-y-1.5 text-left">
            <p className={`text-[8px] font-black uppercase tracking-widest ${
              isSilverCard ? 'text-indigo-950' : 'text-purple-400 dark:text-purple-500'
            }`}>Active Temporary Offers</p>
            <div className="space-y-1">
              {instance.instanceOffers.map((offer) => (
                <div 
                  key={offer.id} 
                  className={`flex items-center justify-between text-[10px] p-1.5 rounded border ${
                    isSilverCard 
                      ? 'bg-black/5 border-black/5 text-slate-900 font-bold' 
                      : 'bg-purple-500/10 border-purple-500/15 text-slate-200'
                  }`}
                >
                  <span className="truncate pr-2">{offer.name}</span>
                  <div className={`flex items-center gap-1.5 shrink-0 font-bold ${isSilverCard ? 'text-slate-950' : 'text-white'}`}>
                    <span>+${offer.value}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeInstanceOffer(instance.id, offer.id);
                      }}
                      className="text-slate-400 hover:text-red-400 transition cursor-pointer active:scale-90"
                      title="Remove Offer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.5. Premium Secured Sign-Up Bonus (SUB) Leverager with custom override */}
        {template?.signupBonusValue !== undefined && (
          <div className="mt-3 pt-3 border-t border-dashed border-white/10 dark:border-black/5 text-left animate-fade-in">
            <div className={`flex items-center justify-between gap-3 p-2 rounded-xl border transition ${
              isSilverCard
                ? 'bg-black/5 border-black/5 text-slate-900 font-bold'
                : 'bg-slate-955/30 border-white/5 text-slate-300'
            }`}>
              <label className="flex items-center gap-2 text-[10px] font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!instance.signupBonusActive}
                  onChange={() => toggleSignupBonus(instance.id)}
                  className="w-3.5 h-3.5 text-purple-600 rounded border-slate-800 focus:ring-purple-500 cursor-pointer"
                />
                <span> Secured Sign-Up Bonus (SUB)</span>
              </label>
              {instance.signupBonusActive && (
                <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                  <span className="text-slate-450 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    value={instance.signupBonusValue !== undefined ? instance.signupBonusValue : ''}
                    onChange={(e) => updateSignupBonusValue(instance.id, Number(e.target.value) || 0)}
                    className={`w-12 text-center text-[10px] font-black rounded focus:outline-none py-0.5 border ${
                      isSilverCard
                        ? 'bg-slate-950/10 border-slate-950/20 text-slate-950'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Premium Custom Point Multipliers Editor */}
        {canCustomizePoints && (
          <div className="mt-3 pt-3 border-t border-dashed border-white/10 dark:border-black/5 space-y-2 text-left">
            <p className={`text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1 ${
              isSilverCard ? 'text-indigo-955' : 'text-purple-400 dark:text-purple-500'
            }`}>
              <span>⚡ Custom Point Multipliers</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Dining */}
              <div className={`flex items-center justify-between gap-2 border p-1.5 rounded-lg ${
                isSilverCard 
                  ? 'bg-black/5 border-black/5 text-slate-900' 
                  : 'bg-slate-955/25 border-white/5 text-slate-300'
              }`}>
                <span className={`text-[9px] font-bold ${isSilverCard ? 'text-slate-850' : 'text-slate-400'}`}>🍽️ Dining</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder={`${defaultDining}x`}
                  value={instance.multipliers?.dining !== undefined ? instance.multipliers.dining : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(1, Number(e.target.value));
                    updateCardMultipliers(instance.id, {
                      ...instance.multipliers,
                      dining: val
                    });
                  }}
                  className={`w-9 text-center text-[10px] font-black rounded focus:outline-none py-0.2 ${
                    isSilverCard 
                      ? 'bg-slate-950/15 border border-slate-950/20 text-slate-950' 
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                />
              </div>
              {/* Travel */}
              <div className={`flex items-center justify-between gap-2 border p-1.5 rounded-lg ${
                isSilverCard 
                  ? 'bg-black/5 border-black/5 text-slate-900' 
                  : 'bg-slate-955/25 border-white/5 text-slate-300'
              }`}>
                <span className={`text-[9px] font-bold ${isSilverCard ? 'text-slate-855' : 'text-slate-400'}`}>✈️ Travel</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder={`${defaultTravel}x`}
                  value={instance.multipliers?.travel !== undefined ? instance.multipliers.travel : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(1, Number(e.target.value));
                    updateCardMultipliers(instance.id, {
                      ...instance.multipliers,
                      travel: val
                    });
                  }}
                  className={`w-9 text-center text-[10px] font-black rounded focus:outline-none py-0.2 ${
                    isSilverCard 
                      ? 'bg-slate-950/15 border border-slate-950/20 text-slate-950' 
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                />
              </div>
              {/* Shopping / Groceries */}
              <div className={`flex items-center justify-between gap-2 border p-1.5 rounded-lg ${
                isSilverCard 
                  ? 'bg-black/5 border-black/5 text-slate-900' 
                  : 'bg-slate-955/25 border-white/5 text-slate-300'
              }`}>
                <span className={`text-[9px] font-bold ${isSilverCard ? 'text-slate-855' : 'text-slate-400'}`}>🛍️ Groceries</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder={`${defaultShopping}x`}
                  value={instance.multipliers?.shopping !== undefined ? instance.multipliers.shopping : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(1, Number(e.target.value));
                    updateCardMultipliers(instance.id, {
                      ...instance.multipliers,
                      shopping: val
                    });
                  }}
                  className={`w-9 text-center text-[10px] font-black rounded focus:outline-none py-0.2 ${
                    isSilverCard 
                      ? 'bg-slate-950/15 border border-slate-950/20 text-slate-955' 
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                />
              </div>
              {/* Entertainment / Streaming */}
              <div className={`flex items-center justify-between gap-2 border p-1.5 rounded-lg ${
                isSilverCard 
                  ? 'bg-black/5 border-black/5 text-slate-900' 
                  : 'bg-slate-955/25 border-white/5 text-slate-300'
              }`}>
                <span className={`text-[9px] font-bold ${isSilverCard ? 'text-slate-855' : 'text-slate-400'}`}>🎬 Streaming</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder={`${defaultEntertainment}x`}
                  value={instance.multipliers?.entertainment !== undefined ? instance.multipliers.entertainment : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(1, Number(e.target.value));
                    updateCardMultipliers(instance.id, {
                      ...instance.multipliers,
                      entertainment: val
                    });
                  }}
                  className={`w-9 text-center text-[10px] font-black rounded focus:outline-none py-0.2 ${
                    isSilverCard 
                      ? 'bg-slate-950/15 border border-slate-950/20 text-slate-950' 
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className={`text-[10px] font-bold ${isSilverCard ? 'text-slate-800' : 'text-slate-350'}`}>
            Opened:
          </label>
          <input
            type="date"
            value={instance.cardOpenDate}
            onChange={(e) => setCardOpenDate(instance.id, e.target.value)}
            className={`text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer font-medium transition border ${
              isSilverCard
                ? 'bg-slate-950/10 border-slate-950/10 text-slate-950'
                : 'bg-slate-955 border border-slate-800 text-slate-300'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => setAddOfferInstanceId(instance.id)}
          className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg text-[9px] transition active:scale-95 cursor-pointer border ${
            isSilverCard
              ? 'bg-slate-950/5 hover:bg-slate-950/10 border-slate-950/10 text-slate-900'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-300 dark:bg-slate-955 dark:hover:bg-slate-850 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          <Plus className="w-2.5 h-2.5 stroke-[3]" />
          Add Offer
        </button>
      </div>
    </div>
  );
}
