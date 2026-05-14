// pages/locationPicker.js
// GPS-based place picker using Leaflet + OpenStreetMap + Overpass API
// Opens a full-screen map modal. Fetches nearby POIs (gas stations, garages,
// EV chargers, etc.) from Overpass. User taps a marker or the map to pick a place.
// Calls onSelect(placeName, lat, lon) when done.

let _pickerMap = null;
let _pickerLayerGroup = null;
let _pickerPoiLayer = null;
let _pickerCustomLayer = null;
let _pickerTargetInputId = null;
let _pickerFetchTimer = null;
let _pickerFetchController = null;
const POI_FETCH_DEBOUNCE_MS = 600;

// POI categories to fetch from Overpass
const POI_OVERPASS_BY_MODE = {
  fuel: [
    'nwr["amenity"="fuel"]',
    'nwr["amenity"="charging_station"]'
  ],
  service: [
    'nwr["shop"="car_repair"]',
    'nwr["amenity"="car_repair"]',
    'nwr["shop"="tyres"]',
    'nwr["amenity"="car_wash"]',
    'nwr["shop"="car"]'
  ]
};

POI_OVERPASS_BY_MODE.any = [
  ...POI_OVERPASS_BY_MODE.fuel,
  ...POI_OVERPASS_BY_MODE.service
];

const POI_ICONS = {
  'amenity=fuel':             { emoji: '⛽', color: '#e74c3c' },
  'amenity=charging_station': { emoji: '⚡', color: '#2ecc71' },
  'shop=car_repair':          { emoji: '🔧', color: '#e67e22' },
  'amenity=car_repair':       { emoji: '🔧', color: '#e67e22' },
  'shop=tyres':               { emoji: '🛞', color: '#95a5a6' },
  'amenity=car_wash':         { emoji: '🚿', color: '#3498db' },
  'shop=car':                 { emoji: '🚗', color: '#9b59b6' },
};

const POI_KEYS_BY_MODE = {
  fuel: ['amenity=fuel', 'amenity=charging_station'],
  service: ['shop=car_repair', 'amenity=car_repair', 'shop=tyres', 'amenity=car_wash', 'shop=car']
};

function getPoiKey(tags) {
  if (tags.amenity) return 'amenity=' + tags.amenity;
  if (tags.shop)    return 'shop='    + tags.shop;
  return null;
}

function makeLeafletIcon(emoji, color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:#fff;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      border:2px solid rgba(255,255,255,0.7);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function normalizeMode(mode) {
  return mode === 'fuel' || mode === 'service' ? mode : 'any';
}

function getOverpassParts(mode) {
  const key = normalizeMode(mode);
  return POI_OVERPASS_BY_MODE[key] || POI_OVERPASS_BY_MODE.any;
}

function isAllowedPoiKey(mode, key) {
  const norm = normalizeMode(mode);
  if (norm === 'any') return true;
  return POI_KEYS_BY_MODE[norm].includes(key);
}

function createPoiPopup(targetInputId, name, addr, lat, lon) {
  const wrap = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = name;
  wrap.appendChild(title);
  if (addr) {
    wrap.appendChild(document.createElement('br'));
    wrap.appendChild(document.createTextNode(addr));
  }
  wrap.appendChild(document.createElement('br'));
  const btn = document.createElement('button');
  btn.textContent = '✓ Select';
  btn.style.marginTop = '6px';
  btn.style.padding = '4px 10px';
  btn.style.background = '#6c63ff';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', () => _selectPlace(targetInputId, name, lat, lon));
  wrap.appendChild(btn);
  return wrap;
}

async function fetchPoisInBounds(south, west, north, east, mode = 'any', signal) {
  const parts = getOverpassParts(mode).map(q => `${q}(${south},${west},${north},${east});`).join('');
  const query = `[out:json][timeout:25];(${parts});out center;`;
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  try {
    const res = await fetch(url, { signal });
    const data = await res.json();
    return data.elements || [];
  } catch(e) {
    if (e.name !== 'AbortError') {
      console.warn('Overpass fetch failed:', e);
    }
    return [];
  }
}

function _setCustomLocationMarker(targetInputId, name, addr, lat, lon) {
  if (!_pickerCustomLayer) return;
  _pickerCustomLayer.clearLayers();
  const icon = makeLeafletIcon('📌', '#f39c12');
  L.marker([lat, lon], { icon })
    .addTo(_pickerCustomLayer)
    .bindPopup(createPoiPopup(targetInputId, name, addr, lat, lon))
    .openPopup();

  _setPickerStatus('Custom location ready — tap Select in the popup.');
}

function _schedulePoiReload(mode) {
  if (_pickerFetchTimer) clearTimeout(_pickerFetchTimer);
  _pickerFetchTimer = setTimeout(() => {
    _loadPoisForMap(mode);
  }, POI_FETCH_DEBOUNCE_MS);
}

