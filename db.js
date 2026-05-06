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
async function setActiveVehicle(id) {
  const db = await getDB();
  const all = await db.getAll('vehicles');
  const tx = db.transaction('vehicles', 'readwrite');
  for (const v of all) {
    v.active = (v.id === id);
    tx.store.put(v);
  }
  await tx.done;
}
async function getActiveVehicle() {
  const all = await getAllVehicles();
  return all.find(v => v.active) || all[0] || null;
}

// --- Trips ---
async function getAllTrips() {
  const db = await getDB();
  const trips = await db.getAll('trips');
  return trips.sort((a, b) => b.date.localeCompare(a.date));
}
async function getTripsByVehicle(vehicleId) {
  const db = await getDB();
  const trips = await db.getAllFromIndex('trips', 'vehicleId', vehicleId);
  return trips.sort((a, b) => b.date.localeCompare(a.date));
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
async function getTrip(id) {
  const db = await getDB();
  return db.get('trips', id);
}

// --- Fuel ---
async function getAllFuel() {
  const db = await getDB();
  const fuel = await db.getAll('fuel');
  return fuel.sort((a, b) => b.date.localeCompare(a.date));
}
async function getFuelByVehicle(vehicleId) {
  const db = await getDB();
  const fuel = await db.getAllFromIndex('fuel', 'vehicleId', vehicleId);
  return fuel.sort((a, b) => b.date.localeCompare(a.date));
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
async function getAllMaintenance() {
  const db = await getDB();
  const recs = await db.getAll('maintenance');
  return recs.sort((a, b) => b.date.localeCompare(a.date));
}
async function getMaintenanceByVehicle(vehicleId) {
  const db = await getDB();
  const recs = await db.getAllFromIndex('maintenance', 'vehicleId', vehicleId);
  return recs.sort((a, b) => b.date.localeCompare(a.date));
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

// --- General Expenses ---
async function getAllExpenses() {
  const db = await getDB();
  const recs = await db.getAll('expenses');
  return recs.sort((a, b) => b.date.localeCompare(a.date));
}
async function getExpensesByVehicle(vehicleId) {
  const db = await getDB();
  const recs = await db.getAllFromIndex('expenses', 'vehicleId', vehicleId);
  return recs.sort((a, b) => b.date.localeCompare(a.date));
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

// --- Saved Locations ---
async function getAllSavedLocations() {
  const db = await getDB();
  return db.getAll('savedLocations');
}
async function addSavedLocation(loc) {
  const db = await getDB();
  // Avoid duplicates by name
  const all = await db.getAll('savedLocations');
  if (all.find(l => l.address.toLowerCase() === loc.address.toLowerCase())) return;
  return db.add('savedLocations', loc);
}
async function deleteSavedLocation(id) {
  const db = await getDB();
  return db.delete('savedLocations', id);
}

// --- Settings ---
function getSetting(key, def) {
  const v = localStorage.getItem('logbook_' + key);
  return v !== null ? JSON.parse(v) : def;
}
function setSetting(key, value) {
  localStorage.setItem('logbook_' + key, JSON.stringify(value));
}

// --- Clear all data ---
async function clearAllData() {
  const db = await getDB();
  await db.clear('vehicles');
  await db.clear('trips');
  await db.clear('fuel');
  await db.clear('maintenance');
  await db.clear('expenses');
  await db.clear('savedLocations');
  localStorage.clear();
}
