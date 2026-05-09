import React, { useState } from 'react';
import { X, Calendar, Sparkles, Info, Plus } from 'lucide-react';
import { AWARD_TEMPLATES } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';

interface CreateAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeClass: (dark: string, light: string) => string;
}

export function CreateAwardModal({ isOpen, onClose, themeClass }: CreateAwardModalProps) {
  const { addLoyaltyAward, language } = useCardStore();

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

  // Dictionary for UI translations
  const dict = {
    en: {
      title: 'Add Standalone Award / Voucher',
      selectTemplate: 'Select Voucher Template',
      customFields: 'Custom Voucher Details',
      nameLabel: 'Voucher Name',
      namePlace: 'e.g., Hilton Gold Lounge Pass',
      brandLabel: 'Program Brand',
      brandPlace: 'e.g., Hilton, Alaska, Amex',
      progType: 'Program Category',
      awardType: 'Voucher Type',
      valueLabel: 'Estimated Cash Value (USD)',
      expLabel: 'Expiration Date (Optional)',
      notesLabel: 'Custom Notes (Optional)',
      notesPlace: 'e.g., Earned via 40-night milestone',
      cancelBtn: 'Cancel',
      submitBtn: 'Add Voucher to Box',
      descText: 'Vouchers and upgrade awards will automatically merge into your master Checklist, alert you in your Calendar, and participate in your Savings Wrapped Net Worth!',
    },
    zh: {
      title: '添加独立权益 / 卡券',
      selectTemplate: '选择卡券模板',
      customFields: '自定义卡券详情',
      nameLabel: '卡券名称',
      namePlace: '例如：希尔顿金卡行政酒廊券',
      brandLabel: '所属常客品牌',
      brandPlace: '例如：Hilton, Alaska, Amex',
      progType: '常客类别',
      awardType: '权益类别',
      valueLabel: '估算现值价值 (美元)',
      expLabel: '过期日期 (可选)',
      notesLabel: '自定义备注 (可选)',
      notesPlace: '例如：通过 40 晚 Milestone 达成获得',
      cancelBtn: '取消',
      submitBtn: '一键添加卡券',
      descText: '卡券与套房券会自动混入您的待办 Checklist、同步日历过期提醒，并累加折算价值到您的年度 Savings Wrapped 总结海报中！',
    }
  }[language];

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

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full max-w-[440px] border rounded-2xl shadow-2xl animate-scale-up overflow-hidden flex flex-col ${
        themeClass('bg-slate-955 border-slate-850 text-white', 'bg-white border-slate-200 text-slate-900')
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-dashed border-slate-800/30 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider">{dict.title}</h4>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg transition text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 max-h-[75vh] max-h-[75dvh] scrollbar-thin">
          {/* Description Tip */}
          <div className={`p-3 rounded-xl flex gap-2.5 border text-[10px] font-medium leading-relaxed leading-relaxed ${
            themeClass('bg-purple-500/5 border-purple-500/10 text-purple-300', 'bg-purple-500/5 border-purple-500/10 text-purple-700')
          }`}>
            <Info className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{dict.descText}</span>
          </div>

          {/* Select Template Dropdown */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {dict.selectTemplate}
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
              className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 border transition ${
                themeClass('bg-slate-950 border-slate-850 text-white', 'bg-slate-50 border-slate-250 text-slate-800')
              }`}
            >
              {Object.entries(AWARD_TEMPLATES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.brand !== 'Other' ? `[${t.brand}] ` : ''}{t.name}
                </option>
              ))}
            </select>
          </div>

          {/* If Pre-configured template: render display-only properties */}
          {!isCustom && (
            <div className={`grid grid-cols-2 gap-3 p-3.5 rounded-xl border ${
              themeClass('bg-slate-950/60 border-slate-850/80', 'bg-slate-50 border-slate-200')
            }`}>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-slate-500">Category / Type</span>
                <p className="text-[11px] font-extrabold capitalize text-purple-500">
                  {templateInfo.programType} • {templateInfo.awardType}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-slate-500">Est. Value</span>
                <p className="text-[11px] font-extrabold text-amber-500">
                  ${templateInfo.value} USD
                </p>
              </div>
            </div>
          )}

          {/* Custom Fields Group - Only rendered if selection === 'custom' */}
          {isCustom && (
            <div className={`space-y-3.5 p-3.5 rounded-xl border ${
              themeClass('bg-slate-950/40 border-slate-850/50', 'bg-slate-50/50 border-slate-200/80')
            }`}>
              <h5 className={`text-[9px] font-black uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
                {dict.customFields}
              </h5>
              
              {/* Custom Name */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-500">{dict.nameLabel}</label>
                <input
                  required
                  type="text"
                  placeholder={dict.namePlace}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 border transition ${
                    themeClass('bg-slate-950 border-slate-850 text-white', 'bg-white border-slate-250 text-slate-800')
                  }`}
                />
              </div>

              {/* Custom Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{dict.brandLabel}</label>
                  <input
                    required
                    type="text"
                    placeholder={dict.brandPlace}
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 border transition ${
                      themeClass('bg-slate-950 border-slate-850 text-white', 'bg-white border-slate-250 text-slate-800')
                    }`}
                  />
                </div>

                {/* Custom Value */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{dict.valueLabel}</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 border transition ${
                      themeClass('bg-slate-950 border-slate-850 text-white', 'bg-white border-slate-250 text-slate-800')
                    }`}
                  />
                </div>
              </div>

              {/* Custom Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{dict.progType}</label>
                  <select
                    value={customProgramType}
                    onChange={(e: any) => setCustomProgramType(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-2.5 py-2 focus:outline-none border transition ${
                      themeClass('bg-slate-950 border-slate-850 text-white', 'bg-white border-slate-250 text-slate-800')
                    }`}
                  >
                    <option value="hotel">Hotel 🏨</option>
                    <option value="airline">Airline ✈️</option>
                    <option value="bank">Bank 🏦</option>
                    <option value="other">Other 📦</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-500">{dict.awardType}</label>
                  <select
                    value={customAwardType}
                    onChange={(e: any) => setCustomAwardType(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-2.5 py-2 focus:outline-none border transition ${
                      themeClass('bg-slate-950 border-slate-850 text-white', 'bg-white border-slate-250 text-slate-800')
                    }`}
                  >
                    <option value="fnr">Free Night (FNA)</option>
                    <option value="sua">Suite Upgrade (SUA)</option>
                    <option value="goh">Guest of Honor</option>
                    <option value="companion">Companion Pass</option>
                    <option value="swu">Systemwide Up (SWU)</option>
                    <option value="points">Points Tracker</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Expiration Date Picker */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {dict.expLabel}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className={`w-full text-xs font-bold rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-purple-500 border transition ${
                  themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-50 border-slate-250 text-slate-800')
                }`}
              />
            </div>
          </div>


          {/* Custom Notes */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {dict.notesLabel}
            </label>
            <input
              type="text"
              placeholder={dict.notesPlace}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 border transition ${
                themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-50 border-slate-250 text-slate-800')
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
              {dict.cancelBtn}
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1 shadow-lg shadow-purple-500/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{dict.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
