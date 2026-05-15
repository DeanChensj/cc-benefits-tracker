// content_web.js

// Function to inject script into main world to read localStorage
function triggerMainWorldSync() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Listen for data from the main world
window.addEventListener('perkfolio-data-bridge', (e) => {
  const data = e.detail;
  
  if (data) {
    try {
      const parsedData = JSON.parse(data);
      chrome.storage.local.set({ walletData: parsedData });
    } catch (err) {
      console.error('Failed to parse wallet data:', err);
    }
  }
});

// 1. Trigger sync immediately on load
triggerMainWorldSync();

// 2. Listen for update events from the website
window.addEventListener('perkfolio-sync', () => {
  triggerMainWorldSync();
});
