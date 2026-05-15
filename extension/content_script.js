// content_script.js

chrome.storage.local.get(['walletData'], (result) => {
  const walletData = result.walletData;
  if (!walletData) return;

  const hostname = window.location.hostname;
  // Get user's owned cards from synced state
  const ownedCards = walletData.state?.ownedCards || [];
  let foundPerk = null;
  
  // Loop through owned cards and their benefits to find a match
  for (const card of ownedCards) {
    const benefits = card.benefits || [];
    for (const perk of benefits) {
      const domains = perk.matchedDomains || [];
      const match = domains.find(domain => hostname.includes(domain));
      if (match) {
        foundPerk = perk;
        break;
      }
    }
    if (foundPerk) break;
  }

  if (foundPerk) {
    // Show notification with the perk description
    const text = foundPerk.description || foundPerk.name;
    showNotification(text);
  }
});

function showNotification(text) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  
  const shadowRoot = container.attachShadow({ mode: 'closed' });
  
  const div = document.createElement('div');
  div.style.backgroundColor = 'rgba(30, 41, 59, 0.85)';
  div.style.color = 'white';
  div.style.padding = '12px 16px';
  div.style.borderRadius = '12px';
  div.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
  div.style.backdropFilter = 'blur(10px)';
  div.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  div.style.fontSize = '12px';
  div.style.fontWeight = 'bold';
  div.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  div.innerHTML = `💡 ${text}`;
  
  shadowRoot.appendChild(div);
  document.body.appendChild(container);
}
