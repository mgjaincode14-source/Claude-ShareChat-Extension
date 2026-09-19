'use client';

import React, { useState } from 'react';
import { ExportFormat, ExportOptions } from '../types';
import { 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  FileCode, 
  FileJson, 
  Globe, 
  FileText, 
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';

interface ExportOptionsToolbarProps {
  options: ExportOptions;
  onChangeOptions: (newOpts: ExportOptions) => void;
  onDownload: () => void;
  onCopy: () => void;
  onOpenHtmlTab: () => void;
}

export const ExportOptionsToolbar: React.FC<ExportOptionsToolbarProps> = ({
  options,
  onChangeOptions,
  onDownload,
  onCopy,
  onOpenHtmlTab
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formats: { id: ExportFormat; label: string; icon: any; ext: string }[] = [
    { id: 'markdown', label: 'Markdown', icon: FileCode, ext: '.md' },
    { id: 'json', label: 'JSON Payload', icon: FileJson, ext: '.json' },
    { id: 'html', label: 'Standalone HTML', icon: Globe, ext: '.html' },
    { id: 'text', label: 'Plain Text', icon: FileText, ext: '.txt' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl select-none">
      {/* Top Format Tabs & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Format Selector Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {formats.map((f) => {
            const Icon = f.icon;
            const isActive = options.format === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeOptions({ ...options, format: f.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{f.label}</span>
                <span className="text-[10px] opacity-70 font-mono">{f.ext}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Download, Copy, Open in Tab */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onDownload}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold rounded-xl text-xs shadow-lg shadow-orange-950/30 transition-all flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download {options.format.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyClick}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs transition-colors flex items-center space-x-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Content</span>
              </>
            )}
          </button>

          {options.format === 'html' && (
            <button
              type="button"
              onClick={onOpenHtmlTab}
              className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 rounded-xl text-xs transition-colors flex items-center space-x-1.5"
              title="Open full page HTML preview in a new tab"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Open HTML Tab</span>
            </button>
          )}
        </div>
      </div>

      {/* Formatting & Watermark Customization Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
        {/* Toggle Metadata Header */}
        <label className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:border-slate-700">
          <span className="text-slate-300 font-medium">Include Metadata Header</span>
          <input
            type="checkbox"
            checked={options.includeMetadataHeader}
            onChange={(e) => onChangeOptions({ ...options, includeMetadataHeader: e.target.checked })}
            className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>

        {/* Toggle Timestamps */}
        <label className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:border-slate-700">
          <span className="text-slate-300 font-medium">Include Timestamps</span>
          <input
            type="checkbox"
            checked={options.includeTimestamp}
            onChange={(e) => onChangeOptions({ ...options, includeTimestamp: e.target.checked })}
            className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>

        {/* Watermark Input */}
        <div className="flex items-center space-x-2 p-1.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <input
            type="text"
            value={options.watermarkText}
            onChange={(e) => onChangeOptions({ ...options, watermarkText: e.target.value })}
            placeholder="Watermark / Branding text..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>
    </div>
  );
};
