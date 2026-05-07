import { useState } from 'react';
import { CARDS_DB } from './data/cards.db';
import type { CardTemplate, Benefit } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import { downloadICSFile } from './utils/calendar';
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
  Filter
} from 'lucide-react';

function App() {
  const { 
    ownedCardIds, 
    cardAnniversaries, 
    logs, 
    addCard, 
    removeCard, 
    setAnniversaryMonth, 
    toggleBenefit, 
    resetAll 
  } = useCardStore();

  // Date to evaluate states against (defaults to current system date)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'todo' | 'all' | 'cards'>('todo');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Get currently owned card objects
  const ownedCards = CARDS_DB.filter((c) => ownedCardIds.includes(c.id));

  // Flat list of all active benefits with calculated current log status
  interface ActiveBenefit {
    card: CardTemplate;
    benefit: Benefit;
    logKey: string;
    isUsed: boolean;
  }

  const activeBenefits: ActiveBenefit[] = [];
  ownedCards.forEach((card) => {
    card.benefits.forEach((benefit) => {
      const logKey = getLogKey(
        benefit.resetPeriod,
        card.id,
        benefit.id,
        currentDate,
        cardAnniversaries[card.id]
      );
      const isUsed = !!logs[logKey];

      activeBenefits.push({
        card,
        benefit,
        logKey,
        isUsed,
      });
    });
  });

  // Compute general stats
  const totalPotentialValue = activeBenefits.reduce((sum, ab) => sum + ab.benefit.value, 0);
  const resolvedValue = activeBenefits
    .filter((ab) => ab.isUsed)
    .reduce((sum, ab) => sum + ab.benefit.value, 0);
  const pendingValue = totalPotentialValue - resolvedValue;

  // Filtered benefits for the dashboard
  const filteredBenefits = activeBenefits.filter((ab) => {
    // Tab filter
    if (activeTab === 'todo' && ab.isUsed) return false;
    
    // Category filter
    if (filterCategory !== 'all' && ab.benefit.category !== filterCategory) return false;
    
    return true;
  });

  // Export data to local file
  const exportBackup = () => {
    const backupData = {
      ownedCardIds,
      cardAnniversaries,
      logs,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cc_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data from local file
  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.ownedCardIds && parsed.logs) {
          // Load it into Zustand storage
          useCardStore.setState({
            ownedCardIds: parsed.ownedCardIds || [],
            cardAnniversaries: parsed.cardAnniversaries || {},
            logs: parsed.logs || {},
          });
          alert('Backup restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to read file.');
      }
    };
    reader.readAsText(file);
  };

  // Fast forward month for testing the monthly roll-over logic
  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-xl text-slate-950">
              <CreditCard className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">CardPerks</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Local-First • Zero-Friction MVP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Simulating system clock for cross-month rollover testing */}
            <div className="flex items-center bg-slate-900 rounded-lg p-1 text-xs font-medium text-slate-300 border border-slate-800">
              <button 
                onClick={() => adjustMonth(-1)} 
                className="px-2 py-1 hover:bg-slate-800 rounded transition"
                title="Previous Month"
              >
                ◀
              </button>
              <span className="px-3 py-1 min-w-[110px] text-center font-semibold text-white">
                {currentMonthStr} {currentYear}
              </span>
              <button 
                onClick={() => adjustMonth(1)} 
                className="px-2 py-1 hover:bg-slate-800 rounded transition"
                title="Next Month"
              >
                ▶
              </button>
              {currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear() ? (
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="mx-1 p-1 hover:bg-slate-800 rounded text-amber-500"
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
        
        {/* Dashboard Summary Stats */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Potential Value
            </p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">${totalPotentialValue}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Resolved
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">${resolvedValue}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Remaining
            </p>
            <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">${pendingValue}</p>
          </div>
        </section>

        {/* Dashboard Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-900 pb-4">
          <div className="flex gap-1 bg-slate-900/80 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveTab('todo')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'todo'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              To-Do ({activeBenefits.filter(b => !b.isUsed).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              All Benefits ({activeBenefits.length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              My Cards ({ownedCardIds.length})
            </button>
          </div>

          {/* Category and backup/calendar buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab !== 'cards' && (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent border-none text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="dining">Dining</option>
                  <option value="travel">Travel</option>
                  <option value="shopping">Shopping</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>
            )}

            {ownedCardIds.length > 0 && (
              <button
                onClick={() => downloadICSFile(ownedCards, cardAnniversaries)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-855 text-xs font-medium text-slate-200 px-3 py-2 rounded-lg border border-slate-800 transition"
                title="Download iCal Calendar Reminders File"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Calendar Sync
              </button>
            )}
          </div>
        </div>

        {/* TAB 1 & 2: BENEFITS LIST */}
        {(activeTab === 'todo' || activeTab === 'all') && (
          <section>
            {ownedCardIds.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-8">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-4 stroke-[1.5]" />
                <h3 className="text-lg font-semibold text-slate-300">No active cards</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                  Choose which credit cards you currently hold to load their benefits in this view.
                </p>
                <button
                  onClick={() => setActiveTab('cards')}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  Manage My Cards
                </button>
              </div>
            ) : filteredBenefits.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/20 border border-slate-800/40 rounded-2xl p-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300">All benefits resolved!</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                  Nice job! You have maximized all tracked credits for {currentMonthStr}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBenefits.map(({ card, benefit, logKey, isUsed }) => (
                  <div
                    key={logKey}
                    onClick={() => toggleBenefit(logKey)}
                    className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition duration-200 ${
                      isUsed
                        ? 'bg-slate-950 border-slate-900 opacity-50'
                        : 'bg-slate-900/40 border-slate-850/80 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      {/* Checkbox icon */}
                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors duration-200 ${
                        isUsed 
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                          : 'border-slate-700 group-hover:border-slate-500 bg-slate-950/50 text-transparent'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-sm font-semibold ${isUsed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {benefit.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${
                            card.id === 'amex-gold' ? 'bg-amber-500/10 text-amber-400' :
                            card.id === 'amex-platinum' ? 'bg-slate-400/10 text-slate-300' :
                            card.id === 'chase-sapphire-reserve' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-teal-500/10 text-teal-400'
                          }`}>
                            {card.name.split(' ')[card.name.split(' ').length - 1]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{benefit.description}</p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end justify-center shrink-0">
                      <span className={`text-base font-bold ${isUsed ? 'text-slate-550' : 'text-white'}`}>
                        ${benefit.value}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                        {benefit.resetPeriod === 'monthly' ? 'Monthly' :
                         benefit.resetPeriod === 'semi-annual' ? 'Semi-Annual' :
                         benefit.resetPeriod === 'annual-calendar' ? 'Annual (Cal)' : 'Annual (Anniv)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: MY CARDS MANAGER */}
        {activeTab === 'cards' && (
          <section className="space-y-6">
            <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Add or Remove Credit Cards
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {CARDS_DB.map((card) => {
                  const isOwned = ownedCardIds.includes(card.id);
                  const annMonth = cardAnniversaries[card.id] || '01';

                  return (
                    <div 
                      key={card.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        isOwned 
                          ? 'bg-slate-900/80 border-amber-500/30' 
                          : 'bg-slate-950 border-slate-900 hover:border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400 uppercase">{card.bank}</span>
                          <button
                            onClick={() => isOwned ? removeCard(card.id) : addCard(card.id)}
                            className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                              isOwned
                                ? 'bg-red-500/10 hover:bg-red-500/25 text-red-400'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            }`}
                          >
                            {isOwned ? 'Remove' : 'Add Card'}
                          </button>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">{card.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {card.benefits.length} benefits (Total: ${card.benefits.reduce((s, b) => s + b.value, 0)}/yr)
                        </p>
                      </div>

                      {isOwned && (
                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            Anniversary Month:
                          </label>
                          <select
                            value={annMonth}
                            onChange={(e) => setAnniversaryMonth(card.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none"
                          >
                            {Array.from({ length: 12 }, (_, i) => {
                              const m = (i + 1).toString().padStart(2, '0');
                              return (
                                <option key={m} value={m}>
                                  {new Date(2026, i, 1).toLocaleString('default', { month: 'short' })}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Backup and Developer tools */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Data Portability & Safety</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportBackup}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-855 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-800 text-slate-300 transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  Export JSON Backup
                </button>

                <label className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-855 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-800 text-slate-300 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
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
                    if (confirm('Are you absolutely sure you want to reset all cards and checklist logs? This cannot be undone.')) {
                      resetAll();
                    }
                  }}
                  className="flex items-center gap-1.5 bg-red-550/10 hover:bg-red-550/20 text-xs font-semibold px-3 py-2 rounded-lg border border-red-500/20 text-red-400 transition ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe App Data
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      
      {/* Footer */}
      <footer className="text-center py-8 text-xs text-slate-600 border-t border-slate-950 mt-12">
        <p>No account. No passwords. Purely local & safe.</p>
        <p className="mt-1 text-slate-700">Double-click to edit, swipe/click to track.</p>
      </footer>
    </div>
  );
}

export default App;