async function _loadPoisForMap(mode) {
  if (!_pickerMap || !_pickerPoiLayer) return;
  const bounds = _pickerMap.getBounds();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();

  if (_pickerFetchController) _pickerFetchController.abort();
  _pickerFetchController = new AbortController();

  _setPickerStatus('Loading places in view…');
  const pois = await fetchPoisInBounds(south, west, north, east, mode, _pickerFetchController.signal);
  if (_pickerFetchController.signal.aborted) return;

  _pickerPoiLayer.clearLayers();
  let count = 0;
  for (const poi of pois) {
    const tags = poi.tags || {};
    const key = getPoiKey(tags);
    if (!key) continue;
    if (!isAllowedPoiKey(mode, key)) continue;
    const info = POI_ICONS[key];
    if (!info) continue;
    const lat = poi.lat ?? poi.center?.lat;
    const lon = poi.lon ?? poi.center?.lon;
    if (lat == null || lon == null) continue;
    const name = tags.name || tags.brand || key.split('=')[1];
    const addr = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const icon = makeLeafletIcon(info.emoji, info.color);
    L.marker([lat, lon], { icon })
      .addTo(_pickerPoiLayer)
      .bindPopup(createPoiPopup(_pickerTargetInputId || '', name, addr, lat, lon));
    count++;
  }

  if (count > 0) {
    _setPickerStatus(`Found ${count} places in view — pan or zoom to load more.`);
  } else {
    _setPickerStatus('No places found in this area. Pan/zoom to search elsewhere or tap map for custom location.');
  }
}

// Main entry point - call this to open the picker
// targetInputId: the input element to populate with the selected name
// mode: 'fuel' | 'service' | 'any'
function openLocationPicker(targetInputId, mode = 'any') {
  _pickerTargetInputId = targetInputId;
  // Build modal HTML (map container + status bar)
  const html = `
    <div class="loc-picker-header">
      <span class="loc-picker-title">📍 Pick a Location</span>
      <button class="btn btn-sm btn-secondary" onclick="closeLocationPicker()">✕ Cancel</button>
    </div>
    <div id="loc-picker-status" class="loc-picker-status">Getting your location…</div>
    <div id="loc-picker-map" style="width:100%;height:calc(100vh - 120px);min-height:300px;"></div>
    <div class="loc-picker-footer">
      <div class="loc-picker-hint">Tap a marker to select a place, or tap the map to pick a custom point.</div>
    </div>
  `;

  // Show full-screen modal
  const overlay = showModal(html);
  overlay.style.alignItems = 'stretch';
  overlay.style.padding = '0';
  const modal = overlay.querySelector('.modal');
  modal.style.cssText = 'width:100%;height:100%;max-width:100%;border-radius:0;margin:0;padding:0;display:flex;flex-direction:column;overflow:hidden;';

  // Init map after DOM is ready
  setTimeout(() => _initPickerMap(targetInputId, mode), 100);
}

function closeLocationPicker() {
  if (_pickerMap) {
    _pickerMap.remove();
    _pickerMap = null;
    _pickerLayerGroup = null;
    _pickerPoiLayer = null;
    _pickerCustomLayer = null;
  }
  _pickerTargetInputId = null;
  if (_pickerFetchTimer) clearTimeout(_pickerFetchTimer);
  _pickerFetchTimer = null;
  if (_pickerFetchController) _pickerFetchController.abort();
  _pickerFetchController = null;
  closeModal();
}

function _setPickerStatus(msg, isError = false) {
  const el = document.getElementById('loc-picker-status');
  if (el) {
    el.textContent = msg;
    el.style.color = isError ? '#e74c3c' : '';
  }
}

async function _initPickerMap(targetInputId, mode) {
  const mapEl = document.getElementById('loc-picker-map');
  if (!mapEl) return;

  if (typeof L === 'undefined') {
    _setPickerStatus('Map library failed to load. Please refresh.', true);
    return;
  }

  const normalizedMode = normalizeMode(mode);

  // Default to Toronto if geolocation fails
  let lat = 43.6532, lon = -79.3832;

  // Try to get user location
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        maximumAge: 60000,
        enableHighAccuracy: true,
      });
    });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    _setPickerStatus('📡 Location found — tap a marker to select, or tap map for custom.');
  } catch(e) {
    _setPickerStatus('⚠️ Location unavailable — showing map at last known area. Tap to pick any point.', true);
  }

  // Init Leaflet map
  _pickerMap = L.map('loc-picker-map', { zoomControl: true }).setView([lat, lon], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(_pickerMap);

  _pickerLayerGroup = L.layerGroup().addTo(_pickerMap);
  _pickerPoiLayer = L.layerGroup().addTo(_pickerMap);
  _pickerCustomLayer = L.layerGroup().addTo(_pickerMap);

  // User location marker (blue dot)
  const userIcon = makeLeafletIcon('📍', '#1a73e8');
  L.marker([lat, lon], { icon: userIcon })
    .addTo(_pickerLayerGroup)
    .bindPopup('You are here')
    .openPopup();

  // Allow tapping map to pick any point
  _pickerMap.on('click', async (e) => {
    const { lat: clat, lng: clng } = e.latlng;
    // Reverse geocode with Nominatim
    _setPickerStatus('Looking up address…');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${clat}&lon=${clng}&format=json`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await r.json();
      const displayName = data.display_name || '';
      const name = data.name || (displayName ? displayName.split(',')[0] : `${clat.toFixed(5)}, ${clng.toFixed(5)}`);
      _setCustomLocationMarker(targetInputId, name, displayName, clat, clng);
    } catch(e) {
      _setCustomLocationMarker(targetInputId, `${clat.toFixed(5)}, ${clng.toFixed(5)}`, '', clat, clng);
    }
  });

  _pickerMap.on('moveend', () => _schedulePoiReload(normalizedMode));

  // Fetch and display nearby POIs
  _loadPoisForMap(normalizedMode);
}

// Exposed globally for inline onclick usage elsewhere
window.openLocationPicker = openLocationPicker;

function _selectPlace(targetInputId, name, lat, lon) {
  const input = document.getElementById(targetInputId);
  if (input) input.value = name;
  closeLocationPicker();
}
