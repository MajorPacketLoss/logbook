// pages/summary.js
async function renderSummary() {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const years = getYears();
  const craRate = getSetting('craRate', 0.73);

  el.innerHTML = `
    <div class="page-header"><h1>Summary</h1></div>
    <div class="filter-bar">
      <select id="sum-vehicle">
        ${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
      </select>
      <select id="sum-year">
        ${years.map(y => `<option value="${y}" ${y === new Date().getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
    </div>
    <div id="sum-content"></div>
  `;

  const load = async () => {
    const vId = Number(document.getElementById('sum-vehicle').value);
    const year = document.getElementById('sum-year').value;
    const trips = (await getTripsByVehicle(vId)).filter(t => t.date && t.date.startsWith(year));
    const fuel = (await getFuelByVehicle(vId)).filter(f => f.date && f.date.startsWith(year));
    const totalKm = trips.reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
    const businessKm = trips.filter(t => t.type === 'business').reduce((s, t) => s + (Number(t.km_driven) || 0), 0);
    const personalKm = totalKm - businessKm;
    const businessPct = totalKm > 0 ? (businessKm / totalKm * 100) : 0;
    const totalFuelCost = fuel.reduce((s, f) => s + (Number(f.total_cost) || 0), 0);
    const deductibleFuel = totalFuelCost * (businessPct / 100);
    const perKmDeduction = businessKm * craRate;
    const bestMethod = perKmDeduction >= deductibleFuel ? 'perkm' : 'actual';

    const sumEl = document.getElementById('sum-content');
    if (!sumEl) return;
    sumEl.innerHTML = `
      <div class="summary-section">
        <h2>Mileage</h2>
        <div class="summary-row"><span class="label">Total KM Driven</span><span class="value">${totalKm.toFixed(1)} km</span></div>
        <div class="summary-row"><span class="label">Business KM</span><span class="value highlight-value">${businessKm.toFixed(1)} km</span></div>
        <div class="summary-row"><span class="label">Personal KM</span><span class="value">${personalKm.toFixed(1)} km</span></div>
        <div class="summary-row"><span class="label">Business Use %</span><span class="value highlight-value">${businessPct.toFixed(1)}%</span></div>
      </div>
      <div class="summary-section">
        <h2>Fuel</h2>
        <div class="summary-row"><span class="label">Total Fuel Cost</span><span class="value">${formatCurrency(totalFuelCost)}</span></div>
        <div class="summary-row"><span class="label">Fill-ups</span><span class="value">${fuel.length}</span></div>
      </div>
      <div class="summary-section">
        <h2>CRA Deduction Comparison</h2>
        <p class="text-muted mb-8">Both methods are valid. Use whichever gives you a higher deduction.</p>
        <div class="method-compare">
          <div class="method-card ${bestMethod === 'actual' ? 'best' : ''}">
            <div class="method-label">Actual Fuel Cost Method</div>
            <div class="method-value">${formatCurrency(deductibleFuel)}</div>
            <div class="text-muted" style="font-size:11px;margin-top:4px">Fuel cost x ${businessPct.toFixed(1)}%</div>
            ${bestMethod === 'actual' ? '<div style="font-size:11px;color:#7b68ee;margin-top:4px">Best option</div>' : ''}
          </div>
          <div class="method-card ${bestMethod === 'perkm' ? 'best' : ''}">
            <div class="method-label">CRA Per-KM Rate</div>
            <div class="method-value">${formatCurrency(perKmDeduction)}</div>
            <div class="text-muted" style="font-size:11px;margin-top:4px">${businessKm.toFixed(0)} km x $${craRate}/km</div>
            ${bestMethod === 'perkm' ? '<div style="font-size:11px;color:#7b68ee;margin-top:4px">Best option</div>' : ''}
          </div>
        </div>
      </div>
      <button class="btn btn-secondary btn-full mt-16" onclick="navigate('export')">Export CSV for Accountant</button>
    `;
  };

  document.getElementById('sum-vehicle').addEventListener('change', load);
  document.getElementById('sum-year').addEventListener('change', load);
  if (vehicles.length > 0) await load();
  else el.innerHTML += '<div class="list-empty">Add a vehicle to see your summary</div>';
}
