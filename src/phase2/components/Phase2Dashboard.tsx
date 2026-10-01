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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Navigation Header */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-900/80 px-4 flex items-center justify-between text-xs flex-shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
            <ListFilter className="w-3.5 h-3.5" />
            <span>Message Filter</span>
          </div>

          {/* Phase Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 ml-4">
            <Link
              href="/phase1"
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <Layers className="w-3 h-3" />
              <span>Conversation Reader</span>
            </Link>
            <span className="px-2.5 py-1 bg-amber-600 text-white font-medium rounded text-xs shadow-sm flex items-center space-x-1">
              <ListFilter className="w-3 h-3" />
              <span>Message Filter</span>
            </span>
            <Link
              href="/phase3"
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Privacy & Export</span>
            </Link>
            <Link
              href="/phase4"
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <Share2 className="w-3 h-3" />
              <span>Share Link Generator</span>
            </Link>
            <Link
              href="/phase5"
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <BarChart2 className="w-3 h-3" />
              <span>Analytics</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Timezone-Aware Local Filtering</span>
          </span>
        </div>
      </header>

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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
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
