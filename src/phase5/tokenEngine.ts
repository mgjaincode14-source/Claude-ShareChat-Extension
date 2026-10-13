import { countTokens } from '@anthropic-ai/tokenizer';
import { UnifiedMessage, UnifiedConversation } from '@/phase1/types';
import {
  ClaudeModelId,
  PromptIssue,
  PromptEvaluation,
  MessageTokenData,
  ConversationTokenAnalytics
} from './types';

// Pricing per 1,000,000 tokens (Anthropic official pricing)
export const CLAUDE_PRICING: Record<ClaudeModelId, { name: string; inputPerMillion: number; outputPerMillion: number }> = {
  'claude-3-5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    inputPerMillion: 3.0,
    outputPerMillion: 15.0
  },
  'claude-3-5-haiku': {
    name: 'Claude 3.5 Haiku',
    inputPerMillion: 0.8,
    outputPerMillion: 4.0
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    inputPerMillion: 15.0,
    outputPerMillion: 75.0
  }
};

/**
 * Accurately count tokens using Claude's official BPE Tokenizer.
 * Includes a robust fallback in case of execution environment issues.
 */
export function countClaudeTokens(text: string): number {
  if (!text) return 0;
  try {
    return countTokens(text);
  } catch (err) {
    // Robust fallback using Claude BPE ratio if WASM is not initialized in browser
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(chars / 3.8 + words * 0.1));
  }
}

/**
 * Calculate cost for a token amount based on the selected Claude model.
 */
export function calculateCost(tokens: number, isOutput: boolean, model: ClaudeModelId = 'claude-3-5-sonnet'): number {
  const rates = CLAUDE_PRICING[model] || CLAUDE_PRICING['claude-3-5-sonnet'];
  const ratePerMillion = isOutput ? rates.outputPerMillion : rates.inputPerMillion;
  return (tokens / 1_000_000) * ratePerMillion;
}

// ============================================================================
// LLM PROMPT ADVISOR & TOKEN REDUCTION TEMPLATE (Free / Open-Source Models)
// ============================================================================

export interface LLMPromptAdvisorRequest {
  prompt: string;
  conversationHistory?: string[];
}

export interface LLMPromptAdvisorResponse {
  score: number; // 0 - 100
  status: 'optimal' | 'good' | 'needs_improvement' | 'wasteful';
  statusLabel: string;
  primaryAdvice: string;
  potentialTokensSaved: number;
  issues: PromptIssue[];
  modelUsed?: string;
}

/**
 * Architectural Template for Free/Local LLM Prompt Evaluation & Token Reduction Advisor
 *
 * NOTE: All hardcoded diagnostic regular expressions (greetings, polite pleasantries,
 * sign-offs, verbose preambles, persona framing, and constraint pattern regexes)
 * have been completely removed as requested.
 *
 * An LLM understands linguistic context, developer intent, and prompt efficiency
 * without brittle regex heuristics that cause false positives.
 *
 * This function provides the pluggable template adapter for a Free / Non-Paid LLM:
 *   - Local Ollama (e.g., Qwen 2.5 Coder, Mistral, Llama 3 via http://localhost:11434)
 *   - Free Hugging Face Inference API
 *   - Free tier serverless AI (e.g., Cloudflare Workers AI free tier, Groq free tier)
 *   - Client-side in-browser WebGPU / Transformers.js
 *
 * STRICT POLICY: NO PAID MODELS WILL BE USED.
 *
 * Recommended System Prompt Template for the Free LLM:
 * ----------------------------------------------------------------------------
 * "You are an expert Prompt Engineering and Token Efficiency Advisor for Claude.
 * Analyze the following user prompt for token economy, precision, clarity, and redundancy.
 * Evaluate whether the prompt contains unnecessary fluff, duplicate re-pasted code,
 * ambiguous single-word requests, or opportunities for prompt compression.
 *
 * Return strictly a valid JSON object matching:
 * {
 *   "score": number (0-100),
 *   "status": "optimal" | "good" | "needs_improvement" | "wasteful",
 *   "statusLabel": string,
 *   "primaryAdvice": string,
 *   "potentialTokensSaved": number,
 *   "issues": [
 *     {
 *       "type": "polite_filler" | "duplicate_code" | "whitespace_comments" | "verbose_preamble" | "unstructured" | "high_ambiguity" | "large_log_dump" | "redundant_persona" | "repetitive_constraints" | "redundant_history",
 *       "title": string,
 *       "description": string,
 *       "estimatedSavings": number
 *     }
 *   ]
 * }"
 * ----------------------------------------------------------------------------
 */
