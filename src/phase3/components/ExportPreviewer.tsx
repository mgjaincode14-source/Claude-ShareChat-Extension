'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportFormat } from '../types';
import { Code, Eye, Layers, Copy, Check } from 'lucide-react';

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

  return (
    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-200">{title}</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] border border-slate-700">
            {format.toUpperCase()}
          </span>
        </div>

        {/* View Mode Toggle & Copy */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 ${
                viewMode === 'preview'
                  ? 'bg-amber-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Rendered</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 ${
                viewMode === 'code'
                  ? 'bg-amber-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw Code</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 rounded-xl transition-colors"
            title="Copy Raw Content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 p-5">
        {viewMode === 'code' || format === 'json' || format === 'text' ? (
          <pre className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap">
            <code>{exportedContent}</code>
          </pre>
        ) : format === 'html' ? (
          <iframe
            srcDoc={exportedContent}
            title="HTML Export Preview"
            className="w-full h-full min-h-[500px] border-0 rounded-xl bg-slate-900"
          />
        ) : (
          <div className="prose prose-invert prose-slate max-w-none text-sm leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-code:text-amber-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {exportedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
