'use client';

import React from 'react';
import { SelectionSummary } from '../types';
import { 
  BarChart3, 
  User, 
  Bot, 
  Link2, 
  Calendar, 
  Sparkles, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SelectionSummaryPanelProps {
  summary: SelectionSummary;
}

export const SelectionSummaryPanel: React.FC<SelectionSummaryPanelProps> = ({ summary }) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Selection Progress Metric */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-slate-100 tracking-tight">
                {summary.totalSelected} <span className="text-sm font-normal text-slate-400">/ {summary.totalMessagesInConv} msgs</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  summary.isAllSelected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : summary.isNoneSelected
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {summary.percentageSelected}% Selected
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-56 h-2 bg-slate-950 rounded-full mt-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full"
                style={{ width: `${summary.percentageSelected}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* User Messages Count */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>{summary.userSelectedCount} User</span>
          </div>

          {/* Assistant Messages Count */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>{summary.assistantSelectedCount} Claude</span>
          </div>

          {/* Context Auto-Linked Badge */}
          {summary.contextMessagesAttachedCount > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium animate-fadeIn">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{summary.contextMessagesAttachedCount} Parent Context</span>
            </div>
          )}

          {/* Date Span Badge */}
          {summary.effectiveDateRange && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {summary.effectiveDateRange.start} → {summary.effectiveDateRange.end}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
