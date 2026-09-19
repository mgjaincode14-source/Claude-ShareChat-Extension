'use client';

import React, { useState } from 'react';
import { RedactionOptions, RedactionStats, RedactionStyle } from '../types';
import { 
  ShieldCheck, 
  Key, 
  Mail, 
  Globe, 
  Phone, 
  Plus, 
  X, 
  UserCheck, 
  Bot, 
  EyeOff,
  Sparkles,
  Lock
} from 'lucide-react';

interface RedactionControlPanelProps {
  options: RedactionOptions;
  onChangeOptions: (newOpts: RedactionOptions) => void;
  stats: RedactionStats;
}

export const RedactionControlPanel: React.FC<RedactionControlPanelProps> = ({
  options,
  onChangeOptions,
  stats
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
    if (trimmed && !options.customKeywords.includes(trimmed)) {
      onChangeOptions({
        ...options,
        customKeywords: [...options.customKeywords, trimmed]
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    onChangeOptions({
      ...options,
      customKeywords: options.customKeywords.filter((kw) => kw !== kwToRemove)
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
              <span>Privacy & Redaction Engine</span>
              {stats.totalRedacted > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {stats.totalRedacted} Masked
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Auto-detect & mask sensitive data before sharing</p>
          </div>
        </div>

        {/* Style Selector Toggle */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => onChangeOptions({ ...options, replacementStyle: 'label' })}
            className={`px-2.5 py-1 rounded-lg transition-colors font-mono text-[11px] ${
              options.replacementStyle === 'label'
                ? 'bg-amber-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            [REDACTED]
          </button>
          <button
            type="button"
            onClick={() => onChangeOptions({ ...options, replacementStyle: 'blocks' })}
            className={`px-2.5 py-1 rounded-lg transition-colors font-mono text-[11px] ${
              options.replacementStyle === 'blocks'
                ? 'bg-amber-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ███████
          </button>
        </div>
      </div>

      {/* Automated Detectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* API Keys */}
        <button
          type="button"
          onClick={() => toggleOption('redactApiKeys')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
            options.redactApiKeys
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Key className="w-4 h-4 text-amber-400" />
            <span className={`w-2 h-2 rounded-full ${options.redactApiKeys ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
          </div>
          <div>
            <span className="font-medium text-slate-200 block text-[11px]">API Keys & Secrets</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {stats.apiKeysCount > 0 ? `${stats.apiKeysCount} found` : 'sk-..., Bearer...'}
            </span>
          </div>
        </button>

        {/* Emails */}
        <button
          type="button"
          onClick={() => toggleOption('redactEmails')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
            options.redactEmails
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Mail className="w-4 h-4 text-blue-400" />
            <span className={`w-2 h-2 rounded-full ${options.redactEmails ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
          </div>
          <div>
            <span className="font-medium text-slate-200 block text-[11px]">Email Addresses</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {stats.emailsCount > 0 ? `${stats.emailsCount} found` : 'user@domain.com'}
            </span>
          </div>
        </button>

        {/* IP Addresses */}
        <button
          type="button"
          onClick={() => toggleOption('redactIpAddresses')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
            options.redactIpAddresses
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className={`w-2 h-2 rounded-full ${options.redactIpAddresses ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
          </div>
          <div>
            <span className="font-medium text-slate-200 block text-[11px]">IP Addresses</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {stats.ipsCount > 0 ? `${stats.ipsCount} found` : '192.168.x.x'}
            </span>
          </div>
        </button>

        {/* Phone Numbers */}
        <button
          type="button"
          onClick={() => toggleOption('redactPhoneNumbers')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
            options.redactPhoneNumbers
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span className={`w-2 h-2 rounded-full ${options.redactPhoneNumbers ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
          </div>
          <div>
            <span className="font-medium text-slate-200 block text-[11px]">Phone Numbers</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {stats.phoneNumbersCount > 0 ? `${stats.phoneNumbersCount} found` : '+1 (555) ...'}
            </span>
          </div>
        </button>
      </div>

      {/* Custom Keyword Redactor */}
      <div className="space-y-2 pt-1">
        <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
          <span>Custom Confidential Keywords / Terms</span>
          <span className="text-[11px] text-slate-500">e.g. Project Codename, Company Name</span>
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
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
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
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-mono"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Anonymization Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
        {/* User Alias */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200 flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Anonymize User Name</span>
            </span>
            <input
              type="checkbox"
              checked={options.anonymizeUser}
              onChange={() => toggleOption('anonymizeUser')}
              className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>
          {options.anonymizeUser && (
            <input
              type="text"
              value={options.userAlias}
              onChange={(e) => onChangeOptions({ ...options, userAlias: e.target.value })}
              placeholder="User Alias (e.g. Anonymous User)"
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/60"
            />
          )}
        </div>

        {/* Assistant Alias */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200 flex items-center space-x-1.5">
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>Anonymize Claude Name</span>
            </span>
            <input
              type="checkbox"
              checked={options.anonymizeAssistant}
              onChange={() => toggleOption('anonymizeAssistant')}
              className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>
          {options.anonymizeAssistant && (
            <input
              type="text"
              value={options.assistantAlias}
              onChange={(e) => onChangeOptions({ ...options, assistantAlias: e.target.value })}
              placeholder="Assistant Alias (e.g. AI Assistant)"
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/60"
            />
          )}
        </div>
      </div>
    </div>
  );
};
