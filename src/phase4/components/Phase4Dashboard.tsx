'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { UnifiedConversation } from '@/phase1/types';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '@/phase1/sampleData';
import { getAllConversations, saveConversations, deleteConversation, clearAllConversations } from '@/phase1/db';
import { syncBridgedImports } from '@/phase1/useBridgeSync';
import { ConversationList } from '@/phase1/components/ConversationList';
import { ImportModal } from '@/phase1/components/ImportModal';
import { SelectionOptions } from '@/phase2/types';
import { filterMessagesBySelection, getDateBoundaries, getSelectionSummary } from '@/phase2/engine';
import { SelectionSummaryBar } from '@/phase2/components/SelectionSummaryBar';
import { RedactionOptions } from '@/phase3/types';
import { applyRedactionToConversation, scanConversationPII, DetectedPIIEntity } from '@/phase3/redaction';
import { RedactionSummaryBar } from '@/phase3/components/RedactionSummaryBar';
import { SharedSnapshot } from '../types';
import { createSnapshotObject } from '../snapshotStore';
import {
  saveSnapshot,
  getAllSnapshots,
  deleteSnapshot
} from '@/store/snapshotDb';
import { readSession, writeSession } from '@/store/workflowSession';
import { ShareLinkGenerator } from './ShareLinkGenerator';
import { SnapshotManager } from './SnapshotManager';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { 
  Share2, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  ListFilter,
  Globe,
  BarChart2
} from 'lucide-react';

