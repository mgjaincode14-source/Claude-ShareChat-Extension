'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UnifiedConversation, UnifiedMessage } from '../types';
import { 
  Bot, 
  User, 
  Copy, 
  Check, 
  Code, 
  FileText, 
  Calendar, 
  Clock, 
  Cpu, 
  Search, 
  FileJson,
  Sparkles,
  Download,
  Info
} from 'lucide-react';

interface ConversationViewerProps {
  conversation: UnifiedConversation | null;
  onOpenRawJson: (msg?: UnifiedMessage) => void;
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  conversation,
  onOpenRawJson
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/30 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 shadow-lg shadow-amber-950/20">
          <Bot className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">No Conversation Selected</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Select a Claude conversation from the sidebar or click <span className="text-amber-400 font-medium">Import</span> to upload your Claude <code className="text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-amber-300">conversations.json</code> zip export.
        </p>
      </div>
    );
  }

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = conversation.messages.filter((m) =>
    searchQuery ? m.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Bar Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">{conversation.title}</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              {conversation.metadata.exportSource.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Created {conversation.createdDateString}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{conversation.messages.length} messages</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>{conversation.metadata.model || 'Claude'}</span>
            </span>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center space-x-2">
          {/* Search inside chat */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in chat..."
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-500 w-44 transition-all"
            />
          </div>

          {/* View Raw JSON */}
          <button
            onClick={() => onOpenRawJson()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5"
            title="Inspect Raw Parsed JSON Structure"
          >
            <FileJson className="w-3.5 h-3.5 text-amber-400" />
            <span>Raw JSON</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No messages matching search term "{searchQuery}"
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const msgCodeId = `code_${msg.id}_${index}`;

            return (
              <div
                key={msg.id || index}
                className={`flex space-x-4 max-w-4xl mx-auto group ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Avatar for Assistant */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-orange-950/40">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Body Box */}
                <div
                  className={`relative rounded-2xl p-4 sm:p-5 border text-sm max-w-3xl transition-all shadow-sm ${
                    isUser
                      ? 'bg-amber-950/20 border-amber-700/30 text-amber-50 shadow-amber-950/10'
                      : 'bg-slate-900/90 border-slate-800/80 text-slate-200 shadow-slate-950/50'
                  }`}
                >
                  {/* Message Meta Info Header */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800/40">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1">
                      <span>{isUser ? 'User' : 'Claude'}</span>
                      {msg.model && (
                        <span className="text-[10px] text-slate-500 font-normal">({msg.model})</span>
                      )}
                    </span>
                    <div className="flex items-center space-x-2">
                      {msg.isTimestampVerified ? (
                        <span className="text-[11px] text-slate-500">{msg.dateString} {msg.timeString}</span>
                      ) : (
                        <span className="text-[11px] text-red-400 font-medium" title="No real timestamp found in the imported source data - filters may not include this message correctly.">
                          ⚠ Unknown date
                        </span>
                      )}
                      <button
                        onClick={() => onOpenRawJson(msg)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-400 transition-opacity p-0.5"
                        title="Inspect Message JSON"
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
                          {att.file_size && (
                            <span className="text-[10px] text-slate-500">({Math.round(att.file_size / 1024)} KB)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Markdown Content */}
                  <div className="prose prose-invert prose-slate max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800/80 prose-code:text-amber-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre({ children }: any) {
                          // Bypass react-markdown's default <pre> wrapper so we don't nest <div>/<pre> inside <pre>
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
                                  onClick={() => handleCopyCode(codeString, `${msg.id}_${index}`)}
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

                {/* Avatar for User */}
                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-300 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
