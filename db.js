// db.js - All IndexedDB operations via idb library (V2: added maintenance, expenses, savedLocations)
let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await idb.openDB('logbook-db', 2, {
    upgrade(db, oldVersion) {
      // Version 1 stores
      if (!db.objectStoreNames.contains('vehicles')) {
        const vs = db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
        vs.createIndex('active', 'active');
      }
      if (!db.objectStoreNames.contains('trips')) {
        const ts = db.createObjectStore('trips', { keyPath: 'id', autoIncrement: true });
        ts.createIndex('vehicleId', 'vehicleId');
        ts.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('fuel')) {
        const fs = db.createObjectStore('fuel', { keyPath: 'id', autoIncrement: true });
        fs.createIndex('vehicleId', 'vehicleId');
        fs.createIndex('date', 'date');
      }
      // Version 2 stores
      if (!db.objectStoreNames.contains('maintenance')) {
        const ms = db.createObjectStore('maintenance', { keyPath: 'id', autoIncrement: true });
        ms.createIndex('vehicleId', 'vehicleId');
        ms.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('expenses')) {
        const es = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        es.createIndex('vehicleId', 'vehicleId');
        es.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('savedLocations')) {
        const sl = db.createObjectStore('savedLocations', { keyPath: 'id', autoIncrement: true });
        sl.createIndex('name', 'name');
      }
    }
  });
  return _db;
}

// --- Vehicles ---
async function getAllVehicles() {
  const db = await getDB();
  return db.getAll('vehicles');
}
async function addVehicle(v) {
  const db = await getDB();
  return db.add('vehicles', { ...v, active: v.active || false });
}
async function updateVehicle(v) {
  const db = await getDB();
  return db.put('vehicles', v);
}
async function deleteVehicle(id) {
  const db = await getDB();
  return db.delete('vehicles', id);
}
async function getActiveVehicle() {
  const vehicles = await getAllVehicles();
  return vehicles.find(v => v.active) || vehicles[0] || null;
}
async function setActiveVehicle(id) {
  const vehicles = await getAllVehicles();
  for (const v of vehicles) {
    await updateVehicle({ ...v, active: v.id === id });
  }
}

// --- Trips ---
async function getAllTrips() {
  const db = await getDB();
  return db.getAll('trips');
}
async function getTripsByVehicle(vehicleId) {
  const db = await getDB();
  return db.getAllFromIndex('trips', 'vehicleId', vehicleId);
}
async function addTrip(t) {
  const db = await getDB();
  return db.add('trips', t);
}
async function updateTrip(t) {
  const db = await getDB();
  return db.put('trips', t);
}
async function deleteTrip(id) {
  const db = await getDB();
  return db.delete('trips', id);
}
async function getTripEntry(id) {
  const db = await getDB();
  return db.get('trips', id);
}

// --- Fuel ---
async function getFuelByVehicle(vehicleId) {
  const db = await getDB();
  return db.getAllFromIndex('fuel', 'vehicleId', vehicleId);
}
async function getAllFuel() {
  const db = await getDB();
  return db.getAll('fuel');
}
async function addFuel(f) {
  const db = await getDB();
  return db.add('fuel', f);
}
async function updateFuel(f) {
  const db = await getDB();
  return db.put('fuel', f);
}
async function deleteFuel(id) {
  const db = await getDB();
  return db.delete('fuel', id);
}
async function getFuelEntry(id) {
  const db = await getDB();
  return db.get('fuel', id);
}

// --- Maintenance ---
async function getMaintenanceByVehicle(vehicleId) {
  const db = await getDB();
  return db.getAllFromIndex('maintenance', 'vehicleId', vehicleId);
}
async function addMaintenance(m) {
  const db = await getDB();
  return db.add('maintenance', m);
}
async function updateMaintenance(m) {
  const db = await getDB();
  return db.put('maintenance', m);
}
async function deleteMaintenance(id) {
  const db = await getDB();
  return db.delete('maintenance', id);
}
async function getMaintenanceEntry(id) {
  const db = await getDB();
  return db.get('maintenance', id);
}

// --- Expenses ---
async function getExpensesByVehicle(vehicleId) {
  const db = await getDB();
  return db.getAllFromIndex('expenses', 'vehicleId', vehicleId);
}
async function addExpense(e) {
  const db = await getDB();
  return db.add('expenses', e);
}
async function updateExpense(e) {
  const db = await getDB();
  return db.put('expenses', e);
}
async function deleteExpense(id) {
  const db = await getDB();
  return db.delete('expenses', id);
}
async function getExpenseEntry(id) {
  const db = await getDB();
  return db.get('expenses', id);
}

// --- Settings (localStorage) ---
function getSetting(key, def) {
  try {
    const v = localStorage.getItem('logbook_' + key);
    return v !== null ? JSON.parse(v) : def;
  } catch(e) { return def; }
}
function setSetting(key, val) {
  localStorage.setItem('logbook_' + key, JSON.stringify(val));
}

// --- Years helper ---
function getYears() {
  const cur = new Date().getFullYear();
  const years = [];
  for (let y = cur; y >= cur - 5; y--) years.push(y);
  return years;
}

// --- Date helper ---
function today() {
  return new Date().toISOString().slice(0, 10);
}

// --- Currency helper ---
function formatCurrency(n) {
  return '$' + Number(n || 0).toFixed(2);
}

// --- Clear All Data (preserves save slots and app settings keys not related to data) ---
async function clearAllData() {
  const db = await getDB();
  await db.clear('vehicles');
  await db.clear('trips');
  await db.clear('fuel');
  await db.clear('maintenance');
  await db.clear('expenses');
  await db.clear('savedLocations');
  // Only clear app settings keys, NOT save slot keys (logbook_save_slot_*)
  ['logbook_settings', 'logbook_active_vehicle', 'logbook_darkMode', 'logbook_craRate'].forEach(k => localStorage.removeItem(k));
}
