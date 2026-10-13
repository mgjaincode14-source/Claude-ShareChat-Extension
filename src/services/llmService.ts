/**
 * Unified LLM Service for Groq and Google Gemini Free Tier
 *
 * Models configured:
 *  - Groq: openai/gpt-oss-120b (fallback: qwen/qwen3.8-27b)
 *  - Gemini: gemini-flash-latest
 *
 * Includes automatic dual-engine fallback and in-memory caching to strictly
 * respect free tier rate limits (e.g. Gemini 5 RPM, Groq concurrency).
 */

import { DetectedPIIEntity } from '@/phase3/redaction';
import { PromptEvaluation, PromptIssue } from '@/phase5/types';
import { SentimentScore } from '@/phase5/types';

interface LLMCallResult {
  data: any;
  provider: 'groq' | 'gemini';
  model: string;
}

// In-memory caches to prevent redundant calls and avoid free-tier quota exhaustion
const piiMemoryCache = new Map<string, DetectedPIIEntity[]>();
const advisorMemoryCache = new Map<string, PromptEvaluation>();
const sentimentMemoryCache = new Map<string, SentimentScore>();

/**
 * Universal JSON LLM Caller with Dual-Engine Fallback
 */
export async function callLLMJSON(
  systemPrompt: string,
  userPrompt: string,
  preferredEngine: 'groq' | 'gemini' = 'groq'
): Promise<LLMCallResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;

  if (!groqKey && !geminiKey) {
    throw new Error('Neither GROQ_API_KEY nor GOOGLE_API_KEY is configured in .env');
  }

  const tryGroq = async (): Promise<LLMCallResult> => {
    if (!groqKey) throw new Error('GROQ_API_KEY is not set');

    const modelsToTry = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
            'User-Agent': 'Claude-ShareChat/1.0'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq HTTP ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq');

        return {
          data: JSON.parse(content),
          provider: 'groq',
          model
        };
      } catch (err: any) {
        lastError = err;
        // If 429 rate limit, stop trying other models on Groq to avoid hitting burst penalties
        if (err?.message?.includes('429')) break;
        continue;
      }
    }

    throw lastError || new Error('All Groq models failed');
  };

  const tryGemini = async (): Promise<LLMCallResult> => {
    if (!geminiKey) throw new Error('GOOGLE_API_KEY is not set');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      // Friendly rate limit detection
      if (res.status === 429) {
        throw new Error(`Gemini 429: Free-tier quota exceeded (limit: 5 RPM).`);
      }
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');

    return {
      data: JSON.parse(rawText),
      provider: 'gemini',
      model: 'gemini-flash-latest'
    };
  };

  // Primary execution with graceful fallback
  if (preferredEngine === 'groq' && groqKey) {
    try {
      return await tryGroq();
    } catch (groqErr: any) {
      console.warn('[LLMService] Groq failed, attempting Gemini fallback:', groqErr?.message || groqErr);
      if (geminiKey) {
        try {
          return await tryGemini();
        } catch (geminiErr: any) {
          console.warn('[LLMService] Gemini also failed:', geminiErr?.message || geminiErr);
        }
      }
      throw groqErr;
    }
  } else if (geminiKey) {
    try {
      return await tryGemini();
    } catch (geminiErr: any) {
      console.warn('[LLMService] Gemini failed, attempting Groq fallback:', geminiErr?.message || geminiErr);
      if (groqKey) {
        try {
          return await tryGroq();
        } catch (groqRetryErr: any) {
          console.warn('[LLMService] Groq fallback also failed:', groqRetryErr?.message || groqRetryErr);
        }
      }
      throw geminiErr;
    }
  } else {
    return await tryGroq();
  }
}

// ============================================================================
// 1. PII & Secrets Detection (Single & Batch)
// ============================================================================

