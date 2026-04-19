// content/chatgpt.js — MemoAI content script for chatgpt.com

const SOURCE_MODEL = 'chatgpt';
function getChatGPTInput() {
  return (
    document.querySelector('#prompt-textarea') ||
    document.querySelector('textarea[data-id="root"]') ||
    document.querySelector('textarea[placeholder]')
  );
}

// Extract conversation turns from the ChatGPT DOM.
function extractConversation() {
  const messages = [];

  // ChatGPT uses data-message-author-role on each turn's container
  const turns = document.querySelectorAll('[data-message-author-role]');

  turns.forEach((el) => {
    const role = el.getAttribute('data-message-author-role'); // "user" | "assistant"
    const content = el.innerText?.trim();
    if (content && (role === 'user' || role === 'assistant')) {
      messages.push({ role, content });
    }
  });

  return messages;
}

async function loadMemories() {
  const firstUserTurn = document.querySelector(
    '[data-message-author-role="user"]',
  );
  if (!firstUserTurn) return;

  const query = firstUserTurn.innerText?.trim();
  if (!query) return;

  try {
    const result = await sendToBackground('FETCH_MEMORIES', {
      query,
      limit: 5,
    });
    if (result.memories?.length > 0) {
      showMemoriesPanel(result.memories);
    }
  } catch (err) {
    console.debug('[MemoAI] fetch skipped:', err.message);
  }
}

async function submitConversation() {
  const conversation = extractConversation();
  if (conversation.length === 0) {
    throw new Error('No conversation found on this page');
  }

  const result = await sendToBackground('SUBMIT_CONVERSATION', {
    conversation,
    sourceModel: SOURCE_MODEL,
  });

  showToast(
    `✓ Saved ${result.memories_created} memor${result.memories_created === 1 ? 'y' : 'ies'}`,
    'success',
  );
  return result;
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  injectSubmitButton(submitConversation);
  loadMemories();
  window.addEventListener('memoai-fetch-memories', async (e) => {
    const { query, requestId } = e.detail;
    const result = await sendToBackground('FETCH_MEMORIES', {
      query,
      limit: 5,
    }).catch(() => null);

    window.dispatchEvent(
      new CustomEvent(`memoai-response-${requestId}`, {
        detail: { memories: result?.memories || [] },
      }),
    );
  });
  // const query = document.title || 'general context';
  // watchInputAndInject(getChatGPTInput);
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1500);
  }
}).observe(document.body, { childList: true, subtree: true });

setTimeout(init, 1500);
