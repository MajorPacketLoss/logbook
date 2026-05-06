// pages/settings.js
const APP_VERSION = '2.0.0';

async function renderSettings() {
  const el = document.getElementById('page-content');
  const dark = getSetting('darkMode', true);
  const craRate = getSetting('craRate', 0.73);

  el.innerHTML = `
    <div class="page-header"><h1>Settings</h1></div>

    <div id="vehicles-container"></div>

    <div class="settings-section">
      <h2>Appearance</h2>
      <div class="setting-row">
        <div>
          <div class="setting-label">Dark Mode</div>
          <div class="setting-sub">Toggle light/dark theme</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="dark-toggle" ${dark ? 'checked' : ''} onchange="toggleDark(this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h2>CRA Settings</h2>
      <div class="setting-row">
        <div>
          <div class="setting-label">Per-KM Rate ($/km)</div>
          <div class="setting-sub">2026 rate: $0.73 first 5000 km</div>
        </div>
        <input type="number" id="cra-rate" value="${craRate}" step="0.01" style="width:80px;text-align:center" onchange="saveCraRate(this.value)" />
      </div>
    </div>

    <div class="settings-section">
      <h2>Data</h2>
      <button class="btn btn-secondary btn-full" onclick="navigate('export')">Export Data (CSV)</button>
      <div class="setting-row" style="margin-top:12px">
        <div>
          <div class="setting-label" style="color:#cc4444">Clear All Data</div>
          <div class="setting-sub">Permanently delete all trips, fuel, and vehicles</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="confirmClearAll()">Clear</button>
      </div>
    </div>

    <div class="settings-section">
      <h2>About</h2>
      <div class="setting-row">
        <div class="setting-label">Logbook</div>
        <span class="pill" style="background:#7b68ee33;color:#7b68ee;">v${APP_VERSION}</span>
      </div>
      <div class="setting-row">
        <div class="setting-label">What's New in v2</div>
        <span class="text-muted" style="font-size:12px;">GPS tracking, maintenance log, expenses</span>
      </div>
      <div class="setting-row">
        <div class="setting-label">Storage</div>
        <span class="pill" style="background:#2a2a4a;color:#aaa;">Local (IndexedDB)</span>
      </div>
      <div class="setting-row">
        <div class="setting-label">Data Privacy</div>
        <span class="text-muted" style="font-size:12px;">Stored only on this device</span>
      </div>
    </div>
  `;

  await renderVehicles(document.getElementById('vehicles-container'));
}

function toggleDark(on) {
  setSetting('darkMode', on);
  document.body.className = on ? 'dark' : 'light';
}

function saveCraRate(val) {
  const n = parseFloat(val);
  if (!isNaN(n) && n > 0) setSetting('craRate', n);
}

function confirmClearAll() {
  const html = `
    <div class="modal-title">Clear All Data?</div>
    <p class="text-muted">This will permanently delete ALL vehicles, trips, fuel records, maintenance, and expenses. This cannot be undone. Consider exporting first.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doClearAll()">Delete Everything</button>
    </div>
  `;
  showModal(html);
}

async function doClearAll() {
  await clearAllData();
  closeModal();
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof pages !== 'undefined') {
    pages['export'] = renderExportPage;
    pages['logTrip'] = renderLogTrip;
    pages['logFuel'] = renderLogFuel;
  }
});
