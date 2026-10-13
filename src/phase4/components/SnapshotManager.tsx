'use client';

import React, { useState } from 'react';
import { SharedSnapshot } from '../types';
import { 
  Globe, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  Eye, 
  ShieldCheck, 
  Layers,
  Sparkles
} from 'lucide-react';

interface SnapshotManagerProps {
  snapshots: SharedSnapshot[];
  onDeleteSnapshot: (id: string) => void;
  onSelectSnapshot?: (snapshot: SharedSnapshot) => void;
}

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({
  snapshots,
  onDeleteSnapshot,
  onSelectSnapshot
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (snapshot: SharedSnapshot) => {
    const url = `${window.location.origin}/share/${snapshot.metadata?.customSlug || snapshot.shortCode || snapshot.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(snapshot.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (snapshots.length === 0) {
    return (
      <div className="bg-white border border-[#e5e2d8] rounded-2xl p-6 text-center text-xs text-[#716f68] space-y-2 shadow-sm">
        <Globe className="w-8 h-8 text-[#9ca3af] mx-auto" />
        <p className="font-medium text-[#141416]">No active public share links generated yet.</p>
        <p className="text-[11px] text-[#716f68]">Configure your options above and click &quot;Generate Public Share Link&quot;!</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5e2d8] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm select-none text-[#141416]">
      <div className="flex items-center justify-between pb-3 border-b border-[#e5e2d8]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-[#ebe8df] border border-[#dedbd0] flex items-center justify-center text-[#141416]">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-semibold text-[#141416] text-sm tracking-tight">Active Shared Web Links</h3>
        </div>
        <span className="text-xs text-[#716f68] font-mono bg-[#ebe8df] px-2.5 py-0.5 rounded-full border border-[#e5e2d8]">{snapshots.length} link(s)</span>
      </div>

      <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 pr-1">
        {snapshots.map((snap) => {
          const shareUrl = `${window.location.origin}/share/${snap.metadata?.customSlug || snap.shortCode || snap.id}`;

          return (
            <div
              key={snap.id}
              onClick={() => onSelectSnapshot && onSelectSnapshot(snap)}
              className="p-3.5 bg-[#faf9f5] border border-[#e5e2d8] hover:border-[#141416] hover:bg-white rounded-2xl transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:shadow-sm flex items-center justify-between gap-3 text-xs group cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-[#141416] truncate text-xs">
                    {snap.title}
                  </h4>
                  {snap.metadata?.totalRedacted > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb] font-mono font-medium">
                      {snap.metadata.totalRedacted} Redacted
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-[#716f68] font-mono">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-[#9ca3af]" />
                    <span>{snap.dateRange.start} ~ {snap.dateRange.end}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3 h-3 text-[#9ca3af]" />
                    <span>{snap.metadata.totalMessages} msgs</span>
                  </span>
                  {snap.metadata.viewsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-[#141416]">
                        <Eye className="w-3 h-3" />
                        <span>{snap.metadata.viewsCount} views</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(snap);
                  }}
                  className="px-3 py-1 bg-white hover:bg-[#ebe8df] active:scale-95 text-[#141416] border border-[#e5e2d8] rounded-full transition-all duration-200 flex items-center space-x-1 text-[11px] shadow-sm"
                  title="Copy Share Link"
                >
                  {copiedId === snap.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 animate-keystone-scale" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#716f68]" />
                  )}
                  <span>{copiedId === snap.id ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-white hover:bg-[#ebe8df] active:scale-95 text-[#716f68] hover:text-[#141416] border border-[#e5e2d8] rounded-full transition-all duration-200 shadow-sm"
                  title="Open Reader View in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSnapshot(snap.id);
                  }}
                  className="p-1.5 bg-white hover:bg-rose-50 active:scale-95 text-[#9ca3af] hover:text-rose-600 border border-[#e5e2d8] rounded-full transition-all duration-200 shadow-sm"
                  title="Delete Share Link"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
