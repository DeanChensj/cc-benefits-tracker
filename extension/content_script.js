// content_script.js
chrome.runtime.sendMessage({ type: 'GET_DATA' }, (response) => {
  const walletData = response?.data;
  if (!walletData) return;

  const hostname = window.location.hostname;
  const language = walletData.state?.language || 'en';
  
  // Centralized messages to follow DRY principle
  const messages = {
    uber: {
      en: "Don't forget to use your monthly Uber Cash on Amex Gold/Plat!",
      zh: "Amex Gold/Plat 每月送的 Uber Cash 别忘了用！"
    },
    doordash: {
      en: "You have DashPass from Chase, remember to enjoy free delivery!",
      zh: "你有 Chase 送的 DashPass 会员，记得享受免运费！"
    },
    grubhub: {
      en: "Don't forget your monthly $10 dining credit on Amex Gold!",
      zh: "Amex Gold 每月 $10 餐饮报销，记得点餐！"
    },
    saks: {
      en: "Don't forget your semi-annual $50 Saks credit on Amex Plat!",
      zh: "Amex Platinum 每半年 $50 的 Saks 报销，快看看买点啥！"
    }
  };

  // Domain to Perk Mapping (MVP Example)
  const mapping = {
    'uber.com': messages.uber,
    'ubereats.com': messages.uber,
    'doordash.com': messages.doordash,
    'grubhub.com': messages.grubhub,
    'saksfifthavenue.com': messages.saks
  };

  const match = Object.keys(mapping).find(domain => hostname.includes(domain));
  if (match) {
    const textObj = mapping[match];
    const text = textObj[language] || textObj['en'];
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
