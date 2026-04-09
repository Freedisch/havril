// popup/popup.js

const $ = (id) => document.getElementById(id);

function setStatus(state, text) {
  const dot = $("status-dot");
  dot.className = "status-dot";
  if (state === "connected") dot.classList.add("connected");
  if (state === "error")     dot.classList.add("error");
  $("status-text").textContent = text;
}

function setMsg(text, type = "") {
  const el = $("msg");
  el.textContent = text;
  el.className = type;
}

// Load saved config into inputs on open
chrome.storage.sync.get(["token", "serverUrl"], (result) => {
  if (result.serverUrl) $("serverUrl").value = result.serverUrl;
  if (result.token)     $("token").value     = result.token;
  if (result.token && result.serverUrl) {
    testConnection(result.serverUrl, result.token, false);
  }
});

// Save button
$("save-btn").addEventListener("click", () => {
  const serverUrl = $("serverUrl").value.trim().replace(/\/$/, "");
  const token     = $("token").value.trim();

  if (!serverUrl) { setMsg("Server URL is required", "error"); return; }
  if (!token)     { setMsg("Token is required", "error"); return; }

  chrome.storage.sync.set({ serverUrl, token }, () => {
    setMsg("Saved", "success");
    testConnection(serverUrl, token, true);
  });
});

// Test button
$("test-btn").addEventListener("click", () => {
  const serverUrl = $("serverUrl").value.trim().replace(/\/$/, "");
  const token     = $("token").value.trim();
  if (!serverUrl || !token) { setMsg("Enter server URL and token first", "error"); return; }
  testConnection(serverUrl, token, true);
});

async function testConnection(serverUrl, token, showResult) {
  setStatus("", "Connecting…");

  try {
    const response = await fetch(`${serverUrl}/v1/health`);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    // Try fetching memories to verify the token works
    const memRes = await fetch(`${serverUrl}/v1/memory`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (memRes.status === 401) {
      setStatus("error", "Invalid token");
      if (showResult) setMsg("Token is invalid", "error");
      return;
    }

    if (!memRes.ok) throw new Error(`Memory API returned ${memRes.status}`);

    const data = await memRes.json();
    const count = data.count ?? data.memories?.length ?? 0;

    setStatus("connected", "Connected");
    $("stat-memories").textContent = count;
    $("stat-models").textContent   = "3";
    $("stat-sessions").textContent  = "—";

    if (showResult) setMsg("Connection successful", "success");
  } catch (err) {
    setStatus("error", "Connection failed");
    if (showResult) setMsg(err.message, "error");
  }
}
