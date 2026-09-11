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
    <div className="p-5 bg-slate-900/90 border border-amber-500/30 rounded-2xl space-y-4 shadow-xl">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Zap className="w-4 h-4 fill-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
            <span>Temporary 1-Click Browser Import Bridge</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              Bypasses Cloudflare 100%
            </span>
          </h3>
          <p className="text-xs text-slate-400">Import any real Claude chat or shared link in 1 click</p>
        </div>
      </div>

      {/* 3 Step Instructions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="font-bold text-amber-400">Step 1: Drag Bookmark</span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Drag the orange button below into your browser's Bookmarks Bar.
          </p>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="font-bold text-amber-400">Step 2: Open Claude</span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Open any chat on <code className="text-amber-300 font-mono">claude.ai</code> or any shared link.
          </p>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="font-bold text-amber-400">Step 3: Click Bookmark</span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
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
          className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-950/40 transition-all flex items-center space-x-2 cursor-grab active:cursor-grabbing border border-amber-400/30"
          title="Drag this button to your browser Bookmarks Bar!"
        >
          <Bookmark className="w-4 h-4 fill-white" />
          <span>⚡ Drag to Bookmarks Bar: Import to Claude Selective Tool</span>
        </a>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCheckBridge}
            className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/30 text-amber-300 rounded-xl text-xs transition-colors flex items-center space-x-1.5 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Bridged Chat</span>
          </button>

          <button
            onClick={handleCopyScript}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs transition-colors flex items-center space-x-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Bookmark URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
