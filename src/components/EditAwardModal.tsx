import React, { useState, useEffect } from 'react';
import { X, Calendar, Info } from 'lucide-react';
import { AWARD_TEMPLATES } from '../data/cards.db';
import type { LoyaltyAward } from '../data/cards.db';
import { VoucherTicketCard } from './VoucherTicketCard';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface EditAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  award: LoyaltyAward | null;
  themeClass: (dark: string, light: string) => string;
}

export function EditAwardModal({ isOpen, onClose, award, themeClass }: EditAwardModalProps) {
  const { updateLoyaltyAward, language } = useCardStore();
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  // Common edit inputs state
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Custom overrides editable fields state (only used if custom template)
  const [customName, setCustomName] = useState<string>('');
  const [customValue, setCustomValue] = useState<number>(0);

  // Populates state values when award is selected/changed
  useEffect(() => {
    if (award) {
      setExpirationDate(award.expirationDate || '');
      setNotes(award.notes || '');
      setCustomName(award.customName || '');
      setCustomValue(award.customValue || 0);
    }
  }, [award]);

  if (!isOpen || !award) return null;

  const isCustom = award.templateId === 'custom';
  const info = isCustom
    ? {
        brand: award.customBrand || 'Other',
        name: customName || award.customName || 'Custom Voucher',
        programType: award.customProgramType || 'other',
        awardType: award.customAwardType || 'other',
        value: customValue !== undefined ? customValue : (award.customValue || 0)
      }
    : AWARD_TEMPLATES[award.templateId];

  if (!info) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<LoyaltyAward> = {
      expirationDate: expirationDate || undefined,
      notes: notes || undefined,
    };

    if (isCustom) {
      updates.customName = customName;
      updates.customValue = customValue;
    }

    updateLoyaltyAward(award.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Premium Blurred frosted glass Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md transition-opacity animate-fade-in duration-250"
      />

      {/* Realistic Visual Emblems Deck Container */}
      <div className={`w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl relative z-10 flex flex-col animate-scale-up ${
        themeClass(
          'bg-slate-900/90 border-slate-800/80 shadow-black/40 backdrop-blur-xl saturate-[170%]',
          'bg-white/95 border-slate-250/80 shadow-slate-900/10 backdrop-blur-xl'
        )
      }`}>
        {/* Ambient top light line bevel highlight strictly under dark mode */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none dark:block hidden" />

        {/* Modal Header Section */}
        <div className="p-5 border-b border-slate-200/40 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✏️</span>
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClass('text-slate-100', 'text-slate-900')}`}>
              {t('awardFormExpLabel')?.includes('(') ? (language === 'zh' ? '编辑卡券详情' : 'Edit Voucher') : 'Edit Voucher'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition active:scale-90 cursor-pointer ${
              themeClass('text-slate-400 hover:text-white hover:bg-white/5', 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Inputs Scrollable Core Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* 1. Realistic Mini Ticket Preview well card */}
          <div className="flex flex-col gap-1 text-left">
            <label className={`text-[8.5px] font-black uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {language === 'zh' ? '票券效果预览' : 'Live Ticket Preview'}
            </label>
            <VoucherTicketCard
              award={{
                brand: info.brand,
                name: info.name,
                programType: info.programType,
                awardType: info.awardType,
                value: info.value,
                expirationDate: expirationDate || undefined,
                notes: notes || undefined
              }}
              isStaticPreview={true}
              themeClass={themeClass}
            />
          </div>

          {/* 2. Custom Card parameters: Name and cash valuation (Only enabled for Custom Templates!) */}
          {isCustom && (
            <div className="grid grid-cols-12 gap-3">
              {/* Custom Name */}
              <div className="col-span-8 flex flex-col gap-1 text-left">
                <label className={`text-[8.5px] font-black uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
                  {language === 'zh' ? '自定义福利名称' : 'Voucher Name'}
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border transition duration-200 ${
                    themeClass(
                      'bg-slate-950/40 border-slate-800/80 text-white focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20',
                      'bg-slate-50 border-slate-250 text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/10'
                    )
                  }`}
                />
              </div>

              {/* Custom Valuation Cash Value */}
              <div className="col-span-4 flex flex-col gap-1 text-left">
                <label className={`text-[8.5px] font-black uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
                  {t('awardFormValueLabel') || 'Value ($)'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={customValue}
                  onChange={(e) => setCustomValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border transition duration-200 ${
                    themeClass(
                      'bg-slate-955/40 border-slate-800/80 text-white focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20',
                      'bg-slate-50 border-slate-250 text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/10'
                    )
                  }`}
                />
              </div>
            </div>
          )}

          {/* 3. Expiration Date input with Native Datepicker */}
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between">
              <label className={`text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>
                <Calendar className="w-3 h-3" />
                {t('awardFormExpLabel') || 'Expiration Date'}
              </label>
              <span className={`text-[7.5px] font-black uppercase tracking-wider ${themeClass('text-slate-500', 'text-slate-400')}`}>
                {language === 'zh' ? '选填' : 'Optional'}
              </span>
            </div>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border transition duration-200 ${
                themeClass(
                  'bg-slate-955/40 border-slate-800/80 text-white focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 [color-scheme:dark]',
                  'bg-slate-50 border-slate-250 text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/10'
                )
              }`}
            />
          </div>

          {/* 4. Custom description/notes textarea */}
          <div className="flex flex-col gap-1 text-left">
            <label className={`text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>
              <Info className="w-3 h-3" />
              {t('awardFormNotesLabel') || 'Custom Notes / Location'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'zh' ? '例如：入住东京君悦酒店时使用、附带早餐等...' : 'E.g. valid at Grand Hyatt Tokyo, breakfast included...'}
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium outline-none border transition duration-200 resize-none ${
                themeClass(
                  'bg-slate-955/40 border-slate-800/80 text-white focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20',
                  'bg-slate-50 border-slate-250 text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/10'
                )
              }`}
            />
          </div>

          {/* 5. Dialog Actions control drawer buttons */}
          <div className="grid grid-cols-12 gap-3 mt-3">
            <button
              type="button"
              onClick={onClose}
              className={`col-span-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest border transition active:scale-95 cursor-pointer ${
                themeClass(
                  'bg-slate-955 hover:bg-slate-850 border-slate-800 text-slate-300',
                  'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-700 shadow-sm'
                )
              }`}
            >
              {t('awardFormCancelBtn') || 'Cancel'}
            </button>
            <button
              type="submit"
              className={`col-span-8 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest text-white transition active:scale-95 cursor-pointer bg-gradient-to-tr ${
                themeClass(
                  'from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-650 shadow-sm shadow-teal-500/10',
                  'from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-650'
                )
              }`}
            >
              {t('save') || 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
