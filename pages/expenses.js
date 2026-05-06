// pages/expenses.js - V2: General vehicle expenses (insurance, registration, parking, tolls)
const EXPENSE_TYPES = ['Insurance', 'Registration / Licence', 'Parking', 'Toll / Highway 407', 'Car Wash', 'Accessories', 'Parking Ticket', 'Storage', 'Other'];

async function renderExpenses(params = {}) {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const editId = params.editId || null;
  let existing = null;
  if (editId) existing = await getExpenseEntry(editId);
  const e = existing || {};
  const isEdit = !!existing;

  if (params.showForm || isEdit) {
    el.innerHTML = `
      <div class="page-header">
        <h1>${isEdit ? 'Edit Expense' : 'Log Expense'}</h1>
        ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteExpense(${editId})">Delete</button>` : ''}
      </div>
      <div class="form-group">
        <label>Vehicle</label>
        <select id="exp-vehicle">${vehicles.map(v => `<option value="${v.id}" ${(e.vehicleId || (activeV && activeV.id)) === v.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="exp-date" value="${e.date || today()}" />
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="exp-type">${EXPENSE_TYPES.map(t => `<option ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Amount ($)</label>
        <input type="number" id="exp-amount" value="${e.amount || ''}" placeholder="0.00" step="0.01" />
      </div>
      <div class="form-group">
        <label>Description (optional)</label>
        <input id="exp-desc" value="${e.description || ''}" placeholder="Annual registration renewal, etc." />
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea id="exp-notes" rows="2" placeholder="Receipt number, policy number, etc.">${e.notes || ''}</textarea>
      </div>
      <button class="btn btn-primary btn-full" onclick="saveExpense(${editId || 'null'})">${isEdit ? 'Update Expense' : 'Save Expense'}</button>
      <button class="btn btn-secondary btn-full" onclick="renderExpenses()">Cancel</button>
    `;
    return;
  }

  // --- List view ---
  const recs = activeV ? await getExpensesByVehicle(activeV.id) : [];
  const year = new Date().getFullYear().toString();
  const yearRecs = recs.filter(r => r.date && r.date.startsWith(year));
  const totalYear = yearRecs.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalAll = recs.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Group by category for this year
  const byCategory = {};
  for (const r of yearRecs) {
    byCategory[r.type] = (byCategory[r.type] || 0) + (Number(r.amount) || 0);
  }

  el.innerHTML = `
    <div class="page-header">
      <h1>Expenses</h1>
      <button class="btn btn-primary btn-sm" onclick="renderExpenses({showForm:true})">+ Add</button>
    </div>
    ${vehicles.length > 1 ? `<div class="form-group"><select id="exp-vehicle-filter" onchange="switchExpVehicle(this.value)">${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select></div>` : ''}
    ${yearRecs.length > 0 ? `
      <div class="stat-grid" style="margin-bottom:12px;">
        <div class="card">
          <h2>${year} Total</h2>
          <div class="big-number">${formatCurrency(totalYear)}</div>
          <div class="sub">${yearRecs.length} expenses</div>
        </div>
        <div class="card">
          <h2>All Time</h2>
          <div class="big-number">${formatCurrency(totalAll)}</div>
          <div class="sub">${recs.length} total</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <h2>By Category (${year})</h2>
        ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => `
          <div class="summary-row">
            <span class="label">${cat}</span>
            <span class="value">${formatCurrency(amt)}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${recs.length === 0 ? `<div class="list-empty">No expenses logged yet<br><span class="text-muted">Track insurance, parking, registration and more</span></div>` : `
      ${recs.map(r => `
        <div class="trip-row" onclick="renderExpenses({editId:${r.id}})">
          <div class="row-main">
            <div class="row-title">${r.type}</div>
            <div class="row-sub">${r.description || ''}</div>
          </div>
          <div class="row-right">
            <div class="row-value">${formatCurrency(r.amount)}</div>
            <div class="row-date">${formatDate(r.date)}</div>
          </div>
        </div>
      `).join('')}
    `}
  `;
}

async function switchExpVehicle(id) {
  await setActiveVehicle(Number(id));
  renderExpenses();
}

async function saveExpense(editId) {
  const vehicleId = Number(document.getElementById('exp-vehicle').value);
  const date = document.getElementById('exp-date').value;
  const type = document.getElementById('exp-type').value;
  const amount = document.getElementById('exp-amount').value;
  const description = document.getElementById('exp-desc').value.trim();
  const notes = document.getElementById('exp-notes').value.trim();

  if (!date || !amount) { alert('Please fill in date and amount'); return; }

  const record = { vehicleId, date, type, amount: Number(amount), description, notes };

  if (editId) {
    const existing = await getExpenseEntry(editId);
    await updateExpense({ ...existing, ...record });
  } else {
    await addExpense(record);
  }
  renderExpenses();
}

async function confirmDeleteExpense(id) {
  const html = `
    <div class="modal-title">Delete Expense?</div>
    <p class="text-muted">This expense record will be permanently deleted.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doDeleteExpense(${id})">Delete</button>
    </div>
  `;
  showModal(html);
}

async function doDeleteExpense(id) {
  await deleteExpense(id);
  closeModal();
  renderExpenses();
}
