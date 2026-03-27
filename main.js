/* ── Water Refill Finder – main.js ───────────────────────────────── */
'use strict';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {/* silent */});
}

// ── Config ─────────────────────────────────────────────────────────
const API_BASE      = '/api/stations';
const DEFAULT_RADIUS = 5;          // km
const MAX_MARKERS   = 50;          // cluster / cap above this
const DEFAULT_LAT   = 40.7128;     // New York fallback
const DEFAULT_LNG   = -74.0060;

// ── State ──────────────────────────────────────────────────────────
let map, markerLayer, userMarker;
let userLat = DEFAULT_LAT, userLng = DEFAULT_LNG;
let stations = [];
let offlineQueue = [];             // pending POST submissions

// ── DOM refs ───────────────────────────────────────────────────────
const skeleton     = document.getElementById('skeleton');
const mapEl        = document.getElementById('map');
const statusBanner = document.getElementById('statusBanner');
const stationList  = document.getElementById('stationList');
const emptyMsg     = document.getElementById('emptyMsg');
const detailPanel  = document.getElementById('detailPanel');
const detailClose  = document.getElementById('detailClose');
const formOverlay  = document.getElementById('formOverlay');
const addBtn       = document.getElementById('addBtn');
const formClose    = document.getElementById('formClose');
const addForm      = document.getElementById('addForm');
const formError    = document.getElementById('formError');
const formOffline  = document.getElementById('formOfflineNote');

// ── Init ───────────────────────────────────────────────────────────
(async function init() {
  initMap();
  try {
    const pos = await getPosition();
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
  } catch {
    showBanner('Location unavailable – showing default area.', 'warn');
  }
  map.setView([userLat, userLng], 14);
  addUserMarker(userLat, userLng);
  await loadStations(userLat, userLng);
  hideSkeleton();
})();

// ── Map setup ──────────────────────────────────────────────────────
function initMap() {
  map = L.map(mapEl, {
    center: [DEFAULT_LAT, DEFAULT_LNG],
    zoom: 13,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  // Pre-fill lat/lng when user clicks the map (for the add form)
  map.on('click', (e) => {
    document.getElementById('fLat').value = e.latlng.lat.toFixed(6);
    document.getElementById('fLng').value = e.latlng.lng.toFixed(6);
  });
}

function addUserMarker(lat, lng) {
  const icon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#0d7bc4;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(13,123,196,.3)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], { icon, title: 'Your location', zIndexOffset: 1000 }).addTo(map);
}

// ── Geolocation ────────────────────────────────────────────────────
function getPosition() {
  return new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, {
      enableHighAccuracy: false, timeout: 8000
    })
  );
}

// ── Skeleton ───────────────────────────────────────────────────────
function hideSkeleton() {
  skeleton.hidden = true;
  mapEl.style.display = 'block';
  // Invalidate Leaflet size after the container becomes visible
  setTimeout(() => map.invalidateSize(), 50);
}

// ── Data loading ───────────────────────────────────────────────────
async function loadStations(lat, lng) {
  let data;
  try {
    const url = `${API_BASE}?lat=${lat}&lng=${lng}&radius_km=${DEFAULT_RADIUS}`;
    // Manual abort controller for broader browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();

    // Cache the response for offline warm starts
    if ('caches' in self) {
      caches.open('refill-api-v1').then(c => c.put(url, new Response(JSON.stringify(data))));
    }
  } catch {
    // Try SW cache first, then static fallback
    data = await tryCache(lat, lng) ?? staticFallback(lat, lng);
    showBanner('Showing cached / demo data – could not reach the server.', 'warn');
  }

  stations = Array.isArray(data) ? data : extractFeatures(data);
  renderMarkers(stations);
  renderList(stations.slice(0, 10));
}

/** Pull a matching URL from the Cache API */
async function tryCache(lat, lng) {
  if (!('caches' in self)) return null;
  try {
    const url = `${API_BASE}?lat=${lat}&lng=${lng}&radius_km=${DEFAULT_RADIUS}`;
    const cache = await caches.open('refill-api-v1');
    const cached = await cache.match(url);
    if (!cached) return null;
    const d = await cached.json();
    return Array.isArray(d) ? d : extractFeatures(d);
  } catch { return null; }
}

/** Convert GeoJSON FeatureCollection to flat station array */
function extractFeatures(data) {
  if (data?.features) {
    return data.features.map(f => ({
      ...f.properties,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0]
    }));
  }
  return [];
}

