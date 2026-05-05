// pages/logTrip.js
const PURPOSES = ['Client Visit', 'Job Site', 'Supply Run', 'Meeting', 'Bank / Financial', 'Government Office', 'Medical (Business)', 'Other Business'];

async function renderLogTrip(params = {}) {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const editId = params.editId || null;
  let existing = null;
  if (editId) existing = await getTrip(editId);

  const t = existing || {};
  const isEdit = !!existing;

  el.innerHTML = `
    <div class="page-header">
      <h1>${isEdit ? 'Edit Trip' : 'Log Trip'}</h1>
      ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteTrip(${editId})">Delete</button>` : ''}
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
        <option value="business" ${(!t.type || t.type === 'business') ? 'selected' : ''}>Business</option>
        <option value="personal" ${t.type === 'personal' ? 'selected' : ''}>Personal</option>
      </select>
    </div>
    <div class="form-group">
      <label>Purpose</label>
      <select id="trip-purpose">
        ${PURPOSES.map(p => `<option ${t.purpose === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
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
      <div class="auto-calc" id="km-hint"></div>
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <textarea id="trip-notes" rows="2" placeholder="Client name, address, etc.">${t.notes || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="saveTrip(${editId || 'null'})">${isEdit ? 'Update Trip' : 'Save Trip'}</button>
    <button class="btn btn-secondary btn-full mt-8" onclick="navigate('trips')">Cancel</button>
  `;
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
    alert('Please fill in date, start, destination, and distance'); return;
  }
  const record = { vehicleId, date, type, purpose, start_location, end_location, odometer_start: odometer_start ? Number(odometer_start) : '', odometer_end: odometer_end ? Number(odometer_end) : '', km_driven: Number(km_driven), notes };
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
    <p class="text-muted" style="margin-bottom:20px">This trip will be permanently deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteTrip(${id})">Delete</button>
    </div>`;
  showModal(html);
}

async function doDeleteTrip(id) {
  await deleteTrip(id);
  closeModal();
  navigate('trips');
}
