'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UnifiedConversation } from '@/phase1/types';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '@/phase1/sampleData';
import { getAllConversations, saveConversations, deleteConversation, clearAllConversations } from '@/phase1/db';
import { ConversationList } from '@/phase1/components/ConversationList';
import { ImportModal } from '@/phase1/components/ImportModal';
import { SelectionOptions } from '@/phase2/types';
import { filterMessagesBySelection, getDateBoundaries } from '@/phase2/engine';
import { SelectionToolbar } from '@/phase2/components/SelectionToolbar';
import { RedactionOptions, ExportOptions } from '../types';
import { applyRedactionToConversation } from '../redaction';
import { 
  generateMarkdownExport, 
  generateJsonExport, 
  generateHtmlExport, 
  generateTextExport, 
  downloadFile 
} from '../exportEngine';
import { RedactionControlPanel } from './RedactionControlPanel';
import { ExportOptionsToolbar } from './ExportOptionsToolbar';
import { ExportPreviewer } from './ExportPreviewer';
import { 
  ShieldCheck, 
  Sparkles, 
  Layers
} from 'lucide-react';

export const Phase3Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

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

  // Phase 3 Export Options
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeMetadataHeader: true,
    includeTimestamp: true,
    watermarkText: 'Shared via Claude Selective Share'
  });

  // Load conversations from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        let stored = await getAllConversations();
        if (stored.length === 0) {
          await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
          stored = SAMPLE_CLAUDE_CONVERSATIONS;
        }
        setConversations(stored);
        if (stored.length > 0) {
          setSelectedId(stored[0].id);
          const bounds = getDateBoundaries(stored[0]);
          setSelectionOptions((prev) => ({
            ...prev,
            startDate: bounds.minDate,
            endDate: bounds.maxDate,
            selectedDate: bounds.maxDate,
            selectedMessageIds: stored[0].messages.map((m) => m.id)
          }));
        }
      } catch (err) {
        console.error('Failed loading conversations:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const currentConversation = conversations.find((c) => c.id === selectedId) || null;

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      const bounds = getDateBoundaries(conv);
      setSelectionOptions((prev) => ({
        ...prev,
        startDate: bounds.minDate,
        endDate: bounds.maxDate,
        selectedDate: bounds.maxDate,
        selectedMessageIds: conv.messages.map((m) => m.id)
      }));
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

  // Compute selected messages via Phase 2 Engine
  const baseSelectedMessages = currentConversation
    ? filterMessagesBySelection(currentConversation, selectionOptions)
    : [];

  // Apply Phase 3 Redaction
  const { sanitizedConversation, sanitizedMessages, totalStats } = currentConversation
    ? applyRedactionToConversation(currentConversation, baseSelectedMessages, redactionOptions)
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

  // Generate output content based on chosen format
  let exportedContent = '';
  if (sanitizedConversation && sanitizedMessages) {
    switch (exportOptions.format) {
      case 'markdown':
        exportedContent = generateMarkdownExport(sanitizedConversation, sanitizedMessages, exportOptions, redactionOptions);
        break;
      case 'json':
        exportedContent = generateJsonExport(sanitizedConversation, sanitizedMessages, exportOptions, redactionOptions);
        break;
      case 'html':
        exportedContent = generateHtmlExport(sanitizedConversation, sanitizedMessages, exportOptions, redactionOptions);
        break;
      case 'text':
        exportedContent = generateTextExport(sanitizedConversation, sanitizedMessages, exportOptions, redactionOptions);
        break;
    }
  }

  const handleDownload = () => {
    if (!sanitizedConversation || !exportedContent) return;
    const cleanTitle = sanitizedConversation.title.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
    const extMap: Record<string, { ext: string; mime: string }> = {
      markdown: { ext: 'md', mime: 'text/markdown' },
      json: { ext: 'json', mime: 'application/json' },
      html: { ext: 'html', mime: 'text/html' },
      text: { ext: 'txt', mime: 'text/plain' }
    };
    const target = extMap[exportOptions.format] || { ext: 'txt', mime: 'text/plain' };
    downloadFile(exportedContent, `${cleanTitle}_shared.${target.ext}`, target.mime);
  };

  const handleCopy = () => {
    if (exportedContent) {
      navigator.clipboard.writeText(exportedContent);
    }
  };

  const handleOpenHtmlTab = () => {
    if (!exportedContent) return;
    const blob = new Blob([exportedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
          <span>Loading Phase 3 Export & Redaction Suite...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between backdrop-blur-md select-none z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/30">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 leading-tight">
              Claude Selective Share — Phase 3
            </h1>
            <p className="text-[11px] text-slate-400">Export, Privacy Sanitization & Redaction Engine</p>
          </div>
        </div>

        {/* Phase Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <Link
            href="/phase1"
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
          >
            <span>Phase 1: Import</span>
          </Link>
          <Link
            href="/phase2"
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
          >
            <span>Phase 2: Selection</span>
          </Link>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium shadow-sm flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
            <span>Phase 3: Export & Redaction</span>
          </span>
        </div>
      </header>

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
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950">
            {/* Phase 2 Filter Toolbar */}
            <SelectionToolbar
              conversation={currentConversation}
              options={selectionOptions}
              onChangeOptions={setSelectionOptions}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onInvertSelection={handleInvertSelection}
            />

            {/* Phase 3 Redaction Panel */}
            <RedactionControlPanel
              options={redactionOptions}
              onChangeOptions={setRedactionOptions}
              stats={totalStats}
            />

            {/* Phase 3 Export Toolbar */}
            <ExportOptionsToolbar
              options={exportOptions}
              onChangeOptions={setExportOptions}
              onDownload={handleDownload}
              onCopy={handleCopy}
              onOpenHtmlTab={handleOpenHtmlTab}
            />

            {/* Live Export Previewer */}
            <ExportPreviewer
              exportedContent={exportedContent}
              format={exportOptions.format}
              title={currentConversation.title}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
            <Layers className="w-12 h-12 text-slate-700" />
            <p className="text-sm">Select a conversation from the sidebar to begin exporting & redacting.</p>
            <button
              onClick={handleLoadSamples}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition-colors"
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
