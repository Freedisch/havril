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

// Fetch memories and inject them into the input box the first time the
// user focuses it. The AI receives the context block as part of the message.
// getInputEl — function that returns the input DOM element (or null)
// query      — text to search memories with (page title or recent message)
async function injectMemoriesIntoInput(getInputEl, query) {
  if (!query) return;

  let memories;
  try {
    const result = await sendToBackground('FETCH_MEMORIES', {
      query,
      limit: 5,
    });
    memories = result?.memories;
  } catch (err) {
    console.debug('[MemoAI] fetch skipped:', err.message);
    return;
  }

  if (!memories || memories.length === 0) return;

  const contextBlock = buildContextBlock(memories);
  const inputEl = await waitForElement(getInputEl, 8000);
  if (!inputEl) return;

  // Only inject once per page load
  if (inputEl.dataset.memoaiInjected) return;
  inputEl.dataset.memoaiInjected = 'true';

  let injected = false;
  const inject = () => {
    if (injected) return;
    injected = true;
    const current = getInputValue(inputEl);
    if (current.includes('[MemoAI Context]')) return;
    setInputValue(inputEl, contextBlock + current);
    showToast('✓ Memory context loaded', 'success');
  };

  inputEl.addEventListener('focus', inject, { once: true });
}

// watch user input before injecting response
function watchInputAndInject(getInputEl, getSendButton = null) {
  waitForElement(getInputEl, 8000).then((inputEl) => {
    if (!inputEl) return;
    let inject = false;
    inputEl.addEventListener(
      'keydown',
      async (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.inject) {
          inject = true;
          const userMessage = getInputValue(inputEl);
          if (!userMessage.trim() || userMessage.includes('[MemoAI Context]'))
            return;
          e.preventDefault();
          e.stopImmediatePropagation();

          const result = await sendToBackground('FETCH_MEMORIES', {
            query: userMessage.trim(),
            limit: 3,
          }).catch(() => null);
          if (!result?.memories?.length) return;

          const contextBlock = buildContextBlock(result.memories);
          setInputValue(inputEl, contextBlock + userMessage);
          showToast(
            `✓ ${result.memories.length} memor${result.memories.length === 1 ? 'y' : 'ies'} loaded`,
            'success',
          );
          // const sendBtn = getSendButton?.();
          // if (sendBtn) {
          //   sendBtn.click();
          // } else {
          //   inputEl.dispatchEvent(
          //     new KeyboardEvent('keydown', {
          //       key: 'Enter',
          //       code: 'Enter',
          //       bubbles: true,
          //       cancelable: true,
          //     }),
          //   );
          // }
        }
      },
      true,
    );
  });
}

function buildContextBlock(memories) {
  const lines = memories.map((m) => `- ${m.content}`).join('\n');
  return `[MemoAI Context — background info about me, use naturally]\n${lines}\n[End Context]\n\n`;
}

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

function getInputValue(el) {
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
    ? el.value
    : el.innerText || '';
}

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
    // contenteditable
    el.innerText = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

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

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
