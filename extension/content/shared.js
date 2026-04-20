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

// ── Design tokens (matching landing page) ────────────────────────────────────
const _T = {
  bg:       '#ffffff',
  surface:  '#fafafa',
  hover:    '#f4f4f5',
  border:   '#e4e4e7',
  border2:  '#d4d4d8',
  text:     '#09090b',
  muted:    '#52525b',
  subtle:   '#a1a1aa',
  font:     "'Sora', system-ui, -apple-system, sans-serif",
  mono:     "'JetBrains Mono', 'SF Mono', monospace",
  radius:   '8px',
};

// ── Memory panel ──────────────────────────────────────────────────────────────

function showMemoriesPanel(memories) {
  const existing = document.getElementById('havril-memories-panel');
  if (existing) existing.remove();
  if (!memories || memories.length === 0) return;

  const panel = document.createElement('div');
  panel.id = 'havril-memories-panel';

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${_T.subtle};font-family:${_T.mono};">
        Havril — ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} loaded
      </span>
      <button id="havril-close-panel" style="background:none;border:none;color:${_T.subtle};cursor:pointer;font-size:16px;padding:0;line-height:1;transition:color 0.15s;">×</button>
    </div>
    <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;">
      ${memories.map((m) => `
        <li style="font-size:12px;color:${_T.muted};padding:7px 10px;background:${_T.surface};border-radius:6px;border-left:2px solid ${_T.border2};line-height:1.5;font-family:${_T.font};">
          ${escapeHtml(m.content)}
        </li>
      `).join('')}
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
    background: _T.bg,
    border: `1px solid ${_T.border}`,
    borderRadius: '10px',
    padding: '14px',
    fontFamily: _T.font,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  });

  document.body.appendChild(panel);
  document.getElementById('havril-close-panel').addEventListener('click', () => panel.remove());
}

// ── Input injection ───────────────────────────────────────────────────────────

function waitForElement(getEl, timeoutMs) {
  return new Promise((resolve) => {
    const el = getEl();
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
      const found = getEl();
      if (found) { observer.disconnect(); resolve(found); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
  });
}

function getInputValue(el) {
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
    ? el.value
    : el.innerText || '';
}

function setInputValue(el, value) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value',
    )?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    el.innerText = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

function buildContextBlock(memories) {
  const lines = memories.map((m) => `- ${m.content}`).join('\n');
  return `[Havril Context — background info about me, use naturally]\n${lines}\n[End Context]\n\n`;
}

function watchInputAndInject(getInputEl, getSendButton = null) {
  waitForElement(getInputEl, 8000).then((inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const userMessage = getInputValue(inputEl).trim();
      if (!userMessage || userMessage.includes('[Havril Context]')) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const result = await sendToBackground('FETCH_MEMORIES', {
        query: userMessage, limit: 5,
      }).catch(() => null);

      if (result?.memories?.length) {
        setInputValue(inputEl, buildContextBlock(result.memories) + userMessage);
        showToast(`✓ ${result.memories.length} memories loaded`, 'success');
      }

      const sendBtn = getSendButton?.();
      if (sendBtn) {
        sendBtn.click();
      } else {
        inputEl.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
        }));
      }
    }, true);
  });
}

