export function getAwardTheme(
  brandName: string,
  awardType: string,
  themeClass: (dark: string, light: string) => string
) {
  const brand = brandName.toLowerCase();
  const type = awardType.toLowerCase();

  if (brand.includes('marriott')) {
    return {
      bgClass: themeClass(
        'from-slate-900 via-slate-900/95 to-stone-950 border-amber-500/10 text-amber-400 shadow-[0_8px_25px_rgba(245,158,11,0.05)]', 
        'from-amber-50/30 via-amber-50/20 to-stone-100/40 border-amber-600/20 text-amber-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-amber-500/10 text-amber-400 border-amber-500/20', 'bg-amber-600/10 text-amber-800 border-amber-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: type.includes('sua') || type.includes('upgrade') ? 'UPGRADE' : 'FREE NIGHT',
      glowColor: themeClass('text-amber-400', 'text-amber-600')
    };
  }
  if (brand.includes('hyatt')) {
    return {
      bgClass: themeClass(
        'from-blue-950 via-blue-950/95 to-slate-955 border-blue-500/10 text-blue-400 shadow-[0_8px_25px_rgba(59,130,246,0.05)]', 
        'from-blue-50/30 via-blue-50/20 to-sky-100/40 border-blue-600/20 text-blue-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-blue-500/10 text-blue-400 border-blue-500/20', 'bg-blue-600/10 text-blue-800 border-blue-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: type.includes('sua') ? 'SUITE UPGRADE' : 'REWARD NIGHT',
      glowColor: themeClass('text-blue-400', 'text-blue-600')
    };
  }
  if (brand.includes('hilton')) {
    return {
      bgClass: themeClass(
        'from-indigo-950 via-indigo-950/95 to-slate-955 border-indigo-500/10 text-indigo-400 shadow-[0_8px_25px_rgba(99,102,241,0.05)]', 
        'from-indigo-50/30 via-indigo-50/20 to-violet-100/40 border-indigo-600/20 text-indigo-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 'bg-indigo-600/10 text-indigo-800 border-indigo-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: 'REWARD NIGHT',
      glowColor: themeClass('text-indigo-400', 'text-indigo-600')
    };
  }
  if (brand.includes('ihg')) {
    return {
      bgClass: themeClass(
        'from-emerald-950 via-emerald-950/95 to-slate-955 border-emerald-500/10 text-emerald-400 shadow-[0_8px_25px_rgba(16,185,129,0.05)]', 
        'from-emerald-50/30 via-emerald-50/20 to-teal-100/40 border-emerald-600/20 text-emerald-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 'bg-emerald-600/10 text-emerald-800 border-emerald-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: 'FREE NIGHT',
      glowColor: themeClass('text-emerald-400', 'text-emerald-600')
    };
  }
  return {
    bgClass: themeClass(
      'from-slate-905 via-slate-905/95 to-zinc-950 border-slate-700/20 text-slate-400 shadow-[0_8px_25px_rgba(148,163,184,0.05)]', 
      'from-slate-50/45 via-slate-50/35 to-zinc-100/45 border-slate-250 text-slate-700 shadow-sm'
    ),
    brandTagClass: themeClass('bg-slate-500/10 text-slate-400 border-slate-700/20', 'bg-slate-200/50 text-slate-700 border-slate-300/50'),
    subTextClass: themeClass('text-slate-400', 'text-slate-600'),
    watermark: 'VOUCHER',
    glowColor: themeClass('text-slate-400', 'text-slate-600')
  };
}
