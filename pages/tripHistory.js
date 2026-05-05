// pages/tripHistory.js
async function renderTripHistory() {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const years = getYears();

  el.innerHTML = `
    <div class="page-header">
      <h1>Trip History</h1>
      <button class="btn btn-primary btn-sm" onclick="navigate('logTrip')">+ Add</button>
    </div>
    <div class="filter-bar">
      <select id="th-vehicle">
        <option value="all">All Vehicles</option>
        ${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
      </select>
      <select id="th-year">
        <option value="all">All Years</option>
        ${years.map(y => `<option value="${y}" ${y === new Date().getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
      <select id="th-type">
        <option value="all">All Types</option>
        <option value="business">Business</option>
        <option value="personal">Personal</option>
      </select>
    </div>
    <div id="trip-list"></div>
  `;

  const load = async () => {
    const vFilter = document.getElementById('th-vehicle').value;
    const yFilter = document.getElementById('th-year').value;
    const tFilter = document.getElementById('th-type').value;
    let trips = vFilter === 'all' ? await getAllTrips() : await getTripsByVehicle(Number(vFilter));
    if (yFilter !== 'all') trips = trips.filter(t => t.date && t.date.startsWith(yFilter));
    if (tFilter !== 'all') trips = trips.filter(t => t.type === tFilter);
    const vMap = {};
    vehicles.forEach(v => vMap[v.id] = v.nickname || v.make + ' ' + v.model);
    const totalKm = trips.reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
    const listEl = document.getElementById('trip-list');
    if (!listEl) return;
    listEl.innerHTML = trips.length === 0
      ? '<div class="list-empty">No trips found</div>'
      : `${trips.map(t => `
          <div class="trip-row" onclick="navigate('logTrip', {editId: ${t.id}})">
            <div class="row-main">
              <div class="row-title">${t.start_location || '?'} &rarr; ${t.end_location || '?'}</div>
              <div class="row-sub">
                <span class="pill pill-purpose">${t.purpose || ''}</span>
                ${vMap[t.vehicleId] ? vMap[t.vehicleId] : ''}
              </div>
            </div>
            <div class="row-right">
              <div class="row-value">${Number(t.km_driven || 0).toFixed(1)} km</div>
              <div class="row-date">${formatDate(t.date)}</div>
            </div>
          </div>`).join('')}
          <div class="card mt-16" style="text-align:center">
            <div class="text-muted">Total: <strong>${totalKm.toFixed(1)} km</strong> across ${trips.length} trips</div>
          </div>`;
  };

  document.getElementById('th-vehicle').addEventListener('change', load);
  document.getElementById('th-year').addEventListener('change', load);
  document.getElementById('th-type').addEventListener('change', load);
  await load();
}
