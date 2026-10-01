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
  createdAt: string; // ISO date of snapshot creation
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
    passcode?: string;
    expiresAt?: string;
  };
}

export interface SnapshotFilterOptions {
  searchQuery: string;
  senderFilter: 'all' | 'user' | 'assistant';
  hasCodeOnly: boolean;
}
