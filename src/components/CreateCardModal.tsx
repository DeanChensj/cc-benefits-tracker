import { useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { useCardStore, createWelcomeOffer } from '../store/useCardStore';
import { translations, resolveCardNetwork } from '../utils/i18n';
import type { PointCurrency, Benefit } from '../data/cards.db';
import { ZenModal } from './ZenModal';
import { WelcomeOfferSection } from './WelcomeOfferSection';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  addCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  getLocalDateString: () => string;
}

export function CreateCardModal({ 
  isOpen, 
  onClose, 
  theme, 
  addCustomCard, 
  getLocalDateString
}: CreateCardModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  const getBorderColorClass = (color: string) => {
    if (color.includes('purple')) return 'border-l-purple-500 dark:border-l-purple-400';
    if (color.includes('teal')) return 'border-l-teal-500 dark:border-l-teal-400';
    if (color.includes('rose') || color.includes('red')) return 'border-l-red-500 dark:border-l-red-400';
    if (color.includes('emerald') || color.includes('green')) return 'border-l-emerald-500 dark:border-l-emerald-400';
    return 'border-l-slate-500 dark:border-l-slate-400';
  };

  // Custom card builder states
  const [customBank, setCustomBank] = useState('');
  const [customCardName, setCustomCardName] = useState('');
  const [customAnnualFee, setCustomAnnualFee] = useState(0);
  const [customColor, setCustomColor] = useState('from-purple-600 to-indigo-900');
  const [customCardOpenDate, setCustomCardOpenDate] = useState(getLocalDateString());
  const [customPointCurrency, setCustomPointCurrency] = useState<PointCurrency>('cash');
  const [customMultipliers, setCustomMultipliers] = useState<Record<string, number>>({ dining: 1, travel: 1, shopping: 1, entertainment: 1 });
  const [newBenefits, setNewBenefits] = useState<{
    name: string;
    value: number;
    resetPeriod: 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed';
    category: 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other';
    description: string;
    expirationDate?: string;
    spendingLimit?: number;
  }[]>([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCardName = customCardName.trim() || (customBank.trim() ? `${customBank.trim()} Card` : 'Custom Card');

    const preparedBenefits = newBenefits
      .filter((b) => b.name.trim() !== '')
      .map((b) => ({
        ...b,
        id: `benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        value: Number(b.value) || 0,
        spendingLimit: b.spendingLimit ? Number(b.spendingLimit) : undefined
      }));

    const subValue = Number((document.getElementById('create-sub-value') as HTMLInputElement)?.value) || 0;
    const subRequirement = Number((document.getElementById('create-sub-requirement') as HTMLInputElement)?.value) || 0;
    const subMonths = Number((document.getElementById('create-sub-months') as HTMLInputElement)?.value) || 3;

    const subActiveInput = document.getElementById('create-sub-active') as HTMLInputElement;
    const instanceOffers: Benefit[] = [];
    if (subActiveInput?.checked && subValue > 0) {
      instanceOffers.push(
        createWelcomeOffer(customCardOpenDate, subRequirement, subMonths, subValue)
      );
    }

    addCustomCard({
      templateId: 'custom',
      customName: finalCardName,
      bank: customBank.trim() || 'Custom',
      color: customColor,
      cardOpenDate: customCardOpenDate,
      annualFee: customAnnualFee || 0,
      pointCurrency: customPointCurrency,
      signupBonusActive: subValue > 0,
      signupBonusValue: subValue,
      multipliers: customMultipliers,
      customBenefits: preparedBenefits,
      instanceOffers: instanceOffers,
    });

    // Reset states
    setCustomBank('');
    setCustomCardName('');
    setCustomAnnualFee(0);
    setCustomColor('from-purple-600 to-indigo-900');
    setCustomCardOpenDate(getLocalDateString());
    setCustomPointCurrency('cash');
    setCustomMultipliers({ dining: 1, travel: 1, shopping: 1, entertainment: 1 });
    setNewBenefits([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);
    onClose();
  };  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      title={t('formCreateCardTitle')}
      description={t('formCreateCardDesc')}
      icon={<CreditCard className="w-5 h-5" />}
      maxWidthClass="max-w-lg"
    >

        {/* Real-Time Muted Zen Index Card Preview (Zen Architectural Stamp) */}
        <div className="mb-5 flex justify-center select-none">
          <div className={`aspect-[1.58/1] w-full max-w-[220px] rounded-xl relative p-3.5 flex flex-col justify-between transition-all duration-300 border ${
            themeClass(
              'bg-slate-950/50 border-slate-800/95 shadow-[0_4px_24px_rgba(0,0,0,0.4),_inset_0_1px_0_rgba(255,255,255,0.04)] text-slate-300', 
              'bg-slate-50 border border-slate-250/85 shadow-[0_4px_16px_rgba(15,23,42,0.02),_inset_0_1px_0_rgba(255,255,255,0.8)] text-slate-700'
            )
          } border-l-[3.5px] ${getBorderColorClass(customColor)}`}>
            {/* Header */}
            <div className="flex items-center justify-between z-10">
              <span className={`text-[6.5px] font-black px-1.5 py-0.2 rounded uppercase tracking-widest shrink-0 truncate max-w-[75px] ${
                themeClass('bg-slate-900/80 border border-slate-800 text-slate-300', 'bg-white border border-slate-200 text-slate-700')
              }`}>
                {customBank.trim() || 'BANK'}
              </span>
              <span className={`text-[5.5px] font-extrabold tracking-wider shrink-0 opacity-60 ${themeClass('text-slate-400', 'text-slate-500')}`}>
                {t('openedLabelUpper')}: {customCardOpenDate}
              </span>
            </div>

            {/* Hollow Abstract EMV Chip & Contactless Antenna */}
            <div className="flex items-center gap-1.5 my-auto z-10 scale-[0.75] origin-left shrink-0">
              <div className={`w-5 h-3.5 rounded border shrink-0 ${
                themeClass('border-slate-800 bg-transparent', 'border-slate-250 bg-transparent')
              }`} />
              <div className={`flex items-center gap-[1px] rotate-90 text-[5px] opacity-40 ${themeClass('text-slate-400', 'text-slate-500')}`}>
                <span>(</span><span>(</span><span>(</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between z-10 min-w-0 select-none">
              <div className="min-w-0 flex-grow mr-2">
                <h4 className={`text-[9.5px] font-black uppercase tracking-wide truncate ${themeClass('text-slate-100', 'text-slate-900')}`}>
                  {customCardName.trim() || 'CUSTOM CARD'}
                </h4>
                {customAnnualFee > 0 ? (
                  <p className={`text-[6px] uppercase tracking-wider opacity-65 font-extrabold mt-0.5 leading-none ${themeClass('text-slate-400', 'text-slate-500')}`}>
                    {t('feeLabelUpper')}: ${customAnnualFee}
                  </p>
                ) : (
                  <p className="text-[6px] uppercase tracking-wider font-black mt-0.5 leading-none text-emerald-500 dark:text-emerald-400">
                    {t('noFeeUpper')}
                  </p>
                )}
              </div>
              <span className={`text-[8px] font-black italic tracking-widest opacity-70 shrink-0 uppercase ${themeClass('text-slate-400', 'text-slate-500')}`}>
                {resolveCardNetwork(customBank, 'custom', customPointCurrency)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-[11px] select-none">
          
          {/* CHAPTER 1: CARD IDENTITY (发卡身份) */}
          <div className="space-y-3 text-left">
            <h4 className={`text-[9px] font-black uppercase tracking-[0.15em] ${themeClass('text-slate-500', 'text-slate-450')}`}>
              {t('cardIdentity')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[8.5px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-455', 'text-slate-500')}`}>{t('formBankName')}</label>
                <input
                  type="text"
                  required
                  list="major-banks"
                  placeholder={t('placeholderBankName')}
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-semibold transition ${
                    themeClass('bg-slate-950/50 border-slate-800/80 focus:border-purple-500/80 text-slate-200 focus:bg-slate-950', 'bg-slate-100 border-slate-200/90 focus:border-purple-500/80 text-slate-800 shadow-inner')
                  }`}
                />
                <datalist id="major-banks">
                  <option value="Amex" />
                  <option value="Chase" />
                  <option value="Citi" />
                  <option value="Capital One" />
                  <option value="Discover" />
                  <option value="Bilt" />
                  <option value="Barclays" />
                  <option value="HSBC" />
                  <option value="US Bank" />
                  <option value="Fidelity" />
                </datalist>
              </div>
              <div>
                <label className={`block text-[8.5px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-455', 'text-slate-500')}`}>{t('formCardName')}</label>
                <input
                  type="text"
                  placeholder={t('placeholderCardName')}
                  value={customCardName}
                  onChange={(e) => setCustomCardName(e.target.value)}
                  className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-semibold transition ${
                    themeClass('bg-slate-950/50 border-slate-800/80 focus:border-purple-500/80 text-slate-200 focus:bg-slate-950', 'bg-slate-100 border-slate-200/90 focus:border-purple-500/80 text-slate-800 shadow-inner')
                  }`}
                />
              </div>

              </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-[8.5px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-455', 'text-slate-500')}`}>{t('openDateLabel')}</label>
                <input
                  type="date"
                  required
                  value={customCardOpenDate}
                  onChange={(e) => setCustomCardOpenDate(e.target.value)}
                  className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-semibold cursor-pointer transition ${
                    themeClass('bg-slate-955 border-slate-800/80 text-slate-300 focus:border-purple-500', 'bg-slate-100 border-slate-200 text-slate-700 focus:border-purple-500')
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[8.5px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-455', 'text-slate-500')}`}>{t('formAnnualFee')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={customAnnualFee || ''}
                  onChange={(e) => setCustomAnnualFee(Number(e.target.value) || 0)}
                  className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-bold transition ${
                    themeClass('bg-slate-955 border-slate-800/80 focus:border-purple-500/80 text-slate-200', 'bg-slate-100 border-slate-200 focus:border-purple-500 text-slate-800 shadow-inner')
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[8.5px] font-bold uppercase tracking-wider mb-1.5 ${themeClass('text-slate-455', 'text-slate-500')}`}>{t('formCardColorTheme')}</label>
                <div className="flex gap-2 items-center pt-1.5 select-none">
                  {[
                    { class: 'from-purple-600 to-indigo-900', label: 'Violet' },
                    { class: 'from-teal-500 to-cyan-800', label: 'Lagoon' },
                    { class: 'from-rose-600 to-red-900', label: 'Lava' },
                    { class: 'from-emerald-600 to-green-900', label: 'Emerald' },
                    { class: 'from-slate-700 to-slate-900', label: 'Steel' }
                  ].map((c) => (
                    <button
                      key={c.class}
                      type="button"
                      onClick={() => setCustomColor(c.class)}
                      className={`w-5.5 h-5.5 rounded-full bg-gradient-to-tr ${c.class} border transition cursor-pointer active:scale-90 ${
                        customColor === c.class ? 'border-purple-500 scale-110 ring-2 ring-purple-500/30 dark:border-white' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CHAPTER 2: REWARD ENGINE (收益引擎) */}
          <div className="space-y-3 text-left pt-3.5 border-t border-slate-200/40 dark:border-slate-800/40">
            <h4 className={`text-[9px] font-black uppercase tracking-[0.15em] ${themeClass('text-slate-500', 'text-slate-455')}`}>
              {t('rewardEngine')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[8.5px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-455', 'text-slate-500')}`}>{t('earningCurrencyLabel')}</label>
                <select
                  value={customPointCurrency}
                  onChange={(e) => setCustomPointCurrency(e.target.value as PointCurrency)}
                  className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-bold cursor-pointer transition ${
                    themeClass('bg-slate-955 border-slate-800/80 text-slate-300 focus:border-purple-500', 'bg-slate-100 border-slate-200 text-slate-800 focus:border-purple-500 shadow-sm')
                  }`}
                >
                  <option value="cash">{t('curr_cash')}</option>
                  <option value="chase-ur">{t('curr_chase_ur')}</option>
                  <option value="amex-mr">{t('curr_amex_mr')}</option>
                  <option value="citi-typ">{t('curr_citi_typ')}</option>
                  <option value="capitalone-miles">{t('curr_capitalone_miles')}</option>
                  <option value="hyatt">{t('curr_hyatt')}</option>
                  <option value="marriott">{t('curr_marriott')}</option>
                  <option value="hilton">{t('curr_hilton')}</option>
                  <option value="ihg">{t('curr_ihg')}</option>
                  <option value="aa-miles">{t('curr_aa_miles')}</option>
                  <option value="ua-miles">{t('curr_ua_miles')}</option>
                  <option value="delta-miles">{t('curr_delta_miles')}</option>
                </select>
               </div>
            </div>

            <WelcomeOfferSection
              idPrefix="create"
              theme={theme}
            />

            {/* Category Point Multipliers customizers */}
            <div className="space-y-2">
              <label className={`block text-[8.5px] font-bold uppercase tracking-wider ${themeClass('text-slate-455', 'text-slate-500')}`}>
                {t('multipliersTitle')}
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {/* Dining */}
                <div className={`flex items-center justify-between gap-1.5 border px-2.5 py-1.5 rounded-xl ${
                  themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-100 border-slate-200/95 shadow-inner')
                }`}>
                  <span className="text-[10px]" title={t('catDining')}>🍽️</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={customMultipliers.dining}
                    onChange={(e) => setCustomMultipliers({ ...customMultipliers, dining: Math.max(1, Number(e.target.value)) })}
                    className={`w-8 text-center text-xs font-black rounded focus:outline-none py-0.5 border ${
                      themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Travel */}
                <div className={`flex items-center justify-between gap-1.5 border px-2.5 py-1.5 rounded-xl ${
                  themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-100 border-slate-200/95 shadow-inner')
                }`}>
                  <span className="text-[10px]" title={t('catTravel')}>✈️</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={customMultipliers.travel}
                    onChange={(e) => setCustomMultipliers({ ...customMultipliers, travel: Math.max(1, Number(e.target.value)) })}
                    className={`w-8 text-center text-xs font-black rounded focus:outline-none py-0.5 border ${
                      themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Shopping */}
                <div className={`flex items-center justify-between gap-1.5 border px-2.5 py-1.5 rounded-xl ${
                  themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-100 border-slate-200/95 shadow-inner')
                }`}>
                  <span className="text-[10px]" title={t('catShopping')}>🛍️</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={customMultipliers.shopping}
                    onChange={(e) => setCustomMultipliers({ ...customMultipliers, shopping: Math.max(1, Number(e.target.value)) })}
                    className={`w-8 text-center text-xs font-black rounded focus:outline-none py-0.5 border ${
                      themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Entertainment */}
                <div className={`flex items-center justify-between gap-1.5 border px-2.5 py-1.5 rounded-xl ${
                  themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-100 border-slate-200/95 shadow-inner')
                }`}>
                  <span className="text-[10px]" title={t('catEntertainment')}>🎬</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={customMultipliers.entertainment}
                    onChange={(e) => setCustomMultipliers({ ...customMultipliers, entertainment: Math.max(1, Number(e.target.value)) })}
                    className={`w-8 text-center text-xs font-black rounded focus:outline-none py-0.5 border ${
                      themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CHAPTER 3: CUSTOM PERKS (专属福利打卡待办) */}
          <div className={`border-t pt-3.5 mt-4 space-y-3 text-left border-slate-200/40 dark:border-slate-800/40`}>
            <div className="flex items-center justify-between mb-1">
              <h4 className={`text-[9px] font-black uppercase tracking-[0.15em] ${themeClass('text-slate-500', 'text-slate-455')}`}>
                {t('customPerks')}
              </h4>
              <button
                type="button"
                onClick={() => setNewBenefits([...newBenefits, { name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }])}
                className="flex items-center gap-1 text-[9.5px] font-extrabold text-purple-500 hover:text-purple-400 transition cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                {t('formAddPerkBtn')}
              </button>
            </div>

            {/* Recessed benefits well wrapper */}
            <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
              {newBenefits.map((benefit, idx) => (
                <div key={idx} className={`p-3.5 rounded-xl border space-y-3.5 relative transition-all duration-250 ${
                  themeClass('bg-slate-950/20 border-slate-800/60', 'bg-slate-100/30 border-slate-200 shadow-[inset_0_1px_2px_rgba(15,23,42,0.01)]')
                }`}>
                  {newBenefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNewBenefits(newBenefits.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition cursor-pointer p-0.5 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="grid grid-cols-12 gap-2.5">
                    <div className="col-span-6">
                      <label className="block text-[8.5px] font-bold uppercase text-slate-455 mb-0.8">{t('formOfferName')}</label>
                      <input
                        type="text"
                        placeholder={t('placeholderPerkName')}
                        value={benefit.name}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].name = e.target.value;
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-semibold ${
                          themeClass('bg-slate-900 border-slate-800 text-slate-200 focus:border-purple-500', 'bg-white border-slate-250 text-slate-800 focus:border-purple-500')
                        }`}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[8.5px] font-bold uppercase text-slate-455 mb-0.8">{t('formPerkValue')}</label>
                      <input
                        type="number"
                        placeholder="5"
                        value={benefit.value || ''}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].value = Number(e.target.value);
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-black ${
                          themeClass('bg-slate-900 border-slate-800 text-slate-200 focus:border-purple-500', 'bg-white border-slate-250 text-slate-800 focus:border-purple-500')
                        }`}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[8.5px] font-bold uppercase text-slate-455 mb-0.8" title="Leave blank for standard statement credits">{t('formPerkLimit')}</label>
                      <input
                        type="number"
                        placeholder={t('optional')}
                        value={benefit.spendingLimit || ''}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].spendingLimit = e.target.value ? Number(e.target.value) : undefined;
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2 py-1.5 focus:outline-none font-semibold ${
                          themeClass('bg-slate-900 border-slate-800 text-slate-200 focus:border-purple-500', 'bg-white border-slate-250 text-slate-800 focus:border-purple-500')
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[8.5px] font-bold uppercase text-slate-455 mb-0.8">{t('formResetPeriod')}</label>
                      <select
                        value={benefit.resetPeriod}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].resetPeriod = e.target.value as 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed';
                          if (e.target.value === 'fixed' && !updated[idx].expirationDate) {
                            updated[idx].expirationDate = getLocalDateString();
                          }
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer font-bold transition ${
                          themeClass('bg-slate-900 border-slate-800 text-slate-300 focus:border-purple-500', 'bg-white border-slate-250 text-slate-800 focus:border-purple-500')
                        }`}
                      >
                        <option value="monthly">{t('periodMonthly')}</option>
                        <option value="quarterly">{t('periodQuarterly')}</option>
                        <option value="semi-annual">{t('periodSemiAnnual')}</option>
                        <option value="annual-calendar">{t('periodAnnualCalendar')}</option>
                        <option value="annual-anniversary">{t('periodAnnualAnniversary')}</option>
                        <option value="fixed">{t('periodFixed')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-bold uppercase text-slate-455 mb-0.8">{t('formCategory')}</label>
                      <select
                        value={benefit.category}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].category = e.target.value as 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other';
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer font-bold transition ${
                          themeClass('bg-slate-900 border-slate-800 text-slate-300 focus:border-purple-500', 'bg-white border-slate-200 text-slate-800 focus:border-purple-500')
                        }`}
                      >
                        <option value="dining">{t('catDining')}</option>
                        <option value="travel">{t('catTravel')}</option>
                        <option value="shopping">{t('catShopping')}</option>
                        <option value="entertainment">{t('catEntertainment')}</option>
                        <option value="other">{t('catOther')}</option>
                      </select>
                    </div>
                  </div>

                  {benefit.resetPeriod === 'fixed' && (
                    <div className="pt-1">
                      <label className="block text-[8.5px] font-bold uppercase text-slate-455 mb-0.8">{t('formExpirationDate')}</label>
                      <input
                        type="date"
                        required
                        value={benefit.expirationDate || ''}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].expirationDate = e.target.value;
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-semibold cursor-pointer transition ${
                          themeClass('bg-slate-900 border-slate-800 text-slate-300 focus:border-purple-500', 'bg-white border-slate-200 text-slate-800 focus:border-purple-500')
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions Footer */}
          <div className={`flex gap-3 pt-4 border-t mt-4 ${themeClass('border-slate-800', 'border-slate-200')}`}>
            <button
              type="button"
              onClick={() => {
                onClose();
                setNewBenefits([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);
              }}
              className={`w-1/3 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer active:scale-95 ${
                themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer shadow-md shadow-purple-500/10"
            >
              {t('formAddCardBtn')}
            </button>
          </div>
        </form>
    </ZenModal>
  );
}
