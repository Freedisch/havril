// content/shared.js — utilities available to all content scripts

// Send a message to the background service worker and await the response.
function sendToBackground(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.data);
    });
  });
}

// Inject a small floating button into the page.
// Clicking it triggers the submit flow for that platform.
function injectSubmitButton(onClick) {
  // Don't inject twice
  if (document.getElementById("memoai-submit-btn")) return;

  const btn = document.createElement("button");
  btn.id = "memoai-submit-btn";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
      <path d="M12 8v4l3 3"/>
    </svg>
    Save to Memory
  `;

  Object.assign(btn.style, {
    position:     "fixed",
    bottom:       "24px",
    right:        "24px",
    zIndex:       "999999",
    display:      "flex",
    alignItems:   "center",
    gap:          "8px",
    padding:      "10px 16px",
    background:   "#18181b",
    color:        "#f4f4f5",
    border:       "1px solid #3f3f46",
    borderRadius: "8px",
    fontSize:     "13px",
    fontFamily:   "system-ui, sans-serif",
    fontWeight:   "500",
    cursor:       "pointer",
    boxShadow:    "0 4px 12px rgba(0,0,0,0.3)",
    transition:   "all 0.15s ease",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#27272a";
    btn.style.borderColor = "#71717a";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#18181b";
    btn.style.borderColor = "#3f3f46";
  });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.innerHTML = `<span style="opacity:0.6">Saving…</span>`;
    try {
      await onClick();
      btn.innerHTML = `✓ Saved`;
      btn.style.background = "#166534";
      btn.style.borderColor = "#16a34a";
      setTimeout(() => resetButton(btn), 2500);
    } catch (err) {
      btn.innerHTML = `✗ Failed`;
      btn.style.background = "#7f1d1d";
      btn.style.borderColor = "#dc2626";
      console.error("[MemoAI]", err);
      setTimeout(() => resetButton(btn), 2500);
    }
  });

  document.body.appendChild(btn);
}

function resetButton(btn) {
  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
      <path d="M12 8v4l3 3"/>
    </svg>
    Save to Memory
  `;
  btn.style.background = "#18181b";
  btn.style.borderColor = "#3f3f46";
}

// Show a temporary toast notification at the top of the screen.
function showToast(message, type = "info") {
  const existing = document.getElementById("memoai-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "memoai-toast";
  toast.textContent = message;

  const bg = type === "error" ? "#7f1d1d" : type === "success" ? "#14532d" : "#18181b";

  Object.assign(toast.style, {
    position:     "fixed",
    top:          "16px",
    left:         "50%",
    transform:    "translateX(-50%)",
    zIndex:       "999999",
    padding:      "10px 20px",
    background:   bg,
    color:        "#f4f4f5",
    borderRadius: "8px",
    fontSize:     "13px",
    fontFamily:   "system-ui, sans-serif",
    fontWeight:   "500",
    boxShadow:    "0 4px 12px rgba(0,0,0,0.3)",
    pointerEvents: "none",
    opacity:       "0",
    transition:    "opacity 0.2s ease",
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = "1"; });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Inject fetched memories into the page as a floating panel.
function showMemoriesPanel(memories) {
  const existing = document.getElementById("memoai-memories-panel");
  if (existing) existing.remove();

  if (!memories || memories.length === 0) return;

  const panel = document.createElement("div");
  panel.id = "memoai-memories-panel";

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">
        MemoAI — ${memories.length} memor${memories.length === 1 ? "y" : "ies"} loaded
      </span>
      <button id="memoai-close-panel" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:16px;padding:0;line-height:1;">×</button>
    </div>
    <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;">
      ${memories.map(m => `
        <li style="font-size:12px;color:#d4d4d8;padding:6px 8px;background:#27272a;border-radius:4px;border-left:2px solid #3f3f46;">
          ${escapeHtml(m.content)}
        </li>
      `).join("")}
    </ul>
  `;

  Object.assign(panel.style, {
    position:     "fixed",
    bottom:       "80px",
    right:        "24px",
    zIndex:       "999998",
    width:        "300px",
    maxHeight:    "320px",
    overflowY:    "auto",
    background:   "#18181b",
    border:       "1px solid #3f3f46",
    borderRadius: "10px",
    padding:      "14px",
    fontFamily:   "system-ui, sans-serif",
    boxShadow:    "0 8px 24px rgba(0,0,0,0.4)",
  });

  document.body.appendChild(panel);

  document.getElementById("memoai-close-panel").addEventListener("click", () => {
    panel.remove();
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
