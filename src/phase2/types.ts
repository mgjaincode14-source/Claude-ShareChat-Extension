import { UnifiedMessage, UnifiedConversation } from '@/phase1/types';

export type SelectionMode = 'all' | 'specific_date' | 'date_range' | 'individual';

export interface SelectionOptions {
  mode: SelectionMode;
  selectedDate?: string; // YYYY-MM-DD
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  selectedMessageIds: string[]; // List of explicitly selected message IDs
  includePrecedingContext: boolean;
  contextDepth: number;  // Number of preceding messages to attach (default 1)
}

export interface DateSummary {
  dateString: string;
  count: number;
  userCount: number;
  assistantCount: number;
}

export interface SelectionSummary {
  totalMessagesInConv: number;
  totalSelected: number;
  userSelectedCount: number;
  assistantSelectedCount: number;
  percentageSelected: number;
  isAllSelected: boolean;
  isNoneSelected: boolean;
  effectiveDateRange?: {
    start: string;
    end: string;
  };
  contextMessagesAttachedCount: number;
  filteredMessages: UnifiedMessage[];
}
