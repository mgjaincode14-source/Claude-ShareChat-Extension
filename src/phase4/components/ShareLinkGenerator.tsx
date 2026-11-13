'use client';

import React, { useState } from 'react';
import { SharedSnapshot, ExpirationOption } from '../types';
import { getShareBaseUrl, resolveExpiresAt } from '../snapshotStore';
import {
  Share2,
  Link as LinkIcon,
  Lock,
  Copy,
  Check,
  Code,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Clock,
  Key,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface ShareLinkGeneratorProps {
  onGenerateShareLink: (customOptions: {
    customSlug?: string;
    watermarkText?: string;
    passcode?: string;
    expiresAt?: string;
  }) => Promise<SharedSnapshot | null>;
  activeSnapshot: SharedSnapshot | null;
}

const TTL_OPTIONS: { value: ExpirationOption; label: string; desc: string }[] = [
  { value: 'never',  label: 'Never',    desc: 'Link stays active until manually deleted' },
  { value: '24h',   label: '24 Hours', desc: 'Auto-expires tomorrow' },
  { value: '7d',    label: '7 Days',   desc: 'Auto-expires in one week' },
  { value: '30d',   label: '30 Days',  desc: 'Auto-expires in one month' }
];

export const ShareLinkGenerator: React.FC<ShareLinkGeneratorProps> = ({
  onGenerateShareLink,
  activeSnapshot
}) => {
  const [customSlug, setCustomSlug] = useState('');
  const [passcode, setPasscode] = useState('');
  const [watermarkText, setWatermarkText] = useState('Shared via Claude Selective Share');
  const [expiration, setExpiration] = useState<ExpirationOption>('never');
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [deletionToken, setDeletionToken] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showTokenWarning, setShowTokenWarning] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowTokenWarning(false);
    try {
      const expiresAt = resolveExpiresAt(expiration);
      const snap = await onGenerateShareLink({
        customSlug: customSlug.trim() || undefined,
        watermarkText: watermarkText.trim() || undefined,
        passcode: passcode.trim() || undefined,
        expiresAt
      });

      if (snap) {
        const fullUrl = `${getShareBaseUrl()}/share/${snap.metadata.customSlug || snap.shortCode || snap.id}`;
        setCreatedUrl(fullUrl);
        // Surface the deletion token so user can save it
        if (snap.metadata?.deletionToken) {
          setDeletionToken(snap.metadata.deletionToken);
          setShowTokenWarning(true);
        }
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

  const handleCopyToken = () => {
    if (deletionToken) {
      navigator.clipboard.writeText(deletionToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
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

      {/* Row 1: Slug, Passcode, Watermark */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Custom Slug */}
        <div className="space-y-1">
          <label className="text-[#141416] font-medium flex items-center space-x-1">
            <LinkIcon className="w-3.5 h-3.5 text-[#716f68]" />
            <span>Custom URL Slug <span className="text-[#9e9b91]">(optional)</span></span>
          </label>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-'))}
            placeholder="e.g. os-paper-chat"
            className="w-full bg-[#faf9f5] border border-[#e5e2d8] hover:bg-white text-[#141416] text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#141416] font-mono transition-colors"
          />
        </div>

        {/* Passcode */}
        <div className="space-y-1">
          <label className="text-[#141416] font-medium flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-[#716f68]" />
            <span>PIN Passcode <span className="text-[#9e9b91]">(optional)</span></span>
          </label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="e.g. 1234"
            className="w-full bg-[#faf9f5] border border-[#e5e2d8] hover:bg-white text-[#141416] text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#141416] font-mono transition-colors"
          />
          <p className="text-[10px] text-[#9e9b91] pl-1">Hashed server-side — plaintext never stored</p>
        </div>

        {/* Watermark */}
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

      {/* Row 2: TTL Selector */}
      <div className="space-y-1.5 text-xs">
        <label className="text-[#141416] font-medium flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5 text-[#716f68]" />
          <span>Link Expiration</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TTL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExpiration(opt.value)}
              title={opt.desc}
              className={`px-3.5 py-1.5 rounded-full border text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                expiration === opt.value
                  ? 'bg-[#1f1e1d] text-white border-[#1f1e1d] shadow-sm'
                  : 'bg-[#faf9f5] text-[#6b6963] border-[#e5e2d8] hover:border-[#1f1e1d] hover:text-[#1f1e1d]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {expiration !== 'never' && (
          <p className="text-[10px] text-[#9e9b91] pl-1">
            {TTL_OPTIONS.find((o) => o.value === expiration)?.desc}. Access to this link will return 410 Gone after expiry.
          </p>
        )}
      </div>

      {/* Generate Action */}
      <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
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

      {/* ── Deletion Token Warning ── */}
      {showTokenWarning && deletionToken && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 animate-claude-fade text-xs">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Save your deletion token</p>
              <p className="text-amber-700 mt-0.5 leading-relaxed">
                This token is the only way to delete this snapshot from another device or browser.
                Store it somewhere safe — it will not be shown again.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2">
            <Key className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <code className="font-mono text-[11px] text-amber-900 flex-1 truncate">{deletionToken}</code>
            <button
              type="button"
              onClick={handleCopyToken}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-[10px] font-medium transition-colors flex items-center space-x-1 active:scale-95"
            >
              {copiedToken ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowTokenWarning(false)}
            className="text-[10px] text-amber-600 hover:underline"
          >
            I've saved it — dismiss
          </button>
        </div>
      )}

      {/* Active Share Link & Embed Display Box */}
      {createdUrl && (
        <div className="p-4 bg-[#faf9f5] border border-[#e5e2d8] rounded-2xl space-y-3 text-xs animate-keystone-fade">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#141416] flex items-center space-x-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Public Share URL:</span>
            </span>
            {expiration !== 'never' && (
              <span className="flex items-center space-x-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                <Clock className="w-3 h-3" />
                <span>Expires in {TTL_OPTIONS.find((o) => o.value === expiration)?.label}</span>
              </span>
            )}
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

          {/* Deletion instructions */}
          {deletionToken && (
            <div className="pt-2 border-t border-[#e5e2d8] flex items-center space-x-1.5 text-[10px] text-[#9e9b91]">
              <Trash2 className="w-3 h-3 text-[#9e9b91]" />
              <span>
                To revoke from any device: <code className="font-mono text-[#6b6963]">DELETE /api/share?id=...&token=&lt;your-token&gt;</code>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
