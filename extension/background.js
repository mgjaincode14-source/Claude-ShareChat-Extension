/**
 * background.js — Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  1. Open the ShareChat app in a new tab after successful import
 *  2. Set the extension badge to show active state on claude.ai tabs
 *  3. Handle the "open app" action from the popup
 */

const DEFAULT_APP_URL = 'https://claudesharechat.vercel.app';

// ─── Badge Management ─────────────────────────────────────────────────────────

/**
 * Update the extension action badge when the user navigates on claude.ai.
 * Green badge with "●" = on a conversation page.
 * Default = on claude.ai but not a conversation page.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.includes('claude.ai')) return;

  const isConversation = /\/chat\/[0-9a-f-]{36}|\/conversation\/[0-9a-f-]{36}/i.test(tab.url);

  if (isConversation) {
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#cc5a36', tabId });
    chrome.action.setBadgeTextColor({ color: '#ffffff', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// ─── Message Listener ─────────────────────────────────────────────────────────

/**
 * Listen for messages from popup.js.
 *
 * Supported actions:
 *  - "OPEN_APP"     → opens the ShareChat site in a new tab
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'OPEN_APP') {
    const path = message.path || '/phase2';
    chrome.storage.local.get(['targetAppUrl'], (res) => {
      const appUrl = res?.targetAppUrl || DEFAULT_APP_URL;
      chrome.tabs.create({ url: `${appUrl}${path}` });
      sendResponse({ success: true, url: `${appUrl}${path}` });
    });
    return true; // Keep async channel open
  }
});
