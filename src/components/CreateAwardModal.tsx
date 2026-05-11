import React, { useState } from 'react';
import { X, Calendar, Sparkles, Info, Plus } from 'lucide-react';
import { AWARD_TEMPLATES } from '../data/cards.db';
import { VoucherTicketCard } from './VoucherTicketCard';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface CreateAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeClass: (dark: string, light: string) => string;
}

export function CreateAwardModal({ isOpen, onClose, themeClass }: CreateAwardModalProps) {
  const { addLoyaltyAward, language } = useCardStore();
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>('hyatt-sua');
  
  // Common inputs
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Custom overrides (only used if templateId === 'custom')
  const [customName, setCustomName] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customProgramType, setCustomProgramType] = useState<'hotel' | 'airline' | 'bank' | 'other'>('hotel');
  const [customAwardType, setCustomAwardType] = useState<'fnr' | 'sua' | 'goh' | 'companion' | 'swu' | 'points' | 'other'>('fnr');
  const [customValue, setCustomValue] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isCustom = selectedTemplate === 'custom';
    const val = isCustom ? Number(customValue) || 0 : AWARD_TEMPLATES[selectedTemplate].value;

    addLoyaltyAward({
      templateId: selectedTemplate,
      expirationDate: expirationDate ? expirationDate : undefined,
      quantity: 1,
      notes: notes.trim() ? notes.trim() : undefined,
      // Custom properties
      customName: isCustom ? customName.trim() : undefined,
      customBrand: isCustom ? customBrand.trim() : undefined,
      customProgramType: isCustom ? customProgramType : undefined,
      customAwardType: isCustom ? customAwardType : undefined,
      customValue: isCustom ? Math.max(0, val) : undefined,
    });

    onClose();
    
    // Reset fields
    setExpirationDate('');
    setNotes('');
    setCustomName('');
    setCustomBrand('');
    setCustomValue('');
  };

  const isCustom = selectedTemplate === 'custom';
  const templateInfo = AWARD_TEMPLATES[selectedTemplate];

  const liveBrand = isCustom ? (customBrand.trim() || 'Brand') : templateInfo.brand;
  const liveName = isCustom ? (customName.trim() || 'Custom Voucher') : templateInfo.name;
  const liveAwardType = isCustom ? customAwardType : templateInfo.awardType;
  const liveValue = isCustom ? (Number(customValue) || 0) : templateInfo.value;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-55 flex items-center justify-center p-3 bg-slate-955/40 dark:bg-slate-950/75 backdrop-blur-md saturate-[170%] overflow-y-auto animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[440px] border border-t rounded-2xl shadow-2xl animate-scale-up overflow-hidden flex flex-col transition-colors duration-300 ${
          themeClass(
            'bg-slate-900/80 border-slate-800/70 border-t-white/15 text-white backdrop-blur-md saturate-[170%]', 
            'bg-white/85 border-slate-200 border-t-white/45 text-slate-900 backdrop-blur-md saturate-[170%]'
          )
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-dashed border-slate-200/60 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider">{t('awardFormTitle')}</h4>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg transition text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 max-h-[75vh] max-h-[75dvh] scrollbar-thin text-left">
          {/* Description Tip */}
          <div className={`p-3 rounded-xl flex gap-2.5 border text-[10px] font-medium leading-relaxed ${
            themeClass('bg-teal-500/5 border-teal-500/10 text-teal-300', 'bg-teal-500/5 border-teal-500/10 text-teal-750')
          }`}>
            <Info className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{t('awardFormDescText')}</span>
          </div>

          {/* Select Template Dropdown */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {t('awardFormSelectTemplate')}
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                // Reset overrides on swap
                setCustomName('');
                setCustomBrand('');
                setCustomValue('');
              }}
              className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                themeClass('bg-slate-950 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
              }`}
            >
              {Object.entries(AWARD_TEMPLATES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.brand !== 'Other' ? `[${t.brand}] ` : ''}{t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 🎟️ LIVE TICKET STUB CARD PREVIEW */}
          <div className="space-y-1.5">
            <label className={`text-[9px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-450', 'text-slate-500')}`}>
              {t('awardFormPreviewTitle')}
            </label>
            <VoucherTicketCard
              award={{
                brand: liveBrand,
                name: liveName,
                programType: isCustom ? customProgramType : templateInfo.programType,
                awardType: liveAwardType,
                value: liveValue,
                expirationDate: expirationDate || undefined,
                notes: notes || undefined
              }}
              isStaticPreview={true}
              themeClass={themeClass}
            />
          </div>

          {/* Custom Fields Group - Only rendered if selection === 'custom' */}
          {isCustom && (
            <div className={`space-y-3.5 p-3.5 rounded-xl border ${
              themeClass('bg-slate-950/40 border-slate-850/50', 'bg-slate-50/50 border-slate-200/80')
            }`}>
              <h5 className={`text-[9px] font-black uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
                {t('awardFormCustomFields')}
              </h5>
              
              {/* Custom Name */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-500">{t('awardFormNameLabel')}</label>
                <input
                  required
                  type="text"
                  placeholder={t('awardFormNamePlace')}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                    themeClass('bg-slate-950 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
                  }`}
                />
              </div>

              {/* Custom Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{t('awardFormBrandLabel')}</label>
                  <input
                    required
                    type="text"
                    placeholder={t('awardFormBrandPlace')}
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                      themeClass('bg-slate-950 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
                    }`}
                  />
                </div>

                {/* Custom Value */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{t('awardFormValueLabel')}</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                      themeClass('bg-slate-950 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
                    }`}
                  />
                </div>
              </div>

              {/* Custom Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{t('awardFormProgType')}</label>
                  <select
                    value={customProgramType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCustomProgramType(e.target.value as 'hotel' | 'airline' | 'bank' | 'other')}
                    className={`w-full text-xs font-semibold rounded-xl px-2.5 py-2 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                      themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
                    }`}
                  >
                    <option value="hotel">{t('optHotel')}</option>
                    <option value="airline">{t('optAirline')}</option>
                    <option value="bank">{t('optBank')}</option>
                    <option value="other">{t('optOtherProg')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{t('awardFormAwardType')}</label>
                  <select
                    value={customAwardType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCustomAwardType(e.target.value as 'fnr' | 'sua' | 'goh' | 'companion' | 'swu' | 'points' | 'other')}
                    className={`w-full text-xs font-semibold rounded-xl px-2.5 py-2 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                      themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
                    }`}
                  >
                    <option value="fnr">{t('optFn')}</option>
                    <option value="sua">{t('optSua')}</option>
                    <option value="goh">{t('optGoh')}</option>
                    <option value="companion">{t('optCompanion')}</option>
                    <option value="swu">{t('optSwu')}</option>
                    <option value="points">{t('optPoints')}</option>
                    <option value="other">{t('optOtherAward')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Expiration Date Picker */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {t('awardFormExpLabel')}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className={`w-full text-xs font-bold rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                  themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
                }`}
              />
            </div>
          </div>

          {/* Custom Notes */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {t('awardFormNotesLabel')}
            </label>
            <input
              type="text"
              placeholder={t('awardFormNotesPlace')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 border transition ${
                themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-55 border-slate-255 text-slate-800')
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-2 pt-4 border-t border-dashed border-slate-800/30 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
                themeClass(
                  'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400',
                  'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-600'
                )
              }`}
            >
              {t('awardFormCancelBtn')}
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-tr from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-white dark:from-slate-100 dark:to-slate-200 dark:hover:from-white dark:hover:to-slate-50 dark:text-slate-950 border border-slate-700/25 font-bold py-2.5 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('awardFormSubmitBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
