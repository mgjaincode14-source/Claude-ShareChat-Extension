import JSZip from 'jszip';
import { UnifiedConversation, UnifiedMessage, ImportResult, FileAttachment } from './types';

function formatDateISO(dateInput: string | number | Date | undefined): { iso: string; dateStr: string; timeStr: string } {
  try {
    if (!dateInput) throw new Error('Empty date');
    let d: Date;
    if (typeof dateInput === 'number') {
      d = new Date(dateInput > 1e11 ? dateInput : dateInput * 1000);
    } else {
      d = new Date(dateInput);
    }

    // If parsing failed, check for custom formats like "15-Aug-2026", "2-Sep-2026", "Aug 19", "Aug 24, 2026, 6:46 PM"
    if (isNaN(d.getTime()) && typeof dateInput === 'string') {
      const cleaned = dateInput.trim();

      // Format: 15-Aug-2026 or 2-Sep-2026 or 15 Aug 2026
      const dmyMatch = cleaned.match(/(\d{1,2})[-/\s]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+(\d{4})/i);
      if (dmyMatch) {
        d = new Date(`${dmyMatch[2]} ${dmyMatch[1]}, ${dmyMatch[3]}`);
      } else {
        // Format: Aug 19 or Aug 19, 2026 or Aug 24, 2026, 6:46 PM
        const mdyMatch = cleaned.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+(\d{1,2})(?:[,-\s]+(\d{4}))?(?:[,-\s]+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);
        if (mdyMatch) {
          const month = mdyMatch[1];
          const day = mdyMatch[2];
          const year = mdyMatch[3] || new Date().getFullYear();
          const timePart = mdyMatch[4] ? `, ${mdyMatch[4]}` : '';
          d = new Date(`${month} ${day}, ${year}${timePart}`);
        }
      }
    }

    if (isNaN(d.getTime())) throw new Error('Invalid date');

    const iso = d.toISOString();
    const dateStr = iso.split('T')[0];
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { iso, dateStr, timeStr };
  } catch {
    return {
      iso: '',
      dateStr: '',
      timeStr: ''
    };
  }
}