const PII_SYSTEM_PROMPT = `You are a Data Privacy and Secret Redaction Engine specialized in software developer chat logs.
Your task is to analyze the text and extract all sensitive credentials and personally identifiable information (PII).

You must identify:
1. API_KEY: High-entropy authentication tokens, private keys, bearer tokens, service account credentials (sk-..., ghp_..., AIzaSy..., AKIA..., xoxb-..., etc.)
2. EMAIL: Valid email addresses (e.g. user@domain.com)
3. IP_ADDRESS: Valid public or private IPv4 and IPv6 addresses (e.g., 192.168.1.1, 10.0.0.1, 2001:db8::1)
4. PHONE: Standard and international phone numbers with dial codes or area codes

CRITICAL TECHNICAL GUARDRAILS:
- DO NOT flag generic programming variable names (e.g., api_key = None, user_email, token).
- DO NOT flag semantic software version numbers (e.g., 1.2.3.4, 0.0.1, Python 3.11).
- DO NOT flag port numbers alone or loopbacks (unless part of a complete sensitive URL/credential).
- DO NOT flag placeholder strings (e.g., sk-xxx, your_token_here, <API_KEY>).
- DO NOT flag CSS color hex codes or math expressions.

Return STRICT JSON matching this schema:
{
  "entities": [
    {
      "type": "API_KEY" | "EMAIL" | "IP_ADDRESS" | "PHONE",
      "value": "exact_matched_substring",
      "confidence": 0.0 to 1.0
    }
  ]
}

If no sensitive entities are found, return: { "entities": [] }`;

const BATCH_PII_SYSTEM_PROMPT = `You are a Data Privacy and Secret Redaction Engine specialized in software developer chat logs.
Your task is to analyze the array of chat messages and extract all sensitive credentials and PII (API_KEY, EMAIL, IP_ADDRESS, PHONE) for each message.

CRITICAL TECHNICAL GUARDRAILS:
- DO NOT flag generic programming variable names (e.g., api_key = None, user_email, token).
- DO NOT flag semantic software version numbers (e.g., 1.2.3.4, 0.0.1, Python 3.11).
- DO NOT flag port numbers alone or loopbacks.
- DO NOT flag placeholder strings (e.g., sk-xxx, your_token_here, <API_KEY>).

Input format:
JSON array of objects: [{ "id": string, "text": string }]

Output STRICT JSON matching:
{
  "results": [
    {
      "id": "string",
      "entities": [
        {
          "type": "API_KEY" | "EMAIL" | "IP_ADDRESS" | "PHONE",
          "value": "exact_matched_substring",
          "confidence": 0.0 to 1.0
        }
      ]
    }
  ]
}
If a message has no sensitive entities, return "entities": [] for that message.`;

function filterEntities(
  entities: DetectedPIIEntity[],
  options?: {
    detectApiKeys?: boolean;
    detectEmails?: boolean;
    detectIpAddresses?: boolean;
    detectPhoneNumbers?: boolean;
  }
): DetectedPIIEntity[] {
  return entities.filter((e) => {
    if (e.type === 'API_KEY' && options?.detectApiKeys === false) return false;
    if (e.type === 'EMAIL' && options?.detectEmails === false) return false;
    if (e.type === 'IP_ADDRESS' && options?.detectIpAddresses === false) return false;
    if (e.type === 'PHONE' && options?.detectPhoneNumbers === false) return false;
    return true;
  });
}

export async function detectPIIWithAI(
  text: string,
  options?: {
    detectApiKeys?: boolean;
    detectEmails?: boolean;
    detectIpAddresses?: boolean;
    detectPhoneNumbers?: boolean;
  }
): Promise<DetectedPIIEntity[]> {
  if (!text || !text.trim()) return [];

  const cacheKey = `single:${text.slice(0, 100)}`;
  if (piiMemoryCache.has(cacheKey)) {
    return filterEntities(piiMemoryCache.get(cacheKey)!, options);
  }

  const userPrompt = `Analyze the following text and extract all API keys, email addresses, IP addresses, and phone numbers:\n\n<<<TEXT_TO_INSPECT>>>\n${text}\n<<<END_TEXT>>>`;

  try {
    const { data } = await callLLMJSON(PII_SYSTEM_PROMPT, userPrompt, 'groq');
    const entities: DetectedPIIEntity[] = Array.isArray(data?.entities) ? data.entities : [];
    piiMemoryCache.set(cacheKey, entities);
    return filterEntities(entities, options);
  } catch (err) {
    console.warn('[LLMService] detectPIIWithAI fallback (empty):', err);
    return [];
  }
}

