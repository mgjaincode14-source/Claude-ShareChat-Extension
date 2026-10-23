'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BOOKMARKLET_HREF, 
  BOOKMARKLET_RAW_CODE, 
  generateBookmarkletHref, 
  generateBookmarkletCode 
} from '../bookmarklet';
import { 
  Zap, 
  Bookmark, 
  Check, 
  Copy, 
  RefreshCw,
  Sparkles,
  Terminal,
  AlertCircle
} from 'lucide-react';

interface BookmarkletBridgeModalProps {
  onImportSuccess?: (conversations?: any[]) => void;
}

export const BookmarkletBridgeModal: React.FC<BookmarkletBridgeModalProps> = ({ onImportSuccess }) => {
  const [copiedBookmark, setCopiedBookmark] = useState(false);
  const [copiedConsole, setCopiedConsole] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [bookmarkHref, setBookmarkHref] = useState(BOOKMARKLET_HREF);
  const [consoleCode, setConsoleCode] = useState(BOOKMARKLET_RAW_CODE);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  // Set href via direct DOM reference to bypass React's javascript: URL JSX blocker
  // Dynamically points to the current active origin (production Vercel domain or localhost)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dynamicHref = generateBookmarkletHref(window.location.origin);
      const dynamicCode = generateBookmarkletCode(window.location.origin);
      setBookmarkHref(dynamicHref);
      setConsoleCode(dynamicCode);
      if (anchorRef.current) {
        anchorRef.current.setAttribute('href', dynamicHref);
      }
    }
  }, []);

  const handleCheckBridge = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/bridge-import');
      const data = await res.json();
      if (data.success && data.latestConversations && data.latestConversations.length > 0) {
        setStatusMessage(`Found ${data.latestConversations.length} bridged conversation(s) with authentic Claude timestamps!`);
        if (onImportSuccess) {
          onImportSuccess(data.latestConversations);
        }
      } else {
        setStatusMessage('No bridged conversation received yet. Open claude.ai and run the bridge!');
      }
    } catch (err) {
      setStatusMessage('Error connecting to bridge API');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyBookmarkUrl = () => {
    navigator.clipboard.writeText(bookmarkHref);
    setCopiedBookmark(true);
    setTimeout(() => setCopiedBookmark(false), 2000);
  };

  const handleCopyConsoleScript = () => {
    navigator.clipboard.writeText(consoleCode);
    setCopiedConsole(true);
    setTimeout(() => setCopiedConsole(false), 2000);
  };

  return (
    <div className="p-5 bg-white border border-[#e5e2d8] rounded-2xl space-y-4 shadow-sm">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <Zap className="w-4 h-4 fill-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-[#141416] text-sm flex items-center space-x-2">
            <span>Direct Claude API Bridge (Real Timestamps & Tree Traversal)</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-medium">
              API Exact Dates
            </span>
          </h3>
          <p className="text-xs text-[#716f68]">Extracts the complete conversation tree with exact microsecond timestamps from Claude&apos;s database</p>
        </div>
      </div>

      {/* Upgrade Notice */}
      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          <p className="font-medium text-amber-950">Important if you previously saved a bookmark:</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Please remove any old bookmark from your browser bar and drag the updated button below, or click <strong>Copy Console Script</strong> and paste directly into DevTools (F12) Console on <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">claude.ai</code>.
          </p>
        </div>
      </div>

      {/* 3 Step Instructions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-[#faf9f5] rounded-xl border border-[#e5e2d8] space-y-1">
          <span className="font-bold text-[#141416]">Step 1: Get the Bridge</span>
          <p className="text-[#716f68] text-[11px] leading-relaxed">
            Drag the button below to your Bookmarks Bar, or copy the Console script.
          </p>
        </div>

        <div className="p-3 bg-[#faf9f5] rounded-xl border border-[#e5e2d8] space-y-1">
          <span className="font-bold text-[#141416]">Step 2: Open Claude Chat</span>
          <p className="text-[#716f68] text-[11px] leading-relaxed">
            Navigate to any conversation on <code className="text-[#141416] bg-[#ebe8df] px-1 py-0.5 rounded font-mono">claude.ai/chat/...</code>.
          </p>
        </div>

        <div className="p-3 bg-[#faf9f5] rounded-xl border border-[#e5e2d8] space-y-1">
          <span className="font-bold text-[#141416]">Step 3: Run Bridge</span>
          <p className="text-[#716f68] text-[11px] leading-relaxed">
            Click the bookmark (or paste in Console). All messages with authentic dates load instantly!
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <a
          ref={anchorRef}
          draggable
          onClick={(e) => {
            e.preventDefault();
            alert('To use this 1-click bridge:\n\n1. Drag this button to your browser Bookmarks Bar.\n2. Open any chat on claude.ai.\n3. Click the bookmark in your Bookmarks Bar!');
          }}
          className="px-4 py-2 bg-[#141416] hover:bg-[#27272a] text-white font-medium rounded-full text-xs shadow-sm transition-all flex items-center space-x-2 cursor-grab active:cursor-grabbing"
          title="Drag this button to your browser Bookmarks Bar!"
        >
          <Bookmark className="w-3.5 h-3.5 fill-white" />
          <span>⚡ Drag to Bookmarks Bar: Claude Tree Bridge</span>
        </a>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleCopyConsoleScript}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs transition-colors flex items-center space-x-1.5 font-medium"
            title="Copy raw JavaScript to paste directly into browser console on claude.ai"
          >
            {copiedConsole ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied Console Script!</span>
              </>
            ) : (
              <>
                <Terminal className="w-3.5 h-3.5 text-emerald-700" />
                <span>Copy Console Script</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyBookmarkUrl}
            className="px-3 py-2 bg-white hover:bg-[#faf9f5] text-[#716f68] hover:text-[#141416] rounded-full border border-[#e5e2d8] text-xs transition-colors flex items-center space-x-1.5"
          >
            {copiedBookmark ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied Bookmark URL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#716f68]" />
                <span>Copy Bookmark URL</span>
              </>
            )}
          </button>

          <button
            onClick={handleCheckBridge}
            className="px-3 py-2 bg-[#faf9f5] hover:bg-[#f3f2ec] border border-[#e5e2d8] text-[#141416] rounded-full text-xs transition-colors flex items-center space-x-1.5 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Bridged Chat</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#faf1ec] border border-[#f0d5cb] rounded-xl text-xs text-[#1f1e1d] flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#cc5a36] flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
