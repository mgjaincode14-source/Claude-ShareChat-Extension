import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { RedactionOptions, RedactionStats, RedactionStyle } from './types';

// Regular expression patterns for secrets & PII
const API_KEY_PATTERNS = [
  /sk-(live|test|proj|ant|or)-[a-zA-Z0-9_\-]{20,}/g, // OpenAI, Anthropic, OpenRouter
  /AIzaSy[a-zA-Z0-9_\-]{33}/g,                        // Google API Key
  /ghp_[a-zA-Z0-9]{36}/g,                            // GitHub Personal Access Token
  /gho_[a-zA-Z0-9]{36}/g,                            // GitHub OAuth Token
  /xox[baprs]-[a-zA-Z0-9\-]{10,}/g,                  // Slack token
  /AKIA[0-9A-Z]{16}/g,                               // AWS Access Key ID
  /Bearer\s+[a-zA-Z0-9\-\._~\+\/]+=*/g                // Bearer Auth Header
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

function getMask(label: string, length: number, style: RedactionStyle): string {
  if (style === 'blocks') {
    return '█'.repeat(Math.min(16, Math.max(6, length)));
  }
  return `[REDACTED: ${label}]`;
}

export function detectAndRedactText(
  text: string,
  options: RedactionOptions
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

  // 1. Redact API Keys / Tokens
  if (options.redactApiKeys) {
    API_KEY_PATTERNS.forEach((pattern) => {
      const matches = sanitized.match(pattern);
      if (matches) {
        apiKeysCount += matches.length;
        sanitized = sanitized.replace(pattern, (match) => getMask('API_KEY', match.length, options.replacementStyle));
      }
    });
  }

  // 2. Redact Emails
  if (options.redactEmails) {
    const emailMatches = sanitized.match(EMAIL_PATTERN);
    if (emailMatches) {
      emailsCount += emailMatches.length;
      sanitized = sanitized.replace(EMAIL_PATTERN, (match) => getMask('EMAIL', match.length, options.replacementStyle));
    }
  }

  // 3. Redact IP Addresses
  if (options.redactIpAddresses) {
    const ipMatches = sanitized.match(IP_PATTERN);
    if (ipMatches) {
      ipsCount += ipMatches.length;
      sanitized = sanitized.replace(IP_PATTERN, (match) => getMask('IP_ADDRESS', match.length, options.replacementStyle));
    }
  }

  // 4. Redact Phone Numbers
  if (options.redactPhoneNumbers) {
    const phoneMatches = sanitized.match(PHONE_PATTERN);
    if (phoneMatches) {
      phoneNumbersCount += phoneMatches.length;
      sanitized = sanitized.replace(PHONE_PATTERN, (match) => getMask('PHONE', match.length, options.replacementStyle));
    }
  }

  // 5. Redact Custom Keywords
  if (options.customKeywords && options.customKeywords.length > 0) {
    options.customKeywords.forEach((kw) => {
      const trimmed = kw.trim();
      if (!trimmed) return;
      try {
        const kwRegex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const kwMatches = sanitized.match(kwRegex);
        if (kwMatches) {
          keywordsCount += kwMatches.length;
          sanitized = sanitized.replace(kwRegex, (match) => getMask('CONFIDENTIAL', match.length, options.replacementStyle));
        }
      } catch {
        // Skip invalid regex
      }
    });
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

export function applyRedactionToConversation(
  conversation: UnifiedConversation,
  selectedMessages: UnifiedMessage[],
  options: RedactionOptions
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
    const { sanitizedText, stats } = detectAndRedactText(msg.content, options);

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
