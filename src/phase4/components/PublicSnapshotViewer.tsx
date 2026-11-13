'use client';

import React, { useState, useCallback } from 'react';
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
  User,
  Brain,
  ChevronDown,
  ChevronRight,
  FileCode2,
  AlertTriangle,
  Clock
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

// ─── Code Block Renderer ─────────────────────────────────────────────────────
const CodeBlockItem: React.FC<any> = ({ node, inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');
  const isInline = inline || (!match && !codeString.includes('\n'));

  if (isInline) {
    return (
      <code
        className="bg-[#f0eee6] text-[#1f1e1d] px-1.5 py-0.5 rounded text-xs font-mono font-medium border border-[#e5e0d8]"
        {...props}
      >
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

// ─── Thinking Block Renderer ─────────────────────────────────────────────────
const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="my-3 rounded-xl border border-[#e8e5dd] bg-[#f8f7f1] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs text-[#6b6963] hover:text-[#1f1e1d] hover:bg-[#f0eee6] transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-[#9e9b91] flex-shrink-0" />
        <span className="font-medium flex-1 text-left">Claude's Extended Thinking</span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 text-xs text-[#6b6963] leading-relaxed border-t border-[#e8e5dd] font-mono whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
};

// ─── Artifact Block Renderer ─────────────────────────────────────────────────
const ArtifactBlock: React.FC<{ type: string; title: string; language?: string; content: string }> = ({
  type,
  title,
  language,
  content
}) => {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'code' | 'preview'>('code');
  const isHtmlPreviewable = type === 'application/vnd.ant.html' || language === 'html';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-2xl border border-[#e8e5dd] bg-white overflow-hidden shadow-sm">
      {/* Artifact Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8f7f1] border-b border-[#e8e5dd]">
        <div className="flex items-center space-x-2 min-w-0">
          <FileCode2 className="w-3.5 h-3.5 text-[#cc5a36] flex-shrink-0" />
          <span className="text-xs font-semibold text-[#1f1e1d] truncate">{title || 'Artifact'}</span>
          {language && (
            <span className="px-1.5 py-0.5 rounded bg-[#f0eee6] border border-[#e5e0d8] text-[10px] font-mono text-[#6b6963]">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {isHtmlPreviewable && (
            <div className="flex items-center bg-[#f0eee6] border border-[#e5e0d8] rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setView('code')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  view === 'code' ? 'bg-[#1f1e1d] text-white' : 'text-[#6b6963] hover:text-[#1f1e1d]'
                }`}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setView('preview')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  view === 'preview' ? 'bg-[#1f1e1d] text-white' : 'text-[#6b6963] hover:text-[#1f1e1d]'
                }`}
              >
                Preview
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-[#e5e0d8] rounded-full text-[10px] text-[#6b6963] hover:text-[#1f1e1d] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Artifact Content */}
      {view === 'preview' && isHtmlPreviewable ? (
        <div className="relative w-full" style={{ height: '400px' }}>
          <iframe
            srcDoc={content}
            title={title || 'Artifact Preview'}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <pre className="p-4 overflow-x-auto text-xs text-[#1a1a18] font-mono leading-relaxed bg-[#1a1a18] text-[#edeae1] max-h-[400px]">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
};

// ─── Parse content blocks (thinking, artifacts, text) from Claude message ────
interface ContentBlock {
  type: 'text' | 'thinking' | 'artifact';
  content: string;
  artifactType?: string;
  artifactTitle?: string;
  artifactLanguage?: string;
}

function parseMessageBlocks(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Split on antthinking/antartifact tags
  const parts = raw.split(
    /(<antthinking>[\s\S]*?<\/antthinking>|<function_calls>[\s\S]*?<\/antml:function_calls>|<antartifact[^>]*>[\s\S]*?<\/antartifact>)/g
  );

  for (const part of parts) {
    if (!part.trim()) continue;

    // Extended Thinking block
    if (part.startsWith('<antthinking>')) {
      const thinking = part.replace(/<\/?antthinking>/g, '').trim();
      if (thinking) blocks.push({ type: 'thinking', content: thinking });
      continue;
    }

    // Tool use / function calls — skip (render as "[Tool Call]" note)
    if (part.startsWith('<function_calls>')) {
      continue;
    }

    // Artifact block
    if (part.startsWith('<antartifact')) {
      const typeMatch = /type="([^"]*)"/.exec(part);
      const titleMatch = /title="([^"]*)"/.exec(part);
      const langMatch = /language="([^"]*)"/.exec(part);
      const contentMatch = /<antartifact[^>]*>([\s\S]*?)<\/antartifact>/.exec(part);

      if (contentMatch) {
        blocks.push({
          type: 'artifact',
          content: contentMatch[1].trim(),
          artifactType: typeMatch?.[1],
          artifactTitle: titleMatch?.[1],
          artifactLanguage: langMatch?.[1]
        });
      }
      continue;
    }

    // Regular text
    if (part.trim()) {
      blocks.push({ type: 'text', content: part });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content: raw }];
}

