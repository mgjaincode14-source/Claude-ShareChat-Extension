import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { ExportOptions, RedactionOptions } from './types';

function getSenderLabel(sender: string, redactionOpts: RedactionOptions): string {
  if (sender === 'user') {
    return redactionOpts.anonymizeUser ? (redactionOpts.userAlias || 'User') : 'User';
  }
  if (sender === 'assistant') {
    return redactionOpts.anonymizeAssistant ? (redactionOpts.assistantAlias || 'Claude') : 'Claude';
  }
  return sender;
}

function getMessageDateRange(messages: UnifiedMessage[]): { start: string; end: string } {
  const dates = messages
    .map((m) => m.dateString)
    .filter((d): d is string => Boolean(d))
    .sort();

  if (dates.length === 0) {
    return { start: 'N/A', end: 'N/A' };
  }
  return { start: dates[0], end: dates[dates.length - 1] };
}

function getFullConversationDateRange(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[]
): { start: string; end: string } {
  const meta = conversation.metadata as any;
  if (meta?.fullConversationDateRange?.start && meta?.fullConversationDateRange?.end) {
    return meta.fullConversationDateRange;
  }
  if (meta?.dateRange?.start && meta?.dateRange?.end) {
    return meta.dateRange;
  }
  if (conversation.messages && conversation.messages.length > 0) {
    const dates = conversation.messages
      .map((m) => m.dateString)
      .filter((d): d is string => Boolean(d))
      .sort();
    if (dates.length > 0) {
      return { start: dates[0], end: dates[dates.length - 1] };
    }
  }
  return getMessageDateRange(messages);
}

export function processSandboxContent(
  content: string,
  includeSandboxSteps: boolean,
  format: 'markdown' | 'json' | 'text' | 'html' | 'claude-chat'
): string {
  if (!content) return '';

  const UNSUPPORTED_BLOCK_REGEX = /(?:```[\s\S]*?This block is not supported on your current device yet\.?[\s\S]*?```[\r\n]*)+/gi;

  if (!includeSandboxSteps) {
    return content
      .replace(UNSUPPORTED_BLOCK_REGEX, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return content
    .replace(UNSUPPORTED_BLOCK_REGEX, (match) => {
      const matches = match.match(/This block is not supported/gi) || [];
      const count = matches.length || 1;
      const stepWord = count === 1 ? 'step' : 'steps';

      if (format === 'html' || format === 'claude-chat') {
        return `\n:::SANDBOX_DETAILS_${count}:::\n`;
      }
      if (format === 'markdown') {
        return `\n\n> ⚙️ **Claude Sandbox Activity** *(${count} ${stepWord})*\n\n`;
      }
      return `\n\n[⚙️ Claude Sandbox Activity: ${count} ${stepWord}]\n\n`;
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Helper to convert Markdown formatted chat message to clean Claude-styled HTML
 */
export function formatClaudeMessageToHtml(content: string, includeSandboxSteps: boolean): string {
  let text = processSandboxContent(content, includeSandboxSteps, 'claude-chat');

  // Replace sandbox placeholder
  text = text.replace(/:::SANDBOX_DETAILS_(\d+):::/g, (_, countStr) => {
    const count = parseInt(countStr, 10) || 1;
    const stepWord = count === 1 ? 'step' : 'steps';
    return `<details class="sandbox-activity"><summary>⚙️ Claude Sandbox Activity (${count} ${stepWord})</summary><div class="sandbox-desc">Background operations executed in Claude sandbox environment</div></details>`;
  });

  // Extract fenced code blocks first to protect them
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const safeLang = (lang || 'code').trim();
    const safeCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const blockHtml = `
      <div class="code-container">
        <div class="code-header">
          <span class="code-lang">${safeLang}</span>
          <button class="copy-code-btn" type="button" onclick="copySnippet(this)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy code</span>
          </button>
        </div>
        <pre><code class="language-${safeLang}">${safeCode}</code></pre>
      </div>`;
    codeBlocks.push(blockHtml);
    return placeholder;
  });

  // Split into lines/paragraphs
  const lines = text.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for code block placeholder
    if (line.includes('__CODE_BLOCK_')) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push(line);
      continue;
    }

    // Escape HTML in ordinary lines
    line = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Inline formatting: **bold**, *italic*, `code`
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    line = line.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h3>${line.slice(4)}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h2>${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h1>${line.slice(2)}</h1>`);
      continue;
    }

    // Unordered lists (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${ulMatch[2]}</li>`);
      continue;
    }

    // Numbered lists (1.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${olMatch[2]}</li>`);
      continue;
    }

    // Not a list item
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }

    // Empty line
    if (!line.trim()) {
      continue;
    }

    // Ordinary paragraph
    processedLines.push(`<p>${line}</p>`);
  }

  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  let finalHtml = processedLines.join('\n');

  // Reinsert code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    finalHtml = finalHtml.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
  }

  return finalHtml;
}

