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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-500 space-y-2">
        <Globe className="w-8 h-8 text-slate-700 mx-auto" />
        <p>No active public share links generated yet.</p>
        <p className="text-[11px] text-slate-600">Configure your options above and click "Generate Public Share Link"!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-slate-100 text-sm">Active Shared Web Links</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">{snapshots.length} link(s)</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
        {snapshots.map((snap) => {
          const shareUrl = `${window.location.origin}/share/${snap.metadata?.customSlug || snap.shortCode || snap.id}`;

          return (
            <div
              key={snap.id}
              onClick={() => onSelectSnapshot && onSelectSnapshot(snap)}
              className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-between gap-3 text-xs group cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-slate-200 truncate text-xs group-hover:text-amber-300 transition-colors">
                    {snap.title}
                  </h4>
                  {snap.metadata?.totalRedacted > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                      {snap.metadata.totalRedacted} Redacted
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    <span>{snap.dateRange.start} ~ {snap.dateRange.end}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3 h-3 text-slate-600" />
                    <span>{snap.metadata.totalMessages} msgs</span>
                  </span>
                  {snap.metadata.viewsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-amber-400">
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
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors flex items-center space-x-1 text-[11px]"
                  title="Copy Share Link"
                >
                  {copiedId === snap.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{copiedId === snap.id ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-slate-900 hover:bg-amber-950/40 text-slate-400 hover:text-amber-300 border border-slate-800 rounded-lg transition-colors"
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
                  className="p-1.5 bg-slate-900 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-slate-800 rounded-lg transition-colors"
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
