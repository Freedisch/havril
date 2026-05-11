const $ = (id) => document.getElementById(id);
const DEFAULT_SERVER = 'https://api.tryhavril.com';

let _activeServerUrl = DEFAULT_SERVER;
let _activeToken = null;

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(dark) {
  document.body.dataset.theme = dark ? 'dark' : 'light';
  $('icon-moon').style.display = dark ? 'none' : '';
  $('icon-sun').style.display = dark ? '' : 'none';
}

chrome.storage.sync.get(['havrilTheme'], (r) => {
  applyTheme(r?.havrilTheme === 'dark');
});

$('btn-theme').addEventListener('click', () => {
  const dark = document.body.dataset.theme !== 'dark';
  applyTheme(dark);
  chrome.storage.sync.set({ havrilTheme: dark ? 'dark' : 'light' });
});

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

Promise.all([
  new Promise((r) => chrome.storage.session.get(['token'], r)),
  new Promise((r) =>
    chrome.storage.sync.get(
      ['serverUrl', 'userName', 'userEmail', 'userAvatar'],
      r,
    ),
  ),
]).then(async ([session, sync]) => {
  if (sync.serverUrl) $('serverUrl').value = sync.serverUrl;
  if (session.token) {
    applyUserInfo(sync);
    await loadConnectedState(sync.serverUrl || DEFAULT_SERVER, session.token);
  } else {
    showView('login');
  }
});

// ── AUTH_SUCCESS from background (popup was open during OAuth) ────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'AUTH_SUCCESS') return;
  applyUserInfo(message);
  Promise.all([
    new Promise((r) => chrome.storage.session.get(['token'], r)),
    new Promise((r) => chrome.storage.sync.get(['serverUrl'], r)),
  ]).then(async ([session, sync]) => {
    await loadConnectedState(sync.serverUrl || DEFAULT_SERVER, session.token);
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
  _activeServerUrl = serverUrl;
  _activeToken = token;
  try {
    const res = await fetch(`${serverUrl}/v1/memory`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      await chrome.storage.sync.remove(['userName', 'userEmail', 'userAvatar']);
      await chrome.storage.session.remove(['token']);
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

// ── MCP Token ─────────────────────────────────────────────────────────────────

$('btn-generate-mcp').addEventListener('click', async () => {
  const btn = $('btn-generate-mcp');
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const res = await fetch(`${_activeServerUrl}/v1/mcp/token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${_activeToken}` },
    });
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    $('mcp-token-value').textContent = data.mcp_token;
    $('mcp-token-display').style.display = 'block';
    $('btn-copy-mcp').textContent = 'Copy';
  } catch {
    btn.textContent = 'Error';
    setTimeout(() => {
      btn.textContent = 'Generate';
      btn.disabled = false;
    }, 2000);
    return;
  }
  btn.textContent = 'Regenerate';
  btn.disabled = false;
});

$('btn-copy-mcp').addEventListener('click', () => {
  const val = $('mcp-token-value').textContent;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => {
    $('btn-copy-mcp').textContent = 'Copied!';
    setTimeout(() => {
      $('btn-copy-mcp').textContent = 'Copy';
    }, 2000);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

$('btn-logout').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    $('user-name').textContent = '—';
    $('user-email').textContent = '—';
    $('user-avatar').src = '';
    $('mcp-token-display').style.display = 'none';
    $('mcp-token-value').textContent = '';
    $('btn-generate-mcp').textContent = 'Generate';
    $('btn-generate-mcp').disabled = false;
    _activeToken = null;
    showView('login');
    setMsg('');
  });
});
