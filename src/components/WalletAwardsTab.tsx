import { useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { AWARD_TEMPLATES } from '../data/cards.db';
import type { LoyaltyAward } from '../data/cards.db';
import { VoucherTicketCard } from './VoucherTicketCard';

interface WalletAwardsTabProps {
  loyaltyAwards: LoyaltyAward[];
  setDeleteAwardId: (id: string | null) => void;
  updateAwardUsedQuantity: (id: string, qty: number) => void;
  onEditAward: (award: LoyaltyAward) => void;
  setIsCreateAwardModalOpen: (open: boolean) => void;
}

export function WalletAwardsTab({
  loyaltyAwards,
  setDeleteAwardId,
  updateAwardUsedQuantity,
  onEditAward,
  setIsCreateAwardModalOpen
}: WalletAwardsTabProps) {
  const { t, themeClass } = useTranslation();

  const [awardSearchQuery, setAwardSearchQuery] = useState('');
  const [awardSortBy, setAwardSortBy] = useState<'expiry' | 'value-desc' | 'value-asc'>('expiry');
  const [isClaimedArchiveCollapsed, setIsClaimedArchiveCollapsed] = useState(true);

  const filteredAwards = loyaltyAwards.filter((a) => {
    if (awardSearchQuery) {
      const query = awardSearchQuery.toLowerCase();
      const isCustom = a.templateId === 'custom';
      const info = isCustom ? {
        name: a.customName || 'Custom Voucher',
        brand: a.customBrand || 'Other',
      } : (AWARD_TEMPLATES[a.templateId] || {
        name: a.customName || 'Unknown Voucher',
        brand: 'Other'
      });
      const name = info.name.toLowerCase();
      const brand = info.brand.toLowerCase();
      const notes = (a.notes || '').toLowerCase();
      if (!name.includes(query) && !brand.includes(query) && !notes.includes(query)) return false;
    }
    return true;
  });

  const sortedAwards = [...filteredAwards].sort((a, b) => {
    const isCustomA = a.templateId === 'custom';
    const infoA = isCustomA ? { value: a.customValue || 0 } : (AWARD_TEMPLATES[a.templateId] || { value: 0 });
    const isCustomB = b.templateId === 'custom';
    const infoB = isCustomB ? { value: b.customValue || 0 } : (AWARD_TEMPLATES[b.templateId] || { value: 0 });

    switch (awardSortBy) {
      case 'value-desc':
        return infoB.value - infoA.value;
      case 'value-asc':
        return infoA.value - infoB.value;
      case 'expiry':
      default: {
        const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
        const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
        return dateA - dateB;
      }
    }
  });

  const activeAwards = sortedAwards.filter((a) => (a.usedQuantity || 0) < 1);
  const inactiveAwards = sortedAwards.filter((a) => (a.usedQuantity || 0) >= 1);

  const renderAwardCard = (award: LoyaltyAward) => {
    const isCustom = award.templateId === 'custom';
    const info = isCustom ? {
      name: award.customName || 'Custom Voucher',
      brand: award.customBrand || 'Other',
      programType: award.customProgramType || 'other',
      awardType: award.customAwardType || 'other',
      value: award.customValue || 0
    } : (AWARD_TEMPLATES[award.templateId] || {
      name: award.customName || 'Unknown Voucher',
      brand: 'Other',
      programType: 'other',
      awardType: 'other',
      value: 0
    });

    const usedQty = award.usedQuantity || 0;
    const isCompleted = usedQty >= 1;

    return (
      <VoucherTicketCard
        key={award.id}
        award={{
          brand: info.brand,
          name: info.name,
          programType: info.programType,
          awardType: info.awardType,
          value: info.value,
          expirationDate: award.expirationDate,
          notes: award.notes
        }}
        isCompleted={isCompleted}
        onDelete={() => setDeleteAwardId(award.id)}
        onClaimToggle={() => updateAwardUsedQuantity(award.id, isCompleted ? 0 : 1)}
        onEdit={() => onEditAward(award)}
        themeClass={themeClass}
      />
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Standalone Loyalty Vouchers Box */}
      <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
        themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-2 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 ${themeClass('text-slate-400', 'text-slate-555')}`}>
            <Sparkles className="w-4 h-4 text-purple-500 animate-spin-slow" />
            {t('vouchersTitle')} ({activeAwards.length} {t('vouchersActive')})
          </h3>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder={t('searchVouchers')}
              value={awardSearchQuery}
              onChange={(e) => setAwardSearchQuery(e.target.value)}
              className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-full sm:w-36 font-medium ${
                themeClass('bg-slate-955 border-slate-850 focus:border-purple-500 text-slate-200', 'bg-slate-55 border-slate-255 focus:border-purple-500 text-slate-800 shadow-inner')
              }`}
            />
            <select
              value={awardSortBy}
              onChange={(e) => setAwardSortBy(e.target.value as 'expiry' | 'value-desc' | 'value-asc')}
              className={`border text-[10px] font-bold rounded-xl px-2 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer ${
                themeClass('bg-slate-955 border-slate-850 text-slate-300', 'bg-slate-50 border-slate-255 text-slate-700 shadow-sm')
              }`}
            >
              <option value="expiry">{t('sortExpiry')}</option>
              <option value="value-desc">{t('sortValueDesc')}</option>
              <option value="value-asc">{t('sortValueAsc')}</option>
            </select>
            <button
              onClick={() => setIsCreateAwardModalOpen(true)}
              className="flex items-center gap-1 bg-gradient-to-tr from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-white dark:from-slate-100 dark:to-slate-200 dark:hover:from-white dark:hover:to-slate-50 dark:text-slate-950 border border-slate-700/25 font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow shadow-black/5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              {t('addVoucherBtn')}
            </button>
          </div>
        </div>

        {loyaltyAwards.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-2xl mb-2">🎁</p>
            <p className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-800')}`}>{t('noVouchers')}</p>
            <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-455', 'text-slate-500')}`}>
              {t('vouchersDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Section 1: Active Vouchers Grid */}
            {activeAwards.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                {activeAwards.map(renderAwardCard)}
              </div>
            )}

            {/* Section 2: Inactive/Claimed Vouchers Archive */}
            {inactiveAwards.length > 0 && (
              <div className="mt-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800/60 space-y-3.5">
                <div 
                  onClick={() => setIsClaimedArchiveCollapsed(!isClaimedArchiveCollapsed)}
                  className="flex items-center justify-between cursor-pointer select-none group"
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${themeClass('text-slate-400', 'text-slate-500')} group-hover:opacity-80 transition`}>
                    {t('claimedArchive')} ({inactiveAwards.length} {t('vouchersUsed')})
                  </span>
                  <span className={`text-[9px] font-black select-none transition duration-200 ${themeClass('text-slate-455 hover:text-slate-300', 'text-slate-500 hover:text-slate-700')}`}>
                    {isClaimedArchiveCollapsed ? t('expand') : t('collapse')}
                  </span>
                </div>
                
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isClaimedArchiveCollapsed 
                    ? 'max-h-0 opacity-0 pointer-events-none' 
                    : 'max-h-[3000px] opacity-100 mt-3.5'
                }`}>
                  <div className="grid sm:grid-cols-2 gap-4 opacity-60 grayscale-[30%] hover:opacity-85 hover:grayscale-[10%] transition duration-300">
                    {inactiveAwards.map(renderAwardCard)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
