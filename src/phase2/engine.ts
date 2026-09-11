import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { SelectionOptions, DateSummary, SelectionSummary } from './types';

/**
 * Returns list of distinct dates present in conversation with counts
 */
export function getAvailableDates(conversation: UnifiedConversation): DateSummary[] {
  if (!conversation || !conversation.messages) return [];

  const map = new Map<string, { total: number; user: number; assistant: number }>();

  for (const msg of conversation.messages) {
    const d = msg.dateString || 'Unknown Date';
    const current = map.get(d) || { total: 0, user: 0, assistant: 0 };
    current.total += 1;
    if (msg.sender === 'user') current.user += 1;
    if (msg.sender === 'assistant') current.assistant += 1;
    map.set(d, current);
  }

  const result: DateSummary[] = [];
  map.forEach((value, dateString) => {
    result.push({
      dateString,
      count: value.total,
      userCount: value.user,
      assistantCount: value.assistant
    });
  });

  // Sort dates chronologically
  result.sort((a, b) => a.dateString.localeCompare(b.dateString));
  return result;
}

/**
 * Gets earliest and latest dates in conversation
 */
export function getDateBoundaries(conversation: UnifiedConversation): { minDate: string; maxDate: string } {
  const dates = getAvailableDates(conversation);
  if (dates.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    return { minDate: today, maxDate: today };
  }
  return {
    minDate: dates[0].dateString,
    maxDate: dates[dates.length - 1].dateString
  };
}

/**
 * Core filtering function according to SelectionOptions
 */
export function filterMessagesBySelection(
  conversation: UnifiedConversation,
  options: SelectionOptions
): UnifiedMessage[] {
  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return [];
  }

  let selected: UnifiedMessage[] = [];

  switch (options.mode) {
    case 'all':
      selected = [...conversation.messages];
      break;

    case 'specific_date': {
      const targetDate = options.selectedDate;
      if (!targetDate) {
        selected = [...conversation.messages];
      } else {
        selected = conversation.messages.filter((m) => m.dateString === targetDate);
      }
      break;
    }

    case 'date_range': {
      const start = options.startDate;
      const end = options.endDate;

      selected = conversation.messages.filter((m) => {
        if (!m.dateString) return false;
        if (start && m.dateString < start) return false;
        if (end && m.dateString > end) return false;
        return true;
      });
      break;
    }

    case 'individual': {
      const idSet = new Set(options.selectedMessageIds || []);
      selected = conversation.messages.filter((m) => idSet.has(m.id));
      break;
    }

    default:
      selected = [...conversation.messages];
  }

  // Preceding context auto-linker if enabled
  if (options.includePrecedingContext && selected.length > 0) {
    selected = attachPrecedingContext(conversation.messages, selected, options.contextDepth || 1);
  }

  return selected;
}

/**
 * Attaches preceding user prompt context for assistant responses if missing
 */
export function attachPrecedingContext(
  allMessages: UnifiedMessage[],
  selectedMessages: UnifiedMessage[],
  depth: number = 1
): UnifiedMessage[] {
  const selectedIds = new Set(selectedMessages.map((m) => m.id));
  const resultIds = new Set(selectedIds);

  const messageIndexMap = new Map<string, number>();
  allMessages.forEach((m, idx) => messageIndexMap.set(m.id, idx));

  for (const msg of selectedMessages) {
    if (msg.sender === 'assistant') {
      const currIdx = messageIndexMap.get(msg.id);
      if (currIdx !== undefined && currIdx > 0) {
        // Look back for depth steps to find preceding prompt
        for (let i = 1; i <= depth; i++) {
          const prevIdx = currIdx - i;
          if (prevIdx >= 0) {
            const prevMsg = allMessages[prevIdx];
            resultIds.add(prevMsg.id);
          }
        }
      }
    }
  }

  // Return full list in original chronological order
  return allMessages.filter((m) => resultIds.has(m.id));
}

/**
 * Computes complete SelectionSummary metrics
 */
export function getSelectionSummary(
  conversation: UnifiedConversation | null,
  options: SelectionOptions
): SelectionSummary {
  if (!conversation || !conversation.messages) {
    return {
      totalMessagesInConv: 0,
      totalSelected: 0,
      userSelectedCount: 0,
      assistantSelectedCount: 0,
      percentageSelected: 0,
      isAllSelected: false,
      isNoneSelected: true,
      contextMessagesAttachedCount: 0,
      filteredMessages: []
    };
  }

  const baseFiltered = filterMessagesBySelection(conversation, {
    ...options,
    includePrecedingContext: false
  });

  const finalFiltered = filterMessagesBySelection(conversation, options);

  const contextAttachedCount = finalFiltered.length - baseFiltered.length;
  const totalInConv = conversation.messages.length;
  const totalSelected = finalFiltered.length;

  let userCount = 0;
  let assistantCount = 0;
  finalFiltered.forEach((m) => {
    if (m.sender === 'user') userCount++;
    if (m.sender === 'assistant') assistantCount++;
  });

  const dates = finalFiltered.map((m) => m.dateString).filter(Boolean);
  dates.sort();

  return {
    totalMessagesInConv: totalInConv,
    totalSelected,
    userSelectedCount: userCount,
    assistantSelectedCount: assistantCount,
    percentageSelected: totalInConv > 0 ? Math.round((totalSelected / totalInConv) * 100) : 0,
    isAllSelected: totalSelected === totalInConv,
    isNoneSelected: totalSelected === 0,
    effectiveDateRange:
      dates.length > 0
        ? { start: dates[0], end: dates[dates.length - 1] }
        : undefined,
    contextMessagesAttachedCount: contextAttachedCount,
    filteredMessages: finalFiltered
  };
}
