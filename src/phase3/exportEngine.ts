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

export function generateMarkdownExport(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  exportOpts: ExportOptions,
  redactionOpts: RedactionOptions
): string {
  const lines: string[] = [];
  const startDate = conversation.metadata?.dateRange?.start || 'N/A';
  const endDate = conversation.metadata?.dateRange?.end || 'N/A';

  if (exportOpts.includeMetadataHeader) {
    lines.push(`# ${conversation.title}`);
    lines.push('');
    lines.push(`> **Exported from Claude Selective Share Tool**`);
    if (exportOpts.includeTimestamp) {
      lines.push(`> Date Span: ${startDate} ~ ${endDate}`);
    }
    lines.push(`> Total Selected Messages: ${messages.length}`);
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

    lines.push(`### ${sender}${timeInfo}`);
    lines.push('');
    lines.push(msg.content);
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
  const payload = {
    title: conversation.title,
    metadata: {
      ...conversation.metadata,
      exportedAt: new Date().toISOString(),
      watermark: exportOpts.watermarkText || undefined,
      totalSelectedMessages: messages.length
    },
    messages: messages.map((m) => ({
      id: m.id,
      sender: getSenderLabel(m.sender, redactionOpts),
      role: m.sender,
      content: m.content,
      timestamp: exportOpts.includeTimestamp ? m.timestamp : undefined,
      dateString: exportOpts.includeTimestamp ? m.dateString : undefined,
      timeString: exportOpts.includeTimestamp ? m.timeString : undefined,
      model: m.model
    }))
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
  const startDate = conversation.metadata?.dateRange?.start || 'N/A';
  const endDate = conversation.metadata?.dateRange?.end || 'N/A';

  if (exportOpts.includeMetadataHeader) {
    lines.push(`=== ${conversation.title.toUpperCase()} ===`);
    lines.push(`Span: ${startDate} ~ ${endDate}`);
    lines.push(`Messages: ${messages.length}`);
    if (exportOpts.watermarkText) lines.push(exportOpts.watermarkText);
    lines.push('='.repeat(40));
    lines.push('');
  }

  messages.forEach((msg) => {
    const sender = getSenderLabel(msg.sender, redactionOpts);
    const timeStr = exportOpts.includeTimestamp && msg.dateString ? ` [${msg.dateString} ${msg.timeString || ''}]` : '';
    lines.push(`[${sender.toUpperCase()}${timeStr}]`);
    lines.push(msg.content);
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
  const startDate = conversation.metadata?.dateRange?.start || 'N/A';
  const endDate = conversation.metadata?.dateRange?.end || 'N/A';

  const messageBlocks = messages.map((msg) => {
    const sender = getSenderLabel(msg.sender, redactionOpts);
    const isUser = msg.sender === 'user';
    const contentEscaped = msg.content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

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
      margin: 0 0 8px 0;
      font-size: 20px;
      color: var(--amber);
    }
    .meta {
      font-size: 13px;
      color: var(--muted);
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
          <span>Date Span: ${startDate} ~ ${endDate}</span> • 
          <span>${messages.length} messages selected</span>
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
