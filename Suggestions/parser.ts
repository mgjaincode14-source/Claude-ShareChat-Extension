import JSZip from 'jszip';
import { UnifiedConversation, UnifiedMessage, ImportResult, FileAttachment } from './types';

function formatDateISO(dateInput: string | Date | undefined): { iso: string; dateStr: string; timeStr: string } {
  try {
    if (!dateInput) throw new Error('Empty date');
    let d = new Date(dateInput);

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
  if (typeof msg.text === 'string') return msg.text;
  if (typeof msg.content === 'string') return msg.content;
  
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((block: any) => {
        if (typeof block === 'string') return block;
        if (block?.type === 'text' && block?.text) return block.text;
        if (block?.text) return block.text;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (Array.isArray(msg.text)) {
    return msg.text.join('\n\n');
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

export function parseClaudeConversationObject(
  raw: any, 
  source: 'claude_zip' | 'claude_json' | 'browser_extension' | 'raw_paste' | 'claude_share_link' = 'claude_json'
): UnifiedConversation {
  const id = raw.uuid || raw.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const title = raw.name || raw.title || 'Untitled Conversation';
  
  const createdDate = formatDateISO(raw.created_at || raw.createdAt);
  const updatedDate = formatDateISO(raw.updated_at || raw.updatedAt || raw.created_at);

  const rawMessages: any[] = raw.chat_messages || raw.messages || [];
  
  let userCount = 0;
  let assistantCount = 0;
  let hasAttachments = false;

  const messages: UnifiedMessage[] = rawMessages.map((m: any, index: number) => {
    const msgId = m.uuid || m.id || `msg_${id}_${index}`;
    const sender = normalizeSender(m.sender || m.role);
    if (sender === 'user') userCount++;
    if (sender === 'assistant') assistantCount++;

    const textContent = extractTextFromContent(m);
    let msgDate = formatDateISO(m.created_at || m.timestamp);
    let isTimestampVerified = !!msgDate.dateStr;

    if (!msgDate.dateStr && raw.created_at) {
      // Fall back to the conversation-level created_at (still a real date, just
      // less precise than a per-message one) - this is still "verified" in the
      // sense that it came from the source data, not fabricated here.
      const rawDate = formatDateISO(raw.created_at);
      if (rawDate.dateStr) {
        msgDate = rawDate;
        isTimestampVerified = true;
      }
    }

    if (!msgDate.dateStr) {
      // IMPORTANT: do NOT fabricate "now" as a real timestamp here. Doing that
      // silently breaks date-range filtering, because the filter engine reads
      // `timestamp`/`dateString`, not a cosmetic label. Leave both empty and
      // mark isTimestampVerified = false so the UI can visibly flag it and the
      // selection engine can exclude/segregate it instead of mis-filtering it.
      if (typeof window !== 'undefined' && index < 3) {
        // Log the raw message's keys once per conversation (first few messages)
        // so you can see in DevTools console exactly which timestamp field name
        // your source data actually uses, if any.
        console.warn(
          '[parser] No created_at/timestamp found on message. Raw keys:',
          Object.keys(m || {}),
          m
        );
      }
      msgDate = { iso: '', dateStr: '', timeStr: '' };
      isTimestampVerified = false;
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
      isTimestampVerified,
      attachments: attachments.length > 0 ? attachments : undefined,
      parentMessageId: m.parent_message_uuid || m.parentMessageId || null,
      model: m.model || raw.model
    };
  });

  // Sort messages chronologically by timestamp if valid
  messages.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (isNaN(tA) || isNaN(tB)) return 0;
    return tA - tB;
  });

  // Check if any message provided explicit timestamp/created_at
  const hasExplicitMessageTimestamps = rawMessages.some((m: any) => !!(m.created_at || m.timestamp));
  const uniqueDates = new Set(messages.map((m) => m.dateString));

  // ONLY distribute timestamps artificially IF NO explicit message timestamps were provided AND source is ZIP export
  if (!hasExplicitMessageTimestamps && uniqueDates.size === 1 && messages.length > 2 && source === 'claude_zip') {
    const baseDate = raw.created_at ? new Date(raw.created_at) : new Date();
    const daysSpan = Math.min(14, Math.ceil(messages.length / 3));
    const startMs = baseDate.getTime() - daysSpan * 24 * 60 * 60 * 1000;

    messages.forEach((msg, idx) => {
      const msgTime = new Date(startMs + (idx / messages.length) * daysSpan * 24 * 60 * 60 * 1000);
      const dIso = formatDateISO(msgTime);
      msg.timestamp = dIso.iso;
      msg.dateString = dIso.dateStr;
      msg.timeString = dIso.timeStr;
    });
  }

  const dates = messages.map((m) => m.dateString).filter(Boolean);
  const startDate = dates.length > 0 ? dates[0] : createdDate.dateStr;
  const endDate = dates.length > 0 ? dates[dates.length - 1] : updatedDate.dateStr;

  return {
    id,
    uuid: id,
    title,
    createdAt: createdDate.iso,
    updatedAt: updatedDate.iso,
    createdDateString: createdDate.dateStr,
    messages,
    metadata: {
      model: raw.model || 'Claude',
      exportSource: source,
      totalMessages: messages.length,
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

