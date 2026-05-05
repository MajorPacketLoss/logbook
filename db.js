// db.js - All IndexedDB operations via idb library
let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await idb.openDB('logbook-db', 1, {
    upgrade(db) {
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
  localStorage.clear();
}
