// pages/vehicles.js - rendered inside Settings page
async function renderVehicles(container) {
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const el = typeof container === 'string'
    ? document.getElementById(container)
    : (container || document.getElementById('vehicles-container'));
  if (!el) return;

  el.innerHTML = `
    <div class="settings-section">
      <h2>Vehicles</h2>
      ${vehicles.length === 0 ? '<div class="list-empty" style="padding:20px 0">No vehicles added yet</div>' : ''}
      ${vehicles.map(v => `
        <div class="vehicle-row">
          <div class="vehicle-info">
            <div class="v-name">${v.nickname || v.make + ' ' + v.model}
              ${activeV && v.id === activeV.id ? '<span class="active-badge">Active</span>' : ''}
            </div>
            <div class="v-detail">${v.year || ''} ${v.make || ''} ${v.model || ''} ${v.plate ? '&bull; ' + v.plate : ''}</div>
          </div>
          <div class="vehicle-actions">
            ${activeV && v.id !== activeV.id ? `<button class="btn btn-secondary btn-sm" onclick="setActiveVehicleAndRefresh(${v.id})">Set Active</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="showVehicleForm(${v.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteVehicle(${v.id})">Del</button>
          </div>
        </div>
      `).join('')}
      <button class="btn btn-primary btn-full mt-16" onclick="showVehicleForm(null)">+ Add Vehicle</button>
    </div>
  `;
}

async function setActiveVehicleAndRefresh(id) {
  await setActiveVehicle(id);
  renderSettings();
}

function showVehicleForm(editId) {
  getAllVehicles().then(vehicles => {
    const v = editId ? vehicles.find(x => x.id === editId) : null;
    const html = `
      <div class="modal-title">${v ? 'Edit Vehicle' : 'Add Vehicle'}</div>
      <div class="form-group"><label>Nickname (optional)</label>
        <input id="v-nick" value="${v ? v.nickname || '' : ''}" placeholder="e.g. Blue Civic" /></div>
      <div class="form-row">
        <div class="form-group"><label>Make</label><input id="v-make" value="${v ? v.make || '' : ''}" placeholder="Honda" /></div>
        <div class="form-group"><label>Model</label><input id="v-model" value="${v ? v.model || '' : ''}" placeholder="Civic" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Year</label><input id="v-year" type="number" value="${v ? v.year || '' : ''}" placeholder="2020" /></div>
        <div class="form-group"><label>Plate</label><input id="v-plate" value="${v ? v.plate || '' : ''}" placeholder="ABCD 123" /></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveVehicle(${editId || 'null'})">Save</button>
      </div>
    `;
    showModal(html);
  });
}

async function saveVehicle(editId) {
  const nickname = document.getElementById('v-nick').value.trim();
  const make = document.getElementById('v-make').value.trim();
  const model = document.getElementById('v-model').value.trim();
  const year = document.getElementById('v-year').value.trim();
  const plate = document.getElementById('v-plate').value.trim();

  if (!make && !nickname) {
    alert('Please enter at least a make or nickname.');
    return;
  }

  if (editId) {
    const existing = await getVehicle(editId);
    await updateVehicle({ ...existing, nickname, make, model, year, plate });
  } else {
    const id = await addVehicle({ nickname, make, model, year, plate, active: false });
    const vehicles = await getAllVehicles();
    if (vehicles.length === 1) await setActiveVehicle(id);
  }

  closeModal();
  // Refresh the current page - if on settings, re-render settings; otherwise re-render current page
  if (typeof renderSettings === 'function' && document.getElementById('vehicles-container')) {
    renderSettings();
  } else {
    navigate(window._currentPage || 'dashboard');
  }
}

async function confirmDeleteVehicle(id) {
  const html = `
    <div class="modal-title">Delete Vehicle?</div>
    <p class="text-muted">All trips, fuel, maintenance, and expenses for this vehicle will also be deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteVehicle(${id})">Delete</button>
    </div>
  `;
  showModal(html);
}

async function doDeleteVehicle(id) {
  await deleteVehicle(id);
  closeModal();
  renderSettings();
}
