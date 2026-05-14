import { Sun, Moon, Calendar, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { CloudSyncBanner } from './CloudSyncBanner';

interface HeaderProps {
  setActiveModal: (modal: 'sync' | 'create-card' | 'create-award' | 'wrapped' | 'disconnect-gdrive' | 'wipe' | null) => void;
  handleLinkGoogleDrive: () => Promise<void>;
  handleDisconnectGoogleDrive: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  adjustMonth: (amount: number) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export function Header({
  setActiveModal,
  handleLinkGoogleDrive,
  handleDisconnectGoogleDrive,
  showToast,
  adjustMonth,
  currentDate,
  setCurrentDate
}: HeaderProps) {
  const {
    theme,
    language,
    ownedCards,
    loyaltyAwards,
    syncStatus,
    gdriveEmail,
    lastSyncedTime,
    setGDriveCredentials,
    setSyncStatus,
    toggleTheme
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  return (
    <header className={`border-b backdrop-blur-md sticky top-0 z-10 px-4 py-4 transition-colors duration-300 ${
      themeClass('border-slate-900 bg-zen-dark-card/80', 'border-slate-200 bg-zen-light-card/80')
    }`}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0">
            <svg 
              className="w-7.5 h-7.5 shrink-0 drop-shadow-[0_2px_8px_rgba(197,160,89,0.15)]" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c5a059" />
                  <stop offset="50%" stopColor="#fdf2d5" />
                  <stop offset="100%" stopColor="#9c7a3c" />
                </linearGradient>
              </defs>
              <rect 
                x="2" 
                y="5" 
                width="17" 
                height="11" 
                rx="1.5" 
                stroke="url(#logoGold)" 
                strokeWidth="1.5" 
                opacity="0.45" 
                transform="rotate(-12 10.5 10.5)" 
              />
              <rect 
                x="4" 
                y="7" 
                width="17" 
                height="11" 
                rx="1.5" 
                fill="url(#logoGold)" 
              />
              <rect 
                x="6" 
                y="9" 
                width="3" 
                height="2.2" 
                rx="0.4" 
                fill="#090d16" 
                opacity="0.9" 
              />
              <path 
                d="M 11.5 9.2 A 1.5 1.5 0 0 1 11.5 11.3 M 12.3 8.5 A 2.5 2.5 0 0 1 12.3 12" 
                stroke="#ffffff" 
                strokeWidth="0.65" 
                strokeLinecap="round" 
                opacity="0.75" 
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className={`text-lg font-bold tracking-tight ${themeClass('text-white', 'text-slate-900')}`}>PerkFolio</h1>
              <span className={`text-[9px] font-black uppercase tracking-widest ${themeClass('text-slate-455', 'text-slate-500')}`}>
                {t('brandSub')}
              </span>
            </div>
            <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${themeClass('bg-green-500', 'bg-green-600')}`}></span>
              <span>{t('today')}: {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end sm:justify-start self-end sm:self-auto animate-fade-in">
          {(ownedCards.length > 0 || loyaltyAwards.length > 0) && (
            <button
              onClick={() => setActiveModal('wrapped')}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-purple-600/15 border-purple-500/30 hover:border-purple-400/50 text-purple-400 hover:text-purple-300 font-extrabold text-xs transition duration-300 active:scale-90 cursor-pointer shadow-md shadow-purple-500/5 animate-pulse"
              title={t('wrapped')}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow hidden sm:block" />
              <span>{t('wrapped')}</span>
            </button>
          )}

          <CloudSyncBanner
            syncStatus={syncStatus}
            setSyncStatus={setSyncStatus}
            gdriveEmail={gdriveEmail}
            lastSyncedTime={lastSyncedTime}
            setGDriveCredentials={setGDriveCredentials}
            handleLinkGoogleDrive={handleLinkGoogleDrive}
            handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
            showToast={showToast}
            themeClass={themeClass}
          />

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
              themeClass(
                'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400',
                'bg-white border-slate-250 hover:bg-slate-100 text-amber-505 shadow-sm'
              )
            }`}
            title={theme === 'dark' ? t('toggleLightMode') : t('toggleDarkMode')}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {ownedCards.length > 0 && (
            <button
              onClick={() => setActiveModal('sync')}
              className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
                themeClass(
                  'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-500',
                  'bg-white border-slate-250 hover:bg-slate-100 text-amber-600 shadow-sm'
                )
              }`}
              title={t('syncReminders')}
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}

          <div className={`flex items-center rounded-full p-0.5 text-[11px] font-extrabold border ${
            themeClass('bg-slate-900 border-slate-800 text-slate-300', 'bg-slate-100 border-slate-250 text-slate-700')
          }`}>
            <button 
              type="button"
              onClick={() => adjustMonth(-1)} 
              className={`p-1.5 rounded-full transition cursor-pointer flex items-center justify-center ${themeClass('hover:bg-slate-800', 'hover:bg-slate-200')}`}
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span 
              onDoubleClick={() => {
                setCurrentDate(new Date());
                showToast(t('toastSandboxReset'), 'info');
              }}
              className="px-2 py-1 min-w-[75px] text-center font-extrabold text-[9.5px] tracking-wider uppercase cursor-pointer hover:opacity-80 active:scale-95 transition select-none"
              title="Double-click to reset back to Today"
            >
              {currentMonthStr.substring(0, 3)} {currentYear}
            </span>
            <button 
              type="button"
              onClick={() => adjustMonth(1)} 
              className={`p-1.5 rounded-full transition cursor-pointer flex items-center justify-center ${themeClass('hover:bg-slate-800', 'hover:bg-slate-200')}`}
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
