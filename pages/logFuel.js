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
      <select id="fuel-vehicle">${vehicles.map(v => `<option value="${v.id}" ${(f.vehicleId || (activeV && activeV.id)) === v.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="fuel-date" value="${f.date || today()}" />
    </div>
    <div class="form-group">
      <label>Gas Station</label>
      <div class="input-with-btn">
        <input id="fuel-station" value="${f.station || ''}" placeholder="Petro-Canada, Shell, Costco..." />
        <button class="btn btn-icon" onclick="openLocationPicker('fuel-station','fuel')" title="Pick from map">&#128205;</button>
      </div>
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
      <input type="number" id="fuel-ppl" value="${f.price_per_litre || ''}" placeholder="162.9" step="0.1" oninput="calcFuel()" />
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
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveFuel(${editId || 'null'})">${isEdit ? 'Update' : 'Save Fill-Up'}</button>
      <button class="btn btn-secondary" onclick="navigate('fuel')">Cancel</button>
    </div>
  `;
}

function _formatFuelValue(value, digits) {
  return String(Number(value.toFixed(digits)));
}

function _setPplHint(text) {
  const hint = document.getElementById('ppl-hint');
  if (hint) hint.textContent = text;
}

function calcFuel() {
  const litresEl = document.getElementById('fuel-litres');
  const costEl = document.getElementById('fuel-cost');
  const pplEl = document.getElementById('fuel-ppl');

  const L = parseFloat(litresEl.value);
  const C = parseFloat(costEl.value);
  const P = parseFloat(pplEl.value);

  const hasL = !isNaN(L) && L > 0;
  const hasC = !isNaN(C) && C > 0;
  const hasP = !isNaN(P) && P > 0;

  const litresEmpty = litresEl.value.trim() === '';
  const costEmpty = costEl.value.trim() === '';
  const pplEmpty = pplEl.value.trim() === '';

  const calcPpl = () => {
    if (!hasL || !hasC) return;
    const ppl = (C / L * 100);
    pplEl.value = _formatFuelValue(ppl, 1);
  };

  const calcCost = () => {
    if (!hasL || !hasP) return;
    const cost = (L * P) / 100;
    costEl.value = _formatFuelValue(cost, 2);
  };

  const calcLitres = () => {
    if (!hasC || !hasP) return;
    const litres = (C * 100) / P;
    litresEl.value = _formatFuelValue(litres, 2);
  };

  if (hasL && hasC && pplEmpty) {
    calcPpl();
    _setPplHint('Auto-calculated price per litre');
    return;
  }

  if (hasL && hasP && costEmpty) {
    calcCost();
    _setPplHint('Auto-calculated total cost');
    return;
  }

  if (hasC && hasP && litresEmpty) {
    calcLitres();
    _setPplHint('Auto-calculated litres');
    return;
  }

  _setPplHint('');
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
  const record = {
    vehicleId, date, station,
    litres: litres ? Number(litres) : '',
    total_cost: Number(total_cost),
    price_per_litre: price_per_litre ? Number(price_per_litre) : '',
    odometer: odometer ? Number(odometer) : '',
    notes
  };
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
    <p>This fuel record will be permanently deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteFuel(${id})">Delete</button>
    </div>
  `;
  showModal(html);
}

async function doDeleteFuel(id) {
  await deleteFuel(id);
  closeModal();
  navigate('fuel');
}
