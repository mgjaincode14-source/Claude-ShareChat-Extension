import { useCallback, useRef } from 'react';
import { UnifiedConversation } from '@/phase1/types';
import { saveConversations, getAllConversations } from '@/phase1/db';
import { writeSession } from '@/store/workflowSession';

export const BRIDGE_STORAGE_KEY = 'claude_sharechat_bridge_import';
export const LAST_SYNCED_KEY = 'claude_sharechat_last_synced_bridge_id';

export interface BridgeSyncResult {
  newId: string | null;
  updatedConversations: UnifiedConversation[];
}

/**
 * Checks all available bridge channels (sessionStorage, direct window message, and server endpoint)
 * for incoming conversation imports from the Claude ShareChat browser extension.
 * If new conversations are found, persists them to IndexedDB and updates the workflow session.
 */
export async function syncBridgedImports(
  lastProcessedIdRef?: React.MutableRefObject<string | null>
): Promise<BridgeSyncResult | null> {
  try {
    const lastSyncedId = typeof window !== 'undefined' ? window.sessionStorage.getItem(LAST_SYNCED_KEY) : null;

    // 1. Direct browser-level bridge (from extension content script via sessionStorage)
    if (typeof window !== 'undefined') {
      const storedPending = window.sessionStorage.getItem(BRIDGE_STORAGE_KEY);
      if (storedPending) {
        try {
          const parsed = JSON.parse(storedPending);
          const conv: UnifiedConversation = parsed.conversation || parsed;
          if (conv && conv.id && Array.isArray(conv.messages)) {
            window.sessionStorage.removeItem(BRIDGE_STORAGE_KEY);
            window.sessionStorage.setItem(LAST_SYNCED_KEY, conv.id);
            if (lastProcessedIdRef) lastProcessedIdRef.current = conv.id;
            await saveConversations([conv]);
            writeSession({ selectedConvId: conv.id });
            const all = await getAllConversations();
            return { newId: conv.id, updatedConversations: all };
          }
        } catch (e) {
          console.warn('[BridgeSync] Error parsing sessionStorage bridge payload:', e);
        }
      }
    }

    // 2. Server-side bridge endpoint (/api/bridge-import)
    const res = await fetch('/api/bridge-import', { cache: 'no-store' });
    if (!res.ok) return null;
    const bridgeData = await res.json();

    if (
      bridgeData.success &&
      bridgeData.lastImportId &&
      bridgeData.lastImportId !== lastSyncedId &&
      (!lastProcessedIdRef || bridgeData.lastImportId !== lastProcessedIdRef.current) &&
      Array.isArray(bridgeData.latestConversations) &&
      bridgeData.latestConversations.length > 0
    ) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(LAST_SYNCED_KEY, bridgeData.lastImportId);
      }
      if (lastProcessedIdRef) lastProcessedIdRef.current = bridgeData.lastImportId;
      await saveConversations(bridgeData.latestConversations);
      writeSession({ selectedConvId: bridgeData.lastImportId });
      const all = await getAllConversations();
      return { newId: bridgeData.lastImportId, updatedConversations: all };
    }
  } catch (err) {
    // Quietly ignore network/fetch errors during background sync
  }

  return null;
}
