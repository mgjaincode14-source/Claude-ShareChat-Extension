/**
 * Self-contained bookmarklet script to be executed on any claude.ai tab.
 * It extracts active conversation messages AND their historical DOM dates/timestamps
 * and sends them to http://localhost:3000/api/bridge-import.
 */

export const BOOKMARKLET_HREF = `javascript:${encodeURIComponent(`(function(){
  try {
    var title = (document.title || 'Imported Claude Chat').replace(' - Claude','').trim();
    var msgs = [];
    
    // Select chat message blocks
    var nodes = document.querySelectorAll('.font-user-message, .font-claude-message, [data-testid="user-message"], [data-testid="chat-message"], .prose');
    
    var lastDateFound = new Date().toISOString();

    if (nodes.length > 0) {
      nodes.forEach(function(n, i){
        var isUser = n.classList.contains('font-user-message') || n.getAttribute('data-testid') === 'user-message';
        var txt = n.innerText || n.textContent || '';
        
        // Search for date/time elements in container or parent block (e.g. "Aug 19", "Aug 19, 2026", <time>)
        var dateStr = null;
        var parentBlock = n.closest('.grid-cols-1, [data-testid="user-message"], [data-testid="chat-message"]') || n.parentElement;
        
        if (parentBlock) {
          var timeEl = parentBlock.querySelector('time, [title*="202"], [title*="2025"], [title*="2026"]');
          if (timeEl) {
            dateStr = timeEl.getAttribute('datetime') || timeEl.getAttribute('title') || timeEl.innerText;
          }
          
          if (!dateStr) {
            var textNodes = parentBlock.innerText || '';
            var match = textNodes.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(,\\s*\\d{4})?/i);
            if (match) {
              dateStr = match[0];
            }
          }
        }

        if (dateStr) {
          lastDateFound = dateStr;
        }

        if (txt.trim()) {
          msgs.push({
            id: 'msg_b_' + i + '_' + Date.now(),
            sender: isUser ? 'user' : 'assistant',
            text: txt.trim(),
            created_at: dateStr || lastDateFound || new Date().toISOString()
          });
        }
      });
    } else {
      msgs.push({
        id: 'msg_b_0_' + Date.now(),
        sender: 'user',
        text: document.body.innerText.substring(0, 8000),
        created_at: new Date().toISOString()
      });
    }

    var payload = {
      uuid: 'conv_bridge_' + Date.now(),
      name: title,
      created_at: msgs.length > 0 ? msgs[0].created_at : new Date().toISOString(),
      chat_messages: msgs
    };

    fetch('http://localhost:3000/api/bridge-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json(); }).then(function(d){
      alert('⚡ Imported ' + msgs.length + ' message(s) with historical dates to Claude Selective Tool!');
      window.open('http://localhost:3000/phase2', '_blank');
    }).catch(function(err){
      alert('Error sending to http://localhost:3000. Make sure npm run dev is running!');
    });
  } catch(err) {
    alert('Bridge Error: ' + err.message);
  }
})();`)}`;
