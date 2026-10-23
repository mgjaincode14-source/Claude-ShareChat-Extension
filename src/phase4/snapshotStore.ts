import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { RedactionStats } from '@/phase3/types';
import { SharedSnapshot } from './types';
import { saveSnapshot, getAllSnapshots, getSnapshotById, deleteSnapshot, incrementSnapshotViews } from '@/phase1/db';

export function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < 8; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

export function createSnapshotObject(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
  redactionStats: RedactionStats,
  customOptions?: {
    customSlug?: string;
    watermarkText?: string;
    passcode?: string;
    expiresAt?: string;
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

  return {
    id: snapId,
    shortCode,
    title: conversation.title,
    createdAt: now.toISOString(),
    dateRange: {
      start: startDate,
      end: endDate
    },
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
      passcode: customOptions?.passcode || undefined,
      expiresAt: customOptions?.expiresAt || undefined,
      // Filtered date range = actual dates of the selected messages
      filteredDateRange: { start: startDate, end: endDate },
      // Full conversation span (passed in from the dashboard)
      fullConversationDateRange: fullConvDateRange || undefined,
    }
  };
}

export const PRODUCTION_APP_URL = 'https://claudesharechat.vercel.app';

/**
 * Returns the production-grade base URL for shareable links.
 * Ensures generated share links use the live public domain
 * (https://claudesharechat.vercel.app) rather than localhost,
 * making them immediately shareable and professional.
 */
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

