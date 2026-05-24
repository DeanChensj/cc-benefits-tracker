// =================================================================
// 💳 PerkFolio Assistant - Safe Context Content Script (MV3 Compliant)
// =================================================================

const DESIGN_SYSTEM = {
  layout: {
    bottom: '20px',
    right: '20px',
    zIndex: '999999999',
    padding: '12px 14px',
    borderRadius: '16px',
    blur: '20px',
    minWidth: '280px',
    maxWidth: '360px'
  },
  animation: {
    duration: '0.35s',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    entryDelayMs: 300,
    exitDelayMs: 350,
    scaleEntryStart: 'translateY(20px) scale3d(0.9, 0.9, 0.9)',
    scaleNormal: 'translateY(0) scale3d(1, 1, 1)',
    scaleHover: 'translateY(-2px) scale3d(1.01, 1.01, 1.01)',
    scaleExitEnd: 'translateY(15px) scale3d(0.92, 0.92, 0.92)'
  },
  themes: {
    dark: {
      bg: 'rgba(15, 23, 42, 0.75)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderHover: '1px solid rgba(167, 139, 250, 0.3)',
      text: '#f8fafc',
      descText: '#94a3b8',
      shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 8px rgba(167, 139, 250, 0.05)',
      shadowHover: '0 25px 30px -5px rgba(0, 0, 0, 0.6), 0 0 16px rgba(167, 139, 250, 0.15)',
      badgeBg: 'rgba(255, 255, 255, 0.06)',
      badgeBorder: '1px solid rgba(255, 255, 255, 0.06)',
      badgeText: '#a855f7',
    },
    light: {
      bg: 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      borderHover: '1px solid rgba(167, 139, 250, 0.25)',
      text: '#0f172a',
      descText: '#475569',
      shadow: '0 12px 24px -4px rgba(15, 23, 42, 0.04), 0 0 6px rgba(167, 139, 250, 0.05)',
      shadowHover: '0 16px 32px -4px rgba(15, 23, 42, 0.08), 0 0 12px rgba(167, 139, 250, 0.1)',
      badgeBg: 'rgba(15, 23, 42, 0.04)',
      badgeBorder: '1px solid rgba(15, 23, 42, 0.04)',
      badgeText: '#334155',
    }
  }
};

chrome.storage.local.get(['walletData'], (result) => {
  const walletData = result.walletData;
  if (!walletData) return;

  const hostname = window.location.hostname.toLowerCase();
  
  // Secure isolated tab-session lock filter (Anti-fingerprinting safeguard)
  const sessionKey = `perkfolio_notified_${hostname}`;
  chrome.storage.session.get([sessionKey], (sessionResult) => {
    if (sessionResult[sessionKey] === 'true') {
      return;
    }

    const ownedCards = walletData.state?.ownedCards || [];
    const theme = walletData.state?.theme || 'dark';
    
    let foundCard = null;
    let foundPerk = null;
    
    for (const card of ownedCards) {
      if (!card || typeof card !== 'object') continue;
      const benefits = [
        ...(Array.isArray(card.benefits) ? card.benefits : []),
        ...(Array.isArray(card.customBenefits) ? card.customBenefits : []),
        ...(Array.isArray(card.instanceOffers) ? card.instanceOffers : [])
      ];
      
      for (const perk of benefits) {
        if (!perk || typeof perk !== 'object') continue;
        const domains = Array.isArray(perk.matchedDomains) ? perk.matchedDomains : [];
        
        // Secure exact/subdomain matches to block DNS spoofing phishing attacks
        const match = domains.find(domain => {
          const clean = domain.toLowerCase().trim();
          return hostname === clean || hostname.endsWith('.' + clean);
        });
        
        if (match) {
          foundCard = card;
          foundPerk = perk;
          break;
        }
      }
      if (foundCard) break;
    }

    if (foundCard && foundPerk) {
      // Lock notification status for this tab session
      chrome.storage.session.set({ [sessionKey]: 'true' });
      
      const cardName = foundCard.customName || 'Credit Card';
      const perkText = foundPerk.description || foundPerk.name || 'Active Perk';
      showNotification(cardName, perkText, theme);
    }
  });
});

