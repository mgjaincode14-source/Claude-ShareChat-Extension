'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { UnifiedConversation } from '@/phase1/types';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '@/phase1/sampleData';
import { getAllConversations, saveConversations, deleteConversation, clearAllConversations } from '@/phase1/db';
import { ConversationList } from '@/phase1/components/ConversationList';
import { ImportModal } from '@/phase1/components/ImportModal';
import { computeAnalytics } from '../analyticsEngine';
import { ConversationAnalytics, SentimentScore, PromptEvaluation } from '../types';
import { StatsCards } from './StatsCards';
import { ActivityHeatmap } from './ActivityHeatmap';
import { SentimentChart } from './SentimentChart';
import { CodeStatsPanel } from './CodeStatsPanel';
import { TokenAnalyticsPanel } from './TokenAnalyticsPanel';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import {
  BarChart2,
  Sparkles,
  Download,
  CheckCircle2,
  Brain,
  Zap,
} from 'lucide-react';
import { readSession, writeSession } from '@/store/workflowSession';

// ─── Export Report ────────────────────────────────────────────────────────────

function exportAnalyticsReport(analytics: ConversationAnalytics): void {
  const lines: string[] = [
    `# Analytics Report: ${analytics.title}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Overview',
    `- Total messages: ${analytics.totalMessages}`,
    `- Your messages: ${analytics.userMessages}`,
    `- Claude replies: ${analytics.assistantMessages}`,
    `- Total words: ${analytics.totalWords}`,
    `- Avg words per your message: ${analytics.avgUserWords}`,
    `- Avg words per Claude message: ${analytics.avgAssistantWords}`,
    `- Average response gap: ${analytics.avgResponseGapMinutes} min`,
    `- Longest message: ${analytics.longestMessageWords} words`,
    `- Date range: ${analytics.dateRange.start} → ${analytics.dateRange.end}`,
    '',
    '## Code Statistics',
    `- Total code blocks: ${analytics.codeStats.totalBlocks}`,
    `- Total lines of code: ${analytics.codeStats.totalLines}`,
    ...analytics.codeStats.languages.map(
      (l) => `  - ${l.language}: ${l.count} blocks, ${l.totalLines} lines`
    ),
    '',
    '## Top Topics',
    ...analytics.topTopics.slice(0, 20).map((t) => `- ${t.word} (${t.count}x)`),
    '',
    '## Sentiment Summary',
    `- Positive: ${analytics.sentimentOverTime.filter((s) => s.label === 'positive').length} messages`,
    `- Neutral: ${analytics.sentimentOverTime.filter((s) => s.label === 'neutral').length} messages`,
    `- Negative: ${analytics.sentimentOverTime.filter((s) => s.label === 'negative').length} messages`,
    '',
    '## Activity by Day',
    ...analytics.activityByDay.map(
      (d) => `- ${d.date}: ${d.count} messages (you: ${d.userMessages}, Claude: ${d.assistantMessages})`
    ),
  ];

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${analytics.title.replace(/\s+/g, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tab definitions ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'tokens' | 'sentiment' | 'code' | 'heatmap';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'tokens', label: '🪙 Tokens & Cost' },
  { id: 'sentiment', label: '🧠 Sentiment' },
  { id: 'code', label: '💻 Code' },
  { id: 'heatmap', label: '📅 Heatmap' },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const AnalyticsDashboard: React.FC = () => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Sentiment table pagination state
  const [sentimentPage, setSentimentPage] = useState(1);
  const [sentimentPageSize, setSentimentPageSize] = useState(25);

  useEffect(() => {
    async function loadData() {
      try {
        let stored = await getAllConversations();
        if (stored.length === 0) {
          await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
          stored = SAMPLE_CLAUDE_CONVERSATIONS;
        }
        setConversations(stored);
        // Restore selected conversation from session
        const session = readSession();
        const restoredId = session.selectedConvId || stored[0]?.id || null;
        setSelectedId(restoredId);
      } catch (err) {
        console.error('Phase 5 load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const currentConversation: UnifiedConversation | null =
    conversations.find((c) => c.id === selectedId) || null;

  // Per-conversation caches: convId -> map
  const [sentimentsCache, setSentimentsCache] = useState<Record<string, Record<string, SentimentScore>>>({});
  const [evaluationsCache, setEvaluationsCache] = useState<Record<string, Record<string, PromptEvaluation>>>({});
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [isEvaluatingPrompts, setIsEvaluatingPrompts] = useState(false);

  const currentSentimentMap = currentConversation ? sentimentsCache[currentConversation.id] || null : null;
  const currentEvaluationsMap = currentConversation ? evaluationsCache[currentConversation.id] || null : null;

  const hasEvaluatedSentiment = Boolean(currentSentimentMap && Object.keys(currentSentimentMap).length > 0);
  const hasEvaluatedPrompts = Boolean(currentEvaluationsMap && Object.keys(currentEvaluationsMap).length > 0);
  const hasEvaluatedAny = hasEvaluatedSentiment || hasEvaluatedPrompts;

  // On-demand Sentiment Analysis (evaluates ONLY currentConversation.messages)
  const handleAnalyzeSentimentWithAI = async () => {
    if (!currentConversation || currentConversation.messages.length === 0) return;
    setIsAnalyzingSentiment(true);
    try {
      console.log(`[AnalyticsDashboard] On-demand AI Sentiment requested for ${currentConversation.messages.length} messages in chat: ${currentConversation.id}`);
      const payload = currentConversation.messages.map((m) => ({
        id: m.id,
        content: m.content,
        sender: m.sender
      }));
      const res = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload })
      });
      if (!res.ok) {
        console.warn(`[AnalyticsDashboard] /api/ai/sentiment returned HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.success && data.sentimentMap) {
        setSentimentsCache((prev) => ({
          ...prev,
          [currentConversation.id]: data.sentimentMap
        }));
        console.log('[AnalyticsDashboard] ✅ AI Sentiment analysis loaded via Groq/Gemini for', Object.keys(data.sentimentMap).length, 'messages');
      }
    } catch (err) {
      console.warn('[AnalyticsDashboard] AI sentiment fetch failed:', err);
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  // On-demand Prompt Advisor (evaluates ONLY currentConversation user prompts)
  const handleEvaluatePromptsWithAI = async () => {
    if (!currentConversation) return;
    const userMessages = currentConversation.messages.filter((m) => m.sender === 'user');
    if (userMessages.length === 0) return;

    setIsEvaluatingPrompts(true);
    try {
      console.log(`[AnalyticsDashboard] On-demand AI Prompt Evaluation requested for ${userMessages.length} user prompts in chat: ${currentConversation.id}`);
      const prompts = userMessages.map((m) => ({ id: m.id, content: m.content }));
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts })
      });

      if (!res.ok) {
        console.warn(`[AnalyticsDashboard] /api/ai/advisor returned HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.success && data.results) {
        setEvaluationsCache((prev) => ({
          ...prev,
          [currentConversation.id]: data.results
        }));
        console.log(`[AnalyticsDashboard] ✅ AI Prompt Evaluations received for ${Object.keys(data.results).length} prompts in chat: ${currentConversation.id}`);
      }
    } catch (err) {
      console.error('[AnalyticsDashboard] Error evaluating prompts:', err);
    } finally {
      setIsEvaluatingPrompts(false);
    }
  };

  // Combined Master Evaluation: Evaluates both Prompts (Tokens) and Sentiment for the active chat
  const handleEvaluateAllWithAI = async () => {
    await Promise.allSettled([
      handleEvaluatePromptsWithAI(),
      handleAnalyzeSentimentWithAI()
    ]);
  };

  const analytics: ConversationAnalytics | null = useMemo(() => {
    if (!currentConversation) return null;
    return computeAnalytics(currentConversation, currentConversation.messages, currentSentimentMap || undefined);
  }, [currentConversation, currentSentimentMap]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    writeSession({ selectedConvId: id });
    // Reset pagination when switching conversations
    setSentimentPage(1);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
  };

  const handleClearAll = async () => {
    if (confirm('Clear all stored conversations?')) {
      await clearAllConversations();
      setConversations([]);
      setSelectedId(null);
    }
  };

  const handleLoadSamples = async () => {
    await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
    setConversations(SAMPLE_CLAUDE_CONVERSATIONS);
    setSelectedId(SAMPLE_CLAUDE_CONVERSATIONS[0]?.id || null);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#f3f2ec] flex items-center justify-center text-[#716f68]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#141416] animate-spin" />
          <span>Loading Conversation Analytics…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f3f2ec] text-[#141416] font-sans overflow-hidden">
      {/* Keystone Unified Header */}
      <UnifiedHeader
        currentPhase={5}
        title="Conversation Analytics"
        subtitle={
          currentConversation
            ? `${currentConversation.title} · ${analytics?.totalMessages || 0} messages`
            : 'Deep insights into your conversation'
        }
        rightAction={
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-[#e5e2d8] text-xs text-[#141416] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#141416] animate-keystone-pulse" />
            <span>Real-Time Intelligence</span>
          </div>
        }
      />

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onOpenImport={() => setIsImportOpen(true)}
          onLoadSamples={handleLoadSamples}
          onClearAll={handleClearAll}
        />

        {/* Main Panel */}
        {analytics ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-tabs (Claude Segmented Pill Bar) */}
            <div className="flex items-center space-x-2 px-6 py-3 border-b border-[#e8e5dd] bg-[#faf9f5]/80 backdrop-blur-md overflow-x-auto flex-shrink-0">
              <div className="flex items-center space-x-1 bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8]">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#1f1e1d] text-white shadow-sm'
                        : 'text-[#6b6963] hover:text-[#1f1e1d]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Export button */}
              <button
                onClick={() => exportAnalyticsReport(analytics)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#ebe8df] border border-[#e5e2d8] text-[#141416] text-xs font-medium transition-all duration-200 shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-[#716f68]" />
                <span>Export Report</span>
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-stone-300">
              {/* Conversation heading & On-Demand AI Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e5e2d8]/60">
                <div>
                  <h2 className="text-base font-bold text-[#141416]">{analytics.title}</h2>
                  <p className="text-xs text-[#716f68] mt-0.5">
                    {analytics.dateRange.start} → {analytics.dateRange.end} ·{' '}
                    {analytics.totalMessages} messages
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleEvaluateAllWithAI}
                    disabled={isEvaluatingPrompts || isAnalyzingSentiment}
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#141416] hover:bg-[#2e2d2a] text-white text-xs font-medium transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    {isEvaluatingPrompts || isAnalyzingSentiment ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-[#f5a623]" />
                        <span>Evaluating This Chat...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#f5a623]" />
                        <span>
                          {hasEvaluatedAny ? '↻ Re-evaluate Chat with AI' : '✨ Evaluate Chat with AI'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <>
                  <StatsCards
                    totalMessages={analytics.totalMessages}
                    userMessages={analytics.userMessages}
                    assistantMessages={analytics.assistantMessages}
                    totalWords={analytics.totalWords}
                    avgUserWords={analytics.avgUserWords}
                    avgAssistantWords={analytics.avgAssistantWords}
                    longestMessageWords={analytics.longestMessageWords}
                    codeBlockCount={analytics.codeStats.totalBlocks}
                  />
                  <SentimentChart sentimentOverTime={analytics.sentimentOverTime} />
                </>
              )}

              {/* ── TOKENS & COST TAB ── */}
              {activeTab === 'tokens' && currentConversation && (
                <TokenAnalyticsPanel
                  conversation={currentConversation}
                  evaluations={currentEvaluationsMap}
                  onEvaluatePrompts={handleEvaluatePromptsWithAI}
                  isEvaluatingPrompts={isEvaluatingPrompts}
                />
              )}

              {/* ── SENTIMENT TAB ── */}
              {activeTab === 'sentiment' && (() => {
                const data = analytics.sentimentOverTime;
                const totalPages = Math.max(1, Math.ceil(data.length / sentimentPageSize));
                const safePage = Math.min(sentimentPage, totalPages);
                const pageSlice = data.slice(
                  (safePage - 1) * sentimentPageSize,
                  safePage * sentimentPageSize
                );

                // Build page number array with ellipsis
                const buildPages = (): (number | '...')[] => {
                  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
                  const pages: (number | '...')[] = [1];
                  if (safePage > 3) pages.push('...');
                  for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) {
                    pages.push(p);
                  }
                  if (safePage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                  return pages;
                };

                return (
                  <div className="space-y-4">
                    {/* On-Demand Sentiment Action Banner */}
                    {!hasEvaluatedSentiment ? (
                      <div className="bg-[#faf9f5] border border-[#e8e5dd] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start space-x-3.5">
                          <div className="p-2.5 bg-[#faf1ec] border border-[#f0d5cb] rounded-xl text-[#cc5a36] mt-0.5">
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-claude-serif text-sm font-semibold text-[#1f1e1d] flex items-center space-x-2">
                              <span>AI Conversational Tone & Sentiment Analyzer</span>
                              <span className="px-2 py-0.5 bg-[#f0eee6] text-[#716f68] text-[10px] rounded-full font-mono">
                                Groq / Gemini
                              </span>
                            </h4>
                            <p className="text-xs text-[#6b6963] mt-1 max-w-xl leading-relaxed">
                              Evaluate tone for this chat on-demand. Understands true technical nuances without false positives on words like &quot;no&quot;, &quot;error&quot;, or &quot;fail&quot;.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAnalyzeSentimentWithAI}
                          disabled={isAnalyzingSentiment}
                          className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#1f1e1d] hover:bg-[#383734] text-white text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                        >
                          {isAnalyzingSentiment ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#f5a623]" />
                              <span>Analyzing Tone...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-[#f5a623]" />
                              <span>Analyze Tone With AI</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#faf1ec] border border-[#f0d5cb] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-[#cc5a36]/10 border border-[#cc5a36]/20 text-[#b84b29] flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-claude-serif text-xs font-semibold text-[#1f1e1d] flex items-center space-x-2">
                              <span>AI Sentiment Analysis Active</span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-mono font-medium">
                                {Object.keys(currentSentimentMap || {}).length} messages scored
                              </span>
                            </h4>
                            <p className="text-[11px] text-[#6b6963]">Tone evaluated strictly for this chat. Zero cross-conversation context leaks.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAnalyzeSentimentWithAI}
                          disabled={isAnalyzingSentiment}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-[#e5e0d8] bg-white hover:bg-[#f0eee6] text-[#1f1e1d] transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isAnalyzingSentiment ? 'Analyzing...' : '↻ Re-analyze'}
                        </button>
                      </div>
                    )}

                    <SentimentChart sentimentOverTime={data} />

                    {/* Controls row */}
                    <div className="rounded-2xl border border-[#e5e2d8] bg-white overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e2d8]">
                        <h3 className="text-sm font-semibold text-[#141416]">
                          Sentiment Breakdown
                          <span className="ml-2 text-xs font-normal text-[#716f68]">
                            {data.length} messages total
                          </span>
                        </h3>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-[#716f68]">Show:</span>
                          <select
                            value={sentimentPageSize}
                            onChange={(e) => {
                              setSentimentPageSize(Number(e.target.value));
                              setSentimentPage(1);
                            }}
                            className="bg-[#faf9f5] border border-[#e5e2d8] text-[#141416] rounded-full px-3 py-1 focus:outline-none focus:border-[#141416] text-xs"
                          >
                            {[10, 25, 50, 100].map((n) => (
                              <option key={n} value={n}>{n} per page</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[#716f68] border-b border-[#e5e2d8] bg-[#faf9f5]">
                              <th className="px-5 py-2.5 text-left font-medium w-12">#</th>
                              <th className="px-5 py-2.5 text-left font-medium">Sender</th>
                              <th className="px-5 py-2.5 text-left font-medium">Sentiment</th>
                              <th className="px-5 py-2.5 text-right font-medium">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageSlice.map((row) => {
                              const colorClass =
                                row.label === 'positive'
                                  ? 'text-emerald-700'
                                  : row.label === 'negative'
                                  ? 'text-rose-700'
                                  : 'text-[#716f68]';
                              const bgClass =
                                row.label === 'positive'
                                  ? 'bg-emerald-50/50'
                                  : row.label === 'negative'
                                  ? 'bg-rose-50/50'
                                  : '';
                              return (
                                <tr
                                  key={row.index}
                                  className={`border-b border-[#e5e2d8]/60 hover:bg-[#faf9f5] transition-colors ${bgClass}`}
                                >
                                  <td className="px-5 py-2.5 text-[#9ca3af] tabular-nums font-mono">{row.index}</td>
                                  <td className="px-5 py-2.5 text-[#141416] capitalize font-medium">{row.sender}</td>
                                  <td className={`px-5 py-2.5 capitalize font-medium ${colorClass}`}>
                                    <span className="flex items-center space-x-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                                        row.label === 'positive' ? 'bg-emerald-500' :
                                        row.label === 'negative' ? 'bg-rose-500' : 'bg-[#9ca3af]'
                                      }`} />
                                      <span>{row.label}</span>
                                    </span>
                                  </td>
                                  <td className={`px-5 py-2.5 text-right font-mono ${colorClass}`}>
                                    {row.score > 0 ? '+' : ''}{row.score}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination footer */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-[#e5e2d8]">
                          <p className="text-xs text-[#716f68]">
                            Showing {(safePage - 1) * sentimentPageSize + 1}–{Math.min(safePage * sentimentPageSize, data.length)} of {data.length}
                          </p>
                          <div className="flex items-center space-x-1">
                            {/* Previous */}
                            <button
                              onClick={() => setSentimentPage((p) => Math.max(1, p - 1))}
                              disabled={safePage === 1}
                              className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#e5e2d8] bg-white text-[#716f68] hover:text-[#141416] hover:border-[#141416] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              Previous
                            </button>

                            {/* Page numbers */}
                            {buildPages().map((p, i) =>
                              p === '...' ? (
                                <span key={`ellipsis-${i}`} className="px-2 text-[#9ca3af] text-xs select-none">…</span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() => setSentimentPage(p as number)}
                                  className={`min-w-[32px] py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                                    safePage === p
                                      ? 'bg-[#141416] text-white'
                                      : 'border border-[#e5e2d8] bg-white text-[#716f68] hover:text-[#141416] hover:border-[#141416]'
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            )}

                            {/* Next */}
                            <button
                              onClick={() => setSentimentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={safePage === totalPages}
                              className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#e5e2d8] bg-white text-[#716f68] hover:text-[#141416] hover:border-[#141416] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── CODE TAB ── */}
              {activeTab === 'code' && (
                <CodeStatsPanel
                  totalBlocks={analytics.codeStats.totalBlocks}
                  totalLines={analytics.codeStats.totalLines}
                  languages={analytics.codeStats.languages}
                />
              )}

              {/* ── HEATMAP TAB ── */}
              {activeTab === 'heatmap' && (
                <ActivityHeatmap activityByDay={analytics.activityByDay} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#716f68] space-y-4">
            <BarChart2 className="w-12 h-12 text-[#9ca3af]" />
            <p className="text-sm">Select a conversation to view its analytics.</p>
            <button
              onClick={handleLoadSamples}
              className="px-4 py-2 bg-[#141416] hover:bg-[#27272a] text-white rounded-full text-xs font-medium transition-colors shadow-sm"
            >
              Load Demo Data
            </button>
          </div>
        )}
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={async (imported) => {
          await saveConversations(imported);
          const stored = await getAllConversations();
          setConversations(stored);
          if (imported.length > 0) setSelectedId(imported[0].id);
          setIsImportOpen(false);
        }}
      />
    </div>
  );
};
