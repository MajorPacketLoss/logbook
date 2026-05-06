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
        <input type="number" id="cra-rate" value="${craRate}" step="0.01" style="width:80px;text-align:center"
          onchange="saveCraRate(this.value)" />
      </div>
    </div>

    <div class="settings-section">
      <h2>Data Transfer</h2>
      <p class="setting-sub" style="margin-bottom:12px">Export a backup file and import it on another device to transfer all your data.</p>
      <button class="btn btn-secondary btn-full" onclick="exportAllDataJSON()">&#128190; Export Backup (JSON)</button>
      <div style="margin-top:10px">
        <label class="setting-label" style="display:block;margin-bottom:6px">&#128268; Import Backup (JSON)</label>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importAllDataJSON(this)" />
        <button class="btn btn-secondary btn-full" onclick="document.getElementById('import-file').click()">Choose Backup File&hellip;</button>
      </div>
    </div>

    <div class="settings-section">
      <h2>Data</h2>
      <button class="btn btn-secondary btn-full" onclick="navigate('export')">Export Data (CSV)</button>
      <div class="setting-row" style="margin-top:10px">
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
        <span class="setting-label">Logbook</span>
        <span id="version-display">v${APP_VERSION}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Storage</span>
        <span>Local (IndexedDB)</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Update</span>
        <button class="btn btn-secondary btn-sm" onclick="checkForUpdate()">Check for Update</button>
      </div>
      <div id="update-status" style="margin-top:8px;font-size:13px;color:#888"></div>
    </div>

    <div class="settings-section">
      <h2>What's New in v2.0</h2>
      <ul style="padding-left:18px;color:#aaa;font-size:14px;line-height:1.8">
        <li>GPS trip tracker with Haversine distance calculation</li>
        <li>Maintenance log with next service countdown</li>
        <li>General expenses tracking</li>
        <li>CRA deduction comparison (best method highlighted)</li>
        <li>Data backup &amp; restore (JSON import/export)</li>
        <li>iOS home bar theme tinting</li>
        <li>No zoom on text inputs</li>
      </ul>
    </div>
  `;

  renderVehicles();
}

function toggleDark(val) {
  setSetting('darkMode', val);
  document.body.classList.toggle('dark', val);
  document.body.classList.toggle('light', !val);
}

function saveCraRate(val) {
  const n = parseFloat(val);
  if (!isNaN(n) && n > 0) setSetting('craRate', n);
}

// ---- Version Check ----
async function checkForUpdate() {
  const statusEl = document.getElementById('update-status');
  if (statusEl) statusEl.textContent = 'Checking...';
  try {
    // Fetch the live settings.js with cache-busting to read the deployed APP_VERSION
    const r = await fetch('/logbook/pages/settings.js?_=' + Date.now(), { cache: 'no-store' });
    const text = await r.text();
    const match = text.match(/APP_VERSION\s*=\s*'([^']+)'/);
    if (match) {
      const latestVersion = match[1];
      const versionEl = document.getElementById('version-display');
      if (latestVersion === APP_VERSION) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#4caf50">&#10003; You are on the latest version (v' + APP_VERSION + ')</span>';
      } else {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff9800">Update available: v' + latestVersion + '!</span> <button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="triggerUpdate()">Update Now</button>';
        if (versionEl) versionEl.textContent = 'v' + APP_VERSION + ' (v' + latestVersion + ' available)';
      }
    } else {
      if (statusEl) statusEl.textContent = 'Could not determine version.';
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = 'Check failed - are you offline?';
  }
}

function triggerUpdate() {
  const statusEl = document.getElementById('update-status');
  if (statusEl) statusEl.textContent = 'Clearing cache and reloading...';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
      window.location.reload(true);
    });
  } else {
    window.location.reload(true);
  }
}

// ---- JSON Backup Export ----
async function exportAllDataJSON() {
  try {
    const vehicles = await getAllVehicles();
    const db = await getDB();
    const trips = await db.getAll('trips');
    const fuel = await db.getAll('fuel');
    const maintenance = await db.getAll('maintenance');
    const expenses = await db.getAll('expenses');
    const settings = {
      darkMode: getSetting('darkMode', true),
      craRate: getSetting('craRate', 0.73)
    };
    const backup = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      vehicles, trips, fuel, maintenance, expenses, settings
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logbook-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) {
    alert('Export failed: ' + e.message);
  }
}

// ---- JSON Backup Import ----
async function importAllDataJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.vehicles || !backup.trips) {
        alert('Invalid backup file.');
        return;
      }
      const confirmed = confirm(
        `Import backup from ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString() : 'unknown date'}?\n\n` +
        `This will ADD ${backup.vehicles.length} vehicles, ${backup.trips.length} trips, ` +
        `${backup.fuel.length} fuel entries, ${(backup.maintenance||[]).length} service records, ` +
        `and ${(backup.expenses||[]).length} expenses to your existing data.\n\n` +
        `Your current data will NOT be deleted.`
      );
      if (!confirmed) return;

      const db = await getDB();

      // Import vehicles (skip duplicates by plate)
      const existingVehicles = await getAllVehicles();
      const existingPlates = existingVehicles.map(v => v.plate).filter(Boolean);
      let vehicleIdMap = {}; // old id -> new id
      for (const v of backup.vehicles) {
        const oldId = v.id;
        if (existingPlates.includes(v.plate)) {
          // Find the existing vehicle with that plate
          const existing = existingVehicles.find(ev => ev.plate === v.plate);
          if (existing) vehicleIdMap[oldId] = existing.id;
          continue;
        }
        const newId = await db.add('vehicles', { ...v, id: undefined, active: false });
        vehicleIdMap[oldId] = newId;
      }

      // Helper to remap vehicleId
      const remap = (record) => ({
        ...record,
        id: undefined,
        vehicleId: vehicleIdMap[record.vehicleId] || record.vehicleId
      });

      for (const t of backup.trips) await db.add('trips', remap(t));
      for (const f of backup.fuel) await db.add('fuel', remap(f));
      for (const m of (backup.maintenance || [])) await db.add('maintenance', remap(m));
      for (const ex of (backup.expenses || [])) await db.add('expenses', remap(ex));

      // Restore settings if missing
      if (backup.settings) {
        if (getSetting('craRate', null) === null) setSetting('craRate', backup.settings.craRate);
      }

      alert(`Import complete!\n${backup.trips.length} trips and ${backup.fuel.length} fuel entries added.`);
      renderSettings();
    } catch(err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset so same file can be re-imported
  input.value = '';
}

function confirmClearAll() {
  const html = `
    <div class="modal-title">Clear All Data?</div>
    <p class="text-muted">This will permanently delete ALL vehicles, trips, fuel records, maintenance, and expenses. This cannot be undone.</p>
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
  }
});