export function generateMarkdownExport(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  exportOpts: ExportOptions,
  redactionOpts: RedactionOptions
): string {
  const lines: string[] = [];
  const fullDateRange = getFullConversationDateRange(conversation, messages);
  const selectedDateRange = getMessageDateRange(messages);

  if (exportOpts.includeMetadataHeader) {
    lines.push(`# ${conversation.title}`);
    lines.push('');
    lines.push(`> **Exported from Claude Selective Share Tool**`);
    if (exportOpts.includeTimestamp) {
      lines.push(`> Date Span: ${fullDateRange.start} ~ ${fullDateRange.end}`);
      lines.push(`> Selected Date Span: ${selectedDateRange.start} ~ ${selectedDateRange.end} • ${messages.length} messages selected`);
    } else {
      lines.push(`> Total Selected Messages: ${messages.length}`);
    }
    if (exportOpts.watermarkText) {
      lines.push(`> ${exportOpts.watermarkText}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  messages.forEach((msg, index) => {
    const sender = getSenderLabel(msg.sender, redactionOpts);
    const timeInfo = exportOpts.includeTimestamp && msg.dateString ? ` *(${msg.dateString}${msg.timeString ? ' ' + msg.timeString : ''})*` : '';
    const processedContent = processSandboxContent(msg.content, exportOpts.includeSandboxSteps || false, 'markdown');

    lines.push(`### ${sender}${timeInfo}`);
    lines.push('');
    lines.push(processedContent);
    lines.push('');
    if (index < messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });

  return lines.join('\n');
}

export function generateJsonExport(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  exportOpts: ExportOptions,
  redactionOpts: RedactionOptions
): string {
  const fullDateRange = getFullConversationDateRange(conversation, messages);
  const selectedDateRange = getMessageDateRange(messages);

  const payload = {
    title: conversation.title,
    metadata: {
      ...conversation.metadata,
      dateSpan: `${fullDateRange.start} ~ ${fullDateRange.end}`,
      selectedDateSpan: `${selectedDateRange.start} ~ ${selectedDateRange.end}`,
      exportedAt: new Date().toISOString(),
      watermark: exportOpts.watermarkText || undefined,
      totalSelectedMessages: messages.length,
      includeSandboxSteps: Boolean(exportOpts.includeSandboxSteps)
    },
    messages: messages.map((m) => {
      const processedContent = processSandboxContent(m.content, exportOpts.includeSandboxSteps || false, 'json');
      return {
        id: m.id,
        sender: getSenderLabel(m.sender, redactionOpts),
        role: m.sender,
        content: processedContent,
        timestamp: exportOpts.includeTimestamp ? m.timestamp : undefined,
        dateString: exportOpts.includeTimestamp ? m.dateString : undefined,
        timeString: exportOpts.includeTimestamp ? m.timeString : undefined,
        model: m.model
      };
    })
  };

  return JSON.stringify(payload, null, 2);
}

export function generateTextExport(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  exportOpts: ExportOptions,
  redactionOpts: RedactionOptions
): string {
  const lines: string[] = [];
  const fullDateRange = getFullConversationDateRange(conversation, messages);
  const selectedDateRange = getMessageDateRange(messages);

  if (exportOpts.includeMetadataHeader) {
    lines.push(`=== ${conversation.title.toUpperCase()} ===`);
    lines.push(`Date Span: ${fullDateRange.start} ~ ${fullDateRange.end}`);
    lines.push(`Selected Date Span: ${selectedDateRange.start} ~ ${selectedDateRange.end} • ${messages.length} messages selected`);
    if (exportOpts.watermarkText) lines.push(exportOpts.watermarkText);
    lines.push('='.repeat(40));
    lines.push('');
  }

  messages.forEach((msg) => {
    const sender = getSenderLabel(msg.sender, redactionOpts);
    const timeStr = exportOpts.includeTimestamp && msg.dateString ? ` [${msg.dateString} ${msg.timeString || ''}]` : '';
    const processedContent = processSandboxContent(msg.content, exportOpts.includeSandboxSteps || false, 'text');
    lines.push(`[${sender.toUpperCase()}${timeStr}]`);
    lines.push(processedContent);
    lines.push('');
    lines.push('-'.repeat(30));
    lines.push('');
  });

  return lines.join('\n');
}

export function generateHtmlExport(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  exportOpts: ExportOptions,
  redactionOpts: RedactionOptions
): string {
  const titleEscaped = conversation.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fullDateRange = getFullConversationDateRange(conversation, messages);
  const selectedDateRange = getMessageDateRange(messages);

  const messageBlocks = messages.map((msg) => {
    const sender = getSenderLabel(msg.sender, redactionOpts);
    const isUser = msg.sender === 'user';
    const processedContent = processSandboxContent(msg.content, exportOpts.includeSandboxSteps || false, 'html');
    let contentEscaped = processedContent
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

    if (exportOpts.includeSandboxSteps) {
      contentEscaped = contentEscaped.replace(/:::SANDBOX_DETAILS_(\d+):::/g, (_, countStr) => {
        const count = parseInt(countStr, 10) || 1;
        const stepWord = count === 1 ? 'step' : 'steps';
        return `<details class="sandbox-activity"><summary>⚙️ Claude Sandbox Activity (${count} ${stepWord})</summary><div class="sandbox-desc">Background operations executed in sandbox (file generation / tool execution)</div></details>`;
      });
    }

    const timeStr = exportOpts.includeTimestamp && msg.dateString ? `${msg.dateString} ${msg.timeString || ''}` : '';

    return `
      <div class="message-card ${isUser ? 'user-msg' : 'claude-msg'}">
        <div class="msg-header">
          <span class="sender-name">${sender}</span>
          ${timeStr ? `<span class="timestamp">${timeStr}</span>` : ''}
        </div>
        <div class="msg-body">${contentEscaped}</div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleEscaped} — Claude Shared Chat</title>
  <style>
    :root {
      --bg: #FAF9F5;
      --card-bg: #FFFFFF;
      --user-bg: #F0EEE5;
      --claude-bg: #FFFFFF;
      --text: #1F1E1D;
      --muted: #6B6963;
      --border: #E8E5DD;
      --terracotta: #CC5A36;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      padding: 20px;
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 20px;
      font-family: Georgia, serif;
      color: var(--text);
    }
    .meta {
      font-size: 13px;
      color: var(--muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meta-selected {
      color: var(--terracotta);
      font-weight: 500;
    }
    .message-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .user-msg {
      background: var(--user-bubble-bg);
      border-color: #E5E2D9;
    }
    .claude-msg {
      border-left: 4px solid var(--terracotta);
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .sender-name {
      font-weight: 600;
      font-size: 13px;
      color: var(--text);
    }
    .timestamp {
      font-size: 11px;
      color: var(--muted);
      font-family: monospace;
    }
    .msg-body {
      font-size: 14.5px;
      color: var(--text);
      word-break: break-word;
    }
    .sandbox-activity {
      margin: 12px 0;
      padding: 8px 12px;
      background: #F0EEE6;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 12px;
    }
    .sandbox-activity summary {
      cursor: pointer;
      font-weight: 500;
      color: var(--terracotta);
    }
    .sandbox-desc {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border);
      font-size: 11px;
      color: var(--muted);
      font-family: monospace;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    ${exportOpts.includeMetadataHeader ? `
      <div class="header">
        <h1>${titleEscaped}</h1>
        <div class="meta">
          <div>Date Span: ${fullDateRange.start} ~ ${fullDateRange.end}</div>
          <div class="meta-selected">Selected Date Span: ${selectedDateRange.start} ~ ${selectedDateRange.end} • ${messages.length} messages selected</div>
        </div>
      </div>
    ` : ''}

    <div class="feed">
      ${messageBlocks}
    </div>

    ${exportOpts.watermarkText ? `<div class="footer">${exportOpts.watermarkText}</div>` : ''}
  </div>
</body>
</html>`;
}

/**
 * Generates a standalone HTML export replicating Claude's exact Chatbot layout:
 * - User queries aligned to the RIGHT in signature speech bubbles
 * - Claude responses aligned to the LEFT with terracotta asterism avatar and clean manuscript prose
 * - Functional copy buttons for code snippets and assistant responses
 */
export function generateClaudeChatExport(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  exportOpts: ExportOptions,
  redactionOpts: RedactionOptions
): string {
  const titleEscaped = conversation.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fullDateRange = getFullConversationDateRange(conversation, messages);
  const selectedDateRange = getMessageDateRange(messages);

  const messageRows = messages.map((msg, idx) => {
    const isUser = msg.sender === 'user';
    const sender = getSenderLabel(msg.sender, redactionOpts);
    const timeStr = exportOpts.includeTimestamp && msg.dateString ? `${msg.dateString}${msg.timeString ? ' ' + msg.timeString : ''}` : '';
    const formattedHtml = formatClaudeMessageToHtml(msg.content, Boolean(exportOpts.includeSandboxSteps));

    if (isUser) {
      return `
        <!-- User Query (Right Aligned Bubble) -->
        <div class="chat-row user-row">
          <div class="user-bubble">
            <div class="user-bubble-header">
              <span class="user-name">${sender}</span>
              ${timeStr ? `<span class="timestamp">${timeStr}</span>` : ''}
            </div>
            <div class="user-content">${formattedHtml}</div>
          </div>
        </div>
      `;
    }

    // Claude Assistant Response (Left Aligned Flow)
    return `
      <!-- Claude Response (Left Aligned Flow) -->
      <div class="chat-row assistant-row">
        <div class="assistant-container">
          <div class="assistant-header">
            <div class="assistant-badge">
              <span class="claude-icon">
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                  <path d="M12 2C12.5523 2 13 2.44772 13 3V7C13 7.55228 12.5523 8 12 8C11.4477 8 11 7.55228 11 7V3C11 2.44772 11.4477 2 12 2Z" fill="currentColor"/>
                  <path d="M12 16C12.5523 16 13 16.4477 13 17V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V17C11 16.4477 11.4477 16 12 16Z" fill="currentColor"/>
                  <path d="M2 12C2 11.4477 2.44772 11 3 11H7C7.55228 11 8 11.4477 8 12C8 12.5523 7.55228 13 7 13H3C2.44772 13 2 12.5523 2 12Z" fill="currentColor"/>
                  <path d="M16 12C16 11.4477 16.4477 11 17 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H17C16.4477 13 16 12.5523 16 12Z" fill="currentColor"/>
                  <path d="M4.92893 4.92893C5.31946 4.53841 5.95262 4.53841 6.34315 4.92893L9.17157 7.75736C9.5621 8.14788 9.5621 8.78105 9.17157 9.17157C8.78105 9.5621 8.14788 9.5621 7.75736 9.17157L4.92893 6.34315C4.53841 5.95262 4.53841 5.31946 4.92893 4.92893Z" fill="currentColor"/>
                  <path d="M14.8284 14.8284C15.219 14.4379 15.8521 14.4379 16.2426 14.8284L19.0711 17.6569C19.4616 18.0474 19.4616 18.6805 19.0711 19.0711C18.6805 19.4616 18.0474 19.4616 17.6569 19.0711L14.8284 16.2426C14.4379 15.8521 14.4379 15.219 14.8284 14.8284Z" fill="currentColor"/>
                  <path d="M19.0711 4.92893C19.4616 5.31946 19.4616 5.95262 19.0711 6.34315L16.2426 9.17157C15.8521 9.5621 15.219 9.5621 14.8284 9.17157C14.4379 8.78105 14.4379 8.14788 14.8284 7.75736L17.6569 4.92893C18.0474 4.53841 18.6805 4.53841 19.0711 4.92893Z" fill="currentColor"/>
                  <path d="M9.17157 14.8284C9.5621 15.219 9.5621 15.8521 9.17157 16.2426L6.34315 19.0711C5.95262 19.4616 5.31946 19.4616 4.92893 19.0711C4.53841 18.6805 4.53841 18.0474 4.92893 17.6569L7.75736 14.8284C8.14788 14.4379 8.78105 14.4379 9.17157 14.8284Z" fill="currentColor"/>
                  <circle cx="12" cy="12" r="2.2" fill="currentColor"/>
                </svg>
              </span>
              <span class="assistant-name">${sender}</span>
              ${msg.model ? `<span class="model-pill">${msg.model}</span>` : ''}
            </div>
            ${timeStr ? `<span class="timestamp">${timeStr}</span>` : ''}
          </div>

          <div class="assistant-content" id="msg-content-${idx}">
            ${formattedHtml}
          </div>

          <div class="assistant-actions">
            <button class="action-btn copy-msg-btn" type="button" onclick="copyMessage(${idx})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy response</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleEscaped} — Claude Chat</title>
  <style>
    :root {
      --bg: #FAF9F5;
      --foreground: #1F1E1D;
      --muted: #6B6963;
      --muted-subtle: #8C887B;
      --border: #E8E5DD;
      --border-subtle: #E5E2D9;
      --terracotta: #CC5A36;
      --terracotta-hover: #B84B29;
      --user-bubble-bg: #F0EEE5;
      --user-bubble-border: #E5E2D9;
      --code-bg: #1A1A18;
      --code-header-bg: #141413;
      --code-border: #2E2E2A;
      --code-text: #EDEAE1;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--bg);
      color: var(--foreground);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 60px;
    }
    /* Sticky Claude Header */
    .claude-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(250, 249, 245, 0.94);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .header-logo {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--terracotta);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-info {
      min-width: 0;
    }
    .header-title {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: 600;
      color: var(--foreground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-sub {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-badge {
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      padding: 4px 10px;
      background: #F0EEE6;
      border: 1px solid var(--border);
      border-radius: 9999px;
      color: var(--muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Main Container */
    .container {
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* Metadata Header Banner */
    .meta-banner {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .meta-banner h2 {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 18px;
      color: var(--foreground);
      margin-bottom: 6px;
    }
    .meta-details {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--muted);
    }

    /* Chat Rows */
    .chat-row {
      width: 100%;
      margin-bottom: 32px;
    }

    /* User Row: Right Aligned Speech Bubble */
    .user-row {
      display: flex;
      justify-content: flex-end;
    }
    .user-bubble {
      background: var(--user-bubble-bg);
      border: 1px solid var(--user-bubble-border);
      border-radius: 24px;
      padding: 16px 20px;
      max-width: 78%;
      color: var(--foreground);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .user-bubble-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 6px;
      font-size: 11px;
      color: var(--muted-subtle);
    }
    .user-name {
      font-weight: 600;
      color: var(--muted);
    }
    .user-content {
      font-size: 15px;
      line-height: 1.6;
      word-break: break-word;
    }

    /* Claude Row: Left Aligned Clean Flow */
    .assistant-row {
      display: flex;
      justify-content: flex-start;
    }
    .assistant-container {
      width: 100%;
      max-width: 100%;
    }
    .assistant-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .assistant-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .claude-icon {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      background: var(--terracotta);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .assistant-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--foreground);
    }
    .model-pill {
      font-size: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      background: #F0EEE6;
      border: 1px solid var(--border);
      border-radius: 9999px;
      padding: 1px 7px;
      color: var(--muted);
    }
    .timestamp {
      font-size: 11px;
      color: var(--muted-subtle);
    }

    /* Assistant Prose Typography */
    .assistant-content {
      font-size: 15px;
      line-height: 1.68;
      color: var(--foreground);
      word-break: break-word;
      padding-left: 2px;
    }
    .assistant-content p {
      margin-bottom: 14px;
    }
    .assistant-content p:last-child {
      margin-bottom: 0;
    }
    .assistant-content h1,
    .assistant-content h2,
    .assistant-content h3 {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 8px;
      color: var(--foreground);
    }
    .assistant-content h1 { font-size: 20px; }
    .assistant-content h2 { font-size: 18px; }
    .assistant-content h3 { font-size: 16px; }
    .assistant-content ul,
    .assistant-content ol {
      margin: 10px 0 14px 24px;
    }
    .assistant-content li {
      margin-bottom: 5px;
    }
    .assistant-content blockquote {
      border-left: 3px solid var(--border);
      padding-left: 14px;
      margin: 14px 0;
      color: var(--muted);
      font-style: italic;
    }

    /* Code Blocks */
    .code-container {
      margin: 16px 0;
      border-radius: 12px;
      border: 1px solid var(--code-border);
      background: var(--code-bg);
      overflow: hidden;
    }
    .code-header {
      background: var(--code-header-bg);
      border-bottom: 1px solid var(--code-border);
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #A09D94;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    }
    .copy-code-btn {
      background: transparent;
      border: none;
      color: #A09D94;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-family: inherit;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .copy-code-btn:hover {
      color: #FAF9F5;
      background: rgba(255, 255, 255, 0.08);
    }
    pre {
      padding: 14px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 13px;
      line-height: 1.55;
      color: var(--code-text);
    }
    code.inline-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 12.5px;
      background: #F0EEE6;
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 5px;
      color: var(--foreground);
    }

    /* Sandbox activity details */
    .sandbox-activity {
      margin: 12px 0;
      padding: 8px 12px;
      background: #F0EEE6;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 12px;
    }
    .sandbox-activity summary {
      cursor: pointer;
      font-weight: 500;
      color: var(--terracotta);
      outline: none;
      user-select: none;
    }
    .sandbox-desc {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border);
      font-size: 11px;
      color: var(--muted);
      font-family: monospace;
    }

    /* Assistant Footer Actions */
    .assistant-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 4px;
    }
    .action-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: #EDEAE1;
      color: var(--foreground);
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--muted);
    }

    @media (max-width: 640px) {
      .claude-header {
        padding: 10px 16px;
      }
      .container {
        padding: 16px 12px;
      }
      .user-bubble {
        max-width: 90%;
      }
    }

    @media print {
      .claude-header,
      .copy-code-btn,
      .assistant-actions {
        display: none !important;
      }
      body {
        background: white;
        color: black;
      }
      .user-bubble {
        border-color: #ccc;
        background: #f9f9f9;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="claude-header">
    <div class="header-left">
      <div class="header-logo">
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
          <path d="M12 2C12.5523 2 13 2.44772 13 3V7C13 7.55228 12.5523 8 12 8C11.4477 8 11 7.55228 11 7V3C11 2.44772 11.4477 2 12 2Z" fill="currentColor"/>
          <path d="M12 16C12.5523 16 13 16.4477 13 17V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V17C11 16.4477 11.4477 16 12 16Z" fill="currentColor"/>
          <path d="M2 12C2 11.4477 2.44772 11 3 11H7C7.55228 11 8 11.4477 8 12C8 12.5523 7.55228 13 7 13H3C2.44772 13 2 12.5523 2 12Z" fill="currentColor"/>
          <path d="M16 12C16 11.4477 16.4477 11 17 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H17C16.4477 13 16 12.5523 16 12Z" fill="currentColor"/>
          <path d="M4.92893 4.92893C5.31946 4.53841 5.95262 4.53841 6.34315 4.92893L9.17157 7.75736C9.5621 8.14788 9.5621 8.78105 9.17157 9.17157C8.78105 9.5621 8.14788 9.5621 7.75736 9.17157L4.92893 6.34315C4.53841 5.95262 4.53841 5.31946 4.92893 4.92893Z" fill="currentColor"/>
          <path d="M14.8284 14.8284C15.219 14.4379 15.8521 14.4379 16.2426 14.8284L19.0711 17.6569C19.4616 18.0474 19.4616 18.6805 19.0711 19.0711C18.6805 19.4616 18.0474 19.4616 17.6569 19.0711L14.8284 16.2426C14.4379 15.8521 14.4379 15.219 14.8284 14.8284Z" fill="currentColor"/>
          <path d="M19.0711 4.92893C19.4616 5.31946 19.4616 5.95262 19.0711 6.34315L16.2426 9.17157C15.8521 9.5621 15.219 9.5621 14.8284 9.17157C14.4379 8.78105 14.4379 8.14788 14.8284 7.75736L17.6569 4.92893C18.0474 4.53841 18.6805 4.53841 19.0711 4.92893Z" fill="currentColor"/>
          <path d="M9.17157 14.8284C9.5621 15.219 9.5621 15.8521 9.17157 16.2426L6.34315 19.0711C5.95262 19.4616 5.31946 19.4616 4.92893 19.0711C4.53841 18.6805 4.53841 18.0474 4.92893 17.6569L7.75736 14.8284C8.14788 14.4379 8.78105 14.4379 9.17157 14.8284Z" fill="currentColor"/>
          <circle cx="12" cy="12" r="2.2" fill="currentColor"/>
        </svg>
      </div>
      <div class="header-info">
        <h1 class="header-title">${titleEscaped}</h1>
        <p class="header-sub">Shared Claude Conversation • ${messages.length} messages</p>
      </div>
    </div>
    <div class="header-badge">Claude Chat</div>
  </header>

  <main class="container">
    ${exportOpts.includeMetadataHeader ? `
      <div class="meta-banner">
        <h2>${titleEscaped}</h2>
        <div class="meta-details">
          <span>Date Span: ${fullDateRange.start} ~ ${fullDateRange.end}</span>
          <span>•</span>
          <span>Selected Date Span: ${selectedDateRange.start} ~ ${selectedDateRange.end}</span>
          <span>•</span>
          <span>${messages.length} messages selected</span>
        </div>
      </div>
    ` : ''}

    <div class="feed">
      ${messageRows}
    </div>

    ${exportOpts.watermarkText ? `<div class="footer">${exportOpts.watermarkText}</div>` : ''}
  </main>

  <script>
    function copySnippet(btn) {
      var pre = btn.closest('.code-container').querySelector('pre code');
      if (!pre) return;
      var text = pre.innerText || pre.textContent;
      navigator.clipboard.writeText(text).then(function() {
        var span = btn.querySelector('span');
        var original = span.innerText;
        span.innerText = 'Copied!';
        btn.style.color = '#10B981';
        setTimeout(function() {
          span.innerText = original;
          btn.style.color = '';
        }, 2000);
      });
    }

    function copyMessage(idx) {
      var el = document.getElementById('msg-content-' + idx);
      if (!el) return;
      var text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text).then(function() {
        var btn = event.currentTarget || event.target.closest('.copy-msg-btn');
        if (btn) {
          var span = btn.querySelector('span');
          var original = span.innerText;
          span.innerText = 'Copied!';
          btn.style.color = '#10B981';
          setTimeout(function() {
            span.innerText = original;
            btn.style.color = '';
          }, 2000);
        }
      });
    }
  </script>
</body>
</html>`;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