/** Return MOCK_STATIONS sorted by distance to the user */
function staticFallback(lat, lng) {
  const pts = extractFeatures(MOCK_STATIONS);
  return pts
    .map(s => ({ ...s, _dist: haversine(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a._dist - b._dist);
}

// ── Markers ────────────────────────────────────────────────────────
function renderMarkers(list) {
  markerLayer.clearLayers();
  const visible = list.slice(0, MAX_MARKERS);
  visible.forEach(s => {
    const icon = stationIcon(s);
    const m = L.marker([s.lat, s.lng], { icon })
      .bindPopup(popupHtml(s))
      .on('click', () => showDetail(s));
    markerLayer.addLayer(m);
  });
}

function stationIcon(s) {
  const emoji = s.type === 'vending_machine_water' ? '🏧' : '💧';
  return L.divIcon({
    className: '',
    html: `<div style="font-size:1.5rem;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

function popupHtml(s) {
  return `<div class="popup-name">${esc(s.name || 'Refill Point')}</div>
<div class="popup-meta">${typeLabel(s.type)} · ${s.is_free ? '🆓 Free' : '💰 Paid'}</div>
${s.address ? `<div class="popup-meta">${esc(s.address)}</div>` : ''}`;
}

// ── List ───────────────────────────────────────────────────────────
function renderList(list) {
  stationList.innerHTML = '';
  if (!list.length) { emptyMsg.hidden = false; return; }
  emptyMsg.hidden = true;
  list.forEach(s => {
    const li = document.createElement('li');
    li.className = 'station-item';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `${s.name || 'Refill point'}, ${typeLabel(s.type)}`);
    li.innerHTML = `
      <span class="station-icon" aria-hidden="true">${s.type === 'vending_machine_water' ? '🏧' : '💧'}</span>
      <div class="station-info">
        <div class="station-name">${esc(s.name || 'Refill Point')}</div>
        <div class="station-meta">${typeLabel(s.type)}${s.address ? ' · ' + esc(s.address) : ''}</div>
      </div>
      <span class="station-badge${s.is_free ? '' : ' paid'}">${s.is_free ? 'Free' : 'Paid'}</span>`;
    li.addEventListener('click', () => showDetail(s));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') showDetail(s); });
    stationList.appendChild(li);
  });
}

// ── Detail panel ───────────────────────────────────────────────────
function showDetail(s) {
  document.getElementById('detailName').textContent    = s.name || 'Refill Point';
  document.getElementById('detailAddress').textContent = s.address ? '📍 ' + s.address : '';
  document.getElementById('detailType').textContent    = '🚿 ' + typeLabel(s.type);
  document.getElementById('detailFree').textContent    = s.is_free ? '🆓 Free to use' : '💰 Paid';
  document.getElementById('detailVerified').textContent = s.last_verified
    ? '✅ Last verified: ' + new Date(s.last_verified).toLocaleDateString()
    : '';
  detailPanel.hidden = false;
  // Pan map to marker
  map.panTo([s.lat, s.lng]);
}

detailClose.addEventListener('click', () => { detailPanel.hidden = true; });

// ── Add form ───────────────────────────────────────────────────────
addBtn.addEventListener('click', () => {
  // Pre-fill user location
  document.getElementById('fLat').value = userLat.toFixed(6);
  document.getElementById('fLng').value = userLng.toFixed(6);
  formError.hidden = true;
  formOffline.hidden = navigator.onLine;
  formOverlay.hidden = false;
  document.getElementById('fName').focus();
});

formClose.addEventListener('click', closeForm);
formOverlay.addEventListener('click', e => { if (e.target === formOverlay) closeForm(); });

function closeForm() { formOverlay.hidden = true; }

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const lat = parseFloat(document.getElementById('fLat').value);
  const lng = parseFloat(document.getElementById('fLng').value);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showFormError('Please enter valid latitude (−90–90) and longitude (−180–180).');
    return;
  }

  const payload = {
    id: 'user-' + Date.now(),
    lat, lng,
    name:          document.getElementById('fName').value.trim() || undefined,
    type:          document.getElementById('fType').value,
    is_free:       document.getElementById('fFree').checked,
    address:       document.getElementById('fAddress').value.trim() || undefined,
    last_verified: new Date().toISOString()
  };

  if (!navigator.onLine) {
    offlineQueue.push(payload);
    showBanner('📶 Offline – refill point queued and will be submitted when reconnected.', 'warn');
    addLocalStation(payload);
    closeForm();
    return;
  }

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showBanner('✅ Refill point submitted successfully!', 'success');
    addLocalStation(payload);
    closeForm();
  } catch {
    showFormError('Submission failed. Please try again.');
  }
});

/** Optimistically add a new station to the local view */
function addLocalStation(s) {
  stations.unshift(s);
  renderMarkers(stations);
  renderList(stations.slice(0, 10));
  map.panTo([s.lat, s.lng]);
}

// ── Offline queue flush ────────────────────────────────────────────
window.addEventListener('online', flushQueue);
async function flushQueue() {
  if (!offlineQueue.length) return;
  const pending = [...offlineQueue];
  offlineQueue = [];
  for (const payload of pending) {
    try {
      await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      offlineQueue.push(payload); // re-queue on failure
    }
  }
  if (!offlineQueue.length) showBanner('📡 Queued submissions synced!', 'success');
}

// ── Utilities ──────────────────────────────────────────────────────
function showBanner(msg, type = 'warn') {
  statusBanner.textContent = msg;
  statusBanner.className = `status-banner${type === 'error' ? ' error' : type === 'success' ? ' success' : ''}`;
  statusBanner.hidden = false;
  if (type === 'success') setTimeout(() => { statusBanner.hidden = true; }, 4000);
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function typeLabel(type) {
  return type === 'vending_machine_water' ? 'Vending Machine' : 'Drinking Water';
}

/** Basic HTML escaping to prevent XSS in dynamic content */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Haversine distance in km */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
