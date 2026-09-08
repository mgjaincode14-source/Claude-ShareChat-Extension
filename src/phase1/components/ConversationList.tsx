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
  Database,
  Layers,
  Clock
} from 'lucide-react';

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
    <div className="w-80 border-r border-slate-800 bg-slate-950/80 flex flex-col h-full select-none">
      {/* Header & Actions */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-950/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-sm leading-tight">Claude Chats</h2>
              <p className="text-xs text-slate-400">{conversations.length} items stored</p>
            </div>
          </div>
          <button
            onClick={onOpenImport}
            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
            title="Import Claude Export (.zip / .json)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-500 transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400">
              {searchTerm ? 'No matching conversations found' : 'No conversations imported yet'}
            </p>
            {!searchTerm && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={onLoadSamples}
                  className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Demo Claude Data</span>
                </button>
                <button
                  onClick={onOpenImport}
                  className="w-full py-1.5 px-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-slate-300 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5"
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
                className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-600/40 text-slate-100 shadow-sm'
                    : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800/40 hover:border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-start space-x-2">
                  <h3 className="font-medium text-xs text-slate-200 line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {conv.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 rounded transition-all"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    <span>{conv.createdDateString}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3 text-slate-600" />
                    <span>{conv.metadata.totalMessages} msgs</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-slate-900 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onLoadSamples}
          className="hover:text-amber-400 flex items-center space-x-1 transition-colors"
          title="Reload Demo Data"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Demo Data</span>
        </button>
        {conversations.length > 0 && (
          <button
            onClick={onClearAll}
            className="hover:text-red-400 flex items-center space-x-1 transition-colors"
            title="Clear all stored conversations"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Clear DB</span>
          </button>
        )}
      </div>
    </div>
  );
};
