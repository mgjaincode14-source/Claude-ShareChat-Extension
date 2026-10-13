'use client';

import React, { useState } from 'react';
import { UnifiedConversation } from '../types';
import { 
  MessageSquare, 
  Search, 
  Calendar, 
  FileText, 
  Trash2, 
  Plus, 
  Sparkles, 
  Layers
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface ConversationListProps {
  conversations: UnifiedConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenImport: () => void;
  onLoadSamples: () => void;
  onClearAll: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onOpenImport,
  onLoadSamples,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.messages.some((m) => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-80 border-r border-[#e8e5dd] bg-[#f5f4ee] flex flex-col h-full select-none">
      {/* Header & Actions */}
      <div className="p-4 border-b border-[#e8e5dd] space-y-3 bg-[#f5f4ee]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#cc5a36] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <ClaudeIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-claude-serif font-semibold text-[#1f1e1d] text-sm leading-tight tracking-tight">Claude Chats</h2>
              <p className="text-xs text-[#6b6963]">{conversations.length} conversations</p>
            </div>
          </div>
          <button
            onClick={onOpenImport}
            className="px-3.5 py-1.5 bg-[#cc5a36] hover:bg-[#b84b29] text-white rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1 shadow-sm active:scale-95"
            title="Import Claude Export (.zip / .json)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9e9b91]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#ffffff] border border-[#e8e5dd] text-[#1f1e1d] text-xs rounded-full pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#cc5a36] placeholder-[#9e9b91] transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#edeae1] border border-[#e8e5dd] flex items-center justify-center text-[#6b6963] mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs text-[#6b6963]">
              {searchTerm ? 'No matching conversations found' : 'No conversations imported yet'}
            </p>
            {!searchTerm && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={onLoadSamples}
                  className="w-full py-1.5 px-3 bg-[#ffffff] hover:bg-[#faf9f5] border border-[#e8e5dd] text-[#1f1e1d] rounded-full text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#cc5a36]" />
                  <span>Load Demo Claude Data</span>
                </button>
                <button
                  onClick={onOpenImport}
                  className="w-full py-1.5 px-3 bg-[#ffffff] hover:bg-[#faf9f5] border border-[#e8e5dd] text-[#6b6963] rounded-full text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload .zip / .json</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-white border-[#e8e5dd] text-[#1f1e1d] shadow-sm -translate-y-0.5'
                    : 'bg-transparent hover:bg-[#edeae1]/60 border-transparent hover:border-[#e8e5dd] text-[#1f1e1d]'
                } active:scale-[0.99]`}
              >
                {/* Active Indicator Bar */}
                <div
                  className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#cc5a36] opacity-100'
                      : 'bg-transparent opacity-0 group-hover:bg-[#d9d5cb] group-hover:opacity-100'
                  }`}
                />

                <div className="flex justify-between items-start space-x-2 pl-1.5">
                  <h3 className={`text-xs line-clamp-1 transition-colors ${isSelected ? 'font-semibold text-[#1f1e1d]' : 'font-medium text-[#4a4843]'}`}>
                    {conv.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[#6b6963] hover:text-red-500 p-0.5 rounded transition-all active:scale-90"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2 mt-2 text-[11px] text-[#6b6963] pl-1.5">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-[#9e9b91]" />
                    <span>
                      {conv.metadata?.dateRange?.start && conv.metadata?.dateRange?.end && conv.metadata.dateRange.start !== conv.metadata.dateRange.end
                        ? `${conv.metadata.dateRange.start} → ${conv.metadata.dateRange.end}`
                        : conv.metadata?.dateRange?.start || conv.createdDateString}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3 text-[#9e9b91]" />
                    <span>{conv.metadata.totalMessages} msgs</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[#e8e5dd] bg-[#f5f4ee] flex items-center justify-between text-xs text-[#6b6963]">
        <button
          onClick={onLoadSamples}
          className="hover:text-[#1f1e1d] flex items-center space-x-1 transition-colors"
          title="Reload Demo Data"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#cc5a36]" />
          <span>Demo Data</span>
        </button>
        {conversations.length > 0 && (
          <button
            onClick={onClearAll}
            className="hover:text-red-600 transition-colors"
            title="Wipe database"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
