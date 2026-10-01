'use client';

import React, { useState } from 'react';
import { SharedSnapshot } from '../types';
import { 
  Share2, 
  Link as LinkIcon, 
  Lock, 
  Copy, 
  Check, 
  Code, 
  ExternalLink, 
  Sparkles,
  QrCode,
  Calendar,
  Layers,
  ShieldCheck
} from 'lucide-react';

interface ShareLinkGeneratorProps {
  onGenerateShareLink: (customOptions: {
    customSlug?: string;
    watermarkText?: string;
    passcode?: string;
  }) => Promise<SharedSnapshot | null>;
  activeSnapshot: SharedSnapshot | null;
}

export const ShareLinkGenerator: React.FC<ShareLinkGeneratorProps> = ({
  onGenerateShareLink,
  activeSnapshot
}) => {
  const [customSlug, setCustomSlug] = useState('');
  const [passcode, setPasscode] = useState('');
  const [watermarkText, setWatermarkText] = useState('Shared via Claude Selective Share');
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const snap = await onGenerateShareLink({
        customSlug: customSlug.trim() || undefined,
        watermarkText: watermarkText.trim() || undefined,
        passcode: passcode.trim() || undefined
      });

      if (snap) {
        const fullUrl = `${window.location.origin}/share/${snap.metadata.customSlug || snap.shortCode || snap.id}`;
        setCreatedUrl(fullUrl);
      }
    } catch (err) {
      console.error('Error generating share link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = () => {
    if (createdUrl) {
      navigator.clipboard.writeText(createdUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const embedCode = createdUrl
    ? `<iframe src="${createdUrl}" width="100%" height="600" frameborder="0" style="border-radius: 12px; overflow: hidden;"></iframe>`
    : '';

  const handleCopyEmbed = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/30">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Web Snapshot Link Generator</h3>
            <p className="text-xs text-slate-400">Publish immutable, interactive public share links & embeds</p>
          </div>
        </div>

        {createdUrl && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 font-mono">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Link Active</span>
          </span>
        )}
      </div>

      {/* Generator Form Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Custom Slug Input */}
        <div className="space-y-1">
          <label className="text-slate-300 font-medium flex items-center space-x-1">
            <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Custom URL Slug (Optional)</span>
          </label>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-'))}
            placeholder="e.g. os-paper-chat"
            className="w-full bg-slate-950 border border-slate-800 text-amber-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Optional Passcode Input */}
        <div className="space-y-1">
          <label className="text-slate-300 font-medium flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>PIN Passcode (Optional)</span>
          </label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="e.g. 1234"
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Branding Watermark */}
        <div className="space-y-1">
          <label className="text-slate-300 font-medium flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Watermark Branding</span>
          </label>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Shared via Claude Selective Share"
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Generate Action Button */}
      <div className="pt-1 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/30 transition-all flex items-center space-x-2"
        >
          <Share2 className="w-4 h-4 fill-white" />
          <span>{isGenerating ? 'Publishing Snapshot...' : '⚡ Generate Public Share Link'}</span>
        </button>

        {createdUrl && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs transition-colors flex items-center space-x-1.5"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 rounded-xl text-xs transition-colors flex items-center space-x-1.5 font-medium"
            >
              <span>Test Reader View</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>
        )}
      </div>

      {/* Active Share Link & Embed Display Box */}
      {createdUrl && (
        <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Public Share URL:</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">{createdUrl}</span>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <code className="text-slate-200 font-mono text-[11px] truncate flex-1 pr-2">{createdUrl}</code>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium transition-colors"
            >
              {copiedUrl ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Embed Code Box */}
          <div className="space-y-1 pt-1 border-t border-slate-900">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <Code className="w-3 h-3 text-amber-400" />
                <span>Embed Code (`&lt;iframe&gt;`)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                {copiedEmbed ? 'Embed Copied!' : 'Copy iFrame Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
