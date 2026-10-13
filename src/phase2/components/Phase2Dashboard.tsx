'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { UnifiedConversation, UnifiedMessage } from '@/phase1/types';
import { getAllConversations, saveConversations } from '@/phase1/db';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '@/phase1/sampleData';
import { ConversationList } from '@/phase1/components/ConversationList';
import { RawJsonModal } from '@/phase1/components/RawJsonModal';
import { ImportModal } from '@/phase1/components/ImportModal';
import { SelectionOptions, SelectionSummary } from '../types';
import { getSelectionSummary, getDateBoundaries, filterMessagesBySelection } from '../engine';
import { SelectionToolbar } from './SelectionToolbar';
import { SelectionSummaryPanel } from './SelectionSummaryPanel';
import { SelectiveMessageViewer } from './SelectiveMessageViewer';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { 
  CheckCircle2, 
  Layers, 
  ListFilter, 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck,
  Eye,
  BarChart2,
  Share2
} from 'lucide-react';
import { readSession, writeSession } from '@/store/workflowSession';

export const Phase2Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rawJsonData, setRawJsonData] = useState<UnifiedConversation | UnifiedMessage | null>(null);
  const [isRawJsonOpen, setIsRawJsonOpen] = useState(false);

  const [selectionOptions, setSelectionOptions] = useState<SelectionOptions>({
    mode: 'all',
    selectedMessageIds: [],
    includePrecedingContext: true,
    contextDepth: 1
  });

  // Track last processed bridge import ID to avoid resetting state on every poll
  const lastProcessedBridgeIdRef = useRef<string | null>(null);

  const checkForBridgedImports = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/bridge-import');
      const bridgeData = await res.json();
      if (
        bridgeData.success &&
        bridgeData.lastImportId &&
        bridgeData.lastImportId !== lastProcessedBridgeIdRef.current &&
        bridgeData.latestConversations &&
        bridgeData.latestConversations.length > 0
      ) {
        await saveConversations(bridgeData.latestConversations);
        lastProcessedBridgeIdRef.current = bridgeData.lastImportId;
        return bridgeData.lastImportId;
      }
    } catch (err) {
      console.warn('Bridge sync error:', err);
    }
    return null;
  }, []);

  const loadData = useCallback(async () => {
    const latestBridgedId = await checkForBridgedImports();
    let data = await getAllConversations();
    if (data.length === 0) {
      await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
      data = await getAllConversations();
    }
    setConversations(data);

    // Restore session — priority: fresh bridge import > session store > first conv
    const session = readSession();
    const restoredId = latestBridgedId || session.selectedConvId || (data[0]?.id ?? null);

    if (restoredId) {
      setSelectedId(restoredId);
      const target = data.find((c) => c.id === restoredId);
      if (target) {
        const { minDate, maxDate } = getDateBoundaries(target);
        // If session has meaningful filter options, restore them; otherwise use defaults
        const restoredOpts = session.selectionOptions?.selectedMessageIds?.length
          ? session.selectionOptions
          : {
              mode: 'all' as const,
              startDate: minDate,
              endDate: maxDate,
              selectedDate: minDate,
              selectedMessageIds: target.messages.map((m) => m.id),
              includePrecedingContext: true,
              contextDepth: 1,
            };
        setSelectionOptions(restoredOpts);
      }
    }
  }, [checkForBridgedImports]);

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      const newId = await checkForBridgedImports();
      if (newId) {
        const updated = await getAllConversations();
        setConversations(updated);
        setSelectedId(newId);
        const target = updated.find((c) => c.id === newId);
        if (target) {
          const { minDate, maxDate } = getDateBoundaries(target);
          setSelectionOptions((prev) => ({
            ...prev,
            startDate: minDate,
            endDate: maxDate,
            selectedDate: minDate,
            selectedMessageIds: target.messages.map((m) => m.id)
          }));
        }
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentConversation = conversations.find((c) => c.id === selectedId) || null;

  // When switching conversations, reset selected IDs and sync date bounds
  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    writeSession({ selectedConvId: id });
    const target = conversations.find((c) => c.id === id);
    if (target) {
      const { minDate, maxDate } = getDateBoundaries(target);
      const opts = {
        mode: 'all' as const,
        startDate: minDate,
        endDate: maxDate,
        selectedDate: minDate,
        selectedMessageIds: target.messages.map((m) => m.id),
        includePrecedingContext: true,
        contextDepth: 1
      };
      setSelectionOptions(opts);
      writeSession({ selectionOptions: opts });
    }
  };

  const handleToggleMessageId = (messageId: string) => {
    if (!currentConversation) return;

    // Switch to 'individual' mode if user manually toggles a checkbox
    setSelectionOptions((prev) => {
      const currentIds = new Set(
        prev.mode === 'individual'
          ? prev.selectedMessageIds
          : filterMessagesBySelection(currentConversation, prev).map((m) => m.id)
      );

      if (currentIds.has(messageId)) {
        currentIds.delete(messageId);
      } else {
        currentIds.add(messageId);
      }

      return {
        ...prev,
        mode: 'individual',
        selectedMessageIds: Array.from(currentIds)
      };
    });
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
      const currentIds = new Set(
        prev.mode === 'individual'
          ? prev.selectedMessageIds
          : filterMessagesBySelection(currentConversation, prev).map((m) => m.id)
      );

      const inverted = currentConversation.messages
        .map((m) => m.id)
        .filter((id) => !currentIds.has(id));

      return {
        ...prev,
        mode: 'individual',
        selectedMessageIds: inverted
      };
    });
  };

  const [isImportOpen, setIsImportOpen] = useState(false);

  // Write selectionOptions to session whenever they change
  useEffect(() => {
    writeSession({ selectionOptions });
  }, [selectionOptions]);

  const handleImportSuccess = async (imported: UnifiedConversation[]) => {
    await saveConversations(imported);
    const data = await getAllConversations();
    setConversations(data);
    if (imported.length > 0) {
      handleSelectConversation(imported[0].id);
    }
    setIsImportOpen(false);
  };

  const summary: SelectionSummary = getSelectionSummary(currentConversation, selectionOptions);

  return (
    <div className="flex flex-col h-screen bg-[#f3f2ec] text-[#141416] font-sans overflow-hidden">
      {/* Keystone Unified Header */}
      <UnifiedHeader
        currentPhase={2}
        title="Message Selection Filter"
        subtitle={
          currentConversation
            ? `${summary.totalSelected} of ${summary.totalMessagesInConv} messages selected`
            : 'Select messages to share or export'
        }
        rightAction={
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#ffffff] border border-[#e5e2d8] text-xs text-[#716f68] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[#141416] font-medium">Local Timezone Filtering</span>
          </div>
        }
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onDelete={async (id) => {
            const updated = conversations.filter((c) => c.id !== id);
            setConversations(updated);
            if (selectedId === id) setSelectedId(updated.length > 0 ? updated[0].id : null);
          }}
          onOpenImport={() => setIsImportOpen(true)}
          onLoadSamples={async () => {
            setConversations(SAMPLE_CLAUDE_CONVERSATIONS);
            if (SAMPLE_CLAUDE_CONVERSATIONS.length > 0) setSelectedId(SAMPLE_CLAUDE_CONVERSATIONS[0].id);
          }}
          onClearAll={() => setConversations([])}
        />

        {/* Selective View & Control Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f2ec]">
          <SelectionToolbar
            conversation={currentConversation}
            options={selectionOptions}
            onChangeOptions={setSelectionOptions}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onInvertSelection={handleInvertSelection}
          />

          <SelectionSummaryPanel summary={summary} />

          <SelectiveMessageViewer
            conversation={currentConversation}
            options={selectionOptions}
            onToggleMessageId={handleToggleMessageId}
            onOpenRawJson={(msg) => {
              setRawJsonData(msg || currentConversation);
              setIsRawJsonOpen(true);
            }}
          />
        </div>
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <RawJsonModal
        isOpen={isRawJsonOpen}
        onClose={() => setIsRawJsonOpen(false)}
        data={rawJsonData}
      />
    </div>
  );
};
