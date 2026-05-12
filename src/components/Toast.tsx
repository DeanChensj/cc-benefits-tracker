interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  theme: 'dark' | 'light';
}

export function Toast({ message, type, theme }: ToastProps) {
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-scale-up max-w-[90vw] w-fit shrink-0">
      <div className={`px-4 py-2.5 rounded-r-xl border border-l-[3.5px] text-xs font-bold flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl transition-all duration-300 pointer-events-auto ${
        type === 'error' ? 'border-l-rose-500' :
        type === 'warning' ? 'border-l-amber-500' :
        type === 'info' ? 'border-l-purple-500' : 'border-l-emerald-500'
      } ${
        themeClass('bg-slate-900/90 border-slate-850 text-slate-100 shadow-slate-950/50', 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/30')
      }`}>
        <span className="leading-none">{message}</span>
      </div>
    </div>
  );
}
