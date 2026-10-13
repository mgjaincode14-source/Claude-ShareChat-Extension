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
  Cpu
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

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
    { id: 'claude-chat', label: 'Claude Chat', icon: ClaudeIcon, ext: '.html' },
    { id: 'markdown', label: 'Markdown', icon: FileCode, ext: '.md' },
    { id: 'json', label: 'JSON Payload', icon: FileJson, ext: '.json' },
    { id: 'html', label: 'Standalone HTML', icon: Globe, ext: '.html' },
    { id: 'text', label: 'Plain Text', icon: FileText, ext: '.txt' }
  ];

  const isHtmlFormat = options.format === 'html' || options.format === 'claude-chat';

  return (
    <div className="bg-white border border-[#e8e5dd] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm select-none text-[#1f1e1d]">
      {/* Top Format Tabs & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Format Selector Tabs */}
        <div className="flex items-center space-x-1 bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8]">
          {formats.map((f) => {
            const Icon = f.icon;
            const isActive = options.format === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeOptions({ ...options, format: f.id })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-[#1f1e1d] text-white shadow-sm'
                    : 'text-[#6b6963] hover:text-[#1f1e1d]'
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
            className="px-5 py-2.5 bg-[#cc5a36] hover:bg-[#b84b29] active:scale-95 text-white font-medium rounded-full text-xs shadow-sm transition-all duration-200 flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>
              {options.format === 'claude-chat' ? 'Download Claude Chat (.html)' : `Download ${options.format.toUpperCase()}`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyClick}
            className="px-4 py-2.5 bg-white hover:bg-[#faf9f5] active:scale-95 text-[#1f1e1d] border border-[#e8e5dd] rounded-full text-xs transition-all duration-200 flex items-center space-x-1.5 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 animate-claude-scale" />
                <span className="text-emerald-700 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#6b6963]" />
                <span>Copy Content</span>
              </>
            )}
          </button>

          {isHtmlFormat && (
            <button
              type="button"
              onClick={onOpenHtmlTab}
              className="px-4 py-2.5 bg-[#faf1ec] hover:bg-[#f6e5dc] active:scale-95 text-[#b84b29] border border-[#f0d5cb] rounded-full text-xs transition-all duration-200 flex items-center space-x-1.5 font-medium shadow-sm"
              title="Open full page preview in a new browser tab"
            >
              <ExternalLink className="w-4 h-4 text-[#cc5a36]" />
              <span>Open in New Tab</span>
            </button>
          )}
        </div>
      </div>

      {/* Formatting & Watermark Customization Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#e8e5dd] text-xs">
        {/* Toggle Metadata Header */}
        <div 
          onClick={() => onChangeOptions({ ...options, includeMetadataHeader: !options.includeMetadataHeader })}
          className="flex items-center justify-between p-3 bg-[#faf9f5] rounded-2xl border border-[#e8e5dd] cursor-pointer hover:bg-white hover:border-[#d9d5cb] transition-all duration-200"
        >
          <span className="text-[#1f1e1d] font-medium">Metadata Header</span>
          <div className={`claude-toggle-track ${options.includeMetadataHeader ? 'bg-[#cc5a36]' : 'bg-[#d9d5cb]'}`}>
            <div className={`claude-toggle-thumb ${options.includeMetadataHeader ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* Toggle Timestamps */}
        <div 
          onClick={() => onChangeOptions({ ...options, includeTimestamp: !options.includeTimestamp })}
          className="flex items-center justify-between p-3 bg-[#faf9f5] rounded-2xl border border-[#e8e5dd] cursor-pointer hover:bg-white hover:border-[#d9d5cb] transition-all duration-200"
        >
          <span className="text-[#1f1e1d] font-medium">Timestamps</span>
          <div className={`claude-toggle-track ${options.includeTimestamp ? 'bg-[#cc5a36]' : 'bg-[#d9d5cb]'}`}>
            <div className={`claude-toggle-thumb ${options.includeTimestamp ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* Toggle Sandbox Steps */}
        <div 
          onClick={() => onChangeOptions({ ...options, includeSandboxSteps: !options.includeSandboxSteps })}
          className="flex items-center justify-between p-3 bg-[#faf9f5] rounded-2xl border border-[#e8e5dd] cursor-pointer hover:bg-white hover:border-[#d9d5cb] transition-all duration-200"
        >
          <span className="text-[#1f1e1d] font-medium flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#6b6963]" />
            <span>Sandbox Activity</span>
          </span>
          <div className={`claude-toggle-track ${options.includeSandboxSteps ? 'bg-[#cc5a36]' : 'bg-[#d9d5cb]'}`}>
            <div className={`claude-toggle-thumb ${options.includeSandboxSteps ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* Watermark Input */}
        <div className="flex items-center space-x-2 p-1.5 bg-[#faf9f5] rounded-2xl border border-[#e8e5dd] hover:bg-white hover:border-[#d9d5cb] transition-colors">
          <input
            type="text"
            value={options.watermarkText}
            onChange={(e) => onChangeOptions({ ...options, watermarkText: e.target.value })}
            placeholder="Watermark text..."
            className="w-full bg-white border border-[#e8e5dd] text-[#1f1e1d] text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#cc5a36] transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
