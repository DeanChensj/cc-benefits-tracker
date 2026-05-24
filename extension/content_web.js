// content_web.js

// Listen for data from the main world via secure window.postMessage
window.addEventListener('message', (e) => {
  // Only accept messages from our own window
  if (e.source !== window) return;
  
  // Verify safety origins
  const ALLOWED_ORIGINS = ['https://perkfolio.cc', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  if (!ALLOWED_ORIGINS.includes(e.origin)) return;

  if (e.data && e.data.type === 'PERKFOLIO_DATA_BRIDGE') {
    const data = e.data.detail;
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        // Schema validation to prevent downstream TypeError crashes
        if (parsedData && typeof parsedData === 'object' && parsedData.state && typeof parsedData.state === 'object') {
          const state = parsedData.state;
          if (Array.isArray(state.ownedCards)) {
            // Sanitize structure: filter out non-object elements
            state.ownedCards = state.ownedCards.filter(card => card && typeof card === 'object');
            chrome.storage.local.set({ walletData: parsedData });
          }
        }
      } catch (err) {
        console.error('Failed to parse wallet data:', err);
      }
    }
  }
});

// Listen for webpage mount ready event to trigger handshake pull request
window.addEventListener('perkfolio-ready', () => {
  window.dispatchEvent(new CustomEvent('perkfolio-pull-request'));
});

// Passive backup trigger immediately on load (in case page was already mounted)
window.dispatchEvent(new CustomEvent('perkfolio-pull-request'));
