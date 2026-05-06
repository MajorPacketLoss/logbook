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
  settings: renderSettings
};

let currentPage = 'dashboard';

function navigate(page, params = {}) {
  currentPage = page;
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

function getYears() {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3];
}

async function init() {
  const dark = getSetting('darkMode', true);
  document.body.className = dark ? 'dark' : 'light';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/logbook/sw.js').catch(() => {});
  }
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
