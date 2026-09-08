'use client';

import React, { useEffect, useState } from 'react';
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
import { CheckCircle2, ShieldCheck, Database, Layers, Sparkles, MessageSquare } from 'lucide-react';

export const Phase1Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [rawJsonData, setRawJsonData] = useState<UnifiedConversation | UnifiedMessage | null>(null);
  const [isRawJsonOpen, setIsRawJsonOpen] = useState(false);
  const [stats, setStats] = useState({ conversationCount: 0, totalMessagesCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadDataFromDb = async () => {
    setIsLoading(true);
    try {
      let data = await getAllConversations();
      
      // Auto populate sample conversations on first launch if empty
      if (data.length === 0) {
        await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
        data = await getAllConversations();
      }

      setConversations(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }

      const currentStats = await getDatabaseStats();
      setStats(currentStats);
    } catch (err) {
      console.error('Database load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromDb();
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
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Local Offline IndexedDB Storage</span>
          </span>
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
