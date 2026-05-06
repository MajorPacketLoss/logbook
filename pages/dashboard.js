// pages/dashboard.js - V2: added next-service widget, quick links to maintenance/expenses
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
  const yearExpenses = expenses.filter(e => e.date && e.date.startsWith(year));
  const totalKm = yearTrips.reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
  const businessKm = yearTrips.filter(t => t.type === 'business').reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
  const totalFuelCost = yearFuel.reduce((s, f) => s + (Number(f.total_cost) || 0), 0);
  const totalExpenses = yearExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

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
          <div class="maint-due-label">\uD83D\uDD27 Next ${latest.type}</div>
          <div class="maint-due-km">${remaining < 0 ? Math.abs(remaining).toFixed(0) + ' km OVERDUE' : remaining.toFixed(0) + ' km remaining'}</div>
          <div class="maint-due-sub">Tap to view maintenance log</div>
        </div>
      `;
    }
  }

  const vehicleSelector = vehicles.length > 1 ? `
    <div class="form-group">
      <select id="dash-vehicle-select">${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}</select>
    </div>
  ` : '';

  el.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="text-muted">${year}</span>
    </div>
    ${vehicleSelector}
    ${vehicles.length === 0 ? `
      <div class="card" style="text-align:center;padding:32px">
        <div style="font-size:40px;margin-bottom:12px;">\uD83D\uDE97</div>
        <div style="font-weight:600;margin-bottom:8px;">No vehicles yet</div>
        <div class="text-muted" style="margin-bottom:16px;">Add your first vehicle to get started</div>
        <button class="btn btn-primary" onclick="navigate('settings')">Add Vehicle</button>
      </div>
    ` : `
      ${nextServiceHtml}
      <div class="stat-grid">
        <div class="card">
          <h2>Business KM</h2>
          <div class="big-number">${businessKm.toFixed(0)}</div>
          <div class="sub">${year} total</div>
        </div>
        <div class="card">
          <h2>Total KM</h2>
          <div class="big-number">${totalKm.toFixed(0)}</div>
          <div class="sub">${yearTrips.length} trips</div>
        </div>
        <div class="card">
          <h2>Fuel Spend</h2>
          <div class="big-number">${formatCurrency(totalFuelCost)}</div>
          <div class="sub">${yearFuel.length} fill-ups</div>
        </div>
        <div class="card">
          <h2>Business %</h2>
          <div class="big-number">${totalKm > 0 ? Math.round(businessKm / totalKm * 100) : 0}%</div>
          <div class="sub">of total km</div>
        </div>
      </div>
      <div class="quick-actions">
        <button class="btn btn-primary" onclick="navigate('logTrip')">+ Log Trip</button>
        <button class="btn btn-secondary" onclick="navigate('logFuel')">+ Log Fuel</button>
      </div>
      <div class="quick-actions">
        <button class="btn btn-secondary" onclick="navigate('maintenance')">\uD83D\uDD27 Maintenance</button>
        <button class="btn btn-secondary" onclick="navigate('expenses')">\uD83D\uDCB8 Expenses</button>
      </div>
      ${yearTrips.length > 0 ? `
        <div class="page-header" style="margin-top:16px;">
          <h1 style="font-size:16px;">Recent Trips</h1>
          <button class="btn btn-secondary btn-sm" onclick="navigate('trips')">View All</button>
        </div>
        ${yearTrips.slice(0, 3).map(t => tripRowHTML(t, activeV)).join('')}
      ` : '<div class="list-empty" style="padding:20px 0;">No trips logged yet this year</div>'}
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
  const gpsIcon = t.gps_tracked ? ' \uD83D\uDCCD' : '';
  return `
    <div class="trip-row" onclick="navigate('logTrip', {editId:${t.id}})">
      <div class="row-main">
        <div class="row-title">${t.start_location} \u2192 ${t.end_location}${gpsIcon}</div>
        <div class="row-sub">${t.purpose} ${vName ? '\u2022 ' + vName : ''}</div>
      </div>
      <div class="row-right">
        <div class="row-value">${Number(t.km_driven).toFixed(1)} km</div>
        <div class="row-date">${formatDate(t.date)}</div>
      </div>
    </div>
  `;
}
