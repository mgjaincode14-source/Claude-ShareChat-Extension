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
    const words = text.trim().split(/\s+/).length;
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

// Diagnostic Regular Expressions for Query Evaluation
const GREETINGS_REGEX = /\b(hello|hi|hey|good\s+(morning|afternoon|evening|day)|greetings)\s+(claude|there|assistant|bot)?\b[,!.]?/gi;
const PLEASANTRIES_REGEX = /\b(could\s+you\s+(please|kindly)|can\s+you\s+(please|kindly)|would\s+you\s+(mind|be\s+so\s+kind\s+as\s+to)|please\s+kindly|hope\s+you('re|\s+are)\s+(doing\s+well|having\s+a\s+great\s+day))\b/gi;
const SIGNOFFS_REGEX = /\b(thank\s+you(\s+so\s+much|\s+very\s+much)?(\s+in\s+advance)?|thanks\s+(a\s+lot|in\s+advance)|best\s+regards|cheers)\b/gi;
const VERBOSE_PREAMBLE_REGEX = /\b(in\s+order\s+to(\s+accomplish|\s+achieve|\s+do)?|what\s+i\s+(would\s+like|want)\s+you\s+to\s+do\s+is|i\s+am\s+(wondering|trying\s+to\s+figure\s+out)\s+if|the\s+thing\s+is\s+that\s+basically|so\s+what\s+i\s+was\s+thinking\s+is)\b/gi;
const PERSONA_REGEX = /\b(act\s+as\s+(an?|my)\s+|you\s+are\s+(an?|my)\s+|pretend\s+you\s+are\s+(an?|my)\s+)(an?\s+)?(expert|senior|experienced|professional|master|world-class|genius)[^,.\n]+?(and|\.|\n|,)/gi;
const CONSTRAINT_PATTERNS = [
  /\bonly\s+code\b/i,
  /\bno\s+markdown\b/i,
  /\bdo\s+not\s+(explain|write\s+any\s+words|add\s+explanations?)\b/i,
  /\bstrictly\s+code\b/i,
  /\bjust\s+the\s+code\b/i,
  /\bno\s+commentary\b/i
];
const QUOTED_HISTORY_REGEX = /\b(in\s+your\s+previous\s+(response|message|reply)|as\s+you\s+(said|mentioned|stated)\s+earlier|you\s+wrote:)\s*["'“]/gi;

/**
 * Evaluates any user query/prompt across all diagnostic dimensions.
 * Produces actionable advice for improvement, or confirms optimal prompt construction.
 */
export function evaluateUserPrompt(
  prompt: string,
  previousUserPrompts: string[] = []
): PromptEvaluation {
  const issues: PromptIssue[] = [];
  const tokenCount = countClaudeTokens(prompt);
  let potentialTokensSaved = 0;
  let optimized = prompt;

  if (!prompt.trim()) {
    return {
      score: 100,
      status: 'optimal',
      statusLabel: 'Empty Prompt',
      primaryAdvice: 'No content to evaluate.',
      potentialTokensSaved: 0,
      issues: []
    };
  }

  // 1. Check for Polite Filler & Pleasantries
  const greetingMatches = prompt.match(GREETINGS_REGEX) || [];
  const pleasantryMatches = prompt.match(PLEASANTRIES_REGEX) || [];
  const signoffMatches = prompt.match(SIGNOFFS_REGEX) || [];
  const totalPoliteMatches = greetingMatches.length + pleasantryMatches.length + signoffMatches.length;

  if (totalPoliteMatches > 0) {
    const politeWords = [...greetingMatches, ...pleasantryMatches, ...signoffMatches].join(' ');
    const fillerTokens = countClaudeTokens(politeWords);
    if (fillerTokens >= 4) {
      issues.push({
        type: 'polite_filler',
        title: 'Conversational Polite Filler',
        description: `Found ${totalPoliteMatches} conversational greeting/pleasantry phrases ("${greetingMatches[0] || pleasantryMatches[0] || signoffMatches[0]}"). LLMs do not need pleasantries to deliver accurate results. Removing them saves tokens across every turn.`,
        estimatedSavings: fillerTokens
      });
      potentialTokensSaved += fillerTokens;
      optimized = optimized
        .replace(GREETINGS_REGEX, '')
        .replace(PLEASANTRIES_REGEX, '')
        .replace(SIGNOFFS_REGEX, '');
    }
  }

  // 2. Check for Duplicate Code / Context Re-pasting across turns
  const codeBlockMatch = prompt.match(/```[\s\S]*?```/g);
  if (codeBlockMatch && codeBlockMatch.length > 0) {
    for (const block of codeBlockMatch) {
      if (block.length > 60) {
        // Check if this snippet already appeared in an earlier user turn
        const alreadySent = previousUserPrompts.some((prev) => prev.includes(block.slice(10, -10)));
        if (alreadySent) {
          const dupTokens = countClaudeTokens(block);
          issues.push({
            type: 'duplicate_code',
            title: 'Duplicate Code Re-pasting',
            description: `You re-pasted a code block (~${dupTokens} tokens) that was already sent in an earlier turn. Claude retains conversation history in its context window. You can refer to "in the function above" instead of re-pasting.`,
            estimatedSavings: dupTokens
          });
          potentialTokensSaved += dupTokens;
          break;
        }
      }
    }
  }

  // 3. Check for Whitespace, Blank Lines & Comment Redundancy
  const tripleNewlines = (prompt.match(/\n{3,}/g) || []).length;
  const commentLines = (prompt.match(/^\s*(\/\/|#|\/\*|\*).*$/gm) || []).length;
  if (tripleNewlines > 2 || commentLines > 4) {
    const savings = Math.min(Math.round(tokenCount * 0.15), 120);
    issues.push({
      type: 'whitespace_comments',
      title: 'Excess Whitespace & Inline Comments',
      description: `Detected ${tripleNewlines} excessive blank line breaks and ${commentLines} lines of inline code comments. Compressing whitespace and stripping comments before pasting saves tokens.`,
      estimatedSavings: savings
    });
    potentialTokensSaved += savings;
    optimized = optimized.replace(/\n{3,}/g, '\n\n');
  }

  // 4. Check for Verbose Preambles (Fluff)
  const verboseMatches = prompt.match(VERBOSE_PREAMBLE_REGEX) || [];
  if (verboseMatches.length > 0) {
    const fluffTokens = Math.min(Math.round(verboseMatches.length * 6), 35);
    issues.push({
      type: 'verbose_preamble',
      title: 'Wordy Instruction Preambles',
      description: `Detected phrases like "${verboseMatches[0]}". Use direct imperative instructions (e.g. "Refactor this function to..." instead of "What I would like you to do is refactor...").`,
      estimatedSavings: fluffTokens
    });
    potentialTokensSaved += fluffTokens;
  }

  // 5. Check for Large Raw Log / Terminal Dump
  const logLines = (prompt.match(/(npm WARN|error:|exception|traceback|at\s+\w+\.\w+|INFO|DEBUG)/gi) || []).length;
  if (logLines > 15) {
    const logSavings = Math.round(tokenCount * 0.4);
    issues.push({
      type: 'large_log_dump',
      title: 'Large Raw Log / Trace Dump',
      description: `Prompt contains an extensive raw log dump (${logLines} log entries). Trimming logs to just the final exception stack trace saves up to 50% of prompt tokens without reducing diagnostic quality.`,
      estimatedSavings: logSavings
    });
    potentialTokensSaved += logSavings;
  }

  // 6. Check for High Ambiguity / Under-specified Prompts (Risk of Multi-turn Token Churn)
  const words = prompt.trim().split(/\s+/).length;
  if (words < 5 && !codeBlockMatch) {
    const isVague = /\b(fix|error|help|why|broken|not working|check)\b/i.test(prompt);
    if (isVague) {
      issues.push({
        type: 'high_ambiguity',
        title: 'Under-specified Prompt (High Churn Risk)',
        description: 'Very short, vague prompt. Asking for help without stating expected behavior or providing error details often leads to 2-3 extra follow-up turns, wasting 1,000+ context tokens.',
        estimatedSavings: 0
      });
    }
  }

  // 7. Check for Unstructured Multi-Part Queries
  if (words > 120 && !prompt.includes('\n-') && !prompt.includes('\n*') && !prompt.includes('\n1.') && !prompt.includes('<')) {
    const multiQuestion = (prompt.match(/\?/g) || []).length > 2;
    if (multiQuestion) {
      issues.push({
        type: 'unstructured',
        title: 'Unstructured Multi-Part Request',
        description: 'Long prompt with multiple questions in a single narrative block. Using bullet points or XML tags (<instructions>, <context>) prevents repeated clarification turns and keeps tokens compact.',
        estimatedSavings: 15
      });
      potentialTokensSaved += 15;
    }
  }

  // 8. Check for Redundant Persona Framing
  const personaMatches = prompt.match(PERSONA_REGEX);
  if (personaMatches && personaMatches.length > 0) {
    const savings = Math.min(countClaudeTokens(personaMatches[0]), 25);
    issues.push({
      type: 'redundant_persona',
      title: 'Redundant Persona Framing',
      description: `Detected persona preamble ("${personaMatches[0].trim()}"). Claude 3.5 Sonnet operates with senior-level domain expertise by default; persona fluff wastes tokens without improving answer quality.`,
      estimatedSavings: savings
    });
    potentialTokensSaved += savings;
    optimized = optimized.replace(PERSONA_REGEX, '');
  }

  // 9. Check for Repetitive Constraints
  const matchedConstraints = CONSTRAINT_PATTERNS.filter((pattern) => pattern.test(prompt));
  if (matchedConstraints.length >= 2) {
    issues.push({
      type: 'repetitive_constraints',
      title: 'Repetitive Output Directives',
      description: 'Multiple repetitive constraints detected (e.g. "only code", "no markdown", "do not explain"). A single concise directive is sufficient for Claude.',
      estimatedSavings: 8
    });
    potentialTokensSaved += 8;
  }

  // 10. Check for Quoting Prior Output
  if (QUOTED_HISTORY_REGEX.test(prompt)) {
    issues.push({
      type: 'redundant_history',
      title: 'Re-quoting Previous LLM Output',
      description: "Quoting text from Claude's previous response back into the prompt. Claude already retains conversational context; referring to line numbers or function names saves tokens.",
      estimatedSavings: 15
    });
    potentialTokensSaved += 15;
  }

  // Determine overall score and status
  let score = 100;
  if (issues.length > 0) {
    const penalty = issues.reduce((acc, issue) => {
      if (issue.type === 'duplicate_code') return acc + 30;
      if (issue.type === 'polite_filler') return acc + 15;
      if (issue.type === 'large_log_dump') return acc + 25;
      return acc + 10;
    }, 0);
    score = Math.max(35, 100 - penalty);
  }

  // Generate dynamic, context-aware feedback for all prompts
  const hasCode = /```[\s\S]*?```/.test(prompt);
  const hasStructure = prompt.includes('\n- ') || prompt.includes('\n* ') || prompt.includes('\n1. ');
  const isConcise = words <= 30;

  let optimalPraise = '✅ Optimal prompt: direct instruction, concise structure, and zero redundant tokens.';
  if (hasCode && isConcise) {
    optimalPraise = '✅ Optimal prompt: cleanly isolated code snippet with direct technical inquiry and zero filler tokens.';
  } else if (hasStructure) {
    optimalPraise = '✅ Optimal prompt: well-structured multi-step hierarchy with bulleted items, minimizing clarification turns.';
  } else if (isConcise) {
    optimalPraise = '✅ Optimal prompt: tight, high-signal imperative instruction with maximum token efficiency.';
  } else if (words > 60) {
    optimalPraise = '✅ Optimal prompt: rich domain context provided cleanly without conversational fluff or redundant history.';
  }

  let status: 'optimal' | 'good' | 'needs_improvement' | 'wasteful' = 'optimal';
  let statusLabel = 'Optimal Prompt';
  let primaryAdvice = optimalPraise;

  if (issues.length > 0) {
    if (score < 50) {
      status = 'wasteful';
      statusLabel = 'High Token Waste';
      primaryAdvice = issues[0]?.description || 'Significant token savings possible by pruning redundant content.';
    } else if (score < 75) {
      status = 'needs_improvement';
      statusLabel = 'Needs Optimization';
      primaryAdvice = issues[0]?.description || 'Prompt could be made more token-efficient.';
    } else {
      status = 'good';
      statusLabel = 'Good Prompt';
      primaryAdvice = issues[0]?.description || 'Well constructed prompt with minor optimization opportunities.';
    }
  }

  optimized = optimized.trim();

  return {
    score,
    status,
    statusLabel,
    primaryAdvice,
    potentialTokensSaved,
    issues,
    optimizedPromptPreview: optimized !== prompt ? optimized : undefined
  };
}

/**
 * Analyzes full conversation token usage and generates message-by-message breakdown.
 */
export function computeConversationTokens(
  conversation: UnifiedConversation,
  selectedModel: ClaudeModelId = 'claude-3-5-sonnet',
  tokenOverrides?: Record<string, number>
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
      evaluation = evaluateUserPrompt(msg.content, previousUserPrompts);
      previousUserPrompts.push(msg.content);
      totalPotentialSavings += evaluation.potentialTokensSaved;
      totalUserScore += evaluation.score;
      userCount++;
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
  const overallEfficiencyScore = userCount > 0 ? Math.round(totalUserScore / userCount) : 100;

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
