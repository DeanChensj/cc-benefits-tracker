import React, { useState, useEffect } from 'react';
import { Calendar, Info } from 'lucide-react';
import { ZenModal } from './ZenModal';
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={themeClass('dark', 'light') as 'dark' | 'light'}
      title={t('awardFormExpLabel')?.includes('(') ? (language === 'zh' ? '编辑卡券详情' : 'Edit Voucher') : 'Edit Voucher'}
      description={t('awardFormDescText')}
      icon={<Calendar className="w-5 h-5 text-purple-400 animate-pulse" />}
      maxWidthClass="max-w-md"
    >
      {/* Form Inputs Scrollable Core Body */}
      <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto flex flex-col gap-4 max-h-[75vh] max-h-[75dvh] scrollbar-thin text-left">
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
                      'bg-slate-950/40 border-slate-800/80 text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20',
                      'bg-slate-50 border-slate-255 text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600/10'
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
                      'bg-slate-955/40 border-slate-800/80 text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20',
                      'bg-slate-50 border-slate-255 text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600/10'
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
                  'bg-slate-955/40 border-slate-800/80 text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 [color-scheme:dark]',
                  'bg-slate-50 border-slate-255 text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600/10'
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
                  'bg-slate-955/40 border-slate-800/80 text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20',
                  'bg-slate-50 border-slate-255 text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600/10'
                )
              }`}
            />
          </div>

          {/* 5. Dialog Actions control drawer buttons */}
          <div className="flex gap-3 mt-3 pt-4 border-t border-slate-200/40 dark:border-slate-850/50">
            <button
              type="button"
              onClick={onClose}
              className={`w-1/3 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                themeClass(
                  'bg-slate-800 hover:bg-slate-750 text-slate-300',
                  'bg-slate-100 hover:bg-slate-200 text-slate-600'
                )
              }`}
            >
              {t('awardFormCancelBtn') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] shadow-md shadow-purple-500/10 cursor-pointer"
            >
              {t('save') || 'Save Changes'}
            </button>
          </div>
        </form>
      </ZenModal>
    );
  }
