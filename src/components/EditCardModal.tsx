import { X } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { CARDS_DB, CARD_MULTIPLIERS } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: OwnedCardInstance | null;
  updateCardMultipliers: (id: string, multipliers: Record<string, number | undefined>) => void;
  toggleSignupBonus: (id: string) => void;
  updateSignupBonusValue: (id: string, value: number) => void;
  setCardOpenDate: (id: string, dateStr: string) => void;
  renameCard: (id: string, name: string) => void;
  themeClass: (dark: string, light: string) => string;
}

export function EditCardModal({
  isOpen,
  onClose,
  instance,
  updateCardMultipliers,
  toggleSignupBonus,
  updateSignupBonusValue,
  setCardOpenDate,
  renameCard,
  themeClass
}: EditCardModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  if (!isOpen || !instance) return null;

  const template = CARDS_DB.find((t) => t.id === instance.templateId);
  const canCustomizePoints = instance.templateId === 'custom' || instance.templateId === 'chase-freedom-flex' || instance.templateId === 'discover-it-cashback';

  const defaultDining = CARD_MULTIPLIERS[instance.templateId]?.dining || 1;
  const defaultTravel = CARD_MULTIPLIERS[instance.templateId]?.travel || 1;
  const defaultShopping = CARD_MULTIPLIERS[instance.templateId]?.shopping || 1;
  const defaultEntertainment = CARD_MULTIPLIERS[instance.templateId]?.entertainment || 1;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-955/40 dark:bg-slate-950/75 backdrop-blur-[3px] flex items-center justify-center z-50 p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up transition-colors duration-300 ${
          themeClass('bg-slate-900 border-slate-805/80 text-slate-105', 'bg-white border-slate-200 text-slate-800')
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded transition cursor-pointer active:scale-90 ${
            themeClass('text-slate-400 hover:text-white hover:bg-white/10', 'text-slate-505 hover:text-slate-850 hover:bg-black/5')
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 text-left">
          <h3 className={`text-base font-black ${themeClass('text-white', 'text-slate-900')}`}>
            {language === 'zh' ? `配置卡片属性: ${instance.customName}` : `Configure: ${instance.customName}`}
          </h3>
          <p className={`text-xs mt-0.5 font-medium ${themeClass('text-slate-400', 'text-slate-505')}`}>
            {language === 'zh' ? '自定义此卡片的激活时间、消费返现点数与开卡礼包状态' : 'Customize opening date, multipliers, and bonuses'}
          </p>
        </div>

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
                themeClass('bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-205', 'bg-slate-55 border-slate-200 focus:border-purple-500 text-slate-800 shadow-inner')
              }`}
            />
          </div>

          {/* 0. Card Open Date */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
              {t('openDateLabel')}
            </label>
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
              themeClass('bg-slate-955/40 border-slate-850/60', 'bg-slate-55 border-slate-200 shadow-inner')
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

          {/* 1. Signup Bonus override */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
              {language === 'zh' ? '🎁 新客户开卡礼包 (SUB)' : 'Sign-Up Bonus (SUB)'}
            </label>
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
              themeClass('bg-slate-955/40 border-slate-850/60', 'bg-slate-55 border-slate-200 shadow-inner')
            }`}>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!instance.signupBonusActive}
                  onChange={() => toggleSignupBonus(instance.id)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-800 focus:ring-purple-500 cursor-pointer"
                />
                <span>{language === 'zh' ? '已成功拿到开卡消费礼包' : 'Secured Sign-Up Bonus'}</span>
              </label>
              {instance.signupBonusActive && (
                <div className="flex items-center gap-1 text-xs font-mono shrink-0">
                  <span className="text-slate-455 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    placeholder={template?.signupBonusValue !== undefined ? `${template.signupBonusValue}` : '0'}
                    value={instance.signupBonusValue !== undefined ? instance.signupBonusValue : ''}
                    onChange={(e) => updateSignupBonusValue(instance.id, Number(e.target.value) || 0)}
                    className={`w-16 text-center text-xs font-black rounded focus:outline-none py-1 border ${
                      themeClass('bg-slate-955 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Custom Point Multipliers */}
          {canCustomizePoints && (
            <div className="space-y-2.5">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-400')}`}>
                {t('multipliersTitle')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Dining */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-955/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
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
                  themeClass('bg-slate-955/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
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
                      themeClass('bg-slate-955 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Shopping */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-955/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
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
                      themeClass('bg-slate-955 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
                {/* Entertainment */}
                <div className={`flex items-center justify-between gap-2 border p-2 rounded-xl ${
                  themeClass('bg-slate-955/40 border-slate-850/60', 'bg-slate-50 border-slate-200 shadow-inner')
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
                      themeClass('bg-slate-955 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-3 px-4 rounded-xl text-sm transition active:scale-[0.98] shadow-lg shadow-purple-500/10 cursor-pointer"
        >
          {language === 'zh' ? '保存并返回' : 'Save & Close'}
        </button>
      </div>
    </div>
  );
}
