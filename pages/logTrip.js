// pages/logTrip.js - V2: GPS tracking, reverse geocoding, saved locations
const PURPOSES = ['Client Visit', 'Job Site', 'Supply Run', 'Meeting', 'Bank / Financial', 'Government Office', 'Medical (Business)', 'Other Business'];

// GPS tracking state
let _gpsWatchId = null;
let _gpsPoints = [];
let _gpsStartTime = null;
let _gpsStartCoords = null;
let _gpsTotalMeters = 0;
let _gpsLastPoint = null;
let _tripCalcLastEdited = null;

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
      if (accuracy > 50) return;
      if (_gpsLastPoint) {
        const d = haversineMeters(_gpsLastPoint.lat, _gpsLastPoint.lon, lat, lon);
        if (d > 5) {
          _gpsTotalMeters += d;
          _gpsPoints.push({ lat, lon, t: Date.now() });
        }
      } else {
        _gpsPoints.push({ lat, lon, t: Date.now() });
        _gpsStartCoords = { lat, lon };
        const addr = await reverseGeocode(lat, lon);
        const startEl = document.getElementById('trip-start');
        if (startEl && !startEl.value) startEl.value = addr;
      }
      _gpsLastPoint = { lat, lon };
      const km = (_gpsTotalMeters / 1000).toFixed(2);
      document.getElementById('gps-status').textContent = `GPS active - ${km} km tracked (${_gpsPoints.length} pts)`;
      document.getElementById('trip-km').value = km;
    },
    (err) => {
      document.getElementById('gps-status').textContent = 'GPS error: ' + err.message;
    },
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
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
  document.getElementById('gps-status').textContent = `GPS stopped - ${km} km recorded`;
  document.getElementById('gps-status').className = 'gps-status';
  document.getElementById('trip-km').value = km;
  if (_gpsLastPoint) {
    const addr = await reverseGeocode(_gpsLastPoint.lat, _gpsLastPoint.lon);
    const endEl = document.getElementById('trip-end');
    if (endEl && !endEl.value) endEl.value = addr;
  }
}

function _formatOdometer(value) {
  return String(Number(value.toFixed(1)));
}

function _setTripCalcHint(text) {
  const hint = document.getElementById('trip-calc-hint');
  if (hint) hint.textContent = text;
}

function tripCalcInput(source) {
  _tripCalcLastEdited = source;
  calcKm();
}

function calcKm() {
  const startEl = document.getElementById('trip-odo-start');
  const endEl = document.getElementById('trip-odo-end');
  const kmEl = document.getElementById('trip-km');

  const s = parseFloat(startEl.value);
  const e = parseFloat(endEl.value);
  const k = parseFloat(kmEl.value);

  const sHas = !isNaN(s) && s >= 0;
  const eHas = !isNaN(e) && e >= 0;
  const kHas = !isNaN(k) && k >= 0;

  const sEmpty = startEl.value.trim() === '';
  const eEmpty = endEl.value.trim() === '';
  const kEmpty = kmEl.value.trim() === '';

  if (sHas && eHas && kEmpty && e > s) {
    kmEl.value = (e - s).toFixed(1);
    _setTripCalcHint('Auto-calculated distance');
    return;
  }

  if (sHas && kHas && eEmpty && k >= 0) {
    const end = s + k;
    if (end >= s) {
      endEl.value = _formatOdometer(end);
      _setTripCalcHint('Auto-calculated odometer end');
      return;
    }
  }

  if (eHas && kHas && sEmpty && k >= 0) {
    const start = e - k;
    if (start >= 0 && start <= e) {
      startEl.value = _formatOdometer(start);
      _setTripCalcHint('Auto-calculated odometer start');
      return;
    }
  }

  if (_tripCalcLastEdited) _setTripCalcHint('');
}

