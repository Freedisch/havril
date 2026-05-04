// content/claude.js — Havril content script for Claude.ai

const PLATFORM = 'claude.ai';
const SOURCE_MODEL = 'claude-sonnet-4-5';

function getClaudeInput() {
  return (
    document.querySelector('[contenteditable="true"][data-placeholder]') ||
    document.querySelector('.ProseMirror') ||
    document.querySelector('[contenteditable="true"]')
  );
}

// Extract all conversation turns from the Claude.ai DOM.
function extractConversation() {
  const messages = [];

  // Collect all user and assistant elements with their DOM position
  // so we can sort them into the correct order.
  const entries = [];

  document.querySelectorAll('[data-testid="user-message"]').forEach((el) => {
    entries.push({ el, role: 'user' });
  });

  document.querySelectorAll('.font-claude-response').forEach((el) => {
    entries.push({ el, role: 'assistant' });
  });

  // Sort by DOM position — Node.DOCUMENT_POSITION_FOLLOWING means el B comes after el A
  entries.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  entries.forEach(({ el, role }) => {
    const content = el.innerText?.trim();
    if (content) messages.push({ role, content });
  });

  return messages;
}

// Fetch memories relevant to the first user message and show the panel.
async function loadMemories() {
  const firstUserMsg = document.querySelector('[data-testid="user-message"]');
  if (!firstUserMsg) return;

  const query = firstUserMsg.innerText?.trim();
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
    // Silent — not having memories is fine, don't interrupt the user
    console.debug('[Havril] fetch skipped:', err.message);
  }
}

// Submit the current conversation to Havril.
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
  injectMemoryPickerButton(getClaudeInput, submitConversation);
  //loadMemories();
  //watchInputAndInject(getClaudeInput);
}

// Claude.ai is a SPA — re-init when the URL changes (new conversation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1500); // wait for DOM to settle after navigation
  }
}).observe(document.body, { childList: true, subtree: true });

// Initial load
setTimeout(init, 1500);
