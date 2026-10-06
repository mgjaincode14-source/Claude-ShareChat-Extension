// Phase 5 — Analytics & Conversation Intelligence Types

export interface MessageStats {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  codeBlockCount: number;
  linkCount: number;
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:MM AM/PM
  timestamp: string;
  sentiment: SentimentScore;
}

export interface SentimentScore {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1.0 to 1.0
}

export interface TopicEntry {
  word: string;
  count: number;
  weight: number; // 0–1 normalized
}

export interface CodeLanguageStat {
  language: string;
  count: number;
  totalLines: number;
}

export interface DayActivity {
  date: string; // YYYY-MM-DD
  count: number; // number of messages on that day
  userMessages: number;
  assistantMessages: number;
}

export interface ConversationAnalytics {
  conversationId: string;
  title: string;

  // Overview stats
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalWords: number;
  totalChars: number;
  avgUserWords: number;
  avgAssistantWords: number;
  avgResponseGapMinutes: number;
  longestMessageWords: number;
  shortestMessageWords: number;

  // Per-message breakdown
  messageStats: MessageStats[];

  // Topic intelligence
  topTopics: TopicEntry[];

  // Sentiment
  sentimentOverTime: { index: number; label: string; score: number; sender: string }[];

  // Code analysis
  codeStats: {
    totalBlocks: number;
    totalLines: number;
    languages: CodeLanguageStat[];
  };

  // Activity heatmap (last 90 days granularity or full range)
  activityByDay: DayActivity[];

  // Date range of conversation
  dateRange: { start: string; end: string };
}

// ─── Token Intelligence & Prompt Evaluation Types ────────────────────────────

export type ClaudeModelId = 'claude-3-5-sonnet' | 'claude-3-5-haiku' | 'claude-3-opus';

export interface PromptIssue {
  type:
    | 'polite_filler'
    | 'duplicate_code'
    | 'whitespace_comments'
    | 'verbose_preamble'
    | 'unstructured'
    | 'high_ambiguity'
    | 'large_log_dump'
    | 'redundant_persona'
    | 'repetitive_constraints'
    | 'redundant_history';
  title: string;
  description: string;
  estimatedSavings: number;
}

export interface PromptEvaluation {
  score: number; // 0 - 100
  status: 'optimal' | 'good' | 'needs_improvement' | 'wasteful';
  statusLabel: string;
  primaryAdvice: string;
  potentialTokensSaved: number;
  issues: PromptIssue[];
  optimizedPromptPreview?: string;
}

export interface MessageTokenData {
  index: number;
  id: string;
  sender: 'user' | 'assistant';
  role: 'prompt' | 'response';
  tokens: number;
  characters: number;
  words: number;
  cost: number;
  cumulativeTokens: number;
  evaluation?: PromptEvaluation;
}

export interface ConversationTokenAnalytics {
  totalTokens: number;
  promptTokens: number;
  responseTokens: number;
  estimatedCost: number;
  selectedModel: ClaudeModelId;
  avgPromptTokens: number;
  avgResponseTokens: number;
  peakContextTokens: number;
  overallEfficiencyScore: number;
  totalPotentialSavings: number;
  messages: MessageTokenData[];
}
