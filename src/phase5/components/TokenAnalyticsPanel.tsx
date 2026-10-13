'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedConversation } from '@/phase1/types';
import { 
  ClaudeModelId, 
  MessageTokenData, 
  PromptIssue,
  PromptEvaluation
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
  evaluations?: Record<string, PromptEvaluation> | null;
  onEvaluatePrompts?: () => Promise<void>;
  isEvaluatingPrompts?: boolean;
}

export const TokenAnalyticsPanel: React.FC<TokenAnalyticsPanelProps> = ({
  conversation,
  evaluations: propEvaluations,
  onEvaluatePrompts: propOnEvaluatePrompts,
  isEvaluatingPrompts: propIsEvaluatingPrompts
}) => {
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>('claude-3-5-sonnet');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null);
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, number> | null>(null);

  // Background fetch to ensure 100% precision from Anthropic BPE Tokenizer server API
  useEffect(() => {
    let isCancelled = false;
    async function refineWithServer() {
      if (!conversation.messages || conversation.messages.length === 0) {
        console.log('[TokenAnalytics] No messages in conversation to refine token counts for.');
        return;
      }
      try {
        console.log(`[TokenAnalytics] Requesting exact BPE token counts for ${conversation.messages.length} messages from /api/tokens...`);
        const texts = conversation.messages.map((m) => m.content);
        const res = await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts })
        });

        if (!res.ok) {
          console.warn(`[TokenAnalytics] ⚠️ /api/tokens returned non-OK response (Status: ${res.status} ${res.statusText}). Remaining on client BPE fallback estimator.`);
          return;
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.counts) && !isCancelled) {
          console.log(`[TokenAnalytics] ✅ /api/tokens succeeded! Refined ${data.counts.length} message token counts with exact Anthropic BPE tokenizer.`);
          const map: Record<string, number> = {};
          conversation.messages.forEach((m, idx) => {
            map[m.id] = data.counts[idx];
          });
          setTokenOverrides(map);
        } else if (!isCancelled) {
          console.warn('[TokenAnalytics] ⚠️ /api/tokens returned an unexpected payload structure:', data);
        }
      } catch (err) {
        console.error('[TokenAnalytics] ❌ Error calling /api/tokens (falling back to client BPE estimator):', err);
      }
    }
    refineWithServer();
    return () => {
      isCancelled = true;
    };
  }, [conversation.id, conversation.messages]);

  // Per-conversation AI Prompt Evaluation internal cache: convId -> { msgId: PromptEvaluation }
  const [internalCache, setInternalCache] = useState<Record<string, Record<string, PromptEvaluation>>>({});
  const [internalLoading, setInternalLoading] = useState(false);

  const effectiveEvaluations = propEvaluations !== undefined
    ? propEvaluations
    : (internalCache[conversation.id] || null);

  const isEvaluatingPrompts = propIsEvaluatingPrompts !== undefined
    ? propIsEvaluatingPrompts
    : internalLoading;

  const hasEvaluatedAI = Boolean(effectiveEvaluations && Object.keys(effectiveEvaluations).length > 0);

  // On-demand handler: evaluates user prompts ONLY for this specific conversation when clicked
  const handleEvaluatePromptsWithAI = async () => {
    if (propOnEvaluatePrompts) {
      await propOnEvaluatePrompts();
      return;
    }

    const userMessages = conversation.messages.filter((m) => m.sender === 'user');
    if (userMessages.length === 0) return;

    setInternalLoading(true);
    try {
      console.log(`[TokenAnalytics] On-demand AI Prompt Evaluation requested for ${userMessages.length} user prompts in chat: ${conversation.id}`);
      const prompts = userMessages.map((m) => ({ id: m.id, content: m.content }));
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts })
      });

      if (!res.ok) {
        console.warn(`[TokenAnalytics] /api/ai/advisor returned HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.success && data.results) {
        setInternalCache((prev) => ({
          ...prev,
          [conversation.id]: data.results
        }));
        console.log(`[TokenAnalytics] ✅ AI Evaluations received for ${Object.keys(data.results).length} prompts in chat: ${conversation.id}`);
      }
    } catch (err) {
      console.error('[TokenAnalytics] Error evaluating prompts:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  // Reset page when conversation changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedMessageIndex(null);
  }, [conversation.id]);

  // Compute full token analytics using Claude BPE Tokenizer + AI Advisor evaluations (if evaluated)
  const analytics = useMemo(() => {
    return computeConversationTokens(conversation, selectedModel, tokenOverrides || undefined, effectiveEvaluations || undefined);
  }, [conversation, selectedModel, tokenOverrides, effectiveEvaluations]);

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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#ebe8df] text-[#716f68] border border-[#e5e2d8]">
          Response
        </span>
      );
    }

    if (!hasEvaluatedAI) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f0eee6] text-[#716f68] border border-[#e5e0d8]">
          Prompt
        </span>
      );
    }

    const evalData = msg.evaluation;
    if (!evalData) return null;

    switch (evalData.status) {
      case 'optimal':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center space-x-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Optimal</span>
          </span>
        );
      case 'good':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center space-x-1">
            <span>Good</span>
          </span>
        );
      case 'needs_improvement':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center space-x-1">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Can Improve</span>
          </span>
        );
      case 'wasteful':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center space-x-1">
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
        <div className="bg-white border border-[#e5e2d8] hover:border-[#d6d2c4] rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716f68] text-xs mb-2">
            <span className="font-medium">Total BPE Tokens</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#141416] font-mono tracking-tight">
              {analytics.totalTokens.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-[#716f68] flex items-center justify-between">
              <span>
                In: <span className="text-[#141416] font-mono font-medium">{analytics.promptTokens.toLocaleString()}</span>
              </span>
              <span>
                Out: <span className="text-amber-700 font-mono font-medium">{analytics.responseTokens.toLocaleString()}</span>
              </span>
            </div>
            {/* Visual Token Ratio Bar */}
            <div className="w-full bg-[#ebe8df] rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div 
                className="bg-[#141416] h-full transition-all duration-500 ease-out" 
                style={{ width: `${(analytics.promptTokens / (analytics.totalTokens || 1)) * 100}%` }} 
                title="Input Tokens"
              />
              <div 
                className="bg-amber-500 h-full transition-all duration-500 ease-out" 
                style={{ width: `${(analytics.responseTokens / (analytics.totalTokens || 1)) * 100}%` }} 
                title="Output Tokens"
              />
            </div>
          </div>
        </div>

        {/* Estimated API Cost with Model Selector */}
        <div className="bg-white border border-[#e5e2d8] hover:border-[#d6d2c4] rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716f68] text-xs mb-2">
            <span className="font-medium">Estimated Cost</span>
            <div className="flex items-center space-x-1">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ClaudeModelId)}
                className="bg-[#faf9f5] border border-[#e5e2d8] text-[#141416] text-[10px] rounded-full px-2 py-0.5 focus:outline-none focus:border-[#141416] transition-colors cursor-pointer font-medium"
              >
                <option value="claude-3-5-sonnet">3.5 Sonnet</option>
                <option value="claude-3-5-haiku">3.5 Haiku</option>
                <option value="claude-3-opus">3 Opus</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tracking-tight flex items-baseline space-x-1">
              <span>${analytics.estimatedCost.toFixed(4)}</span>
              <span className="text-xs font-normal text-[#716f68]">USD</span>
            </div>
            <div className="mt-2 text-[11px] text-[#716f68] flex items-center justify-between">
              <span className="font-medium text-[#141416]">{CLAUDE_PRICING[selectedModel].name}</span>
              <span className="text-[#9ca3af] font-mono">${CLAUDE_PRICING[selectedModel].inputPerMillion}/M In · ${CLAUDE_PRICING[selectedModel].outputPerMillion}/M Out</span>
            </div>
          </div>
        </div>

        {/* Average Tokens Per Turn */}
        <div className="bg-white border border-[#e5e2d8] hover:border-[#d6d2c4] rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716f68] text-xs mb-2">
            <span className="font-medium">Avg Tokens / Turn</span>
            <div className="w-7 h-7 rounded-lg bg-[#ebe8df] flex items-center justify-center text-[#141416]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#141416] font-mono tracking-tight">
              {analytics.avgPromptTokens.toLocaleString()} <span className="text-xs font-normal text-[#716f68]">prompt</span>
            </div>
            <div className="mt-2 text-[11px] text-[#716f68] flex items-center justify-between">
              <span>Claude avg:</span>
              <span className="text-amber-700 font-mono font-medium">{analytics.avgResponseTokens.toLocaleString()} tokens</span>
            </div>
          </div>
        </div>

        {/* Prompt Efficiency Score */}
        <div className="bg-white border border-[#e5e2d8] hover:border-[#d6d2c4] rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716f68] text-xs mb-2">
            <span className="font-medium">Prompt Efficiency</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            {hasEvaluatedAI ? (
              <>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-2xl font-bold font-mono tracking-tight ${
                    analytics.overallEfficiencyScore >= 80 ? 'text-emerald-600' :
                    analytics.overallEfficiencyScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {analytics.overallEfficiencyScore}%
                  </span>
                  <span className="text-xs text-[#716f68]">overall score</span>
                </div>
                <div className="mt-2 text-[11px] flex items-center justify-between">
                  <span className="text-[#716f68]">Potential Savings:</span>
                  <span className="text-emerald-600 font-mono font-medium">
                    ~{analytics.totalPotentialSavings.toLocaleString()} tokens
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold font-mono tracking-tight text-[#9ca3af]">
                    --
                  </span>
                  <span className="text-xs text-[#716f68]">click below</span>
                </div>
                <div className="mt-2 text-[11px] flex items-center justify-between">
                  <span className="text-[#716f68]">AI Advisor:</span>
                  <span className="text-[#cc5a36] font-mono font-medium">On-Demand</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── ON-DEMAND AI PROMPT ADVISOR BANNER ── */}
      {!hasEvaluatedAI ? (
        <div className="bg-[#faf9f5] border border-[#e8e5dd] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-[#faf1ec] border border-[#f0d5cb] rounded-xl text-[#cc5a36] mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-claude-serif text-sm font-semibold text-[#1f1e1d] flex items-center space-x-2">
                <span>AI Prompt & Token Reduction Advisor</span>
                <span className="px-2 py-0.5 bg-[#f0eee6] text-[#716f68] text-[10px] rounded-full font-mono">
                  Groq / Gemini
                </span>
              </h4>
              <p className="text-xs text-[#6b6963] mt-1 max-w-xl leading-relaxed">
                Evaluate user prompts for this chat on-demand. Discovers polite fluff, duplicate code snippets, and specific recommendations to optimize context tokens.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEvaluatePromptsWithAI}
            disabled={isEvaluatingPrompts}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#1f1e1d] hover:bg-[#383734] text-white text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {isEvaluatingPrompts ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#f5a623]" />
                <span>Evaluating Prompts...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#f5a623]" />
                <span>Evaluate This Chat Prompts</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-[#faf1ec] border border-[#f0d5cb] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-[#cc5a36]/10 border border-[#cc5a36]/20 rounded-xl text-[#b84b29] mt-0.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-claude-serif text-sm font-semibold text-[#1f1e1d] flex items-center space-x-2">
                <span>Token Reduction Advisor</span>
                {analytics.totalPotentialSavings > 0 ? (
                  <span className="px-2.5 py-0.5 bg-[#f0d5cb] text-[#b84b29] text-[10px] rounded-full font-mono font-semibold">
                    Save ~{analytics.totalPotentialSavings} Tokens
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-mono font-semibold">
                    Optimal Economy
                  </span>
                )}
              </h4>
              <p className="text-xs text-[#6b6963] mt-1 max-w-xl leading-relaxed">
                {analytics.totalPotentialSavings > 0
                  ? `AI analysis identified ~${analytics.totalPotentialSavings} potential tokens saved by trimming conversational filler, duplicate snippets, or unguided multi-part turns.`
                  : 'AI analysis verified your user prompts are concise, direct, and token-optimal with zero redundant overhead.'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>AI Evaluated</span>
            </span>
            <button
              type="button"
              onClick={handleEvaluatePromptsWithAI}
              disabled={isEvaluatingPrompts}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-[#e5e0d8] bg-white hover:bg-[#f0eee6] text-[#1f1e1d] transition-colors cursor-pointer disabled:opacity-60"
            >
              {isEvaluatingPrompts ? 'Analyzing...' : 'Re-evaluate'}
            </button>
          </div>
        </div>
      )}

      {/* ── TOKENS PER MESSAGE TABLE ── */}
      <div className="bg-white border border-[#e5e2d8] rounded-2xl overflow-hidden shadow-sm">
        {/* Table Toolbar Header */}
        <div className="px-5 py-4 border-b border-[#e5e2d8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#141416] flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Tokens Used Per Message</span>
            </h3>
            <p className="text-xs text-[#716f68] mt-0.5">
              Calculated using Claude&apos;s BPE Tokenizer · Click any row for diagnostic details
            </p>
          </div>

          {/* Number of Entities Dropdown Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#716f68]">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#faf9f5] border border-[#e5e2d8] text-[#141416] rounded-full px-3 py-1 focus:outline-none focus:border-[#141416] text-xs font-medium cursor-pointer"
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
              <tr className="text-[#716f68] border-b border-[#e5e2d8] bg-[#faf9f5]">
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
                      className={`border-b border-[#e8e5dd]/60 hover:bg-[#faf9f5] transition-colors cursor-pointer ${
                        isExpanded ? 'bg-[#faf1ec]/60' : ''
                      }`}
                    >
                      {/* # Number */}
                      <td className="px-5 py-3 text-[#9ca3af] font-mono tabular-nums">{row.index}</td>

                      {/* Sender */}
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-1.5 font-medium text-[#141416]">
                          {isUser ? (
                            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <User className="w-2.5 h-2.5" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-[#141416] flex items-center justify-center text-white">
                              <Bot className="w-2.5 h-2.5" />
                            </div>
                          )}
                          <span className="capitalize">{row.sender}</span>
                        </div>
                      </td>

                      {/* Type: Prompt vs Response */}
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          isUser ? 'bg-[#ebe8df] text-[#141416]' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {row.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Tokens Used */}
                      <td className="px-5 py-3 text-right">
                        <div className="font-mono font-semibold text-[#141416]">
                          {row.tokens.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-[#716f68]">tokens</span>
                        </div>
                      </td>

                      {/* Cost Est */}
                      <td className="px-5 py-3 text-right font-mono text-[#716f68]">
                        ${row.cost.toFixed(5)}
                      </td>

                      {/* Advisor Status */}
                      <td className="px-5 py-3">
                        {getStatusBadge(row)}
                      </td>

                      {/* Evaluation & Advice */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-between text-[#141416]">
                          <span className="truncate max-w-md text-[#716f68]">
                            {isUser 
                              ? (hasEvaluatedAI && row.evaluation ? row.evaluation.primaryAdvice : (
                                  <span className="text-[#9ca3af] italic">Click &quot;Evaluate Prompts&quot; for AI recommendations</span>
                                ))
                              : `${row.words} words, ${row.characters} characters generated.`}
                          </span>
                          <span className="text-[#9ca3af] hover:text-[#141416] ml-2">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Diagnostic Drawer with Keystone Fade Animation */}
                    {isExpanded && (
                      <tr className="bg-[#faf9f5] border-b border-[#e5e2d8] animate-keystone-fade">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e2d8] pb-2">
                              <span className="text-[#141416] font-medium flex items-center space-x-1.5">
                                <Info className="w-3.5 h-3.5 text-amber-600" />
                                <span>Message #{row.index} Token Intelligence Breakdown</span>
                              </span>
                              <div className="flex items-center space-x-4 text-[11px] text-[#716f68] font-mono">
                                <span>Chars: {row.characters}</span>
                                <span>Words: {row.words}</span>
                                <span>Context Position: {row.cumulativeTokens.toLocaleString()} tokens</span>
                              </div>
                            </div>

                            {/* Prompt Evaluation Diagnostics */}
                            {isUser ? (
                              hasEvaluatedAI && row.evaluation ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[#141416] font-semibold">Efficiency Score:</span>
                                    <span className={`font-mono font-bold ${
                                      row.evaluation.score >= 80 ? 'text-emerald-600' :
                                      row.evaluation.score >= 60 ? 'text-amber-600' : 'text-rose-600'
                                    }`}>
                                      {row.evaluation.score} / 100 ({row.evaluation.statusLabel})
                                    </span>
                                    {row.evaluation.potentialTokensSaved > 0 && (
                                      <span className="text-emerald-700 font-mono text-[11px] ml-2">
                                        (Can save ~{row.evaluation.potentialTokensSaved} tokens)
                                      </span>
                                    )}
                                  </div>

                                  {row.evaluation.issues.length > 0 ? (
                                    <div className="space-y-1.5 mt-2">
                                      <span className="text-[#716f68] font-medium">Detected Optimization Opportunities:</span>
                                      {row.evaluation.issues.map((issue: PromptIssue, i: number) => (
                                        <div key={i} className="p-2.5 bg-white border border-[#e5e2d8] rounded-xl space-y-1">
                                          <div className="flex items-center justify-between text-amber-800 font-medium">
                                            <span>• {issue.title}</span>
                                            {issue.estimatedSavings > 0 && (
                                              <span className="font-mono text-emerald-700 text-[10px]">
                                                Save ~{issue.estimatedSavings} tokens
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[#716f68] text-[11px] leading-relaxed">
                                            {issue.description}
                                          </p>
                                        </div>
                                      ))}

                                      {row.evaluation.optimizedPromptPreview && (
                                        <div className="mt-2.5 p-3 bg-white border border-emerald-300 rounded-xl space-y-1.5">
                                          <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                                            <span>💡 Recommended Token-Trimmed Rewrite</span>
                                            <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                              Save ~{row.evaluation.potentialTokensSaved} tokens
                                            </span>
                                          </div>
                                          <pre className="text-[11px] font-mono text-zinc-200 bg-[#18181b] p-2.5 rounded-lg border border-zinc-800 whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                                            {row.evaluation.optimizedPromptPreview}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
                                      <span>{row.evaluation.primaryAdvice}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-4 bg-white border border-[#e5e2d8] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-xs text-[#1f1e1d]">Prompt Evaluation Not Yet Run</p>
                                    <p className="text-[11px] text-[#716f68] mt-0.5 max-w-lg">
                                      Click &quot;Evaluate This Chat Prompts&quot; above to have Groq / Gemini analyze this prompt for polite filler, duplicate code, token economy, and recommended rewrites.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleEvaluatePromptsWithAI}
                                    disabled={isEvaluatingPrompts}
                                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#1f1e1d] hover:bg-[#383734] text-white text-xs font-medium cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap"
                                  >
                                    <Sparkles className="w-3 h-3 text-[#f5a623]" />
                                    <span>Evaluate Now</span>
                                  </button>
                                </div>
                              )
                            ) : (
                              <div className="text-[#716f68]">
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#e5e2d8]">
            <p className="text-xs text-[#716f68]">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, messages.length)} of {messages.length}
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#e5e2d8] bg-white text-[#716f68] hover:text-[#141416] hover:border-[#141416] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {buildPages().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-[#9ca3af] text-xs select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`min-w-[32px] py-1.5 rounded-full text-xs font-medium transition-colors ${
                      safePage === p
                        ? 'bg-[#141416] text-white shadow-sm'
                        : 'border border-[#e5e2d8] bg-white text-[#716f68] hover:text-[#141416] hover:border-[#141416]'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#e5e2d8] bg-white text-[#716f68] hover:text-[#141416] hover:border-[#141416] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
