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

function refreshLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function navigate(page, params = {}) {
  currentPage = page;
  window._currentPage = page; // used by vehicles.js context-aware refresh
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  const content = document.getElementById('page-content');
  content.scrollTop = 0;
  if (pages[page]) {
    Promise.resolve(pages[page](params)).finally(refreshLucideIcons);
  } else {
    refreshLucideIcons();
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
  refreshLucideIcons();
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

(function initTheme() {
  const root = document.documentElement;
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  function applyTheme(nextTheme) {
    theme = nextTheme;
    root.setAttribute('data-theme', theme);
  }

  function updateToggleIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';
    refreshLucideIcons();
  }

  function toggleTheme() {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
    updateToggleIcon();
  }

  window.toggleTheme = toggleTheme;
  window.getCurrentTheme = () => theme;

  applyTheme(theme);
  window.addEventListener('load', updateToggleIcon);
})();

window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 400);
  }, 800);
  refreshLucideIcons();
});

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