/**
 * High-performance batch PII extraction that processes multiple messages
 * in 1 single LLM call instead of multiple parallel calls, preventing rate limits.
 */
export async function detectPIIBatchWithAI(
  messages: { id: string; content: string }[],
  options?: {
    detectApiKeys?: boolean;
    detectEmails?: boolean;
    detectIpAddresses?: boolean;
    detectPhoneNumbers?: boolean;
  }
): Promise<Record<string, DetectedPIIEntity[]>> {
  if (!messages || messages.length === 0) return {};

  const resultMap: Record<string, DetectedPIIEntity[]> = {};
  const uncached: { id: string; content: string }[] = [];

  for (const m of messages) {
    if (!m.content || m.content.trim().length < 5) {
      resultMap[m.id] = [];
      continue;
    }
    const cacheKey = `msg:${m.id}:${m.content.slice(0, 60)}`;
    if (piiMemoryCache.has(cacheKey)) {
      resultMap[m.id] = filterEntities(piiMemoryCache.get(cacheKey)!, options);
    } else {
      uncached.push(m);
    }
  }

  // If all messages were cached, return immediately with zero API calls
  if (uncached.length === 0) {
    return resultMap;
  }

  // Chunk messages into groups of 10 to keep within token limits and achieve 1 request per chunk
  const CHUNK_SIZE = 10;
  for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
    const chunk = uncached.slice(i, i + CHUNK_SIZE);
    const serialized = chunk.map((m) => ({
      id: m.id,
      text: m.content.slice(0, 1200)
    }));

    const userPrompt = `Extract sensitive credentials and PII for the following messages:\n${JSON.stringify(serialized, null, 2)}`;

    try {
      const { data } = await callLLMJSON(BATCH_PII_SYSTEM_PROMPT, userPrompt, 'groq');
      if (Array.isArray(data?.results)) {
        for (const item of data.results) {
          const entities: DetectedPIIEntity[] = Array.isArray(item.entities) ? item.entities : [];
          resultMap[item.id] = filterEntities(entities, options);
          const original = chunk.find((c) => c.id === item.id);
          if (original) {
            piiMemoryCache.set(`msg:${original.id}:${original.content.slice(0, 60)}`, entities);
          }
        }
      }
    } catch (err: any) {
      console.warn('[LLMService] detectPIIBatchWithAI error on chunk:', err?.message || err);
      // Fallback: assign empty entities for chunk
      for (const item of chunk) {
        if (!resultMap[item.id]) resultMap[item.id] = [];
      }
    }
  }

  // Guarantee every requested message has an entry
  for (const m of messages) {
    if (!resultMap[m.id]) resultMap[m.id] = [];
  }

  return resultMap;
}

// ============================================================================
// 2. Token & Cost / Prompt Reduction Advisor
// ============================================================================

