// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SYNC_DATA') {
    chrome.storage.local.set({ walletData: request.data }, () => {
      console.log('Data synced from web app');
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'GET_DATA') {
    chrome.storage.local.get(['walletData'], (result) => {
      sendResponse({ data: result.walletData });
    });
    return true;
  }
});