function extractTextFromContent(msg: any): string {
  // If structured content blocks exist, prioritize genuine text blocks
  if (Array.isArray(msg.content) && msg.content.length > 0) {
    const textPieces = msg.content
      .map((block: any) => {
        if (typeof block === 'string') return block;
        if (block?.type === 'text' && block?.text) return block.text;
        if (block?.text) return block.text;
        if (block?.type === 'thinking' && block?.thinking) return `[Thinking: ${block.thinking}]`;
        if (block?.type === 'tool_use') return `[Tool Use: ${block.name || 'tool'}]`;
        if (block?.type === 'tool_result') {
          return typeof block.content === 'string' ? block.content : '[Tool Output]';
        }
        return '';
      })
      .filter(Boolean);

    if (textPieces.length > 0) {
      return textPieces.join('\n\n').trim();
    }
  }

  if (Array.isArray(msg.text) && msg.text.length > 0) {
    return msg.text.join('\n\n').trim();
  }

  let raw = '';
  if (typeof msg.content === 'string') raw = msg.content;
  else if (typeof msg.text === 'string') raw = msg.text;
  else if (typeof msg.body === 'string') raw = msg.body;
  else if (typeof msg.message === 'string') raw = msg.message;

  if (raw) {
    return raw
      .replace(/(?:```[\s\S]*?This block is not supported on your current device yet\.?[\s\S]*?```[\r\n]*)+/gi, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return '';
}

function normalizeSender(sender: any): 'user' | 'assistant' | 'system' {
  const s = String(sender || '').toLowerCase();
  if (s === 'human' || s === 'user' || s === 'me') return 'user';
  if (s === 'assistant' || s === 'claude' || s === 'bot') return 'assistant';
  if (s === 'system') return 'system';
  return 'user';
}

/**
 * Traverses a conversation message tree to produce the exact linear dialogue chain.
 * If currentLeafUuid is provided (or identified from terminal leaf nodes), it traces
 * backwards from leaf to root using parentMessageId. Any remaining/alternative branch
 * messages are preserved and appended cleanly.
 */
export function orderMessagesByTree(
  messages: UnifiedMessage[],
  currentLeafUuid?: string
): UnifiedMessage[] {
  if (messages.length <= 1) return messages;

  const msgMap = new Map<string, UnifiedMessage>();
  const childrenMap = new Map<string, string[]>();
  const hasParentLinks = messages.some(
    (m) => m.parentMessageId && m.parentMessageId !== '00000000-0000-0000-0000-000000000000'
  );

  // If no parent links exist and no leaf uuid is provided, sort chronologically by timestamp
  if (!hasParentLinks && !currentLeafUuid) {
    return [...messages].sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      if (isNaN(tA) || isNaN(tB)) return 0;
      return tA - tB;
    });
  }

  for (const m of messages) {
    msgMap.set(m.id, m);
    if (m.uuid) msgMap.set(m.uuid, m);

    if (m.parentMessageId && m.parentMessageId !== '00000000-0000-0000-0000-000000000000') {
      const existing = childrenMap.get(m.parentMessageId) || [];
      existing.push(m.id);
      childrenMap.set(m.parentMessageId, existing);
    }
  }

  // Determine active leaf UUID
  let activeLeafId: string | null = null;
  if (currentLeafUuid && msgMap.has(currentLeafUuid)) {
    activeLeafId = currentLeafUuid;
  }

  if (!activeLeafId) {
    // Find all terminal leaf messages (nodes whose id/uuid is never a parent)
    const allLeafNodes = messages.filter((m) => {
      const childrenById = childrenMap.get(m.id) || [];
      const childrenByUuid = m.uuid ? childrenMap.get(m.uuid) || [] : [];
      return childrenById.length === 0 && childrenByUuid.length === 0;
    });

    if (allLeafNodes.length > 0) {
      allLeafNodes.sort((a, b) => {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
      });
      activeLeafId = allLeafNodes[0].id;
    }
  }

  if (!activeLeafId) {
    return [...messages].sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      if (isNaN(tA) || isNaN(tB)) return 0;
      return tA - tB;
    });
  }

  // Trace backwards from activeLeafId up to root
  const activeChain: UnifiedMessage[] = [];
  const visited = new Set<string>();
  let curr: UnifiedMessage | undefined = msgMap.get(activeLeafId);

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    if (curr.uuid) visited.add(curr.uuid);
    activeChain.unshift(curr);

    if (
      !curr.parentMessageId ||
      curr.parentMessageId === '00000000-0000-0000-0000-000000000000' ||
      curr.parentMessageId === curr.id ||
      curr.parentMessageId === curr.uuid
    ) {
      break;
    }

    curr = msgMap.get(curr.parentMessageId);
  }

  // If activeChain is valid, return the clean active conversation thread
  if (activeChain.length > 0) {
    return activeChain;
  }

  // Fallback to chronological sort if tree chain cannot be formed
  return [...messages].sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (isNaN(tA) || isNaN(tB)) return 0;
    return tA - tB;
  });
}

