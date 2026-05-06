// pages/logTrip.js - V2: GPS tracking, reverse geocoding, saved locations
const PURPOSES = ['Client Visit', 'Job Site', 'Supply Run', 'Meeting', 'Bank / Financial', 'Government Office', 'Medical (Business)', 'Other Business'];

// GPS tracking state
let _gpsWatchId = null;
let _gpsPoints = [];
let _gpsStartTime = null;
let _gpsStartCoords = null;
let _gpsTotalMeters = 0;
let _gpsLastPoint = null;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'Accept-Language': 'en' }
    });
    const d = await r.json();
    const a = d.address || {};
    const parts = [a.house_number, a.road, a.city || a.town || a.village || a.suburb].filter(Boolean);
    return parts.join(' ') || d.display_name || `${lat.toFixed(4)},${lon.toFixed(4)}`;
  } catch(e) {
    return `${lat.toFixed(4)},${lon.toFixed(4)}`;
  }
}

function startGPSTracking() {
  if (!navigator.geolocation) {
    alert('GPS not available on this device/browser.');
    return;
  }
  _gpsPoints = [];
  _gpsTotalMeters = 0;
  _gpsLastPoint = null;
  _gpsStartTime = new Date();
  document.getElementById('gps-btn-start').style.display = 'none';
  document.getElementById('gps-btn-stop').style.display = 'inline-flex';
  document.getElementById('gps-status').textContent = 'GPS active - acquiring signal...';
  document.getElementById('gps-status').className = 'gps-status gps-active';

  _gpsWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon, accuracy } = pos.coords;
      if (accuracy > 50) return; // ignore poor fixes
      if (_gpsLastPoint) {
        const d = haversineMeters(_gpsLastPoint.lat, _gpsLastPoint.lon, lat, lon);
        if (d > 5) { // only count if moved > 5m (filters stationary noise)
          _gpsTotalMeters += d;
          _gpsLastPoint = { lat, lon };
        }
      } else {
        _gpsLastPoint = { lat, lon };
        _gpsStartCoords = { lat, lon };
        // auto-fill start location
        const addr = await reverseGeocode(lat, lon);
        const startInput = document.getElementById('trip-start');
        if (startInput && !startInput.value) startInput.value = addr;
      }
      const km = (_gpsTotalMeters / 1000).toFixed(2);
      document.getElementById('gps-status').textContent = `GPS active \u2022 ${km} km tracked`;
      document.getElementById('trip-km').value = km;
    },
    (err) => {
      document.getElementById('gps-status').textContent = 'GPS error: ' + err.message;
      document.getElementById('gps-status').className = 'gps-status gps-error';
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

async function stopGPSTracking() {
  if (_gpsWatchId !== null) {
    navigator.geolocation.clearWatch(_gpsWatchId);
    _gpsWatchId = null;
  }
  document.getElementById('gps-btn-start').style.display = 'inline-flex';
  document.getElementById('gps-btn-stop').style.display = 'none';
  const km = (_gpsTotalMeters / 1000).toFixed(2);
  document.getElementById('trip-km').value = km;
  document.getElementById('gps-status').textContent = `Trip ended \u2022 ${km} km recorded`;
  document.getElementById('gps-status').className = 'gps-status gps-done';

  // Reverse geocode end point
  if (_gpsLastPoint) {
    const addr = await reverseGeocode(_gpsLastPoint.lat, _gpsLastPoint.lon);
    const endInput = document.getElementById('trip-end');
    if (endInput && !endInput.value) endInput.value = addr;
    // Auto-save this as a saved location
    if (addr) addSavedLocation({ name: addr, address: addr }).catch(()=>{});
  }
}

function setupLocationAutocomplete(inputId, savedLocs) {
  const input = document.getElementById(inputId);
  if (!input || !savedLocs.length) return;
  const datalistId = inputId + '-list';
  let dl = document.getElementById(datalistId);
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = datalistId;
    document.body.appendChild(dl);
  }
  dl.innerHTML = savedLocs.map(l => `<option value="${l.address}">`).join('');
  input.setAttribute('list', datalistId);
}