function showNotification(cardName, perkText, theme) {
  const isDark = theme === 'dark';
  const activeTheme = DESIGN_SYSTEM.themes[isDark ? 'dark' : 'light'];
  const anim = DESIGN_SYSTEM.animation;
  const lay = DESIGN_SYSTEM.layout;
  let isExiting = false; // Transition lock to block double-click navigation tab spam

  const container = document.createElement('div');
  container.id = 'perkfolio-remind-container';
  
  // Enforce layout inline styles with !important to avoid host site overrides
  container.style.setProperty('position', 'fixed', 'important');
  container.style.setProperty('bottom', lay.bottom, 'important');
  container.style.setProperty('right', lay.right, 'important');
  container.style.setProperty('z-index', lay.zIndex, 'important');
  container.style.setProperty('cursor', 'pointer', 'important');
  container.style.transition = `all ${anim.duration} ${anim.easing}`;
  container.style.opacity = '0';
  container.style.transform = anim.scaleEntryStart;
  
  const shadowRoot = container.attachShadow({ mode: 'closed' });
  
  const div = document.createElement('div');
  div.style.position = 'relative';
  div.style.padding = lay.padding;
  div.style.borderRadius = lay.borderRadius;
  div.style.backdropFilter = `blur(${lay.blur})`;
  div.style.webkitBackdropFilter = `blur(${lay.blur})`;
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '6px';
  div.style.minWidth = lay.minWidth;
  div.style.maxWidth = lay.maxWidth;
  div.style.boxSizing = 'border-box';
  div.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  div.style.transition = `all ${anim.duration} ${anim.easing}`;

  div.style.backgroundColor = activeTheme.bg;
  div.style.color = activeTheme.text;
  div.style.border = activeTheme.border;
  div.style.boxShadow = activeTheme.shadow;

  // 🛡️ Safe DOM Construction (Zero-innerHTML CWS Compliant Implementation)
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '6px';
  header.style.justifyContent = 'space-between';
  header.style.paddingRight = '18px';

  const badge = document.createElement('span');
  badge.style.backgroundColor = activeTheme.badgeBg;
  badge.style.color = activeTheme.badgeText;
  badge.style.border = activeTheme.badgeBorder;
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = '6px';
  badge.style.fontSize = '9.5px';
  badge.style.fontWeight = '850';
  badge.style.textTransform = 'uppercase';
  badge.style.letterSpacing = '0.8px';
  badge.style.lineHeight = 'normal';
  badge.style.display = 'inline-block';
  badge.style.maxWidth = '160px';
  badge.style.overflow = 'hidden';
  badge.style.textOverflow = 'ellipsis';
  badge.style.whiteSpace = 'nowrap';
  badge.textContent = `💳 ${cardName}`;

  const branding = document.createElement('span');
  branding.style.fontSize = '9px';
  branding.style.color = activeTheme.descText;
  branding.style.opacity = '0.8';
  branding.style.fontWeight = 'bold';
  branding.style.letterSpacing = '0.5px';
  branding.style.userSelect = 'none';
  branding.textContent = 'PerkFolio';

  header.appendChild(badge);
  header.appendChild(branding);

  const body = document.createElement('div');
  body.style.fontSize = '11px';
  body.style.color = activeTheme.descText;
  body.style.fontWeight = '600';
  body.style.lineHeight = '1.4';
  body.style.marginTop = '2px';
  body.style.textAlign = 'left';
  body.textContent = `💡 ${perkText}`;

  const closeBtn = document.createElement('button');
  closeBtn.id = 'perkfolio-close-btn';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '8px';
  closeBtn.style.right = '10px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = activeTheme.descText;
  closeBtn.style.opacity = '0.35'; // Permanently visible at lower opacity to prevent accidental clicks
  closeBtn.style.fontSize = '12px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.padding = '4px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.transition = 'all 0.2s ease';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.lineHeight = '1';
  closeBtn.style.outline = 'none';
  closeBtn.textContent = '✕';

  div.appendChild(header);
  div.appendChild(body);
  div.appendChild(closeBtn);

  // Hover animations (scales slightly and brightens close button)
  container.addEventListener('mouseenter', () => {
    container.style.transform = anim.scaleHover;
    closeBtn.style.opacity = '0.75';
    div.style.border = activeTheme.borderHover;
    div.style.boxShadow = activeTheme.shadowHover;
  });
  
  container.addEventListener('mouseleave', () => {
    container.style.transform = anim.scaleNormal;
    closeBtn.style.opacity = '0.35';
    div.style.border = activeTheme.border;
    div.style.boxShadow = activeTheme.shadow;
  });

  closeBtn.addEventListener('mouseenter', (e) => {
    e.stopPropagation();
    closeBtn.style.opacity = '1.0';
  });
  closeBtn.addEventListener('mouseleave', (e) => {
    e.stopPropagation();
    closeBtn.style.opacity = '0.75';
  });
  
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Block redirection click
    if (isExiting) return;
    isExiting = true;
    
    container.style.transform = anim.scaleExitEnd;
    container.style.opacity = '0';
    setTimeout(() => {
      container.remove();
    }, anim.exitDelayMs);
  });

  // Click redirection back to the central dashboard PWA
  container.addEventListener('click', () => {
    if (isExiting) return;
    isExiting = true;
    window.open('https://perkfolio.cc', '_blank');
    
    container.style.transform = anim.scaleExitEnd;
    container.style.opacity = '0';
    setTimeout(() => {
      container.remove();
    }, anim.exitDelayMs);
  });
  
  shadowRoot.appendChild(div);
  document.body.appendChild(container);

  // Mount entrance animation
  setTimeout(() => {
    container.style.opacity = '1';
    container.style.transform = anim.scaleNormal;
  }, anim.entryDelayMs);
}
