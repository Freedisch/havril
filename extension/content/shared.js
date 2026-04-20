// content/shared.js — loaded before every platform script
// Every function here is automatically available in claude.js, chatgpt.js, gemini.js

// ── Background communication ──────────────────────────────────────────────────

function sendToBackground(type, payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message || '';
          if (
            msg.includes('Extension context invalidated') ||
            msg.includes('receiving end does not exist')
          ) {
            reject(
              new Error('Extension was reloaded — please refresh this page'),
            );
            return;
          }
          reject(new Error(msg));
          return;
        }
        if (!response.ok) {
          reject(new Error(response.error));
          return;
        }
        resolve(response.data);
      });
    } catch (err) {
      reject(new Error('Extension was reloaded — please refresh this page'));
    }
  });
}

// ── Memory panel ──────────────────────────────────────────────────────────────

// Shows a floating panel bottom-right listing the loaded memories.
function showMemoriesPanel(memories) {
  const existing = document.getElementById('havril-memories-panel');
  if (existing) existing.remove();

  if (!memories || memories.length === 0) return;

  const panel = document.createElement('div');
  panel.id = 'havril-memories-panel';

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">
        Havril — ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} loaded
      </span>
      <button id="havril-close-panel" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:16px;padding:0;line-height:1;">×</button>
    </div>
    <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;">
      ${memories
        .map(
          (m) => `
        <li style="font-size:12px;color:#d4d4d8;padding:6px 8px;background:#27272a;border-radius:4px;border-left:2px solid #3f3f46;">
          ${escapeHtml(m.content)}
        </li>
      `,
        )
        .join('')}
    </ul>
  `;

  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '80px',
    right: '24px',
    zIndex: '999998',
    width: '300px',
    maxHeight: '320px',
    overflowY: 'auto',
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '14px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  });

  document.body.appendChild(panel);

  document
    .getElementById('havril-close-panel')
    .addEventListener('click', () => {
      panel.remove();
    });
}

// ── Input injection ───────────────────────────────────────────────────────────

// Waits for the input element to appear in the DOM.
function waitForElement(getEl, timeoutMs) {
  return new Promise((resolve) => {
    const el = getEl();
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(() => {
      const found = getEl();
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

// Gets the current text value of an input or contenteditable element.
function getInputValue(el) {
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
    ? el.value
    : el.innerText || '';
}

// Sets the value of an input or contenteditable element in a way that
// triggers React/Angular change detection.
function setInputValue(el, value) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // contenteditable div (Claude, Gemini)
    el.innerText = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

function buildContextBlock(memories) {
  const lines = memories.map((m) => `- ${m.content}`).join('\n');
  return `[Havril Context — background info about me, use naturally]\n${lines}\n[End Context]\n\n`;
}

// Intercepts Enter key, fetches memories using what the user typed as the
// query, prepends the context block, then sends the message.
// getSendButton is optional — falls back to re-dispatching Enter.
function watchInputAndInject(getInputEl, getSendButton = null) {
  waitForElement(getInputEl, 8000).then((inputEl) => {
    if (!inputEl) return;

    inputEl.addEventListener(
      'keydown',
      async (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;

        const userMessage = getInputValue(inputEl).trim();
        if (!userMessage || userMessage.includes('[Havril Context]')) return;

        // Block the platform from sending while we fetch
        e.preventDefault();
        e.stopImmediatePropagation();

        const result = await sendToBackground('FETCH_MEMORIES', {
          query: userMessage,
          limit: 5,
        }).catch(() => null);

        if (result?.memories?.length) {
          const contextBlock = buildContextBlock(result.memories);
          setInputValue(inputEl, contextBlock + userMessage);
          showToast(`✓ ${result.memories.length} memories loaded`, 'success');
        }

        // Now send the message
        const sendBtn = getSendButton?.();
        if (sendBtn) {
          sendBtn.click();
        } else {
          inputEl.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true,
            }),
          );
        }
      },
      true,
    ); // capture phase — runs before the platform's own listeners
  });
}

// ── Havril button + panel (single floating UI) ────────────────────────────────

// One button at bottom-right. Opens a panel with save + memory search/paste.
// getInputEl: function returning the platform chat input element.
// onSave: async function that saves the current conversation.
function injectMemoryPickerButton(getInputEl, onSave) {
  document.getElementById('havril-picker-btn')?.remove();
  document.getElementById('havril-picker-panel')?.remove();

  let searchTimeout = null;
  let currentMemories = [];

  // ── Panel ──────────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'havril-picker-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '68px',
    right: '24px',
    zIndex: '999999',
    width: '320px',
    maxHeight: '460px',
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    display: 'none',
    flexDirection: 'column',
    overflow: 'hidden',
  });

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #3f3f46;flex-shrink:0;">
      <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Havril</span>
      <button id="havril-picker-close" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px;" title="Close">&#xD7;</button>
    </div>
    <div style="padding:10px 12px;border-bottom:1px solid #3f3f46;flex-shrink:0;">
      <button id="havril-save-btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 12px;background:#27272a;color:#f4f4f5;border:1px solid #3f3f46;border-radius:7px;font-size:13px;font-family:system-ui,sans-serif;font-weight:500;cursor:pointer;transition:all 0.15s;box-sizing:border-box;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        Save conversation
      </button>
    </div>
    <div style="padding:10px 12px;border-bottom:1px solid #27272a;flex-shrink:0;">
      <input id="havril-picker-search" type="text" placeholder="Search memories…" autocomplete="off" style="width:100%;box-sizing:border-box;background:#09090b;border:1px solid #3f3f46;border-radius:6px;color:#f4f4f5;font-size:13px;padding:7px 10px;outline:none;font-family:system-ui,sans-serif;">
    </div>
    <div id="havril-picker-results" style="overflow-y:auto;flex:1;"></div>
  `;

  const resultsEl = panel.querySelector('#havril-picker-results');
  const searchInput = panel.querySelector('#havril-picker-search');
  const saveBtn = panel.querySelector('#havril-save-btn');

  // ── Floating trigger button ────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'havril-picker-btn';
  btn.title = 'Havril';
  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>
    </svg>
    Havril
  `;
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    background: '#18181b',
    color: '#f4f4f5',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'all 0.15s ease',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#27272a';
    btn.style.borderColor = '#71717a';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#18181b';
    btn.style.borderColor = '#3f3f46';
  });

  // ── Open / close ───────────────────────────────────────────────────────────
  function openPanel() {
    panel.style.display = 'flex';
    searchInput.value = '';
    loadAllMemories();
  }

  function closePanel() {
    panel.style.display = 'none';
  }

  btn.addEventListener('click', () => {
    panel.style.display !== 'none' ? closePanel() : openPanel();
  });

  panel.querySelector('#havril-picker-close')?.addEventListener('click', closePanel);

  // ── Save button ────────────────────────────────────────────────────────────
  if (onSave && saveBtn) {
    saveBtn.addEventListener('mouseenter', () => {
      if (!saveBtn.disabled) saveBtn.style.background = '#3f3f46';
    });
    saveBtn.addEventListener('mouseleave', () => {
      if (!saveBtn.disabled) saveBtn.style.background = '#27272a';
    });

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.6';
      saveBtn.textContent = 'Saving…';
      try {
        await onSave();
        saveBtn.textContent = '✓ Saved';
        saveBtn.style.background = '#166534';
        saveBtn.style.borderColor = '#16a34a';
        saveBtn.style.opacity = '1';
        setTimeout(resetSaveBtn, 2500);
      } catch (err) {
        saveBtn.textContent = '✗ Failed';
        saveBtn.style.background = '#7f1d1d';
        saveBtn.style.borderColor = '#dc2626';
        saveBtn.style.opacity = '1';
        console.error('[Havril]', err);
        setTimeout(resetSaveBtn, 2500);
      }
    });
  } else if (saveBtn) {
    saveBtn.style.display = 'none';
  }

  function resetSaveBtn() {
    saveBtn.disabled = false;
    saveBtn.style.background = '#27272a';
    saveBtn.style.borderColor = '#3f3f46';
    saveBtn.style.opacity = '1';
    saveBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
      </svg>
      Save conversation
    `;
  }

  // ── Search input ───────────────────────────────────────────────────────────
  searchInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') closePanel();
  });

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const q = e.target.value.trim();
    if (q.length === 0) {
      loadAllMemories();
    } else if (q.length >= 2) {
      searchTimeout = setTimeout(() => searchMemories(q), 350);
    }
  });

  // ── Data fetching ──────────────────────────────────────────────────────────
  async function loadAllMemories() {
    showPlaceholder('Loading…');
    try {
      const data = await sendToBackground('LIST_MEMORIES', {});
      const memories = data?.memories || (Array.isArray(data) ? data : []);
      renderResults(memories);
    } catch (err) {
      const msg = err.message?.includes('token not set')
        ? 'Sign in via the Havril popup'
        : 'Could not load memories';
      showPlaceholder(msg);
    }
  }

  async function searchMemories(query) {
    try {
      const data = await sendToBackground('FETCH_MEMORIES', { query, limit: 10 });
      renderResults(data?.memories || []);
    } catch (_e) {
      // keep previous results on search error
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function showPlaceholder(text) {
    resultsEl.innerHTML = `<div style="padding:24px 14px;text-align:center;color:#71717a;font-size:12px;">${escapeHtml(text)}</div>`;
  }

  const TYPE_COLORS = {
    semantic: '#6366f1',
    episodic: '#f59e0b',
    procedural: '#10b981',
    summary: '#3b82f6',
  };

  function renderResults(memories) {
    currentMemories = memories;
    if (memories.length === 0) {
      showPlaceholder('No memories found');
      return;
    }
    resultsEl.innerHTML = memories.map((m, i) => {
      const color = TYPE_COLORS[m.type] || '#71717a';
      const preview = (m.content || '').length > 110
        ? m.content.slice(0, 110) + '…'
        : m.content || '';
      const pct = Math.round((m.importance || 0) * 100);
      return `<div class="havril-mi" data-idx="${i}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #27272a;transition:background 0.1s;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:10px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${color};background:${color}22;padding:1px 6px;border-radius:3px;">${escapeHtml(m.type || 'memory')}</span>
          <span style="font-size:10px;color:#52525b;margin-left:auto;">${pct}%</span>
        </div>
        <div style="font-size:12px;color:#d4d4d8;line-height:1.5;">${escapeHtml(preview)}</div>
      </div>`;
    }).join('');
  }

  resultsEl.addEventListener('click', (e) => {
    const item = e.target.closest('.havril-mi');
    if (!item) return;
    const memory = currentMemories[parseInt(item.dataset.idx, 10)];
    if (!memory) return;
    pasteMemoryToInput(memory.content);
    closePanel();
  });

  resultsEl.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.havril-mi');
    if (item) item.style.background = '#27272a';
  });
  resultsEl.addEventListener('mouseout', (e) => {
    const item = e.target.closest('.havril-mi');
    if (item) item.style.background = 'transparent';
  });

  // ── Paste to AI input ──────────────────────────────────────────────────────
  function pasteMemoryToInput(content) {
    const inputEl = getInputEl();
    if (!inputEl) {
      showToast('Chat input not found — click the chat box first', 'error');
      return;
    }
    const existing = getInputValue(inputEl).trim();
    setInputValue(inputEl, existing ? `${existing}\n\n${content}` : content);
    inputEl.focus();
    showToast('Memory pasted ✓', 'success');
  }

  document.body.appendChild(panel);
  document.body.appendChild(btn);
}

// ── Toast notification ────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const existing = document.getElementById('havril-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'havril-toast';
  toast.textContent = message;

  const bg =
    type === 'error' ? '#7f1d1d' : type === 'success' ? '#14532d' : '#18181b';

  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '999999',
    padding: '10px 20px',
    background: bg,
    color: '#f4f4f5',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
