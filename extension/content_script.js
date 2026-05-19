// content_script.js

// =================================================================
// 🎨 PerkFolio Assistant Design System Tokens & Animation Config
// =================================================================
const DESIGN_SYSTEM = {
  layout: {
    bottom: '24px',
    right: '24px',
    zIndex: '99999999',
    padding: '12px 16px',
    borderRadius: '16px',
    minWidth: '260px',
    maxWidth: '320px',
    blur: '12px',
  },
  animation: {
    duration: '0.35s',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    entryDelayMs: 100,
    exitDelayMs: 350,
    scaleHover: 'scale3d(1.015, 1.015, 1.015) translateY(-2px)',
    scaleActive: 'scale3d(0.98, 0.98, 1)',
    scaleNormal: 'scale3d(1, 1, 1) translateY(0)',
    scaleEntryStart: 'translateY(15px) scale3d(0.95, 0.95, 0.95)',
    scaleExitEnd: 'translateY(20px) scale3d(0.9, 0.9, 0.9)',
  },
  themes: {
    dark: {
      bg: 'rgba(27, 28, 37, 0.92)',
      text: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderHover: '1px solid rgba(167, 139, 250, 0.35)',
      shadow: '0 12px 24px -4px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.3)',
      shadowHover: '0 16px 32px -4px rgba(0, 0, 0, 0.45), 0 0 12px rgba(167, 139, 250, 0.15)',
      badgeBg: 'rgba(255, 255, 255, 0.06)',
      badgeBorder: '1px solid rgba(255, 255, 255, 0.06)',
      badgeText: '#cbd5e1',
      descText: '#94a3b8',
    },
    light: {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#0f172a',
      border: '1px solid rgba(15, 23, 42, 0.06)',
      borderHover: '1px solid rgba(167, 139, 250, 0.35)',
      shadow: '0 12px 24px -4px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
      shadowHover: '0 16px 32px -4px rgba(15, 23, 42, 0.08), 0 0 12px rgba(167, 139, 250, 0.1)',
      badgeBg: 'rgba(15, 23, 42, 0.04)',
      badgeBorder: '1px solid rgba(15, 23, 42, 0.04)',
      badgeText: '#334155',
      descText: '#475569',
    }
  }
};

chrome.storage.local.get(['walletData'], (result) => {
  const walletData = result.walletData;
  if (!walletData) return;

  const hostname = window.location.hostname;
  
  // Anti-Annoyance Session Filter: Avoid showing popup repeatedly on reloads in same tab session!
  const sessionKey = `perkfolio_notified_${hostname}`;
  if (sessionStorage.getItem(sessionKey) === 'true') {
    return;
  }

  const ownedCards = walletData.state?.ownedCards || [];
  const theme = walletData.state?.theme || 'dark';
  
  let foundCard = null;
  let foundPerk = null;
  
  // Loop through owned cards and their benefits to find a match
  for (const card of ownedCards) {
    const benefits = [...(card.benefits || []), ...(card.customBenefits || []), ...(card.instanceOffers || [])];
    for (const perk of benefits) {
      const domains = perk.matchedDomains || [];
      const match = domains.find(domain => hostname.includes(domain));
      if (match) {
        foundCard = card;
        foundPerk = perk;
        break;
      }
    }
    if (foundCard) break;
  }

  if (foundCard && foundPerk) {
    // Lock reminder status for this session tab to prevent repeated alerts
    sessionStorage.setItem(sessionKey, 'true');
    
    const cardName = foundCard.customName;
    const perkText = foundPerk.description || foundPerk.name;
    showNotification(cardName, perkText, theme);
  }
});

function showNotification(cardName, perkText, theme) {
  const isDark = theme === 'dark';
  const activeTheme = DESIGN_SYSTEM.themes[isDark ? 'dark' : 'light'];
  const anim = DESIGN_SYSTEM.animation;
  const lay = DESIGN_SYSTEM.layout;

  const container = document.createElement('div');
  container.id = 'perkfolio-remind-container';
  container.style.position = 'fixed';
  container.style.bottom = lay.bottom;
  container.style.right = lay.right;
  container.style.zIndex = lay.zIndex;
  container.style.cursor = 'pointer';
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

  div.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; justify-content: space-between; padding-right: 18px;">
      <span style="background-color: ${activeTheme.badgeBg}; color: ${activeTheme.badgeText}; border: ${activeTheme.badgeBorder}; padding: 2px 8px; border-radius: 6px; font-size: 9.5px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.8px; line-height: normal; display: inline-block; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        💳 ${cardName}
      </span>
      <span style="font-size: 9px; color: ${activeTheme.descText}; opacity: 0.8; font-weight: bold; letter-spacing: 0.5px; select-none: none;">PerkFolio</span>
    </div>
    <div style="font-size: 11px; color: ${activeTheme.descText}; font-weight: 600; line-height: 1.4; margin-top: 2px; text-align: left;">
      💡 ${perkText}
    </div>
    <button id="perkfolio-close-btn" style="position: absolute; top: 8px; right: 10px; background: none; border: none; color: ${activeTheme.descText}; opacity: 0; font-size: 12px; font-weight: bold; padding: 4px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; line-height: 1; outline: none;">
      ✕
    </button>
  `;

  const closeBtn = div.querySelector('#perkfolio-close-btn');

  // Hover animations (reveals close button and scales slightly)
  container.addEventListener('mouseenter', () => {
    container.style.transform = anim.scaleHover;
    if (closeBtn) closeBtn.style.opacity = '0.65';
    div.style.border = activeTheme.borderHover;
    div.style.boxShadow = activeTheme.shadowHover;
  });
  
  container.addEventListener('mouseleave', () => {
    container.style.transform = anim.scaleNormal;
    if (closeBtn) closeBtn.style.opacity = '0';
    div.style.border = activeTheme.border;
    div.style.boxShadow = activeTheme.shadow;
  });

  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      closeBtn.style.opacity = '1.0';
    });
    closeBtn.addEventListener('mouseleave', (e) => {
      e.stopPropagation();
      closeBtn.style.opacity = '0.65';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Block page click redirection
      
      // Tactile smooth exit animation
      container.style.transform = anim.scaleExitEnd;
      container.style.opacity = '0';
      setTimeout(() => {
        container.remove();
      }, anim.exitDelayMs);
    });
  }
  
  // Clicking the notification card redirects back to the dashboard
  container.addEventListener('click', () => {
    window.open('https://perkfolio.cc', '_blank');
    
    // Slide down & fade out immediately upon click redirection
    container.style.transform = anim.scaleExitEnd;
    container.style.opacity = '0';
    setTimeout(() => {
      container.remove();
    }, anim.exitDelayMs);
  });
  
  shadowRoot.appendChild(div);
  document.body.appendChild(container);

  // Entry slide-in animation on mount
  setTimeout(() => {
    container.style.opacity = '1';
    container.style.transform = anim.scaleNormal;
  }, anim.entryDelayMs);
}
