'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Layers, 
  ListFilter, 
  ShieldCheck, 
  Share2, 
  BarChart2, 
  Sparkles, 
  Coins, 
  ArrowRight, 
  CornerDownLeft,
  Command,
  X
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Workflow' | 'Analytics';
  description: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'phase1',
      title: 'Conversation Reader',
      category: 'Navigation',
      description: 'View and browse imported Claude conversations & messages',
      icon: <Layers className="w-4 h-4 text-amber-400" />,
      action: () => { router.push('/phase1'); onClose(); },
      badge: 'Phase 1'
    },
    {
      id: 'phase2',
      title: 'Message Selection Filter',
      category: 'Navigation',
      description: 'Filter conversation by date span, range, or individual pick',
      icon: <ListFilter className="w-4 h-4 text-sky-400" />,
      action: () => { router.push('/phase2'); onClose(); },
      badge: 'Phase 2'
    },
    {
      id: 'phase3',
      title: 'Privacy & Redaction',
      category: 'Navigation',
      description: 'Sanitize API keys, emails, IPs, custom keywords and export',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      action: () => { router.push('/phase3'); onClose(); },
      badge: 'Phase 3'
    },
    {
      id: 'phase4',
      title: 'Share Link Generator',
      category: 'Navigation',
      description: 'Generate public snapshots and managed shareable web links',
      icon: <Share2 className="w-4 h-4 text-indigo-400" />,
      action: () => { router.push('/phase4'); onClose(); },
      badge: 'Phase 4'
    },
    {
      id: 'phase5',
      title: 'Analytics & Token Intelligence',
      category: 'Navigation',
      description: 'Explore sentiment trends, code stats, and Claude BPE token costs',
      icon: <BarChart2 className="w-4 h-4 text-violet-400" />,
      action: () => { router.push('/phase5'); onClose(); },
      badge: 'Phase 5'
    },
    {
      id: 'tokens',
      title: 'Token Reduction Advisor',
      category: 'Analytics',
      description: 'Jump to query token optimization and Claude model cost estimator',
      icon: <Coins className="w-4 h-4 text-amber-400" />,
      action: () => { router.push('/phase5'); onClose(); },
      badge: 'Tokens'
    }
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          onClose(); // toggle if needed
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#ffffff] border border-[#e5e2d8] rounded-2xl shadow-2xl shadow-black/15 overflow-hidden animate-keystone-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#e5e2d8] bg-[#ffffff]">
          <Search className="w-4 h-4 text-[#716f68] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or jump to phase..."
            className="w-full bg-transparent text-sm text-[#141416] placeholder-[#9ca3af] focus:outline-none font-sans"
          />
          <div className="flex items-center space-x-1.5 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] bg-[#f3f2ec] border border-[#e5e2d8] rounded-md text-[#716f68] font-mono">ESC</kbd>
            <button 
              onClick={onClose}
              className="text-[#716f68] hover:text-[#141416] p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#716f68]">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#faf1ec] border border-[#f0d5cb] text-[#1f1e1d] shadow-sm'
                      : 'hover:bg-[#f5f4ee] border border-transparent text-[#6b6963]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2 rounded-xl bg-[#f5f4ee] border border-[#e8e5dd] flex-shrink-0 text-[#cc5a36]">
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-[#1f1e1d] truncate">{cmd.title}</span>
                        {cmd.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#f0eee6] text-[#6b6963] border border-[#e8e5dd]">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6b6963] truncate mt-0.5">{cmd.description}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center space-x-1 text-[#cc5a36] text-xs flex-shrink-0 ml-3 font-medium">
                      <span className="text-[10px]">Select</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-[#e5e2d8] bg-[#fbfaf7] flex items-center justify-between text-[11px] text-[#716f68]">
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1.5 py-0.5 bg-[#ffffff] border border-[#e5e2d8] rounded font-mono text-[9px] text-[#716f68]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-[#ffffff] border border-[#e5e2d8] rounded font-mono text-[9px] text-[#716f68]">↵</kbd> Open</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Command className="w-3 h-3 text-[#716f68]" />
            <span>Keystone Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};
