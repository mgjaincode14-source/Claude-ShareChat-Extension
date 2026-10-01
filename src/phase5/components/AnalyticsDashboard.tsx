'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { UnifiedConversation } from '@/phase1/types';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '@/phase1/sampleData';
import { getAllConversations, saveConversations, deleteConversation, clearAllConversations } from '@/phase1/db';
import { ConversationList } from '@/phase1/components/ConversationList';
import { ImportModal } from '@/phase1/components/ImportModal';
import { computeAnalytics } from '../analyticsEngine';
import { ConversationAnalytics } from '../types';
import { StatsCards } from './StatsCards';
import { ActivityHeatmap } from './ActivityHeatmap';
import { SentimentChart } from './SentimentChart';
import { CodeStatsPanel } from './CodeStatsPanel';
import {
  BarChart2,
  Sparkles,
  Layers,
  Download,
  Globe,
  ShieldCheck,
  ListFilter,
  Share2,
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

type Tab = 'overview' | 'sentiment' | 'code' | 'heatmap';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '📊 Overview' },
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

  const analytics: ConversationAnalytics | null = useMemo(() => {
    if (!currentConversation) return null;
    return computeAnalytics(currentConversation, currentConversation.messages);
  }, [currentConversation]);

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
      <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-violet-500 animate-spin" />
          <span>Loading Conversation Analytics…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* ── Top Navbar ── */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between backdrop-blur-md select-none z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-sky-500 flex items-center justify-center text-white shadow-md">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 leading-tight">
              Conversation Analytics
            </h1>
            <p className="text-[11px] text-slate-400">Deep insights into your conversation</p>
          </div>
        </div>

        {/* Phase Navigation */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { href: '/phase1', label: 'Conversation Reader', icon: <Layers className="w-3 h-3" /> },
            { href: '/phase2', label: 'Message Filter', icon: <ListFilter className="w-3 h-3" /> },
            { href: '/phase3', label: 'Privacy & Export', icon: <ShieldCheck className="w-3 h-3" /> },
            { href: '/phase4', label: 'Share Link Generator', icon: <Share2 className="w-3 h-3" /> },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
            >
              {icon}<span>{label}</span>
            </Link>
          ))}
          <span className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-medium shadow-sm flex items-center space-x-1">
            <BarChart2 className="w-3.5 h-3.5 text-violet-200" />
            <span>Conversation Analytics</span>
          </span>
        </div>
      </header>

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
            {/* Sub-tabs */}
            <div className="flex items-center space-x-1 px-6 py-3 border-b border-slate-800 bg-slate-900/50 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="flex-1" />

              {/* Export button */}
              <button
                onClick={() => exportAnalyticsReport(analytics)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
              {/* Conversation heading */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100">{analytics.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {analytics.dateRange.start} → {analytics.dateRange.end} ·{' '}
                    {analytics.totalMessages} messages
                  </p>
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

              {/* ── MESSAGES TAB removed — content merged into overview ── */}

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
                    <SentimentChart sentimentOverTime={data} />

                    {/* Controls row */}
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-100">
                          Sentiment Breakdown
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {data.length} messages total
                          </span>
                        </h3>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500">Show:</span>
                          <select
                            value={sentimentPageSize}
                            onChange={(e) => {
                              setSentimentPageSize(Number(e.target.value));
                              setSentimentPage(1);
                            }}
                            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500 text-xs"
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
                            <tr className="text-slate-500 border-b border-slate-800 bg-slate-900/40">
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
                                  ? 'text-emerald-400'
                                  : row.label === 'negative'
                                  ? 'text-red-400'
                                  : 'text-slate-400';
                              const bgClass =
                                row.label === 'positive'
                                  ? 'bg-emerald-500/5'
                                  : row.label === 'negative'
                                  ? 'bg-red-500/5'
                                  : '';
                              return (
                                <tr
                                  key={row.index}
                                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${bgClass}`}
                                >
                                  <td className="px-5 py-2.5 text-slate-600 tabular-nums">{row.index}</td>
                                  <td className="px-5 py-2.5 text-slate-400 capitalize">{row.sender}</td>
                                  <td className={`px-5 py-2.5 capitalize font-medium ${colorClass}`}>
                                    <span className="flex items-center space-x-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                                        row.label === 'positive' ? 'bg-emerald-400' :
                                        row.label === 'negative' ? 'bg-red-400' : 'bg-slate-500'
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
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
                          <p className="text-xs text-slate-500">
                            Showing {(safePage - 1) * sentimentPageSize + 1}–{Math.min(safePage * sentimentPageSize, data.length)} of {data.length}
                          </p>
                          <div className="flex items-center space-x-1">
                            {/* Previous */}
                            <button
                              onClick={() => setSentimentPage((p) => Math.max(1, p - 1))}
                              disabled={safePage === 1}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              Previous
                            </button>

                            {/* Page numbers */}
                            {buildPages().map((p, i) =>
                              p === '...' ? (
                                <span key={`ellipsis-${i}`} className="px-2 text-slate-600 text-xs select-none">…</span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() => setSentimentPage(p as number)}
                                  className={`min-w-[32px] py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    safePage === p
                                      ? 'bg-violet-600 text-white shadow-sm'
                                      : 'border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
            <BarChart2 className="w-12 h-12 text-slate-700" />
            <p className="text-sm">Select a conversation to view its analytics.</p>
            <button
              onClick={handleLoadSamples}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-medium transition-colors"
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
