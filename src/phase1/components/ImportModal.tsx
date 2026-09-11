'use client';

import React, { useState } from 'react';
import { parseClaudeZipFile, parseClaudeJsonContent, parseRawTextTranscript, parseClaudeShareLinkPayload } from '../parser';
import { UnifiedConversation, ImportResult } from '../types';
import { BookmarkletBridgeModal } from '@/bridge/components/BookmarkletBridgeModal';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  Clipboard, 
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
  Globe,
  Loader2,
  ExternalLink,
  Zap
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (conversations: UnifiedConversation[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'bridge' | 'link' | 'zip' | 'paste'>('bridge');
  const [shareUrl, setShareUrl] = useState('https://claude.ai/share/791d8870-1931-45eb-a7b7-3110f50c4940');
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  if (!isOpen) return null;

  const handleShareUrlSubmit = async () => {
    if (!shareUrl.trim()) return;
    setIsLoading(true);
    setImportResult(null);

    const uuidMatch = shareUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const uuid = uuidMatch ? uuidMatch[0] : null;

    let rawConversationData: any = null;

    // Attempt 1: Server Route Fetch
    try {
      const res = await fetch('/api/fetch-claude-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: shareUrl.trim() })
      });

      const data = await res.json();
      if (data.success && data.rawConversation) {
        rawConversationData = data.rawConversation;
      }
    } catch (err) {
      console.warn('Server fetch attempt failed:', err);
    }

    // Attempt 2: Direct Client Browser Fetch (if server route was blocked by Cloudflare)
    if (!rawConversationData && uuid) {
      try {
        const snapshotUrl = `https://claude.ai/api/chat_snapshots/${uuid}?rendering_mode=messages&render_all_tools=true`;
        const clientRes = await fetch(snapshotUrl, { mode: 'cors' });
        if (clientRes.ok) {
          rawConversationData = await clientRes.json();
        }
      } catch (err) {
        console.warn('Direct client fetch attempt failed:', err);
      }
    }

    // Attempt 3: Public CORS Proxy Fetch (Bypasses Cloudflare Server IP restrictions)
    if (!rawConversationData && uuid) {
      try {
        const proxyUrl = `https://corsproxy.io/?https://claude.ai/api/chat_snapshots/${uuid}?rendering_mode=messages&render_all_tools=true`;
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json && (json.chat_messages || json.messages || json.snapshot)) {
            rawConversationData = json;
          }
        }
      } catch (err) {
        console.warn('CORS proxy fetch attempt failed:', err);
      }
    }

    if (rawConversationData) {
      const result = parseClaudeShareLinkPayload(rawConversationData, shareUrl);
      setImportResult(result);
      if (result.success && result.conversations.length > 0) {
        onImportSuccess(result.conversations);
      }
    } else {
      setImportResult({
        success: false,
        conversations: [],
        errors: [
          `Claude.ai requires direct browser access for shared link (${uuid ? uuid.substring(0, 8) : 'shared'}). Open the link in your browser, copy the text or HTML, and paste it into the Paste tab to import 100% of your real chat!`
        ],
        message: 'Cloudflare Verification Required'
      });
    }

    setIsLoading(false);
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setImportResult(null);

    try {
      let result: ImportResult;

      if (file.name.endsWith('.zip')) {
        result = await parseClaudeZipFile(file);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        result = parseClaudeJsonContent(text, 'claude_json');
      } else {
        const text = await file.text();
        result = parseRawTextTranscript(text, file.name.replace(/\.[^/.]+$/, ''));
      }

      setImportResult(result);
      if (result.success && result.conversations.length > 0) {
        onImportSuccess(result.conversations);
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        conversations: [],
        errors: [err.message || 'File processing error'],
        message: 'Failed to parse uploaded file'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    setIsLoading(true);
    setImportResult(null);

    const result = parseRawTextTranscript(pastedText, customTitle.trim() || undefined);
    setImportResult(result);

    if (result.success && result.conversations.length > 0) {
      onImportSuccess(result.conversations);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Import Claude Conversations</h3>
              <p className="text-xs text-slate-400">Phase 1 Data Ingestion Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'bridge'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Bridge</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'link'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Shared Link</span>
          </button>
          <button
            onClick={() => setActiveTab('zip')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'zip'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Zip Export</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'paste'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>
        </div>

        {/* Tab 0: Temporary 1-Click Bookmarklet Bridge */}
        {activeTab === 'bridge' && (
          <BookmarkletBridgeModal onImportSuccess={onClose} />
        )}

        {/* Tab 1: Claude Shared Link Import */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Paste Public Claude Share Link:</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={shareUrl}
                  onChange={(e) => setShareUrl(e.target.value)}
                  placeholder="https://claude.ai/share/791d8870-1931-45eb-a7b7-3110f50c4940"
                  className="w-full bg-slate-950 border border-slate-800 text-amber-300 text-xs rounded-xl pl-3 pr-10 py-2.5 focus:outline-none focus:border-amber-500 font-mono"
                />
                {shareUrl && (
                  <button
                    onClick={() => setShareUrl('')}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Paste any public share link like <code className="text-amber-300/90 font-mono bg-slate-950 px-1 py-0.5 rounded border border-slate-800">https://claude.ai/share/...</code>
              </p>
            </div>

            <button
              onClick={handleShareUrlSubmit}
              disabled={!shareUrl.trim() || isLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-2 shadow-md shadow-amber-950/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Fetching Shared Conversation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Import Shared Claude Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Cloudflare Help Card if blocked */}
            {importResult && !importResult.success && (
              <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2 text-xs text-slate-300">
                <div className="flex items-center space-x-1.5 font-medium text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cloudflare Protection Detected</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Anthropic's server blocks direct automated server fetches to <code className="text-amber-300 font-mono">{shareUrl}</code>.
                </p>
                <div className="pt-1 flex items-center space-x-2">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-medium transition-colors flex items-center space-x-1"
                  >
                    <span>1. Open Link in Browser</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setActiveTab('paste')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition-colors"
                  >
                    2. Copy Chat Text & Paste Here
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Zip / JSON File Drag and Drop */}
        {activeTab === 'zip' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-amber-500 bg-amber-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
            }`}
          >
            <input
              type="file"
              accept=".zip,.json,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer space-y-3 block">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-md">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  Drop your Claude <code className="text-xs text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">conversations.json</code> or <code className="text-xs text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">.zip</code>
                </p>
                <p className="text-xs text-slate-500">
                  Supports official Anthropic export zips, raw JSON, or txt files.
                </p>
              </div>
              <span className="inline-block px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors">
                Browse Files
              </span>
            </label>
          </div>
        )}

        {/* Tab 3: Raw Text Transcript Paste */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Conversation Title (Optional)"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            />
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={6}
              placeholder="Paste your chat text copied directly from Claude here... (e.g. User: ... / Claude: ...)"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-mono scrollbar-thin scrollbar-thumb-slate-800 placeholder-slate-600"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim() || isLoading}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
            >
              <span>Parse & Import Real Transcript</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Feedback / Result Banner */}
        {importResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1 ${
              importResult.success
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/30 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center space-x-2 font-medium">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span>{importResult.message}</span>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="list-disc pl-5 text-[11px] opacity-80">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
