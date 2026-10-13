/**
 * Phase 5 — Analytics Engine
 * Provides conversation statistics, code analysis, activity tracking,
 * and LLM-pluggable sentiment analysis templates.
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

// ============================================================================
// LLM SENTIMENT ANALYSIS TEMPLATE (Free / Open-Source Models)
// ============================================================================

export interface LLMSentimentRequest {
  text: string;
  sender?: 'user' | 'assistant' | 'system';
  conversationContext?: string[];
}

export interface LLMSentimentResponse {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1.0 to 1.0
  confidence?: number;
  reasoning?: string;
  modelUsed?: string;
}

/**
 * Architectural Template for Free/Local LLM Sentiment Analysis
 *
 * NOTE: All hardcoded keyword/lexicon lists (POSITIVE_WORDS, NEGATIVE_WORDS)
 * and word matching that flagged synonyms of "no", "error", "fail", "null", or "false"
 * as negative sentiment have been completely removed as requested.
 *
 * In technical and programming conversations, terms like "not working", "null", "false",
 * or "error handling" are descriptive statements of problem state, NOT negative user sentiment.
 * An LLM accurately understands user tone, gratitude, frustration, or neutral inquiry.
 *
 * This function provides the pluggable template adapter for a Free / Non-Paid LLM:
 *   - Local Ollama (e.g. Llama 3, Mistral, Qwen 2.5 via http://localhost:11434)
 *   - Free Hugging Face Inference API (e.g. RoBERTa sentiment classifier)
 *   - In-browser local model via Transformers.js / ONNX
 *   - Free serverless AI endpoints
 *
 * STRICT POLICY: NO PAID MODELS WILL BE USED.
 *
 * Recommended System Prompt Template for the Free LLM:
 * ----------------------------------------------------------------------------
 * "You are an expert conversational sentiment analysis engine. Analyze the tone
 * of the following chat message between a user and an AI coding assistant.
 * Note: Do NOT mark technical bug reports, debugging logs, or words like 'no', 'error',
 * 'exception', or 'fail' as negative unless the user expresses genuine interpersonal
 * frustration, hostility, or distress.
 * 
 * Return strictly a valid JSON object matching:
 * {
 *   "label": "positive" | "neutral" | "negative",
 *   "score": number (-1.0 to 1.0),
 *   "reasoning": string
 * }"
 * ----------------------------------------------------------------------------
 */
export async function analyzeSentimentWithLLM(
  request: LLMSentimentRequest
): Promise<LLMSentimentResponse> {
  try {
    const res = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: request.text,
        sender: request.sender
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.sentiment) {
      return {
        label: data.sentiment.label,
        score: data.sentiment.score,
        modelUsed: 'Groq (openai/gpt-oss-120b) / Gemini'
      };
    }
  } catch (err) {
    console.warn('[AnalyticsEngine] LLM sentiment fetch error (using neutral baseline):', err);
  }

  return {
    label: 'neutral',
    score: 0.0,
    modelUsed: 'fallback'
  };
}

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

/**
 * Evaluates sentiment without brittle regexes or naive wordlists.
 * Returns an objective neutral baseline ready for LLM overrides.
 */
function scoresSentiment(text: string, override?: SentimentScore): SentimentScore {
  if (override) return override;
  // Neutral baseline: avoids falsely tagging technical explanations or code discussions as negative
  return { label: 'neutral', score: 0.0 };
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
  messages: UnifiedMessage[],
  sentimentOverrides?: Record<string, SentimentScore>
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
      sentiment: scoresSentiment(clean, sentimentOverrides?.[msg.id]),
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