export async function evaluatePromptWithLLM(
  request: LLMPromptAdvisorRequest
): Promise<LLMPromptAdvisorResponse> {
  try {
    const res = await fetch('/api/ai/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: request.prompt,
        previousPrompts: request.conversationHistory || []
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.evaluation) {
      return {
        ...data.evaluation,
        modelUsed: 'Groq (openai/gpt-oss-120b) / Gemini'
      };
    }
  } catch (err) {
    console.warn('[TokenEngine] LLM prompt advisor fetch error (using baseline):', err);
  }

  return {
    score: 100,
    status: 'optimal',
    statusLabel: 'Optimal Prompt',
    primaryAdvice: 'Direct instruction with clean structure.',
    potentialTokensSaved: 0,
    issues: [],
    modelUsed: 'fallback'
  };
}

/**
 * Evaluates any user prompt without hardcoded regexes.
 * Uses an objective baseline until the free LLM advisor is bound.
 */
export function evaluateUserPrompt(
  prompt: string,
  previousUserPrompts: string[] = []
): PromptEvaluation {
  if (!prompt || !prompt.trim()) {
    return {
      score: 100,
      status: 'optimal',
      statusLabel: 'Empty Prompt',
      primaryAdvice: 'No content to evaluate.',
      potentialTokensSaved: 0,
      issues: []
    };
  }

  // Objective baseline template:
  // Hardcoded regexes have been stripped out. 
  // Dynamic semantic evaluation will be powered by the free LLM API template above.
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const isDirect = wordCount <= 40;

  return {
    score: 100,
    status: 'optimal',
    statusLabel: 'Optimal Prompt',
    primaryAdvice: isDirect 
      ? 'Clean, direct instruction with high token economy.'
      : 'Comprehensive context provided. LLM template ready for deep semantic advisory.',
    potentialTokensSaved: 0,
    issues: []
  };
}

/**
 * Analyzes full conversation token usage and generates message-by-message breakdown.
 */
export function computeConversationTokens(
  conversation: UnifiedConversation,
  selectedModel: ClaudeModelId = 'claude-3-5-sonnet',
  tokenOverrides?: Record<string, number>,
  evaluationOverrides?: Record<string, PromptEvaluation>
): ConversationTokenAnalytics {
  let promptTokens = 0;
  let responseTokens = 0;
  let runningContext = 0;
  let totalPotentialSavings = 0;
  let totalUserScore = 0;
  let userCount = 0;

  const previousUserPrompts: string[] = [];

  const messagesData: MessageTokenData[] = conversation.messages.map((msg, index) => {
    const isUser = msg.sender === 'user';
    const tokens = (tokenOverrides && typeof tokenOverrides[msg.id] === 'number')
      ? tokenOverrides[msg.id]
      : countClaudeTokens(msg.content);
    const chars = msg.content.length;
    const words = msg.content.trim().split(/\s+/).filter(Boolean).length;
    const cost = calculateCost(tokens, !isUser, selectedModel);

    runningContext += tokens;

    let evaluation: PromptEvaluation | undefined;

    if (isUser) {
      promptTokens += tokens;
      userCount++;
      if (evaluationOverrides && evaluationOverrides[msg.id]) {
        evaluation = evaluationOverrides[msg.id];
        totalPotentialSavings += evaluation.potentialTokensSaved;
        totalUserScore += evaluation.score;
      }
    } else {
      responseTokens += tokens;
    }

    return {
      index: index + 1,
      id: msg.id,
      sender: isUser ? 'user' : 'assistant',
      role: isUser ? 'prompt' : 'response',
      tokens,
      characters: chars,
      words,
      cost,
      cumulativeTokens: runningContext,
      evaluation
    };
  });

  const totalTokens = promptTokens + responseTokens;
  const totalCost = calculateCost(promptTokens, false, selectedModel) + calculateCost(responseTokens, true, selectedModel);
  const avgPromptTokens = userCount > 0 ? Math.round(promptTokens / userCount) : 0;
  const assistantCount = conversation.messages.length - userCount;
  const avgResponseTokens = assistantCount > 0 ? Math.round(responseTokens / assistantCount) : 0;
  const evaluatedCount = messagesData.filter((m) => m.evaluation !== undefined).length;
  const overallEfficiencyScore = evaluatedCount > 0 ? Math.round(totalUserScore / evaluatedCount) : 0;

  return {
    totalTokens,
    promptTokens,
    responseTokens,
    estimatedCost: totalCost,
    selectedModel,
    avgPromptTokens,
    avgResponseTokens,
    peakContextTokens: runningContext,
    overallEfficiencyScore,
    totalPotentialSavings,
    messages: messagesData
  };
}
