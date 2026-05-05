// pages/fuelHistory.js
async function renderFuelHistory() {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const years = getYears();

  el.innerHTML = `
    <div class="page-header">
      <h1>Fuel History</h1>
      <button class="btn btn-primary btn-sm" onclick="navigate('logFuel')">+ Add</button>
    </div>
    <div class="filter-bar">
      <select id="fh-vehicle">
        <option value="all">All Vehicles</option>
        ${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
      </select>
      <select id="fh-year">
        <option value="all">All Years</option>
        ${years.map(y => `<option value="${y}" ${y === new Date().getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
    </div>
    <div id="fuel-list"></div>
  `;

  const load = async () => {
    const vFilter = document.getElementById('fh-vehicle').value;
    const yFilter = document.getElementById('fh-year').value;
    let entries = vFilter === 'all' ? await getAllFuel() : await getFuelByVehicle(Number(vFilter));
    if (yFilter !== 'all') entries = entries.filter(f => f.date && f.date.startsWith(yFilter));
    const vMap = {};
    vehicles.forEach(v => vMap[v.id] = v.nickname || v.make + ' ' + v.model);
    const totalCost = entries.reduce((s, f) => s + (Number(f.total_cost) || 0), 0);
    const totalL = entries.reduce((s, f) => s + (Number(f.litres) || 0), 0);
    const listEl = document.getElementById('fuel-list');
    if (!listEl) return;
    listEl.innerHTML = entries.length === 0
      ? '<div class="list-empty">No fuel entries found</div>'
      : `${entries.map(f => `
          <div class="fuel-row" onclick="navigate('logFuel', {editId: ${f.id}})">
            <div class="row-main">
              <div class="row-title">${f.station || 'Fill-up'}</div>
              <div class="row-sub">${f.litres ? f.litres + ' L' : ''} ${f.price_per_litre ? '@ ' + f.price_per_litre + '&#162;/L' : ''} ${vMap[f.vehicleId] ? '&bull; ' + vMap[f.vehicleId] : ''}</div>
            </div>
            <div class="row-right">
              <div class="row-value">${formatCurrency(f.total_cost)}</div>
              <div class="row-date">${formatDate(f.date)}</div>
            </div>
          </div>`).join('')}
          <div class="card mt-16" style="text-align:center">
            <div class="text-muted">Total: <strong>${formatCurrency(totalCost)}</strong> &bull; <strong>${totalL.toFixed(1)} L</strong> across ${entries.length} fill-ups</div>
          </div>`;
  };

  document.getElementById('fh-vehicle').addEventListener('change', load);
  document.getElementById('fh-year').addEventListener('change', load);
  await load();
}
