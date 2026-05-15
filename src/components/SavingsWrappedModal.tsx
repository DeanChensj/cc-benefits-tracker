/* eslint-disable react-hooks/set-state-in-effect */
import { useRef, useState, useEffect } from 'react';
import type { OwnedCardInstance } from '../store/useCardStore';
import { CARDS_DB, AWARD_TEMPLATES } from '../data/cards.db';
import type { LoyaltyAward } from '../data/cards.db';
import { Sparkles } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { ZenModal } from './ZenModal';

interface SavingsWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  resolvedValue: number;
  expiredValue: number;
  securedSUBs: number;
  themeClass: (dark: string, light: string) => string;
  theme: 'dark' | 'light';
}

export function SavingsWrappedModal({
  isOpen,
  onClose,
  ownedCards,
  loyaltyAwards,
  resolvedValue,
  expiredValue,
  securedSUBs,
  themeClass,
  theme
}: SavingsWrappedModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const [posterLang, setPosterLang] = useState<'en' | 'zh'>(language); 
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);


  // 1. Total Savings Sum (Resolved Value includes SUBs!)
  const totalSavings = resolvedValue;
  const perksRecouped = Math.round((resolvedValue - securedSUBs) * 100) / 100;

  // 2.5 Calculate dynamic, personalized cryptographic serial number
  const walletSizeStr = String(ownedCards.length).padStart(2, '0');
  const subValStr = String(securedSUBs).padStart(4, '0');
  const savingsValStr = String(Math.round(totalSavings)).padStart(4, '0');
  const personalSerial = `CC2026-${walletSizeStr}-${subValStr}-${savingsValStr}`;

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

  // 4. Localized Text dynamic translator for Poster Render
  const tPoster = (key: keyof typeof translations['en']) => translations[posterLang][key] || translations['en'][key];

  // 5. Prepare and format battleships (regex clean custom card tail-numbers)
  // Helper to dynamically nickname bulky card names for clean horizontal layouts inside the poster
  const getShortCardName = (name: string): string => {
    return name
      .replace(/American Express/gi, 'Amex')
      .replace(/Chase Sapphire/gi, 'Chase')
      .replace(/Capital One/gi, 'Cap1');
  };

  // 5. Prepare and format battleships (regex clean custom card tail-numbers)
  const cardRecoups = [
    ...ownedCards.map((c) => {
      const template = CARDS_DB.find((t) => t.id === c.templateId);
      const shortName = getShortCardName(c.customName);
      const cleanName = shortName.replace(/\s(\d+)$/, ' ($1)');
      
      return {
        name: cleanName,
        subActive: !!c.signupBonusActive,
        bank: c.templateId === 'custom' ? (c.bank || 'Custom') : (template?.bank || 'Standard'),
      };
    }),
    ...loyaltyAwards.map((award) => {
      const isCustom = award.templateId === 'custom';
      const info = isCustom ? {
        name: award.customName || 'Custom Award',
        brand: award.customBrand || 'Other'
      } : (AWARD_TEMPLATES[award.templateId] || {
        name: award.customName || 'Unknown Voucher',
        brand: 'Other'
      });

      const labelName = info.name;
      return {
        name: labelName.length > 22 ? `${labelName.substring(0, 20)}..` : labelName,
        subActive: false,
        bank: info.brand,
      };
    })
  ];

  // Helper to pre-render the SVG into a static PNG image in the background
  const updatePosterImage = async () => {
    if (!svgRef.current) return;
    try {
      const svgElement = svgRef.current;
      
      // Directly serialize the 100% local, CORS-free SVG XML to a same-origin Blob URL
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.src = blobURL;
      
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 760;  // 2x retina scale
          canvas.height = 1350;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(image, 0, 0, 760, 1350);
            canvas.toBlob((pngBlob) => {
              if (pngBlob) {
                if (posterDataUrl && posterDataUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(posterDataUrl);
                }
                const pngBlobUrl = URL.createObjectURL(pngBlob);
                setPosterDataUrl(pngBlobUrl);
              }
            }, 'image/png');
          }
        } catch (err) {
          console.warn('⚠️ Canvas pre-rendering blocked by browser sandbox:', err);
        } finally {
          URL.revokeObjectURL(blobURL);
        }
      };
    } catch (err) {
      console.error('Failed to pre-render poster image:', err);
    }
  };

  // Re-trigger pre-rendering in the background on modal open or language changes!
  useEffect(() => {
    if (isOpen) {
      // Immediately clear the old cached image so the live vector SVG flips to the new language instantly!
      setPosterDataUrl(null);
      
      // Trigger background PNG compilation with a fast 50ms micro-delay
      const timer = setTimeout(() => {
        updatePosterImage();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (posterDataUrl && posterDataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(posterDataUrl);
      }
      setPosterDataUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, posterLang, totalSavings]);

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      title={t('wrapped')}
      icon={<Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
      maxWidthClass="max-w-md"
    >

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
          <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none shrink-0 max-w-[280px] sm:max-w-[360px] mx-auto bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
            {posterDataUrl && (
              <img 
                src={posterDataUrl} 
                alt="Savings Wrapped Poster" 
                className="absolute inset-0 w-full h-full object-cover cursor-pointer pointer-events-auto z-20 animate-fade-in"
                style={{ WebkitTouchCallout: 'default' }}
              />
            )}
            <svg 
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 380 675" 
              className={`w-full h-full transition-opacity duration-350 ${posterDataUrl ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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
                
                {/* Elegant Neon Text Glow Filter */}
                <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Deep Cyber Space Background */}
              <rect width="380" height="675" fill="#090d16" />
              <circle cx="80" cy="100" r="200" fill="#4f46e5" fillOpacity="0.15" filter="blur(60px)" />
              <circle cx="300" cy="500" r="200" fill="#a855f7" fillOpacity="0.12" filter="blur(70px)" />

              {/* Grid Matrix Overlays (High-fidelity faint grid texture) */}
              <g stroke="rgba(255, 255, 255, 0.008)" strokeWidth="1">
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
                {tPoster('wrappedHeader')}
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
                {tPoster('wrappedTitle1')}
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
                {tPoster('wrappedTitle2')}
              </text>

              {/* 3D Floating Glassmorphic Dashboard Overlay */}
              <rect x="30" y="120" width="320" height="120" rx="16" fill="url(#glassSheen)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" filter="url(#shadow3d)" />
              
              <text x="190" y="150" fill="#cbd5e1" fontSize="7.5" fontWeight="900" letterSpacing="1.5" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
                {tPoster('wrappedSubtitle')}
              </text>
              
              {/* Courier Premium Monospaced Cash savings number (With luxury gold glow) */}
              <text x="190" y="215" fill="url(#brushedGold)" fontSize="46" fontWeight="950" textAnchor="middle" fontFamily="Courier, monospace" filter="url(#goldGlow)">
                ${totalSavings}
              </text>

              {/* Real-time calculated Churner Level Badge */}
              <text x="40" y="270" fill="#94a3b8" fontSize="8" fontWeight="850" letterSpacing="0.5" fontFamily="Inter, system-ui, sans-serif">
                {tPoster('wrappedRankLabel')}
              </text>
              
              {/* Premium VIP Rank Badge Pass Pill Container */}
              <g>
                <rect x="200" y="258" width="140" height="16" rx="8" fill="rgba(255, 255, 255, 0.03)" stroke={rankColor} strokeWidth="0.75" opacity="0.8" />
                <text x="270" y="269" fill={rankColor} fontSize="7.5" fontWeight="950" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
                  {activeRank}
                </text>
              </g>
              
              {/* 1. Viral relative comparison "Defeated 99.2%" rank statement */}
              <text x="190" y="288" fill="url(#brushedGold)" fontSize="7.5" fontWeight="950" textAnchor="middle" letterSpacing="0.5" fontFamily="Inter, system-ui, sans-serif">
                {activePercent}
              </text>
              
              {/* Supermarket invoice receipt ticket styled dashed vector divider */}
              <line x1="40" y1="298" x2="340" y2="298" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="4 3" />

              {/* Haul Details */}
              <text x="40" y="320" fill="url(#brushedGold)" fontSize="9.5" fontWeight="950" letterSpacing="1" fontFamily="Inter, system-ui, sans-serif">
                {tPoster('wrappedHaulTitle')}
              </text>

              {/* Row 1 */}
              <text x="40" y="342" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{tPoster('wrappedRow1')}</text>
              <text x="340" y="342" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="end" fontFamily="Courier, monospace">${perksRecouped}</text>

              {/* Row 2 */}
              <text x="40" y="367" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{tPoster('wrappedRow2')}</text>
              <text x="340" y="367" fill="url(#brushedGold)" fontSize="10" fontWeight="900" textAnchor="end" fontFamily="Courier, monospace">${securedSUBs}</text>

              {/* Row 3 */}
              <text x="40" y="392" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{tPoster('wrappedRow3')}</text>
              <text x="340" y="392" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="end" fontFamily="Courier, monospace">{ownedCards.length}</text>

              {/* Row 4 */}
              <text x="40" y="417" fill="#94a3b8" fontSize="8.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{tPoster('wrappedRow4')}</text>
              <text x="340" y="417" fill={expiredValue > 0 ? '#fb7185' : '#34d399'} fontSize={expiredValue > 0 ? '10' : '8'} fontWeight="900" textAnchor="end" fontFamily={expiredValue > 0 ? 'Courier, monospace' : 'Inter, system-ui, sans-serif'}>
                {expiredValue > 0 ? `-$${expiredValue}` : tPoster('wrappedPerfectWasted')}
              </text>

              {/* dashed vector divider */}
              <line x1="40" y1="432" x2="340" y2="432" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" strokeDasharray="4 3" />

              {/* Battleships */}
              <text x="40" y="452" fill="url(#brushedGold)" fontSize="9.5" fontWeight="950" letterSpacing="1" fontFamily="Inter, system-ui, sans-serif">
                {tPoster('wrappedBattleships')}
              </text>

              {cardRecoups.slice(0, 3).map((c, idx) => {
                const yPos = 466 + idx * 32;
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
                          {tPoster('wrappedSubBadge')}
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
                <line x1="40" y1="597" x2="40" y2="622" strokeWidth="3" />
                <line x1="46" y1="597" x2="46" y2="622" strokeWidth="1" />
                <line x1="50" y1="597" x2="50" y2="622" strokeWidth="2" />
                <line x1="56" y1="597" x2="56" y2="622" strokeWidth="4" />
                <line x1="64" y1="597" x2="64" y2="622" strokeWidth="1" />
                <line x1="68" y1="597" x2="68" y2="622" strokeWidth="3" />
                <line x1="74" y1="597" x2="74" y2="622" strokeWidth="2" />
                <line x1="80" y1="597" x2="80" y2="622" strokeWidth="4" />
                <line x1="88" y1="597" x2="88" y2="622" strokeWidth="1" />
                <line x1="92" y1="597" x2="92" y2="622" strokeWidth="2" />
              </g>
              <text x="100" y="607" fill="#94a3b8" fontSize="6.2" fontWeight="900" letterSpacing="0.5" fontFamily="Inter, system-ui, sans-serif">{"SERIAL NO. " + personalSerial}</text>
              <text x="100" y="617" fill="rgba(255, 255, 255, 0.5)" fontSize="6.5" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{tPoster('wrappedScannerLabel')}</text>

              {/* Luxury gold-brushed brand name text filling the bottom-left space perfectly! */}
              <text x="40" y="584" fill="url(#brushedGold)" fontSize="7.5" fontWeight="950" letterSpacing="1.5" fontFamily="Inter, system-ui, sans-serif">PERKFOLIO</text>

              {/* Dynamic scannable QR Code (100% CORS-free static inline Base64 PNG!) */}
              <rect x="290" y="580" width="52" height="52" rx="8" fill="none" stroke="url(#brushedGold)" strokeWidth="1.5" strokeDasharray="16, 3" />
              <image 
                crossOrigin="anonymous"
                shapeRendering="crispEdges"
                href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWAQMAAAAGz+OhAAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABGUlEQVRIib2VuxHDMAxD6XOhUiN4FC+Wi+zNPIpGcKnCF4Qg80/KiDw3eo1gUARFflSB1jbukqrIxEP7OzvpPXnDPvM0LSJDEMs48jYCPE0rsEYy1ZKwSDhTG9qnls7MvFecannvR1/mb02ZCmlv768ve1SbLl8D1ZGpliNTDrCketYvhmnPsYvOtLmuIIhJhhDPUCGUU1oIG/d5tCCxAPO3FsHoAahFfz0xxtCBid4r7G8dcO9vBGNo4CEE9DmIHS6nMjGa+xzBaL3nBm4rKYJ5MaJNCKrEMM9Ji8fBo7KFMN8LIrMuQdMyBDHfv9z7Bc95C2Objba1PZBx/zKsdMLWIGbeHyI2zeWlH33Z/a3pbHEpAIhhP+oK4mLkPA2/DKQAAAAASUVORK5CYII="
                x="293" 
                y="583" 
                width="46" 
                height="46" 
              />
            </svg>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 shrink-0 flex flex-col gap-2">
          {/* Premium, faded, glowing bilingual long-press saving advice note */}
          <p className={`text-[9.5px] text-center font-semibold tracking-wide animate-pulse py-1 ${themeClass('text-slate-400', 'text-slate-600')}`}>
            {posterLang === 'zh'
              ? '💡 贴心提示：长按上方海报图片即可直接保存至系统相册！'
              : '💡 Tip: Long-press the poster image above to save directly to your Photos!'}
          </p>
        </div>
    </ZenModal>
  );
}
