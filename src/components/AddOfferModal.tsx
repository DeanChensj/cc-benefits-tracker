import { useState } from 'react';
import { Gift, Calendar } from 'lucide-react';
import type { Benefit } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { ZenModal } from './ZenModal';

interface AddOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  onAdd: (offer: Omit<Benefit, 'id'>) => void;
  theme: 'dark' | 'light';
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function AddOfferModal({ isOpen, onClose, cardName, onAdd, theme, showToast }: AddOfferModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  // Get today's date string + 3 months as default expiration
  const getDefaultExpirationDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State hooks for the custom offer form
  const [name, setName] = useState('');
  const [value, setValue] = useState(10);
  const [spendingLimit, setSpendingLimit] = useState<number | undefined>(undefined);
  const [resetPeriod, setResetPeriod] = useState<'fixed' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar'>('fixed');
  const [expirationDate, setExpirationDate] = useState(getDefaultExpirationDate());
  const [category, setCategory] = useState<'shopping' | 'dining' | 'travel' | 'entertainment' | 'other'>('shopping');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const templates = [
    {
      label: '🍽️ Dining',
      name: 'Dining Offer',
      value: 10,
      spendingLimit: undefined,
      resetPeriod: 'monthly' as const,
      category: 'dining' as const,
      description: '$10 statement credit for Dining'
    },
    {
      label: '🛍️ Shopping',
      name: 'Shopping Offer',
      value: 20,
      spendingLimit: 100,
      resetPeriod: 'fixed' as const,
      category: 'shopping' as const,
      description: 'Spend $100 get $20 statement credit'
    },
    {
      label: '✈️ Travel',
      name: 'Travel Offer',
      value: 50,
      spendingLimit: 250,
      resetPeriod: 'fixed' as const,
      category: 'travel' as const,
      description: 'Spend $250 get $50 statement credit'
    }
  ];

  const handleApplyTemplate = (t: typeof templates[0]) => {
    setName(t.name);
    setValue(t.value);
    setSpendingLimit(t.spendingLimit);
    setResetPeriod(t.resetPeriod);
    setCategory(t.category);
    setDescription(t.description);
    setExpirationDate(getDefaultExpirationDate());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast?.(language === 'zh' ? '❌ 请输入福利名称。' : '❌ Please enter an offer name.', 'error');
      return;
    }

    const finalDescription = description.trim() || (spendingLimit 
      ? (language === 'zh' ? `消费满 $${spendingLimit} 返现 $${value}` : `Spend $${spendingLimit} get $${value} statement credit`)
      : (language === 'zh' ? `$${value} 消费返现` : `$${value} statement credit`));

    onAdd({
      name: name.trim(),
      value: Number(value) || 0,
      spendingLimit: spendingLimit ? Number(spendingLimit) : undefined,
      resetPeriod,
      category,
      description: finalDescription,
      expirationDate: resetPeriod === 'fixed' ? expirationDate : undefined,
    });

    // Reset state & close
    setName('');
    setValue(10);
    setSpendingLimit(undefined);
    setResetPeriod('fixed');
    setExpirationDate(getDefaultExpirationDate());
    setCategory('shopping');
    setDescription('');
    onClose();
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      title={t('formAddOfferTitle')}
      description={language === 'zh' ? `所属卡片: ${cardName}` : `For: ${cardName}`}
      icon={<Gift className="w-5 h-5 text-purple-400" />}
      maxWidthClass="max-w-sm"
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 text-[11px]">
        {/* Quick Templates Selector */}
        <div className="mb-3.5 text-left">
          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${themeClass('text-slate-400', 'text-slate-550')}`}>
            {t('formQuickTemplates')}
          </label>
          <div className="flex gap-1.5 flex-wrap select-none">
            {templates.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(t)}
                className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition cursor-pointer active:scale-95 ${
                  themeClass(
                    'bg-slate-955 border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white',
                    'bg-slate-50 border-slate-250 hover:bg-slate-100 text-slate-600 hover:text-slate-855 shadow-sm'
                  )
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-550')}`}>
            {t('formOfferName')}
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Best Buy Offer, Marriott Dining"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-medium ${
              themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800')
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-550')}`}>
              {t('formCashbackValue')}
            </label>
            <input
              type="number"
              required
              placeholder="25"
              value={value || ''}
              onChange={(e) => setValue(Number(e.target.value))}
              className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-bold ${
                themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800')
              }`}
            />
          </div>
          <div>
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-550')}`} title="Leave blank if it doesn't require spending progress">
              {t('formSpendLimit')}
            </label>
            <input
              type="number"
              placeholder="Optional"
              value={spendingLimit || ''}
              onChange={(e) => setSpendingLimit(e.target.value ? Number(e.target.value) : undefined)}
              className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-medium ${
                themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-300', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-750')
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              {t('formResetPeriod')}
            </label>
            <select
              value={resetPeriod}
              onChange={(e) => setResetPeriod(e.target.value as 'fixed' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar')}
              className={`w-full border rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer font-medium transition ${
                themeClass('bg-slate-955 border-slate-800/80 text-slate-300 focus:border-purple-500', 'bg-slate-100 border-slate-250 text-slate-700 focus:border-purple-500')
              }`}
            >
              <option value="fixed">{t('periodFixed')}</option>
              <option value="monthly">{t('periodMonthly')}</option>
              <option value="quarterly">{t('periodQuarterly')}</option>
              <option value="semi-annual">{t('periodSemiAnnual')}</option>
              <option value="annual-calendar">{t('periodAnnualCalendar')}</option>
            </select>
          </div>

          <div>
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              {t('formCategory')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'shopping' | 'dining' | 'travel' | 'entertainment' | 'other')}
              className={`w-full border rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer font-medium ${
                themeClass('bg-slate-955 border-slate-800 text-slate-300', 'bg-slate-50 border-slate-250 text-slate-700')
              }`}
            >
              <option value="shopping">{t('catShopping')}</option>
              <option value="dining">{t('catDining')}</option>
              <option value="travel">{t('catTravel')}</option>
              <option value="entertainment">{t('catEntertainment')}</option>
              <option value="other">{t('catOther')}</option>
            </select>
          </div>
        </div>

        {resetPeriod === 'fixed' && (
          <div>
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${themeClass('text-slate-400', 'text-slate-550')}`}>
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              {t('formExpirationDate')}
            </label>
            <input
              type="date"
              required
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-medium cursor-pointer ${
                themeClass('bg-slate-955 border-slate-800 text-slate-300', 'bg-slate-50 border-slate-250 text-slate-750')
              }`}
            />
          </div>
        )}

        <div>
          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-550')}`}>
            {t('formDescription')}
          </label>
          <textarea
            placeholder={language === 'zh' ? '留空将根据上方福利金额和限额自动生成描述' : 'Leave blank for auto-generated description'}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none font-medium resize-none ${
              themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800')
            }`}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t mt-4 border-slate-200/40 dark:border-slate-850/50">
          <button
            type="button"
            onClick={onClose}
            className={`w-1/3 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
            }`}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] shadow-md shadow-purple-500/10 cursor-pointer"
          >
            {t('add')}
          </button>
        </div>
      </form>
    </ZenModal>
  );
}
