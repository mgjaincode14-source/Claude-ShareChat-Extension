'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SharedSnapshot } from '../types';
import { 
  Bot, 
  User, 
  Check, 
  Copy, 
  Calendar, 
  ShieldCheck, 
  Search, 
  Download, 
  Share2, 
  Sparkles, 
  FileText, 
  Code,
  Layers,
  Lock,
  ExternalLink
} from 'lucide-react';
import { downloadFile, generateMarkdownExport, generateJsonExport, generateHtmlExport, generateTextExport } from '@/phase3/exportEngine';

interface PublicSnapshotViewerProps {
  snapshot: SharedSnapshot;
}

export const PublicSnapshotViewer: React.FC<PublicSnapshotViewerProps> = ({ snapshot }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [senderFilter, setSenderFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Filter messages based on reader controls
  const filteredMessages = snapshot.messages.filter((m) => {
    const matchesSender = senderFilter === 'all' || m.sender === senderFilter;
    const matchesSearch = !searchTerm.trim() || m.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSender && matchesSearch;
  });

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadFormat = (fmt: 'markdown' | 'json' | 'html' | 'text') => {
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
      watermarkText: snapshot.metadata?.watermarkText || 'Shared via Claude Selective Share'
    };

    let content = '';
    if (fmt === 'markdown') content = generateMarkdownExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'json') content = generateJsonExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'html') content = generateHtmlExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);
    if (fmt === 'text') content = generateTextExport(mockConv, snapshot.messages, mockExportOpts, mockRedactionOpts);

    const extMap = { markdown: 'md', json: 'json', html: 'html', text: 'txt' };
    const mimeMap = { markdown: 'text/markdown', json: 'application/json', html: 'text/html', text: 'text/plain' };

    downloadFile(content, `${snapshot.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extMap[fmt]}`, mimeMap[fmt]);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Passcode Protected Share</h2>
            <p className="text-xs text-slate-400 mt-1">Enter the 4-digit PIN to view this shared Claude conversation snapshot.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Enter PIN Passcode..."
              className="w-full bg-slate-950 border border-slate-800 text-amber-300 text-center font-mono text-base rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {passcodeError && (
              <p className="text-xs text-red-400 font-medium">Incorrect PIN passcode. Please try again.</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-950/30"
            >
              Unlock Conversation Snapshot
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800/90 px-4 sm:px-8 py-3 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md">
            <Share2 className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 leading-tight">{snapshot.title}</h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Immutable Shared Web Snapshot • {snapshot.metadata?.totalMessages || snapshot.messages.length} messages
            </p>
          </div>
        </div>

        {/* Metadata Badges & Header Actions */}
        <div className="flex items-center space-x-2">
          {/* Verified Redaction Badge */}
          {snapshot.metadata?.totalRedacted > 0 && (
            <div className="hidden sm:flex items-center space-x-1 px-3 py-1 bg-emerald-950/40 rounded-lg border border-emerald-500/40 text-emerald-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{snapshot.metadata.totalRedacted} Masked</span>
            </div>
          )}

          {/* Date Range Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950 rounded-lg border border-amber-500/50 text-amber-300 font-mono text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{snapshot.dateRange.start} ~ {snapshot.dateRange.end}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>
        </div>
      </header>

      {/* Reader Controls Toolbar */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shared conversation..."
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-500"
          />
        </div>

        {/* Sender Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSenderFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              senderFilter === 'all' ? 'bg-amber-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Messages ({snapshot.messages.length})
          </button>
          <button
            type="button"
            onClick={() => setSenderFilter('user')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 ${
              senderFilter === 'user' ? 'bg-amber-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3 h-3 text-blue-400" />
            <span>User</span>
          </button>
          <button
            type="button"
            onClick={() => setSenderFilter('assistant')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 ${
              senderFilter === 'assistant' ? 'bg-amber-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3 h-3 text-amber-400" />
            <span>Claude</span>
          </button>
        </div>

        {/* Download Snapshot Formats */}
        <div className="flex items-center space-x-1.5 text-slate-400">
          <span className="text-[11px] font-mono">Download:</span>
          <button
            type="button"
            onClick={() => handleDownloadFormat('markdown')}
            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-mono text-[10px]"
            title="Download Markdown .md"
          >
            .md
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFormat('json')}
            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-mono text-[10px]"
            title="Download JSON .json"
          >
            .json
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFormat('html')}
            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-mono text-[10px]"
            title="Download HTML .html"
          >
            .html
          </button>
        </div>
      </div>

      {/* Shared Feed Stream */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-700" />
            <p className="text-xs">No matching messages found for your search filter.</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id || index}
                className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg"
              >
                {/* Header */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/50 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${isUser ? 'bg-slate-800 border border-slate-700' : 'bg-gradient-to-tr from-amber-600 to-orange-500'}`}>
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-semibold text-slate-200">{isUser ? 'User' : 'Claude'}</span>
                    {msg.dateString && (
                      <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {msg.dateString}{msg.timeString ? `, ${msg.timeString}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">#{index + 1}</span>
                </div>

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
                                onClick={() => handleCopyCode(codeString, `${msg.id}_${index}`)}
                                className="flex items-center space-x-1 text-slate-400 hover:text-amber-300 transition-colors"
                              >
                                {copiedCodeId === `${msg.id}_${index}` ? (
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
            );
          })
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>{snapshot.metadata?.watermarkText || 'Shared via Claude Selective Share Tool'}</p>
      </footer>
    </div>
  );
};
