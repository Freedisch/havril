const $ = (id) => document.getElementById(id);
const DEFAULT_SERVER = 'http://localhost:8080';

function showView(name) {
  ['login', 'connecting', 'connected'].forEach((v) => {
    $(`view-${v}`).style.display = v === name ? 'flex' : 'none';
  });
}

function setMsg(text, type = '') {
  const el = $('msg');
  el.textContent = text;
  el.className = type;
}

function getServerUrl() {
  return $('serverUrl').value.trim().replace(/\/$/, '') || DEFAULT_SERVER;
}

function applyUserInfo({ userName, userEmail, userAvatar }) {
  if (userName) $('user-name').textContent = userName;
  if (userEmail) $('user-email').textContent = userEmail;
  if (userAvatar) $('user-avatar').src = userAvatar;
}

chrome.storage.sync.get(
  ['token', 'serverUrl', 'userName', 'userEmail', 'userAvatar'],
  async (stored) => {
    if (stored.serverUrl) $('serverUrl').value = stored.serverUrl;

    if (stored.token) {
      applyUserInfo(stored);
      await loadConnectedState(
        stored.serverUrl || DEFAULT_SERVER,
        stored.token,
      );
    } else {
      showView('login');
    }
  },
);

// ── AUTH_SUCCESS from background (popup was open during OAuth) ────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'AUTH_SUCCESS') return;
  applyUserInfo(message);
  chrome.storage.sync.get(['token', 'serverUrl'], async (stored) => {
    await loadConnectedState(stored.serverUrl || DEFAULT_SERVER, stored.token);
  });
});

// ── OAuth buttons ─────────────────────────────────────────────────────────────

async function startOAuth(provider) {
  const serverUrl = getServerUrl();
  chrome.storage.sync.set({ serverUrl });
  showView('connecting');

  chrome.runtime.sendMessage(
    { type: 'START_OAUTH', payload: { serverUrl, provider } },
    (res) => {
      if (!res?.ok) {
        showView('login');
        setMsg(res?.error || 'Could not open login tab', 'error');
      }
    },
  );
}

$('btn-google').addEventListener('click', () => startOAuth('google'));
$('btn-github').addEventListener('click', () => startOAuth('github'));
$('btn-cancel').addEventListener('click', () => showView('login'));

// ── Advanced toggle ───────────────────────────────────────────────────────────

$('advanced-toggle').addEventListener('click', () => {
  const open = $('advanced').classList.toggle('open');
  $('advanced-toggle').textContent = (open ? '▾' : '▸') + ' Server URL';
});

// ── Connected state ───────────────────────────────────────────────────────────

async function loadConnectedState(serverUrl, token) {
  try {
    const res = await fetch(`${serverUrl}/v1/memory`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      await chrome.storage.sync.remove([
        'token',
        'userName',
        'userEmail',
        'userAvatar',
      ]);
      showView('login');
      setMsg('Session expired — please sign in again', 'error');
      return;
    }

    const data = await res.json();
    $('stat-memories').textContent = data.count ?? data.memories?.length ?? 0;

    showView('connected');
  } catch {
    showView('login');
    setMsg('Could not reach server', 'error');
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

$('btn-logout').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    $('user-name').textContent = '—';
    $('user-email').textContent = '—';
    $('user-avatar').src = '';
    showView('login');
    setMsg('');
  });
});
