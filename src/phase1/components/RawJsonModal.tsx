'use client';

import React, { useState } from 'react';
import { UnifiedConversation, UnifiedMessage } from '../types';
import { X, Copy, Check, FileJson } from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface RawJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UnifiedConversation | UnifiedMessage | null;
}

export const RawJsonModal: React.FC<RawJsonModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-claude-fade">
      <div className="bg-[#ffffff] border border-[#e8e5dd] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative overflow-hidden flex flex-col max-h-[85vh] animate-claude-scale">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e5dd] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#cc5a36] flex items-center justify-center text-white shadow-sm">
              <ClaudeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-claude-serif font-semibold text-[#1f1e1d] text-sm tracking-tight">Raw Data Inspection</h3>
              <p className="text-xs text-[#6b6963]">Parsed Claude JSON Structure</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-[#ffffff] hover:bg-[#faf9f5] active:scale-95 text-[#1f1e1d] rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 border border-[#e8e5dd] shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 animate-claude-scale" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#6b6963]" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-[#6b6963] hover:text-[#1f1e1d] p-1.5 rounded-lg transition-all duration-200 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* JSON Display Area */}
        <div className="flex-1 overflow-y-auto bg-[#1a1a18] p-4 rounded-xl border border-[#2e2e2a] font-mono text-xs text-[#faf9f5] leading-relaxed scrollbar-thin shadow-inner">
          <pre>{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
