// pages/logFuel.js
async function renderLogFuel(params = {}) {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const editId = params.editId || null;
  let existing = null;
  if (editId) existing = await getFuelEntry(editId);
  const f = existing || {};
  const isEdit = !!existing;

  el.innerHTML = `
    <div class="page-header">
      <h1>${isEdit ? 'Edit Fuel' : 'Log Fuel'}</h1>
      ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteFuel(${editId})">Delete</button>` : ''}
    </div>
    <div class="form-group">
      <label>Vehicle</label>
      <select id="fuel-vehicle">
        ${vehicles.map(v => `<option value="${v.id}" ${(f.vehicleId || (activeV && activeV.id)) === v.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="fuel-date" value="${f.date || today()}" />
    </div>
    <div class="form-group">
      <label>Gas Station</label>
      <input id="fuel-station" value="${f.station || ''}" placeholder="Petro-Canada, Shell, Costco..." />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Litres</label>
        <input type="number" id="fuel-litres" value="${f.litres || ''}" placeholder="40.0" step="0.01" oninput="calcFuel()" />
      </div>
      <div class="form-group">
        <label>Total Cost ($)</label>
        <input type="number" id="fuel-cost" value="${f.total_cost || ''}" placeholder="65.00" step="0.01" oninput="calcFuel()" />
      </div>
    </div>
    <div class="form-group">
      <label>Price per Litre (&#162;/L)</label>
      <input type="number" id="fuel-ppl" value="${f.price_per_litre || ''}" placeholder="162.9" step="0.1" readonly />
      <div class="auto-calc" id="ppl-hint"></div>
    </div>
    <div class="form-group">
      <label>Odometer (km)</label>
      <input type="number" id="fuel-odo" value="${f.odometer || ''}" placeholder="50000" />
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <textarea id="fuel-notes" rows="2" placeholder="Full tank, city driving...">${f.notes || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="saveFuel(${editId || 'null'})">${isEdit ? 'Update' : 'Save Fill-Up'}</button>
    <button class="btn btn-secondary btn-full mt-8" onclick="navigate('fuel')">Cancel</button>
  `;
}

function calcFuel() {
  const L = parseFloat(document.getElementById('fuel-litres').value);
  const C = parseFloat(document.getElementById('fuel-cost').value);
  if (!isNaN(L) && !isNaN(C) && L > 0) {
    const ppl = (C / L * 100).toFixed(1);
    document.getElementById('fuel-ppl').value = ppl;
    document.getElementById('ppl-hint').textContent = 'Auto-calculated';
  }
}

async function saveFuel(editId) {
  const vehicleId = Number(document.getElementById('fuel-vehicle').value);
  const date = document.getElementById('fuel-date').value;
  const station = document.getElementById('fuel-station').value.trim();
  const litres = document.getElementById('fuel-litres').value;
  const total_cost = document.getElementById('fuel-cost').value;
  const price_per_litre = document.getElementById('fuel-ppl').value;
  const odometer = document.getElementById('fuel-odo').value;
  const notes = document.getElementById('fuel-notes').value.trim();
  if (!date || !total_cost) { alert('Please fill in at least date and total cost'); return; }
  const record = { vehicleId, date, station, litres: litres ? Number(litres) : '', total_cost: Number(total_cost), price_per_litre: price_per_litre ? Number(price_per_litre) : '', odometer: odometer ? Number(odometer) : '', notes };
  if (editId) {
    const existing = await getFuelEntry(editId);
    await updateFuel({ ...existing, ...record });
  } else {
    await addFuel(record);
  }
  navigate('fuel');
}

async function confirmDeleteFuel(id) {
  const html = `
    <div class="modal-title">Delete Fuel Entry?</div>
    <p class="text-muted" style="margin-bottom:20px">This fuel record will be permanently deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteFuel(${id})">Delete</button>
    </div>`;
  showModal(html);
}

async function doDeleteFuel(id) {
  await deleteFuel(id);
  closeModal();
  navigate('fuel');
}
