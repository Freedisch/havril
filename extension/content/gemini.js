// content/gemini.js — MemoAI content script for gemini.google.com

const SOURCE_MODEL = 'gemini';

function getGeminiInput() {
  return (
    document.querySelector('.ql-editor') ||
    document.querySelector('rich-textarea .ql-editor') ||
    document.querySelector('[contenteditable="true"]')
  );
}
// Extract conversation turns from the Gemini DOM.
function extractConversation() {
  const messages = [];

  // User messages
  document
    .querySelectorAll('.user-query-container, .query-text')
    .forEach((el) => {
      const content = el.innerText?.trim();
      if (content) messages.push({ role: 'user', content, _el: el });
    });

  // Model responses
  document
    .querySelectorAll('model-response, .response-content')
    .forEach((el) => {
      const content = el.innerText?.trim();
      if (content) messages.push({ role: 'assistant', content, _el: el });
    });

  // Sort by DOM position so the conversation is in the right order
  messages.sort((a, b) => {
    if (!a._el || !b._el) return 0;
    const pos = a._el.compareDocumentPosition(b._el);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  // Strip the internal _el reference before sending
  return messages.map(({ role, content }) => ({ role, content }));
}

async function loadMemories() {
  // Gemini's user input appears in .query-text
  const firstUserEl = document.querySelector(
    '.query-text, .user-query-container',
  );
  if (!firstUserEl) return;

  const query = firstUserEl.innerText?.trim();
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
  injectMemoryPickerButton(getGeminiInput);
  loadMemories();
  watchInputAndInject(getGeminiInput);
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1500);
  }
}).observe(document.body, { childList: true, subtree: true });

setTimeout(init, 2000);
// Gemini loads slightly slower
