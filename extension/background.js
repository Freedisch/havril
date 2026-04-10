// background.js — MemoAI service worker
// Handles all network requests to the MemoAI API so content scripts
// never need CORS permissions directly.

// ── API helpers ───────────────────────────────────────────────────────────────

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["token", "serverUrl"], (result) => {
      resolve({
        token: result.token || "",
        serverUrl: (result.serverUrl || "http://localhost:8080").replace(/\/$/, ""),
      });
    });
  });
}

async function apiFetch(path, options = {}) {
  const { token, serverUrl } = await getConfig();

  if (!token) {
    throw new Error("MemoAI token not set — open the extension popup to configure it");
  }

  const response = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

// ── Core operations ───────────────────────────────────────────────────────────

async function fetchMemories(query, limit = 5) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiFetch(`/v1/memory/fetch?${params}`);
}

async function submitConversation(conversation, sourceModel) {
  return apiFetch("/v1/memory/submit", {
    method: "POST",
    body: JSON.stringify({ conversation, source_model: sourceModel }),
  });
}

// ── Message handler ───────────────────────────────────────────────────────────
// Content scripts send messages here — they never call the API directly.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case "FETCH_MEMORIES": {
        const { query, limit } = message.payload;
        return fetchMemories(query, limit);
      }
      case "SUBMIT_CONVERSATION": {
        const { conversation, sourceModel } = message.payload;
        return submitConversation(conversation, sourceModel);
      }
      case "GET_CONFIG": {
        return getConfig();
      }
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  };

  // Must return true to use sendResponse asynchronously
  handle()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  return true;
});
