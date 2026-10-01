/**
 * Phase 5 — Analytics Engine
 * Pure client-side computation. No external APIs.
 * Takes UnifiedConversation + UnifiedMessage[] and returns ConversationAnalytics.
 */

import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import {
  ConversationAnalytics,
  MessageStats,
  SentimentScore,
  TopicEntry,
  CodeLanguageStat,
  DayActivity,
} from './types';

// ─── Sentiment Word Lists (lightweight lexicon) ───────────────────────────────
const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect',
  'helpful', 'thank', 'thanks', 'appreciate', 'love', 'best', 'awesome', 'nice',
  'correct', 'right', 'works', 'working', 'solved', 'success', 'happy', 'clear',
  'brilliant', 'useful', 'interesting', 'elegant', 'clean', 'fast', 'efficient',
  'yes', 'absolutely', 'exactly', 'sure', 'definitely', 'certainly', 'agree',
]);

const NEGATIVE_WORDS = new Set([
  'error', 'bug', 'broken', 'wrong', 'bad', 'terrible', 'fail', 'failed', 'issue',
  'problem', 'crash', 'confused', 'confusing', 'slow', 'hard', 'difficult',
  'frustrating', 'annoying', 'unclear', 'impossible', 'not working', 'unable',
  'cannot', 'cant', "doesn't", 'doesnt', 'weird', 'strange', 'hate', 'worst',
  'ugly', 'broken', 'exception', 'traceback', 'undefined', 'null', 'missing',
]);

