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
  format: 'markdown' | 'json' | 'text' | 'html'
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

      if (format === 'html') {
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
      --bg: #090d16;
      --card-bg: #111827;
      --user-bg: #1e293b;
      --claude-bg: #172554;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --amber: #f59e0b;
      --border: #334155;
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
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 20px;
      color: var(--amber);
    }
    .meta {
      font-size: 13px;
      color: var(--muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meta-selected {
      color: var(--amber);
      font-weight: 500;
    }
    .message-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }
    .user-msg {
      border-left: 4px solid #3b82f6;
    }
    .claude-msg {
      border-left: 4px solid var(--amber);
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .sender-name {
      font-weight: 600;
      font-size: 14px;
      color: #e2e8f0;
    }
    .timestamp {
      font-size: 11px;
      color: var(--muted);
      font-family: monospace;
    }
    .msg-body {
      font-size: 14px;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .sandbox-activity {
      margin: 12px 0;
      padding: 8px 12px;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      font-size: 12px;
    }
    .sandbox-activity summary {
      cursor: pointer;
      font-weight: 500;
      color: var(--amber);
      outline: none;
      user-select: none;
    }
    .sandbox-activity summary:hover {
      color: #fbbf24;
    }
    .sandbox-desc {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
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
