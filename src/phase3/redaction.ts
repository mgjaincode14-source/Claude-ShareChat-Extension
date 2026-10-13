import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { RedactionOptions, RedactionStats, RedactionStyle } from './types';

// ============================================================================
// LLM PII & SECRETS DETECTION TEMPLATE (Free / Open-Source Models)
// ============================================================================

export type DetectedPIIType = 'API_KEY' | 'EMAIL' | 'IP_ADDRESS' | 'PHONE' | 'CUSTOM';

export interface DetectedPIIEntity {
  type: DetectedPIIType;
  value: string;
  startIndex?: number;
  endIndex?: number;
  confidence?: number;
}

export interface LLMPIIDetectionRequest {
  text: string;
  detectApiKeys: boolean;
  detectEmails: boolean;
  detectIpAddresses: boolean;
  detectPhoneNumbers: boolean;
}

export interface LLMPIIDetectionResponse {
  entities: DetectedPIIEntity[];
  sanitizedText?: string;
  modelUsed?: string;
}

/**
 * Architectural Template for Free/Local LLM PII & Secret Identification
 *
 * NOTE: All hardcoded regex patterns for phone numbers, API keys, email addresses,
 * and IP addresses have been removed as requested. Hardcoded regexes are brittle 
 * and generate false positives across code snippets, CIDR notations, and variable names.
 *
 * This function provides the pluggable template adapter for a Free / Non-Paid LLM API:
 *   - Local Ollama (e.g., Qwen 2.5 Coder, Mistral, or Llama 3 via http://localhost:11434)
 *   - Free Hugging Face Inference API / Open-weight NER models
 *   - Client-side in-browser Transformers.js / ONNX
 *   - Free tier serverless AI (e.g., Cloudflare Workers AI free tier, Groq free tier)
 *
 * STRICT POLICY: NO PAID MODELS WILL BE USED.
 *
 * Prompt template for the free LLM:
 * ```
 * System: You are a strict PII and Secret Detection Engine. Inspect the provided text 
 * and extract any sensitive credentials or personal identifiers requested.
 * Do not flag standard programming code, version strings (e.g. 1.2.3), or generic numbers.
 * Return strictly JSON: { "entities": [ { "type": "API_KEY"|"EMAIL"|"IP_ADDRESS"|"PHONE", "value": "..." } ] }
 * ```
 */
export async function detectPIIWithLLM(
  request: LLMPIIDetectionRequest
): Promise<LLMPIIDetectionResponse> {
  try {
    const res = await fetch('/api/ai/redact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: request.text,
        options: {
          detectApiKeys: request.detectApiKeys,
          detectEmails: request.detectEmails,
          detectIpAddresses: request.detectIpAddresses,
          detectPhoneNumbers: request.detectPhoneNumbers
        }
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      entities: Array.isArray(data.entities) ? data.entities : [],
      modelUsed: 'Groq (openai/gpt-oss-120b) / Gemini'
    };
  } catch (err) {
    console.warn('[Redaction] LLM PII detection error (returning empty entities):', err);
    return {
      entities: [],
      modelUsed: 'fallback'
    };
  }
}

function getMask(label: string, length: number, style: RedactionStyle): string {
  if (style === 'blocks') {
    return '█'.repeat(Math.min(16, Math.max(6, length)));
  }
  return `[REDACTED: ${label}]`;
}

/**
 * Sanitizes text by applying redaction masks to detected sensitive entities.
 * Accepts an optional list of entities identified by the LLM detection engine.
 * Custom keywords are matched and masked directly without brittle regexes.
 */