// ─── Stop-words for topic extraction ─────────────────────────────────────────
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'its',
  'with', 'as', 'by', 'from', 'up', 'about', 'into', 'through', 'than', 'then',
  'so', 'if', 'when', 'where', 'which', 'who', 'what', 'how', 'all', 'any',
  'also', 'just', 'more', 'some', 'here', 'there', 'no', 'yes', 'like', 'get',
  'make', 'use', 'need', 'want', 'know', 'see', 'think', 'look', 'go', 'come',
  'give', 'take', 'let', 'well', 'now', 'one', 'two', 'new', 'same', 'very',
  'even', 'much', 'still', 'way', 'good', 'only', 'try', 'example', 'sure',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`[^`]+`/g, '')         // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[.*?\]\(.*?\)/g, '')  // links
    .replace(/#{1,6}\s/g, '')        // headings
    .replace(/[*_~>]/g, '')          // bold, italic, blockquote
    .replace(/\n+/g, ' ')
    .trim();
}

function scoresSentiment(text: string): SentimentScore {
  const words = text.toLowerCase().split(/\W+/);
  let positiveHits = 0;
  let negativeHits = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveHits++;
    if (NEGATIVE_WORDS.has(word)) negativeHits++;
  }

  const total = positiveHits + negativeHits;
  if (total === 0) return { label: 'neutral', score: 0 };
  const score = (positiveHits - negativeHits) / Math.max(total, 1);
  const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
  return { label, score: parseFloat(score.toFixed(2)) };
}

function extractCodeBlocks(content: string): { language: string; lines: number }[] {
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  const results: { language: string; lines: number }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const lang = match[1]?.toLowerCase() || 'unknown';
    const lines = match[2].split('\n').length;
    results.push({ language: lang, lines });
  }
  return results;
}

function extractTopics(messages: UnifiedMessage[], topN = 30): TopicEntry[] {
  const freq: Record<string, number> = {};

  for (const msg of messages) {
    const clean = stripMarkdown(msg.content);
    const words = clean.toLowerCase().split(/\W+/).filter(
      (w) => w.length > 3 && !STOP_WORDS.has(w) && /^[a-z]+$/.test(w)
    );
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  const maxCount = sorted[0]?.[1] || 1;

  return sorted.map(([word, count]) => ({
    word,
    count,
    weight: parseFloat((count / maxCount).toFixed(2)),
  }));
}

function buildActivityByDay(messages: UnifiedMessage[]): DayActivity[] {
  const dayMap: Record<string, DayActivity> = {};

  for (const msg of messages) {
    const date = msg.dateString;
    if (!dayMap[date]) {
      dayMap[date] = { date, count: 0, userMessages: 0, assistantMessages: 0 };
    }
    dayMap[date].count++;
    if (msg.sender === 'user') dayMap[date].userMessages++;
    else if (msg.sender === 'assistant') dayMap[date].assistantMessages++;
  }

  return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
}

function calcResponseGaps(messages: UnifiedMessage[]): number {
  const pairs: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const prev = new Date(messages[i - 1].timestamp).getTime();
    const curr = new Date(messages[i].timestamp).getTime();
    const gapMinutes = (curr - prev) / 60000;
    if (gapMinutes > 0 && gapMinutes < 60 * 24) {
      pairs.push(gapMinutes);
    }
  }
  if (pairs.length === 0) return 0;
  return parseFloat((pairs.reduce((a, b) => a + b, 0) / pairs.length).toFixed(1));
}

// ─── Main Engine Entry Point ───────────────────────────────────────────────────

export function computeAnalytics(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[]
): ConversationAnalytics {
  if (messages.length === 0) {
    return buildEmpty(conversation);
  }

  // Per-message stats
  const messageStats: MessageStats[] = messages.map((msg) => {
    const clean = stripMarkdown(msg.content);
    const codeBlocks = extractCodeBlocks(msg.content);
    const linkMatches = msg.content.match(/https?:\/\/[^\s)]+/g) || [];
    const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 3);

    return {
      id: msg.id,
      sender: msg.sender,
      wordCount: countWords(clean),
      charCount: msg.content.length,
      sentenceCount: sentences.length,
      codeBlockCount: codeBlocks.length,
      linkCount: linkMatches.length,
      dateString: msg.dateString,
      timeString: msg.timeString,
      timestamp: msg.timestamp,
      sentiment: scoresSentiment(clean),
    };
  });

  // Aggregates
  const userStats = messageStats.filter((m) => m.sender === 'user');
  const assistantStats = messageStats.filter((m) => m.sender === 'assistant');
  const totalWords = messageStats.reduce((sum, m) => sum + m.wordCount, 0);
  const totalChars = messageStats.reduce((sum, m) => sum + m.charCount, 0);
  const avgUserWords = userStats.length > 0
    ? Math.round(userStats.reduce((s, m) => s + m.wordCount, 0) / userStats.length)
    : 0;
  const avgAssistantWords = assistantStats.length > 0
    ? Math.round(assistantStats.reduce((s, m) => s + m.wordCount, 0) / assistantStats.length)
    : 0;
  const allWordCounts = messageStats.map((m) => m.wordCount);
  const longestMessageWords = Math.max(...allWordCounts, 0);
  const shortestMessageWords = Math.min(...allWordCounts.filter((w) => w > 0), 0);

  // Code stats
  const allCodeBlocks: { language: string; lines: number }[] = [];
  for (const msg of messages) {
    allCodeBlocks.push(...extractCodeBlocks(msg.content));
  }
  const langMap: Record<string, CodeLanguageStat> = {};
  for (const block of allCodeBlocks) {
    const lang = block.language || 'unknown';
    if (!langMap[lang]) langMap[lang] = { language: lang, count: 0, totalLines: 0 };
    langMap[lang].count++;
    langMap[lang].totalLines += block.lines;
  }
  const languages = Object.values(langMap).sort((a, b) => b.count - a.count);

  // Sentiment over time
  const sentimentOverTime = messageStats.map((m, i) => ({
    index: i + 1,
    label: m.sentiment.label,
    score: m.sentiment.score,
    sender: m.sender,
  }));

  // Activity heatmap
  const activityByDay = buildActivityByDay(messages);

  // Topics
  const topTopics = extractTopics(messages, 30);

  // Date range
  const sortedDates = messages.map((m) => m.dateString).sort();
  const dateRange = {
    start: sortedDates[0] || '',
    end: sortedDates[sortedDates.length - 1] || '',
  };

  return {
    conversationId: conversation.id,
    title: conversation.title,
    totalMessages: messages.length,
    userMessages: userStats.length,
    assistantMessages: assistantStats.length,
    totalWords,
    totalChars,
    avgUserWords,
    avgAssistantWords,
    avgResponseGapMinutes: calcResponseGaps(messages),
    longestMessageWords,
    shortestMessageWords,
    messageStats,
    topTopics,
    sentimentOverTime,
    codeStats: {
      totalBlocks: allCodeBlocks.length,
      totalLines: allCodeBlocks.reduce((s, b) => s + b.lines, 0),
      languages,
    },
    activityByDay,
    dateRange,
  };
}

function buildEmpty(conversation: UnifiedConversation): ConversationAnalytics {
  return {
    conversationId: conversation.id,
    title: conversation.title,
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    totalWords: 0,
    totalChars: 0,
    avgUserWords: 0,
    avgAssistantWords: 0,
    avgResponseGapMinutes: 0,
    longestMessageWords: 0,
    shortestMessageWords: 0,
    messageStats: [],
    topTopics: [],
    sentimentOverTime: [],
    codeStats: { totalBlocks: 0, totalLines: 0, languages: [] },
    activityByDay: [],
    dateRange: { start: '', end: '' },
  };
}
