interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  theme: 'dark' | 'light';
  onUndo?: () => void;
}

export function Toast({ message, type, theme, onUndo }: ToastProps) {
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-scale-up max-w-[90vw] w-fit shrink-0">
      <div className={`px-6 py-4 rounded-2xl border-2 text-sm font-black flex items-center justify-between gap-4 shadow-3xl backdrop-blur-xl transition-all duration-300 pointer-events-auto ${
        type === 'error'
          ? themeClass('bg-rose-955/90 border-rose-500/30 text-rose-200 shadow-[0_15px_40px_rgba(244,63,94,0.2)]', 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-xl shadow-rose-800/5')
        : type === 'warning'
          ? themeClass('bg-amber-955/90 border-amber-500/30 text-amber-200 shadow-[0_15px_40px_rgba(245,158,11,0.2)]', 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-xl shadow-amber-800/5')
        : type === 'info'
          ? themeClass('bg-slate-900/95 border-slate-800 text-slate-300 shadow-[0_15px_40px_rgba(15,23,42,0.4)]', 'bg-white/95 border-slate-200 text-slate-800 shadow-xl shadow-slate-200/30')
        : themeClass('bg-emerald-955/90 border-emerald-500/30 text-emerald-200 shadow-[0_15px_40px_rgba(16,185,129,0.2)]', 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-xl shadow-emerald-800/5')
      }`}>
        <span className="leading-relaxed">{message}</span>
        {onUndo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            className={`ml-4 px-3 py-1 rounded-xl font-black uppercase text-[10px] tracking-wider cursor-pointer transition active:scale-95 hover:underline ${
              type === 'error' ? themeClass('bg-rose-500/20 text-rose-300 hover:bg-rose-500/30', 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15') :
              type === 'warning' ? themeClass('bg-amber-500/20 text-amber-300 hover:bg-amber-500/30', 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/15') :
              type === 'info' ? themeClass('bg-slate-800 text-white hover:bg-slate-750', 'bg-black/5 text-slate-900 hover:bg-black/10') :
              themeClass('bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30', 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15')
            }`}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
