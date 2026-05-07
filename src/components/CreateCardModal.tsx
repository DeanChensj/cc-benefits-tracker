import { useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';


interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  addCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  getLocalDateString: () => string;
}

export function CreateCardModal({ 
  isOpen, 
  onClose, 
  theme, 
  addCustomCard, 
  getLocalDateString 
}: CreateCardModalProps) {
  if (!isOpen) return null;

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

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

  const handleSubmit = (e: React.FormEvent) => {
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
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>Bank Name (银行)</label>
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
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>Card Name (卡名)</label>
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
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>Card Opened Date (开卡日)</label>
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
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>Card Color (卡片配色)</label>
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
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-550')}`}>Card Benefits ({newBenefits.length})</h4>
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
                          themeClass('bg-slate-900 border-slate-855 text-slate-200', 'bg-white border-slate-250 text-slate-800')
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
                          themeClass('bg-slate-900 border-slate-855 text-slate-200', 'bg-white border-slate-250 text-slate-800')
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
                          themeClass('bg-slate-900 border-slate-855 text-slate-300', 'bg-white border-slate-255 text-slate-700')
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
                          themeClass('bg-slate-900 border-slate-855 text-slate-300', 'bg-white border-slate-255 text-slate-700')
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
                          themeClass('bg-slate-900 border-slate-855 text-slate-300', 'bg-white border-slate-255 text-slate-850')
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={`flex gap-3 pt-4 border-t mt-4 ${themeClass('border-slate-855', 'border-slate-200')}`}>
            <button
              type="button"
              onClick={() => {
                onClose();
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
  );
}
