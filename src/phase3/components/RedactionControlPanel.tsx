'use client';

import React, { useState } from 'react';
import { RedactionOptions, RedactionStats } from '../types';
import { 
  ShieldCheck, 
  Key, 
  Mail, 
  Globe, 
  Phone, 
  Plus, 
  X, 
  UserCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface RedactionControlPanelProps {
  options: RedactionOptions;
  stats: RedactionStats;
  onChangeOptions: (newOpts: RedactionOptions) => void;
  isScanning?: boolean;
  hasScanned?: boolean;
  onScanPII?: () => void;
}

export const RedactionControlPanel: React.FC<RedactionControlPanelProps> = ({
  options,
  stats,
  onChangeOptions,
  isScanning = false,
  hasScanned = false,
  onScanPII
}) => {
  const [keywordInput, setKeywordInput] = useState('');

  const toggleOption = (key: keyof RedactionOptions) => {
    onChangeOptions({
      ...options,
      [key]: !options[key]
    });
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    if (options.customKeywords.includes(trimmed)) {
      setKeywordInput('');
      return;
    }
    onChangeOptions({
      ...options,
      customKeywords: [...options.customKeywords, trimmed]
    });
    setKeywordInput('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    onChangeOptions({
      ...options,
      customKeywords: options.customKeywords.filter((k) => k !== keyword)
    });
  };

  return (
    <div className="bg-white border border-[#e8e5dd] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm select-none text-[#1f1e1d]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e8e5dd] gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#faf1ec] border border-[#f0d5cb] flex items-center justify-center text-[#cc5a36]">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-claude-serif font-semibold text-[#1f1e1d] text-sm flex items-center space-x-2">
              <span>Privacy & Redaction Engine</span>
              {isScanning ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#cc5a36] border border-[#f0d5cb] flex items-center space-x-1 animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>AI Scanning...</span>
                </span>
              ) : hasScanned ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>AI Scanned</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f0eee6] text-[#716f68] border border-[#e5e0d8] flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-[#cc5a36]" />
                  <span>LLM Guard</span>
                </span>
              )}
              {stats.totalRedacted > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb] font-mono">
                  {stats.totalRedacted} Masked
                </span>
              )}
            </h3>
            <p className="text-xs text-[#6b6963]">AI detection (Groq/Gemini) & masking for secrets & credentials</p>
          </div>
        </div>

        {/* Actions: Scan Secrets with AI & Style Selector */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {onScanPII && (
            <button
              type="button"
              onClick={onScanPII}
              disabled={isScanning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#1f1e1d] hover:bg-[#383734] text-white text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {isScanning ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[#f5a623]" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#f5a623]" />
                  <span>{hasScanned ? '↻ Re-scan Secrets' : '🤖 Scan Secrets with AI'}</span>
                </>
              )}
            </button>
          )}

          {/* Style Selector Toggle */}
          <div className="flex items-center space-x-1 bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8] text-xs">
            <button
              type="button"
              onClick={() => onChangeOptions({ ...options, replacementStyle: 'label' })}
              className={`px-3 py-1 rounded-full transition-all duration-200 font-mono text-[11px] ${
                options.replacementStyle === 'label'
                  ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                  : 'text-[#6b6963] hover:text-[#1f1e1d]'
              }`}
            >
              [REDACTED]
            </button>
            <button
              type="button"
              onClick={() => onChangeOptions({ ...options, replacementStyle: 'blocks' })}
              className={`px-3 py-1 rounded-full transition-all duration-200 font-mono text-[11px] ${
                options.replacementStyle === 'blocks'
                  ? 'bg-[#1f1e1d] text-white font-medium shadow-sm'
                  : 'text-[#6b6963] hover:text-[#1f1e1d]'
              }`}
            >
              ███████
            </button>
          </div>
        </div>
      </div>

      {/* Automated Detectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* API Keys */}
        <button
          type="button"
          onClick={() => toggleOption('redactApiKeys')}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2.5 cursor-pointer ${
            options.redactApiKeys
              ? 'bg-[#faf1ec] border-[#f0d5cb] text-[#b84b29] ring-1 ring-[#f0d5cb]/50 shadow-sm -translate-y-0.5'
              : 'bg-[#faf9f5] border-[#e8e5dd] text-[#6b6963] hover:border-[#d9d5cb] hover:bg-white hover:-translate-y-0.5'
          } active:scale-95`}
        >
          <div className="flex items-center justify-between">
            <Key className="w-4 h-4 text-[#cc5a36]" />
            <span className={`w-2 h-2 rounded-full transition-colors duration-200 ${options.redactApiKeys ? 'bg-[#cc5a36] animate-claude-pulse' : 'bg-[#d9d5cb]'}`} />
          </div>
          <div>
            <span className="font-semibold text-[#1f1e1d] block text-[11px]">API Keys & Secrets</span>
            <span className="text-[10px] text-[#6b6963] font-mono">
              {stats.apiKeysCount > 0 ? `${stats.apiKeysCount} found` : 'sk-..., Bearer...'}
            </span>
          </div>
        </button>

        {/* Emails */}
        <button
          type="button"
          onClick={() => toggleOption('redactEmails')}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2.5 cursor-pointer ${
            options.redactEmails
              ? 'bg-[#faf1ec] border-[#f0d5cb] text-[#b84b29] ring-1 ring-[#f0d5cb]/50 shadow-sm -translate-y-0.5'
              : 'bg-[#faf9f5] border-[#e8e5dd] text-[#6b6963] hover:border-[#d9d5cb] hover:bg-white hover:-translate-y-0.5'
          } active:scale-95`}
        >
          <div className="flex items-center justify-between">
            <Mail className="w-4 h-4 text-[#cc5a36]" />
            <span className={`w-2 h-2 rounded-full transition-colors duration-200 ${options.redactEmails ? 'bg-[#cc5a36] animate-claude-pulse' : 'bg-[#d9d5cb]'}`} />
          </div>
          <div>
            <span className="font-semibold text-[#1f1e1d] block text-[11px]">Email Addresses</span>
            <span className="text-[10px] text-[#6b6963] font-mono">
              {stats.emailsCount > 0 ? `${stats.emailsCount} found` : 'user@domain.com'}
            </span>
          </div>
        </button>

        {/* IP Addresses */}
        <button
          type="button"
          onClick={() => toggleOption('redactIpAddresses')}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2.5 cursor-pointer ${
            options.redactIpAddresses
              ? 'bg-[#faf1ec] border-[#f0d5cb] text-[#b84b29] ring-1 ring-[#f0d5cb]/50 shadow-sm -translate-y-0.5'
              : 'bg-[#faf9f5] border-[#e8e5dd] text-[#6b6963] hover:border-[#d9d5cb] hover:bg-white hover:-translate-y-0.5'
          } active:scale-95`}
        >
          <div className="flex items-center justify-between">
            <Globe className="w-4 h-4 text-[#cc5a36]" />
            <span className={`w-2 h-2 rounded-full transition-colors duration-200 ${options.redactIpAddresses ? 'bg-[#cc5a36] animate-claude-pulse' : 'bg-[#d9d5cb]'}`} />
          </div>
          <div>
            <span className="font-semibold text-[#1f1e1d] block text-[11px]">IP Addresses</span>
            <span className="text-[10px] text-[#6b6963] font-mono">
              {stats.ipsCount > 0 ? `${stats.ipsCount} found` : '192.168.x.x'}
            </span>
          </div>
        </button>

        {/* Phone Numbers */}
        <button
          type="button"
          onClick={() => toggleOption('redactPhoneNumbers')}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2.5 cursor-pointer ${
            options.redactPhoneNumbers
              ? 'bg-[#faf1ec] border-[#f0d5cb] text-[#b84b29] ring-1 ring-[#f0d5cb]/50 shadow-sm -translate-y-0.5'
              : 'bg-[#faf9f5] border-[#e8e5dd] text-[#6b6963] hover:border-[#d9d5cb] hover:bg-white hover:-translate-y-0.5'
          } active:scale-95`}
        >
          <div className="flex items-center justify-between">
            <Phone className="w-4 h-4 text-[#cc5a36]" />
            <span className={`w-2 h-2 rounded-full transition-colors duration-200 ${options.redactPhoneNumbers ? 'bg-[#cc5a36] animate-claude-pulse' : 'bg-[#d9d5cb]'}`} />
          </div>
          <div>
            <span className="font-semibold text-[#1f1e1d] block text-[11px]">Phone Numbers</span>
            <span className="text-[10px] text-[#6b6963] font-mono">
              {stats.phoneNumbersCount > 0 ? `${stats.phoneNumbersCount} found` : '+1 (555) ...'}
            </span>
          </div>
        </button>
      </div>

      {/* Custom Keyword Redactor */}
      <div className="space-y-2 pt-1">
        <label className="text-xs text-[#1f1e1d] font-medium flex items-center justify-between">
          <span>Custom Confidential Keywords / Terms</span>
          <span className="text-[11px] text-[#6b6963]">e.g. Project Codename, Company Name</span>
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKeyword();
              }
            }}
            placeholder="Type custom keyword and press Enter..."
            className="flex-1 bg-white border border-[#e8e5dd] hover:border-[#d9d5cb] focus:border-[#cc5a36] text-[#1f1e1d] text-xs rounded-full px-4 py-2 focus:outline-none placeholder-[#9e9b91] transition-colors"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="px-4 py-2 bg-[#cc5a36] hover:bg-[#b84b29] text-white rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1 shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Tag pills */}
        {options.customKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {options.customKeywords.map((kw, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-[#e8e5dd] rounded-full text-xs text-[#1f1e1d] font-mono transition-all shadow-sm"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-[#9e9b91] hover:text-red-500 p-0.5 rounded transition-colors active:scale-90"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Anonymization Options with Claude Spring Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e8e5dd]">
        {/* User Alias */}
        <div className="p-3.5 bg-[#faf9f5] rounded-2xl border border-[#e8e5dd] space-y-2 transition-all hover:bg-white hover:border-[#d9d5cb]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1f1e1d] flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#6b6963]" />
              <span>Anonymize User Name</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={options.anonymizeUser}
              onClick={() => toggleOption('anonymizeUser')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-out focus:outline-none ${
                options.anonymizeUser ? 'bg-[#cc5a36]' : 'bg-[#d9d5cb]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                  options.anonymizeUser ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {options.anonymizeUser && (
            <input
              type="text"
              value={options.userAlias}
              onChange={(e) => onChangeOptions({ ...options, userAlias: e.target.value })}
              placeholder="User Alias (e.g. Anonymous User)"
              className="w-full bg-white border border-[#e8e5dd] focus:border-[#cc5a36] text-[#1f1e1d] text-xs rounded-xl px-3 py-1.5 focus:outline-none transition-colors"
            />
          )}
        </div>

        {/* Assistant Alias */}
        <div className="p-3.5 bg-[#faf9f5] rounded-2xl border border-[#e8e5dd] space-y-2 transition-all hover:bg-white hover:border-[#d9d5cb]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1f1e1d] flex items-center space-x-1.5">
              <ClaudeIcon className="w-3.5 h-3.5 text-[#cc5a36]" />
              <span>Anonymize Claude Name</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={options.anonymizeAssistant}
              onClick={() => toggleOption('anonymizeAssistant')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-out focus:outline-none ${
                options.anonymizeAssistant ? 'bg-[#cc5a36]' : 'bg-[#d9d5cb]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                  options.anonymizeAssistant ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {options.anonymizeAssistant && (
            <input
              type="text"
              value={options.assistantAlias}
              onChange={(e) => onChangeOptions({ ...options, assistantAlias: e.target.value })}
              placeholder="Assistant Alias (e.g. AI Assistant)"
              className="w-full bg-white border border-[#e8e5dd] focus:border-[#cc5a36] text-[#1f1e1d] text-xs rounded-xl px-3 py-1.5 focus:outline-none transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  );
};
