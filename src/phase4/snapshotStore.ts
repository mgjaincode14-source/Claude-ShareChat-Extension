import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { RedactionStats } from '@/phase3/types';
import { SharedSnapshot, ExpirationOption } from './types';
import { saveSnapshot, getAllSnapshots, getSnapshotById, deleteSnapshot, incrementSnapshotViews } from '@/phase1/db';

export function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < 8; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

/** Generate a secure random deletion token (hex, 24 bytes) */
export function generateDeletionToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert ExpirationOption → ISO date string (or undefined for 'never') */
export function resolveExpiresAt(option: ExpirationOption): string | undefined {
  if (option === 'never') return undefined;
  const ms: Record<ExpirationOption, number> = {
    never: 0,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return new Date(Date.now() + ms[option]).toISOString();
}

export function createSnapshotObject(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  redactionStats: RedactionStats,
  customOptions?: {
    customSlug?: string;
    watermarkText?: string;
    passcode?: string;        // raw passcode (will be hashed server-side)
    expiresAt?: string;       // ISO date from resolveExpiresAt
  },
  fullConvDateRange?: { start: string; end: string }
): SharedSnapshot {
  const now = new Date();
  const shortCode = customOptions?.customSlug || generateShortCode();
  const snapId = `snap_${now.getTime()}_${shortCode}`;

  const userCount = messages.filter((m) => m.sender === 'user').length;
  const assistantCount = messages.filter((m) => m.sender === 'assistant').length;

  const validDates = messages.map((m) => m.dateString).filter(Boolean);
  validDates.sort();

  const startDate = validDates.length > 0 ? validDates[0] : (conversation.createdDateString || 'Unknown');
  const endDate = validDates.length > 0 ? validDates[validDates.length - 1] : startDate;

  const activeCategories: string[] = [];
  if (redactionStats.apiKeysCount > 0) activeCategories.push('API Keys');
  if (redactionStats.emailsCount > 0) activeCategories.push('Emails');
  if (redactionStats.ipsCount > 0) activeCategories.push('IP Addresses');
  if (redactionStats.phoneNumbersCount > 0) activeCategories.push('Phone Numbers');
  if (redactionStats.keywordsCount > 0) activeCategories.push('Custom Terms');

  // Deletion token: generated client-side, stored in both server & IndexedDB
  // so the user can revoke from any device using the token they saved.
  const deletionToken = generateDeletionToken();

  return {
    id: snapId,
    shortCode,
    title: conversation.title,
    createdAt: now.toISOString(),
    dateRange: { start: startDate, end: endDate },
    originalModel: conversation.metadata?.model || 'Claude',
    messages,
    metadata: {
      totalMessages: messages.length,
      userMessagesCount: userCount,
      assistantMessagesCount: assistantCount,
      redactionSummary: {
        apiKeys: redactionStats.apiKeysCount,
        emails: redactionStats.emailsCount,
        ips: redactionStats.ipsCount,
        phones: redactionStats.phoneNumbersCount,
        keywords: redactionStats.keywordsCount
      },
      totalRedacted: redactionStats.totalRedacted,
      watermarkText: customOptions?.watermarkText || 'Shared via Claude Selective Share',
      customSlug: customOptions?.customSlug || undefined,
      viewsCount: 0,
      // Raw passcode is included here — the POST /api/share handler will hash it
      // and discard the plaintext before writing to Supabase.
      passcode: customOptions?.passcode || undefined,
      passcodeProtected: Boolean(customOptions?.passcode),
      expiresAt: customOptions?.expiresAt || undefined,
      deletionToken,
      filteredDateRange: { start: startDate, end: endDate },
      fullConversationDateRange: fullConvDateRange || undefined
    }
  };
}

export const PRODUCTION_APP_URL = 'https://claudesharechat.vercel.app';

export function getShareBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return PRODUCTION_APP_URL;
    }
    return window.location.origin;
  }
  return PRODUCTION_APP_URL;
}

export { saveSnapshot, getAllSnapshots, getSnapshotById, deleteSnapshot, incrementSnapshotViews };
