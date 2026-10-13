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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-opacity duration-200">
      <div className="bg-[#ffffff] border border-[#e5e2d8] rounded-2xl max-w-xl w-full p-6 shadow-2xl shadow-black/15 space-y-6 relative overflow-hidden animate-keystone-scale">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#141416] flex items-center justify-center text-white shadow-sm">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#141416] text-base tracking-tight">Import Claude Conversations</h3>
              <p className="text-xs text-[#716f68]">Phase 1 Data Ingestion Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#716f68] hover:text-[#141416] p-1 rounded-lg transition-colors active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Claude Segmented Pills) */}
        <div className="flex bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8] text-xs">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 ${
              activeTab === 'bridge'
                ? 'bg-[#cc5a36] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Bridge</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 ${
              activeTab === 'link'
                ? 'bg-[#cc5a36] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Shared Link</span>
          </button>
          <button
            onClick={() => setActiveTab('zip')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 ${
              activeTab === 'zip'
                ? 'bg-[#cc5a36] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Zip Export</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 ${
              activeTab === 'paste'
                ? 'bg-[#cc5a36] text-white font-medium shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
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
              <label className="text-xs font-medium text-[#141416] flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-[#141416]" />
                <span>Paste Public Claude Share Link:</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={shareUrl}
                  onChange={(e) => setShareUrl(e.target.value)}
                  placeholder="https://claude.ai/share/791d8870-1931-45eb-a7b7-3110f50c4940"
                  className="w-full bg-[#ffffff] border border-[#e5e2d8] text-[#141416] text-xs rounded-xl pl-3 pr-10 py-2.5 focus:outline-none focus:border-[#141416] font-mono shadow-sm"
                />
                {shareUrl && (
                  <button
                    onClick={() => setShareUrl('')}
                    className="absolute right-3 top-3 text-[#716f68] hover:text-[#141416]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#716f68]">
                Paste any public share link like <code className="text-[#141416] font-mono bg-[#f3f2ec] px-1 py-0.5 rounded border border-[#e5e2d8]">https://claude.ai/share/...</code>
              </p>
            </div>

            <button
              onClick={handleShareUrlSubmit}
              disabled={!shareUrl.trim() || isLoading}
              className="w-full py-2.5 bg-[#141416] hover:bg-[#27272a] disabled:opacity-50 text-white rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Fetching Shared Conversation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Import Shared Claude Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Cloudflare Help Card if blocked */}
            {importResult && !importResult.success && (
              <div className="p-3 bg-[#faf1ec] border border-[#f0d5cb] rounded-xl space-y-2 text-xs text-[#1f1e1d]">
                <div className="flex items-center space-x-1.5 font-medium text-[#b84b29]">
                  <AlertTriangle className="w-4 h-4 text-[#cc5a36]" />
                  <span>Cloudflare Protection Detected</span>
                </div>
                <p className="text-[11px] text-[#6b6963] leading-relaxed">
                  Anthropic's server blocks direct automated server fetches to <code className="text-[#1f1e1d] font-mono">{shareUrl}</code>.
                </p>
                <div className="pt-1 flex items-center space-x-2">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#ffffff] hover:bg-[#faf9f5] text-[#1f1e1d] border border-[#e8e5dd] rounded-full text-[11px] font-medium transition-colors flex items-center space-x-1 shadow-sm"
                  >
                    <span>1. Open Link in Browser</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setActiveTab('paste')}
                    className="px-3 py-1.5 bg-[#cc5a36] hover:bg-[#b84b29] text-white rounded-full text-[11px] font-medium transition-colors shadow-sm"
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
                ? 'border-[#cc5a36] bg-[#faf1ec]'
                : 'border-[#e8e5dd] hover:border-[#cc5a36] bg-[#faf9f5]'
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
              <div className="w-12 h-12 rounded-2xl bg-[#ebe8df] text-[#141416] flex items-center justify-center mx-auto shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#141416]">
                  Drop your Claude <code className="text-xs bg-[#ffffff] px-1.5 py-0.5 rounded border border-[#e5e2d8] text-[#141416]">conversations.json</code> or <code className="text-xs bg-[#ffffff] px-1.5 py-0.5 rounded border border-[#e5e2d8] text-[#141416]">.zip</code>
                </p>
                <p className="text-xs text-[#716f68]">
                  Supports official Anthropic export zips, raw JSON, or txt files.
                </p>
              </div>
              <span className="inline-block px-4 py-1.5 bg-[#141416] hover:bg-[#27272a] text-white rounded-full text-xs font-medium transition-colors shadow-sm">
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
              className="w-full bg-[#ffffff] border border-[#e5e2d8] text-[#141416] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#141416] shadow-sm"
            />
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={6}
              placeholder="Paste your chat text copied directly from Claude here... (e.g. User: ... / Claude: ...)"
              className="w-full bg-[#ffffff] border border-[#e5e2d8] text-[#141416] text-xs rounded-xl p-3 focus:outline-none focus:border-[#141416] font-mono scrollbar-thin placeholder-[#9ca3af] shadow-sm"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim() || isLoading}
              className="w-full py-2.5 bg-[#141416] hover:bg-[#27272a] disabled:opacity-50 text-white rounded-full text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
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
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-2 font-medium">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
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
