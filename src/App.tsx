import { useState, useEffect } from 'react';
import { CARDS_DB } from './data/cards.db';
import type { CardTemplate, Benefit } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { SpentAssistant } from './components/SpentAssistant';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { CreateCardModal } from './components/CreateCardModal';
import { CardDetailDrawer } from './components/CardDetailDrawer';
import { AddOfferModal } from './components/AddOfferModal';
import { loadGoogleGsiScript, requestGDriveToken, fetchUserEmail } from './utils/gdrive';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  Upload, 
  CheckCircle2, 
  RefreshCw,
  Trash2,
  DollarSign,
  Clock,
  Filter,
  Plus,
  Edit3,
  Sun,
  Moon,
  Cloud,
  CloudOff
} from 'lucide-react';

const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function App() {
  const { 
    ownedCards, 
    logs, 
    theme,
    toggleTheme,
    gdriveEmail,
    syncStatus,
    lastSyncedTime,
    setGDriveCredentials,
    setSyncStatus,
    syncWithGDrive,
    customClientId,
    setCustomClientId,
    addCard, 
    addCustomCard,
    removeCard, 
    renameCard,
    setCardOpenDate, 
    toggleBenefit, 
    updateProgressLog,
    addInstanceOffer,
    removeInstanceOffer,
    resetAll 
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  // Date to evaluate states against (defaults to current system date)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'todo' | 'all' | 'cards'>('todo');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedLogKey, setFocusedLogKey] = useState<string | null>(null);
  const [activeTemplateDetail, setActiveTemplateDetail] = useState<CardTemplate | null>(null);
  const [isSyncDropdownOpen, setIsSyncDropdownOpen] = useState(false);
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [addOfferInstanceId, setAddOfferInstanceId] = useState<string | null>(null);

  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Load Google Identity Services script dynamically on mount
  useEffect(() => {
    loadGoogleGsiScript()
      .then(() => console.log('Google GIS client successfully pre-loaded.'))
      .catch((err) => console.error('Failed to load Google GIS Client library:', err));
  }, []);

  // Connection & Sync Handlers
  const handleLinkGoogleDrive = async () => {
    setSyncStatus('syncing');
    try {
      const token = await requestGDriveToken(customClientId);
      const email = await fetchUserEmail(token);
      setGDriveCredentials(token, email);
      
      // Trigger first two-way sync
      await useCardStore.getState().syncWithGDrive();
      alert('🎉 Successfully connected to your Google Drive! All cards and checklist logs are now securely synchronized.');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      alert('❌ Failed to connect to Google Drive. Please check your connection or try again.');
    }
  };

  const handleDisconnectGoogleDrive = () => {
    if (confirm('Are you sure you want to disconnect and unlink Google Drive? Your local data will remain intact, but automated cloud synchronization will cease.')) {
      setGDriveCredentials(null, null);
      alert('Logged out successfully.');
    }
  };

  const exportBackup = () => {
    const { ownedCards, logs } = useCardStore.getState();
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      ownedCards,
      logs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cc-tracker-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.ownedCards && parsed.logs) {
            useCardStore.setState({
              ownedCards: parsed.ownedCards,
              logs: parsed.logs
            });
            alert('🎉 Backup restored successfully!');
          } else {
            alert('❌ Invalid backup file structure.');
          }
        } catch (err) {
          alert('❌ Failed to parse backup file.');
        }
      };
    }
  };

  // Flat list of all active benefits based on instances
  interface ActiveBenefit {
    cardInstance: OwnedCardInstance;
    template?: CardTemplate;
    benefit: Benefit;
    logKey: string;
    isUsed: boolean;
  }

  const activeBenefits: ActiveBenefit[] = [];
  ownedCards.forEach((cardInstance) => {
    const template = CARDS_DB.find((t) => t.id === cardInstance.templateId);
    let benefits: Benefit[] = [];

    if (cardInstance.templateId === 'custom') {
      benefits = [...(cardInstance.customBenefits || [])];
    } else if (template) {
      benefits = [...template.benefits];
    }

    // Append card-instance specific custom offers (e.g., Amex Offers)
    if (cardInstance.instanceOffers && cardInstance.instanceOffers.length > 0) {
      benefits = [...benefits, ...cardInstance.instanceOffers];
    }

    benefits.forEach((benefit) => {
      const logKey = getLogKey(
        benefit.resetPeriod,
        cardInstance.id,
        benefit.id,
        currentDate,
        cardInstance.cardOpenDate,
        benefit.expirationDate
      );
      
      // Progress evaluation for progressive benefits
      const isUsed = benefit.spendingLimit
        ? (Number(logs[logKey]) || 0) >= benefit.spendingLimit
        : !!logs[logKey];

      // Dynamically compute precision date-level expiration for anniversary benefits
      let resolvedExpirationDate = benefit.expirationDate;
      if (benefit.resetPeriod === 'annual-anniversary' && cardInstance.cardOpenDate) {
        const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
        const year = currentDate.getFullYear();
        const currentAnniv = new Date(year, openDate.getMonth(), openDate.getDate());
        
        const expirationDate = currentDate < currentAnniv 
          ? currentAnniv 
          : new Date(year + 1, openDate.getMonth(), openDate.getDate());
          
        resolvedExpirationDate = expirationDate.toISOString().split('T')[0];
      }

      activeBenefits.push({
        cardInstance,
        template,
        benefit: {
          ...benefit,
          expirationDate: resolvedExpirationDate
        },
        logKey,
        isUsed,
      });
    });
  });

  // Helper to calculate recouped value of a specific card instance
  const getCardRecoupedValue = (instanceId: string): number => {
    const cardBenefits = activeBenefits.filter((ab) => ab.cardInstance.id === instanceId);
    const sum = cardBenefits.reduce((s, ab) => s + getResolvedValue(ab), 0);
    return Math.round(sum * 100) / 100;
  };

  // Helper to calculate resolved value dynamically (supports progressive spends & binary logs)
  const getResolvedValue = (ab: ActiveBenefit): number => {
    const logVal = logs[ab.logKey];
    if (!logVal) return 0;
    
    if (ab.benefit.spendingLimit) {
      const spent = Number(logVal) || 0;
      const progressPercent = Math.min(spent / ab.benefit.spendingLimit, 1);
      return Math.round((ab.benefit.value * progressPercent) * 100) / 100;
    }
    
    return logVal === true ? ab.benefit.value : 0;
  };

  const getExpiredValue = (ab: ActiveBenefit): number => {
    const isExpired = ab.benefit.resetPeriod === 'fixed' && 
      !!ab.benefit.expirationDate && 
      new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate;
      
    if (!isExpired) return 0;
    return ab.benefit.value - getResolvedValue(ab);
  };

  // Compute stats
  const totalPotentialValue = activeBenefits.reduce((sum, ab) => sum + ab.benefit.value, 0);
  const resolvedValue = Math.round(activeBenefits.reduce((sum, ab) => sum + getResolvedValue(ab), 0) * 100) / 100;
  const expiredValue = Math.round(activeBenefits.reduce((sum, ab) => sum + getExpiredValue(ab), 0) * 100) / 100;
  const pendingValue = Math.round((totalPotentialValue - resolvedValue - expiredValue) * 100) / 100;

  // Calculate actual remaining, non-expired active benefits for the AI SpentAssistant
  const remainingBenefits = activeBenefits.filter((ab) => {
    if (ab.isUsed) return false;
    const isExpired = ab.benefit.resetPeriod === 'fixed' && 
      ab.benefit.expirationDate && 
      new Date(ab.benefit.expirationDate + 'T00:05:00') < currentDate;
    return !isExpired;
  });

  // Filtered benefits for view
  const filteredBenefits = activeBenefits.filter((ab) => {
    if (activeTab === 'todo' && ab.isUsed && focusedLogKey !== ab.logKey) return false;
    if (filterCategory !== 'all' && ab.benefit.category !== filterCategory) return false;
    return true;
  });

  // Scientific urgency sorting
  const getUrgencyScore = (ab: ActiveBenefit): number => {
    if (ab.isUsed) return 10000; // Checked is lowest priority
    
    const isExpired = ab.benefit.resetPeriod === 'fixed' && 
      ab.benefit.expirationDate && 
      new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate;
      
    if (isExpired) return 9000; // Expired is second lowest priority
    
    if (ab.benefit.resetPeriod === 'fixed' && ab.benefit.expirationDate) {
      const expTime = new Date(ab.benefit.expirationDate + 'T00:00:00').getTime();
      const curTime = currentDate.getTime();
      const daysLeft = Math.ceil((expTime - curTime) / (1000 * 60 * 60 * 24));
      return daysLeft; // Urgency score is number of days left (lower is higher priority)
    }
    
    if (ab.benefit.resetPeriod === 'monthly') {
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const daysLeft = lastDay - currentDate.getDate();
      return daysLeft + 15; // Base urgency + offset slightly below fixed expirations
    }
    
    return 200; // Other cyclical benefits have standard priority
  };

  const sortedBenefits = [...filteredBenefits].sort((a, b) => getUrgencyScore(a) - getUrgencyScore(b));

  const addOfferCard = ownedCards.find((c) => c.id === addOfferInstanceId);

  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-amber-500 selection:text-slate-900 transition-colors duration-300 ${
      themeClass('bg-slate-955 text-slate-100 border-slate-900', 'bg-slate-50 text-slate-800 border-slate-200')
    }`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-10 px-4 py-4 transition-colors duration-300 ${
        themeClass('border-slate-900 bg-slate-950/80', 'border-slate-200 bg-white/80')
      }`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-slate-950 ${
              themeClass('bg-gradient-to-tr from-amber-500 to-yellow-600', 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white')
            }`}>
              <CreditCard className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${themeClass('text-white', 'text-slate-900')}`}>Credit Card Benefits Tracker</h1>
              <p className={`text-xs flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${themeClass('bg-green-500', 'bg-green-600')}`}></span>
                <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto animate-fade-in">
            {/* Google Drive Cloud Sync Widget */}
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
                    : themeClass('bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400', 'bg-white border-slate-250 hover:bg-slate-100 text-slate-500 shadow-sm')
                }`}
                title="Google Drive Cloud Sync"
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
                        ? 'bg-green-500/10 text-green-500' 
                        : syncStatus === 'syncing' 
                        ? 'bg-purple-500/10 text-purple-500 animate-pulse'
                        : syncStatus === 'error'
                        ? 'bg-red-500/10 text-red-500'
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
                        Google Drive Sync
                      </h5>
                      <p className={`text-[10px] leading-normal ${themeClass('text-slate-400', 'text-slate-550')}`}>
                        {syncStatus === 'synced' 
                          ? 'Automatic backup is active.'
                          : 'Private sandboxed appData cloud backup.'}
                      </p>
                    </div>
                  </div>

                  {syncStatus === 'synced' && (
                    <div className={`p-2 rounded bg-slate-955/40 dark:bg-slate-950/60 border text-[10px] text-left space-y-1 ${
                      themeClass('border-slate-850 text-slate-400', 'border-slate-200 text-slate-600')
                    }`}>
                      <p className="truncate font-medium">Account: {gdriveEmail}</p>
                      <p className="opacity-80">Last synced: {lastSyncedTime || 'Just now'}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-slate-200/40 dark:border-slate-800/40">
                    {syncStatus === 'synced' ? (
                      <>
                        <button
                          onClick={() => {
                            syncWithGDrive();
                            setIsSyncDropdownOpen(false);
                          }}
                          className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-lg text-[10px] transition active:scale-95 shadow shadow-purple-500/10 cursor-pointer"
                        >
                          Force Sync Now
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
                          Disconnect Account
                        </button>
                      </>
                    ) : syncStatus === 'syncing' ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-purple-500 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing...</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          handleLinkGoogleDrive();
                          setIsSyncDropdownOpen(false);
                        }}
                        className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-lg text-[10px] transition active:scale-95 shadow shadow-purple-500/10 cursor-pointer"
                      >
                        Connect Google Drive
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
                      className={`text-[8px] font-bold tracking-wide uppercase flex items-center gap-0.5 transition cursor-pointer ${
                        themeClass('text-slate-500 hover:text-slate-450', 'text-slate-450 hover:text-slate-600')
                      }`}
                    >
                      {showAdvancedSync ? '▼ Developer Options' : '▶ Developer Options'}
                    </button>

                    {showAdvancedSync && (
                      <div className="mt-2 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className={`block text-[7px] font-bold uppercase tracking-wider mb-1 ${
                            themeClass('text-slate-505', 'text-slate-555')
                          }`}>
                            Custom Google Client ID
                          </label>
                          <input
                            type="text"
                            placeholder="Pasted client ID..."
                            value={customClientId || ''}
                            onChange={(e) => setCustomClientId(e.target.value || null)}
                            className={`w-full text-[9px] rounded px-2 py-1 border focus:outline-none font-mono transition ${
                              themeClass('bg-slate-955 border-slate-850 text-slate-200 focus:border-purple-500', 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500')
                            }`}
                          />
                        </div>
                        <p className="text-[8px] leading-normal opacity-75 text-slate-500">
                          Paste your own Google Cloud Web Client ID with authorized origins matching your site.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
                themeClass(
                  'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400',
                  'bg-white border-slate-250 hover:bg-slate-100 text-amber-500 shadow-sm'
                )
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear() ? (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border rounded-lg animate-pulse ${
                themeClass('border-amber-500/25', 'border-amber-500/40')
              }`}>
                ⚠️ Simulated Sandbox
              </span>
            ) : null}

            <div className={`flex items-center rounded-lg p-1 text-xs font-medium border ${
              themeClass('bg-slate-900 text-slate-300 border-slate-800', 'bg-slate-200/60 text-slate-700 border-slate-300/80 shadow-inner')
            }`}>
              <button 
                onClick={() => adjustMonth(-1)} 
                className={`px-2 py-1 rounded transition ${themeClass('hover:bg-slate-800', 'hover:bg-slate-305')}`}
                title="Previous Month"
              >
                ◀
              </button>
              <span className={`px-3 py-1 min-w-[110px] text-center font-semibold ${themeClass('text-white', 'text-slate-900')}`}>
                {currentMonthStr} {currentYear}
              </span>
              <button 
                onClick={() => adjustMonth(1)} 
                className={`px-2 py-1 rounded transition ${themeClass('hover:bg-slate-800', 'hover:bg-slate-305')}`}
                title="Next Month"
              >
                ▶
              </button>
              {currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear() ? (
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className={`mx-1 p-1 rounded transition ${themeClass('hover:bg-slate-800 text-amber-500', 'hover:bg-slate-305 text-amber-600')}`}
                  title="Reset to Today"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-550')}`}>
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Potential Value
            </p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${themeClass('text-white', 'text-slate-900')}`}>${totalPotentialValue}</p>
          </div>

          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Resolved
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">${resolvedValue}</p>
          </div>

          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Remaining
            </p>
            <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">${pendingValue}</p>
          </div>
        </section>

        {/* Tabs panel */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 ${themeClass('border-slate-900', 'border-slate-200')}`}>
          <div className={`flex gap-1 p-1 rounded-xl self-start ${themeClass('bg-slate-900/80', 'bg-slate-200/60')}`}>
            <button
              onClick={() => setActiveTab('todo')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'todo'
                  ? 'bg-amber-500 text-slate-950'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              To-Do ({activeBenefits.filter(b => !b.isUsed).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              All Benefits ({activeBenefits.length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              My Cards ({ownedCards.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab !== 'cards' && (
              <div className={`flex items-center gap-1 border rounded-lg px-2.5 py-1.5 text-xs transition duration-300 ${
                themeClass('bg-slate-900 border-slate-800', 'bg-white border-slate-200 shadow-sm')
              }`}>
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`bg-transparent border-none focus:outline-none cursor-pointer font-medium ${themeClass('text-slate-300', 'text-slate-700')}`}
                >
                  <option value="all">All Categories</option>
                  <option value="dining">Dining</option>
                  <option value="travel">Travel</option>
                  <option value="shopping">Shopping</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            {ownedCards.length > 0 && (
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition active:scale-95 cursor-pointer ${
                  themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-300', 'bg-white hover:bg-slate-100 border-slate-255 text-slate-600 shadow-sm')
                }`}
                title="Sync All Calendar Reminders"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Calendar Sync
              </button>
            )}
          </div>
        </div>

        {/* TABS 1 & 2: CHECKLIST VIEW */}
        {(activeTab === 'todo' || activeTab === 'all') && (
          <section>
            {ownedCards.length === 0 ? (
              <div className={`text-center py-16 border border-dashed rounded-2xl p-8 ${
                themeClass('bg-slate-900/20 border-slate-800', 'bg-slate-100/40 border-slate-200')
              }`}>
                <CreditCard className="w-10 h-10 text-slate-505/60 mx-auto mb-4 stroke-[1.5]" />
                <h3 className={`text-lg font-semibold ${themeClass('text-slate-300', 'text-slate-800')}`}>No active cards</h3>
                <p className="text-xs text-slate-505 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose which credit cards you hold to load their benefits. You can add the same card multiple times!
                </p>
                <button
                  onClick={() => setActiveTab('cards')}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-955 font-bold px-4 py-2 rounded-lg text-xs transition shadow-md cursor-pointer"
                >
                  Manage My Cards
                </button>
              </div>
            ) : sortedBenefits.length === 0 ? (
              <div className={`text-center py-16 border rounded-2xl p-8 ${
                themeClass('bg-slate-900/20 border-slate-800/40', 'bg-white border-slate-200 shadow-sm')
              }`}>
                <CheckCircle2 className="w-10 h-10 text-emerald-505/50 mx-auto mb-4" />
                <h3 className={`text-lg font-semibold ${themeClass('text-slate-300', 'text-slate-800')}`}>All benefits resolved!</h3>
                <p className="text-xs text-slate-505 max-w-xs mx-auto mt-1">
                  Nice job! You have maximized all tracked credits for this period.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBenefits.map(({ cardInstance, benefit, logKey, isUsed }) => {
                  const isExpired = !isUsed && benefit.resetPeriod === 'fixed' && 
                    !!benefit.expirationDate && 
                    new Date(benefit.expirationDate + 'T00:00:00') < currentDate;

                  let daysLeft: number | null = null;
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth(); // 0-11
                  const todayMidnight = new Date(year, month, currentDate.getDate());

                  if (benefit.resetPeriod === 'fixed' && benefit.expirationDate) {
                    const expMidnight = new Date(benefit.expirationDate + 'T00:00:00');
                    daysLeft = Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  } else if (benefit.resetPeriod === 'monthly') {
                    const lastDay = new Date(year, month + 1, 0);
                    const expMidnight = new Date(year, month, lastDay.getDate());
                    daysLeft = Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  } else if (benefit.resetPeriod === 'quarterly') {
                    const qEndMonth = Math.floor(month / 3) * 3 + 2;
                    const lastDay = new Date(year, qEndMonth + 1, 0);
                    const expMidnight = new Date(year, qEndMonth, lastDay.getDate());
                    daysLeft = Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  } else if (benefit.resetPeriod === 'semi-annual') {
                    const saEndMonth = month <= 5 ? 5 : 11;
                    const lastDay = saEndMonth === 5 ? 30 : 31;
                    const expMidnight = new Date(year, saEndMonth, lastDay);
                    daysLeft = Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  } else if (benefit.resetPeriod === 'annual-calendar') {
                    const expMidnight = new Date(year, 11, 31);
                    daysLeft = Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  } else if (benefit.resetPeriod === 'annual-anniversary' && cardInstance.cardOpenDate) {
                    const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
                    let nextAnniv = new Date(year, openDate.getMonth(), openDate.getDate());
                    if (todayMidnight >= nextAnniv) {
                      nextAnniv = new Date(year + 1, openDate.getMonth(), openDate.getDate());
                    }
                    daysLeft = Math.round((nextAnniv.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  }

                  const isProgressive = !!benefit.spendingLimit;
                  const spent = isProgressive ? (Number(logs[logKey]) || 0) : 0;
                  const spentPercent = isProgressive ? Math.min((spent / (benefit.spendingLimit || 1)) * 100, 100) : 0;
                  const cashbackEarned = isProgressive ? Math.round((benefit.value * Math.min(spent / (benefit.spendingLimit || 1), 1)) * 100) / 100 : 0;

                  return (
                    <div
                      key={logKey}
                      onClick={() => {
                        if (isExpired) return;
                        if (isProgressive) {
                          // Clicking progressive rows toggles between 0 and maximum limit
                          updateProgressLog(logKey, spent > 0 ? 0 : (benefit.spendingLimit || 0));
                        } else {
                          toggleBenefit(logKey);
                        }
                      }}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition duration-200 gap-3 ${
                        isExpired
                          ? themeClass('bg-slate-955 border-red-955/10 opacity-40 cursor-not-allowed', 'bg-red-50/30 border-red-200/50 opacity-60 cursor-not-allowed')
                          : isUsed
                          ? themeClass('bg-slate-955 border-slate-900 opacity-50 cursor-pointer', 'bg-slate-100/70 border-slate-200/70 opacity-60 cursor-pointer')
                          : themeClass('bg-slate-900/40 border-slate-850/80 hover:border-slate-700 hover:bg-slate-900 cursor-pointer', 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer shadow-[0_2px_6px_rgba(15,23,42,0.02)] hover:shadow-[0_4px_10px_rgba(15,23,42,0.045)]')
                      }`}
                    >
                      <div className="flex items-center gap-3.5 pr-4 flex-grow">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors duration-200 shrink-0 ${
                           isExpired
                            ? 'border-red-900 bg-red-950/10 text-red-500'
                            : isUsed 
                            ? 'bg-emerald-500 border-emerald-500 text-slate-955' 
                            : themeClass('border-slate-700 group-hover:border-slate-500 bg-slate-955/50 text-transparent', 'border-slate-250 group-hover:border-slate-350 bg-white text-transparent')
                        }`}>
                          {isExpired ? (
                            <span className="text-[10px] font-bold">✕</span>
                          ) : (
                            <CheckCircle2 className={`w-4 h-4 stroke-[3] transition-all duration-250 transform origin-center ${isUsed ? 'scale-100 rotate-0' : 'scale-0 -rotate-12 opacity-0'}`} />
                          )}
                        </div>

                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold truncate ${
                              isExpired ? 'text-slate-400 line-through' :
                              isUsed ? 'line-through text-slate-450' : themeClass('text-slate-100', 'text-slate-800')
                            }`}>
                              {benefit.name}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wide border shrink-0 ${
                              themeClass('bg-slate-800 text-slate-300 border-slate-700', 'bg-slate-100 text-slate-600 border-slate-200')
                            }`}>
                              {cardInstance.customName}
                            </span>
                            
                            {isExpired ? (
                              <span className="text-[9px] font-bold bg-red-555/10 text-red-505 border border-red-505/20 px-1.5 py-0.2 rounded shrink-0">Expired</span>
                            ) : !isUsed && daysLeft !== null && (
                              <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded shrink-0 ${
                                daysLeft <= 5 
                                  ? 'bg-red-555/10 text-red-505 border-red-505/30 animate-pulse' 
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              }`}>
                                {daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft}d`}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>
                            {benefit.description}
                          </p>

                          {/* Progressive Spent Progress Bar */}
                          {isProgressive && (
                            <div className="mt-2.5 max-w-md">
                              <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${
                                    isUsed 
                                      ? 'from-emerald-500 to-teal-500' 
                                      : 'from-purple-500 to-indigo-500'
                                  }`}
                                  style={{ width: `${spentPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center mt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-455">
                                <span>Spent: ${spent} / ${benefit.spendingLimit}</span>
                                <span className={isUsed ? 'text-emerald-555' : ''}>
                                  Cashback: ${cashbackEarned} / ${benefit.value} ({Math.round((benefit.value / (benefit.spendingLimit || 1)) * 100)}%)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 shrink-0 justify-end sm:justify-start">
                        {/* Interactive Numerical Spent Input Box */}
                        {isProgressive && (
                          <div 
                            className="flex items-center gap-1" 
                            onClick={(e) => e.stopPropagation()} // Prevent row click toggle
                          >
                            <span className="text-[10px] font-bold text-slate-505">$</span>
                            <input
                              type="number"
                              disabled={isExpired}
                              placeholder="0"
                              value={logs[logKey] !== undefined && logs[logKey] !== false ? String(logs[logKey]) : ''}
                              onFocus={() => setFocusedLogKey(logKey)}
                              onBlur={() => setFocusedLogKey(null)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateProgressLog(logKey, val);
                              }}
                              className={`w-16 border text-center text-xs rounded px-1.5 py-0.5 focus:outline-none font-mono font-bold transition ${
                                themeClass('bg-slate-955 border-slate-850 text-white focus:border-purple-500', 'bg-slate-100 border-slate-250 text-slate-905 focus:border-purple-500 shadow-inner')
                              }`}
                            />
                          </div>
                        )}

                        <div className="text-right flex flex-col items-end justify-center min-w-[80px]">
                          <span className={`text-base font-bold ${isExpired || isUsed ? 'text-slate-505' : themeClass('text-white', 'text-slate-905')}`}>
                            ${benefit.value}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-555 font-bold mt-0.5">
                            {benefit.resetPeriod === 'monthly' ? 'Monthly' :
                             benefit.resetPeriod === 'quarterly' ? 'Quarterly' :
                             benefit.resetPeriod === 'semi-annual' ? 'Semi-Annual' :
                             benefit.resetPeriod === 'annual-calendar' ? 'Annual (Cal)' :
                             benefit.resetPeriod === 'annual-anniversary' ? 'Annual (Anniv)' : 'Fixed Expir'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: MY CARDS MANAGER */}
        {activeTab === 'cards' && (
          <section className="space-y-6 animate-fade-in">
            {/* 1. MY WALLET (我的卡包 - Active Cards) */}
            <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
              themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-2 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-505')}`}>
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  My Wallet ({ownedCards.length} active cards)
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="🔍 Search cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-44 font-medium ${
                      themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-805 shadow-inner')
                    }`}
                  />
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Create Custom Card
                  </button>
                </div>
              </div>

              {ownedCards.length === 0 ? (
                <div className="text-center py-10">
                  <p className={`text-xs ${themeClass('text-slate-500', 'text-slate-400')}`}>Your wallet is empty. Add cards from the library below! 🛒</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {ownedCards.filter((instance) => {
                    const template = CARDS_DB.find((t) => t.id === instance.templateId);
                    const cardName = instance.templateId === 'custom' ? instance.customName : (template?.name || '');
                    const cardBank = instance.templateId === 'custom' ? (instance.bank || '') : (template?.bank || '');
                    return (
                      cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      cardBank.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  }).map((instance) => {
                    const template = CARDS_DB.find((t) => t.id === instance.templateId);
                    const cardColor = instance.templateId === 'custom' 
                      ? (instance.color || 'from-purple-950/50 to-slate-950')
                      : (template?.color || 'from-slate-800 to-slate-900');
                    const benefits = instance.templateId === 'custom' ? (instance.customBenefits || []) : (template?.benefits || []);
                    
                    const cardFee = instance.annualFee !== undefined 
                      ? instance.annualFee 
                      : (template?.annualFee !== undefined ? template.annualFee : 0);
                    const recouped = getCardRecoupedValue(instance.id);
                    const isRecouped = cardFee > 0 && recouped >= cardFee;

                    return (
                      <div 
                        key={instance.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between transition bg-gradient-to-tr ${cardColor} relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] duration-300 ${
                          isRecouped 
                            ? 'ring-2 ring-amber-500/50 dark:ring-amber-400/40 shadow-lg shadow-amber-500/5 scale-[1.01] border-amber-500/25' 
                            : themeClass('border-purple-900/30 hover:border-purple-800/50', 'border-slate-250/40 hover:border-slate-300 shadow-md text-slate-100')
                        }`}
                      >
                        <div className="pb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold bg-purple-500/15 text-purple-350 dark:text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              {instance.templateId === 'custom' ? (instance.bank || 'Custom') : (template?.bank || 'Standard')}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {instance.templateId === 'custom' ? (
                                <button
                                  onClick={() => {
                                    addCustomCard({
                                      templateId: 'custom',
                                      customName: `${instance.customName} (Copy)`,
                                      bank: instance.bank,
                                      color: instance.color,
                                      cardOpenDate: instance.cardOpenDate,
                                      annualFee: instance.annualFee,
                                      customBenefits: (instance.customBenefits || []).map((b) => ({
                                        ...b,
                                        id: `benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                      })),
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer active:scale-90"
                                  title="Duplicate card"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => addCard(instance.templateId)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer active:scale-90"
                                  title="Add another instance"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              )}
                              <button
                                onClick={() => removeCard(instance.id)}
                                className="p-1 text-red-400 hover:text-red-350 hover:bg-red-550/10 rounded transition cursor-pointer"
                                title="Delete card instance"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {editingInstanceId === instance.id ? (
                            <input
                              type="text"
                              value={instance.customName}
                              onChange={(e) => renameCard(instance.id, e.target.value)}
                              onBlur={() => setEditingInstanceId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingInstanceId(null);
                                }
                              }}
                              autoFocus
                              className="bg-slate-955/80 border border-purple-500/50 text-white text-xs rounded px-2 py-1 font-semibold focus:outline-none w-full mt-2"
                            />
                          ) : (
                            <h4 
                              onClick={() => setEditingInstanceId(instance.id)}
                              className="text-base font-bold mt-1.5 flex items-center gap-1 cursor-pointer hover:text-purple-300 text-white transition"
                              title="Click to rename"
                            >
                              {instance.customName}
                              <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                            </h4>
                          )}

                          <p className="text-[11px] text-slate-350 mt-0.5 font-medium">
                            {benefits.length} perks (Total: ${benefits.reduce((s, b) => s + b.value, 0)}/yr)
                          </p>

                          {/* Annual Fee Recoup Progress Bar */}
                          {cardFee > 0 ? (
                            <div className="mt-3 max-w-[240px] space-y-1.5">
                              <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${
                                    isRecouped ? 'from-amber-400 via-yellow-400 to-yellow-500' : 'from-purple-500 to-indigo-400'
                                  }`}
                                  style={{ width: `${Math.min((recouped / cardFee) * 100, 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-semibold text-slate-350">
                                <span>Fee: ${cardFee}</span>
                                <span className={isRecouped ? 'text-amber-300 font-bold tracking-wide' : ''}>
                                  {isRecouped ? '🎉 Recouped! (已回本)' : `Recouped: $${recouped} (${Math.round((recouped / cardFee) * 100)}%)`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[9px] font-bold text-emerald-400 mt-2.5 flex items-center gap-1">
                              <span>✓ No Annual Fee (Free Card!)</span>
                            </p>
                          )}

                          {/* Benefits preview inline list */}
                          <div className="mt-4 space-y-1">
                            {benefits.slice(0, 3).map((b) => (
                              <div key={b.id} className="flex items-center justify-between text-[10px] bg-slate-955/40 border border-white/5 p-1 rounded text-slate-300">
                                <span className="truncate">{b.name}</span>
                                <span className="font-bold text-white">${b.value}</span>
                              </div>
                            ))}
                            {benefits.length > 3 && (
                              <p className="text-[9px] text-slate-400 text-right font-medium">+ {benefits.length - 3} more perks</p>
                            )}
                          </div>
                        </div>

                        {/* Google Drive / Instance Custom Offers List */}
                        {instance.instanceOffers && instance.instanceOffers.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1.5 text-left">
                            <p className="text-[8px] font-black text-purple-400 dark:text-purple-500 uppercase tracking-widest">Active Temporary Offers</p>
                            <div className="space-y-1">
                              {instance.instanceOffers.map((offer) => (
                                <div key={offer.id} className="flex items-center justify-between text-[10px] bg-purple-500/10 border border-purple-500/15 p-1.5 rounded text-slate-200 group/offer">
                                  <span className="truncate pr-2">{offer.name}</span>
                                  <div className="flex items-center gap-1.5 shrink-0 font-bold text-white">
                                    <span>+${offer.value}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeInstanceOffer(instance.id, offer.id);
                                      }}
                                      className="text-slate-400 hover:text-red-400 transition cursor-pointer active:scale-90"
                                      title="Remove Offer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-medium text-slate-355">
                              Opened:
                            </label>
                            <input
                              type="date"
                              value={instance.cardOpenDate}
                              onChange={(e) => setCardOpenDate(instance.id, e.target.value)}
                              className="bg-slate-955 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer font-medium"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setAddOfferInstanceId(instance.id)}
                            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 dark:bg-slate-950 dark:hover:bg-slate-850 border border-white/10 dark:border-slate-800 text-white dark:text-slate-300 font-bold px-2.5 py-1 rounded-lg text-[9px] transition active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5 stroke-[3]" />
                            Add Offer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. ADD CARD LIBRARY (卡片模板库柜台) */}
            <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
              themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                  <Plus className="w-4 h-4 text-amber-500" />
                  Add New Cards (卡片模板库)
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="🔍 Search card templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-48 font-medium ${
                      themeClass('bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-8">
                {(['Amex', 'Chase', 'Capital One', 'Other'] as const).map((bankName) => {
                  const bankCards = CARDS_DB.filter((c) => c.bank === bankName).filter((c) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.bank.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  if (bankCards.length === 0) return null;

                  return (
                    <div key={bankName} className="space-y-3.5">
                      <div className={`flex items-center gap-2 border-b pb-2 ${themeClass('border-slate-900', 'border-slate-200')}`}>
                        <div className={`w-2 h-2 rounded-full ${
                          bankName === 'Amex' ? 'bg-amber-500' :
                          bankName === 'Chase' ? 'bg-blue-500' :
                          bankName === 'Capital One' ? 'bg-teal-500' : 'bg-orange-500'
                        }`} />
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
                          {bankName === 'Amex' ? 'American Express' : bankName} Templates
                        </h4>
                        <span className="text-[10px] text-slate-600 font-semibold ml-auto">
                          {bankCards.length} templates
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {bankCards.map((card) => (
                          <div 
                            key={card.id}
                            onClick={() => setActiveTemplateDetail(card)}
                            className={`p-4 rounded-xl border flex flex-col justify-between transition cursor-pointer hover:scale-[1.01] duration-200 relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] ${
                              themeClass('bg-slate-955 border-slate-900 hover:border-slate-850', 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm')
                            }`}
                          >
                            <div className="pb-2 flex-grow">
                              <span className={`text-[9px] font-semibold uppercase ${themeClass('text-slate-505', 'text-slate-555')}`}>{card.bank}</span>
                              <h4 className={`text-base font-bold mt-0.5 ${themeClass('text-white', 'text-slate-900')}`}>{card.name}</h4>
                              <p className={`text-xs mt-1.5 leading-relaxed ${themeClass('text-slate-400', 'text-slate-500')}`}>
                                Contains <span className="font-bold text-purple-500 dark:text-amber-400">{card.benefits.length}</span> built-in benefits <br />
                                (Total potential value: <span className={`font-bold ${themeClass('text-white', 'text-slate-955')}`}>${card.benefits.reduce((s, b) => s + b.value, 0)}/yr</span>)
                              </p>
                              <span className="text-[9px] text-purple-500 dark:text-purple-455 font-bold mt-3 block animate-pulse">
                                🔍 Click card to view details
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent modal drawer trigger
                                addCard(card.id);
                              }}
                              className="w-full mt-4 flex items-center justify-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.97] shadow shadow-purple-500/10 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              Add to Wallet
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Portability tools */}
            <div className={`border rounded-xl p-5 transition duration-300 ${
              themeClass('bg-slate-900/20 border-slate-900', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${themeClass('text-slate-400', 'text-slate-600')}`}>Data Portability & Safety</h4>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportBackup}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                    themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-300', 'bg-white hover:bg-slate-100 border-slate-250 text-slate-600 shadow-sm')
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-505" />
                  Export JSON Backup
                </button>

                <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition ${
                  themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-300', 'bg-white hover:bg-slate-100 border-slate-250 text-slate-600 shadow-sm')
                }`}>
                  <Upload className="w-3.5 h-3.5 text-slate-505" />
                  Restore Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={importBackup}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    if (confirm('Are you absolutely sure you want to reset all card instances and checklist logs? This cannot be undone.')) {
                      resetAll();
                    }
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ml-auto ${
                    themeClass('bg-red-555/10 hover:bg-red-555/20 border-red-500/20 text-red-400', 'bg-red-500/5 hover:bg-red-500/10 border-red-300/30 text-red-500 shadow-sm')
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe App Data
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Calendar Sync Modal */}
      <CalendarSyncModal 
        isOpen={isSyncModalOpen} 
        onClose={() => setIsSyncModalOpen(false)} 
        ownedCards={ownedCards}
        theme={theme}
      />

      {/* Create Custom Card Modal */}
      <CreateCardModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        theme={theme}
        addCustomCard={addCustomCard}
        getLocalDateString={getLocalDateString}
      />

      {/* Card Detail popover Sheet Drawer */}
      <CardDetailDrawer 
        isOpen={!!activeTemplateDetail}
        card={activeTemplateDetail}
        onClose={() => setActiveTemplateDetail(null)}
        onAdd={() => addCard(activeTemplateDetail ? activeTemplateDetail.id : '')}
        theme={theme}
      />

      {/* Add Custom Offer Modal */}
      <AddOfferModal
        isOpen={!!addOfferInstanceId}
        cardName={addOfferCard ? (addOfferCard.templateId === 'custom' ? addOfferCard.customName : (CARDS_DB.find((t) => t.id === addOfferCard.templateId)?.name || 'Card')) : 'Card'}
        onClose={() => setAddOfferInstanceId(null)}
        onAdd={(offer) => {
          if (addOfferInstanceId) {
            addInstanceOffer(addOfferInstanceId, offer);
          }
        }}
        theme={theme}
      />

      {/* SpentAssistant AI Drawer */}
      <SpentAssistant remainingBenefits={remainingBenefits} logs={logs} theme={theme} />
    </div>
  );
}

export default App;
