'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { SelectionOptions } from '../types';
import { filterMessagesBySelection } from '../engine';
import { 
  Bot, 
  User, 
  Check, 
  Copy, 
  FileText, 
  Link2, 
  FileJson,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface SelectiveMessageViewerProps {
  conversation: UnifiedConversation | null;
  options: SelectionOptions;
  onToggleMessageId: (messageId: string) => void;
  onOpenRawJson: (msg?: UnifiedMessage) => void;
}

export const SelectiveMessageViewer: React.FC<SelectiveMessageViewerProps> = ({
  conversation,
  options,
  onToggleMessageId,
  onOpenRawJson
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!conversation) return null;

  // Filter messages using our engine
  const selectedMessages = filterMessagesBySelection(conversation, options);
  const selectedIdSet = new Set(selectedMessages.map((m) => m.id));

  // Determine base selection without context to know which ones were added via context linker
  const baseSelectedMessages = filterMessagesBySelection(conversation, {
    ...options,
    includePrecedingContext: false
  });
  const baseSelectedIdSet = new Set(baseSelectedMessages.map((m) => m.id));

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute stats for header bar
  const userCount = selectedMessages.filter((m) => m.sender === 'user').length;
  const assistantCount = selectedMessages.filter((m) => m.sender === 'assistant').length;

  const selectedDates = selectedMessages.map((m) => m.dateString).filter(Boolean);
  selectedDates.sort();
  const dateRangeStr = selectedDates.length > 0
    ? `${selectedDates[0]}  ~  ${selectedDates[selectedDates.length - 1]}`
    : 'No selection';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950 flex flex-col">
      {/* Sticky Header Preview Info Bar with Rightmost Red Box Date Range Badge */}
      <div className="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-800/90 px-6 py-2.5 backdrop-blur-md flex items-center justify-between shadow-md text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>{conversation.title}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {selectedMessages.length} / {conversation.messages.length} msgs previewed
          </span>
        </div>

        {/* Rightmost Date Range Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950 rounded-lg border border-red-500/80 text-slate-200 font-mono text-[11px] shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-amber-300">{dateRangeStr}</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-300 flex items-center space-x-1">
              <User className="w-3 h-3 text-blue-400" />
              <span>{userCount} User</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 flex items-center space-x-1">
              <Bot className="w-3 h-3 text-amber-400" />
              <span>{assistantCount} Claude</span>
            </span>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="p-4 sm:p-6 space-y-6">
        {conversation.messages.map((msg, index) => {
          const isSelected = selectedIdSet.has(msg.id);
          const isContextAdded = isSelected && !baseSelectedIdSet.has(msg.id);
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id || index}
              onClick={() => onToggleMessageId(msg.id)}
              className={`group relative flex space-x-4 max-w-4xl mx-auto rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-40 hover:opacity-80 hover:border-slate-700'
              }`}
            >
              {/* Left Interactive Selection Checkbox */}
              <div className="flex flex-col items-center justify-start pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMessageId(msg.id);
                  }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 border border-slate-700 text-transparent hover:border-amber-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 pt-0.5">
                {!isUser ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Message Body */}
              <div className="flex-1 min-w-0">
                {/* Header Info */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800/40">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-200">{isUser ? 'User' : 'Claude'}</span>
                    {msg.isTimestampVerified ? (
                      <span className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {msg.dateString} {msg.timeString}
                      </span>
                    ) : (
                      <span className="text-[11px] text-red-400 font-mono bg-red-950/30 px-2 py-0.5 rounded border border-red-500/30" title="No real timestamp found in the imported source data.">
                        ⚠ Unknown date
                      </span>
                    )}

                    {/* Context Auto-Linked Tag */}
                    {isContextAdded && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                        <Link2 className="w-3 h-3" />
                        <span>Parent Context</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500 font-mono">#{index + 1}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRawJson(msg);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-400 transition-opacity p-0.5"
                      title="Inspect JSON"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Attachments if any */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {msg.attachments.map((att, attIdx) => (
                      <div
                        key={attIdx}
                        className="flex items-center space-x-2 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-amber-300"
                      >
                        <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="font-medium truncate">{att.file_name || att.name || 'Attachment'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Markdown Content */}
                <div className="prose prose-invert prose-slate max-w-none text-sm leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-code:text-amber-300">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre({ children }: any) {
                        return <>{children}</>;
                      },
                      p({ children }: any) {
                        return <p className="mb-3 leading-relaxed text-slate-200 last:mb-0">{children}</p>;
                      },
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isInline = inline || (!match && !codeString.includes('\n'));

                        return !isInline ? (
                          <div className="relative group/code my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-mono">
                              <span>{match ? match[1] : 'code'}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCode(codeString, `${msg.id}_${index}`);
                                }}
                                className="flex items-center space-x-1 text-slate-400 hover:text-amber-300 transition-colors"
                              >
                                {copiedId === `${msg.id}_${index}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-3 overflow-x-auto text-xs text-slate-200 font-mono leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          </div>
                        ) : (
                          <code className="bg-slate-800/80 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
