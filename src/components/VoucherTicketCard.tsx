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

  const getVoucherBorderColor = () => {
    const p = award.programType || 'other';
    if (p === 'hotel') return 'border-l-rose-500';
    if (p === 'airline') return 'border-l-sky-500';
    if (p === 'bank') return 'border-l-purple-500';
    return 'border-l-emerald-500';
  };

  return (
    <div
      className={`rounded-xl border flex justify-between transition duration-200 relative overflow-hidden select-none min-h-[140px] border-l-[3.5px] ${
        isCompleted ? 'opacity-50 grayscale-[30%]' : ''
      } ${getVoucherBorderColor()} ${
        themeClass('bg-slate-900/40 border-slate-850/80 text-slate-300 backdrop-blur-sm', 'bg-white border-slate-200 text-slate-700 shadow-sm')
      }`}
    >
      {/* Background Angled Watermark */}
      <div className="absolute right-[32%] bottom-[-10px] select-none pointer-events-none opacity-[0.03] text-[50px] font-black tracking-widest uppercase font-sans -rotate-12 leading-none z-0 dark:text-white text-slate-900">
        {theme.watermark}
      </div>

      {/* 1. Left Column: Main Ticket Body (70%) */}
      <div className="flex-grow p-3.5 relative text-left min-w-0 flex flex-col justify-between z-10 pr-2">
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap w-full select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[7.5px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider border shrink-0 ${
                themeClass('bg-slate-950 border-slate-800 text-slate-300', 'bg-slate-100 border-slate-250 text-slate-700')
              }`}>
                {award.brand}
              </span>
              {award.programType && (
                <span className={`text-[7px] font-bold uppercase tracking-wide truncate ${themeClass('text-slate-400', 'text-slate-505')}`}>
                  • {getTranslatedProgramType(award.programType, language)}
                </span>
              )}
            </div>
            {award.expirationDate && (
              <span className={`text-[7.5px] font-black tracking-widest uppercase shrink-0 ${
                isCompleted 
                  ? 'line-through text-slate-600 dark:text-slate-600' 
                  : themeClass('text-slate-400', 'text-slate-505')
              }`}>
                {t('expiresLabel')}: {award.expirationDate}
              </span>
            )}
          </div>
          
          {isStaticPreview || !onEdit ? (
            <h4 className={`text-xs font-black mt-2 break-words line-clamp-2 leading-snug ${themeClass('text-white', 'text-slate-900')}`}>
              {award.name}
            </h4>
          ) : (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1.5 cursor-pointer group/edit max-w-fit mt-2"
              title="Click to edit voucher details"
            >
              <h4 className={`text-xs font-black break-words line-clamp-2 leading-snug ${themeClass('text-white', 'text-slate-900')}`}>
                {award.name}
              </h4>
              <Edit3 className="w-3 h-3 shrink-0 opacity-50 group-hover/edit:opacity-100" />
            </div>
          )}
          
          {award.notes && (
            <p className={`text-[9.5px] mt-1 leading-relaxed font-medium truncate ${themeClass('text-slate-400', 'text-slate-505')}`}>
              {award.notes}
            </p>
          )}
        </div>

        <div className={`mt-2 text-[8px] font-bold flex items-baseline gap-1 select-none ${themeClass('text-slate-450', 'text-slate-505')}`}>
          <span>{t('voucherValue')}</span>
          <span className={`font-black text-[13px] font-mono leading-none ${
            isCompleted 
              ? 'text-slate-500 opacity-60 line-through' 
              : themeClass('text-emerald-400', 'text-emerald-600')
          }`}>${award.value}</span>
          <span className="opacity-50 text-[7.5px] uppercase tracking-wider">{t('each')}</span>
        </div>
      </div>

      {/* 2. Right Column: Ticket Stub Receipt (30%) */}
      <div className="w-24 shrink-0 p-3.5 flex flex-col justify-between items-center border-l border-slate-200/40 dark:border-slate-800/50 relative text-center z-10">
        {/* Close Delete Button - Restored to absolute top-right */}
        {!isStaticPreview && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`absolute top-2.5 right-2.5 p-1 rounded transition cursor-pointer active:scale-90 z-30 ${
              themeClass('text-slate-500 hover:text-red-400 hover:bg-red-500/10', 'text-slate-400 hover:text-red-600 hover:bg-red-500/5')
            }`}
            title="Delete standalone award"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Stub Micro Barcode Centerpiece (Centered vertically for optimal balance) */}
        <div className="w-full flex-grow flex flex-col items-center justify-center gap-1 select-none pt-4">
          <span className={`text-[6px] font-black uppercase tracking-[0.25em] opacity-60 ${themeClass('text-slate-400', 'text-slate-500')}`}>
            TICKET STUB
          </span>
          
          {/* Faux Barcode via flex lines */}
          <div className={`flex items-center gap-[1.5px] h-5 w-14 overflow-hidden opacity-40 dark:opacity-30 ${themeClass('text-white', 'text-slate-900')}`}>
            <span className="w-[1.5px] h-full bg-current shrink-0"></span>
            <span className="w-[3px] h-full bg-current shrink-0"></span>
            <span className="w-[0.5px] h-full bg-current shrink-0 opacity-20"></span>
            <span className="w-[2px] h-full bg-current shrink-0"></span>
            <span className="w-[0.5px] h-full bg-current shrink-0"></span>
            <span className="w-[3.5px] h-full bg-current shrink-0"></span>
            <span className="w-[1px] h-full bg-current shrink-0"></span>
            <span className="w-[2px] h-full bg-current shrink-0"></span>
            <span className="w-[0.5px] h-full bg-current shrink-0 opacity-20"></span>
            <span className="w-[1.5px] h-full bg-current shrink-0"></span>
            <span className="w-[3px] h-full bg-current shrink-0"></span>
          </div>
          
          <span className={`text-[5.5px] font-black font-mono tracking-widest opacity-50 ${themeClass('text-slate-400', 'text-slate-600')}`}>
            #{award.id?.substring(0, 5).toUpperCase() || '00000'}
          </span>
        </div>

        {/* Interactive Use Toggle Button (Restored to full width) */}
        {isStaticPreview ? (
          /* Inert Preview Mode Capsule Button */
          <div className={`w-full py-1.5 rounded-xl text-[7.5px] font-black uppercase tracking-widest text-center select-none border mt-auto ${
            themeClass('bg-slate-950/50 border-slate-850 text-slate-600', 'bg-slate-50 border-slate-250 text-slate-400 shadow-sm')
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
            className={`w-full py-1.5 rounded-xl text-[7.5px] font-black uppercase tracking-widest transition z-30 cursor-pointer active:scale-95 mt-auto ${
              isCompleted
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                : themeClass(
                    'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white shadow-md shadow-purple-500/10',
                    'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white shadow-md shadow-purple-500/10'
                  )
            }`}
          >
            {isCompleted ? t('usedStatus') : t('claimBtn')}
          </button>
        )}
      </div>
    </div>
  );
}
