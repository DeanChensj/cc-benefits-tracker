import { Trash2, Edit3 } from 'lucide-react';
import { getAwardTheme } from '../utils/themeUtils';
import { useCardStore } from '../store/useCardStore';
import { translations, getTranslatedProgramType } from '../utils/i18n';

interface VoucherTicketCardProps {
  award: {
    id?: string;
    brand: string;
    name: string;
    programType?: string;
    awardType?: string;
    value: number;
    expirationDate?: string;
    notes?: string;
  };
  isCompleted?: boolean;
  onDelete?: () => void;
  onClaimToggle?: () => void;
  onEdit?: () => void;
  isStaticPreview?: boolean;
  themeClass: (dark: string, light: string) => string;
}

export function VoucherTicketCard({
  award,
  isCompleted = false,
  onDelete,
  onClaimToggle,
  onEdit,
  isStaticPreview = false,
  themeClass
}: VoucherTicketCardProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']): string => (translations[language][key] || translations['en'][key]) as string;

  const theme = getAwardTheme(award.brand, award.awardType || '', themeClass);

  return (
    <div
      className={`rounded-2xl border flex justify-between transition duration-200 relative overflow-hidden select-none min-h-[150px] bg-gradient-to-tr ${
        isCompleted ? 'opacity-50 grayscale-[30%]' : ''
      } ${theme.bgClass} ${themeClass('border-white/10 text-white', 'border-slate-250/80 text-slate-900 shadow-sm')}`}
    >
      {/* Background Angled Watermark */}
      <div className="absolute right-[32%] bottom-[-10px] select-none pointer-events-none opacity-[0.03] text-[50px] font-black tracking-widest uppercase font-sans -rotate-12 leading-none z-0">
        {theme.watermark}
      </div>

      {/* 1. Left Column: Main Ticket Body (70%) */}
      <div className="flex-grow p-4 relative text-left min-w-0 flex flex-col justify-between z-10 pr-2">
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap w-full select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0 ${theme.brandTagClass}`}>
                {award.brand}
              </span>
              {award.programType && (
                <span className={`text-[7.5px] font-bold uppercase tracking-wide truncate ${themeClass('text-white/75', 'text-slate-500')}`}>
                  • {getTranslatedProgramType(award.programType, language)}
                </span>
              )}
            </div>
            {award.expirationDate && (
              <span className={`text-[8px] font-black tracking-widest uppercase shrink-0 ${
                isCompleted 
                  ? 'line-through text-white/30 dark:text-white/20' 
                  : themeClass('text-white/90', 'text-slate-500')
              }`}>
                {t('expiresLabel')}: {award.expirationDate}
              </span>
            )}
          </div>
          
          {isStaticPreview || !onEdit ? (
            <h4 className={`text-xs font-black mt-2.5 break-words line-clamp-2 leading-snug ${themeClass('text-white', 'text-slate-900')}`}>
              {award.name}
            </h4>
          ) : (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1.5 cursor-pointer group/edit max-w-fit mt-2.5"
              title="Click to edit voucher details"
            >
              <h4 className={`text-xs font-black break-words line-clamp-2 leading-snug ${themeClass('text-white', 'text-slate-900')}`}>
                {award.name}
              </h4>
              <Edit3 className="w-3 h-3 shrink-0 opacity-50 group-hover/edit:opacity-100" />
            </div>
          )}
          
          {award.notes && (
            <p className={`text-[10px] mt-1.5 leading-relaxed font-semibold truncate ${themeClass('text-white/85', 'text-slate-600')}`}>
              {award.notes}
            </p>
          )}
        </div>

        <div className={`mt-3 text-[8.5px] font-bold flex items-baseline gap-1 select-none ${themeClass('text-white/80', 'text-slate-500')}`}>
          <span>{t('voucherValue')}</span>
          <span className={`font-black text-base leading-none ${
            isCompleted 
              ? 'text-slate-400/60 line-through' 
              : themeClass('text-teal-400', 'text-teal-600 font-black')
          }`}>${award.value}</span>
          <span className="opacity-50">{t('each')}</span>
        </div>
      </div>

      {/* 2. Right Column: Ticket Stub Receipt (30%) */}
      <div className="w-24 shrink-0 p-3.5 pt-6 flex flex-col justify-between items-center border-l-2 border-dashed border-white/10 dark:border-black/25 relative text-center z-10">
        {/* Circular Punch Tear Notches */}
        <div className={`absolute -top-2 -left-[9px] w-4.5 h-4.5 rounded-full z-20 ${themeClass('bg-slate-955', 'bg-slate-55')}`} />
        <div className={`absolute -bottom-2 -left-[9px] w-4.5 h-4.5 rounded-full z-20 ${themeClass('bg-slate-955', 'bg-slate-55')}`} />

        {/* Close Delete Button - Hidden in static preview mode */}
        {!isStaticPreview && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`absolute top-2 right-2 p-1 rounded transition cursor-pointer active:scale-90 z-30 ${
              themeClass('text-red-400 hover:text-red-300 hover:bg-red-500/10', 'text-red-600 hover:text-red-700 hover:bg-red-500/5')
            }`}
            title="Delete standalone award"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Interactive Use Toggle Button */}
        {isStaticPreview ? (
          /* Inert Preview Mode Capsule Button */
          <div className={`w-full py-1.5 rounded-lg text-[8.5px] font-extrabold uppercase tracking-widest text-center select-none mt-3.5 border border-dashed ${
            themeClass('bg-white/10 border-white/15 text-white/60', 'bg-black/5 border-black/10 text-slate-500 shadow-sm')
          }`}>
            {t('claimBtn')}
          </div>
        ) : (
          /* Active Interactive Mode Button */
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onClaimToggle) onClaimToggle();
            }}
            className={`w-full py-1.5 rounded-lg text-[8.5px] font-extrabold uppercase tracking-widest transition z-30 cursor-pointer active:scale-95 mt-3.5 ${
              isCompleted
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                : themeClass(
                    'bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-black/10 backdrop-blur-sm',
                    'bg-teal-600 hover:bg-teal-750 border border-teal-750 text-white shadow-sm shadow-teal-600/10'
                  )
            }`}
          >
            {isCompleted ? t('usedStatus') : t('claimBtn')}
          </button>
        )}

        {/* Stub Balance Indicator */}
        <div className="w-full mt-2">
          <span className={`text-[9px] font-black uppercase tracking-wider block truncate max-w-full ${
            isCompleted ? 'text-emerald-400/60 line-through' : themeClass(theme.glowColor, 'text-slate-600 font-extrabold')
          }`}>
            {isCompleted ? `${t('balancePrefix')}0` : `${t('balancePrefix')}${award.value}`}
          </span>
        </div>
      </div>
    </div>
  );
}
