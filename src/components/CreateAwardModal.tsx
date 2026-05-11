import React, { useState } from 'react';
import { Calendar, Sparkles, Plus } from 'lucide-react';
import { AWARD_TEMPLATES } from '../data/cards.db';
import { VoucherTicketCard } from './VoucherTicketCard';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { ZenModal } from './ZenModal';

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
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={themeClass('dark', 'light') as 'dark' | 'light'}
      title={t('awardFormTitle')}
      description={t('awardFormDescText')}
      icon={<Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />}
      maxWidthClass="max-w-md"
    >
      {/* Scrollable Form Content */}
      <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto flex flex-col gap-4 max-h-[75vh] max-h-[75dvh] scrollbar-thin text-left">

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
                    <option value="fnr">{t('awardFnr')}</option>
                    <option value="sua">{t('awardSua')}</option>
                    <option value="goh">{t('awardGoh')}</option>
                    <option value="companion">{t('awardCompanion')}</option>
                    <option value="swu">{t('awardSwu')}</option>
                    <option value="points">{t('awardPoints')}</option>
                    <option value="other">{t('awardOther')}</option>
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
          <div className="flex gap-3 mt-2 pt-4 border-t border-slate-200/40 dark:border-slate-850/50">
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
              {t('awardFormCancelBtn')}
            </button>
            <button
              type="submit"
              className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] flex items-center justify-center gap-1 shadow-md shadow-purple-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('awardFormSubmitBtn')}</span>
            </button>
          </div>
        </form>
      </ZenModal>
    );
  }
