// pages/dashboard.js
async function renderDashboard() {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const year = new Date().getFullYear().toString();

  let trips = [], fuel = [], maintenance = [], expenses = [];
  if (activeV) {
    trips = await getTripsByVehicle(activeV.id);
    fuel = await getFuelByVehicle(activeV.id);
    maintenance = await getMaintenanceByVehicle(activeV.id);
    expenses = await getExpensesByVehicle(activeV.id);
  }

  const yearTrips = trips.filter(t => t.date && t.date.startsWith(year));
  const yearFuel = fuel.filter(f => f.date && f.date.startsWith(year));
  const totalKm = yearTrips.reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
  const businessKm = yearTrips.filter(t => t.type === 'Business').reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
  const totalFuelCost = yearFuel.reduce((s, f) => s + (Number(f.total_cost) || 0), 0);
  const businessPct = totalKm > 0 ? Math.round(businessKm / totalKm * 100) : 0;
  const craRate = getSetting('craRate', 0.73);
  const deduction = (businessKm * craRate).toFixed(2);

  // Next service due widget
  let nextServiceHtml = '';
  if (maintenance.length > 0) {
    const withDue = maintenance.filter(r => r.next_due_km && r.odometer);
    if (withDue.length > 0) {
      const latest = withDue[0];
      let estOdo = latest.odometer;
      for (const t of trips) {
        if (t.odometer_end && t.odometer_end > estOdo) estOdo = t.odometer_end;
      }
      const remaining = latest.next_due_km - estOdo;
      const urgency = remaining < 0 ? 'overdue' : remaining < 500 ? 'soon' : 'ok';
      nextServiceHtml = `
        <div class="maint-due-card maint-due-${urgency}" onclick="navigate('maintenance')" style="cursor:pointer;">
          <div class="maint-due-label">&#128295; Next ${latest.type}</div>
          <div class="maint-due-km">${remaining < 0 ? Math.abs(remaining).toFixed(0) + ' km OVERDUE' : remaining.toFixed(0) + ' km remaining'}</div>
          <div class="maint-due-sub">Tap to view maintenance log</div>
        </div>
      `;
    }
  }

  const vehicleSelector = vehicles.length > 1 ? `
    <div class="form-group" style="margin-bottom:12px">
      <select id="dash-vehicle-select">${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
    </div>
  ` : '';

  el.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="year-badge">${year}</span>
    </div>
    ${vehicleSelector}
    ${vehicles.length === 0 ? `
      <div class="empty-state">
        <div style="font-size:3rem">&#128663;</div>
        <div class="empty-title">No vehicles yet</div>
        <div class="empty-sub">Add your first vehicle to get started</div>
        <button class="btn btn-primary" onclick="showVehicleForm(null)">+ Add Vehicle</button>
      </div>
    ` : `
      ${nextServiceHtml}
      <div class="stat-grid">
        <div class="stat-card" onclick="navigate('trips')">
          <div class="stat-label">BUSINESS KM</div>
          <div class="stat-value">${businessKm.toFixed(0)}</div>
          <div class="stat-sub">${yearTrips.filter(t=>t.type==='Business').length} trips</div>
        </div>
        <div class="stat-card" onclick="navigate('trips')">
          <div class="stat-label">TOTAL KM</div>
          <div class="stat-value">${totalKm.toFixed(0)}</div>
          <div class="stat-sub">${yearTrips.length} trips</div>
        </div>
        <div class="stat-card" onclick="navigate('fuel')">
          <div class="stat-label">FUEL SPEND</div>
          <div class="stat-value">${formatCurrency(totalFuelCost)}</div>
          <div class="stat-sub">${yearFuel.length} fill-ups</div>
        </div>
        <div class="stat-card" onclick="navigate('summary')">
          <div class="stat-label">BUSINESS %</div>
          <div class="stat-value">${businessPct}%</div>
          <div class="stat-sub">Est. $${deduction} deduction</div>
        </div>
      </div>
      <div class="quick-actions">
        <button class="btn btn-primary" onclick="navigate('logTrip')">+ Log Trip</button>
        <button class="btn btn-secondary" onclick="navigate('logFuel')">+ Log Fuel</button>
        <button class="btn btn-secondary" onclick="navigate('maintenance', {showForm:true})">&#128295; Service</button>
        <button class="btn btn-secondary" onclick="navigate('expenses')">&#128200; Expenses</button>
      </div>
      ${yearTrips.length > 0 ? `
        <div class="section-header">
          <h2>Recent Trips</h2>
          <button class="btn btn-sm" onclick="navigate('trips')">View All</button>
        </div>
        ${yearTrips.slice(-3).reverse().map(t => tripRowHTML(t, activeV)).join('')}
      ` : '<div class="list-empty">No trips logged yet this year</div>'}
    `}
  `;

  const sel = document.getElementById('dash-vehicle-select');
  if (sel) {
    sel.addEventListener('change', async () => {
      await setActiveVehicle(Number(sel.value));
      renderDashboard();
    });
  }
}

function tripRowHTML(t, vehicle) {
  const vName = vehicle ? (vehicle.nickname || vehicle.make + ' ' + vehicle.model) : '';
  const gpsIcon = t.gps_tracked ? ' &#128205;' : '';
  return `
    <div class="trip-row" onclick="navigate('logTrip', {editId: ${t.id}})">
      <div class="row-main">
        <div class="row-title">${t.start_location || '?'} &rarr; ${t.end_location || '?'}${gpsIcon}</div>
        <div class="row-sub">
          <span class="pill pill-purpose">${t.purpose || ''}</span>
          ${vName ? '&bull; ' + vName : ''}
        </div>
      </div>
      <div class="row-right">
        <div class="row-value">${Number(t.km_driven).toFixed(1)} km</div>
        <div class="row-date">${formatDate(t.date)}</div>
      </div>
    </div>
  `;
}