export function parseClaudeConversationObject(
  raw: any, 
  source: 'claude_zip' | 'claude_json' | 'browser_extension' | 'raw_paste' | 'claude_share_link' = 'claude_json'
): UnifiedConversation {
  const id = raw.uuid || raw.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const title = raw.name || raw.title || 'Untitled Conversation';
  
  const convCreatedAt = raw.created_at || raw.createdAt || raw.inserted_at || raw.date;
  const convUpdatedAt = raw.updated_at || raw.updatedAt || convCreatedAt;

  const createdDate = formatDateISO(convCreatedAt);
  const updatedDate = formatDateISO(convUpdatedAt);

  const rawMessages: any[] = raw.chat_messages || raw.messages || [];
  
  let userCount = 0;
  let assistantCount = 0;
  let hasAttachments = false;

  const messages: UnifiedMessage[] = rawMessages.map((m: any, index: number) => {
    const msgId = m.uuid || m.id || `msg_${id}_${index}`;
    const sender = normalizeSender(m.sender || m.role || m.author);
    if (sender === 'user') userCount++;
    if (sender === 'assistant') assistantCount++;

    const textContent = extractTextFromContent(m);
    
    // Check all potential date property names on message object m
    const rawMsgDate =
      m.created_at ||
      m.createdAt ||
      m.inserted_at ||
      m.timestamp ||
      m.date ||
      m.time ||
      m.updated_at ||
      m.updatedAt ||
      m.metadata?.created_at ||
      m.metadata?.timestamp ||
      m.metadata?.time;

    let msgDate = formatDateISO(rawMsgDate);

    // Fall back to conversation root dates if individual message lacks a timestamp
    if (!msgDate.dateStr && createdDate.dateStr) {
      msgDate = createdDate;
    } else if (!msgDate.dateStr && updatedDate.dateStr) {
      msgDate = updatedDate;
    }

    const rawAttachments = m.attachments || m.files || [];
    const attachments: FileAttachment[] = Array.isArray(rawAttachments)
      ? rawAttachments.map((att: any) => {
          hasAttachments = true;
          return {
            id: att.id || att.uuid,
            file_name: att.file_name || att.name || 'Attachment',
            file_size: att.file_size || att.size,
            file_type: att.file_type || att.type,
            extracted_content: att.extracted_content,
            url: att.url
          };
        })
      : [];

    return {
      id: msgId,
      uuid: msgId,
      sender,
      content: textContent,
      timestamp: msgDate.iso,
      dateString: msgDate.dateStr,
      timeString: msgDate.timeStr,
      attachments: attachments.length > 0 ? attachments : undefined,
      parentMessageId: m.parent_message_uuid || m.parentMessageId || m.parent_uuid || null,
      model: m.model || raw.model
    };
  });

  // Reconstruct tree and active conversation chain
  const rawLeafUuid = raw.current_leaf_message_uuid || raw.currentLeafMessageUuid || raw.leaf_uuid;
  const orderedMessages = orderMessagesByTree(messages, rawLeafUuid);

  // Calculate exact start date (earliest message date) and end date (latest message date)
  const validDatesSorted = [...orderedMessages.map((m) => m.dateString).filter(Boolean)].sort();
  const startDate = validDatesSorted.length > 0 ? validDatesSorted[0] : createdDate.dateStr;
  const endDate = validDatesSorted.length > 0 ? validDatesSorted[validDatesSorted.length - 1] : updatedDate.dateStr;

  return {
    id,
    uuid: id,
    title,
    createdAt: createdDate.iso || (orderedMessages[0]?.timestamp) || new Date().toISOString(),
    updatedAt: updatedDate.iso || (orderedMessages[orderedMessages.length - 1]?.timestamp) || new Date().toISOString(),
    createdDateString: startDate || createdDate.dateStr,
    messages: orderedMessages,
    metadata: {
      model: raw.model || 'Claude',
      exportSource: source,
      totalMessages: orderedMessages.length,
      userMessagesCount: userCount,
      assistantMessagesCount: assistantCount,
      hasAttachments,
      dateRange: {
        start: startDate,
        end: endDate
      }
    }
  };
}

export function parseClaudeJsonContent(
  jsonStr: string, 
  source: 'claude_zip' | 'claude_json' | 'browser_extension' | 'raw_paste' = 'claude_json'
): ImportResult {
  const errors: string[] = [];
  const conversations: UnifiedConversation[] = [];

  try {
    const data = JSON.parse(jsonStr);

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        try {
          conversations.push(parseClaudeConversationObject(item, source));
        } catch (err: any) {
          errors.push(`Error parsing item #${index + 1}: ${err.message}`);
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      if (data.conversations && Array.isArray(data.conversations)) {
        data.conversations.forEach((item: any, index: number) => {
          try {
            conversations.push(parseClaudeConversationObject(item, source));
          } catch (err: any) {
            errors.push(`Error parsing conversation #${index + 1}: ${err.message}`);
          }
        });
      } else {
        conversations.push(parseClaudeConversationObject(data, source));
      }
    } else {
      return {
        success: false,
        conversations: [],
        errors: ['Invalid JSON format: root element must be an array or object'],
        message: 'Failed to parse JSON file'
      };
    }

    return {
      success: conversations.length > 0,
      conversations,
      errors,
      message: `Successfully imported ${conversations.length} conversation(s)`
    };
  } catch (err: any) {
    return {
      success: false,
      conversations: [],
      errors: [err.message],
      message: 'Failed to parse JSON content'
    };
  }
}

