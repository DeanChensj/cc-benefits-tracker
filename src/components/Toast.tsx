interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  theme: 'dark' | 'light';
}

export function Toast({ message, type, theme }: ToastProps) {
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-scale-up">
      <div className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        type === 'error'
          ? themeClass('bg-rose-955/90 border-rose-500/30 text-rose-200 shadow-[0_10px_30px_rgba(244,63,94,0.1)]', 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-lg shadow-rose-800/5')
        : type === 'warning'
          ? themeClass('bg-amber-955/90 border-amber-500/30 text-amber-200 shadow-[0_10px_30px_rgba(245,158,11,0.1)]', 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-lg shadow-amber-800/5')
        : type === 'info'
          ? themeClass('bg-slate-900/90 border-slate-800 text-slate-300 shadow-[0_10px_30px_rgba(15,23,42,0.3)]', 'bg-white/95 border-slate-200 text-slate-800 shadow-lg shadow-slate-200/30')
        : themeClass('bg-emerald-955/90 border-emerald-500/30 text-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.1)]', 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-lg shadow-emerald-800/5')
      }`}>
        <span>{message}</span>
      </div>
    </div>
  );
}
