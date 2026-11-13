/**
 * sharechat_bridge.js — Runs on ShareChat tabs (claudesharechat.vercel.app & localhost:3000).
 *
 * Transfers any pending imported Claude conversation directly into the tab's
 * sessionStorage and broadcasts a window message, enabling instant, zero-latency
 * client-side loading directly into the user's browser IndexedDB.
 */

(function initBridge() {
  const BRIDGE_KEY = 'claude_sharechat_bridge_import';

  function deliverImport() {
    try {
      chrome.storage.local.get(['pendingBridgeImport'], (result) => {
        if (chrome.runtime.lastError) return;
        const pending = result?.pendingBridgeImport;
        if (!pending) return;

        try {
          // Store directly into the web page's sessionStorage for instant read
          window.sessionStorage.setItem(BRIDGE_KEY, JSON.stringify(pending));

          // Post a message in case the React components are already mounted and listening
          window.postMessage({
            type: 'CLAUDE_SHARECHAT_BRIDGE_IMPORT',
            data: pending
          }, '*');

          // Clean up the extension storage so it doesn't re-trigger on reload
          chrome.storage.local.remove(['pendingBridgeImport']);
        } catch (err) {
          console.warn('[ClaudeShareChat Bridge] Failed to inject import into session:', err);
        }
      });
    } catch (_) {}
  }

  // Attempt delivery immediately
  deliverImport();

  // Retry once DOM is loaded in case sessionStorage was accessed during early boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deliverImport, { once: true });
  }
})();