export const Phase4Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SharedSnapshot[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<SharedSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const lastProcessedBridgeIdRef = useRef<string | null>(null);

  // Phase 2 Selection Options
  const [selectionOptions, setSelectionOptions] = useState<SelectionOptions>({
    mode: 'all',
    selectedDate: '',
    startDate: '',
    endDate: '',
    selectedMessageIds: [],
    includePrecedingContext: true,
    contextDepth: 1
  });

  // Phase 3 Redaction Options
  const [redactionOptions, setRedactionOptions] = useState<RedactionOptions>({
    redactApiKeys: true,
    redactEmails: true,
    redactIpAddresses: true,
    redactPhoneNumbers: true,
    customKeywords: [],
    replacementStyle: 'label',
    anonymizeUser: false,
    userAlias: 'Anonymous User',
    anonymizeAssistant: false,
    assistantAlias: 'AI Assistant'
  });

  // PII entity cache — auto-populated via scanConversationPII (synchronous, client-side, zero network calls).
  // This mirrors what Phase 3 does when the user clicks "Scan for Secrets", ensuring that the
  // redaction stats visible in Phase 4 and baked into the snapshot are accurate.
  const [piiEntitiesCache, setPiiEntitiesCache] = useState<Record<string, Record<string, DetectedPIIEntity[]>>>({});

  const checkBridge = useCallback(async (): Promise<string | null> => {
    const result = await syncBridgedImports(lastProcessedBridgeIdRef);
    return result ? result.newId : null;
  }, []);

  // Load conversations & existing snapshots from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        const latestBridgedId = await checkBridge();
        let storedConvs = await getAllConversations();
        if (storedConvs.length === 0) {
          await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
          storedConvs = SAMPLE_CLAUDE_CONVERSATIONS;
        }
        setConversations(storedConvs);

        // Restore session state (priority: fresh bridge import > session store > first conv)
        const session = readSession();
        const restoredId = latestBridgedId || session.selectedConvId || (storedConvs[0]?.id ?? null);
        if (restoredId) {
          setSelectedId(restoredId);
          const conv = storedConvs.find((c) => c.id === restoredId);
          if (conv) {
            // Restore selection options from session if they match this conversation
            if (!latestBridgedId && session.selectedConvId === restoredId && session.selectionOptions) {
              setSelectionOptions(session.selectionOptions);
            } else {
              const bounds = getDateBoundaries(conv);
              setSelectionOptions((prev) => ({
                ...prev,
                mode: 'all',
                startDate: bounds.minDate,
                endDate: bounds.maxDate,
                selectedDate: bounds.maxDate,
                selectedMessageIds: conv.messages.map((m) => m.id)
              }));
            }
          }
        }
        if (session.redactionOptions) {
          setRedactionOptions(session.redactionOptions);
        }

        const storedSnaps = await getAllSnapshots();
        setSnapshots(storedSnaps);
      } catch (err) {
        console.error('Failed loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    const interval = setInterval(async () => {
      const newId = await checkBridge();
      if (newId) {
        const updated = await getAllConversations();
        setConversations(updated);
        setSelectedId(newId);
        const target = updated.find((c) => c.id === newId);
        if (target) {
          const bounds = getDateBoundaries(target);
          setSelectionOptions((prev) => ({
            ...prev,
            startDate: bounds.minDate,
            endDate: bounds.maxDate,
            selectedDate: bounds.maxDate,
            selectedMessageIds: target.messages.map((m) => m.id)
          }));
        }
      }
    }, 3000);

    const handleBridgeMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'CLAUDE_SHARECHAT_BRIDGE_IMPORT') {
        const newId = await checkBridge();
        if (newId) {
          const updated = await getAllConversations();
          setConversations(updated);
          setSelectedId(newId);
          const target = updated.find((c) => c.id === newId);
          if (target) {
            const bounds = getDateBoundaries(target);
            setSelectionOptions((prev) => ({
              ...prev,
              startDate: bounds.minDate,
              endDate: bounds.maxDate,
              selectedDate: bounds.maxDate,
              selectedMessageIds: target.messages.map((m) => m.id)
            }));
          }
        }
      }
    };
    window.addEventListener('message', handleBridgeMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleBridgeMessage);
    };
  }, [checkBridge]);

  const currentConversation = conversations.find((c) => c.id === selectedId) || null;

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    writeSession({ selectedConvId: id });
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      const bounds = getDateBoundaries(conv);
      const opts = {
        ...selectionOptions,
        startDate: bounds.minDate,
        endDate: bounds.maxDate,
        selectedDate: bounds.maxDate,
        selectedMessageIds: conv.messages.map((m) => m.id)
      };
      setSelectionOptions(opts);
      writeSession({ selectionOptions: opts });
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (selectedId === id) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all stored conversations?')) {
      await clearAllConversations();
      setConversations([]);
      setSelectedId(null);
    }
  };

  const handleLoadSamples = async () => {
    await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
    setConversations(SAMPLE_CLAUDE_CONVERSATIONS);
    if (SAMPLE_CLAUDE_CONVERSATIONS.length > 0) {
      handleSelectConversation(SAMPLE_CLAUDE_CONVERSATIONS[0].id);
    }
  };

  const handleSelectAll = () => {
    if (!currentConversation) return;
    setSelectionOptions((prev) => ({
      ...prev,
      mode: 'individual',
      selectedMessageIds: currentConversation.messages.map((m) => m.id)
    }));
  };

  const handleDeselectAll = () => {
    setSelectionOptions((prev) => ({
      ...prev,
      mode: 'individual',
      selectedMessageIds: []
    }));
  };

  const handleInvertSelection = () => {
    if (!currentConversation) return;
    setSelectionOptions((prev) => {
      const currentSet = new Set(
        prev.mode === 'individual'
          ? prev.selectedMessageIds
          : filterMessagesBySelection(currentConversation, prev).map((m) => m.id)
      );

      const inverted = currentConversation.messages
        .map((m) => m.id)
        .filter((id) => !currentSet.has(id));

      return {
        ...prev,
        mode: 'individual',
        selectedMessageIds: inverted
      };
    });
  };

  // Filter messages via Phase 2 Engine & apply Phase 3 Redactions
  const baseSelectedMessages = currentConversation
    ? filterMessagesBySelection(currentConversation, selectionOptions)
    : [];

  const selectionSummary = currentConversation
    ? getSelectionSummary(currentConversation, selectionOptions)
    : null;

  // Auto-run PII scan whenever the selected messages change (synchronous, 100% client-side, <5ms).
  // This ensures Phase 4 uses the same redaction entities as Phase 3's "Scan for Secrets" button,
  // so the redaction stats in the snapshot are correct and not shown as "zero secrets detected".
  const currentConvId = currentConversation?.id ?? null;
  const currentPiiEntities = currentConvId ? (piiEntitiesCache[currentConvId] ?? null) : null;

  useEffect(() => {
    if (!currentConversation || baseSelectedMessages.length === 0) return;
    const entities = scanConversationPII(
      baseSelectedMessages.map((m) => ({ id: m.id, content: m.content })),
      {
        detectApiKeys: redactionOptions.redactApiKeys,
        detectEmails: redactionOptions.redactEmails,
        detectIpAddresses: redactionOptions.redactIpAddresses,
        detectPhoneNumbers: redactionOptions.redactPhoneNumbers
      }
    );
    setPiiEntitiesCache((prev) => ({ ...prev, [currentConversation.id]: entities }));
  // Intentionally only re-runs when conversation or redaction settings change.
  // baseSelectedMessages changes every render; use the conversation id + options as the stable dep.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConvId, redactionOptions, selectionOptions]);

  const { sanitizedConversation, sanitizedMessages, totalStats } = currentConversation
    ? applyRedactionToConversation(currentConversation, baseSelectedMessages, redactionOptions, currentPiiEntities ?? undefined)
    : {
        sanitizedConversation: null,
        sanitizedMessages: [],
        totalStats: {
          apiKeysCount: 0,
          emailsCount: 0,
          ipsCount: 0,
          phoneNumbersCount: 0,
          keywordsCount: 0,
          totalRedacted: 0
        }
      };

  // Phase 4 Snapshot Generator Action
  const handleGenerateShareLink = async (customOptions: {
    customSlug?: string;
    watermarkText?: string;
    passcode?: string;
    expiresAt?: string;
  }): Promise<SharedSnapshot | null> => {
    if (!sanitizedConversation || !sanitizedMessages) return null;

    const { minDate: convStart, maxDate: convEnd } = getDateBoundaries(sanitizedConversation);
    const snap = createSnapshotObject(
      sanitizedConversation,
      sanitizedMessages,
      totalStats,
      customOptions,
      { start: convStart, end: convEnd }
    );

    // Save locally to IndexedDB
    await saveSnapshot(snap);

    // Post to server API `/api/share` for HTTP persistence
    try {
      await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap)
      });
    } catch (err) {
      console.warn('API share post warning:', err);
    }

    const updatedSnaps = await getAllSnapshots();
    setSnapshots(updatedSnaps);
    setActiveSnapshot(snap);
    return snap;
  };

  const handleDeleteSnapshot = async (id: string) => {
    // 1. Delete locally from browser IndexedDB
    const snap = snapshots.find((s) => s.id === id);
    await deleteSnapshot(id);
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    if (activeSnapshot?.id === id) setActiveSnapshot(null);

    // 2. Delete remotely from Supabase cloud table
    // If the snapshot has a deletionToken, include it so the server
    // can verify cross-device revocation requests.
    try {
      const token = snap?.metadata?.deletionToken;
      const url = token
        ? `/api/share?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`
        : `/api/share?id=${encodeURIComponent(id)}`;
      await fetch(url, { method: 'DELETE' });
      console.log('[Phase4] Snapshot deleted from Supabase:', id);
    } catch (err) {
      console.warn('[Phase4] Failed to delete snapshot from server:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#f3f2ec] flex items-center justify-center text-[#716f68]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#141416] animate-spin" />
          <span>Loading Share & Publish...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f3f2ec] text-[#141416] font-sans overflow-hidden">
      {/* Keystone Unified Header */}
      <UnifiedHeader
        currentPhase={4}
        title="Share Link Generator"
        subtitle={`${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''} published · Secure cloud sharing`}
        rightAction={
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-[#e5e2d8] text-xs text-[#141416] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#141416] animate-keystone-pulse" />
            <span>Shared Snapshots</span>
          </div>
        }
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onOpenImport={() => setIsImportOpen(true)}
          onLoadSamples={handleLoadSamples}
          onClearAll={handleClearAll}
        />

        {/* Main Work Area */}
        {currentConversation ? (
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 bg-[#f3f2ec]">
            {/* Selection Summary Bar */}
            {selectionSummary && (
              <SelectionSummaryBar
                options={selectionOptions}
                summary={selectionSummary}
                adjustHref="/phase2"
              />
            )}

            {/* Phase 3 Redaction Summary */}
            <RedactionSummaryBar
              options={redactionOptions}
              stats={totalStats}
              adjustHref="/phase3"
            />

            {/* Phase 4 Share Link Generator */}
            <ShareLinkGenerator
              onGenerateShareLink={handleGenerateShareLink}
              activeSnapshot={activeSnapshot}
            />

            {/* Phase 4 Active Web Snapshots List */}
            <SnapshotManager
              snapshots={snapshots}
              onDeleteSnapshot={handleDeleteSnapshot}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#716f68] space-y-4">
            <Layers className="w-12 h-12 text-[#9ca3af]" />
            <p className="text-sm">Select a conversation from the sidebar to generate public web share links.</p>
            <button
              onClick={handleLoadSamples}
              className="px-4 py-2 bg-[#141416] hover:bg-[#27272a] text-white rounded-full text-xs font-medium transition-colors"
            >
              Load Demo Data
            </button>
          </div>
        )}
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={async (imported) => {
          await saveConversations(imported);
          const stored = await getAllConversations();
          setConversations(stored);
          if (imported.length > 0) {
            handleSelectConversation(imported[0].id);
          }
          setIsImportOpen(false);
        }}
      />
    </div>
  );
};
