import JSZip from 'jszip';
import { UnifiedConversation, UnifiedMessage, ImportResult, FileAttachment } from './types';

function formatDateISO(dateInput: string | Date | undefined): { iso: string; dateStr: string; timeStr: string } {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    const iso = d.toISOString();
    const dateStr = iso.split('T')[0];
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { iso, dateStr, timeStr };
  } catch {
    const fallback = new Date();
    const iso = fallback.toISOString();
    return {
      iso,
      dateStr: iso.split('T')[0],
      timeStr: fallback.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

export function parseClaudeConversationObject(raw: any, source: 'claude_zip' | 'claude_json' | 'browser_extension' | 'raw_paste' = 'claude_json'): UnifiedConversation {
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
    const msgDate = formatDateISO(m.created_at || m.timestamp || raw.created_at);

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
      parentMessageId: m.parent_message_uuid || m.parentMessageId || null,
      model: m.model || raw.model
    };
  });

  // Sort messages chronologically by timestamp
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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