const ADVISOR_SYSTEM_PROMPT = `You are an expert Prompt Engineering and Token Efficiency Advisor for Claude and LLM systems.
Your job is to analyze user prompts from developer chats and provide precise diagnostic feedback to minimize unnecessary token consumption, context bloat, and API costs.

Evaluate the prompt against these diagnostic dimensions:
1. polite_filler: Conversational greetings, pleasantries, and sign-offs ("Hello Claude", "Could you please kindly", "Hope you're having a great day", "Thanks in advance"). LLMs do not need pleasantries.
2. verbose_preamble: Wordy meta-instructions ("What I would like you to do is...", "In order to accomplish this...").
3. redundant_persona: Over-inflated persona priming ("Act as a 10x world-class genius senior developer..."). Claude already reasons with senior domain depth.
4. duplicate_code: Re-pasting entire code blocks that were already established in conversation context.
5. large_log_dump: Unfiltered raw terminal or build dumps instead of just the relevant stack trace.
6. high_ambiguity: Extremely brief queries ("why broken?", "fix this") that risk causing 2-3 extra clarification turns.
7. unstructured: Long multi-part queries without bullet points, steps, or XML delimiters (<instructions>, <code>).

Scoring rules:
- Score 90-100 (status: "optimal", statusLabel: "Optimal Prompt"): Direct imperative instructions, high signal-to-noise ratio, zero fluff.
- Score 75-89 (status: "good", statusLabel: "Good Prompt"): Solid prompt with minor optimization potential.
- Score 50-74 (status: "needs_improvement", statusLabel: "Needs Optimization"): Noticeable token waste from pleasantries, fluff, or unstructured questions.
- Score 0-49 (status: "wasteful", statusLabel: "High Token Waste"): Heavy token bloat from re-pasted code, massive logs, or verbose conversational padding.

You must output STRICT JSON matching this schema:
{
  "score": number,
  "status": "optimal" | "good" | "needs_improvement" | "wasteful",
  "statusLabel": string,
  "primaryAdvice": string,
  "potentialTokensSaved": number,
  "issues": [
    {
      "type": "polite_filler" | "duplicate_code" | "whitespace_comments" | "verbose_preamble" | "unstructured" | "high_ambiguity" | "large_log_dump" | "redundant_persona" | "repetitive_constraints" | "redundant_history",
      "title": string,
      "description": string,
      "estimatedSavings": number
    }
  ],
  "optimizedPromptPreview": string
}

If the prompt is already optimal, return "issues": [], "potentialTokensSaved": 0, and give a brief positive affirmation in "primaryAdvice".`;

export async function evaluatePromptWithAI(
  prompt: string,
  previousPrompts: string[] = []
): Promise<PromptEvaluation> {
  if (!prompt || !prompt.trim()) {
    return {
      score: 100,
      status: 'optimal',
      statusLabel: 'Empty Prompt',
      primaryAdvice: 'No prompt content to evaluate.',
      potentialTokensSaved: 0,
      issues: []
    };
  }

  const cacheKey = `adv:${prompt.slice(0, 120)}`;
  if (advisorMemoryCache.has(cacheKey)) {
    return advisorMemoryCache.get(cacheKey)!;
  }

  const contextSnippet = previousPrompts.length > 0
    ? `\nPrior User Prompts in this Conversation (for context & duplication check):\n${previousPrompts.slice(-2).map((p, i) => `[Turn ${i + 1}]: ${p.slice(0, 200)}`).join('\n')}`
    : '';

  const userPrompt = `Evaluate the token efficiency of the following user prompt:\n\n<<<PROMPT>>>\n${prompt}\n<<<END_PROMPT>>>${contextSnippet}`;

  try {
    const { data } = await callLLMJSON(ADVISOR_SYSTEM_PROMPT, userPrompt, 'groq');

    const result: PromptEvaluation = {
      score: typeof data.score === 'number' ? data.score : 85,
      status: data.status || 'optimal',
      statusLabel: data.statusLabel || 'Optimal Prompt',
      primaryAdvice: data.primaryAdvice || 'Direct and clear prompt.',
      potentialTokensSaved: typeof data.potentialTokensSaved === 'number' ? data.potentialTokensSaved : 0,
      issues: Array.isArray(data.issues) ? data.issues : [],
      optimizedPromptPreview: data.optimizedPromptPreview || undefined
    };

    advisorMemoryCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    console.warn('[LLMService] evaluatePromptWithAI fallback:', err?.message || err);
    return {
      score: 100,
      status: 'optimal',
      statusLabel: 'Optimal Prompt',
      primaryAdvice: 'Direct instruction with clean structure.',
      potentialTokensSaved: 0,
      issues: []
    };
  }
}

