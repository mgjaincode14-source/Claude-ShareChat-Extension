/**
 * popup.js — Extension popup controller
 *
 * State machine with 5 states:
 *   not-claude → not-conversation → ready → (importing) → success | error
 */

const PROD_URL = 'https://claudesharechat.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

let currentAppUrl = PROD_URL;

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const states = {
  notClaude:       document.getElementById('state-not-claude'),
  notConversation: document.getElementById('state-not-conversation'),
  ready:           document.getElementById('state-ready'),
  success:         document.getElementById('state-success'),
  error:           document.getElementById('state-error'),
};

const envProdBtn   = document.getElementById('env-prod-btn');
const envLocalBtn  = document.getElementById('env-local-btn');
const convTitle    = document.getElementById('conv-title');
const convMeta     = document.getElementById('conv-meta');
const importBtn    = document.getElementById('import-btn');
const importBtnIcon  = document.getElementById('import-btn-icon');
const importBtnLabel = document.getElementById('import-btn-label');
const importProgress = document.getElementById('import-progress');
const progressFill   = document.getElementById('progress-fill');
const progressLabel  = document.getElementById('progress-label');
const successDesc    = document.getElementById('success-desc');
const errorMsg       = document.getElementById('error-msg');
const retryBtn       = document.getElementById('retry-btn');
const openAppBtn     = document.getElementById('open-app-btn');
const openPhase2Btn  = document.getElementById('open-phase2-btn');
const openPhase3Btn  = document.getElementById('open-phase3-btn');
const openPhase4Btn  = document.getElementById('open-phase4-btn');

function setTargetEnv(url) {
  currentAppUrl = url;
  chrome.storage.local.set({ targetAppUrl: url });
  if (envProdBtn && envLocalBtn) {
    const isLocal = url.includes('localhost');
    envLocalBtn.classList.toggle('active', isLocal);
    envProdBtn.classList.toggle('active', !isLocal);
  }
}

async function initEnv() {
  chrome.storage.local.get(['targetAppUrl'], async (res) => {
    if (res?.targetAppUrl) {
      setTargetEnv(res.targetAppUrl);
    } else {
      // Auto-detect if localhost dev server is alive
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 400);
        const ping = await fetch(`${LOCAL_URL}/api/bridge-import`, { signal: controller.signal });
        clearTimeout(timeout);
        if (ping.ok) {
          setTargetEnv(LOCAL_URL);
          return;
        }
      } catch (_) {}
      setTargetEnv(PROD_URL);
    }
  });

  if (envProdBtn) {
    envProdBtn.addEventListener('click', () => setTargetEnv(PROD_URL));
  }
  if (envLocalBtn) {
    envLocalBtn.addEventListener('click', () => setTargetEnv(LOCAL_URL));
  }
}

// ─── State Management ──────────────────────────────────────────────────────────

function showState(name) {
  Object.entries(states).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

// ─── Progress helpers ──────────────────────────────────────────────────────────

function setProgress(percent, label) {
  progressFill.style.width = `${percent}%`;
  progressLabel.textContent = label;
  progressFill.style.animation = 'none'; // stop shimmer once we have a real percent
}

function startImportingUI() {
  importBtn.disabled = true;
  importBtnIcon.textContent = '⏳';
  importBtnLabel.textContent = 'Importing...';
  importProgress.classList.remove('hidden');
  setProgress(0, 'Connecting to Claude API...');
}

function stopImportingUI() {
  importBtn.disabled = false;
  importBtnIcon.textContent = '⚡';
  importBtnLabel.textContent = 'Import & Open ShareChat';
  importProgress.classList.add('hidden');
  progressFill.style.animation = '';
}

// ─── Tab Inspection ────────────────────────────────────────────────────────────

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContentScript(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

// ─── Initialization ────────────────────────────────────────────────────────────

async function init() {
  const tab = await getActiveTab();

  // Not on claude.ai at all
  if (!tab?.url?.includes('claude.ai')) {
    showState('notClaude');
    return;
  }

  // On claude.ai — ask content script for page state
  try {
    const pageState = await sendToContentScript(tab.id, { action: 'GET_PAGE_STATE' });

    if (!pageState?.isOnConversation) {
      showState('notConversation');
      return;
    }

    // Ready to import — show conversation details
    convTitle.textContent = pageState.title || 'Claude Conversation';
    convMeta.textContent = pageState.conversationId
      ? `ID: ${pageState.conversationId.slice(0, 8)}...`
      : 'Conversation detected';

    showState('ready');
  } catch (err) {
    // Content script not yet injected (e.g. page still loading)
    // This can happen on very fresh page loads
    if (tab.url?.match(/\/chat\/[0-9a-f-]{36}|\/conversation\/[0-9a-f-]{36}/i)) {
      convTitle.textContent = 'Conversation detected';
      convMeta.textContent = 'Ready to import';
      showState('ready');
    } else {
      showState('notConversation');
    }
  }
}

// ─── Import Logic ──────────────────────────────────────────────────────────────

async function runImport() {
  const tab = await getActiveTab();
  if (!tab) return;

  startImportingUI();

  // Simulate progress steps while waiting for async response
  const steps = [
    [15, 'Resolving organization...'],
    [35, 'Fetching conversation from Claude...'],
    [65, 'Processing messages...'],
    [85, 'Sending to ShareChat...'],
  ];

  let stepIndex = 0;
  const stepTimer = setInterval(() => {
    if (stepIndex < steps.length) {
      const [pct, label] = steps[stepIndex++];
      setProgress(pct, label);
    }
  }, 600);

  try {
    const result = await sendToContentScript(tab.id, { action: 'RUN_IMPORT' });
    clearInterval(stepTimer);

    if (result?.success) {
      if (result.conversation) {
        chrome.storage.local.set({
          pendingBridgeImport: result.conversation,
          pendingBridgeConvId: result.conversation.id
        });
      }
      setProgress(100, 'Done!');
      setTimeout(() => {
        successDesc.textContent =
          `${result.messageCount} messages imported · ${result.firstDate} → ${result.lastDate}`;
        stopImportingUI();
        showState('success');
      }, 400);
    } else {
      throw new Error(result?.error || 'Import failed with no error message.');
    }
  } catch (err) {
    clearInterval(stepTimer);
    stopImportingUI();
    errorMsg.textContent = err.message || String(err);
    showState('error');
  }
}

// ─── Event Listeners ───────────────────────────────────────────────────────────

importBtn.addEventListener('click', runImport);

retryBtn.addEventListener('click', () => {
  showState('ready');
});

openAppBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'OPEN_APP', path: '/phase2' });
});

openPhase2Btn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'OPEN_APP', path: '/phase2' });
});

openPhase3Btn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'OPEN_APP', path: '/phase3' });
});

openPhase4Btn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'OPEN_APP', path: '/phase4' });
});

// ─── Boot ──────────────────────────────────────────────────────────────────────

initEnv();

init().catch((err) => {
  console.error('[ClaudeShareChat Extension] Popup init error:', err);
  showState('notClaude');
});
