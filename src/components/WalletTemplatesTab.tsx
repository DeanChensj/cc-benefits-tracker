import { useTranslation } from '../hooks/useTranslation';
import type { OwnedCardInstance } from '../store/useCardStore';
import { CardTemplatesCatalog } from './CardTemplatesCatalog';
import type { CardTemplate } from '../data/cards.db';

interface WalletTemplatesTabProps {
  ownedCards: OwnedCardInstance[];
  selectedTemplates: string[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  onViewTemplateDetail: (template: CardTemplate) => void;
}

export function WalletTemplatesTab({
  ownedCards,
  selectedTemplates,
  setSelectedTemplates,
  onViewTemplateDetail
}: WalletTemplatesTabProps) {
  const { t, themeClass } = useTranslation();

  return (
    <div className="space-y-3.5">
      {ownedCards.length === 0 && (
        <div className={`p-4 rounded-2xl border text-left relative overflow-hidden shadow-lg ${
          themeClass(
            'bg-gradient-to-br from-purple-950/30 via-indigo-950/15 to-slate-950/40 border-purple-500/15 text-slate-300',
            'bg-gradient-to-br from-purple-50/40 via-indigo-50/25 to-slate-100/40 border-purple-500/20 text-slate-750 shadow-sm'
          )
        }`}>
          {/* Microlight reflection sweep animation background */}
          <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full animate-[shimmer_3s_infinite]" />
          
          <h4 className={`text-xs font-black flex items-center gap-1.5 uppercase tracking-wider ${themeClass('text-purple-350', 'text-purple-700')}`}>
            {t('onboardBannerTitle')}
          </h4>
          <p className="text-[10.5px] leading-relaxed font-semibold mt-1.5 opacity-85">
            {t('onboardBannerDesc')}
          </p>
        </div>
      )}
      <CardTemplatesCatalog
        themeClass={themeClass}
        selectedTemplates={selectedTemplates}
        setSelectedTemplates={setSelectedTemplates}
        onViewTemplateDetail={onViewTemplateDetail}
      />
    </div>
  );
}
