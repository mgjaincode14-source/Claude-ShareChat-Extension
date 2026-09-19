'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UnifiedConversation, UnifiedMessage } from '../types';
import { 
  getAllConversations, 
  saveConversations, 
  deleteConversation, 
  clearAllConversations,
  getDatabaseStats 
} from '../db';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '../sampleData';
import { ConversationList } from './ConversationList';
import { ConversationViewer } from './ConversationViewer';
import { ImportModal } from './ImportModal';
import { RawJsonModal } from './RawJsonModal';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Database, Layers, Sparkles, MessageSquare, ListFilter } from 'lucide-react';

export const Phase1Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [rawJsonData, setRawJsonData] = useState<UnifiedConversation | UnifiedMessage | null>(null);
  const [isRawJsonOpen, setIsRawJsonOpen] = useState(false);
  const [stats, setStats] = useState({ conversationCount: 0, totalMessagesCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Track last processed bridge import to avoid resetting state every poll
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

  const loadDataFromDb = useCallback(async () => {
    setIsLoading(true);
    try {
      const latestBridgedId = await checkForBridgedImports();
      let data = await getAllConversations();
      
      // Auto populate sample conversations on first launch if empty
      if (data.length === 0) {
        await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
        data = await getAllConversations();
      }

      setConversations(data);
      if (latestBridgedId) {
        setSelectedId(latestBridgedId);
      } else if (data.length > 0) {
        setSelectedId((prev) => prev || data[0].id);
      }

      const currentStats = await getDatabaseStats();
      setStats(currentStats);
    } catch (err) {
      console.error('Database load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkForBridgedImports]);

  useEffect(() => {
    loadDataFromDb();
    // Auto-poll for new bridged imports every 3 seconds
    const interval = setInterval(async () => {
      const newId = await checkForBridgedImports();
      if (newId) {
        const updated = await getAllConversations();
        setConversations(updated);
        setSelectedId(newId);
        const currentStats = await getDatabaseStats();
        setStats(currentStats);
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (selectedId === id) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
    }
    const currentStats = await getDatabaseStats();
    setStats(currentStats);
  };

  const handleImportSuccess = async (imported: UnifiedConversation[]) => {
    await saveConversations(imported);
    await loadDataFromDb();
    if (imported.length > 0) {
      setSelectedId(imported[0].id);
    }
    setIsImportOpen(false);
  };

  const handleLoadSamples = async () => {
    await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
    await loadDataFromDb();
    if (SAMPLE_CLAUDE_CONVERSATIONS.length > 0) {
      setSelectedId(SAMPLE_CLAUDE_CONVERSATIONS[0].id);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all stored conversations from local storage?')) {
      await clearAllConversations();
      setConversations([]);
      setSelectedId(null);
      setStats({ conversationCount: 0, totalMessagesCount: 0 });
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const handleOpenRawJson = (msg?: UnifiedMessage) => {
    setRawJsonData(msg || selectedConversation);
    setIsRawJsonOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Banner Status Bar for Phase 1 */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-900/60 px-4 flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Phase 1 — Claude Data & Core Processing</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 ml-4">
            <span className="px-2.5 py-1 bg-amber-600 text-white font-medium rounded text-xs shadow-sm flex items-center space-x-1">
              <Layers className="w-3 h-3" />
              <span>Phase 1: Reader</span>
            </span>
            <Link
              href="/phase2"
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <ListFilter className="w-3 h-3" />
              <span>Phase 2: Selection</span>
            </Link>
            <Link
              href="/phase3"
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Phase 3: Export & Redaction</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-slate-400">
          <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-200">{stats.conversationCount}</span>
              <span className="text-[11px] text-slate-500">chats</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-200">{stats.totalMessagesCount}</span>
              <span className="text-[11px] text-slate-500">msgs</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Split View */}
      <div className="flex-1 flex overflow-hidden">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onOpenImport={() => setIsImportOpen(true)}
          onLoadSamples={handleLoadSamples}
          onClearAll={handleClearAll}
        />

        <ConversationViewer
          conversation={selectedConversation}
          onOpenRawJson={handleOpenRawJson}
        />
      </div>

      {/* Modals */}
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
