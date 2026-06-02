'use strict';

// ---- アプリ状態 ----
const state = {
  currentPos: null,       // { lat, lng }
  destination: null,      // { lat, lng }
  deviceHeading: null,    // コンパス方位 (度, 0=北)
  compassAvailable: false,
  watchId: null,
  map: null,
  destMarker: null,
  currentMarker: null,
};

// ---- 画面切り替え ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'nav-screen') {
    onEnterNavScreen();
  } else if (id === 'map-screen') {
    onEnterMapScreen();
  }
}

function onEnterNavScreen() {
  updateNavDisplay();
  initCompass();
}

function onEnterMapScreen() {
  // Leaflet は非表示中に invalidateSize が必要
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
    if (state.currentPos && state.map) {
      state.map.setView([state.currentPos.lat, state.currentPos.lng], 15);
    }
  }, 50);
}

// ---- 地図初期化 ----
function initMap() {
  state.map = L.map('map', {
    center: [35.6812, 139.7671],
    zoom: 14,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(state.map);

  state.map.on('click', e => setDestination(e.latlng.lat, e.latlng.lng));
}

// ---- 目的地設定 ----
function setDestination(lat, lng) {
  state.destination = { lat, lng };

  if (state.destMarker) state.map.removeLayer(state.destMarker);

  state.destMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      html: '📍',
      className: 'dest-pin-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    }),
  }).addTo(state.map);

  document.getElementById('destination-coords').textContent =
    `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  document.getElementById('destination-info').classList.remove('hidden');
  document.getElementById('no-dest-hint').classList.add('hidden');
  document.getElementById('start-nav-btn').classList.remove('hidden');
}

// ---- 位置情報 ----
function startGeolocation() {
  if (!navigator.geolocation) {
    showNavError('このブラウザでは位置情報を利用できません。');
    return;
  }

  state.watchId = navigator.geolocation.watchPosition(
    handlePositionUpdate,
    handlePositionError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
  );
}

function handlePositionUpdate(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  state.currentPos = { lat, lng };

  // 地図上の現在地マーカーを更新
  if (state.map) {
    if (state.currentMarker) {
      state.currentMarker.setLatLng([lat, lng]);
    } else {
      state.currentMarker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#1565C0',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).bindTooltip('現在地', { permanent: false }).addTo(state.map);

      // 初回取得時に地図を現在地に移動
      state.map.setView([lat, lng], 15);
    }
  }

  const statusEl = document.getElementById('location-status');
  statusEl.textContent = '位置情報: 取得済み';
  statusEl.className = 'status-badge ok';

  clearNavError();
  updateNavDisplay();
}

function handlePositionError(err) {
  const messages = {
    [err.PERMISSION_DENIED]:    '位置情報の使用が拒否されました。\nブラウザの設定から許可してください。',
    [err.POSITION_UNAVAILABLE]: '現在地を取得できません。\nGPS信号を確認してください。',
    [err.TIMEOUT]:              '位置情報の取得がタイムアウトしました。\n再試行しています...',
  };
  const msg = messages[err.code] || '位置情報の取得に失敗しました。';

  const statusEl = document.getElementById('location-status');
  statusEl.textContent = '位置情報: エラー';
  statusEl.className = 'status-badge err';

  showNavError(msg);
}

// ---- 方位・距離計算 ----
function toRad(deg) { return deg * Math.PI / 180; }

function calcBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

// ---- ナビ表示更新 ----
function updateNavDisplay() {
  if (!document.getElementById('nav-screen').classList.contains('active')) return;
  if (!state.currentPos || !state.destination) return;

  const bearing = calcBearing(
    state.currentPos.lat, state.currentPos.lng,
    state.destination.lat, state.destination.lng
  );
  const distance = calcDistance(
    state.currentPos.lat, state.currentPos.lng,
    state.destination.lat, state.destination.lng
  );

  // 距離表示
  const distEl = document.getElementById('distance-display');
  if (distance < 20) {
    distEl.textContent = '到着!';
    distEl.style.fontSize = '40px';
  } else {
    distEl.textContent = formatDistance(distance);
    distEl.style.fontSize = '';
  }

  // 方位表示
  document.getElementById('bearing-display').textContent =
    `方位: ${Math.round(bearing)}° (北基準)`;

  // 矢印回転
  let rotation = bearing;
  if (state.deviceHeading !== null) {
    // デバイスの向きを引いて「前方向=矢印上向き」に補正
    rotation = (bearing - state.deviceHeading + 360) % 360;
  }
  document.getElementById('arrow-svg').style.transform = `rotate(${rotation}deg)`;
}

// ---- コンパス (DeviceOrientation) ----
function initCompass() {
  if (typeof DeviceOrientationEvent === 'undefined') {
    setCompassStatus('コンパス非対応端末 — 北基準で表示');
    return;
  }

  // iOS 13+ はユーザーの許可が必要
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.getElementById('compass-perm-btn').classList.remove('hidden');
    setCompassStatus('コンパスを有効にするとより正確になります');
    return;
  }

  // Android / その他は即時登録
  registerOrientationEvents();
}

function registerOrientationEvents() {
  // absolute優先、次にwebkit、最後にrelativeにフォールバック
  window.addEventListener('deviceorientationabsolute', handleOrientation, true);
  window.addEventListener('deviceorientation', handleOrientation, true);
}

function handleOrientation(e) {
  let heading = null;

  if (e.webkitCompassHeading != null) {
    // iOS: webkitCompassHeading は北から時計回りの角度
    heading = e.webkitCompassHeading;
  } else if (e.absolute && e.alpha != null) {
    // Android absolute: alpha は Z軸回転(東から反時計) → 北基準に変換
    heading = (360 - e.alpha) % 360;
  } else if (e.alpha != null) {
    // フォールバック (相対): 精度は低いが使える
    heading = (360 - e.alpha) % 360;
  }

  if (heading !== null) {
    state.deviceHeading = heading;
    if (!state.compassAvailable) {
      state.compassAvailable = true;
      setCompassStatus('コンパス使用中');
      document.getElementById('compass-perm-btn').classList.add('hidden');
    }
    updateNavDisplay();
  }
}

function setCompassStatus(text) {
  document.getElementById('compass-status').textContent = text;
}

// ---- iOS コンパス許可ボタン ----
function requestCompassPermission() {
  DeviceOrientationEvent.requestPermission()
    .then(result => {
      if (result === 'granted') {
        registerOrientationEvents();
        setCompassStatus('コンパス許可済み — 待機中');
      } else {
        setCompassStatus('コンパスが拒否されました — 北基準で表示');
        document.getElementById('compass-perm-btn').classList.add('hidden');
      }
    })
    .catch(() => {
      setCompassStatus('コンパス許可エラー');
      document.getElementById('compass-perm-btn').classList.add('hidden');
    });
}

// ---- エラー表示 ----
function showNavError(msg) {
  const el = document.getElementById('nav-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearNavError() {
  document.getElementById('nav-error').classList.add('hidden');
}

// ---- イベントバインド ----
function bindEvents() {
  document.getElementById('start-nav-btn').addEventListener('click', () => {
    if (!state.destination) return;
    showScreen('nav-screen');
  });

  document.getElementById('change-dest-btn').addEventListener('click', () => {
    showScreen('map-screen');
  });

  document.getElementById('compass-perm-btn').addEventListener('click', () => {
    requestCompassPermission();
  });
}

// ---- Service Worker 登録 ----
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.warn('SW登録失敗:', err));
  }
}

// ---- 初期化 ----
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  startGeolocation();
  bindEvents();
  registerServiceWorker();
});
