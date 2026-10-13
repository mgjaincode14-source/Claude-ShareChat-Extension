'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UnifiedConversation, UnifiedMessage } from '../types';
import { 
  User, 
  Copy, 
  Check, 
  FileText, 
  Calendar, 
  Clock, 
  Cpu, 
  Search, 
  FileJson
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface ConversationViewerProps {
  conversation: UnifiedConversation | null;
  onOpenRawJson: (msg?: UnifiedMessage) => void;
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

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  conversation,
  onOpenRawJson
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#faf9f5]">
        <div className="w-16 h-16 rounded-2xl bg-[#f5f4ee] border border-[#e8e5dd] flex items-center justify-center text-[#cc5a36] mb-4 shadow-sm">
          <ClaudeIcon className="w-8 h-8" />
        </div>
        <h2 className="font-claude-serif text-xl font-bold text-[#1f1e1d] mb-2 tracking-tight">No Conversation Selected</h2>
        <p className="text-sm text-[#6b6963] max-w-md">
          Select a Claude conversation from the sidebar or click <span className="text-[#cc5a36] font-semibold">Import</span> to upload your Claude export.
        </p>
      </div>
    );
  }

  const filteredMessages = conversation.messages.filter((m) =>
    searchQuery ? m.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#faf9f5] overflow-hidden">
      {/* Top Bar Header */}
      <div className="p-4 border-b border-[#e8e5dd] bg-[#faf9f5]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h1 className="font-claude-serif text-lg font-bold text-[#1f1e1d] tracking-tight">{conversation.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f0eee6] text-[#6b6963] border border-[#e8e5dd] uppercase tracking-wider">
              {conversation.metadata.exportSource.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-[#6b6963]">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#9e9b91]" />
              <span>Created {conversation.createdDateString}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-[#9e9b91]" />
              <span>{conversation.messages.length} messages</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-[#9e9b91]" />
              <span>{conversation.metadata.model || 'Claude 3.5 Sonnet'}</span>
            </span>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center space-x-2">
          {/* Search inside chat */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9e9b91]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in chat..."
              className="bg-[#ffffff] border border-[#e8e5dd] text-[#1f1e1d] text-xs rounded-full pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#cc5a36] placeholder-[#9e9b91] w-44 transition-all duration-200 focus:w-56 shadow-sm"
            />
          </div>

          {/* View Raw JSON */}
          <button
            onClick={() => onOpenRawJson()}
            className="px-3.5 py-1.5 bg-[#ffffff] hover:bg-[#f5f4ee] active:scale-95 border border-[#e8e5dd] text-[#1f1e1d] rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 shadow-sm"
            title="Inspect Raw Parsed JSON Structure"
          >
            <FileJson className="w-3.5 h-3.5 text-[#cc5a36]" />
            <span>Raw JSON</span>
          </button>
        </div>
      </div>

      {/* Messages Stream — EXACT Claude Chatbot Layout */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-7 scrollbar-thin">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-[#6b6963] text-xs">
            No messages matching search term "{searchQuery}"
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const msgKey = msg.id || `msg-${index}`;

            if (isUser) {
              /* ─── User Query: Right Aligned In Claude's Speech Bubble ─── */
              return (
                <div key={msgKey} className="flex justify-end w-full max-w-4xl mx-auto group">
                  <div className="max-w-[85%] sm:max-w-[75%] bg-[#f0eee5] border border-[#e5e2d9] rounded-3xl px-5 py-4 text-[#1f1e1d] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all">
                    {/* Timestamp & Inspect */}
                    <div className="flex items-center justify-between text-[11px] text-[#8c887b] mb-1.5 gap-4">
                      <span className="font-medium text-[#6b6963]">You</span>
                      <div className="flex items-center space-x-2">
                        <span>{msg.dateString}{msg.timeString ? ` ${msg.timeString}` : ''}</span>
                        <button
                          onClick={() => onOpenRawJson(msg)}
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
                            className="flex items-center space-x-2 p-2 bg-[#ffffff]/80 rounded-xl border border-[#e5e2d9] text-xs text-[#1f1e1d]"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#cc5a36] flex-shrink-0" />
                            <span className="font-medium truncate">{att.file_name || att.name || 'Attachment'}</span>
                            {att.file_size && (
                              <span className="text-[10px] text-[#8c887b]">({Math.round(att.file_size / 1024)} KB)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User Query Content */}
                    <div className="prose prose-stone max-w-none text-[14.5px] leading-relaxed text-[#1f1e1d] whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            }

            /* ─── Claude Response: Left Aligned, Clean Manuscript Flow ─── */
            return (
              <div key={msgKey} className="flex justify-start w-full max-w-4xl mx-auto group">
                <div className="w-full max-w-3xl">
                  {/* Claude Header: Terracotta Asterism + Model Badge */}
                  <div className="flex items-center justify-between mb-2.5 pb-1">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#cc5a36] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <ClaudeIcon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm text-[#1f1e1d]">Claude</span>
                      {msg.model && (
                        <span className="px-2 py-0.5 rounded-full bg-[#f0eee6] border border-[#e5e0d8] text-[10px] text-[#6b6963] font-medium font-mono">
                          {msg.model}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-[#8c887b]">
                      <span>{msg.dateString}{msg.timeString ? ` ${msg.timeString}` : ''}</span>
                      <button
                        onClick={() => onOpenRawJson(msg)}
                        className="opacity-0 group-hover:opacity-100 text-[#8c887b] hover:text-[#1f1e1d] transition-opacity p-0.5"
                        title="Inspect JSON"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Claude Response Body */}
                  <div className="prose prose-stone max-w-none text-[15px] leading-relaxed text-[#1f1e1d] prose-headings:font-claude-serif prose-headings:text-[#1f1e1d] prose-p:text-[#1f1e1d] prose-p:leading-relaxed prose-li:text-[#1f1e1d]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre({ children }: any) {
                          return <>{children}</>;
                        },
                        p({ children }: any) {
                          return <p className="mb-3.5 leading-relaxed text-[#1f1e1d] last:mb-0">{children}</p>;
                        },
                        code: CodeBlockItem
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Claude Quick Actions Bar */}
                  <div className="flex items-center space-x-3 mt-3 pt-1 text-xs text-[#8c887b]">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.content, msgKey)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md hover:bg-[#edeae1] text-[#6b6963] hover:text-[#1f1e1d] transition-colors"
                      title="Copy response"
                    >
                      {copiedMsgId === msgKey ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] text-emerald-700 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
