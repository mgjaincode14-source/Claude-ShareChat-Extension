'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { SelectionOptions } from '../types';
import { filterMessagesBySelection } from '../engine';
import { processSandboxContent } from '@/phase3/exportEngine';
import { 
  Check, 
  Copy, 
  FileText, 
  Link2, 
  FileJson, 
  Calendar, 
  Layers, 
  User
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface SelectiveMessageViewerProps {
  conversation: UnifiedConversation | null;
  options: SelectionOptions;
  onToggleMessageId: (messageId: string) => void;
  onOpenRawJson: (msg?: UnifiedMessage) => void;
}

/**
 * Format a YYYY-MM-DD date string into a human-readable form like "Aug 24, 2026"
 */
function formatDisplayDate(dateStr: string): string {
  if (!dateStr || dateStr === 'Unknown Date') return dateStr || '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format a date for the range display badge, e.g. "15-Aug-2026"
 */
function formatBadgeDate(dateStr: string): string {
  if (!dateStr || dateStr === 'Unknown Date') return dateStr || '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      const day = d.getUTCDate();
      const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      const year = d.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

const CodeBlockItem: React.FC<any> = ({ node, inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');
  const isInline = inline || (!match && !codeString.includes('\n'));

  if (isInline) {
    return (
      <code className="bg-[#f0eee6] text-[#1f1e1d] px-1.5 py-0.5 rounded text-xs font-mono font-medium border border-[#e5e0d8]" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-[#2e2e2a] bg-[#1a1a18]">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141413] border-b border-[#2e2e2a] text-xs text-[#a09d94] font-mono">
        <span>{match ? match[1] : 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1 text-[#a09d94] hover:text-[#faf9f5] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs text-[#edeae1] font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

export const SelectiveMessageViewer: React.FC<SelectiveMessageViewerProps> = ({
  conversation,
  options,
  onToggleMessageId,
  onOpenRawJson
}) => {
  if (!conversation) return null;

  // Filter messages using engine
  const selectedMessages = filterMessagesBySelection(conversation, options);
  const selectedIdSet = new Set(selectedMessages.map((m) => m.id));

  // Determine base selection without context
  const baseSelectedMessages = filterMessagesBySelection(conversation, {
    ...options,
    includePrecedingContext: false
  });
  const baseSelectedIdSet = new Set(baseSelectedMessages.map((m) => m.id));

  // Compute stats for header bar
  const userCount = selectedMessages.filter((m) => m.sender === 'user').length;
  const assistantCount = selectedMessages.filter((m) => m.sender === 'assistant').length;

  const selectedDates = selectedMessages.map((m) => m.dateString).filter(Boolean);
  selectedDates.sort();
  const startDate = selectedDates.length > 0 ? selectedDates[0] : '';
  const endDate = selectedDates.length > 0 ? selectedDates[selectedDates.length - 1] : '';
  const dateRangeStr = startDate
    ? startDate === endDate
      ? formatBadgeDate(startDate)
      : `${formatBadgeDate(startDate)}  ~  ${formatBadgeDate(endDate)}`
    : 'No selection';

  let lastRenderedDate = '';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 bg-[#faf9f5] flex flex-col text-[#1f1e1d]">
      {/* Sticky Header Preview Info Bar */}
      <div className="sticky top-0 z-10 bg-[#faf9f5]/90 border-b border-[#e8e5dd] px-6 py-3 backdrop-blur-xl flex items-center justify-between shadow-sm text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-[#1f1e1d] flex items-center space-x-2 tracking-tight">
            <span className="w-5 h-5 rounded-md bg-[#cc5a36] flex items-center justify-center text-white">
              <ClaudeIcon className="w-3 h-3" />
            </span>
            <span className="font-claude-serif text-sm">{conversation.title}</span>
          </span>
          <span className="text-[#d9d5cb]">|</span>
          <span className="text-[#6b6963] font-mono text-[11px] bg-[#f0eee6] px-2.5 py-0.5 rounded-full border border-[#e8e5dd]">
            {selectedMessages.length} / {conversation.messages.length} msgs selected
          </span>
        </div>

        {/* Rightmost Date Range Badge */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-white rounded-full border border-[#e8e5dd] text-[#1f1e1d] font-mono text-[11px] shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-[#9e9b91]" />
            <span className="font-medium text-[#1f1e1d]">{dateRangeStr}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-[#f0eee6] border border-[#e8e5dd] text-[#1f1e1d] flex items-center space-x-1.5 font-medium">
              <User className="w-3 h-3 text-[#6b6963]" />
              <span>{userCount} User</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#f0eee6] border border-[#e8e5dd] text-[#1f1e1d] flex items-center space-x-1.5 font-medium">
              <ClaudeIcon className="w-3 h-3 text-[#cc5a36]" />
              <span>{assistantCount} Claude</span>
            </span>
          </div>
        </div>
      </div>

      {/* Message Feed — EXACT Claude Layout with Interactive Selection Checkboxes */}
      <div className="p-4 sm:p-8 space-y-6">
        {conversation.messages.map((msg, index) => {
          const isSelected = selectedIdSet.has(msg.id);
          const isContextAdded = isSelected && !baseSelectedIdSet.has(msg.id);
          const isUser = msg.sender === 'user';
          const msgKey = msg.id || `msg-${index}`;

          // Insert date separator when date changes
          const showDateSeparator = msg.dateString && msg.dateString !== lastRenderedDate;
          if (msg.dateString) lastRenderedDate = msg.dateString;

          return (
            <React.Fragment key={msgKey}>
              {/* Date Separator Header */}
              {showDateSeparator && (
                <div className="flex items-center gap-3 py-2 animate-claude-fade">
                  <div className="flex-1 h-px bg-[#e8e5dd]" />
                  <div className="flex items-center space-x-1.5 px-3.5 py-1 bg-white rounded-full border border-[#e8e5dd] text-[#6b6963] text-xs font-medium shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-[#cc5a36]" />
                    <span>{formatDisplayDate(msg.dateString)}</span>
                  </div>
                  <div className="flex-1 h-px bg-[#e8e5dd]" />
                </div>
              )}

              {isUser ? (
                /* ─── User Message: Right Aligned Bubble with Checkbox ─── */
                <div
                  onClick={() => onToggleMessageId(msg.id)}
                  className={`flex justify-end w-full max-w-4xl mx-auto cursor-pointer group transition-all duration-200 ${
                    isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[75%] justify-end">
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMessageId(msg.id);
                      }}
                      className={`w-5 h-5 rounded-md mt-3 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#cc5a36] text-white shadow-sm'
                          : 'bg-white border border-[#d9d5cb] text-transparent hover:border-[#cc5a36]'
                      }`}
                      title={isSelected ? 'Selected (click to exclude)' : 'Excluded (click to select)'}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${isSelected ? 'scale-100' : 'scale-50'}`} />
                    </button>

                    {/* Speech Bubble */}
                    <div className={`bg-[#f0eee5] border rounded-3xl p-4 sm:p-5 text-[#1f1e1d] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all ${
                      isSelected ? 'border-[#e5e2d9] ring-1 ring-[#cc5a36]/30' : 'border-[#e5e2d9]/70'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] text-[#8c887b] mb-1.5 gap-4">
                        <span className="font-semibold text-[#6b6963]">You</span>
                        <div className="flex items-center space-x-2">
                          <span>{msg.dateString}{msg.timeString ? ` ${msg.timeString}` : ''}</span>
                          {isContextAdded && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                              <Link2 className="w-2.5 h-2.5" />
                              <span>Parent Context</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRawJson(msg);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[#8c887b] hover:text-[#1f1e1d] transition-opacity"
                            title="Inspect JSON"
                          >
                            <FileJson className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Attachments if any */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-3 space-y-1.5">
                          {msg.attachments.map((att, attIdx) => (
                            <div
                              key={attIdx}
                              className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-[#e5e2d9] text-xs text-[#1f1e1d]"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#cc5a36] flex-shrink-0" />
                              <span className="font-medium truncate">{att.file_name || att.name || 'Attachment'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="prose prose-stone max-w-none text-[14.5px] leading-relaxed text-[#1f1e1d] whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── Claude Message: Left Aligned Flow with Checkbox ─── */
                <div
                  onClick={() => onToggleMessageId(msg.id)}
                  className={`flex justify-start w-full max-w-4xl mx-auto cursor-pointer group transition-all duration-200 ${
                    isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-start space-x-3 w-full max-w-3xl">
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMessageId(msg.id);
                      }}
                      className={`w-5 h-5 rounded-md mt-1 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#cc5a36] text-white shadow-sm'
                          : 'bg-white border border-[#d9d5cb] text-transparent hover:border-[#cc5a36]'
                      }`}
                      title={isSelected ? 'Selected (click to exclude)' : 'Excluded (click to select)'}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${isSelected ? 'scale-100' : 'scale-50'}`} />
                    </button>

                    <div className="w-full">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2 pb-1">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#cc5a36] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                            <ClaudeIcon className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-sm text-[#1f1e1d]">Claude</span>
                          <span className="text-[11px] text-[#8c887b] font-mono">#{index + 1}</span>
                          {isContextAdded && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                              <Link2 className="w-2.5 h-2.5" />
                              <span>Parent Context</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-[#8c887b]">
                          <span>{msg.dateString}{msg.timeString ? ` ${msg.timeString}` : ''}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRawJson(msg);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[#8c887b] hover:text-[#1f1e1d] transition-opacity p-0.5"
                            title="Inspect JSON"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="prose prose-stone max-w-none text-[15px] leading-relaxed text-[#1f1e1d] prose-headings:font-claude-serif prose-headings:text-[#1f1e1d] prose-p:text-[#1f1e1d] prose-p:leading-relaxed prose-li:text-[#1f1e1d] pl-1">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre({ children }: any) {
                              return <>{children}</>;
                            },
                            p({ children }: any) {
                              return <p className="mb-3 leading-relaxed text-[#1f1e1d] last:mb-0">{children}</p>;
                            },
                            code: CodeBlockItem
                          }}
                        >
                          {processSandboxContent(msg.content, false, 'markdown')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
