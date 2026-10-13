'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Layers, 
  ListFilter, 
  ShieldCheck, 
  Share2, 
  BarChart2, 
  Sparkles, 
  Command, 
  Database,
  ArrowRight
} from 'lucide-react';
import { CommandPaletteModal } from './CommandPaletteModal';
import { ClaudeIcon } from './ClaudeIcon';

interface UnifiedHeaderProps {
  currentPhase: 1 | 2 | 3 | 4 | 5;
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  currentPhase,
  title,
  subtitle,
  rightAction
}) => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const pathname = usePathname();

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { phase: 1, href: '/phase1', label: 'Reader', icon: <Layers className="w-3.5 h-3.5" /> },
    { phase: 2, href: '/phase2', label: 'Filter', icon: <ListFilter className="w-3.5 h-3.5" /> },
    { phase: 3, href: '/phase3', label: 'Privacy', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { phase: 4, href: '/phase4', label: 'Share', icon: <Share2 className="w-3.5 h-3.5" /> },
    { phase: 5, href: '/phase5', label: 'Analytics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  ];

  const phaseConfig = {
    1: { name: 'Conversation Reader', icon: <Layers className="w-4 h-4" /> },
    2: { name: 'Message Filter', icon: <ListFilter className="w-4 h-4" /> },
    3: { name: 'Privacy & Export', icon: <ShieldCheck className="w-4 h-4" /> },
    4: { name: 'Share Link Generator', icon: <Share2 className="w-4 h-4" /> },
    5: { name: 'Conversation Analytics', icon: <BarChart2 className="w-4 h-4" /> }
  };

  const currentConfig = phaseConfig[currentPhase];

  return (
    <>
      <header className="h-14 border-b border-[#e8e5dd] bg-[#faf9f5]/90 px-4 sm:px-6 flex items-center justify-between backdrop-blur-md select-none z-20 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Left Section: Brand & Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#cc5a36] flex items-center justify-center text-white shadow-sm flex-shrink-0 transition-transform duration-200 hover:scale-105">
            <ClaudeIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-claude-serif font-semibold text-sm sm:text-base text-[#1f1e1d] leading-tight truncate tracking-tight">
              {title || currentConfig.name}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#6b6963] truncate">
              {subtitle || 'Claude ShareChat Suite'}
            </p>
          </div>
        </div>

        {/* Center Section: Claude Segmented Navigation Bar */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8] shadow-inner">
          {navItems.map((item) => {
            const isActive = currentPhase === item.phase;
            return (
              <Link
                key={item.phase}
                href={item.href}
                className={`relative px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#1f1e1d] text-white shadow-sm font-medium'
                    : 'text-[#6b6963] hover:text-[#1f1e1d] hover:bg-[#e8e5dc]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: ⌘K Quick Action & Status Pill */}
        <div className="flex items-center space-x-2">
          {rightAction}

          {/* ⌘K Trigger Button */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#f5f4ee] border border-[#e8e5dd] hover:border-[#d9d5cb] text-[#6b6963] hover:text-[#1f1e1d] rounded-full text-xs transition-all duration-200 shadow-sm active:scale-95"
            title="Open Quick Actions (⌘K)"
          >
            <Command className="w-3.5 h-3.5 text-[#6b6963]" />
            <span className="hidden sm:inline text-[11px] font-mono text-[#6b6963] bg-[#f0eee6] px-1.5 py-0.5 rounded-md">⌘K</span>
          </button>

          {/* Sync Status Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#f5f4ee] border border-[#e8e5dd] text-[11px] text-[#6b6963]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-claude-pulse" />
            <span className="font-medium text-[#1f1e1d]">Local DB</span>
          </div>
        </div>
      </header>

      {/* ⌘K Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
};
