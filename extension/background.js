// Handles all network requests to the havril API so content scripts
// never need CORS permissions directly.

const API_URL = 'https://api.tryhavril.com';

async function getConfig() {
  const session = await new Promise((r) => chrome.storage.session.get(['token'], r));
  return {
    token: session.token || '',
    serverUrl: API_URL,
  };
}

async function apiFetch(path, options = {}) {
  const { token, serverUrl } = await getConfig();

  if (!token) {
    throw new Error(
      'Havril token not set — open the extension popup to configure it',
    );
  }

  const response = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchMemories(query, limit = 5) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiFetch(`/v1/memory/fetch?${params}`);
}

async function submitConversation(conversation, sourceModel) {
  return apiFetch('/v1/memory/submit', {
    method: 'POST',
    body: JSON.stringify({ conversation, source_model: sourceModel }),
  });
}

// ── OAuth tab handling ────────────────────────────────────────────────────────

// Watch for the extension OAuth callback URL.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.includes('/v1/auth/ext/done')) return;

  const { authTabId } = await chrome.storage.session.get(['authTabId']);
  if (tabId !== authTabId) return;

  const url = new URL(tab.url);
  const token = url.searchParams.get('token');
  const userName = url.searchParams.get('name') || '';
  const userEmail = url.searchParams.get('email') || '';
  const userAvatar = url.searchParams.get('avatar') || '';
  if (!token) return;

  await chrome.storage.session.set({ token });
  await chrome.storage.sync.set({ userName, userEmail, userAvatar });

  await chrome.storage.session.remove(['authTabId']);
  chrome.tabs.remove(tabId);

  // Notify any open popup with user data so it doesn't need a second storage read
  chrome.runtime
    .sendMessage({
      type: 'AUTH_SUCCESS',
      userName,
      userEmail,
      userAvatar,
    })
    .catch(() => {});
});

// Content scripts send messages here — they never call the API directly.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case 'FETCH_MEMORIES': {
        const { query, limit } = message.payload;
        return fetchMemories(query, limit);
      }
      case 'SUBMIT_CONVERSATION': {
        const { conversation, sourceModel } = message.payload;
        return submitConversation(conversation, sourceModel);
      }
      case 'LIST_MEMORIES': {
        return apiFetch('/v1/memory');
      }
      case 'GET_CONFIG': {
        return getConfig();
      }
      case 'START_OAUTH': {
        const { provider } = message.payload;
        const tab = await chrome.tabs.create({
          url: `${API_URL}/v1/auth/${provider}?ext=1`,
        });
        await chrome.storage.session.set({ authTabId: tab.id });
        return { started: true };
      }
      case 'LOGOUT': {
        await chrome.storage.session.remove(['token']);
        await chrome.storage.sync.remove([
          'userName',
          'userEmail',
          'userAvatar',
        ]);
        return { ok: true };
      }
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  };

  handle()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  return true;
});