// ─── Passcode Gate (server-side verification) ────────────────────────────────
interface PasscodeGateProps {
  snapshotId: string;
  onUnlocked: (fullSnapshot: SharedSnapshot) => void;
}

const PasscodeGate: React.FC<PasscodeGateProps> = ({ snapshotId, onUnlocked }) => {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) return;
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/share', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: snapshotId, passcode: passcodeInput.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success && data.snapshot) {
        onUnlocked(data.snapshot);
      } else if (res.status === 401) {
        setError('Incorrect passcode. Please try again.');
      } else if (res.status === 410) {
        setError('This share link has expired and is no longer accessible.');
      } else {
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 text-[#1f1e1d] font-sans">
      <div className="bg-white border border-[#e8e5dd] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-xl text-center animate-claude-scale">
        <div className="w-12 h-12 rounded-2xl bg-[#faf1ec] border border-[#f0d5cb] text-[#cc5a36] flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-claude-serif text-lg font-bold text-[#1f1e1d] tracking-tight">Passcode Protected Share</h2>
          <p className="text-xs text-[#6b6963] mt-1">
            Enter the passcode to view this shared Claude conversation snapshot.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Enter passcode..."
            className="w-full bg-[#faf9f5] border border-[#e8e5dd] text-[#1f1e1d] text-center font-mono text-base rounded-2xl px-4 py-3 focus:outline-none focus:border-[#cc5a36] transition-colors"
            autoFocus
            disabled={isVerifying}
          />
          {error && (
            <p className="text-xs text-rose-600 font-medium animate-claude-fade">{error}</p>
          )}
          <button
            type="submit"
            disabled={isVerifying || !passcodeInput.trim()}
            className="w-full py-3 bg-[#cc5a36] hover:bg-[#b84b29] active:scale-95 text-white rounded-full text-xs font-semibold transition-all duration-200 shadow-sm disabled:opacity-60"
          >
            {isVerifying ? 'Verifying...' : 'Unlock Conversation Snapshot'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Main Public Snapshot Viewer ─────────────────────────────────────────────
export const PublicSnapshotViewer: React.FC<PublicSnapshotViewerProps> = ({ snapshot: initialSnapshot }) => {
  const [snapshot, setSnapshot] = useState<SharedSnapshot>(initialSnapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [senderFilter, setSenderFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [showSandboxActivity, setShowSandboxActivity] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const isLocked = (snapshot as any)._locked === true || (snapshot.metadata?.passcodeProtected && snapshot.messages.length === 0);

  const handleUnlocked = useCallback((fullSnap: SharedSnapshot) => {
    setSnapshot(fullSnap);
  }, []);

  if (isLocked) {
    return <PasscodeGate snapshotId={snapshot.id} onUnlocked={handleUnlocked} />;
  }

  // Check if expired (belt + suspenders — server already rejects, but guard UI too)
  if (snapshot.metadata?.expiresAt && new Date(snapshot.metadata.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 text-[#1f1e1d]">
        <div className="bg-white border border-[#e8e5dd] rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="font-claude-serif text-lg font-bold">Share Link Expired</h2>
          <p className="text-sm text-[#6b6963]">This shared snapshot has passed its expiration date and is no longer accessible.</p>
          <a href="/" className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-medium text-white bg-[#cc5a36] hover:bg-[#b84b29] rounded-full transition-colors">
            Create Your Own Share Link
          </a>
        </div>
      </div>
    );
  }

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
      metadata: { model: snapshot.originalModel, dateRange: snapshot.dateRange }
    };
    const mockRedactionOpts: any = { anonymizeUser: false, anonymizeAssistant: false };
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
      'claude-chat': 'text/html', markdown: 'text/markdown', json: 'application/json', html: 'text/html', text: 'text/plain'
    };
    downloadFile(content, `${snapshot.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extMap[fmt]}`, mimeMap[fmt]);
  };

  const expiresAt = snapshot.metadata?.expiresAt ? new Date(snapshot.metadata.expiresAt) : null;
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#1f1e1d] font-sans flex flex-col">
      {/* Expiry Warning Banner */}
      {isExpiringSoon && expiresAt && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center space-x-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            This share link expires <strong>{expiresAt.toLocaleString()}</strong>. Download a copy before it disappears.
          </span>
        </div>
      )}

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

        <div className="flex items-center space-x-2">
          {snapshot.metadata?.totalRedacted > 0 && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-[#faf1ec] rounded-full border border-[#f0d5cb] text-[#b84b29] text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#cc5a36]" />
              <span>{snapshot.metadata.totalRedacted} Masked</span>
            </div>
          )}

          {snapshot.metadata?.passcodeProtected && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-emerald-700 text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Passcode Protected</span>
            </div>
          )}

          {snapshot.metadata?.fullConversationDateRange && (
            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-white rounded-full border border-[#e8e5dd] text-[#6b6963] font-mono text-[11px]">
              <span className="text-[#9e9b91] text-[9px] uppercase tracking-wide leading-none mb-0.5">Full Chat</span>
              <span>{snapshot.metadata.fullConversationDateRange.start} ~ {snapshot.metadata.fullConversationDateRange.end}</span>
            </div>
          )}

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
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9e9b91]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shared conversation..."
            className="w-full bg-white border border-[#e8e5dd] text-[#1f1e1d] text-xs rounded-full pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#cc5a36] placeholder-[#9e9b91] transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1 bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8]">
          {(['all', 'user', 'assistant'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSenderFilter(f)}
              className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 flex items-center space-x-1.5 ${
                senderFilter === f ? 'bg-[#1f1e1d] text-white font-medium shadow-sm' : 'text-[#6b6963] hover:text-[#1f1e1d]'
              }`}
            >
              {f === 'all' && <span>All Messages ({snapshot.messages.length})</span>}
              {f === 'user' && (
                <>
                  <User className="w-3 h-3" />
                  <span>User</span>
                </>
              )}
              {f === 'assistant' && (
                <>
                  <ClaudeIcon className="w-3 h-3 text-[#cc5a36]" />
                  <span>Claude</span>
                </>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1.5 text-[#6b6963]">
          <button
            type="button"
            onClick={() => setShowSandboxActivity(!showSandboxActivity)}
            className={`px-3 py-1 border rounded-full text-xs font-medium transition-all duration-200 active:scale-95 flex items-center space-x-1 mr-1 ${
              showSandboxActivity
                ? 'bg-[#faf1ec] text-[#b84b29] border-[#f0d5cb] shadow-sm'
                : 'bg-white text-[#6b6963] border-[#e8e5dd] hover:text-[#1f1e1d]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Sandbox: {showSandboxActivity ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-[11px] font-mono">Download:</span>
          {(['claude-chat', 'markdown', 'json'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleDownloadFormat(fmt)}
              className={`px-2.5 py-1 border rounded-full font-mono text-[10px] transition-all duration-200 active:scale-95 shadow-sm ${
                fmt === 'claude-chat'
                  ? 'bg-[#cc5a36] hover:bg-[#b84b29] text-white border-transparent'
                  : 'bg-white hover:bg-[#faf9f5] border-[#e8e5dd] text-[#1f1e1d]'
              }`}
            >
              {fmt === 'claude-chat' ? 'Claude Chat (.html)' : `.${fmt === 'markdown' ? 'md' : fmt}`}
            </button>
          ))}
        </div>
      </div>

      {/* Shared Feed Stream */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-7">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-[#6b6963] space-y-2">
            <p className="text-xs">No matching messages found for your search filter.</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const msgKey = msg.id || `snap-msg-${index}`;
            const processedContent = processSandboxContent(msg.content, showSandboxActivity, 'markdown');
            const contentBlocks = parseMessageBlocks(processedContent);

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
                    <div className="text-[11px] text-[#8c887b]">
                      {msg.dateString}{msg.timeString ? ` ${msg.timeString}` : ''}
                    </div>
                  </div>

                  {/* Content blocks: thinking → artifact → text */}
                  <div className="prose prose-stone max-w-none text-[15px] leading-relaxed text-[#1f1e1d] prose-headings:font-claude-serif prose-headings:text-[#1f1e1d] prose-p:text-[#1f1e1d] prose-p:leading-relaxed prose-li:text-[#1f1e1d]">
                    {contentBlocks.map((block, bi) => {
                      if (block.type === 'thinking') {
                        return <ThinkingBlock key={bi} content={block.content} />;
                      }
                      if (block.type === 'artifact') {
                        return (
                          <ArtifactBlock
                            key={bi}
                            type={block.artifactType || ''}
                            title={block.artifactTitle || 'Artifact'}
                            language={block.artifactLanguage}
                            content={block.content}
                          />
                        );
                      }
                      return (
                        <ReactMarkdown
                          key={bi}
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre({ children }: any) { return <>{children}</>; },
                            p({ children }: any) {
                              return <p className="mb-3.5 leading-relaxed text-[#1f1e1d] last:mb-0">{children}</p>;
                            },
                            code: CodeBlockItem
                          }}
                        >
                          {block.content}
                        </ReactMarkdown>
                      );
                    })}
                  </div>

                  {/* Copy message button */}
                  <div className="flex items-center space-x-3 mt-3 pt-1 text-xs text-[#8c887b]">
                    <button
                      type="button"
                      onClick={() => handleCopyMsg(msg.content, msgKey)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md hover:bg-[#edeae1] text-[#6b6963] hover:text-[#1f1e1d] transition-colors"
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

      {/* Footer */}
      <footer className="py-6 border-t border-[#e8e5dd] text-center text-xs text-[#6b6963] bg-[#faf9f5]">
        <p>{snapshot.metadata?.watermarkText || 'Shared via Claude Selective Share Tool'}</p>
        {expiresAt && (
          <p className="mt-1 text-[10px] text-[#9e9b91]">
            This link expires {expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </footer>
    </div>
  );
};