async function renderLogTrip(params = {}) {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const savedLocs = await getAllSavedLocations();
  const editId = params.editId || null;
  let existing = null;
  if (editId) existing = await getTrip(editId);
  const t = existing || {};
  const isEdit = !!existing;

  // Reset GPS state
  if (_gpsWatchId !== null) {
    navigator.geolocation.clearWatch(_gpsWatchId);
    _gpsWatchId = null;
  }

  el.innerHTML = `
    <div class="page-header">
      <h1>${isEdit ? 'Edit Trip' : 'Log Trip'}</h1>
      ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteTrip(${editId})">Delete</button>` : ''}
    </div>

    <div class="gps-tracker-card">
      <div class="gps-tracker-title">\uD83D\uDCCD GPS Trip Tracker</div>
      <div id="gps-status" class="gps-status">Tap Start to auto-record distance &amp; locations</div>
      <div class="gps-btn-row">
        <button id="gps-btn-start" class="btn btn-primary" onclick="startGPSTracking()">\u25B6 Start GPS</button>
        <button id="gps-btn-stop" class="btn btn-danger" onclick="stopGPSTracking()" style="display:none">\u23F9 Stop &amp; Save</button>
      </div>
    </div>

    <div class="form-group">
      <label>Vehicle</label>
      <select id="trip-vehicle">${vehicles.map(v => `<option value="${v.id}" ${(t.vehicleId || (activeV && activeV.id)) === v.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="trip-date" value="${t.date || today()}" />
    </div>
    <div class="form-group">
      <label>Trip Type</label>
      <select id="trip-type">
        <option value="business" ${(!t.type || t.type === 'business') ? 'selected' : ''}>Business</option>
        <option value="personal" ${t.type === 'personal' ? 'selected' : ''}>Personal</option>
      </select>
    </div>
    <div class="form-group">
      <label>Purpose</label>
      <select id="trip-purpose">${PURPOSES.map(p => `<option ${t.purpose === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label>Start Location</label>
      <input id="trip-start" value="${t.start_location || ''}" placeholder="123 Main St, Toronto" />
    </div>
    <div class="form-group">
      <label>Destination</label>
      <input id="trip-end" value="${t.end_location || ''}" placeholder="456 King St, Toronto" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Odometer Start (km)</label>
        <input type="number" id="trip-odo-start" value="${t.odometer_start || ''}" placeholder="50000" oninput="calcKm()" />
      </div>
      <div class="form-group">
        <label>Odometer End (km)</label>
        <input type="number" id="trip-odo-end" value="${t.odometer_end || ''}" placeholder="50025" oninput="calcKm()" />
      </div>
    </div>
    <div class="form-group">
      <label>Distance Driven (km)</label>
      <input type="number" id="trip-km" value="${t.km_driven || ''}" placeholder="25.0" step="0.1" />
      <div id="km-hint" class="auto-calc"></div>
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <textarea id="trip-notes" rows="2" placeholder="Client name, address, etc.">${t.notes || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="saveTrip(${editId || 'null'})">${isEdit ? 'Update Trip' : 'Save Trip'}</button>
    <button class="btn btn-secondary btn-full" onclick="navigate('trips')">Cancel</button>
  `;

  // Set up saved location autocomplete on both location fields
  setupLocationAutocomplete('trip-start', savedLocs);
  setupLocationAutocomplete('trip-end', savedLocs);
}

function calcKm() {
  const s = parseFloat(document.getElementById('trip-odo-start').value);
  const e = parseFloat(document.getElementById('trip-odo-end').value);
  if (!isNaN(s) && !isNaN(e) && e > s) {
    document.getElementById('trip-km').value = (e - s).toFixed(1);
    document.getElementById('km-hint').textContent = 'Auto-calculated from odometer';
  }
}

async function saveTrip(editId) {
  const vehicleId = Number(document.getElementById('trip-vehicle').value);
  const date = document.getElementById('trip-date').value;
  const type = document.getElementById('trip-type').value;
  const purpose = document.getElementById('trip-purpose').value;
  const start_location = document.getElementById('trip-start').value.trim();
  const end_location = document.getElementById('trip-end').value.trim();
  const odometer_start = document.getElementById('trip-odo-start').value;
  const odometer_end = document.getElementById('trip-odo-end').value;
  const km_driven = document.getElementById('trip-km').value;
  const notes = document.getElementById('trip-notes').value.trim();

  if (!date || !start_location || !end_location || !km_driven) {
    alert('Please fill in date, start, destination, and distance');
    return;
  }

  // Stop GPS if still running
  if (_gpsWatchId !== null) await stopGPSTracking();

  // Auto-save locations
  if (start_location) addSavedLocation({ name: start_location, address: start_location }).catch(()=>{});
  if (end_location) addSavedLocation({ name: end_location, address: end_location }).catch(()=>{});

  const record = {
    vehicleId, date, type, purpose, start_location, end_location,
    odometer_start: odometer_start ? Number(odometer_start) : '',
    odometer_end: odometer_end ? Number(odometer_end) : '',
    km_driven: Number(km_driven),
    gps_tracked: _gpsTotalMeters > 0,
    notes
  };

  if (editId) {
    const existing = await getTrip(editId);
    await updateTrip({ ...existing, ...record });
  } else {
    await addTrip(record);
  }
  navigate('trips');
}

async function confirmDeleteTrip(id) {
  const html = `
    <div class="modal-title">Delete Trip?</div>
    <p class="text-muted">This trip will be permanently deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteTrip(${id})">Delete</button>
    </div>
  `;
  showModal(html);
}

async function doDeleteTrip(id) {
  await deleteTrip(id);
  closeModal();
  navigate('trips');
}
