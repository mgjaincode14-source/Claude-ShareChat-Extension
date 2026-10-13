'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportFormat } from '../types';
import { Code, Eye, Copy, Check } from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface ExportPreviewerProps {
  exportedContent: string;
  format: ExportFormat;
  title: string;
}

export const ExportPreviewer: React.FC<ExportPreviewerProps> = ({
  exportedContent,
  format,
  title
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHtmlBased = format === 'html' || format === 'claude-chat';

  return (
    <div className="flex-1 bg-white border border-[#e8e5dd] rounded-2xl flex flex-col overflow-hidden shadow-sm text-[#1f1e1d]">
      {/* Header Bar */}
      <div className="bg-[#faf9f5] border-b border-[#e8e5dd] px-5 py-3.5 flex items-center justify-between text-xs backdrop-blur-xl">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-lg bg-[#cc5a36] text-white flex items-center justify-center shadow-sm">
            <ClaudeIcon className="w-3.5 h-3.5" />
          </span>
          <span className="font-claude-serif font-semibold text-[#1f1e1d] text-sm tracking-tight">{title}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#f0eee6] text-[#6b6963] font-mono text-[10px] border border-[#e5e0d8] font-medium">
            {format === 'claude-chat' ? 'CLAUDE CHAT (.HTML)' : format.toUpperCase()}
          </span>
        </div>

        {/* View Mode Toggle & Copy */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8]">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-full transition-all duration-200 flex items-center space-x-1.5 active:scale-95 ${
                viewMode === 'preview'
                  ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                  : 'text-[#6b6963] hover:text-[#1f1e1d]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Rendered</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-full transition-all duration-200 flex items-center space-x-1.5 active:scale-95 ${
                viewMode === 'code'
                  ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                  : 'text-[#6b6963] hover:text-[#1f1e1d]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw Code</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 bg-white hover:bg-[#faf9f5] text-[#6b6963] hover:text-[#1f1e1d] border border-[#e8e5dd] rounded-full transition-all duration-200 active:scale-90 shadow-sm"
            title="Copy Raw Content"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 animate-claude-scale" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 p-4 sm:p-6 bg-[#faf9f5]">
        {viewMode === 'code' || format === 'json' || format === 'text' ? (
          <pre className="p-4 bg-[#1a1a18] border border-[#2e2e2a] rounded-xl text-xs font-mono text-[#edeae1] leading-relaxed overflow-x-auto whitespace-pre-wrap">
            <code>{exportedContent}</code>
          </pre>
        ) : isHtmlBased ? (
          <iframe
            srcDoc={exportedContent}
            title="HTML Export Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full min-h-[580px] border border-[#e8e5dd] rounded-xl bg-[#faf9f5] shadow-sm"
          />
        ) : (
          <div className="prose prose-stone max-w-none text-sm leading-relaxed text-[#1f1e1d] prose-headings:font-claude-serif prose-headings:text-[#1f1e1d]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {exportedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
