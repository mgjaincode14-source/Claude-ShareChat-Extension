/**
 * content.js — Runs on every claude.ai page.
 *
 * Responsibilities:
 *  1. Detect when user is on a conversation page and report state to popup
 *  2. Execute the conversation import when requested by the popup/background
 *  3. Post conversation data to the ShareChat bridge API
 */

const DEFAULT_APP_URL = 'https://claudesharechat.vercel.app';

async function getTargetAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['targetAppUrl'], (res) => {
      resolve(res?.targetAppUrl || DEFAULT_APP_URL);
    });
  });
}

// ─── State Detection ──────────────────────────────────────────────────────────

/**
 * Extracts the conversation UUID from the current claude.ai URL.
 * Returns null if not on a conversation page.
 */
function getConversationIdFromUrl() {
  const patterns = [
    /\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /\/conversation\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  ];
  for (const pattern of patterns) {
    const match = window.location.pathname.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Reads a cookie value by name from document.cookie.
 */
function getCookie(name) {
  const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
  return m ? decodeURIComponent(m[1]).replace(/["']/g, '').trim() : null;
}

/**
 * Returns the best available conversation title from the DOM.
 */
function getConversationTitle() {
  // Try document title first (claude.ai sets it to the chat name)
  const title = document.title.replace(/\s*[-|].*$/, '').trim();
  if (title && title !== 'Claude' && title.length > 2) return title;
  // Fallback selectors
  const sel = document.querySelector('[data-testid="conversation-title"], .conversation-title, h1');
  return sel?.textContent?.trim() || 'Claude Conversation';
}

/**
 * Resolves the organization UUID needed for Claude API calls.
 * Tries cookies first, then falls back to the organizations API.
 */
async function resolveOrgId() {
  let orgId = getCookie('lastActiveOrg');
  if (orgId && /^[0-9a-f-]{36}$/i.test(orgId)) return orgId;

  const res = await fetch('https://claude.ai/api/organizations', { credentials: 'include' });
  if (!res.ok) throw new Error('Could not resolve organization. Please make sure you are logged in to Claude.');
  const orgs = await res.json();
  if (!Array.isArray(orgs) || orgs.length === 0) throw new Error('No active Claude organizations found.');
  return orgs[0].uuid;
}

/**
 * Fetches the full conversation tree from Claude's internal API.
 * Tries multiple endpoint variants in order of preference.
 */
async function fetchConversation(orgId, conversationId) {
  const endpoints = [
    `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`,
    `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=true`,
    `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.chat_messages || data.messages || [];
        if (msgs.length > 0) return data;
      }
    } catch (_) {}
  }
  throw new Error('Claude API request failed. Try refreshing the conversation tab.');
}

/**
 * Posts raw conversation data to the ShareChat bridge endpoint.
 */
async function postToBridge(rawConversation) {
  const appUrl = await getTargetAppUrl();
  const res = await fetch(`${appUrl}/api/bridge-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    body: JSON.stringify(rawConversation),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bridge API error (${res.status}): ${text}`);
  }

  return await res.json();
}

// ─── Main Import Handler ──────────────────────────────────────────────────────

/**
 * Full import pipeline: fetch from Claude → post to bridge → return metadata.
 * Called by the popup via chrome.tabs.sendMessage.
 */
async function runImport() {
  const conversationId = getConversationIdFromUrl();
  if (!conversationId) {
    throw new Error('Please open a Claude conversation page before importing.');
  }

  const orgId = await resolveOrgId();
  const rawConversation = await fetchConversation(orgId, conversationId);

  const msgs = rawConversation.chat_messages || rawConversation.messages || [];
  if (msgs.length === 0) {
    throw new Error('No messages found. The conversation may still be loading.');
  }

  const result = await postToBridge(rawConversation);
  if (!result.success) {
    throw new Error(result.error || 'Bridge import failed.');
  }

  // Store in extension storage for the direct browser tab bridge
  if (result.conversation) {
    await chrome.storage.local.set({
      pendingBridgeImport: result.conversation,
      pendingBridgeConvId: result.conversation.id
    });
  }

  return {
    conversation: result.conversation,
    messageCount: result.conversation?.messages?.length || msgs.length,
    title: getConversationTitle(),
    firstDate: msgs[0]?.created_at ? new Date(msgs[0].created_at).toLocaleDateString() : 'N/A',
    lastDate: msgs[msgs.length - 1]?.created_at
      ? new Date(msgs[msgs.length - 1].created_at).toLocaleDateString()
      : 'N/A',
  };
}

// ─── Message Listener ─────────────────────────────────────────────────────────

/**
 * Listen for messages from the popup (popup.js → chrome.tabs.sendMessage).
 *
 * Supported actions:
 *  - "GET_PAGE_STATE" → responds with current page context
 *  - "RUN_IMPORT"     → runs the full import and returns result/error
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'GET_PAGE_STATE') {
    const conversationId = getConversationIdFromUrl();
    sendResponse({
      isOnConversation: !!conversationId,
      conversationId,
      title: getConversationTitle(),
      url: window.location.href,
    });
    return false; // synchronous
  }

  if (message.action === 'RUN_IMPORT') {
    // Must return true to keep the message channel open for the async response
    runImport()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }
});
