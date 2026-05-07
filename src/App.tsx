import { useState } from 'react';
import { CARDS_DB } from './data/cards.db';
import type { CardTemplate, Benefit } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { downloadICSFile } from './utils/calendar';
import { SpentAssistant } from './components/SpentAssistant';
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

  // Custom card builder states
  const [customBank, setCustomBank] = useState('');
  const [customCardName, setCustomCardName] = useState('');
  const [customColor, setCustomColor] = useState('from-purple-600 to-indigo-900');
  const [customCardOpenDate, setCustomCardOpenDate] = useState(getLocalDateString());
  const [newBenefits, setNewBenefits] = useState<{
    name: string;
    value: number;
    resetPeriod: 'monthly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed';
    category: 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other';
    description: string;
    expirationDate?: string;
  }[]>([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);

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
      const isUsed = !!logs[logKey];

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

  // Compute stats
  const totalPotentialValue = activeBenefits.reduce((sum, ab) => sum + ab.benefit.value, 0);
  const resolvedValue = activeBenefits
    .filter((ab) => ab.isUsed)
    .reduce((sum, ab) => sum + ab.benefit.value, 0);

  const expiredValue = activeBenefits
    .filter((ab) => 
      !ab.isUsed && 
      ab.benefit.resetPeriod === 'fixed' && 
      ab.benefit.expirationDate && 
      new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate
    )
    .reduce((sum, ab) => sum + ab.benefit.value, 0);

  const pendingValue = totalPotentialValue - resolvedValue - expiredValue;

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
    if (activeTab === 'todo' && ab.isUsed) return false;
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
                    benefit.expirationDate && 
                    new Date(benefit.expirationDate + 'T00:00:00') < currentDate;

                  let daysLeft = 0;
                  if (benefit.resetPeriod === 'fixed' && benefit.expirationDate) {
                    const expTime = new Date(benefit.expirationDate + 'T00:00:00').getTime();
                    const curTime = currentDate.getTime();
                    daysLeft = Math.ceil((expTime - curTime) / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <div
                      key={logKey}
                      onClick={() => {
                        if (isExpired) return;
                        toggleBenefit(logKey);
                      }}
                      className={`group flex items-center justify-between p-4 rounded-xl border transition duration-200 ${
                        isExpired
                          ? themeClass('bg-slate-950 border-red-955/10 opacity-40 cursor-not-allowed', 'bg-red-50/30 border-red-200/50 opacity-60 cursor-not-allowed')
                          : isUsed
                          ? themeClass('bg-slate-950 border-slate-900 opacity-50 cursor-pointer', 'bg-slate-100/70 border-slate-200/70 opacity-60 cursor-pointer')
                          : themeClass('bg-slate-900/40 border-slate-850/80 hover:border-slate-700 hover:bg-slate-900 cursor-pointer', 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer shadow-[0_2px_6px_rgba(15,23,42,0.02)] hover:shadow-[0_4px_10px_rgba(15,23,42,0.045)]')
                      }`}
                    >
                      <div className="flex items-center gap-3.5 pr-4">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors duration-200 ${
                          isExpired
                            ? 'border-red-900 bg-red-950/10 text-red-500'
                            : isUsed 
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                            : themeClass('border-slate-700 group-hover:border-slate-500 bg-slate-950/50 text-transparent', 'border-slate-250 group-hover:border-slate-350 bg-white text-transparent')
                        }`}>
                          {isExpired ? (
                            <span className="text-[10px] font-bold">✕</span>
                          ) : (
                            <CheckCircle2 className={`w-4 h-4 stroke-[3] transition-all duration-250 transform origin-center ${isUsed ? 'scale-100 rotate-0' : 'scale-0 -rotate-12 opacity-0'}`} />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              isExpired ? 'text-slate-400 line-through' :
                              isUsed ? 'line-through text-slate-450' : themeClass('text-slate-100', 'text-slate-800')
                            }`}>
                              {benefit.name}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wide border ${
                              themeClass('bg-slate-800 text-slate-300 border-slate-700', 'bg-slate-100 text-slate-600 border-slate-200')
                            }`}>
                              {cardInstance.customName}
                            </span>
                            
                            {isExpired ? (
                              <span className="text-[9px] font-bold bg-red-550/10 text-red-500 border border-red-500/20 px-1.5 py-0.2 rounded">Expired</span>
                            ) : benefit.resetPeriod === 'fixed' && benefit.expirationDate && (
                              <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded ${
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
                            {benefit.resetPeriod === 'fixed' && benefit.expirationDate && (
                              <span className="text-slate-500 block mt-0.5">
                                Expiration deadline: {benefit.expirationDate}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end justify-center shrink-0">
                        <span className={`text-base font-bold ${isExpired || isUsed ? 'text-slate-500' : themeClass('text-white', 'text-slate-900')}`}>
                          ${benefit.value}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-550 font-bold mt-0.5">
                          {benefit.resetPeriod === 'monthly' ? 'Monthly' :
                           benefit.resetPeriod === 'semi-annual' ? 'Semi-Annual' :
                           benefit.resetPeriod === 'annual-calendar' ? 'Annual (Cal)' :
                           benefit.resetPeriod === 'annual-anniversary' ? 'Annual (Anniv)' : 'Fixed Expiration'}
                        </span>
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
          <section className="space-y-6">
            <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
              themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold flex items-center gap-2 ${themeClass('text-white', 'text-slate-800')}`}>
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  Credit Card Inventory
                </h3>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <input
                    type="text"
                    placeholder="🔍 Search card or bank name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`border text-xs rounded-xl px-3.5 py-2 focus:outline-none w-60 font-medium ${
                      themeClass('bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
                    }`}
                  />
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-2 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Create Custom Card
                  </button>
                </div>
              </div>
              
              <div className="space-y-8">
                {(['Amex', 'Chase', 'Capital One'] as const).map((bankName) => {
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
                          bankName === 'Chase' ? 'bg-blue-500' : 'bg-teal-500'
                        }`} />
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
                          {bankName === 'Amex' ? 'American Express' : bankName} Cards
                        </h4>
                        <span className="text-[10px] text-slate-600 font-semibold ml-auto">
                          {bankCards.length} templates available
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {bankCards.map((card) => {
                          const instances = ownedCards.filter((c) => c.templateId === card.id);

                          return (
                            <div 
                              key={card.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between transition relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] ${
                                themeClass('bg-slate-950 border-slate-900 hover:border-slate-850', 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm')
                              }`}
                            >
                              <div className="pb-3">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-semibold uppercase ${themeClass('text-slate-400', 'text-slate-550')}`}>{card.bank}</span>
                                  <button
                                    onClick={() => addCard(card.id)}
                                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-xs transition active:scale-[0.97] shadow"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    Add Instance
                                  </button>
                                </div>
                                <h4 className={`text-base font-bold mt-1 ${themeClass('text-white', 'text-slate-900')}`}>{card.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {card.benefits.length} perks (Total: ${card.benefits.reduce((s, b) => s + b.value, 0)}/yr)
                                </p>
                              </div>

                              {instances.length > 0 && (
                                <div className={`mt-3 pt-3 border-t space-y-3 ${themeClass('border-slate-900', 'border-slate-200')}`}>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Instances ({instances.length})</p>
                                  
                                  {instances.map((instance) => (
                                    <div key={instance.id} className={`p-2.5 rounded-lg border space-y-2 ${
                                      themeClass('bg-slate-900/50 border-slate-850/60', 'bg-white border-slate-200 shadow-inner')
                                    }`}>
                                      <div className="flex items-center justify-between gap-2">
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
                                            className={`border text-xs rounded px-2 py-1 font-semibold focus:outline-none w-full ${
                                              themeClass('bg-slate-950 border-amber-500/50 text-slate-200', 'bg-slate-50 border-purple-500 text-slate-850')
                                            }`}
                                          />
                                        ) : (
                                          <div 
                                            onClick={() => setEditingInstanceId(instance.id)}
                                            className="text-xs font-bold flex items-center gap-1 cursor-pointer hover:text-amber-500 transition"
                                            title="Click to rename"
                                          >
                                            <span className={themeClass('text-slate-200', 'text-slate-800')}>{instance.customName}</span>
                                            <Edit3 className="w-3 h-3 text-slate-500 shrink-0" />
                                          </div>
                                        )}

                                        <button
                                          onClick={() => removeCard(instance.id)}
                                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-550/10 rounded transition cursor-pointer"
                                          title="Delete this instance"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      <div className="flex items-center justify-between gap-2 pt-1">
                                        <label className="text-[10px] font-medium text-slate-500">
                                          Card Opened Date:
                                        </label>
                                        <input
                                          type="date"
                                          value={instance.cardOpenDate}
                                          onChange={(e) => setCardOpenDate(instance.id, e.target.value)}
                                          className={`border text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer font-medium ${
                                            themeClass('bg-slate-955 border-slate-800 text-slate-350', 'bg-white border-slate-250 text-slate-750')
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Custom Card Instances List */}
                {(() => {
                  const customCards = ownedCards
                    .filter((c) => c.templateId === 'custom')
                    .filter((c) =>
                      c.customName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.bank || '').toLowerCase().includes(searchQuery.toLowerCase())
                    );

                  if (customCards.length === 0) return null;

                  return (
                    <div className={`space-y-3.5 border-t pt-6 ${themeClass('border-slate-900', 'border-slate-200')}`}>
                      <div className={`flex items-center gap-2 border-b pb-2 ${themeClass('border-slate-900', 'border-slate-200')}`}>
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>Custom Cards</h4>
                        <span className="text-[10px] text-slate-600 font-semibold ml-auto">
                          {customCards.length} active cards
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {customCards.map((instance) => {
                          const customColor = instance.color || 'from-purple-950/50 to-slate-950';
                          
                          return (
                            <div 
                              key={instance.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between transition bg-gradient-to-tr ${customColor} relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] ${
                                themeClass('border-purple-900/30 hover:border-purple-800/50', 'border-purple-500/20 hover:border-purple-500/45 shadow-sm text-slate-800')
                              }`}
                            >
                              <div className="pb-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{instance.bank || 'Custom'}</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        addCustomCard({
                                          templateId: 'custom',
                                          customName: `${instance.customName} (Copy)`,
                                          bank: instance.bank,
                                          color: instance.color,
                                          cardOpenDate: instance.cardOpenDate,
                                          customBenefits: (instance.customBenefits || []).map((b) => ({
                                            ...b,
                                            id: `benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                          })),
                                        });
                                      }}
                                      className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-550/10 rounded transition active:scale-90 cursor-pointer"
                                      title="Duplicate custom card instance"
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </button>
                                    <button
                                      onClick={() => removeCard(instance.id)}
                                      className="p-1 text-red-400 hover:text-red-500 hover:bg-red-550/10 rounded transition cursor-pointer"
                                      title="Delete custom card"
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
                                    className={`border text-xs rounded px-2 py-1 font-semibold focus:outline-none w-full mt-2 ${
                                      themeClass('bg-slate-950 border-purple-500/50 text-slate-200', 'bg-white border-purple-500 text-slate-800')
                                    }`}
                                  />
                                ) : (
                                  <h4 
                                    onClick={() => setEditingInstanceId(instance.id)}
                                    className="text-base font-bold mt-1.5 flex items-center gap-1 cursor-pointer hover:text-purple-400 transition text-white"
                                    title="Click to rename"
                                  >
                                    {instance.customName}
                                    <Edit3 className="w-3 h-3 text-slate-450 shrink-0" />
                                  </h4>
                                )}

                                <p className="text-xs text-slate-400 mt-1">
                                  {(instance.customBenefits || []).length} perks (Total: ${(instance.customBenefits || []).reduce((s, b) => s + b.value, 0)}/yr)
                                </p>

                                {/* Custom benefits list */}
                                <div className="mt-4 space-y-1.5">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Card Benefits</p>
                                  {(instance.customBenefits || []).map((b) => (
                                    <div key={b.id} className={`flex items-center justify-between text-xs p-1.5 rounded border ${
                                      themeClass('bg-slate-955/50 border-slate-900/80 text-slate-300', 'bg-white/30 border-slate-200/20 text-white')
                                    }`}>
                                      <span>{b.name}</span>
                                      <span className="font-bold text-white">${b.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 ${themeClass('border-slate-900/80', 'border-purple-500/20')}`}>
                                <label className="text-[10px] font-medium text-slate-350">
                                  Card Opened Date:
                                </label>
                                <input
                                  type="date"
                                  value={instance.cardOpenDate}
                                  onChange={(e) => setCardOpenDate(instance.id, e.target.value)}
                                  className={`border text-[11px] rounded px-2.5 py-0.5 focus:outline-none cursor-pointer font-medium ${
                                    themeClass('bg-slate-955 border-slate-800 text-slate-350', 'bg-white/40 border-purple-400/25 text-white')
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Export JSON Backup
                </button>

                <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition ${
                  themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-300', 'bg-white hover:bg-slate-100 border-slate-250 text-slate-600 shadow-sm')
                }`}>
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
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

      {/* Calendar Sync Modal Overlay */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div 
            className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up transition-colors duration-300 ${
              themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${themeClass('text-white', 'text-slate-900')}`}>Calendar Reminders Sync</h3>
                <p className={`text-xs ${themeClass('text-slate-400', 'text-slate-500')}`}>Export and import events to your native calendars</p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed mb-5 ${themeClass('text-slate-300', 'text-slate-600')}`}>
              We will bundle all active tracked card perks and their respective renewal schedules into a single standard calendar subscription file.
            </p>

            <button
              onClick={() => {
                downloadICSFile(ownedCards);
              }}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition active:scale-[0.98] shadow-lg shadow-amber-500/10 mb-6 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[3]" />
              1. Download Calendar File (.ics)
            </button>

            <div className={`space-y-4 border-t pt-4 ${themeClass('border-slate-800', 'border-slate-200')}`}>
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${themeClass('text-slate-500', 'text-slate-400')}`}>How to Import (如何导入):</h4>
              
              <div className="space-y-2.5">
                <div className="text-xs">
                  <p className={`font-semibold ${themeClass('text-slate-200', 'text-slate-800')}`}>🍎 Apple Calendar / iOS / Mac:</p>
                  <p className={`mt-0.5 text-[11px] ${themeClass('text-slate-400', 'text-slate-500')}`}>Just double-click or drag-and-drop the downloaded file into the Calendar app. All reminders sync automatically!</p>
                </div>

                <div className="text-xs">
                  <p className={`font-semibold ${themeClass('text-slate-200', 'text-slate-800')}`}>🤖 Google Calendar (谷歌日历网页版):</p>
                  <p className={`mt-0.5 text-[11px] ${themeClass('text-slate-400', 'text-slate-500')}`}>
                    1. Open <a href="https://calendar.google.com" target="_blank" className="text-purple-600 dark:text-amber-400 hover:underline font-medium">Google Calendar</a>. <br />
                    2. Go to <span className={`font-medium ${themeClass('text-slate-300', 'text-slate-700')}`}>Settings (Gear icon)</span> &rarr; <span className={`font-medium ${themeClass('text-slate-300', 'text-slate-700')}`}>Import & Export</span>. <br />
                    3. Select and upload the downloaded `.ics` file. Done!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSyncModalOpen(false)}
              className={`w-full mt-6 font-semibold py-2 rounded-lg text-xs transition cursor-pointer ${
                themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Custom Card Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div 
            className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-scale-up transition-colors duration-300 ${
              themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${themeClass('text-white', 'text-slate-900')}`}>Create Custom Credit Card</h3>
                <p className={`text-xs ${themeClass('text-slate-400', 'text-slate-500')}`}>Add your long-tail credit cards and custom perks</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!customCardName.trim()) {
                alert('Please enter a card name.');
                return;
              }

              const preparedBenefits = newBenefits
                .filter((b) => b.name.trim() !== '')
                .map((b) => ({
                  ...b,
                  id: `benefit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  value: Number(b.value) || 0,
                }));

              addCustomCard({
                templateId: 'custom',
                customName: customCardName.trim(),
                bank: customBank.trim() || 'Custom',
                color: customColor,
                cardOpenDate: customCardOpenDate,
                customBenefits: preparedBenefits,
              });

              // Reset states
              setCustomBank('');
              setCustomCardName('');
              setCustomColor('from-purple-600 to-indigo-900');
              setCustomCardOpenDate(getLocalDateString());
              setNewBenefits([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);
              setIsCreateModalOpen(false);
            }} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>Bank Name (银行)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bilt, Citi"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-medium ${
                      themeClass('bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>Card Name (卡名)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mastercard, Custom Cash"
                    value={customCardName}
                    onChange={(e) => setCustomCardName(e.target.value)}
                    className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-medium ${
                      themeClass('bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>Card Opened Date (开卡日)</label>
                  <input
                    type="date"
                    required
                    value={customCardOpenDate}
                    onChange={(e) => setCustomCardOpenDate(e.target.value)}
                    className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-medium cursor-pointer ${
                      themeClass('bg-slate-955 border-slate-800 text-slate-300', 'bg-slate-50 border-slate-250 text-slate-750 focus:border-purple-500')
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>Card Color (卡片配色)</label>
                  <div className="flex gap-1.5 items-center pt-1">
                    {[
                      { class: 'from-purple-600 to-indigo-900', label: 'Violet' },
                      { class: 'from-teal-500 to-cyan-800', label: 'Lagoon' },
                      { class: 'from-rose-600 to-red-900', label: 'Lava' },
                      { class: 'from-emerald-600 to-green-900', label: 'Emerald' },
                      { class: 'from-slate-750 to-slate-900', label: 'Steel' }
                    ].map((c) => (
                      <button
                        key={c.class}
                        type="button"
                        onClick={() => setCustomColor(c.class)}
                        className={`w-5 h-5 rounded-full bg-gradient-to-tr ${c.class} border transition cursor-pointer ${
                          customColor === c.class ? 'border-white scale-110 ring-2 ring-purple-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Benefits Builder Section */}
              <div className={`border-t pt-4 mt-4 space-y-3 ${themeClass('border-slate-850', 'border-slate-200')}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>Card Benefits ({newBenefits.length})</h4>
                  <button
                    type="button"
                    onClick={() => setNewBenefits([...newBenefits, { name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }])}
                    className="flex items-center gap-1 text-[10px] font-bold text-purple-500 hover:text-purple-400 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    Add Perk (添加福利)
                  </button>
                </div>

                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {newBenefits.map((benefit, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border space-y-2.5 relative ${
                      themeClass('bg-slate-950 border-slate-850/80', 'bg-slate-50 border-slate-200')
                    }`}>
                      {newBenefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewBenefits(newBenefits.filter((_, i) => i !== idx))}
                          className="absolute top-2.5 right-2.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Perk Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Rent Day Credit"
                            value={benefit.name}
                            onChange={(e) => {
                              const updated = [...newBenefits];
                              updated[idx].name = e.target.value;
                              setNewBenefits(updated);
                            }}
                            className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-medium ${
                              themeClass('bg-slate-900 border-slate-850 text-slate-200', 'bg-white border-slate-250 text-slate-800')
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Value ($)</label>
                          <input
                            type="number"
                            placeholder="5"
                            value={benefit.value || ''}
                            onChange={(e) => {
                              const updated = [...newBenefits];
                              updated[idx].value = Number(e.target.value);
                              setNewBenefits(updated);
                            }}
                            className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-bold ${
                              themeClass('bg-slate-900 border-slate-850 text-slate-200', 'bg-white border-slate-250 text-slate-800')
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Reset Period</label>
                          <select
                            value={benefit.resetPeriod}
                            onChange={(e) => {
                              const updated = [...newBenefits];
                              updated[idx].resetPeriod = e.target.value as any;
                              if (e.target.value === 'fixed' && !updated[idx].expirationDate) {
                                updated[idx].expirationDate = getLocalDateString();
                              }
                              setNewBenefits(updated);
                            }}
                            className={`w-full border text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                              themeClass('bg-slate-900 border-slate-850 text-slate-300', 'bg-white border-slate-250 text-slate-700')
                            }`}
                          >
                            <option value="monthly">Monthly</option>
                            <option value="semi-annual">Semi-Annual</option>
                            <option value="annual-calendar">Annual (Calendar)</option>
                            <option value="annual-anniversary">Annual (Anniversary)</option>
                            <option value="fixed">Fixed Expiration Date</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Category</label>
                          <select
                            value={benefit.category}
                            onChange={(e) => {
                              const updated = [...newBenefits];
                              updated[idx].category = e.target.value as any;
                              setNewBenefits(updated);
                            }}
                            className={`w-full border text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                              themeClass('bg-slate-900 border-slate-850 text-slate-300', 'bg-white border-slate-250 text-slate-700')
                            }`}
                          >
                            <option value="dining">Dining</option>
                            <option value="travel">Travel</option>
                            <option value="shopping">Shopping</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      {benefit.resetPeriod === 'fixed' && (
                        <div className="pt-1.5">
                          <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Expiration Date (到期日)</label>
                          <input
                            type="date"
                            required
                            value={benefit.expirationDate || ''}
                            onChange={(e) => {
                              const updated = [...newBenefits];
                              updated[idx].expirationDate = e.target.value;
                              setNewBenefits(updated);
                            }}
                            className={`w-full border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-medium cursor-pointer ${
                              themeClass('bg-slate-900 border-slate-850 text-slate-300', 'bg-white border-slate-250 text-slate-850')
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex gap-3 pt-4 border-t mt-4 ${themeClass('border-slate-850', 'border-slate-200')}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewBenefits([{ name: '', value: 0, resetPeriod: 'monthly', category: 'dining', description: '' }]);
                  }}
                  className={`w-1/3 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer ${
                    themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer shadow-md shadow-purple-500/10"
                >
                  Create & Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className={`text-center py-8 text-xs border-t mt-12 ${themeClass('text-slate-600 border-slate-950', 'text-slate-500 border-slate-200')}`}>
        <p>No account. No passwords. Purely local & safe.</p>
        <p className="mt-1">Click to check off, click custom name to rename.</p>
      </footer>

      {/* SpentAssistant AI Drawer */}
      <SpentAssistant remainingBenefits={remainingBenefits} theme={theme} />
    </div>
  );
}

export default App;
