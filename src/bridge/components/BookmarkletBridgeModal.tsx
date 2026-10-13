'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BOOKMARKLET_HREF } from '../bookmarklet';
import { 
  Zap, 
  Bookmark, 
  Check, 
  Copy, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface BookmarkletBridgeModalProps {
  onImportSuccess?: (conversations?: any[]) => void;
}

export const BookmarkletBridgeModal: React.FC<BookmarkletBridgeModalProps> = ({ onImportSuccess }) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  // Set href via direct DOM reference to bypass React's javascript: URL JSX blocker
  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.setAttribute('href', BOOKMARKLET_HREF);
    }
  }, []);

  const handleCheckBridge = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/bridge-import');
      const data = await res.json();
      if (data.success && data.latestConversations && data.latestConversations.length > 0) {
        setStatusMessage(`Found ${data.latestConversations.length} bridged conversation(s)! Loading preview...`);
        if (onImportSuccess) {
          onImportSuccess(data.latestConversations);
        }
      } else {
        setStatusMessage('No bridged conversation received yet. Open claude.ai and click the bookmark!');
      }
    } catch (err) {
      setStatusMessage('Error connecting to local bridge API');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(BOOKMARKLET_HREF);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 bg-white border border-[#e5e2d8] rounded-2xl space-y-4 shadow-sm">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <Zap className="w-4 h-4 fill-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-[#141416] text-sm flex items-center space-x-2">
            <span>Temporary 1-Click Browser Import Bridge</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-200 font-mono font-medium">
              Bypasses Cloudflare 100%
            </span>
          </h3>
          <p className="text-xs text-[#716f68]">Import any real Claude chat or shared link in 1 click</p>
        </div>
      </div>

      {/* 3 Step Instructions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-[#faf9f5] rounded-xl border border-[#e5e2d8] space-y-1">
          <span className="font-bold text-[#141416]">Step 1: Drag Bookmark</span>
          <p className="text-[#716f68] text-[11px] leading-relaxed">
            Drag the button below into your browser's Bookmarks Bar.
          </p>
        </div>

        <div className="p-3 bg-[#faf9f5] rounded-xl border border-[#e5e2d8] space-y-1">
          <span className="font-bold text-[#141416]">Step 2: Open Claude</span>
          <p className="text-[#716f68] text-[11px] leading-relaxed">
            Open any chat on <code className="text-[#141416] bg-[#ebe8df] px-1 py-0.5 rounded font-mono">claude.ai</code> or any shared link.
          </p>
        </div>

        <div className="p-3 bg-[#faf9f5] rounded-xl border border-[#e5e2d8] space-y-1">
          <span className="font-bold text-[#141416]">Step 3: Click Bookmark</span>
          <p className="text-[#716f68] text-[11px] leading-relaxed">
            Click the bookmark. The chat loads in our tool in 1 second!
          </p>
        </div>
      </div>

      {/* Bookmarklet Drag Button (Ref based to bypass React JSX URL Security Blocker) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <a
          ref={anchorRef}
          draggable
          onClick={(e) => {
            // Prevent accidental click inside app; inform user to drag or click on claude.ai
            e.preventDefault();
            alert('To use this 1-click bridge:\n\n1. Drag this button to your browser Bookmarks Bar.\n2. Open any chat on claude.ai.\n3. Click the bookmark in your Bookmarks Bar!');
          }}
          className="px-4 py-2 bg-[#141416] hover:bg-[#27272a] text-white font-medium rounded-full text-xs shadow-sm transition-all flex items-center space-x-2 cursor-grab active:cursor-grabbing"
          title="Drag this button to your browser Bookmarks Bar!"
        >
          <Bookmark className="w-3.5 h-3.5 fill-white" />
          <span>⚡ Drag to Bookmarks Bar: Import to Claude Selective Tool</span>
        </a>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCheckBridge}
            className="px-3.5 py-2 bg-[#faf9f5] hover:bg-[#f3f2ec] border border-[#e5e2d8] text-[#141416] rounded-full text-xs transition-colors flex items-center space-x-1.5 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Bridged Chat</span>
          </button>

          <button
            onClick={handleCopyScript}
            className="px-3.5 py-2 bg-white hover:bg-[#faf9f5] text-[#716f68] hover:text-[#141416] rounded-full border border-[#e5e2d8] text-xs transition-colors flex items-center space-x-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#716f68]" />
                <span>Copy Bookmark URL</span>
              </>
            )}
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