async function renderLogTrip(params = {}) {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const editId = params.editId || null;
  let existing = null;
  if (editId) existing = await getTrip(editId);
  const t = existing || {};
  const isEdit = !!existing;
  _tripCalcLastEdited = null;

  // Load saved locations for datalist
  let savedLocs = [];
  try {
    const db = await getDB();
    const tx = db.transaction('savedLocations', 'readonly');
    savedLocs = await tx.store.getAll();
  } catch(e) {}

  const locOptions = savedLocs.map(l => `<option value="${l.name}">`).join('');

  el.innerHTML = `
    <div class="page-header">
      <h1>${isEdit ? 'Edit Trip' : 'Log Trip'}</h1>
      ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteTrip(${editId})">Delete</button>` : ''}
    </div>

    <div class="gps-tracker-card">
      <div class="gps-tracker-title">&#128205; GPS Trip Tracker</div>
      <div class="gps-tracker-sub">Tap Start to auto-record distance &amp; locations</div>
      <div class="gps-controls">
        <button id="gps-btn-start" class="btn btn-primary" onclick="startGPSTracking()">&#9654; Start GPS</button>
        <button id="gps-btn-stop" class="btn btn-danger" onclick="stopGPSTracking()" style="display:none">&#9646;&#9646; Stop GPS</button>
      </div>
      <div id="gps-status" class="gps-status"></div>
    </div>

    <div class="form-group">
      <label>Vehicle</label>
      <select id="trip-vehicle">
        ${vehicles.map(v => `<option value="${v.id}" ${(t.vehicleId || (activeV && activeV.id)) === v.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="trip-date" value="${t.date || today()}" />
    </div>
    <div class="form-group">
      <label>Trip Type</label>
      <select id="trip-type">
        <option value="Business" ${(t.type||'Business')==='Business'?'selected':''}>Business</option>
        <option value="Personal" ${t.type==='Personal'?'selected':''}>Personal</option>
        <option value="Medical" ${t.type==='Medical'?'selected':''}>Medical</option>
        <option value="Moving" ${t.type==='Moving'?'selected':''}>Moving</option>
      </select>
    </div>
    <div class="form-group">
      <label>Purpose</label>
      <select id="trip-purpose">
        ${PURPOSES.map(p => `<option value="${p}" ${t.purpose===p?'selected':''}>${p}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Start Location</label>
      <input type="text" id="trip-start" value="${t.start_location || ''}" placeholder="123 Main St, Toronto" list="loc-list" />
      <datalist id="loc-list">${locOptions}</datalist>
    </div>
    <div class="form-group">
      <label>Destination</label>
      <input type="text" id="trip-end" value="${t.end_location || ''}" placeholder="456 King St, Toronto" list="loc-list" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Odometer Start (km)</label>
        <input type="number" id="trip-odo-start" value="${t.odometer_start || ''}" placeholder="e.g. 50000" oninput="tripCalcInput('start')" />
      </div>
      <div class="form-group">
        <label>Odometer End (km)</label>
        <input type="number" id="trip-odo-end" value="${t.odometer_end || ''}" placeholder="e.g. 50025" oninput="tripCalcInput('end')" />
      </div>
    </div>
    <div class="form-group">
      <label>Distance Driven (km)</label>
      <input type="number" id="trip-km" value="${t.km_driven || ''}" placeholder="Enter km or use odometer/GPS above" step="0.1" oninput="tripCalcInput('km')" />
      <div class="auto-calc" id="trip-calc-hint"></div>
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <textarea id="trip-notes" placeholder="Client name, address, etc.">${t.notes || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveTrip(${editId || 'null'})">Save Trip</button>
    <button class="btn btn-secondary btn-block" onclick="navigate('trips')">Cancel</button>
  `;
  calcKm();
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
    alert('Please fill in date, start location, destination, and distance driven.');
    return;
  }

  // Save locations for future autocomplete
  try {
    const db = await getDB();
    const tx = db.transaction('savedLocations', 'readwrite');
    for (const loc of [start_location, end_location]) {
      if (loc) {
        const existing = await tx.store.index('name').get(loc);
        if (!existing) await tx.store.add({ name: loc, count: 1 });
        else await tx.store.put({ ...existing, count: (existing.count || 1) + 1 });
      }
    }
    await tx.done;
  } catch(e) {}

  const record = {
    vehicleId,
    date,
    type,
    purpose,
    start_location,
    end_location,
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
    <p class="text-muted">This will permanently delete this trip record.</p>
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
