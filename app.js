// app.js - Router, nav, and app init (V2)
const pages = {
  dashboard: renderDashboard,
  trips: renderTripHistory,
  fuel: renderFuelHistory,
  logTrip: renderLogTrip,
  logFuel: renderLogFuel,
  summary: renderSummary,
  maintenance: renderMaintenance,
  expenses: renderExpenses,
  export: renderExportPage,
  settings: renderSettings
};

let currentPage = 'dashboard';

function navigate(page, params = {}) {
  currentPage = page;
  window._currentPage = page; // used by vehicles.js context-aware refresh
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  const content = document.getElementById('page-content');
  content.scrollTop = 0;
  if (pages[page]) {
    pages[page](params);
  }
}

function showModal(html, onReady) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal">' + html + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  if (onReady) onReady(overlay.querySelector('.modal'));
  return overlay;
}

function closeModal() {
  const m = document.querySelector('.modal-overlay');
  if (m) m.remove();
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(n) {
  return '$' + Number(n).toFixed(2);
}

function getSetting(key, defaultVal) {
  try {
    const v = localStorage.getItem('logbook_' + key);
    if (v === null) return defaultVal;
    return JSON.parse(v);
  } catch(e) { return defaultVal; }
}

function setSetting(key, val) {
  localStorage.setItem('logbook_' + key, JSON.stringify(val));
}

// Apply saved theme on load
(function applyTheme() {
  const dark = getSetting('darkMode', true);
  document.body.classList.toggle('dark', dark);
  document.body.classList.toggle('light', !dark);
})();

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/logbook/sw.js').catch(e => console.warn('SW registration failed', e));
  });
}

// Bottom nav click handlers
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// Init
navigate('dashboard');
