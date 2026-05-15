// content_web.js
const data = localStorage.getItem('cc-tracker-storage');
if (data) {
  try {
    const parsedData = JSON.parse(data);
    chrome.runtime.sendMessage({ type: 'SYNC_DATA', data: parsedData }, (response) => {
      console.log('Sync response:', response);
    });
  } catch (err) {
    console.error('Failed to parse wallet data from localStorage:', err);
  }
}
