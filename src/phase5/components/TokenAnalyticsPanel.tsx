'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedConversation } from '@/phase1/types';
import { 
  ClaudeModelId, 
  MessageTokenData, 
  PromptIssue 
} from '../types';
import { 
  computeConversationTokens, 
  CLAUDE_PRICING 
} from '../tokenEngine';
import { 
  Coins, 
  DollarSign, 
  Sparkles, 
  Cpu, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Zap,
  TrendingDown,
  Info
} from 'lucide-react';

interface TokenAnalyticsPanelProps {
  conversation: UnifiedConversation;
}

export const TokenAnalyticsPanel: React.FC<TokenAnalyticsPanelProps> = ({ conversation }) => {
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>('claude-3-5-sonnet');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null);
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, number> | null>(null);

  // Background fetch to ensure 100% precision from Anthropic BPE Tokenizer server API
  useEffect(() => {
    let isCancelled = false;
    async function refineWithServer() {
      try {
        const texts = conversation.messages.map((m) => m.content);
        const res = await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts })
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.counts) && !isCancelled) {
          const map: Record<string, number> = {};
          conversation.messages.forEach((m, idx) => {
            map[m.id] = data.counts[idx];
          });
          setTokenOverrides(map);
        }
      } catch (err) {
        // Fallback already active via countClaudeTokens
      }
    }
    refineWithServer();
    return () => {
      isCancelled = true;
    };
  }, [conversation.id]);

  // Reset page when conversation changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedMessageIndex(null);
  }, [conversation.id]);

  // Compute full token analytics using Claude BPE Tokenizer
  const analytics = useMemo(() => {
    return computeConversationTokens(conversation, selectedModel, tokenOverrides || undefined);
  }, [conversation, selectedModel, tokenOverrides]);

  const { messages } = analytics;
  const totalPages = Math.ceil(messages.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const pageSlice = messages.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Pagination page builder
  const buildPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Status badge styling helper
  const getStatusBadge = (msg: MessageTokenData) => {
    if (msg.sender === 'assistant') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
          Response
        </span>
      );
    }

    const evalData = msg.evaluation;
    if (!evalData) return null;

    switch (evalData.status) {
      case 'optimal':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Optimal</span>
          </span>
        );
      case 'good':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center space-x-1">
            <span>Good</span>
          </span>
        );
      case 'needs_improvement':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Can Improve</span>
          </span>
        );
      case 'wasteful':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>High Waste</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tokens Consumed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Total BPE Tokens</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
              {analytics.totalTokens.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="text-slate-500">
                In: <span className="text-slate-300 font-mono">{analytics.promptTokens.toLocaleString()}</span>
              </span>
              <span className="text-slate-500">
                Out: <span className="text-amber-400 font-mono">{analytics.responseTokens.toLocaleString()}</span>
              </span>
            </div>
            {/* Visual Token Ratio Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${(analytics.promptTokens / (analytics.totalTokens || 1)) * 100}%` }} 
                title="Input Tokens"
              />
              <div 
                className="bg-amber-500 h-full" 
                style={{ width: `${(analytics.responseTokens / (analytics.totalTokens || 1)) * 100}%` }} 
                title="Output Tokens"
              />
            </div>
          </div>
        </div>

        {/* Estimated API Cost with Model Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Estimated Cost</span>
            <div className="flex items-center space-x-1">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ClaudeModelId)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-500"
              >
                <option value="claude-3-5-sonnet">3.5 Sonnet</option>
                <option value="claude-3-5-haiku">3.5 Haiku</option>
                <option value="claude-3-opus">3 Opus</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight flex items-baseline space-x-1">
              <span>${analytics.estimatedCost.toFixed(4)}</span>
              <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{CLAUDE_PRICING[selectedModel].name}</span>
              <span className="text-slate-500 font-mono">${CLAUDE_PRICING[selectedModel].inputPerMillion}/M In · ${CLAUDE_PRICING[selectedModel].outputPerMillion}/M Out</span>
            </div>
          </div>
        </div>

        {/* Average Tokens Per Turn */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Avg Tokens / Turn</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
              {analytics.avgPromptTokens.toLocaleString()} <span className="text-xs font-normal text-slate-500">prompt</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="text-slate-500">Claude avg:</span>
              <span className="text-amber-400 font-mono font-medium">{analytics.avgResponseTokens.toLocaleString()} tokens</span>
            </div>
          </div>
        </div>

        {/* Prompt Efficiency Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Prompt Efficiency</span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold font-mono tracking-tight ${
                analytics.overallEfficiencyScore >= 80 ? 'text-emerald-400' :
                analytics.overallEfficiencyScore >= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {analytics.overallEfficiencyScore}%
              </span>
              <span className="text-xs text-slate-500">overall score</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center justify-between">
              <span className="text-slate-400">Potential Savings:</span>
              <span className="text-emerald-400 font-mono font-medium">
                ~{analytics.totalPotentialSavings.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOKEN REDUCTION ADVISOR HIGHLIGHT BANNER ── */}
      {analytics.totalPotentialSavings > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 mt-0.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                <span>Token Reduction Advisor</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full font-mono">
                  Save ~{analytics.totalPotentialSavings} Tokens
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                By removing polite filler phrases, avoiding duplicate code re-pastes, and trimming whitespace in user queries, you can reduce conversation token load by ~{analytics.totalPotentialSavings} tokens across your turns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TOKENS PER MESSAGE TABLE ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Toolbar Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Tokens Used Per Message</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated using Claude&apos;s BPE Tokenizer · Click any row for diagnostic details
            </p>
          </div>

          {/* Number of Entities Dropdown Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 text-xs"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/40">
                <th className="px-5 py-2.5 text-left font-medium w-12">#</th>
                <th className="px-5 py-2.5 text-left font-medium w-28">Sender</th>
                <th className="px-5 py-2.5 text-left font-medium w-24">Type</th>
                <th className="px-5 py-2.5 text-right font-medium w-32">Tokens Used</th>
                <th className="px-5 py-2.5 text-right font-medium w-28">Cost Est.</th>
                <th className="px-5 py-2.5 text-left font-medium w-36">Advisor Status</th>
                <th className="px-5 py-2.5 text-left font-medium">Evaluation & Advice</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((row) => {
                const isUser = row.sender === 'user';
                const isExpanded = expandedMessageIndex === row.index;

                return (
                  <React.Fragment key={row.index}>
                    <tr
                      onClick={() => setExpandedMessageIndex(isExpanded ? null : row.index)}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      {/* # Number */}
                      <td className="px-5 py-3 text-slate-600 font-mono tabular-nums">{row.index}</td>

                      {/* Sender */}
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-1.5 font-medium text-slate-300">
                          {isUser ? (
                            <User className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Bot className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="capitalize">{row.sender}</span>
                        </div>
                      </td>

                      {/* Type: Prompt vs Response */}
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isUser ? 'bg-blue-500/10 text-blue-300' : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {row.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Tokens Used */}
                      <td className="px-5 py-3 text-right">
                        <div className="font-mono font-semibold text-slate-100">
                          {row.tokens.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-500">tokens</span>
                        </div>
                      </td>

                      {/* Cost Est */}
                      <td className="px-5 py-3 text-right font-mono text-slate-400">
                        ${row.cost.toFixed(5)}
                      </td>

                      {/* Advisor Status */}
                      <td className="px-5 py-3">
                        {getStatusBadge(row)}
                      </td>

                      {/* Evaluation & Advice */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="truncate max-w-md text-slate-400">
                            {isUser 
                              ? row.evaluation?.primaryAdvice || 'Optimal prompt structure.'
                              : `${row.words} words, ${row.characters} characters generated.`}
                          </span>
                          <span className="text-slate-600 hover:text-slate-400 ml-2">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Diagnostic Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80 border-b border-slate-800">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                              <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                                <Info className="w-3.5 h-3.5 text-amber-400" />
                                <span>Message #{row.index} Token Intelligence Breakdown</span>
                              </span>
                              <div className="flex items-center space-x-4 text-[11px] text-slate-400 font-mono">
                                <span>Chars: {row.characters}</span>
                                <span>Words: {row.words}</span>
                                <span>Context Position: {row.cumulativeTokens.toLocaleString()} tokens</span>
                              </div>
                            </div>

                            {/* Prompt Evaluation Diagnostics */}
                            {isUser && row.evaluation ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-slate-300 font-semibold">Efficiency Score:</span>
                                  <span className={`font-mono font-bold ${
                                    row.evaluation.score >= 80 ? 'text-emerald-400' :
                                    row.evaluation.score >= 60 ? 'text-amber-400' : 'text-rose-400'
                                  }`}>
                                    {row.evaluation.score} / 100 ({row.evaluation.statusLabel})
                                  </span>
                                  {row.evaluation.potentialTokensSaved > 0 && (
                                    <span className="text-emerald-400 font-mono text-[11px] ml-2">
                                      (Can save ~{row.evaluation.potentialTokensSaved} tokens)
                                    </span>
                                  )}
                                </div>

                                {row.evaluation.issues.length > 0 ? (
                                  <div className="space-y-1.5 mt-2">
                                    <span className="text-slate-400 font-medium">Detected Optimization Opportunities:</span>
                                    {row.evaluation.issues.map((issue: PromptIssue, i: number) => (
                                      <div key={i} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                                        <div className="flex items-center justify-between text-amber-400 font-medium">
                                          <span>• {issue.title}</span>
                                          {issue.estimatedSavings > 0 && (
                                            <span className="font-mono text-emerald-400 text-[10px]">
                                              Save ~{issue.estimatedSavings} tokens
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-slate-400 text-[11px] leading-relaxed">
                                          {issue.description}
                                        </p>
                                      </div>
                                    ))}

                                    {row.evaluation.optimizedPromptPreview && (
                                      <div className="mt-2.5 p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-1.5">
                                        <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                                          <span>💡 Recommended Token-Trimmed Rewrite</span>
                                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                            Save ~{row.evaluation.potentialTokensSaved} tokens
                                          </span>
                                        </div>
                                        <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                                          {row.evaluation.optimizedPromptPreview}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                                    <span>{row.evaluation.primaryAdvice}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-slate-400">
                                Output generated by Claude LLM ({row.tokens} tokens). Represents response payload cost.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, messages.length)} of {messages.length}
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {buildPages().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-slate-600 text-xs select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`min-w-[32px] py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      safePage === p
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
