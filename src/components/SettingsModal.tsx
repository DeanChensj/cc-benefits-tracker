import { useState } from 'react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { ZenModal } from './ZenModal';
import { Globe, Cloud, Target, Trash2, ChevronDown, Settings } from 'lucide-react';
import { DEFAULT_VALUATIONS } from '../data/cards.db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWipeModal: () => void;
  handleLinkGoogleDrive: () => Promise<void>;
  handleDisconnectGoogleDrive: () => void;
}

export function SettingsModal({ isOpen, onClose, onOpenWipeModal, handleLinkGoogleDrive, handleDisconnectGoogleDrive }: SettingsModalProps) {
  const { 
    theme, 
    language, 
    toggleLanguage, 
    syncStatus, 
    gdriveEmail, 
    pointValuations,
    updatePointValuation,
    triggerSync,
    isCalendarSyncEnabled,
    setCalendarSyncEnabled
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const [isValuationsOpen, setIsValuationsOpen] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  const handleToggleCalendarSync = async () => {
    const nextState = !isCalendarSyncEnabled;
    if (nextState && !useCardStore.getState().gdriveToken) {
      try {
        await handleLinkGoogleDrive();
      } catch (err) {
        console.error('Google OAuth calendar connection failed:', err);
        return;
      }
    }
    setCalendarSyncEnabled(nextState);
  };

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      title={t('settingsTitle')}
      icon={<Settings className="w-4 h-4 text-purple-500" />}
      maxWidthClass="max-w-md"
    >
      <div className="p-4 space-y-6">
        
        {/* Section 1: Language */}
        <div className="space-y-2">
          <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-600')}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
            <Globe className="w-3.5 h-3.5" />
            {t('languageSettings')}
          </h3>
          <div className={`flex items-center justify-between p-3 rounded-xl border ${themeClass('bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-800/50 backdrop-blur-sm', 'bg-white border-slate-200 shadow-sm')}`}>
            <span className="text-xs font-bold">{t('currentLanguage')}</span>
            <div className="text-[11px] font-semibold tracking-wide select-none flex items-center gap-1.5">
              {language === 'zh' ? (
                <>
                  <span className="text-emerald-500 font-bold">简体中文</span>
                  <span className="opacity-30">•</span>
                  <button type="button" onClick={toggleLanguage} className="hover:text-purple-400 cursor-pointer underline">English</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={toggleLanguage} className="hover:text-purple-400 cursor-pointer underline">简体中文</button>
                  <span className="opacity-30">•</span>
                  <span className="text-emerald-500 font-bold">English</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Cloud Sync */}
        <div className="space-y-2">
          <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-600')}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <Cloud className="w-3.5 h-3.5" />
            {t('cloudTitle')}
          </h3>
          <div className={`p-3 rounded-xl border space-y-3 ${themeClass('bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-800/50 backdrop-blur-sm', 'bg-white border-slate-200 shadow-sm')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">{gdriveEmail ? t('cloudActive') : t('cloudInactive')}</p>
                {gdriveEmail && (
                  <p className={`text-[10px] font-medium ${themeClass('text-slate-500', 'text-slate-455')}`}>
                    {t('cloudAccount')} {gdriveEmail}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                syncStatus === 'synced' ? 'bg-emerald-500/20 text-emerald-500' :
                syncStatus === 'syncing' ? 'bg-amber-500/20 text-amber-500 animate-pulse' :
                syncStatus === 'error' ? 'bg-red-500/20 text-red-500' :
                'bg-slate-500/20 text-slate-500'
              }`}>
                {syncStatus === 'synced' ? t('cloudJustNow') :
                 syncStatus === 'syncing' ? t('cloudSyncingStatus') :
                 syncStatus === 'error' ? 'Failed' : 'Disconnected'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {gdriveEmail ? (
                <>
                  {syncStatus === 'synced' ? (
                    <button
                      type="button"
                      onClick={() => triggerSync()}
                      className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer ${
                        themeClass('bg-slate-800 hover:bg-slate-700 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                      }`}
                    >
                      {t('cloudSyncNow')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLinkGoogleDrive}
                      className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer bg-gradient-to-tr from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500`}
                    >
                      {t('cloudConnectBtn')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleDrive}
                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer ${
                      themeClass('bg-slate-800 hover:bg-slate-700 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                    }`}
                  >
                    {t('cloudDisconnect')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLinkGoogleDrive}
                  className={`flex-grow py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer bg-gradient-to-tr from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500`}
                >
                  {t('cloudConnectBtn')}
                </button>
              )}
            </div>

            {/* Integrated Google Calendar Cloud Sync Sub-Compartment */}
            <div className={`border-t border-dashed pt-3.5 mt-3.5 transition-all duration-300 ${
              gdriveEmail 
                ? themeClass('border-slate-800/60', 'border-slate-200/80') 
                : themeClass('border-slate-800/30 opacity-35', 'border-slate-200/40 opacity-40 pointer-events-none select-none')
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-left min-w-0">
                  <p className={`text-[11px] font-black tracking-wide flex items-center gap-1 ${
                    themeClass('text-slate-200', 'text-slate-850')
                  }`}>
                    {t('calAutoSync')}
                  </p>
                  <p className={`text-[9.5px] font-bold mt-0.5 leading-relaxed ${
                    themeClass('text-slate-500', 'text-slate-550')
                  }`}>
                    {t('calAutoSyncDesc')}
                  </p>
                </div>
                
                {gdriveEmail ? (
                  <button
                    type="button"
                    onClick={handleToggleCalendarSync}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isCalendarSyncEnabled ? 'bg-sky-500' : themeClass('bg-slate-800', 'bg-slate-200')
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isCalendarSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                ) : (
                  <span className={`text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded border ${
                    themeClass('bg-slate-900/50 text-slate-500 border-slate-850/50', 'bg-slate-100 text-slate-500 border-slate-200')
                  } select-none shrink-0`}>
                    {t('needCloudBadge')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Browser Extension */}
        <div className="space-y-2">
          <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-600')}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
            <Globe className="w-3.5 h-3.5" />
            {t('extTitle')}
          </h3>
          <div className={`p-3 rounded-xl border space-y-2 ${themeClass('bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-800/50 backdrop-blur-sm', 'bg-white border-slate-200 shadow-sm')}`}>
            <div>
              <p className="text-xs font-bold">{t('extGetTitle')}</p>
              <p className={`text-[10px] font-medium mt-1 leading-relaxed ${themeClass('text-slate-300', 'text-slate-600')}`}>
                {t('extStatus')}
              </p>

              {/* Beautiful Feature Highlights Box */}
              <div className={`mt-3 p-2.5 rounded-xl border space-y-2.5 text-left ${
                themeClass('bg-slate-950/50 border-slate-850/80 text-slate-300', 'bg-slate-50/80 border-slate-200 text-slate-700')
              }`}>
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-teal-500 dark:text-teal-400 font-black text-[16px] leading-none select-none shrink-0">•</span>
                  <div>
                    <p className="font-bold">{t('extHighlightAlerts')}</p>
                    <p className={`text-[10px] mt-0.5 leading-relaxed ${themeClass('text-slate-450', 'text-slate-550')}`}>
                      {t('extHighlightAlertsDesc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-purple-500 dark:text-purple-400 font-black text-[16px] leading-none select-none shrink-0">•</span>
                  <div>
                    <p className="font-bold">{t('extHighlightSync')}</p>
                    <p className={`text-[10px] mt-0.5 leading-relaxed ${themeClass('text-slate-450', 'text-slate-550')}`}>
                      {t('extHighlightSyncDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="https://chromewebstore.google.com/detail/perkfolio-assistant/bbneiifahonicipbcmhilfklpekcgdfg"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 block w-full text-center py-2.5 px-4 rounded-xl text-xs font-black tracking-wider bg-gradient-to-tr from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-teal-500/10 transition duration-200 active:scale-95 select-none"
              >
                {t('extDownloadBtn')}
              </a>
            </div>
          </div>
        </div>

        {/* Section 4: Points Valuations */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsValuationsOpen(!isValuationsOpen)}
            className="w-full flex items-center justify-between"
          >
            <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-600')}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <Target className="w-3.5 h-3.5" />
              {t('valEditorTitle')}
            </h3>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isValuationsOpen ? 'transform rotate-180' : ''} ${themeClass('text-slate-500', 'text-slate-400')}`} />
          </button>
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isValuationsOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 pointer-events-none'
          }`}>
            <div className={`p-3 rounded-xl border space-y-3 ${themeClass('bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-800/50 backdrop-blur-sm', 'bg-white border-slate-200 shadow-sm')}`}>
              <p className={`text-[10px] leading-relaxed ${themeClass('text-slate-450', 'text-slate-500')}`}>
                {t('valEditorDesc')}
              </p>
              <button
                type="button"
                onClick={() => {
                  Object.entries(DEFAULT_VALUATIONS).forEach(([currency, value]) => {
                    updatePointValuation(currency, value);
                  });
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer border mb-2 ${
                  themeClass('bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700', 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300')
                }`}
              >
                {language === 'zh' ? '重置为行业标准估值' : 'Reset to Industry Standards'}
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(pointValuations || {}).map(([currency, value]) => (
                  <div key={currency} className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border ${
                    themeClass('bg-slate-900/20 border-slate-850', 'bg-white border-slate-200 shadow-sm')
                  }`}>
                    <span className="text-[10px] font-bold truncate">{currency}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={value}
                        onChange={(e) => updatePointValuation(currency, parseFloat(e.target.value))}
                        className={`w-10 p-0.5 text-center text-[10px] font-bold font-mono border rounded focus:outline-none focus:border-purple-500 ${
                          themeClass('bg-slate-955 text-white border-slate-700', 'bg-white text-slate-900 border-slate-250')
                        }`}
                      />
                      <span className="text-[9px] text-slate-500">cpp</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Danger Zone */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
            className="w-full flex items-center justify-between"
          >
            <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-red-500`}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'zh' ? '危险区域' : 'Danger Zone'}
            </h3>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDangerZoneOpen ? 'transform rotate-180' : ''} text-red-500`} />
          </button>
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isDangerZoneOpen ? 'max-h-[200px] opacity-100 mt-2' : 'max-h-0 opacity-0 pointer-events-none'
          }`}>
            <div className={`p-3 rounded-xl border space-y-2 ${themeClass('bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-800/50 backdrop-blur-sm', 'bg-white border-slate-200 shadow-sm')}`}>
              <p className={`text-[10px] leading-relaxed ${themeClass('text-slate-455', 'text-slate-500')}`}>
                {t('dangerZoneDesc')}
              </p>
              <button
                type="button"
                onClick={onOpenWipeModal}
                className={`w-full py-2 px-3 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer bg-gradient-to-tr from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500`}
              >
                {t('wipeAllDataBtn')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </ZenModal>
  );
}
