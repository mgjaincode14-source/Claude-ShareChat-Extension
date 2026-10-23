/**
 * Self-contained bridge script to be executed on a claude.ai chat tab.
 *
 * It calls Claude's official internal conversation API directly from the
 * authenticated tab session. That API returns the complete conversation tree
 * with the REAL per-message created_at timestamps (microsecond ISO) and
 * parent_message_uuid links for tree traversal — identical to Claude's
 * official data export.
 */

export const PRODUCTION_URL = 'https://claudesharechat.vercel.app';

/**
 * Generate bookmarklet JavaScript code pointing dynamically to the target application origin.
 */
export function generateBookmarkletCode(targetOrigin?: string): string {
  const origin = (targetOrigin || PRODUCTION_URL).replace(/\/$/, '');

  return `(async function() {
  try {
    function getCookie(name) {
      var m = document.cookie.match("(?:^|; )" + name + "=([^;]*)");
      return m ? decodeURIComponent(m[1]).replace(/["\x27]/g, "").trim() : null;
    }

    // 1. Resolve organization UUID (cookie first, fallback to /api/organizations)
    var orgId = getCookie("lastActiveOrg");
    if (!orgId || !orgId.match(/^[0-9a-f-]{36}$/i)) {
      var orgRes = await fetch("https://claude.ai/api/organizations", { credentials: "include" });
      if (!orgRes.ok) throw new Error("Could not resolve organization. Make sure you are logged in to claude.ai in this tab.");
      var orgs = await orgRes.json();
      if (!Array.isArray(orgs) || orgs.length === 0) throw new Error("No active organizations found for this account.");
      orgId = orgs[0].uuid;
    }

    // 2. Resolve conversation ID from current URL
    var convMatch = window.location.pathname.match(new RegExp("(?:chat|conversation)/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", "i")) ||
                    window.location.pathname.match(new RegExp("([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", "i"));
    if (!convMatch) {
      throw new Error("Open an actual conversation tab (URL should look like claude.ai/chat/<id>) before running this.");
    }
    var conversationId = convMatch[1] || convMatch[0];

    // 3. Fetch the FULL conversation tree directly from Claude API
    var endpoints = [
      "https://claude.ai/api/organizations/" + orgId + "/chat_conversations/" + conversationId + "?tree=True&rendering_mode=messages&render_all_tools=true",
      "https://claude.ai/api/organizations/" + orgId + "/chat_conversations/" + conversationId + "?tree=true",
      "https://claude.ai/api/organizations/" + orgId + "/chat_conversations/" + conversationId
    ];

    var convRes = null;
    for (var i = 0; i < endpoints.length; i++) {
      try {
        var r = await fetch(endpoints[i], { credentials: "include" });
        if (r.ok) { convRes = r; break; }
      } catch(e) {}
    }

    if (!convRes || !convRes.ok) {
      throw new Error("Claude API request failed (status " + (convRes ? convRes.status : "network error") + "). Try refreshing the chat tab.");
    }

    var rawConversation = await convRes.json();
    var msgs = rawConversation.chat_messages || rawConversation.messages || [];
    var msgCount = msgs.length;

    if (msgCount === 0) {
      throw new Error("No messages found in Claude API response — conversation may still be loading or generating.");
    }

    var firstMsgDate = (msgs[0] && (msgs[0].created_at || msgs[0].createdAt))
      ? new Date(msgs[0].created_at || msgs[0].createdAt).toLocaleDateString()
      : "N/A";
    var lastMsgDate = (msgs[msgCount - 1] && (msgs[msgCount - 1].created_at || msgs[msgCount - 1].createdAt))
      ? new Date(msgs[msgCount - 1].created_at || msgs[msgCount - 1].createdAt).toLocaleDateString()
      : "N/A";

    console.log("[Claude Bridge Import] Successfully retrieved " + msgCount + " messages from Claude API.");
    console.log("[Claude Bridge Import] Real Database Date Range: " + firstMsgDate + " to " + lastMsgDate);
    console.log("[Claude Bridge Import] Target App Origin: " + "${origin}");

    // 4. Send official conversation tree payload to bridge endpoint
    var postRes = await fetch("${origin}/api/bridge-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(rawConversation)
    });

    var postData = await postRes.json();
    if (!postData.success) {
      throw new Error(postData.error || "Failed sending data to bridge");
    }

    alert("⚡ Imported " + (postData.conversation?.messages?.length || msgCount) + " messages with EXACT original timestamps (" + firstMsgDate + " to " + lastMsgDate + ")!");
    window.open("${origin}/phase2", "_blank");

  } catch(err) {
    alert("Claude Bridge Error: " + err.message);
    console.error("[Claude Bridge Error]", err);
  }
})();`;
}

/**
 * Generate bookmarklet URL for href attribute.
 */
export function generateBookmarkletHref(targetOrigin?: string): string {
  return `javascript:${encodeURIComponent(generateBookmarkletCode(targetOrigin))}`;
}

export const BOOKMARKLET_RAW_CODE = generateBookmarkletCode(PRODUCTION_URL);
export const BOOKMARKLET_HREF = generateBookmarkletHref(PRODUCTION_URL);
