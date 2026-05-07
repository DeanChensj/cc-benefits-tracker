import { useState } from 'react';
import { CARDS_DB } from './data/cards.db';
import type { CardTemplate, Benefit } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { SpentAssistant } from './components/SpentAssistant';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { CreateCardModal } from './components/CreateCardModal';
import { CardDetailDrawer } from './components/CardDetailDrawer';
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
  Moon
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
    addCard, 
    addCustomCard,
    removeCard, 
    renameCard,
    setCardOpenDate, 
    toggleBenefit, 
    updateProgressLog,
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

  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

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
      benefits = cardInstance.customBenefits || [];
    } else if (template) {
      benefits = template.benefits;
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
      ab.benefit.expirationDate && 
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
      new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate;
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

  // Export JSON backup
  const exportBackup = () => {
    const backupData = {
      ownedCards,
      logs,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cc_tracker_backup_${getLocalDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        
        let importedCards: OwnedCardInstance[] = [];
        let migratedLogs: Record<string, boolean> = { ...(parsed.logs || {}) };

        if (parsed.ownedCards) {
          importedCards = parsed.ownedCards;
        } else if (parsed.ownedCardIds) {
          const oldIdToInstanceIdMap: Record<string, string> = {};
          
          importedCards = (parsed.ownedCardIds || []).map((tid: string) => {
            const template = CARDS_DB.find(c => c.id === tid);
            const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            oldIdToInstanceIdMap[tid] = instanceId;

            return {
              id: instanceId,
              templateId: tid,
              customName: template ? template.name : tid,
              cardOpenDate: getLocalDateString()
            };
          });

          migratedLogs = {};
          Object.entries(parsed.logs || {}).forEach(([oldKey, val]) => {
            const parts = oldKey.split(':');
            if (parts.length === 3) {
              const period = parts[0];
              const oldCardId = parts[1];
              const benefitId = parts[2];

              if (oldIdToInstanceIdMap[oldCardId]) {
                const newKey = `${period}:${oldIdToInstanceIdMap[oldCardId]}:${benefitId}`;
                migratedLogs[newKey] = !!val;
              } else {
                migratedLogs[oldKey] = !!val;
              }
            } else {
              migratedLogs[oldKey] = !!val;
            }
          });
        }

        useCardStore.setState({
          ownedCards: importedCards,
          logs: migratedLogs,
        });
        alert('Backup restored and migrated successfully!');
      } catch (err) {
        alert('Failed to read backup file.');
      }
    };
    reader.readAsText(file);
  };

  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-amber-500 selection:text-slate-900 transition-colors duration-300 ${
      themeClass('bg-slate-950 text-slate-100 border-slate-900', 'bg-slate-50 text-slate-800 border-slate-200')
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

          <div className="flex items-center gap-3 self-end sm:self-auto">
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
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-550')}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Resolved
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">${resolvedValue}</p>
          </div>

          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-550')}`}>
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
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-850', 'text-slate-500 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              To-Do ({activeBenefits.filter(b => !b.isUsed).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-850', 'text-slate-500 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              All Benefits ({activeBenefits.length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-950'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-500 hover:text-slate-900 hover:bg-slate-300/30')
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
                </select>
              </div>
            )}

            {ownedCards.length > 0 && (
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition active:scale-95 ${
                  themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-200', 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm')
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
                <CreditCard className="w-10 h-10 text-slate-500/60 mx-auto mb-4 stroke-[1.5]" />
                <h3 className={`text-lg font-semibold ${themeClass('text-slate-300', 'text-slate-800')}`}>No active cards</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose which credit cards you hold to load their benefits. You can add the same card multiple times!
                </p>
                <button
                  onClick={() => setActiveTab('cards')}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition shadow-md"
                >
                  Manage My Cards
                </button>
              </div>
            ) : sortedBenefits.length === 0 ? (
              <div className={`text-center py-16 border rounded-2xl p-8 ${
                themeClass('bg-slate-900/20 border-slate-800/40', 'bg-white border-slate-200 shadow-sm')
              }`}>
                <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-4" />
                <h3 className={`text-lg font-semibold ${themeClass('text-slate-300', 'text-slate-800')}`}>All benefits resolved!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Nice job! You have maximized all tracked credits for {currentMonthStr}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBenefits.map(({ cardInstance, benefit, logKey, isUsed }) => {
                  const isExpired = !isUsed && benefit.resetPeriod === 'fixed' && 
                    !!benefit.expirationDate && 
                    new Date(benefit.expirationDate + 'T00:00:00') < currentDate;

                  let daysLeft = 0;
                  if (benefit.resetPeriod === 'fixed' && benefit.expirationDate) {
                    const expTime = new Date(benefit.expirationDate + 'T00:00:00').getTime();
                    const curTime = currentDate.getTime();
                    daysLeft = Math.ceil((expTime - curTime) / (1000 * 60 * 60 * 24));
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
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
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
                              <span className="text-[9px] font-bold bg-red-550/10 text-red-500 border border-red-500/20 px-1.5 py-0.2 rounded shrink-0">Expired</span>
                            ) : benefit.resetPeriod === 'fixed' && benefit.expirationDate && (
                              <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded shrink-0 ${
                                daysLeft <= 5 
                                  ? 'bg-red-550/10 text-red-500 border-red-500/30 animate-pulse' 
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
                              <div className="flex justify-between items-center mt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-450">
                                <span>Spent: ${spent} / ${benefit.spendingLimit}</span>
                                <span className={isUsed ? 'text-emerald-500' : ''}>
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
                            <span className="text-[10px] font-bold text-slate-500">$</span>
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
                                themeClass('bg-slate-950 border-slate-850 text-white focus:border-purple-500', 'bg-slate-100 border-slate-250 text-slate-900 focus:border-purple-500 shadow-inner')
                              }`}
                            />
                          </div>
                        )}

                        <div className="text-right flex flex-col items-end justify-center min-w-[80px]">
                          <span className={`text-base font-bold ${isExpired || isUsed ? 'text-slate-500' : themeClass('text-white', 'text-slate-900')}`}>
                            ${benefit.value}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-550 font-bold mt-0.5">
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
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-500')}`}>
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
                      themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
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

                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                          <label className="text-[10px] font-medium text-slate-355">
                            Card Opened Date:
                          </label>
                          <input
                            type="date"
                            value={instance.cardOpenDate}
                            onChange={(e) => setCardOpenDate(instance.id, e.target.value)}
                            className="bg-slate-955 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer font-medium"
                          />
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
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-550')}`}>
                  <Plus className="w-4 h-4 text-amber-500" />
                  Add New Cards (卡片模板库)
                </h3>
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
                              <span className={`text-[9px] font-semibold uppercase ${themeClass('text-slate-500', 'text-slate-555')}`}>{card.bank}</span>
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
                    themeClass('bg-red-550/10 hover:bg-red-550/20 border-red-500/20 text-red-400', 'bg-red-500/5 hover:bg-red-500/10 border-red-300/30 text-red-500 shadow-sm')
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

      {/* SpentAssistant AI Drawer */}
      <SpentAssistant remainingBenefits={remainingBenefits} logs={logs} theme={theme} />
    </div>
  );
}

export default App;