export async function parseClaudeZipFile(file: File): Promise<ImportResult> {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // Look for conversations.json anywhere in the zip
    let conversationsFile = loadedZip.file('conversations.json');

    if (!conversationsFile) {
      // Find matching file in subdirectories
      const matches = loadedZip.file(/conversations\.json$/i);
      if (matches.length > 0) {
        conversationsFile = matches[0];
      }
    }

    if (!conversationsFile) {
      return {
        success: false,
        conversations: [],
        errors: ['Could not find `conversations.json` inside the uploaded .zip archive.'],
        message: 'Invalid Claude export zip archive'
      };
    }

    const content = await conversationsFile.async('string');
    return parseClaudeJsonContent(content, 'claude_zip');
  } catch (err: any) {
    return {
      success: false,
      conversations: [],
      errors: [err.message],
      message: 'Failed to read zip file'
    };
  }
}

export function parseRawTextTranscript(text: string, customTitle?: string): ImportResult {
  if (!text || !text.trim()) {
    return {
      success: false,
      conversations: [],
      errors: ['Text content is empty'],
      message: 'No text provided'
    };
  }

  const lines = text.split('\n');
  const messages: UnifiedMessage[] = [];
  
  let currentSender: 'user' | 'assistant' = 'user';
  let currentBuffer: string[] = [];
  const now = new Date();

  function pushMessage() {
    if (currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      if (content) {
        const msgDate = formatDateISO(now);
        messages.push({
          id: `msg_raw_${messages.length}_${Date.now()}`,
          uuid: `msg_raw_${messages.length}`,
          sender: currentSender,
          content,
          timestamp: msgDate.iso,
          dateString: msgDate.dateStr,
          timeString: msgDate.timeStr
        });
      }
      currentBuffer = [];
    }
  }

  const userRegex = /^(Human|User|Me|Prompt):\s*/i;
  const assistantRegex = /^(Claude|Assistant|Bot|AI):\s*/i;

  for (const line of lines) {
    if (userRegex.test(line)) {
      pushMessage();
      currentSender = 'user';
      currentBuffer.push(line.replace(userRegex, ''));
    } else if (assistantRegex.test(line)) {
      pushMessage();
      currentSender = 'assistant';
      currentBuffer.push(line.replace(assistantRegex, ''));
    } else {
      currentBuffer.push(line);
    }
  }
  pushMessage();

  if (messages.length === 0) {
    // If no delimiters found, treat entire text as single user prompt
    const msgDate = formatDateISO(now);
    messages.push({
      id: `msg_raw_0_${Date.now()}`,
      uuid: `msg_raw_0`,
      sender: 'user',
      content: text.trim(),
      timestamp: msgDate.iso,
      dateString: msgDate.dateStr,
      timeString: msgDate.timeStr
    });
  }

  const conversation = parseClaudeConversationObject(
    {
      uuid: `raw_conv_${Date.now()}`,
      name: customTitle || (text.slice(0, 40).replace(/[\n\r]/g, ' ') + '...'),
      created_at: now.toISOString(),
      chat_messages: messages
    },
    'raw_paste'
  );

  return {
    success: true,
    conversations: [conversation],
    errors: [],
    message: 'Successfully parsed text transcript'
  };
}

export function parseClaudeShareLinkPayload(rawPayload: any, shareUrl: string): ImportResult {
  try {
    const conversation = parseClaudeConversationObject(rawPayload, 'claude_share_link');
    if (!conversation.title || conversation.title === 'Untitled Conversation') {
      const match = shareUrl.match(/share\/([0-9a-f\-]+)/i);
      const uuidStr = match ? match[1].substring(0, 8) : 'Shared';
      conversation.title = `Claude Shared Chat (${uuidStr})`;
    }

    return {
      success: true,
      conversations: [conversation],
      errors: [],
      message: `Successfully imported Claude Shared Chat with ${conversation.messages.length} message(s)`
    };
  } catch (err: any) {
    return {
      success: false,
      conversations: [],
      errors: [err.message || 'Failed parsing shared conversation payload'],
      message: 'Failed to process shared link payload'
    };
  }
}