// ── Havril button + panel (single floating UI) ────────────────────────────────

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
    background: _T.bg,
    border: `1px solid ${_T.border}`,
    borderRadius: '12px',
    fontFamily: _T.font,
    boxShadow: '0 12px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
    display: 'none',
    flexDirection: 'column',
    overflow: 'hidden',
  });

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid ${_T.border};flex-shrink:0;">
      <span style="font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${_T.subtle};font-family:${_T.mono};">Havril</span>
      <button id="havril-picker-close" style="background:none;border:none;color:${_T.subtle};cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:4px;transition:color 0.15s;">&#xD7;</button>
    </div>
    <div style="padding:10px 12px;border-bottom:1px solid ${_T.border};flex-shrink:0;">
      <button id="havril-save-btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 14px;background:${_T.text};color:#ffffff;border:none;border-radius:7px;font-size:13px;font-family:${_T.font};font-weight:500;cursor:pointer;transition:background 0.15s;box-sizing:border-box;letter-spacing:-0.01em;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        Save conversation
      </button>
    </div>
    <div style="padding:10px 12px;border-bottom:1px solid ${_T.border};flex-shrink:0;">
      <div style="position:relative;display:flex;align-items:center;">
        <svg style="position:absolute;left:9px;pointer-events:none;" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${_T.subtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input id="havril-picker-search" type="text" placeholder="Search memories…" autocomplete="off" style="width:100%;box-sizing:border-box;background:${_T.surface};border:1px solid ${_T.border};border-radius:7px;color:${_T.text};font-size:13px;padding:7px 10px 7px 30px;outline:none;font-family:${_T.font};transition:border-color 0.15s;letter-spacing:-0.01em;">
      </div>
    </div>
    <div id="havril-picker-results" style="overflow-y:auto;flex:1;"></div>
  `;

  const resultsEl = panel.querySelector('#havril-picker-results');
  const searchInput = panel.querySelector('#havril-picker-search');
  const saveBtn = panel.querySelector('#havril-save-btn');

  // Focus border effect on search input
  searchInput.addEventListener('focus', () => { searchInput.style.borderColor = _T.text; });
  searchInput.addEventListener('blur',  () => { searchInput.style.borderColor = _T.border; });

  // ── Floating trigger button ────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'havril-picker-btn';
  btn.title = 'Havril';
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>
    </svg>
    <span style="font-family:${_T.mono};font-size:12px;letter-spacing:0.02em;">Havril</span>
  `;
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 16px',
    background: _T.bg,
    color: _T.text,
    border: `1px solid ${_T.border}`,
    borderRadius: _T.radius,
    fontSize: '13px',
    fontFamily: _T.font,
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = _T.hover;
    btn.style.borderColor = _T.border2;
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = _T.bg;
    btn.style.borderColor = _T.border;
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
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
      if (!saveBtn.disabled) saveBtn.style.background = '#1c1c1f';
    });
    saveBtn.addEventListener('mouseleave', () => {
      if (!saveBtn.disabled) saveBtn.style.background = _T.text;
    });

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.65';
      saveBtn.textContent = 'Saving…';
      try {
        await onSave();
        saveBtn.textContent = '✓ Saved';
        saveBtn.style.background = '#15803d';
        saveBtn.style.opacity = '1';
        setTimeout(resetSaveBtn, 2500);
      } catch (err) {
        saveBtn.textContent = '✗ Failed';
        saveBtn.style.background = '#dc2626';
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
    saveBtn.style.background = _T.text;
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
    resultsEl.innerHTML = `<div style="padding:28px 14px;text-align:center;color:${_T.subtle};font-size:12px;font-family:${_T.font};">${escapeHtml(text)}</div>`;
  }

  const TYPE_COLORS = {
    semantic:   '#6366f1',
    episodic:   '#b45309',
    procedural: '#059669',
    summary:    '#2563eb',
  };

  function renderResults(memories) {
    currentMemories = memories;
    if (memories.length === 0) { showPlaceholder('No memories found'); return; }

    resultsEl.innerHTML = memories.map((m, i) => {
      const color = TYPE_COLORS[m.type] || _T.subtle;
      const bgAlpha = `${color}12`;
      const preview = (m.content || '').length > 110
        ? m.content.slice(0, 110) + '…'
        : m.content || '';
      const pct = Math.round((m.importance || 0) * 100);
      return `<div class="havril-mi" data-idx="${i}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid ${_T.surface};transition:background 0.1s;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${color};background:${bgAlpha};padding:2px 7px;border-radius:4px;font-family:${_T.mono};">${escapeHtml(m.type || 'memory')}</span>
          <span style="font-size:10px;color:${_T.subtle};margin-left:auto;font-family:${_T.mono};">${pct}%</span>
        </div>
        <div style="font-size:12px;color:${_T.muted};line-height:1.55;font-family:${_T.font};">${escapeHtml(preview)}</div>
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
    if (item) item.style.background = _T.hover;
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

  const styles = {
    success: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    error:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    info:    { bg: _T.bg,     color: _T.text,   border: _T.border },
  };
  const s = styles[type] || styles.info;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '999999',
    padding: '9px 18px',
    background: s.bg,
    color: s.color,
    border: `1px solid ${s.border}`,
    borderRadius: _T.radius,
    fontSize: '13px',
    fontFamily: _T.font,
    fontWeight: '500',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
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
