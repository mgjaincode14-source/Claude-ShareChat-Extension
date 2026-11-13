# Claude ShareChat — Browser Extension

Import, filter, redact, and share Claude conversations with one click.

Works on **Chrome**, **Firefox**, and **Brave** (Manifest V3).

---

## Load Unpacked (Developer / Testing)

### Chrome / Brave

1. Open `chrome://extensions` (or `brave://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this project
5. The Claude ShareChat icon appears in your toolbar

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `extension/manifest.json`
4. The extension loads until Firefox is restarted

> **Note:** For permanent Firefox installation, the extension needs to be signed via [addons.mozilla.org](https://addons.mozilla.org) or loaded via `about:config` (`xpinstall.signatures.required = false` in Developer Edition).

---

## How to Use

1. Go to [claude.ai](https://claude.ai) and open any conversation
2. Click the **Claude ShareChat** extension icon in your browser toolbar
3. The popup detects the conversation automatically
4. Select destination: **Local:3000** (for local development with `npm run dev`) or **Vercel** (for the live site)
5. Click **Import & Open ShareChat**
6. ShareChat opens in your chosen phase (Phase 2, 3, or 4) with your conversation instantly loaded!

---

## Extension File Structure

```
extension/
├── manifest.json          Manifest V3 — permissions, content scripts, popup
├── background.js          Service worker — badge management, dynamic tab routing
├── content.js             Content script — runs on claude.ai, fetches conversation
├── sharechat_bridge.js    Content script — runs on ShareChat tabs for instant direct load
├── popup/
│   ├── popup.html         Extension popup UI (5 states + env switcher)
│   ├── popup.js           Popup state machine and environment controller
│   └── popup.css          Popup styles (matches ShareChat design system)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions Explained

| Permission | Why it's needed |
|:---|:---|
| `activeTab` | Access the current claude.ai tab to inject the import script |
| `scripting` | Execute the content script programmatically on click |
| `storage` | Save user preferences and bridge conversation into ShareChat tabs |
| `tabs` | Open the ShareChat site in a new tab after import |
| `host_permissions: claude.ai` | Allow the content script to call Claude's internal conversation API |
| `host_permissions: claudesharechat.vercel.app` | Allow CORS-free POST to the bridge import endpoint |
| `host_permissions: localhost:3000` | Allow local development bridging when running `npm run dev` |

No conversation data is stored on any external servers. Data flows directly into your browser's private IndexedDB.

---

## Publishing to Stores

### Chrome Web Store
1. Zip the `extension/` folder: `zip -r claude-sharechat-extension.zip extension/`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip → fill in the store listing → submit for review

### Firefox Add-ons (AMO)
1. Zip the extension folder
2. Go to [addons.mozilla.org/developers](https://addons.mozilla.org/en-US/developers/)
3. Submit for review

### Brave
Brave uses the Chrome Web Store — no separate submission needed.
