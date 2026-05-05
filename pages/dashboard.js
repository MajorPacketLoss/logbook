// pages/dashboard.js
async function renderDashboard() {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const year = new Date().getFullYear().toString();

  let trips = [], fuel = [];
  if (activeV) {
    trips = await getTripsByVehicle(activeV.id);
    fuel = await getFuelByVehicle(activeV.id);
  }

  const yearTrips = trips.filter(t => t.date && t.date.startsWith(year));
  const yearFuel = fuel.filter(f => f.date && f.date.startsWith(year));
  const totalKm = yearTrips.reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
  const businessKm = yearTrips.filter(t => t.type === 'business').reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
  const totalFuelCost = yearFuel.reduce((s, f) => s + (Number(f.total_cost) || 0), 0);

  const vehicleSelector = vehicles.length > 1 ? `
    <div class="form-group">
      <select id="dash-vehicle-select">
        ${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
      </select>
    </div>` : '';

  el.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="text-muted">${year}</span>
    </div>
    ${vehicleSelector}
    ${vehicles.length === 0 ? `
      <div class="card" style="text-align:center;padding:32px">
        <div style="font-size:40px;margin-bottom:12px">&#128663;</div>
        <div style="font-weight:600;margin-bottom:8px">No vehicles yet</div>
        <div class="text-muted" style="margin-bottom:16px">Add your first vehicle to get started</div>
        <button class="btn btn-primary" onclick="navigate('settings')">Add Vehicle</button>
      </div>` : `
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
      ${yearTrips.length > 0 ? `
        <div class="page-header" style="margin-bottom:10px">
          <h1 style="font-size:16px">Recent Trips</h1>
        </div>
        ${yearTrips.slice(0, 3).map(t => tripRowHTML(t, activeV)).join('')}
        <button class="btn btn-secondary btn-full mt-8" onclick="navigate('trips')">View All Trips</button>
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
  return `
    <div class="trip-row" onclick="navigate('logTrip', {editId: ${t.id}})">
      <div class="row-main">
        <div class="row-title">${t.start_location} &rarr; ${t.end_location}</div>
        <div class="row-sub">${t.purpose} ${vName ? '&bull; ' + vName : ''}</div>
      </div>
      <div class="row-right">
        <div class="row-value">${Number(t.km_driven).toFixed(1)} km</div>
        <div class="row-date">${formatDate(t.date)}</div>
      </div>
    </div>`;
}
