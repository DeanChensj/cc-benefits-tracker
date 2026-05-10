import { useState } from 'react';
import { X, Gift, Calendar } from 'lucide-react';
import type { Benefit } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

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
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-955/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
    >
      <div 
        className={`border rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-scale-up transition-colors duration-300 ${
          themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg">
              <Gift className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className={`text-sm font-black ${themeClass('text-white', 'text-slate-900')}`}>{t('formAddOfferTitle')}</h3>
              <p className="text-[9px] text-slate-500 truncate max-w-[180px]" title={cardName}>{language === 'zh' ? `所属卡片: ${cardName}` : `For: ${cardName}`}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition cursor-pointer ${
              themeClass('text-slate-450 hover:bg-slate-800 hover:text-slate-200', 'text-slate-505 hover:bg-slate-100 hover:text-slate-800')
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Templates Selector */}
        <div className="mb-3.5 text-left">
          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${themeClass('text-slate-400', 'text-slate-505')}`}>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-[11px]">
          <div>
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-505')}`}>
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
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-505')}`}>
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
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-505')}`} title="Leave blank if it doesn't require spending progress">
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
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-505')}`}>
                {t('formResetPeriod')}
              </label>
              <select
                value={resetPeriod}
                onChange={(e) => setResetPeriod(e.target.value as 'fixed' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar')}
                className={`w-full border rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer font-medium ${
                  themeClass('bg-slate-955 border-slate-800 text-slate-300', 'bg-slate-50 border-slate-250 text-slate-700')
                }`}
              >
                <option value="fixed">{language === 'zh' ? '固定到期日' : 'Fixed Expiration'}</option>
                <option value="monthly">{language === 'zh' ? '按月刷新' : 'Monthly'}</option>
                <option value="quarterly">{language === 'zh' ? '按季度刷新' : 'Quarterly'}</option>
                <option value="semi-annual">{language === 'zh' ? '每半年刷新' : 'Semi-Annual'}</option>
                <option value="annual-calendar">{language === 'zh' ? '自然年刷新' : 'Annual (Cal)'}</option>
              </select>
            </div>

            <div>
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-505')}`}>
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
            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-505')}`}>
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

          <div className="flex gap-3 pt-3 border-t mt-4 border-slate-200/40 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className={`w-1/3 font-semibold py-2 rounded-xl text-[10px] transition cursor-pointer ${
                themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-xl text-[10px] transition active:scale-[0.98] cursor-pointer shadow-md shadow-purple-500/10"
            >
              {t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
