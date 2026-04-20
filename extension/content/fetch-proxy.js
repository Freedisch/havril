// content/fetch-proxy.js
// Runs in MAIN world (see manifest.json) — has access to the real window.fetch
// Intercepts ChatGPT's conversation API call and injects memory context
// before the request reaches OpenAI's servers.

(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource?.url;

    // Only intercept ChatGPT's conversation endpoint
    if (
      url?.includes('/backend-api/conversation') &&
      config?.method === 'POST' &&
      config?.body
    ) {
      try {
        const body = JSON.parse(config.body);
        const messages = body?.messages;

        if (messages?.length > 0) {
          // Find the last user message
          const lastUserMsg = [...messages]
            .reverse()
            .find((m) => m.author?.role === 'user');

          const userText = lastUserMsg?.content?.parts?.[0];

          if (
            userText &&
            typeof userText === 'string' &&
            !userText.includes('[Havril Context]')
          ) {
            // Ask the content script (isolated world) to fetch memories
            const memories = await getMemoriesFromContentScript(userText);

            if (memories?.length) {
              const context = buildContext(memories);
              lastUserMsg.content.parts[0] = context + userText;

              return originalFetch(resource, {
                ...config,
                body: JSON.stringify(body),
              });
            }
          }
        }
      } catch (err) {
        console.debug(
          '[Havril proxy] error, sending original request:',
          err.message,
        );
      }
    }

    return originalFetch(...args);
  };

  // Bridge to content script via custom DOM events.
  // Page scripts (main world) can't use chrome.runtime directly —
  // the content script listens for this event and responds with memories.
  function getMemoriesFromContentScript(query) {
    return new Promise((resolve) => {
      const requestId = Math.random().toString(36).slice(2);

      // Listen for the response from the content script
      window.addEventListener(
        `havril-response-${requestId}`,
        (e) => resolve(e.detail?.memories || []),
        { once: true },
      );

      // Ask the content script to fetch memories
      window.dispatchEvent(
        new CustomEvent('havril-fetch-memories', {
          detail: { query, requestId },
        }),
      );

      // Timeout after 3 seconds — don't block the request forever
      setTimeout(() => resolve([]), 3000);
    });
  }

  function buildContext(memories) {
    const lines = memories.map((m) => `- ${m.content}`).join('\n');
    return `[Havril Context — background info about me, use naturally]\n${lines}\n[End Context]\n\n`;
  }

  console.debug('[Havril] fetch proxy installed');
})();
