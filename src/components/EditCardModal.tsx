import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { CARDS_DB, CARD_MULTIPLIERS } from '../data/cards.db';
import type { PointCurrency } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { ZenModal } from './ZenModal';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: OwnedCardInstance | null;
  updateCardMultipliers: (id: string, multipliers: Record<string, number | undefined>) => void;
  updateCardPointCurrency: (id: string, currency: PointCurrency) => void;
  updateWelcomeOffer: (id: string, requirement: number, months: number, value: number) => void;
  setCardOpenDate: (id: string, dateStr: string) => void;
  renameCard: (id: string, name: string) => void;
  themeClass: (dark: string, light: string) => string;
  theme: 'dark' | 'light';
}

export function EditCardModal({
  isOpen,
  onClose,
  instance,
  updateCardMultipliers,
  updateCardPointCurrency,
  updateWelcomeOffer,
  setCardOpenDate,
  renameCard,
  themeClass,
  theme
}: EditCardModalProps) {
  const welcomeOffer = instance?.instanceOffers?.find((o) => o.type === 'welcome-offer');
  const defaultRequirement = welcomeOffer?.spendingLimit || 0;
  const exp = welcomeOffer?.expirationDate ? new Date(welcomeOffer.expirationDate) : null;
  const open = new Date(instance?.cardOpenDate || '2026-01-01');
  const defaultMonths = exp ? (exp.getFullYear() - open.getFullYear()) * 12 + exp.getMonth() - open.getMonth() : 3;

  const [subValue, setSubValue] = useState(instance?.signupBonusValue || 0);
  const [subRequirement, setSubRequirement] = useState(defaultRequirement);
  const [subMonths, setSubMonths] = useState(defaultMonths);

  const { language, toggleBenefitAutoClaim } = useCardStore();
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const isAutoClaimEligible = (b: { resetPeriod?: string; spendingLimit?: number }) => {
    return b.resetPeriod === 'monthly' && b.spendingLimit === undefined;
  };

  if (!isOpen || !instance) return null;

  const template = CARDS_DB.find((t) => t.id === instance.templateId);
  const canCustomizePoints = instance.templateId === 'custom';
  const isRotatingCard = instance.templateId === 'chase-freedom-flex' || instance.templateId === 'discover-it-cashback';

  const defaultDining = CARD_MULTIPLIERS[instance.templateId]?.dining || 1;
  const defaultTravel = CARD_MULTIPLIERS[instance.templateId]?.travel || 1;
  const defaultShopping = CARD_MULTIPLIERS[instance.templateId]?.shopping || 1;
  const defaultEntertainment = CARD_MULTIPLIERS[instance.templateId]?.entertainment || 1;
  


  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      title={`${t('formEditCardTitle')}: ${instance.customName}`}
      description={t('formCreateCardDesc')}
      icon={<CreditCard className="w-5 h-5" />}
      maxWidthClass="max-w-md"
    >

        <div className="space-y-5 text-left">
          {/* 00. Card Label / Custom Name */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
              {t('formCustomName')}
            </label>
            <input
              type="text"
              value={instance.customName}
              onChange={(e) => renameCard(instance.id, e.target.value)}
              onBlur={() => {
                const trimmed = instance.customName.trim();
                const fallback = instance.templateId === 'custom' ? 'Custom Card' : (template?.name || 'Credit Card');
                renameCard(instance.id, trimmed || fallback);
              }}
              className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-semibold ${
                themeClass('bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-200 focus:border-purple-500 text-slate-800 shadow-inner')
              }`}
            />
          </div>

          {/* 0. Card Open Date */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
              {t('openDateLabel')}
            </label>
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
              themeClass('bg-slate-950/40 border-slate-850/60', 'bg-slate-55 border-slate-200 shadow-inner')
            }`}>
              <span className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-700')}`}>{t('openDateLabel')}</span>
              <input
                type="date"
                value={instance.cardOpenDate}
                onChange={(e) => setCardOpenDate(instance.id, e.target.value)}
                className={`text-xs rounded px-2 py-1 focus:outline-none cursor-pointer font-semibold transition border ${
                  themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                }`}
              />
            </div>
          </div>

          {/* Earning Currency Selector (only for custom cards) */}
          {instance.templateId === 'custom' && (
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
                {t('earningCurrencyLabel')}
              </label>
              <div className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border ${
                themeClass('bg-slate-950/40 border-slate-850/60', 'bg-slate-55 border-slate-200 shadow-inner')
              }`}>
                <span className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-700')}`}>
                  {t('rewardCurrency')}
                </span>
                <select
                  value={instance.pointCurrency || 'cash'}
                  onChange={(e) => updateCardPointCurrency(instance.id, e.target.value as PointCurrency)}
                  className={`text-xs rounded px-2 py-1 focus:outline-none cursor-pointer font-bold border transition ${
                    themeClass('bg-slate-950 border-slate-800 text-slate-100 focus:border-purple-500', 'bg-white border-slate-200 text-slate-800 focus:border-purple-500 shadow-sm')
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
          )}

          {/* 1. Welcome Offer Section */}
          <div className="space-y-2 mb-4">

            <div className="space-y-3 pt-3 border-t border-slate-800/30 dark:border-slate-750/30">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('formSUBLabel')}</span>
                <div className="flex items-center gap-1 text-xs font-mono shrink-0">
                  <span className="text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    value={subValue}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSubValue(val);
                      updateWelcomeOffer(instance.id, subRequirement, subMonths, val);
                    }}
                    className={`w-16 text-center text-xs font-bold rounded focus:outline-none py-0.5 border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-slate-500 dark:text-slate-450 uppercase">
                    {t('spendingRequirement')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={subRequirement}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSubRequirement(val);
                      updateWelcomeOffer(instance.id, val, subMonths, subValue);
                    }}
                    className={`w-full px-2 py-1 rounded focus:outline-none text-xs font-medium border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-slate-500 dark:text-slate-455 uppercase">
                    {t('timeLimit')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={subMonths}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setSubMonths(val);
                      updateWelcomeOffer(instance.id, subRequirement, val, subValue);
                    }}
                    className={`w-full px-2 py-1 rounded focus:outline-none text-xs font-medium border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Custom Point Multipliers or AI Rotating Notice */}
          {canCustomizePoints ? (
            <div className="space-y-2.5">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
                {t('multipliersTitle')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Dining */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-950/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
                }`}>
                  <span className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-700')}`}>{t('catDining')}</span>
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
                    className={`w-10 text-center text-xs font-black rounded focus:outline-none py-1 border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Travel */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-950/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
                }`}>
                  <span className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-700')}`}>{t('catTravel')}</span>
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
                    className={`w-10 text-center text-xs font-black rounded focus:outline-none py-1 border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Shopping */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-950/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
                }`}>
                  <span className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-700')}`}>{t('catShopping')}</span>
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
                    className={`w-10 text-center text-xs font-black rounded focus:outline-none py-1 border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Entertainment */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-950/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
                }`}>
                  <span className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-700')}`}>{t('catEntertainment')}</span>
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
                    className={`w-10 text-center text-xs font-black rounded focus:outline-none py-1 border ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : isRotatingCard ? (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1 font-medium leading-relaxed ${
              themeClass('bg-slate-955/60 border-slate-850 text-slate-300', 'bg-amber-50/80 border-amber-200 text-amber-900')
            }`}>
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                <span>💡</span>
                <span>{language === 'zh' ? '5% 季度轮转倍率提示' : '5% Rotating Multipliers Notice'}</span>
              </p>
              <p className="text-[11px] mt-1">
                {language === 'zh' 
                  ? '此卡的 5% 季度轮转商户及返点倍率由系统后台 AI 脚本自动根据当前季度实时更新，无需手动配置！' 
                  : 'This card\'s 5% rotating categories and multipliers are automatically updated by background AI scripts each quarter. No manual configuration needed!'}
              </p>
            </div>
          ) : null}

          {/* 3. Dynamic Benefit Auto-Claim Settings */}
          {(() => {
            const benefitsList = (template?.benefits || []).map((tb) => {
              const ib = instance.benefits?.find((b) => b.id === tb.id);
              return { ...tb, ...ib };
            });
            const recurringBenefits = benefitsList.filter(isAutoClaimEligible);
            if (recurringBenefits.length === 0) return null;

            return (
              <div className="space-y-3.5 pt-3.5 border-t border-slate-800/30 dark:border-slate-750/30 text-left">
                <div>
                  <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
                    {t('formAutoClaimTitle')}
                  </h4>
                  <p className={`text-[9px] font-medium mt-0.5 leading-relaxed ${themeClass('text-slate-500', 'text-slate-455')}`}>
                    {t('formAutoClaimDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  {recurringBenefits.map((b) => {
                    if (!b.id) return null;
                    const benefitId = b.id;
                    const isAutoClaimActive = b.isSubscription === true;
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          themeClass('bg-slate-955/25 border-slate-850/50 hover:border-slate-800', 'bg-slate-50/50 border-slate-200 shadow-sm hover:border-slate-300')
                        }`}
                      >
                        <div className="text-left min-w-0">
                          <p className="text-[10.5px] font-bold truncate text-slate-800 dark:text-slate-200">{b.name}</p>
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${themeClass('text-slate-550', 'text-slate-455')}`}>
                            {b.resetPeriod === 'monthly' ? (language === 'zh' ? '按月自动核销' : 'Monthly Auto-Claim') :
                             b.resetPeriod === 'semi-annual' ? (language === 'zh' ? '半年自动核销' : 'Semi-Annual Auto-Claim') :
                             b.resetPeriod === 'quarterly' ? (language === 'zh' ? '按季自动核销' : 'Quarterly Auto-Claim') :
                             (language === 'zh' ? '按年自动核销' : 'Annual Auto-Claim')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleBenefitAutoClaim(instance.id, benefitId, !isAutoClaimActive)}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isAutoClaimActive ? 'bg-purple-500 animate-pulse-once' : themeClass('bg-slate-850', 'bg-slate-200')
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isAutoClaimActive ? 'translate-x-3.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-3 px-4 rounded-xl text-sm transition active:scale-[0.98] shadow-lg shadow-purple-500/10 cursor-pointer"
        >
          {t('saveAndClose')}
        </button>
    </ZenModal>
  );
}
