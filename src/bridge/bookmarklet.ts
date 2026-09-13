/**
 * Self-contained bookmarklet script to be executed on a claude.ai chat tab.
 *
 * IMPORTANT: This calls Claude's own internal conversation API directly from the
 * page (same-origin, so the browser sends session cookies automatically). That
 * API returns the FULL message tree with the REAL per-message created_at
 * timestamp for every message, regardless of scroll position or hover state -
 * the same shape as the official data export, which parser.ts already handles.
 */

export const BOOKMARKLET_HREF = `javascript:${encodeURIComponent(`(async function(){
  try {
    function getCookie(name) {
      var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
      return m ? decodeURIComponent(m[1]) : null;
    }

    // 1. Resolve org id (cookie first, fallback to /api/organizations)
    var orgId = getCookie('lastActiveOrg');
    if (!orgId) {
      var orgRes = await fetch('https://claude.ai/api/organizations', { credentials: 'include' });
      if (!orgRes.ok) throw new Error('Could not resolve organization (are you logged into claude.ai in this tab?)');
      var orgs = await orgRes.json();
      if (!Array.isArray(orgs) || orgs.length === 0) throw new Error('No organizations found for this account');
      orgId = orgs[0].uuid;
    }

    // 2. Resolve conversation id from the current URL, e.g. https://claude.ai/chat/<uuid>
    var convMatch = window.location.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!convMatch) throw new Error('Open an actual conversation tab (URL should look like claude.ai/chat/<id>) before running this.');
    var conversationId = convMatch[0];

    // 3. Fetch the FULL conversation with REAL per-message timestamps directly from Claude's API
    var apiUrl = 'https://claude.ai/api/organizations/' + orgId + '/chat_conversations/' + conversationId +
                 '?tree=True&rendering_mode=messages&render_all_tools=true';
    var convRes = await fetch(apiUrl, { credentials: 'include' });
    if (!convRes.ok) throw new Error('Claude API request failed (status ' + convRes.status + '). Try refreshing the page and running again.');
    var rawConversation = await convRes.json();

    var msgCount = (rawConversation.chat_messages || rawConversation.messages || []).length;
    if (msgCount === 0) throw new Error('No messages found in API response - conversation may still be loading.');

    // 4. Send the raw, real conversation payload to the bridge
    fetch('http://localhost:3000/api/bridge-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(rawConversation)
    }).then(function(r){ return r.json(); }).then(function(d){
      alert('⚡ Imported ALL ' + msgCount + ' message(s) with exact original timestamps from Claude!');
      window.open('http://localhost:3000/phase2', '_blank');
    }).catch(function(err){
      alert('Error sending to http://localhost:3000. Make sure npm run dev is running!');
    });
  } catch(err) {
    alert('Bridge Error: ' + err.message);
  }
})();`)}`;
