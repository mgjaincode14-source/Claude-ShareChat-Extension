/**
 * workflowSession.ts
 * ------------------
 * A thin localStorage-backed session store that persists the user's workflow
 * state (selected conversation + Phase 2 filters + Phase 3 redaction options)
 * across phase navigations.
 *
 * Any phase can call:
 *   readSession()   – on mount, to restore state
 *   writeSession()  – whenever state changes, to save for the next phase
 */

import { SelectionOptions } from '@/phase2/types';
import { RedactionOptions } from '@/phase3/types';

const SESSION_KEY = 'claude_sharechat_workflow_session';

export interface WorkflowSession {
  /** ID of the currently selected conversation */
  selectedConvId: string | null;

  /** Phase 2 date / message filters */
  selectionOptions: SelectionOptions;

  /** Phase 3 redaction settings */
  redactionOptions: RedactionOptions;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SELECTION_OPTIONS: SelectionOptions = {
  mode: 'all',
  selectedDate: '',
  startDate: '',
  endDate: '',
  selectedMessageIds: [],
  includePrecedingContext: true,
  contextDepth: 1,
};

export const DEFAULT_REDACTION_OPTIONS: RedactionOptions = {
  redactApiKeys: true,
  redactEmails: true,
  redactIpAddresses: true,
  redactPhoneNumbers: true,
  customKeywords: [],
  replacementStyle: 'label',
  anonymizeUser: false,
  userAlias: 'Anonymous User',
  anonymizeAssistant: false,
  assistantAlias: 'AI Assistant',
};

const DEFAULT_SESSION: WorkflowSession = {
  selectedConvId: null,
  selectionOptions: DEFAULT_SELECTION_OPTIONS,
  redactionOptions: DEFAULT_REDACTION_OPTIONS,
};

// ── API ───────────────────────────────────────────────────────────────────────

/** Read the current session from localStorage. Returns defaults if nothing stored. */
export function readSession(): WorkflowSession {
  if (typeof window === 'undefined') return DEFAULT_SESSION;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { ...DEFAULT_SESSION };
    const parsed = JSON.parse(raw) as Partial<WorkflowSession>;
    return {
      selectedConvId: parsed.selectedConvId ?? null,
      selectionOptions: {
        ...DEFAULT_SELECTION_OPTIONS,
        ...(parsed.selectionOptions ?? {}),
      },
      redactionOptions: {
        ...DEFAULT_REDACTION_OPTIONS,
        ...(parsed.redactionOptions ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SESSION };
  }
}

/** Write (merge) partial session updates to localStorage. */
export function writeSession(updates: Partial<WorkflowSession>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readSession();
    const next: WorkflowSession = {
      ...current,
      ...updates,
      selectionOptions: {
        ...current.selectionOptions,
        ...(updates.selectionOptions ?? {}),
      },
      redactionOptions: {
        ...current.redactionOptions,
        ...(updates.redactionOptions ?? {}),
      },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, quota exceeded) — fail silently
  }
}

/** Clear the session (e.g. when user clears all conversations). */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}