export function detectAndRedactText(
  text: string,
  options: RedactionOptions,
  detectedEntities?: DetectedPIIEntity[]
): { sanitizedText: string; stats: RedactionStats } {
  if (!text) {
    return {
      sanitizedText: '',
      stats: {
        apiKeysCount: 0,
        emailsCount: 0,
        ipsCount: 0,
        phoneNumbersCount: 0,
        keywordsCount: 0,
        totalRedacted: 0
      }
    };
  }

  let sanitized = text;
  let apiKeysCount = 0;
  let emailsCount = 0;
  let ipsCount = 0;
  let phoneNumbersCount = 0;
  let keywordsCount = 0;

  // 1. Redact LLM-identified entities
  if (detectedEntities && detectedEntities.length > 0) {
    for (const entity of detectedEntities) {
      if (!entity.value) continue;

      const shouldRedact =
        (entity.type === 'API_KEY' && options.redactApiKeys) ||
        (entity.type === 'EMAIL' && options.redactEmails) ||
        (entity.type === 'IP_ADDRESS' && options.redactIpAddresses) ||
        (entity.type === 'PHONE' && options.redactPhoneNumbers);

      if (shouldRedact && sanitized.includes(entity.value)) {
        sanitized = sanitized.replaceAll(
          entity.value,
          getMask(entity.type, entity.value.length, options.replacementStyle)
        );

        if (entity.type === 'API_KEY') apiKeysCount++;
        else if (entity.type === 'EMAIL') emailsCount++;
        else if (entity.type === 'IP_ADDRESS') ipsCount++;
        else if (entity.type === 'PHONE') phoneNumbersCount++;
      }
    }
  }

  // 2. Redact Custom Confidential Keywords (User-specified exact terms)
  if (options.customKeywords && options.customKeywords.length > 0) {
    for (const kw of options.customKeywords) {
      const trimmed = kw.trim();
      if (!trimmed) continue;

      // Case-insensitive exact string match without regexes
      let searchIdx = 0;
      const lowerKw = trimmed.toLowerCase();
      while (searchIdx < sanitized.length) {
        const lowerSanitized = sanitized.toLowerCase();
        const foundIdx = lowerSanitized.indexOf(lowerKw, searchIdx);
        if (foundIdx === -1) break;

        keywordsCount++;
        const originalSlice = sanitized.slice(foundIdx, foundIdx + trimmed.length);
        const mask = getMask('CONFIDENTIAL', originalSlice.length, options.replacementStyle);
        sanitized =
          sanitized.slice(0, foundIdx) +
          mask +
          sanitized.slice(foundIdx + trimmed.length);
        searchIdx = foundIdx + mask.length;
      }
    }
  }

  const totalRedacted = apiKeysCount + emailsCount + ipsCount + phoneNumbersCount + keywordsCount;

  return {
    sanitizedText: sanitized,
    stats: {
      apiKeysCount,
      emailsCount,
      ipsCount,
      phoneNumbersCount,
      keywordsCount,
      totalRedacted
    }
  };
}

/**
 * Applies redaction across a conversation and its messages.
 */
export function applyRedactionToConversation(
  conversation: UnifiedConversation,
  selectedMessages: UnifiedMessage[],
  options: RedactionOptions,
  detectedEntitiesMap?: Record<string, DetectedPIIEntity[]>
): {
  sanitizedConversation: UnifiedConversation;
  sanitizedMessages: UnifiedMessage[];
  totalStats: RedactionStats;
} {
  let totalApiKeys = 0;
  let totalEmails = 0;
  let totalIps = 0;
  let totalPhones = 0;
  let totalKeywords = 0;

  const sanitizedMessages: UnifiedMessage[] = selectedMessages.map((msg) => {
    const msgEntities = detectedEntitiesMap ? detectedEntitiesMap[msg.id] : undefined;
    const { sanitizedText, stats } = detectAndRedactText(msg.content, options, msgEntities);

    totalApiKeys += stats.apiKeysCount;
    totalEmails += stats.emailsCount;
    totalIps += stats.ipsCount;
    totalPhones += stats.phoneNumbersCount;
    totalKeywords += stats.keywordsCount;

    return {
      ...msg,
      content: sanitizedText
    };
  });

  const totalStats: RedactionStats = {
    apiKeysCount: totalApiKeys,
    emailsCount: totalEmails,
    ipsCount: totalIps,
    phoneNumbersCount: totalPhones,
    keywordsCount: totalKeywords,
    totalRedacted: totalApiKeys + totalEmails + totalIps + totalPhones + totalKeywords
  };

  const sanitizedConversation: UnifiedConversation = {
    ...conversation,
    title: options.customKeywords.length > 0
      ? detectAndRedactText(conversation.title, options).sanitizedText
      : conversation.title,
    messages: sanitizedMessages
  };

  return {
    sanitizedConversation,
    sanitizedMessages,
    totalStats
  };
}
