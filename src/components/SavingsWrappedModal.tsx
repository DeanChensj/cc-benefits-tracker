import { useRef, useState } from 'react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { CARDS_DB } from '../data/cards.db';
import { X, Download, Sparkles, RefreshCw } from 'lucide-react';

interface SavingsWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCards: OwnedCardInstance[];
  resolvedValue: number;
  themeClass: (dark: string, light: string) => string;
}

export function SavingsWrappedModal({
  isOpen,
  onClose,
  ownedCards,
  resolvedValue,
  themeClass,
}: SavingsWrappedModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterLang, setPosterLang] = useState<'en' | 'zh'>('zh'); // Default to punchy Chinese!
  const [currentUrl] = useState('https://deanchensj.github.io/cc-benefits-tracker/');
  const svgRef = useRef<SVGSVGElement>(null);

  if (!isOpen) return null;

  // 1. Calculate Total Secured SUBs
  const securedSUBs = ownedCards.reduce((sum, card) => {
    if (card.signupBonusActive && card.signupBonusValue !== undefined) {
      return sum + card.signupBonusValue;
    }
    return sum;
  }, 0);

  // 2. Total Savings Sum (Checked Perks + SUBs!)
  const totalSavings = Math.round((resolvedValue + securedSUBs) * 100) / 100;

  // 3. Define Churner Level Rank Badge & Relative Percentile Rank
  let rankTitleEn = 'BRONZE CHURNER 🛡️';
  let rankTitleZh = '青铜羊毛新手 🛡️';
  let rankPercentEn = '🛡️ DEFEATED 60.1% OF CHURNER PLAYERS';
  let rankPercentZh = '🛡️ 击败了全球 60.1% 的羊毛玩家！';
  let rankColor = '#94a3b8'; // bronze/slate

  if (totalSavings >= 3500) {
    rankTitleEn = 'MYTHIC CAPITAL SLAYER 👑💎🔥';
    rankTitleZh = '资本家终结之神 👑💎🔥';
    rankPercentEn = '👑 DEFEATED 99.2% OF TOP CHURNERS!';
    rankPercentZh = '👑 击败了全球 99.2% 的至尊卡神！';
    rankColor = '#facc15'; // Glowing gold
  } else if (totalSavings >= 1500) {
    rankTitleEn = 'GOLD SOVEREIGN 👑';
    rankTitleZh = '黄金卡包霸主 👑';
    rankPercentEn = '⚔️ DEFEATED 85.4% OF CHURNER MASTERS';
    rankPercentZh = '⚔️ 击败了全球 85.4% 的精算大师！';
    rankColor = '#fbbf24'; // Amber gold
  } else if (totalSavings >= 500) {
    rankTitleEn = 'SILVER MAXIMIZER ⚔️';
    rankTitleZh = '白银回本精算师 ⚔️';
    rankColor = '#e2e8f0'; // Silver
  }

  const activeRank = posterLang === 'zh' ? rankTitleZh : rankTitleEn;
  const activePercent = posterLang === 'zh' ? rankPercentZh : rankPercentEn;

  // 4. Localized Text Dictionary for Poster Render
  const dict = {
    en: {
      header: 'ANNUAL SAVINGS WRAPPED',
      title1: 'YOU ANNIHILATED',
      title2: 'THE BANKS!',
      subtitle: 'TOTAL CASH RECOUPED IN 2026',
      haulTitle: '💵 HAUL DETAILS',
      row1: 'Statement Perks Recouped:',
      row2: 'Secured Signup Bonuses (SUBs):',
      row3: 'Active Portfolio Wallet Size:',
      battleships: '👑 TOP BATTLESHIPS IN WALLET',
      rankLabel: 'CHURNER RANK:',
      scannerLabel: 'CC Benefits Tracker • 100% Secured',
      subBadge: 'SUB SECURED ✓',
    },
    zh: {
      header: '年度反薅资本家账单',
      title1: '您对银行执行了',
      title2: '降维打击！',
      subtitle: '2026 年反薅回本总金额',
      haulTitle: '💵 战利品明细',
      row1: '已点掉 statement 福利:',
      row2: '已斩获开卡礼 (SUBs):',
      row3: '钱包 active 战神卡片数:',
      battleships: '👑 钱包主力冲锋战神卡',
      rankLabel: '薅羊毛段位评级:',
      scannerLabel: 'CC Benefits Tracker • 本地加密保障',
      subBadge: '开卡礼已斩获 ✓',
    }
  }[posterLang];

  // 5. Prepare and format battleships (regex clean custom card tail-numbers)
  // Helper to dynamically nickname bulky card names for clean horizontal layouts inside the poster
  const getShortCardName = (name: string): string => {
    return name
      .replace(/American Express/gi, 'Amex')
      .replace(/Chase Sapphire/gi, 'Chase')
      .replace(/Capital One/gi, 'Cap1');
  };

  // 5. Prepare and format battleships (regex clean custom card tail-numbers)
  const cardRecoups = ownedCards.map((c) => {
    const template = CARDS_DB.find((t) => t.id === c.templateId);
    const shortName = getShortCardName(c.customName);
    const cleanName = shortName.replace(/\s(\d+)$/, ' ($1)');
    
    return {
      name: cleanName,
      subActive: !!c.signupBonusActive,
      bank: c.templateId === 'custom' ? (c.bank || 'Custom') : (template?.bank || 'Standard'),
    };
  });

  // 6. Rasterize SVG to PNG and trigger native camera roll download (CORS sandbox bypass!)
  const handleExportPoster = async () => {
    if (!svgRef.current) return;
    setIsGenerating(true);

    try {
      const svgElement = svgRef.current;
      
      // Preload GDrive or qrserver QR code as a Base64 Data URI to bypass browser SVG canvas sandbox block!
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64Qr = reader.result as string;
        
        // Safely select and temporarily swap the image href inside the active SVG tree
        const imgNode = svgElement.querySelector('image');
        const originalHref = imgNode?.getAttribute('href');
        if (imgNode && base64Qr) {
          imgNode.setAttribute('href', base64Qr);
        }
        
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        
        const image = new Image();
        image.src = blobURL;
        
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 760;  // 2x retina scale
          canvas.height = 1350;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(image, 0, 0, 760, 1350);
            const pngUrl = canvas.toDataURL('image/png');
            
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `Savings_Wrapped_${posterLang === 'zh' ? 'CN' : 'EN'}_${new Date().getFullYear()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
          }
          
          // Restore original external href to keep the live DOM cleanly connected
          if (imgNode && originalHref) {
            imgNode.setAttribute('href', originalHref);
          }
          
          URL.revokeObjectURL(blobURL);
          setIsGenerating(false);
        };
      };
    } catch (err) {
      console.error('Failed to rasterize poster:', err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto scrollbar-thin">
      <div className={`relative w-[380px] border rounded-2xl shadow-2xl animate-scale-up overflow-hidden max-h-[95vh] flex flex-col ${
        themeClass('bg-slate-955 border-slate-850 text-white', 'bg-slate-50 border-slate-250 text-slate-900')
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-dashed border-slate-800/30 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider">Your Churner Wrapped</h4>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg transition text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-4 flex flex-col items-center gap-4 scrollbar-thin">
          
          {/* Bilingual Toggle Tabs */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-xl border shrink-0 w-full max-w-[240px] mx-auto ${
            themeClass('bg-slate-950 border-slate-850/80', 'bg-slate-100 border-slate-200')
          }`}>
            <button
              onClick={() => setPosterLang('zh')}
              className={`flex-grow py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                posterLang === 'zh'
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm'
                  : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-555 hover:text-slate-800')
              }`}
            >
              <span>中文版 🇨🇳</span>
            </button>
            <button
              onClick={() => setPosterLang('en')}
              className={`flex-grow py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                posterLang === 'en'
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm'
                  : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-555 hover:text-slate-800')
              }`}
            >
              <span>English 🇺🇸</span>
            </button>
          </div>

          {/* Crisp Vector SVG Poster Container (9:16 proportion) */}
          <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none shrink-0 max-w-[320px] mx-auto bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
            <svg 
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 380 675" 
              className="w-full h-full"
            >
              {/* Definitions for Gradients and 3D Filters */}
              <defs>
                <linearGradient id="brushedGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c5a059" />
                  <stop offset="50%" stopColor="#fdf2d5" />
                  <stop offset="100%" stopColor="#9c7a3c" />
                </linearGradient>
                <linearGradient id="glassSheen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.03)" />
                </linearGradient>
                <linearGradient id="greenSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                
                {/* 3D Drop Shadow Filter */}
                <filter id="shadow3d" x="-10%" y="-10%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Deep Cyber Space Background */}
              <rect width="380" height="675" fill="#090d16" />
              <circle cx="80" cy="100" r="200" fill="#4f46e5" fillOpacity="0.15" filter="blur(60px)" />
              <circle cx="300" cy="500" r="200" fill="#a855f7" fillOpacity="0.12" filter="blur(70px)" />

              {/* Grid Matrix Overlays */}
              <g stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1">
                <line x1="0" y1="135" x2="380" y2="135" />
                <line x1="0" y1="270" x2="380" y2="270" />
                <line x1="0" y1="405" x2="380" y2="405" />
                <line x1="0" y1="540" x2="380" y2="540" />
              </g>

              {/* Localized Header */}
              <text 
                x="190" 
                y="42" 
                fill="url(#brushedGold)" 
                fontSize="9.5" 
                fontWeight="950" 
                letterSpacing="3.5" 
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {dict.header}
              </text>

              <text 
                x="190" 
                y="75" 
                fill="#ffffff" 
                fontSize="16.5" 
                fontWeight="950" 
                letterSpacing="2" 
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {dict.title1}
              </text>
              <text 
                x="190" 
                y="100" 
                fill="#ffffff" 
                fontSize="16.5" 
                fontWeight="950" 
                letterSpacing="2" 
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {dict.title2}
              </text>

              {/* 3D Floating Glassmorphic Dashboard Overlay */}
              <rect x="30" y="120" width="320" height="120" rx="16" fill="url(#glassSheen)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" filter="url(#shadow3d)" />
              
              <text x="190" y="150" fill="#cbd5e1" fontSize="7.5" fontWeight="900" letterSpacing="1.5" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
                {dict.subtitle}
              </text>
              
              {/* Courier Premium Monospaced Cash savings number */}
              <text x="190" y="215" fill="url(#brushedGold)" fontSize="46" fontWeight="950" textAnchor="middle" fontFamily="Courier, monospace">
                ${totalSavings}
              </text>

              {/* Real-time calculated Churner Level Badge */}
              <text x="40" y="270" fill="#94a3b8" fontSize="8" fontWeight="850" letterSpacing="0.5" fontFamily="Inter, system-ui, sans-serif">
                {dict.rankLabel}
              </text>
              <text x="340" y="270" fill={rankColor} fontSize="9" fontWeight="950" textAnchor="end" fontFamily="Inter, system-ui, sans-serif">
                {activeRank}
              </text>
              
              {/* 1. Viral relative comparison "Defeated 99.2%" rank statement */}
              <text x="190" y="288" fill="url(#brushedGold)" fontSize="7.5" fontWeight="950" textAnchor="middle" letterSpacing="0.5" fontFamily="Inter, system-ui, sans-serif">
                {activePercent}
              </text>
              
              {/* Supermarket invoice receipt ticket styled dashed vector divider */}
              <line x1="40" y1="298" x2="340" y2="298" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="4 3" />

              {/* Haul Details */}
              <text x="40" y="320" fill="url(#brushedGold)" fontSize="9.5" fontWeight="950" letterSpacing="1" fontFamily="Inter, system-ui, sans-serif">
                {dict.haulTitle}
              </text>

              {/* Row 1 */}
              <text x="40" y="342" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{dict.row1}</text>
              <text x="340" y="342" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="end" fontFamily="Courier, monospace">${resolvedValue}</text>

              {/* Row 2 */}
              <text x="40" y="367" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{dict.row2}</text>
              <text x="340" y="367" fill="url(#brushedGold)" fontSize="10" fontWeight="900" textAnchor="end" fontFamily="Courier, monospace">${securedSUBs}</text>

              {/* Row 3 */}
              <text x="40" y="392" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{dict.row3}</text>
              <text x="340" y="392" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="end" fontFamily="Courier, monospace">{ownedCards.length}</text>

              {/* dashed vector divider */}
              <line x1="40" y1="407" x2="340" y2="407" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="4 3" />

              {/* Battleships */}
              <text x="40" y="428" fill="url(#brushedGold)" fontSize="9.5" fontWeight="950" letterSpacing="1" fontFamily="Inter, system-ui, sans-serif">
                {dict.battleships}
              </text>

              {cardRecoups.slice(0, 3).map((c, idx) => {
                const yPos = 445 + idx * 34;
                return (
                  <g key={idx}>
                    <rect x="40" y={yPos} width="300" height="26" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    
                    {/* Clean formatted card name with parentheses e.g. Amex Platinum (1000) */}
                    <text x="52" y={yPos + 16} fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">
                      {c.name}
                    </text>
                    
                    {c.subActive ? (
                      // Gorgeous Glowing Green SUB Secured Capsule Badge!
                      <g>
                        <rect x="248" y={yPos + 5} width="82" height="16" rx="4" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth="0.75" />
                        <text x="289" y={yPos + 16} fill="#10b981" fontSize="7.5" fontWeight="950" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
                          {dict.subBadge}
                        </text>
                      </g>
                    ) : (
                      <text x="328" y={yPos + 16} fill="#a855f7" fontSize="8" fontWeight="900" textAnchor="end" fontFamily="Inter, system-ui, sans-serif">
                        {c.bank}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Advanced scanner barcode footer */}
              <g stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" opacity="0.7">
                <line x1="40" y1="585" x2="40" y2="610" strokeWidth="3" />
                <line x1="46" y1="585" x2="46" y2="610" strokeWidth="1" />
                <line x1="50" y1="585" x2="50" y2="610" strokeWidth="2" />
                <line x1="56" y1="585" x2="56" y2="610" strokeWidth="4" />
                <line x1="64" y1="585" x2="64" y2="610" strokeWidth="1" />
                <line x1="68" y1="585" x2="68" y2="610" strokeWidth="3" />
                <line x1="74" y1="585" x2="74" y2="610" strokeWidth="2" />
                <line x1="80" y1="585" x2="80" y2="610" strokeWidth="4" />
                <line x1="88" y1="585" x2="88" y2="610" strokeWidth="1" />
                <line x1="92" y1="585" x2="92" y2="610" strokeWidth="2" />
              </g>
              <text x="100" y="595" fill="#94a3b8" fontSize="6" fontWeight="900" letterSpacing="0.5" fontFamily="Inter, system-ui, sans-serif">SERIAL NO. CC2026575</text>
              <text x="100" y="605" fill="rgba(255, 255, 255, 0.5)" fontSize="6.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{dict.scannerLabel}</text>

              {/* Dynamic scannable QR Code pointing directly to the live website URL! */}
              <rect x="300" y="578" width="42" height="42" rx="6" fill="none" stroke="url(#brushedGold)" strokeWidth="1.5" strokeDasharray="16, 3" />
              <image 
                crossOrigin="anonymous"
                href={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`}
                x="303" 
                y="581" 
                width="36" 
                height="36" 
              />
            </svg>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-dashed border-slate-800/30 dark:border-white/5 shrink-0 flex flex-col sm:flex-row gap-2 bg-slate-955 dark:bg-slate-950/40">
          <button
            onClick={handleExportPoster}
            disabled={isGenerating}
            className="flex-grow bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/15 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save Poster to Camera Roll</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
