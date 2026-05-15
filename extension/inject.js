// inject.js
(function() {
  const data = localStorage.getItem('cc-benefits-tracker-storage');
  window.dispatchEvent(new CustomEvent('perkfolio-data-bridge', { detail: data }));
})();
