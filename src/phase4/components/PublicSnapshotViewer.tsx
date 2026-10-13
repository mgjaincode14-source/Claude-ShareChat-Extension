'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SharedSnapshot } from '../types';
import { 
  Check, 
  Copy, 
  Calendar, 
  ShieldCheck, 
  Search, 
  Download, 
  Share2, 
  Lock, 
  Cpu,
  User
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';
import { 
  downloadFile, 
  generateMarkdownExport, 
  generateJsonExport, 
  generateHtmlExport, 
  generateClaudeChatExport,
  generateTextExport,
  processSandboxContent
} from '@/phase3/exportEngine';

interface PublicSnapshotViewerProps {
  snapshot: SharedSnapshot;
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

export const PublicSnapshotViewer: React.FC<PublicSnapshotViewerProps> = ({ snapshot }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [senderFilter, setSenderFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [showSandboxActivity, setShowSandboxActivity] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const [passcodeInput, setPasscodeInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(!snapshot.metadata?.passcode);
  const [passcodeError, setPasscodeError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === snapshot.metadata?.passcode) {
      setIsUnlocked(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const filteredMessages = snapshot.messages.filter((m) => {
    const matchesSender = senderFilter === 'all' || m.sender === senderFilter;
    const matchesSearch = !searchTerm.trim() || m.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSender && matchesSearch;
  });

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMsg = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleDownloadFormat = (fmt: 'markdown' | 'json' | 'html' | 'text' | 'claude-chat') => {
    const mockConv: any = {
      id: snapshot.id,
      title: snapshot.title,
      messages: snapshot.messages,
      metadata: {
        model: snapshot.originalModel,
        dateRange: snapshot.dateRange
      }
    };
    const mockRedactionOpts: any = {
      anonymizeUser: false,
      anonymizeAssistant: false
    };
    const mockExportOpts: any = {
      format: fmt,
      includeMetadataHeader: true,
      includeTimestamp: true,
      watermarkText: snapshot.metadata?.watermarkText || 'Shared via Claude Selective Share',
      includeSandboxSteps: showSandboxActivity
    };

    let content = '';
    if (fmt === 'claude-chat') content = generateClaudeChatExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'markdown') content = generateMarkdownExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'json') content = generateJsonExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'html') content = generateHtmlExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'text') content = generateTextExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);

    const extMap: Record<string, string> = { 'claude-chat': 'html', markdown: 'md', json: 'json', html: 'html', text: 'txt' };
    const mimeMap: Record<string, string> = {
      'claude-chat': 'text/html',
      markdown: 'text/markdown',
      json: 'application/json',
      html: 'text/html',
      text: 'text/plain'
    };

    downloadFile(content, `${snapshot.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extMap[fmt]}`, mimeMap[fmt]);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 text-[#1f1e1d] font-sans">
        <div className="bg-white border border-[#e8e5dd] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-xl text-center animate-claude-scale">
          <div className="w-12 h-12 rounded-2xl bg-[#faf1ec] border border-[#f0d5cb] text-[#cc5a36] flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-claude-serif text-lg font-bold text-[#1f1e1d] tracking-tight">Passcode Protected Share</h2>
            <p className="text-xs text-[#6b6963] mt-1">Enter the 4-digit PIN to view this shared Claude conversation snapshot.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Enter PIN Passcode..."
              className="w-full bg-[#faf9f5] border border-[#e8e5dd] text-[#1f1e1d] text-center font-mono text-base rounded-2xl px-4 py-3 focus:outline-none focus:border-[#cc5a36] transition-colors"
              autoFocus
            />
            {passcodeError && (
              <p className="text-xs text-rose-600 font-medium animate-claude-fade">Incorrect PIN passcode. Please try again.</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-[#cc5a36] hover:bg-[#b84b29] active:scale-95 text-white rounded-full text-xs font-semibold transition-all duration-200 shadow-sm"
            >
              Unlock Conversation Snapshot
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#1f1e1d] font-sans flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#faf9f5]/90 border-b border-[#e8e5dd] px-4 sm:px-8 py-3.5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#cc5a36] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <ClaudeIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-claude-serif font-bold text-sm text-[#1f1e1d] leading-tight tracking-tight">{snapshot.title}</h1>
            <p className="text-[11px] text-[#6b6963] font-mono">
              Shared Claude Snapshot • {snapshot.metadata?.totalMessages || snapshot.messages.length} messages
            </p>
          </div>
        </div>

        {/* Metadata Badges & Header Actions */}
        <div className="flex items-center space-x-2">
          {/* Verified Redaction Badge */}
          {snapshot.metadata?.totalRedacted > 0 && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-[#faf1ec] rounded-full border border-[#f0d5cb] text-[#b84b29] text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#cc5a36]" />
              <span>{snapshot.metadata.totalRedacted} Masked</span>
            </div>
          )}

          {/* Full Conversation Date Span */}
          {snapshot.metadata?.fullConversationDateRange && (
            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-white rounded-full border border-[#e8e5dd] text-[#6b6963] font-mono text-[11px]">
              <span className="text-[#9e9b91] text-[9px] uppercase tracking-wide leading-none mb-0.5">Full Chat</span>
              <span>{snapshot.metadata.fullConversationDateRange.start} ~ {snapshot.metadata.fullConversationDateRange.end}</span>
            </div>
          )}

          {/* Filtered / Selected Date Range */}
          <div className="flex flex-col items-end px-3 py-1 bg-white rounded-full border border-[#e8e5dd] text-[#1f1e1d] font-mono text-[11px] shadow-sm">
            <span className="text-[#6b6963] text-[9px] uppercase tracking-wide leading-none mb-0.5 flex items-center space-x-1">
              <Calendar className="w-2.5 h-2.5 text-[#9e9b91]" />
              <span>Selected</span>
            </span>
            <span className="font-medium">{snapshot.dateRange.start} ~ {snapshot.dateRange.end}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="px-4 py-2 bg-[#cc5a36] hover:bg-[#b84b29] active:scale-95 text-white rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-white animate-claude-scale" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Reader Controls Toolbar */}
      <div className="bg-[#faf9f5]/80 border-b border-[#e8e5dd] px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none backdrop-blur-md">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9e9b91]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shared conversation..."
            className="w-full bg-[#ffffff] border border-[#e8e5dd] text-[#1f1e1d] text-xs rounded-full pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#cc5a36] placeholder-[#9e9b91] transition-colors"
          />
        </div>

        {/* Sender Filter Tabs */}
        <div className="flex items-center space-x-1 bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8]">
          <button
            type="button"
            onClick={() => setSenderFilter('all')}
            className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 ${
              senderFilter === 'all'
                ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            All Messages ({snapshot.messages.length})
          </button>
          <button
            type="button"
            onClick={() => setSenderFilter('user')}
            className={`px-3 py-1 rounded-full transition-all duration-200 flex items-center space-x-1.5 active:scale-95 ${
              senderFilter === 'user'
                ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <User className="w-3 h-3 text-[#6b6963]" />
            <span>User</span>
          </button>
          <button
            type="button"
            onClick={() => setSenderFilter('assistant')}
            className={`px-3 py-1 rounded-full transition-all duration-200 flex items-center space-x-1.5 active:scale-95 ${
              senderFilter === 'assistant'
                ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <ClaudeIcon className="w-3 h-3 text-[#cc5a36]" />
            <span>Claude</span>
          </button>
        </div>

        {/* Download Snapshot Formats */}
        <div className="flex items-center space-x-1.5 text-[#6b6963]">
          {/* Toggle Sandbox Steps Button */}
          <button
            type="button"
            onClick={() => setShowSandboxActivity(!showSandboxActivity)}
            className={`px-3 py-1 border rounded-full text-xs font-medium transition-all duration-200 active:scale-95 flex items-center space-x-1 mr-1 ${
              showSandboxActivity
                ? 'bg-[#faf1ec] text-[#b84b29] border-[#f0d5cb] shadow-sm'
                : 'bg-white text-[#6b6963] border-[#e8e5dd] hover:text-[#1f1e1d]'
            }`}
            title="Toggle Claude Sandbox Activity steps"
          >
            <Cpu className="w-3.5 h-3.5 text-[#6b6963]" />
            <span>Sandbox: {showSandboxActivity ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-[11px] font-mono">Download:</span>
          <button
            type="button"
            onClick={() => handleDownloadFormat('claude-chat')}
            className="px-3 py-1 bg-[#cc5a36] hover:bg-[#b84b29] active:scale-95 text-white rounded-full font-mono text-[10px] font-medium transition-all duration-200 shadow-sm"
            title="Download Full Claude Chat HTML replica"
          >
            Claude Chat (.html)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFormat('markdown')}
            className="px-2.5 py-1 bg-white hover:bg-[#faf9f5] active:scale-95 border border-[#e8e5dd] text-[#1f1e1d] rounded-full font-mono text-[10px] transition-all duration-200 shadow-sm"
            title="Download Markdown .md"
          >
            .md
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFormat('json')}
            className="px-2.5 py-1 bg-white hover:bg-[#faf9f5] active:scale-95 border border-[#e8e5dd] text-[#1f1e1d] rounded-full font-mono text-[10px] transition-all duration-200 shadow-sm"
            title="Download JSON .json"
          >
            .json
          </button>
        </div>
      </div>

      {/* Shared Feed Stream — EXACT Claude Chatbot Layout */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-7">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-[#6b6963] space-y-2">
            <p className="text-xs">No matching messages found for your search filter.</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const msgKey = msg.id || `snap-msg-${index}`;

            if (isUser) {
              return (
                <div key={msgKey} className="flex justify-end w-full group">
                  <div className="max-w-[85%] sm:max-w-[75%] bg-[#f0eee5] border border-[#e5e2d9] rounded-3xl px-5 py-4 text-[#1f1e1d] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between text-[11px] text-[#8c887b] mb-1.5 gap-4">
                      <span className="font-semibold text-[#6b6963]">User</span>
                      {msg.dateString && (
                        <span>{msg.dateString}{msg.timeString ? `, ${msg.timeString}` : ''}</span>
                      )}
                    </div>
                    <div className="prose prose-stone max-w-none text-[14.5px] leading-relaxed text-[#1f1e1d] whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={msgKey} className="flex justify-start w-full group">
                <div className="w-full max-w-3xl">
                  {/* Claude Header */}
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
                    </div>
                  </div>

                  {/* Prose Body */}
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
                      {processSandboxContent(msg.content, showSandboxActivity, 'markdown')}
                    </ReactMarkdown>
                  </div>

                  {/* Copy message button */}
                  <div className="flex items-center space-x-3 mt-3 pt-1 text-xs text-[#8c887b]">
                    <button
                      type="button"
                      onClick={() => handleCopyMsg(msg.content, msgKey)}
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
      </main>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-[#e8e5dd] text-center text-xs text-[#6b6963] bg-[#faf9f5]">
        <p>{snapshot.metadata?.watermarkText || 'Shared via Claude Selective Share Tool'}</p>
      </footer>
    </div>
  );
};
