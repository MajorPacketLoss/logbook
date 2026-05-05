// pages/exportPage.js
async function renderExportPage() {
  const el = document.getElementById('page-content');
  const vehicles = await getAllVehicles();
  const activeV = await getActiveVehicle();
  const years = getYears();

  el.innerHTML = `
    <div class="page-header"><h1>Export</h1></div>
    <div class="export-section">
      <h2>Select Vehicle & Year</h2>
      <div class="form-group">
        <label>Vehicle</label>
        <select id="exp-vehicle">
          ${vehicles.map(v => `<option value="${v.id}" ${activeV && v.id === activeV.id ? 'selected' : ''}>${v.nickname || v.make + ' ' + v.model}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tax Year</label>
        <select id="exp-year">
          ${years.map(y => `<option value="${y}" ${y === new Date().getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="export-section">
      <h2>Download</h2>
      <button class="btn btn-primary btn-full" onclick="doExport('trips')">Export Trips CSV</button>
      <button class="btn btn-primary btn-full mt-8" onclick="doExport('fuel')">Export Fuel CSV</button>
      <button class="btn btn-secondary btn-full mt-8" onclick="doExport('both')">Export Both</button>
    </div>
    <div class="card" style="margin-top:8px">
      <h2>What's included</h2>
      <div class="text-muted" style="font-size:13px;line-height:1.6">
        Trips CSV: Date, Vehicle, Type, Purpose, Start, Destination, Odometer Start, Odometer End, KM Driven, Notes<br/>
        Fuel CSV: Date, Vehicle, Station, Litres, Total Cost, Price/L, Odometer, Notes
      </div>
    </div>
  `;
}

function escCsv(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function doExport(type) {
  const vId = Number(document.getElementById('exp-vehicle').value);
  const year = document.getElementById('exp-year').value;
  const vehicles = await getAllVehicles();
  const vMap = {};
  vehicles.forEach(v => vMap[v.id] = v.nickname || v.make + ' ' + v.model);
  const v = vehicles.find(x => x.id === vId);
  const vName = v ? (v.nickname || v.make + '_' + v.model).replace(/\s+/g, '_') : 'vehicle';

  if (type === 'trips' || type === 'both') {
    const trips = (await getTripsByVehicle(vId)).filter(t => t.date && t.date.startsWith(year));
    const headers = ['Date','Vehicle','Type','Purpose','Start Location','End Location','Odometer Start','Odometer End','KM Driven','Notes'];
    const rows = trips.map(t => [
      t.date, vMap[t.vehicleId] || '', t.type || 'business', t.purpose || '',
      t.start_location || '', t.end_location || '',
      t.odometer_start || '', t.odometer_end || '', t.km_driven || '', t.notes || ''
    ].map(escCsv).join(','));
    downloadCsv(`logbook_trips_${vName}_${year}.csv`, [headers.join(','), ...rows].join('\n'));
  }

  if (type === 'fuel' || type === 'both') {
    const fuel = (await getFuelByVehicle(vId)).filter(f => f.date && f.date.startsWith(year));
    const headers = ['Date','Vehicle','Station','Litres','Total Cost','Price per Litre','Odometer','Notes'];
    const rows = fuel.map(f => [
      f.date, vMap[f.vehicleId] || '', f.station || '',
      f.litres || '', f.total_cost || '', f.price_per_litre || '',
      f.odometer || '', f.notes || ''
    ].map(escCsv).join(','));
    downloadCsv(`logbook_fuel_${vName}_${year}.csv`, [headers.join(','), ...rows].join('\n'));
  }
}
