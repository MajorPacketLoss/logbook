// pages/settings.js
const APP_VERSION = '1.0.0';
const NUM_SAVE_SLOTS = 3;

// ---- Save Slot helpers ----
function getSaveSlotKey(slot) { return 'logbook_save_slot_' + slot; }
function getSaveSlotMeta(slot) {
  try { return JSON.parse(localStorage.getItem(getSaveSlotKey(slot) + '_meta') || 'null'); } catch(e) { return null; }
}
function setSaveSlotMeta(slot, meta) {
  localStorage.setItem(getSaveSlotKey(slot) + '_meta', JSON.stringify(meta));
}

async function renderSettings() {
  const el = document.getElementById('page-content');
  const dark = getSetting('darkMode', true);
  const craRate = getSetting('craRate', 0.73);

  // Build save slot HTML
  const slotsHtml = Array.from({ length: NUM_SAVE_SLOTS }, (_, i) => {
    const meta = getSaveSlotMeta(i + 1);
    const label = meta ? `Slot ${i + 1}: ${meta.name || 'Unnamed'} &mdash; <small>${meta.savedAt || ''}</small>` : `Slot ${i + 1}: <em>Empty</em>`;
    return `
      <div class="save-slot-row">
        <div class="save-slot-label">${label}</div>
        <div class="save-slot-actions">
          <button class="btn btn-secondary btn-sm" onclick="saveSaveSlot(${i + 1})">&#128190; Save</button>
          ${meta ? `<button class="btn btn-secondary btn-sm" onclick="loadSaveSlot(${i + 1})">&#9654; Load</button>` : ''}
          ${meta ? `<button class="btn btn-danger btn-sm" onclick="deleteSaveSlot(${i + 1})">&#128465;</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

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
          <div class="setting-label">Per-KM Rate (&#36;/km)</div>
          <div class="setting-sub">2026 CRA rate: &#36;0.73 first 5,000 km &bull; &#36;0.67 after</div>
        </div>
        <input type="number" id="cra-rate" value="${craRate}" step="0.01" style="width:80px;text-align:center"
          onchange="saveCraRate(this.value)" />
      </div>
    </div>

    <div class="settings-section">
      <h2>&#127918; Save Slots</h2>
      <p class="setting-sub" style="margin-bottom:12px">Save and restore complete snapshots of all your data. Useful for testing or keeping backups on-device.</p>
      ${slotsHtml}
      <div style="margin-top:12px">
        <button class="btn btn-secondary btn-full" onclick="loadTestData()">&#129514; Load Test Data</button>
      </div>
    </div>

    <div class="settings-section">
      <h2>Data Transfer</h2>
      <p class="setting-sub" style="margin-bottom:12px">Export a JSON backup and import it on another device to transfer all your data.</p>
      <button class="btn btn-secondary btn-full" onclick="exportAllDataJSON()">&#128190; Export Backup (JSON)</button>
      <div style="margin-top:10px">
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importAllDataJSON(this)" />
        <button class="btn btn-secondary btn-full" onclick="document.getElementById('import-file').click()">&#128268; Import Backup (JSON)</button>
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
      <div class="setting-row"><span class="setting-label">App</span><span>Logbook v${APP_VERSION}</span></div>
      <div class="setting-row"><span class="setting-label">Platform</span><span>Progressive Web Application hosted on GitHub Pages</span></div>
      <div class="setting-row"><span class="setting-label">Storage</span><span>IndexedDB &amp; localStorage</span></div>
      <div class="setting-row"><span class="setting-label">Privacy</span><span>All data stays on this device</span></div>
      <div class="setting-row"><span class="setting-label">Purpose</span><span>CRA mileage logbook</span></div>
      <div class="setting-row">
        <span class="setting-label">Update</span>
        <button class="btn btn-secondary btn-sm" onclick="checkForUpdate()">Check for Update</button>
      </div>
      <div id="update-status" style="margin-top:8px;font-size:13px;color:#888"></div>
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

// ---- Save Slots ----
async function saveSaveSlot(slot) {
  const name = prompt(`Name this save (Slot ${slot}):`, `Slot ${slot} - ${new Date().toLocaleDateString()}`);
  if (name === null) return;
  try {
    const db = await getDB();
    const data = {
      vehicles: await getAllVehicles(),
      trips: await db.getAll('trips'),
      fuel: await db.getAll('fuel'),
      maintenance: await db.getAll('maintenance'),
      expenses: await db.getAll('expenses'),
      settings: { darkMode: getSetting('darkMode', true), craRate: getSetting('craRate', 0.73) }
    };
    localStorage.setItem(getSaveSlotKey(slot), JSON.stringify(data));
    setSaveSlotMeta(slot, { name, savedAt: new Date().toLocaleString() });
    alert(`Saved to Slot ${slot}: "${name}"`);
    renderSettings();
  } catch(e) { alert('Save failed: ' + e.message); }
}

async function loadSaveSlot(slot) {
  const meta = getSaveSlotMeta(slot);
  if (!meta) { alert('Slot is empty.'); return; }
  const confirmed = confirm(
    `Load Slot ${slot}: "${meta.name}"?\n\nThis will REPLACE all current data with the saved snapshot. This cannot be undone.`
  );
  if (!confirmed) return;
  try {
    const raw = localStorage.getItem(getSaveSlotKey(slot));
    if (!raw) { alert('Save data not found.'); return; }
    const data = JSON.parse(raw);
    await clearAllData();
    const db = await getDB();
    for (const v of data.vehicles) await db.add('vehicles', { ...v, id: undefined });
    // Re-read vehicles to get new IDs for remapping
    const newVehicles = await getAllVehicles();
    const idMap = {};
    data.vehicles.forEach((v, i) => { idMap[v.id] = newVehicles[i]?.id; });
    const remap = r => ({ ...r, id: undefined, vehicleId: idMap[r.vehicleId] || r.vehicleId });
    for (const t of data.trips) await db.add('trips', remap(t));
    for (const f of data.fuel) await db.add('fuel', remap(f));
    for (const m of (data.maintenance || [])) await db.add('maintenance', remap(m));
    for (const e of (data.expenses || [])) await db.add('expenses', remap(e));
    if (data.settings) {
      setSetting('darkMode', data.settings.darkMode);
      setSetting('craRate', data.settings.craRate);
      toggleDark(data.settings.darkMode);
    }
    alert(`Loaded Slot ${slot}: "${meta.name}"`);
    navigate('dashboard');
  } catch(e) { alert('Load failed: ' + e.message); }
}

function deleteSaveSlot(slot) {
  if (!confirm(`Delete Slot ${slot}? This cannot be undone.`)) return;
  localStorage.removeItem(getSaveSlotKey(slot));
  localStorage.removeItem(getSaveSlotKey(slot) + '_meta');
  renderSettings();
}

// ---- Test Data Loader ----
async function loadTestData() {
  const confirmed = confirm(
    'Load test data?\n\nThis will ADD sample vehicles, trips, fuel entries, and maintenance records to your current data for testing purposes.'
  );
  if (!confirmed) return;
  try {
    const db = await getDB();
    const carId = await db.add('vehicles', { nickname: 'Test Car', make: 'Ford', model: 'Taurus', year: '2013', plate: 'TEST 123', active: true });
    const truckId = await db.add('vehicles', { nickname: 'Work Truck', make: 'Ford', model: 'F-150', year: '2021', plate: 'WORK 456', active: false });
    const year = new Date().getFullYear();
    const trips = [
      { vehicleId: carId, date: `${year}-01-10`, type: 'Business', purpose: 'Client Visit', start_location: 'Home', end_location: 'Client Office', km_driven: 35.2, odometer_start: 50000, odometer_end: 50035, gps_tracked: false, notes: 'Q1 meeting' },
      { vehicleId: carId, date: `${year}-02-14`, type: 'Business', purpose: 'Meeting', start_location: 'Office', end_location: 'Downtown', km_driven: 12.5, odometer_start: 50035, odometer_end: 50048, gps_tracked: false, notes: '' },
      { vehicleId: carId, date: `${year}-03-03`, type: 'Personal', purpose: 'Other Business', start_location: 'Home', end_location: 'Grocery Store', km_driven: 8.0, odometer_start: 50048, odometer_end: 50056, gps_tracked: false, notes: '' },
      { vehicleId: truckId, date: `${year}-03-15`, type: 'Business', purpose: 'Job Site', start_location: 'Depot', end_location: 'Construction Site A', km_driven: 42.1, odometer_start: 120000, odometer_end: 120042, gps_tracked: false, notes: 'Site inspection' },
    ];
    for (const t of trips) await db.add('trips', t);
    const fuel = [
      { vehicleId: carId, date: `${year}-01-15`, station: 'Petro-Canada', litres: 45, total_cost: 72.50, odometer: 50035 },
      { vehicleId: carId, date: `${year}-02-20`, station: 'Shell', litres: 40, total_cost: 66.00, odometer: 50048 },
      { vehicleId: truckId, date: `${year}-03-18`, station: 'Esso', litres: 80, total_cost: 136.00, odometer: 120042 },
    ];
    for (const f of fuel) await db.add('fuel', f);
    const maintenance = [
      { vehicleId: carId, date: `${year}-01-20`, type: 'Oil Change', odometer: 50000, next_due_km: 55000, cost: 89.99, shop: 'Mr. Lube', notes: '5W-30 synthetic' },
    ];
    for (const m of maintenance) await db.add('maintenance', m);
    await setActiveVehicle(carId);
    alert('Test data loaded! 2 vehicles, 4 trips, 3 fuel entries, 1 service record added.');
    navigate('dashboard');
  } catch(e) { alert('Failed to load test data: ' + e.message); }
}

// ---- Version Check ----
async function checkForUpdate() {
  const statusEl = document.getElementById('update-status');
  if (statusEl) statusEl.textContent = 'Checking...';
  try {
    const r = await fetch('/logbook/pages/settings.js?_=' + Date.now(), { cache: 'no-store' });
    const text = await r.text();
    const match = text.match(/APP_VERSION\s*=\s*'([^']+)'/);
    if (match) {
      const latestVersion = match[1];
      if (latestVersion === APP_VERSION) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#4caf50">&#10003; You are on the latest version (v' + APP_VERSION + ')</span>';
      } else {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff9800">Update available: v' + latestVersion + '!</span> <button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="triggerUpdate()">Update Now</button>';
      }
    } else {
      if (statusEl) statusEl.textContent = 'Could not determine version.';
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = 'Check failed... are you offline?';
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
    const db = await getDB();
    const backup = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      vehicles: await getAllVehicles(),
      trips: await db.getAll('trips'),
      fuel: await db.getAll('fuel'),
      maintenance: await db.getAll('maintenance'),
      expenses: await db.getAll('expenses'),
      settings: { darkMode: getSetting('darkMode', true), craRate: getSetting('craRate', 0.73) }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logbook-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { alert('Export failed: ' + e.message); }
}

// ---- JSON Backup Import ----
async function importAllDataJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.vehicles || !backup.trips) { alert('Invalid backup file.'); return; }
      const confirmed = confirm(
        `Import backup from ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString() : 'unknown date'}?\n\n` +
        `This will ADD ${backup.vehicles.length} vehicles, ${backup.trips.length} trips, ` +
        `${backup.fuel.length} fuel entries to your existing data.\n\nYour current data will NOT be deleted.`
      );
      if (!confirmed) return;
      const db = await getDB();
      const existingVehicles = await getAllVehicles();
      const existingPlates = existingVehicles.map(v => v.plate).filter(Boolean);
      const vehicleIdMap = {};
      for (const v of backup.vehicles) {
        const oldId = v.id;
        if (existingPlates.includes(v.plate)) {
          const existing = existingVehicles.find(ev => ev.plate === v.plate);
          if (existing) vehicleIdMap[oldId] = existing.id;
          continue;
        }
        const newId = await db.add('vehicles', { ...v, id: undefined, active: false });
        vehicleIdMap[oldId] = newId;
      }
      const remap = r => ({ ...r, id: undefined, vehicleId: vehicleIdMap[r.vehicleId] || r.vehicleId });
      for (const t of backup.trips) await db.add('trips', remap(t));
      for (const f of backup.fuel) await db.add('fuel', remap(f));
      for (const m of (backup.maintenance || [])) await db.add('maintenance', remap(m));
      for (const ex of (backup.expenses || [])) await db.add('expenses', remap(ex));
      if (backup.settings && getSetting('craRate', null) === null) setSetting('craRate', backup.settings.craRate);
      alert(`Import complete! ${backup.trips.length} trips and ${backup.fuel.length} fuel entries added.`);
      renderSettings();
    } catch(err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

// ---- Clear All ----
function confirmClearAll() {
  const html = `
    <div class="modal-title">Clear All Data?</div>
    <p class="text-muted">This will permanently delete ALL vehicles, trips, fuel records, maintenance, and expenses. Save slots are NOT affected.</p>
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
