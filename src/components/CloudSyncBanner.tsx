import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, ChevronDown } from 'lucide-react';
import { requestGDriveToken, fetchUserEmail } from '../utils/gdrive';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface CloudSyncBannerProps {
  syncStatus: 'disconnected' | 'syncing' | 'synced' | 'error';
  setSyncStatus: (status: 'disconnected' | 'syncing' | 'synced' | 'error') => void;
  gdriveEmail: string | null;
  lastSyncedTime: string | null;
  setGDriveCredentials: (token: string, email: string) => void;
  handleLinkGoogleDrive: () => void;
  handleDisconnectGoogleDrive: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  themeClass: (dark: string, light: string) => string;
}

export function CloudSyncBanner({
  syncStatus,
  setSyncStatus,
  gdriveEmail,
  lastSyncedTime,
  setGDriveCredentials,
  handleLinkGoogleDrive,
  handleDisconnectGoogleDrive,
  showToast,
  themeClass
}: CloudSyncBannerProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const [isSyncDropdownOpen, setIsSyncDropdownOpen] = useState(false);
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => {
    return localStorage.getItem('cc_tracker_gdrive_clientid') || '';
  });

  const saveCustomClientId = (id: string) => {
    const trimmed = id.trim();
    setCustomClientId(trimmed);
    if (trimmed) {
      localStorage.setItem('cc_tracker_gdrive_clientid', trimmed);
      showToast(language === 'zh' ? '💾 成功保存自定义 Google Client ID！' : '💾 Custom Google Client ID saved successfully!', 'success');
    } else {
      localStorage.removeItem('cc_tracker_gdrive_clientid');
      showToast(language === 'zh' ? '🗑️ 已还原为系统默认 GDrive 客户端 ID。' : '🗑️ Reverted to system default GDrive Client ID.', 'warning');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsSyncDropdownOpen(!isSyncDropdownOpen)}
        className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
          syncStatus === 'synced'
            ? themeClass('bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15', 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100 shadow-sm')
            : syncStatus === 'syncing'
            ? themeClass('bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse', 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm')
            : syncStatus === 'error'
            ? themeClass('bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15', 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-sm')
            : themeClass('bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400', 'bg-white border-slate-250 hover:bg-slate-100 text-slate-505 shadow-sm')
        }`}
        title={t('cloudTitle')}
      >
        {syncStatus === 'synced' ? (
          <Cloud className="w-4 h-4" />
        ) : (
          <CloudOff className="w-4 h-4" />
        )}
      </button>

      {isSyncDropdownOpen && (
        <div className={`border rounded-xl p-4 shadow-2xl z-50 animate-scale-up flex flex-col gap-3 max-sm:fixed max-sm:top-16 max-sm:right-4 max-sm:left-4 max-sm:w-auto sm:absolute sm:right-0 sm:w-64 sm:mt-2 ${
          themeClass('bg-slate-900/95 border-slate-800 text-slate-200 backdrop-blur-xl shadow-slate-950/50', 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-xl shadow-slate-300/30')
        }`}>
          <div className="flex items-start gap-2.5">
            <div className={`p-2 rounded-lg shrink-0 ${
              syncStatus === 'synced' 
                ? 'bg-green-500/10 text-green-50' 
                : syncStatus === 'syncing' 
                ? 'bg-purple-500/10 text-purple-500 animate-pulse'
                : syncStatus === 'error'
                ? 'bg-red-500/10 text-red-50'
                : themeClass('bg-slate-950 text-slate-400', 'bg-slate-100 text-slate-505')
            }`}>
              {syncStatus === 'synced' ? (
                <Cloud className="w-4.5 h-4.5" />
              ) : (
                <CloudOff className="w-4.5 h-4.5" />
              )}
            </div>
            <div className="space-y-0.5 text-left min-w-0">
              <h5 className={`font-bold text-xs ${themeClass('text-white', 'text-slate-900')}`}>
                {t('cloudTitle')}
              </h5>
              <p className={`text-[10px] leading-normal ${themeClass('text-slate-400', 'text-slate-550')}`}>
                {syncStatus === 'synced' 
                  ? t('cloudActive')
                  : t('cloudInactive')}
              </p>
            </div>
          </div>

          {syncStatus === 'synced' && (
            <div className={`p-2.5 rounded-xl border text-[10px] text-left space-y-1 ${
              themeClass('bg-slate-950 border-slate-850 text-slate-300', 'bg-slate-50 border-slate-200 text-slate-750 shadow-inner')
            }`}>
              <p className="truncate font-bold">{t('cloudAccount')} {gdriveEmail}</p>
              <p className="opacity-80 font-medium">{t('cloudLastSync')} {lastSyncedTime || t('cloudJustNow')}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-slate-200/40 dark:border-slate-800/40">
            {syncStatus === 'synced' ? (
              <>
                <button
                  onClick={async () => {
                    setIsSyncDropdownOpen(false);
                    setSyncStatus('syncing');
                    try {
                      let token = useCardStore.getState().gdriveToken;
                      if (!token) {
                        token = await requestGDriveToken(customClientId);
                        const email = await fetchUserEmail(token);
                        setGDriveCredentials(token, email);
                      }
                      await useCardStore.getState().syncWithGDrive();
                      showToast(language === 'zh' ? '🎉 备份数据已完美同步至 Google Drive！' : '🎉 Synchronized with Google Drive successfully!');
                    } catch (err) {
                      console.error('Manual Force Sync failed:', err);
                      setSyncStatus('error');
                      showToast(language === 'zh' ? '❌ 同步失败，请稍后再试。' : '❌ Failed to synchronize. Please try again.', 'error');
                    }
                  }}
                  className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-lg text-[10px] transition active:scale-95 shadow shadow-purple-500/10 cursor-pointer"
                >
                  {t('cloudSyncNow')}
                </button>
                <button
                  onClick={() => {
                    handleDisconnectGoogleDrive();
                    setIsSyncDropdownOpen(false);
                  }}
                  className={`w-full text-center font-bold text-[10px] py-1.5 rounded-lg border transition cursor-pointer ${
                    themeClass('bg-slate-800 hover:bg-slate-750 border-slate-750 text-slate-300', 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600')
                  }`}
                >
                  {t('cloudDisconnect')}
                </button>
              </>
            ) : syncStatus === 'syncing' ? (
              <div className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-purple-500 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('cloudSyncingStatus')}</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleLinkGoogleDrive();
                  setIsSyncDropdownOpen(false);
                }}
                className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-lg text-[10px] transition active:scale-95 shadow shadow-purple-500/10 cursor-pointer"
              >
                {t('cloudConnectBtn')}
              </button>
            )}
          </div>

          {/* Advanced Developer Settings Accordion */}
          <div className="mt-1 pt-2 border-t border-dashed border-slate-205/40 dark:border-slate-800 text-left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAdvancedSync(!showAdvancedSync);
              }}
              className={`text-[8.5px] font-extrabold uppercase tracking-widest flex items-center justify-between w-full transition cursor-pointer ${
                themeClass('text-slate-450 hover:text-slate-300', 'text-slate-505 hover:text-slate-800')
              }`}
            >
              <span>{t('cloudAdvancedSettings')}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 transform ${showAdvancedSync ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {showAdvancedSync && (
              <div className="mt-2 space-y-2 animate-fade-in">
                <p className="text-[8.5px] opacity-85 leading-relaxed text-slate-450">
                  {t('cloudAdvancedDesc')}
                </p>
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Paste Custom Client ID..."
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    className={`w-full px-2 py-1 rounded text-[10px] font-mono border focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                      themeClass('bg-slate-950 border-slate-800 text-slate-200', 'bg-slate-50 border-slate-200 text-slate-850')
                    }`}
                  />
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => saveCustomClientId(customClientId)}
                      className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 font-extrabold py-1 rounded text-[9px] transition active:scale-95 cursor-pointer"
                    >
                      {t('cloudSaveClientId')}
                    </button>
                    {customClientId && (
                      <button
                        onClick={() => saveCustomClientId('')}
                        className={`px-2 border font-bold rounded text-[9px] transition active:scale-95 cursor-pointer ${
                          themeClass('bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300', 'bg-slate-100 border-slate-250 hover:bg-slate-200 text-slate-600')
                        }`}
                      >
                        {t('reset')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
