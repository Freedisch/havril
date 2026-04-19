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
  const existing = document.getElementById('memoai-memories-panel');
  if (existing) existing.remove();

  if (!memories || memories.length === 0) return;

  const panel = document.createElement('div');
  panel.id = 'memoai-memories-panel';

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">
        MemoAI — ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} loaded
      </span>
      <button id="memoai-close-panel" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:16px;padding:0;line-height:1;">×</button>
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
    .getElementById('memoai-close-panel')
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
  return `[MemoAI Context — background info about me, use naturally]\n${lines}\n[End Context]\n\n`;
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
        if (!userMessage || userMessage.includes('[MemoAI Context]')) return;

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

// ── Submit button ─────────────────────────────────────────────────────────────

function injectSubmitButton(onClick) {
  if (document.getElementById('memoai-submit-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'memoai-submit-btn';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
      <path d="M12 8v4l3 3"/>
    </svg>
    Save to Memory
  `;

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = `<span style="opacity:0.6">Saving…</span>`;
    try {
      await onClick();
      btn.innerHTML = `✓ Saved`;
      btn.style.background = '#166534';
      btn.style.borderColor = '#16a34a';
      setTimeout(() => resetButton(btn), 2500);
    } catch (err) {
      btn.innerHTML = `✗ Failed`;
      btn.style.background = '#7f1d1d';
      btn.style.borderColor = '#dc2626';
      console.error('[MemoAI]', err);
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
  btn.style.background = '#18181b';
  btn.style.borderColor = '#3f3f46';
}

// ── Toast notification ────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const existing = document.getElementById('memoai-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'memoai-toast';
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
