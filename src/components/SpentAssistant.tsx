import { useState, useEffect, useRef } from 'react';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { Benefit } from '../data/cards.db';
import { 
  MessageSquare, 
  Send, 
  X, 
  Key, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  ExternalLink 
} from 'lucide-react';

import { ConfirmationModal } from './ConfirmationModal';

interface RemainingBenefit {
  cardInstance: OwnedCardInstance;
  benefit: Benefit;
  logKey: string;
}

interface SpentAssistantProps {
  remainingBenefits: RemainingBenefit[];
  logs: Record<string, boolean | number>;
  theme: 'dark' | 'light';
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function SpentAssistant({ remainingBenefits, logs, theme, showToast }: SpentAssistantProps) {
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
          text: "✨ **SpentAssistant Online!** I have securely loaded your card portfolio and remaining benefits. Ask me anything! e.g., \"I am spending $150 on dinner tonight, what card should I use?\"" 
        }
      ]);
    }
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
    } catch (err) {
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
      // Assemble Card Context
      const activeBenefitsText = remainingBenefits.map((ab) => {
        if (ab.benefit.spendingLimit) {
          const spent = Number(logs[ab.logKey]) || 0;
          return `- [Progressive Limit perk] ${ab.benefit.name} (Currently Spent: $${spent} / $${ab.benefit.spendingLimit}, Cashback value: $${ab.benefit.value}, Category: ${ab.benefit.category}, Period: ${ab.benefit.resetPeriod}) on card "${ab.cardInstance.customName}"`;
        }
        return `- [Remaining perk] ${ab.benefit.name} (Value: $${ab.benefit.value}, Category: ${ab.benefit.category}, Period: ${ab.benefit.resetPeriod}${
          ab.benefit.expirationDate ? `, Expiration: ${ab.benefit.expirationDate}` : ''
        }) on card "${ab.cardInstance.customName}"`;
      });

      // Construct system prompt
      const systemPrompt = `You are SpentAssistant, an elite personal finance bot. Your goal is to analyze the user's card inventory and suggest the absolute best credit card strategy for their specific spending scenario.

Here is the user's current cards inventory with their UNUSED (REMAINING) active perks:
${activeBenefitsText.length > 0 ? activeBenefitsText.join('\n') : 'No remaining promotional card perks for this period.'}

Also consider general multipliers for standard cards if relevant:
- Amex Gold: 4x Dining, 4x U.S. Supermarkets.
- Amex Platinum: 5x Flights.
- Chase Sapphire Reserve: 3x Travel, 3x Dining.
- Capital One Venture X: 2x Everything.

Guidelines:
1. Advise on the absolute best card to pull out of their wallet for the scenario.
2. Prioritize using up remaining fixed-expiration perks, monthly statement credits, or travel credits first.
3. If no perks apply, recommend the card with the highest multiplier points.
4. Keep your response extremely concise, structured, and limited to 120 words. Make card names bold. Format in clean markdown.
5. ALWAYS respond to the user in English.`;

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
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that.';

      setChatHistory([...updatedHistory, { role: 'model', text: reply }]);
    } catch (err) {
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
        <span>AI Spending Assistant</span>
      </button>

      {/* Chat Drawer Container */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-32px)] h-[480px] border rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-scale-up transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          
          {/* Header */}
          <div className={`px-4 py-3 border-b flex items-center justify-between ${
            theme === 'dark' ? 'bg-slate-955 border-slate-850' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>SpentAssistant AI</span>
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
                  <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Connect Gemini API</h4>
                  <p className={`text-[11px] max-w-[240px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}`}>
                    Absolute privacy guarantee: Your key is stored strictly inside your browser's secure local storage. No server-side collection, requests are sent directly to Google.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border space-y-2.5 ${theme === 'dark' ? 'bg-slate-955 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-500">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>🔒 Privacy Shield Active</span>
                  </div>
                  <p className={`text-[10px] leading-normal ${theme === 'dark' ? 'text-slate-505' : 'text-slate-600'}`}>
                    Your key and chat history stay 100% on your machine. Requests are executed directly via your browser client straight to Google's secure endpoint.
                  </p>
                </div>

                <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Paste Gemini API Key (AIzaSy...)"
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
                        Verifying Key...
                      </>
                    ) : (
                      "Connect API Key"
                    )}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-850">
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-500 hover:text-purple-400 hover:underline"
                  >
                    Get Free API Key in 30s (AI Studio)
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
                          ? 'bg-slate-950 text-slate-200 border border-slate-850 rounded-bl-none'
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
                placeholder="Ask where to spend... e.g. 'Dining $100'"
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
        title="Delete API Key?"
        message="Are you sure you want to delete your Gemini API key from this device? This action will disconnect the SpentAssistant AI recommendation chat."
        confirmText="Delete Key"
        cancelText="Keep Key"
        onConfirm={handleConfirmDeleteKey}
        onCancel={() => setIsDeleteKeyOpen(false)}
        theme={theme}
        type="danger"
      />
    </>
  );
}
