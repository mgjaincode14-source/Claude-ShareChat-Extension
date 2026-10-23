'use client';

import React, { useState } from 'react';
import { SharedSnapshot } from '../types';
import { getShareBaseUrl } from '../snapshotStore';
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
        const fullUrl = `${getShareBaseUrl()}/share/${snap.metadata.customSlug || snap.shortCode || snap.id}`;
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
    <div className="bg-white border border-[#e5e2d8] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm select-none text-[#141416]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e5e2d8]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#faf1ec] border border-[#f0d5cb] flex items-center justify-center text-[#cc5a36]">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-claude-serif font-semibold text-[#1f1e1d] text-sm">Web Snapshot Link Generator</h3>
            <p className="text-xs text-[#6b6963]">Publish immutable, interactive public share links & embeds</p>
          </div>
        </div>

        {createdUrl && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb] flex items-center space-x-1 font-mono">
            <Sparkles className="w-3 h-3 text-[#cc5a36]" />
            <span>Link Active</span>
          </span>
        )}
      </div>

      {/* Generator Form Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Custom Slug Input */}
        <div className="space-y-1">
          <label className="text-[#141416] font-medium flex items-center space-x-1">
            <LinkIcon className="w-3.5 h-3.5 text-[#716f68]" />
            <span>Custom URL Slug (Optional)</span>
          </label>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-'))}
            placeholder="e.g. os-paper-chat"
            className="w-full bg-[#faf9f5] border border-[#e5e2d8] hover:bg-white text-[#141416] text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#141416] font-mono transition-colors"
          />
        </div>

        {/* Optional Passcode Input */}
        <div className="space-y-1">
          <label className="text-[#141416] font-medium flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-[#716f68]" />
            <span>PIN Passcode (Optional)</span>
          </label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="e.g. 1234"
            className="w-full bg-[#faf9f5] border border-[#e5e2d8] hover:bg-white text-[#141416] text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#141416] font-mono transition-colors"
          />
        </div>

        {/* Branding Watermark */}
        <div className="space-y-1">
          <label className="text-[#141416] font-medium flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#716f68]" />
            <span>Watermark Branding</span>
          </label>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Shared via Claude Selective Share"
            className="w-full bg-[#faf9f5] border border-[#e5e2d8] hover:bg-white text-[#141416] text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#141416] transition-colors"
          />
        </div>
      </div>

      {/* Generate Action Button */}
      <div className="pt-1 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-6 py-2.5 bg-[#cc5a36] hover:bg-[#b84b29] text-white font-medium rounded-full text-xs shadow-sm transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
        >
          <Share2 className="w-4 h-4 fill-white" />
          <span>{isGenerating ? 'Publishing Snapshot...' : '⚡ Generate Public Share Link'}</span>
        </button>

        {createdUrl && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-white hover:bg-[#faf9f5] text-[#1f1e1d] border border-[#e8e5dd] rounded-full text-xs transition-colors flex items-center space-x-1.5 shadow-sm active:scale-95"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#6b6963]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-[#faf1ec] hover:bg-[#f6e5dc] text-[#b84b29] border border-[#f0d5cb] rounded-full text-xs transition-colors flex items-center space-x-1.5 font-medium shadow-sm active:scale-95"
            >
              <span>Test Reader View</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#cc5a36]" />
            </a>
          </div>
        )}
      </div>

      {/* Active Share Link & Embed Display Box */}
      {createdUrl && (
        <div className="p-4 bg-[#faf9f5] border border-[#e5e2d8] rounded-2xl space-y-3 text-xs animate-keystone-fade">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#141416] flex items-center space-x-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Public Share URL:</span>
            </span>
            <span className="text-[11px] text-[#716f68] font-mono">{createdUrl}</span>
          </div>

          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#e5e2d8]">
            <code className="text-[#141416] font-mono text-[11px] truncate flex-1 pr-2">{createdUrl}</code>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3 py-1 bg-[#141416] hover:bg-[#27272a] text-white rounded-full text-[11px] font-medium transition-colors"
            >
              {copiedUrl ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Embed Code Box */}
          <div className="space-y-1 pt-2 border-t border-[#e5e2d8]">
            <div className="flex items-center justify-between text-[11px] text-[#716f68]">
              <span className="flex items-center space-x-1">
                <Code className="w-3 h-3 text-[#716f68]" />
                <span>Embed Code (`&lt;iframe&gt;`)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="text-[#141416] hover:underline font-medium"
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
