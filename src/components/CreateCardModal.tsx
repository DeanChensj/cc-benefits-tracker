import { useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import type { PointCurrency } from '../data/cards.db';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  addCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  getLocalDateString: () => string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function CreateCardModal({ 
  isOpen, 
  onClose, 
  theme, 
  addCustomCard, 
  getLocalDateString,
  showToast
}: CreateCardModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  // Custom card builder states
  const [customBank, setCustomBank] = useState('');
  const [customCardName, setCustomCardName] = useState('');
  const [customAnnualFee, setCustomAnnualFee] = useState(0);
  const [customColor, setCustomColor] = useState('from-purple-600 to-indigo-900');
  const [customCardOpenDate, setCustomCardOpenDate] = useState(getLocalDateString());
  const [customPointCurrency, setCustomPointCurrency] = useState<PointCurrency>('cash');
  const [customSignupBonusActive, setCustomSignupBonusActive] = useState(false);
  const [customSignupBonusValue, setCustomSignupBonusValue] = useState(0);
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
    if (!customCardName.trim()) {
      showToast?.('❌ Please enter a card name.', 'error');
      return;
    }

    const preparedBenefits = newBenefits
      .filter((b) => b.name.trim() !== '')
      .map((b) => ({
        ...b,
        id: `benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        value: Number(b.value) || 0,
        spendingLimit: b.spendingLimit ? Number(b.spendingLimit) : undefined
      }));

    addCustomCard({
      templateId: 'custom',
      customName: customCardName.trim(),
      bank: customBank.trim() || 'Custom',
      color: customColor,
      cardOpenDate: customCardOpenDate,
      annualFee: customAnnualFee || 0,
      pointCurrency: customPointCurrency,
      signupBonusActive: customSignupBonusActive,
      signupBonusValue: customSignupBonusValue,
      multipliers: customMultipliers,
      customBenefits: preparedBenefits,
    });

    // Reset states
    setCustomBank('');
    setCustomCardName('');
    setCustomAnnualFee(0);
    setCustomColor('from-purple-600 to-indigo-900');
    setCustomCardOpenDate(getLocalDateString());
    setCustomPointCurrency('cash');
    setCustomSignupBonusActive(false);
    setCustomSignupBonusValue(0);
    setCustomMultipliers({ dining: 1, travel: 1, shopping: 1, entertainment: 1 });
    setNewBenefits([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
    >
      <div 
        className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-scale-up transition-colors duration-300 ${
          themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${themeClass('text-white', 'text-slate-900')}`}>{t('formCreateCardTitle')}</h3>
            <p className={`text-xs ${themeClass('text-slate-400', 'text-slate-500')}`}>{language === 'zh' ? '自由定义添加您的非标冷门信用卡与返利福利项目' : 'Add your long-tail credit cards and custom perks'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>{t('formBankName')}</label>
              <input
                type="text"
                required
                list="major-banks"
                placeholder="e.g. Bilt, Citi"
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-medium ${
                  themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
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
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>{t('formCardName')}</label>
              <input
                type="text"
                required
                placeholder="e.g. Mastercard, Custom Cash"
                value={customCardName}
                onChange={(e) => setCustomCardName(e.target.value)}
                className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-medium ${
                  themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>{t('openDateLabel')}</label>
              <input
                type="date"
                required
                value={customCardOpenDate}
                onChange={(e) => setCustomCardOpenDate(e.target.value)}
                className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-medium cursor-pointer ${
                  themeClass('bg-slate-955 border-slate-800 text-slate-305', 'bg-slate-50 border-slate-250 text-slate-750 focus:border-purple-500')
                }`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>{t('formAnnualFee')}</label>
              <input
                type="number"
                placeholder="0"
                value={customAnnualFee || ''}
                onChange={(e) => setCustomAnnualFee(Number(e.target.value) || 0)}
                className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-bold ${
                  themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-855 shadow-inner')
                }`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>{language === 'zh' ? '卡面主题配色' : 'Card Color'}</label>
              <div className="flex gap-1.5 items-center pt-1.5">
                {[
                  { class: 'from-purple-600 to-indigo-900', label: 'Violet' },
                  { class: 'from-teal-500 to-cyan-800', label: 'Lagoon' },
                  { class: 'from-rose-600 to-red-900', label: 'Lava' },
                  { class: 'from-emerald-600 to-green-900', label: 'Emerald' },
                  { class: 'from-slate-750 to-slate-900', label: 'Steel' }
                ].map((c) => (
                  <button
                    key={c.class}
                    type="button"
                    onClick={() => setCustomColor(c.class)}
                    className={`w-5 h-5 rounded-full bg-gradient-to-tr ${c.class} border transition cursor-pointer ${
                      customColor === c.class ? 'border-white scale-110 ring-2 ring-purple-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Symmetrical pointCurrency & secured welcome SUB inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>{t('earningCurrencyLabel')}</label>
              <select
                value={customPointCurrency}
                onChange={(e) => setCustomPointCurrency(e.target.value as PointCurrency)}
                className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-bold cursor-pointer ${
                  themeClass('bg-slate-955 border-slate-800 text-slate-305 focus:border-purple-500', 'bg-slate-50 border-slate-250 text-slate-750 shadow-sm focus:border-purple-500')
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

            <div className="flex flex-col justify-end">
              <div className={`flex items-center justify-between gap-2 p-2 rounded-xl border h-[38px] ${
                themeClass('bg-slate-955 border-slate-800', 'bg-slate-50 border-slate-250 shadow-inner')
              }`}>
                <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={customSignupBonusActive}
                    onChange={() => setCustomSignupBonusActive(!customSignupBonusActive)}
                    className="w-3.5 h-3.5 text-purple-600 rounded border-slate-800 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>{language === 'zh' ? '已得开卡礼' : 'SUB Secured'}</span>
                </label>
                {customSignupBonusActive && (
                  <div className="flex items-center gap-0.5 text-[10.5px] font-mono shrink-0 ml-1.5">
                    <span className="text-slate-455 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={customSignupBonusValue || ''}
                      onChange={(e) => setCustomSignupBonusValue(Number(e.target.value) || 0)}
                      className={`w-14 text-center text-xs font-black rounded focus:outline-none py-0.5 border ${
                        themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Point Multipliers Customizer */}
          <div className="space-y-2">
            <label className={`block text-[10px] font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-555')}`}>
              {t('multipliersTitle')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {/* Dining */}
              <div className={`flex items-center justify-between gap-1.5 border px-2.5 py-1.5 rounded-xl ${
                themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-50 border-slate-250 shadow-inner')
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
                themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-50 border-slate-250 shadow-inner')
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
                themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-50 border-slate-250 shadow-inner')
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
                themeClass('bg-slate-955/50 border-slate-805/60', 'bg-slate-50 border-slate-250 shadow-inner')
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

          {/* Dynamic Benefits Builder Section */}
          <div className={`border-t pt-4 mt-4 space-y-3 ${themeClass('border-slate-850', 'border-slate-200')}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-555')}`}>{t('formCustomBenefitsTitle')}</h4>
              <button
                type="button"
                onClick={() => setNewBenefits([...newBenefits, { name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }])}
                className="flex items-center gap-1 text-[10px] font-bold text-purple-500 hover:text-purple-400 transition cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                {t('formAddPerkBtn')}
              </button>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1.5 scrollbar-thin">
              {newBenefits.map((benefit, idx) => (
                <div key={idx} className={`p-3 rounded-xl border space-y-2.5 relative ${
                  themeClass('bg-slate-955 border-slate-855/80', 'bg-slate-50 border-slate-200')
                }`}>
                  {newBenefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNewBenefits(newBenefits.filter((_, i) => i !== idx))}
                      className="absolute top-2.5 right-2.5 text-slate-505 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-semibold text-slate-550 mb-0.5">{t('formOfferName')}</label>
                      <input
                        type="text"
                        placeholder="e.g. Supermarket 6%"
                        value={benefit.name}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].name = e.target.value;
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-medium ${
                          themeClass('bg-slate-900 border-slate-855 text-slate-200', 'bg-white border-slate-250 text-slate-800')
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-555 mb-0.5">{t('formCashbackValue')}</label>
                      <input
                        type="number"
                        placeholder="5"
                        value={benefit.value || ''}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].value = Number(e.target.value);
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-bold ${
                          themeClass('bg-slate-900 border-slate-855 text-slate-200', 'bg-white border-slate-250 text-slate-800')
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-555 mb-0.5" title="Leave blank for standard statement credits">{t('formSpendLimit')}</label>
                      <input
                        type="number"
                        placeholder="Optional"
                        value={benefit.spendingLimit || ''}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].spendingLimit = e.target.value ? Number(e.target.value) : undefined;
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2 py-1.5 focus:outline-none font-medium ${
                          themeClass('bg-slate-900 border-slate-300 text-slate-750', 'bg-white border-slate-250 text-slate-750')
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-555 mb-0.5">{t('formResetPeriod')}</label>
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
                        className={`w-full border text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                          themeClass('bg-slate-900 border-slate-855 text-slate-305', 'bg-white border-slate-255 text-slate-700')
                        }`}
                      >
                        <option value="monthly">{language === 'zh' ? '按月刷新' : 'Monthly'}</option>
                        <option value="quarterly">{language === 'zh' ? '按季度刷新' : 'Quarterly'}</option>
                        <option value="semi-annual">{language === 'zh' ? '每半年刷新' : 'Semi-Annual'}</option>
                        <option value="annual-calendar">{language === 'zh' ? '自然年刷新 (Calendar Year)' : 'Calendar Year'}</option>
                        <option value="annual-anniversary">{language === 'zh' ? '持卡年周年刷新 (Anniversary)' : 'Anniversary'}</option>
                        <option value="fixed">{language === 'zh' ? '单次/固定到期' : 'One-Time / Fixed'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-slate-550 mb-0.5">{t('formCategory')}</label>
                      <select
                        value={benefit.category}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].category = e.target.value as 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other';
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                          themeClass('bg-slate-900 border-slate-855 text-slate-305', 'bg-white border-slate-255 text-slate-700')
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
                    <div className="pt-1.5">
                      <label className="block text-[9px] font-semibold text-slate-550 mb-0.5">{t('formExpirationDate')}</label>
                      <input
                        type="date"
                        required
                        value={benefit.expirationDate || ''}
                        onChange={(e) => {
                          const updated = [...newBenefits];
                          updated[idx].expirationDate = e.target.value;
                          setNewBenefits(updated);
                        }}
                        className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-medium cursor-pointer ${
                          themeClass('bg-slate-900 border-slate-855 text-slate-305', 'bg-white border-slate-255 text-slate-855')
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={`flex gap-3 pt-4 border-t mt-4 ${themeClass('border-slate-855', 'border-slate-200')}`}>
            <button
              type="button"
              onClick={() => {
                onClose();
                setNewBenefits([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);
              }}
              className={`w-1/3 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer ${
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
      </div>
    </div>
  );
}
