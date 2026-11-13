import { UnifiedMessage } from '@/phase1/types';

export interface RedactionCategorySummary {
  apiKeys: number;
  emails: number;
  ips: number;
  phones: number;
  keywords: number;
}

export interface SharedSnapshot {
  id: string;
  shortCode: string;
  title: string;
  createdAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  originalModel: string;
  messages: UnifiedMessage[];
  metadata: {
    totalMessages: number;
    userMessagesCount: number;
    assistantMessagesCount: number;
    redactionSummary: RedactionCategorySummary;
    totalRedacted: number;
    watermarkText: string;
    customSlug?: string;
    viewsCount: number;
    /** SHA-256 hash of the creator's passcode — plaintext is never stored */
    passcode?: string;
    /** True when the snapshot requires passcode verification */
    passcodeProtected?: boolean;
    /** ISO date string — snapshot auto-expires after this date */
    expiresAt?: string;
    /** Signed deletion token — allows cross-device revocation */
    deletionToken?: string;
    /** Date range of the selected/filtered messages */
    filteredDateRange?: { start: string; end: string };
    /** Full conversation date span */
    fullConversationDateRange?: { start: string; end: string };
  };
}

export interface SnapshotFilterOptions {
  searchQuery: string;
  senderFilter: 'all' | 'user' | 'assistant';
  hasCodeOnly: boolean;
}

/** TTL option presented to creator in the ShareLinkGenerator UI */
export type ExpirationOption = 'never' | '24h' | '7d' | '30d';
