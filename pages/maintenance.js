// pages/maintenance.js - V2: Vehicle service & maintenance log
const MAINT_TYPES = ['Oil Change', 'Tire Rotation', 'Tire Change', 'Brake Service', 'Battery Replacement', 'Air Filter', 'Cabin Filter', 'Transmission Service', 'Coolant Flush', 'Inspection / Safety Check', 'Windshield Repair', 'Body Repair', 'Other'];

async function renderMaintenance(params = {}) {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const editId = params.editId || null;
  let existing = null;
  if (editId) existing = await getMaintenanceEntry(editId);
  const m = existing || {};
  const isEdit = !!existing;

  // If showing the form (add/edit)
  if (params.showForm || isEdit) {
    el.innerHTML = `
      <div class="page-header">
        <h1>${isEdit ? 'Edit Service' : 'Log Service'}</h1>
        ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteMaint(${editId})">Delete</button>` : ''}
      </div>
      <div class="form-group">
        <label>Vehicle</label>
        <select id="maint-vehicle">${vehicles.map(v => `<option value="${v.id}" ${(m.vehicleId || (activeV && activeV.id)) === v.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="maint-date" value="${m.date || today()}" />
      </div>
      <div class="form-group">
        <label>Service Type</label>
        <select id="maint-type">${MAINT_TYPES.map(t => `<option ${m.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Odometer at Service (km)</label>
        <input type="number" id="maint-odo" value="${m.odometer || ''}" placeholder="52000" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Next Service Due (km)</label>
          <input type="number" id="maint-next-km" value="${m.next_due_km || ''}" placeholder="57000" />
        </div>
        <div class="form-group">
          <label>Cost ($)</label>
          <input type="number" id="maint-cost" value="${m.cost || ''}" placeholder="89.99" step="0.01" />
        </div>
      </div>
      <div class="form-group">
        <label>Shop / Location (optional)</label>
        <div class="input-with-btn">
          <input id="maint-shop" value="${m.shop || ''}" placeholder="Mr. Lube - Yonge St" />
          <button class="btn btn-icon" onclick="openLocationPicker('maint-shop','service')" title="Pick from map"><i data-lucide="map-pin-plus"></i></button>
        </div>
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea id="maint-notes" rows="2" placeholder="Parts replaced, warranty info, etc.">${m.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveMaintenance(${editId || 'null'})">${isEdit ? 'Update Record' : 'Save Record'}</button>
        <button class="btn btn-secondary" onclick="renderMaintenance()">Cancel</button>
      </div>
    `;
    return;
  }

  // --- List view ---
  const recs = activeV ? await getMaintenanceByVehicle(activeV.id) : [];

  // Calculate next service due info
  let nextServiceHtml = '';
  if (recs.length > 0) {
    const withDue = recs.filter(r => r.next_due_km && r.odometer);
    if (withDue.length > 0) {
      const latest = withDue[0];
      let trips = activeV ? await getTripsByVehicle(activeV.id) : [];
      let estOdo = latest.odometer;
      for (const t of trips) {
        if (t.odometer_end && t.odometer_end > estOdo) estOdo = t.odometer_end;
      }
      const remaining = latest.next_due_km - estOdo;
      const urgency = remaining < 0 ? 'overdue' : remaining < 500 ? 'soon' : 'ok';
      nextServiceHtml = `
        <div class="maint-due-card maint-due-${urgency}">
          <div class="maint-due-label">Next ${latest.type}</div>
          <div class="maint-due-km">${remaining < 0 ? Math.abs(remaining).toFixed(0) + ' km OVERDUE' : remaining.toFixed(0) + ' km remaining'}</div>
          <div class="maint-due-sub">Due at ${latest.next_due_km.toLocaleString()} km &bull; Est. current: ${estOdo.toLocaleString()} km</div>
        </div>
      `;
    }
  }

  const totalCost = recs.reduce((s, r) => s + (Number(r.cost) || 0), 0);

  el.innerHTML = `
    <div class="page-header">
      <h1>Maintenance</h1>
      <button class="btn btn-primary btn-sm" onclick="renderMaintenance({showForm:true})">+ Add</button>
    </div>
    ${nextServiceHtml}
    ${vehicles.length > 1 ? `
      <div class="form-group">
        <select id="maint-vehicle-filter" onchange="switchMaintVehicle(this.value)">${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
      </div>
    ` : ''}
    ${recs.length === 0 ? `
      <div class="list-empty">No service records yet<br><small>Track oil changes, tires, repairs and more</small></div>
    ` : `
      <div class="summary-row">
        <span class="label">Total spent on maintenance</span>
        <span class="value highlight-value">${formatCurrency(totalCost)}</span>
      </div>
      ${recs.map(r => `
        <div class="trip-row" onclick="renderMaintenance({editId:${r.id}})">
          <div class="row-main">
            <div class="row-title">${r.type}</div>
            <div class="row-sub">${r.shop || ''} ${r.odometer ? '&bull; ' + r.odometer.toLocaleString() + ' km' : ''}</div>
          </div>
          <div class="row-right">
            <div class="row-value">${r.cost ? formatCurrency(r.cost) : '&mdash;'}</div>
            <div class="row-date">${formatDate(r.date)}</div>
          </div>
        </div>
      `).join('')}
    `}
  `;
}

async function switchMaintVehicle(id) {
  await setActiveVehicle(Number(id));
  renderMaintenance();
}

async function saveMaintenance(editId) {
  const vehicleId = Number(document.getElementById('maint-vehicle').value);
  const date = document.getElementById('maint-date').value;
  const type = document.getElementById('maint-type').value;
  const odometer = document.getElementById('maint-odo').value;
  const next_due_km = document.getElementById('maint-next-km').value;
  const cost = document.getElementById('maint-cost').value;
  const shop = document.getElementById('maint-shop').value.trim();
  const notes = document.getElementById('maint-notes').value.trim();
  if (!date || !type) { alert('Please fill in date and service type'); return; }
  const record = {
    vehicleId, date, type,
    odometer: odometer ? Number(odometer) : '',
    next_due_km: next_due_km ? Number(next_due_km) : '',
    cost: cost ? Number(cost) : '',
    shop, notes
  };
  if (editId) {
    const existing = await getMaintenanceEntry(editId);
    await updateMaintenance({ ...existing, ...record });
  } else {
    await addMaintenance(record);
  }
  renderMaintenance();
}

async function confirmDeleteMaint(id) {
  const html = `
    <div class="modal-title">Delete Record?</div>
    <p>This service record will be permanently deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteMaint(${id})">Delete</button>
    </div>
  `;
  showModal(html);
}

async function doDeleteMaint(id) {
  await deleteMaintenance(id);
  closeModal();
  renderMaintenance();
}
