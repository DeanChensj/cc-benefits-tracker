/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import type { OwnedCardInstance, AgentCommand } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import type { Benefit, LoyaltyAward } from '../data/cards.db';
import { 
  MessageSquare, 
  Send, 
  X, 
  Key, 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  ExternalLink 
} from 'lucide-react';

import { ConfirmationModal } from './ConfirmationModal';
import { parseLogEntry } from '../utils/logUtils';
import type { LogEntry } from '../utils/logUtils';

interface RemainingBenefit {
  cardInstance: OwnedCardInstance;
  benefit: Benefit;
  logKey: string;
}

interface SpentAssistantProps {
  remainingBenefits: RemainingBenefit[];
  logs: Record<string, LogEntry>;
  theme: 'dark' | 'light';
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function WalletAiAssistant({ remainingBenefits, logs, theme, showToast, ownedCards, loyaltyAwards }: SpentAssistantProps) {
  const { language } = useCardStore();
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isDeleteKeyOpen, setIsDeleteKeyOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('cc_tracker_gemini_apikey');
    if (storedKey) {
      setSavedKey(storedKey);
    }
  }, []);

  // Reset welcome message when key is connected
  useEffect(() => {
    if (savedKey) {
      setChatHistory([
        { 
          role: 'model', 
          text: t('aiWelcome')
        }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Verify and save the API Key
  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;

    setIsVerifying(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${trimmedKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say: Connected!' }] }]
          })
        }
      );

      if (!response.ok) throw new Error('Invalid Key');

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (responseText.includes('Connected!')) {
        localStorage.setItem('cc_tracker_gemini_apikey', trimmedKey);
        setSavedKey(trimmedKey);
        setApiKey('');
      } else {
        throw new Error('Verification failed');
      }
    } catch {
      showToast?.('❌ Invalid API Key. Please try again.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Delete the saved Key
  const handleDeleteKey = () => {
    setIsDeleteKeyOpen(true);
  };

  const handleConfirmDeleteKey = () => {
    localStorage.removeItem('cc_tracker_gemini_apikey');
    setSavedKey('');
    setChatHistory([]);
    setIsDeleteKeyOpen(false);
    showToast?.('🗑️ Gemini API Key removed successfully.', 'warning');
  };

  // Compile Prompt and Call Gemini API
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputMessage.trim();
    if (!message || isGenerating) return;

    const updatedHistory = [...chatHistory, { role: 'user' as const, text: message }];
    setChatHistory(updatedHistory);
    setInputMessage('');
    setIsGenerating(true);

    try {
      // Serialize ownedCards portfolio context
      const cardsContext = ownedCards.map((c) => {
        const multipliersText = c.multipliers 
          ? Object.entries(c.multipliers)
              .filter(([, val]) => val !== undefined)
              .map(([cat, val]) => `${cat}: ${val}x`)
              .join(', ')
          : 'none';
        return `- [Card] **${c.customName}** (Opened: ${c.cardOpenDate}, Annual Fee: $${c.annualFee || 0}, Signup Bonus Active: ${c.signupBonusActive ? `Yes, valued at $${c.signupBonusValue || 0}` : 'No'}, Multipliers: ${multipliersText})`;
      }).join('\n');

      // Serialize standalone loyaltyAwards context
      const awardsContext = loyaltyAwards.map((a) => {
        const usedQty = a.usedQuantity || 0;
        return `- [Voucher] **${a.customName || a.templateId}** (Status: ${usedQty >= 1 ? 'Used' : 'Unused'}, Expiry: ${a.expirationDate || 'none'}, Notes: ${a.notes || 'none'})`;
      }).join('\n');

      // Serialize active benefits checklist context
      const activeBenefitsText = remainingBenefits.map((ab) => {
        if (ab.benefit.spendingLimit) {
          const entry = parseLogEntry(logs[ab.logKey]);
          const spent = entry?.spentProgress || 0;
          return `- [Perk] ${ab.benefit.name} (Progress: $${spent} / $${ab.benefit.spendingLimit}, Cashback value: $${ab.benefit.value}, Category: ${ab.benefit.category}) on card "${ab.cardInstance.customName}"`;
        }
        return `- [Perk] ${ab.benefit.name} (Value: $${ab.benefit.value}, Category: ${ab.benefit.category}) on card "${ab.cardInstance.customName}"`;
      }).join('\n');

      // Construct high-fidelity system prompt
      const systemPrompt = `You are Wallet AI Assistant, an elite personal credit card and mileage vouchers co-pilot. You have direct, secure access to the user's active personal wallet dataset.

Here is the user's current local wallet data:

=== OWNED CARDS ===
${cardsContext.length > 0 ? cardsContext : 'No cards in wallet.'}

=== ACTIVE STANDALONE VOUCHERS ===
${awardsContext.length > 0 ? awardsContext : 'No standalone vouchers in wallet.'}

=== UNUSED DYNAMIC CHECKLIST PERKS ===
${activeBenefitsText.length > 0 ? activeBenefitsText : 'No active dynamic card perks remaining for this period.'}

=== USER INFORMATION ===
- Current Simulated Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

Guidelines:
1. Provide personalized financial recommendations, card spending selections (Dining, Travel, etc.), voucher tracking updates, or credit card general advice.
2. Reference their specific cards, vouchers, or perks directly by bolding their names.
3. Keep your answers accurate, extremely concise, clear, and formatted in tidy markdown. Keep the response strictly under 150 words. Respond strictly in ${language === 'zh' ? 'Chinese' : 'English'}.

=== AGENTIC ACTION COMMANDS ===
You are equipped with tools to directly add cards to the user's wallet. If the user explicitly instructs, asks, or requests you to ADD, REGISTER, or CREATE cards (either standard templates or custom cards), you MUST append a structured JSON command block at the absolute end of your response.

CRITICAL RULES & LIMITATIONS:
1. ONLY append command blocks if the user explicitly asks you to ADD, CREATE, or REGISTER cards to their wallet. If the user is just asking general questions, comparing cards, or asking for advice, you MUST NEVER output any command blocks!
2. You MUST write the command block as raw flat text inside |||COMMAND: and |||. Do NOT wrap the JSON inside markdown code blocks (never use \`\`\` or \`\`\`json inside the command block) otherwise the system parser will fail!

Command Schemas:
1. Add Template Card (with optional customName and cardOpenDate):
|||COMMAND: { "action": "add_card", "templateId": "TEMPLATE_ID", "customName": "OPTIONAL_CUSTOM_NAME", "cardOpenDate": "OPTIONAL_OPEN_DATE_YYYY_MM_DD" }|||

Valid TEMPLATE_IDs:
- amex-gold, amex-platinum, amex-bcp, amex-delta-reserve, amex-biz-platinum, amex-hilton-aspire, amex-delta-platinum
- chase-sapphire-reserve, chase-sapphire-preferred, chase-freedom-flex, chase-hyatt, chase-marriott-boundless, chase-ihg-premier, chase-freedom-unlimited, chase-ink-cash
- capital-one-venture-x, discover-it-cashback, amex-marriott-brilliant, citi-custom-cash, amex-biz-gold, amex-bce, citi-premier, citi-aa-platinum-select

2. Add Custom Card (with optional cardOpenDate):
|||COMMAND: { "action": "add_custom", "name": "CARD_NAME", "bank": "BANK_NAME", "annualFee": ANNUAL_FEE_NUMBER, "cardOpenDate": "OPTIONAL_OPEN_DATE_YYYY_MM_DD" }|||

3. Rename Card (oldName and newName are required):
|||COMMAND: { "action": "rename_card", "oldName": "CURRENT_CUSTOM_NAME", "newName": "NEW_CUSTOM_NAME" }|||

4. Update Card Opening Date (cardName and cardOpenDate are required):
|||COMMAND: { "action": "set_card_date", "cardName": "CURRENT_CUSTOM_NAME", "cardOpenDate": "NEW_OPEN_DATE_YYYY_MM_DD" }|||

Additional Rules:
- You can output multiple commands on separate lines if the user asks to add multiple cards or make multiple updates!
- Be extremely cheerful in your response, confirming what card(s) you have added or updated for them!`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${savedKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...chatHistory.map(c => ({
                role: c.role,
                parts: [{ text: c.text }]
              })),
              { role: 'user', parts: [{ text: message }] }
            ]
          })
        }
      );

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that.';

      // 🔍 Agentic Action Parser RegExp: intercept and execute direct wallet commands
      const cmdRegex = /\|\|\|COMMAND:\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*\|\|\|/g;
      let match;
      const matches: string[] = [];
      
      while ((match = cmdRegex.exec(reply)) !== null) {
        matches.push(match[1]);
      }

      // Strip the commands from the visible chat bubble
      reply = reply.replace(cmdRegex, '').trim();

      // Parse and combine all commands into a single array transaction
      const allCmds: AgentCommand[] = [];
      matches.forEach((jsonStr) => {
        try {
          const sanitizedJson = jsonStr
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          const parsed = JSON.parse(sanitizedJson);
          if (Array.isArray(parsed)) {
            allCmds.push(...parsed);
          } else {
            allCmds.push(parsed);
          }
        } catch (err) {
          console.error('Agentic action parsing failed:', err);
        }
      });

      if (allCmds.length > 0) {
        const result = useCardStore.getState().executeAgentCommand(allCmds);
        if (result.success && showToast) {
          showToast(result.message, 'success');
        }
      }

      setChatHistory([...updatedHistory, { role: 'model', text: reply }]);
    } catch {
      setChatHistory([
        ...updatedHistory,
        { role: 'model', text: "❌ **API Connection Failed.** Please ensure your network is connected and your API key is still valid." }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white p-4 rounded-full shadow-2xl z-40 transition duration-300 active:scale-90 hover:rotate-6 flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
      >
        <MessageSquare className="w-5 h-5 fill-white/10" />
        <span>{t('aiTitle')}</span>
      </button>

      {/* Chat Drawer Container */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-32px)] h-[480px] border border-t rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-scale-up transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-slate-900/80 backdrop-blur-md saturate-[170%] border-slate-800/70 border-t-white/15 text-slate-100' 
            : 'bg-white/85 backdrop-blur-md saturate-[170%] border-slate-200 border-t-white/45 text-slate-800'
        }`}>
          
          {/* Header */}
          <div className={`px-4 py-3 border-b flex items-center justify-between ${
            theme === 'dark' ? 'bg-slate-955 border-slate-850' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('aiTitle')}</span>
            </div>
            <div className="flex items-center gap-2">
              {savedKey && (
                <button
                  onClick={handleDeleteKey}
                  className="text-slate-505 hover:text-red-400 p-1 rounded transition cursor-pointer"
                  title="Delete API Key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat logs or API Setup */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin">
            {!savedKey ? (
              // API Key setup screen
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mx-auto">
                    <Key className="w-5 h-5" />
                  </div>
                  <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t('aiConnectApiKey')}</h4>
                  <p className={`text-[11px] max-w-[240px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}`}>
                    {t('aiConnectDesc')}
                  </p>
                </div>

                <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder={t('aiPastePlaceholder')}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={`w-full border text-xs rounded-xl px-3 py-2.5 focus:outline-none font-mono placeholder:font-sans ${
                        theme === 'dark'
                          ? 'bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200'
                          : 'bg-slate-50 border-slate-200 focus:border-purple-500 text-slate-800'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {t('aiVerifyingStatus')}
                      </>
                    ) : (
                      t('aiVerifyBtn')
                    )}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-850">
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-500 hover:text-purple-400 hover:underline"
                  >
                    {language === 'zh' ? '🎁 免费在 30 秒内申请 API 密钥 (Google AI Studio)' : 'Get Free API Key in 30s (AI Studio)'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              // Active chat logs screen
              <>
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-xl leading-relaxed prose prose-xs ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white rounded-br-none shadow-md shadow-purple-600/10'
                          : theme === 'dark'
                          ? 'bg-slate-955 text-slate-200 border border-slate-850 rounded-bl-none'
                          : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text.split('\n').map((line, lIdx) => {
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        
                        if (line.startsWith('- ')) {
                          return (
                            <li key={lIdx} className={`list-disc list-inside ml-1 text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              <span dangerouslySetInnerHTML={{ __html: line.substring(2).replace(boldRegex, '<strong>$1</strong>') }} />
                            </li>
                          );
                        }
                        
                        return (
                          <p 
                            key={lIdx} 
                            className={`mt-1 first:mt-0 text-[11px] leading-normal ${msg.role === 'user' ? 'text-white' : theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
                            dangerouslySetInnerHTML={{ __html: line.replace(boldRegex, '<strong>$1</strong>') }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className={`border p-3 rounded-xl rounded-bl-none flex items-center gap-1.5 ${
                      theme === 'dark' ? 'bg-slate-955 border-slate-850 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input bar */}
          {savedKey && (
            <form onSubmit={handleSendMessage} className={`p-3 border-t flex items-center gap-2 ${
              theme === 'dark' ? 'bg-slate-955 border-slate-850' : 'bg-slate-100/80 border-slate-200'
            }`}>
              <input
                type="text"
                disabled={isGenerating}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t('aiInputPlaceholder')}
                className={`flex-grow border text-xs rounded-xl px-3 py-2 focus:outline-none font-medium ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-200' 
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-purple-500'
                }`}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isGenerating}
                className="p-2 bg-purple-600 hover:bg-purple-550 text-white rounded-xl transition disabled:opacity-45 disabled:hover:bg-purple-600 active:scale-95 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4 fill-white/10" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Delete API Key Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteKeyOpen}
        title={t('aiDeleteConfirmTitle')}
        message={t('aiDeleteConfirmDesc')}
        confirmText={t('aiDeleteConfirmBtn')}
        cancelText={t('cancel')}
        onConfirm={handleConfirmDeleteKey}
        onCancel={() => setIsDeleteKeyOpen(false)}
        theme={theme}
        type="danger"
      />
    </>
  );
}