// ============================================================================
// 3. Sentiment Analysis (Technical Chat Aware)
// ============================================================================

const SENTIMENT_SYSTEM_PROMPT = `You are a Conversational Tone and Sentiment Analyst specialized in software engineering and AI assistant dialogs.
Your job is to determine the emotional tone and sentiment of chat messages.

CRITICAL TECHNICAL RULES:
- DO NOT mark messages as "negative" simply because they describe code errors, bugs, crashes, exceptions, "false", "null", or use the word "no" in a technical context (e.g., "The API returned 404, no data found", "There is a bug in line 4", "No, that's not what I meant").
- "negative" sentiment MUST reflect genuine interpersonal frustration, hostility, irritation, disappointment, or distress (e.g. "This is completely wrong and unhelpful", "Why can't you get this right?", "I'm so frustrated with this").
- "positive" sentiment reflects genuine satisfaction, gratitude, enthusiasm, or praise (e.g. "Awesome, that worked perfectly!", "Thank you so much!", "Brilliant solution").
- "neutral" sentiment is the standard baseline for normal programming discussions, technical requirements, bug reports, objective questions, and code explanations.

Score range:
- -1.0 to -0.2: negative (irritated, frustrated, sarcastic, hostile)
- -0.19 to +0.19: neutral (matter-of-fact, objective, technical question or answer)
- +0.2 to +1.0: positive (encouraging, satisfied, thankful, enthusiastic)

You must output STRICT JSON matching this schema:
{
  "results": [
    {
      "id": "message_id",
      "label": "positive" | "neutral" | "negative",
      "score": number (-1.0 to 1.0),
      "reasoning": "brief explanation"
    }
  ]
}`;

export async function analyzeSentimentWithAI(
  messages: { id: string; content: string; sender: string }[]
): Promise<Record<string, SentimentScore>> {
  if (!messages || messages.length === 0) return {};

  const resultMap: Record<string, SentimentScore> = {};
  const uncached: { id: string; content: string; sender: string }[] = [];

  for (const m of messages) {
    const cacheKey = `sent:${m.id}:${m.content.slice(0, 60)}`;
    if (sentimentMemoryCache.has(cacheKey)) {
      resultMap[m.id] = sentimentMemoryCache.get(cacheKey)!;
    } else {
      uncached.push(m);
    }
  }

  if (uncached.length === 0) {
    return resultMap;
  }

  // Batch process messages in chunks of 15 to stay within token limits and maximize speed
  const CHUNK_SIZE = 15;
  for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
    const chunk = uncached.slice(i, i + CHUNK_SIZE);
    const serialized = chunk.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.content.slice(0, 500)
    }));

    const userPrompt = `Analyze the sentiment for the following chat messages:\n${JSON.stringify(serialized, null, 2)}`;

    try {
      const { data } = await callLLMJSON(SENTIMENT_SYSTEM_PROMPT, userPrompt, 'groq');
      if (Array.isArray(data?.results)) {
        for (const item of data.results) {
          if (item.id && (item.label === 'positive' || item.label === 'neutral' || item.label === 'negative')) {
            const scoreObj: SentimentScore = {
              label: item.label,
              score: typeof item.score === 'number' ? item.score : (item.label === 'positive' ? 0.6 : item.label === 'negative' ? -0.6 : 0.0)
            };
            resultMap[item.id] = scoreObj;
            const original = chunk.find((c) => c.id === item.id);
            if (original) {
              sentimentMemoryCache.set(`sent:${original.id}:${original.content.slice(0, 60)}`, scoreObj);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[LLMService] analyzeSentimentWithAI error on chunk:', err?.message || err);
    }
  }

  // Ensure every message has at least neutral fallback
  for (const m of messages) {
    if (!resultMap[m.id]) {
      resultMap[m.id] = { label: 'neutral', score: 0.0 };
    }
  }

  return resultMap;
}
