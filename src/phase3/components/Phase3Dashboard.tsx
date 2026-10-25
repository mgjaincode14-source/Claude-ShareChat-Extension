'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UnifiedConversation } from '@/phase1/types';
import { SAMPLE_CLAUDE_CONVERSATIONS } from '@/phase1/sampleData';
import { getAllConversations, saveConversations, deleteConversation, clearAllConversations } from '@/phase1/db';
import { ConversationList } from '@/phase1/components/ConversationList';
import { ImportModal } from '@/phase1/components/ImportModal';
import { SelectionOptions } from '@/phase2/types';
import { filterMessagesBySelection, getDateBoundaries, getSelectionSummary } from '@/phase2/engine';
import { SelectionSummaryBar } from '@/phase2/components/SelectionSummaryBar';
import { RedactionOptions, ExportOptions } from '../types';
import { applyRedactionToConversation, DetectedPIIEntity, scanConversationPII } from '../redaction';
import { 
  generateMarkdownExport, 
  generateJsonExport, 
  generateHtmlExport, 
  generateTextExport, 
  generateClaudeChatExport,
  downloadFile 
} from '../exportEngine';
import { RedactionControlPanel } from './RedactionControlPanel';
import { ExportOptionsToolbar } from './ExportOptionsToolbar';
import { ExportPreviewer } from './ExportPreviewer';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { 
  ShieldCheck, 
  Sparkles, 
  Layers,
  ListFilter,
  Share2,
  BarChart2
} from 'lucide-react';
import { readSession, writeSession } from '@/store/workflowSession';

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
    format: 'claude-chat',
    includeMetadataHeader: true,
    includeTimestamp: true,
    watermarkText: 'Shared via Claude Selective Share',
    includeSandboxSteps: false
  });

  // Load conversations and restore session state
  useEffect(() => {
    async function loadData() {
      try {
        let stored = await getAllConversations();
        if (stored.length === 0) {
          await saveConversations(SAMPLE_CLAUDE_CONVERSATIONS);
          stored = SAMPLE_CLAUDE_CONVERSATIONS;
        }
        setConversations(stored);

        // Restore from session
        const session = readSession();
        const restoredId = session.selectedConvId || stored[0]?.id || null;
        if (restoredId) {
          setSelectedId(restoredId);
          const conv = stored.find((c) => c.id === restoredId);
          if (conv) {
            // Restore selection options from session if they have content
            if (session.selectionOptions?.selectedMessageIds?.length) {
              setSelectionOptions(session.selectionOptions);
            } else {
              const bounds = getDateBoundaries(conv);
              setSelectionOptions((prev) => ({
                ...prev,
                startDate: bounds.minDate,
                endDate: bounds.maxDate,
                selectedDate: bounds.maxDate,
                selectedMessageIds: conv.messages.map((m) => m.id)
              }));
            }
          }
        }
        // Restore redaction options from session
        if (session.redactionOptions) {
          setRedactionOptions(session.redactionOptions);
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

  // Write redactionOptions to session whenever they change
  useEffect(() => {
    writeSession({ redactionOptions });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redactionOptions]);

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

  // Per-conversation AI PII detection cache: convId -> { msgId: DetectedPIIEntity[] }
  const [detectedEntitiesCache, setDetectedEntitiesCache] = useState<Record<string, Record<string, DetectedPIIEntity[]>>>({});
  const [isScanningPII, setIsScanningPII] = useState(false);

  const currentDetectedEntities = currentConversation ? detectedEntitiesCache[currentConversation.id] || null : null;
  const hasScannedPII = Boolean(currentDetectedEntities && Object.keys(currentDetectedEntities).length > 0);

  // On-demand client-side PII scan — runs synchronously in the browser,
  // zero network calls, zero rate limits, 100% private.
  const handleScanPIIWithAI = () => {
    if (!currentConversation || currentConversation.messages.length === 0) return;
    setIsScanningPII(true);
    try {
      console.log(`[Phase3Dashboard] Client-side PII scan for ${currentConversation.messages.length} messages in chat: ${currentConversation.id}`);
      const results = scanConversationPII(
        currentConversation.messages.map((m) => ({ id: m.id, content: m.content })),
        {
          detectApiKeys: redactionOptions.redactApiKeys,
          detectEmails: redactionOptions.redactEmails,
          detectIpAddresses: redactionOptions.redactIpAddresses,
          detectPhoneNumbers: redactionOptions.redactPhoneNumbers
        }
      );
      setDetectedEntitiesCache((prev) => ({
        ...prev,
        [currentConversation.id]: results
      }));
      console.log('[Phase3Dashboard] ✅ Client-side PII scan complete for', Object.keys(results).length, 'messages with entities');
    } catch (err) {
      console.warn('[Phase3Dashboard] Client-side PII scan error:', err);
    } finally {
      setIsScanningPII(false);
    }
  };

  // Compute selected messages via Phase 2 Engine
  const baseSelectedMessages = currentConversation
    ? filterMessagesBySelection(currentConversation, selectionOptions)
    : [];

  const selectionSummary = currentConversation
    ? getSelectionSummary(currentConversation, selectionOptions)
    : null;

  // Apply Phase 3 Redaction with AI-detected entities
  const { sanitizedConversation, sanitizedMessages, totalStats } = currentConversation
    ? applyRedactionToConversation(currentConversation, baseSelectedMessages, redactionOptions, currentDetectedEntities || undefined)
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
      case 'claude-chat':
        exportedContent = generateClaudeChatExport(sanitizedConversation, sanitizedMessages, exportOptions, redactionOptions);
        break;
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
      'claude-chat': { ext: 'html', mime: 'text/html' },
      markdown: { ext: 'md', mime: 'text/markdown' },
      json: { ext: 'json', mime: 'application/json' },
      html: { ext: 'html', mime: 'text/html' },
      text: { ext: 'txt', mime: 'text/plain' }
    };
    const target = extMap[exportOptions.format] || { ext: 'txt', mime: 'text/plain' };
    const suffix = exportOptions.format === 'claude-chat' ? '_claude_chat' : '_shared';
    downloadFile(exportedContent, `${cleanTitle}${suffix}.${target.ext}`, target.mime);
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
      <div className="h-screen bg-[#f3f2ec] flex items-center justify-center text-[#716f68]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#141416] animate-spin" />
          <span>Loading Privacy & Export...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f3f2ec] text-[#141416] font-sans overflow-hidden">
      {/* Keystone Unified Header */}
      <UnifiedHeader
        currentPhase={3}
        title="Privacy & Export"
        subtitle={`${totalStats.totalRedacted} items sanitized · Ready to export`}
        rightAction={
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-[#e5e2d8] text-xs text-emerald-800 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-keystone-pulse" />
            <span>On-Device Redaction</span>
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

            {/* Phase 3 Redaction Panel */}
            <RedactionControlPanel
              options={redactionOptions}
              onChangeOptions={setRedactionOptions}
              stats={totalStats}
              isScanning={isScanningPII}
              hasScanned={hasScannedPII}
              onScanPII={handleScanPIIWithAI}
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#716f68] space-y-4">
            <Layers className="w-12 h-12 text-[#9ca3af]" />
            <p className="text-sm">Select a conversation from the sidebar to begin exporting & redacting.</p>
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
