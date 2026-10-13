'use client';

import React from 'react';
import { SelectionSummary } from '../types';
import { 
  User, 
  Link2, 
  Calendar
} from 'lucide-react';
import { ClaudeIcon } from '@/components/ClaudeIcon';

interface SelectionSummaryPanelProps {
  summary: SelectionSummary;
}

export const SelectionSummaryPanel: React.FC<SelectionSummaryPanelProps> = ({ summary }) => {
  return (
    <div className="bg-[#faf9f5]/95 border-b border-[#e8e5dd] p-4 backdrop-blur-md text-[#1f1e1d]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Selection Progress Metric */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-claude-serif text-2xl font-bold text-[#1f1e1d] tracking-tight">
                {summary.totalSelected} <span className="text-sm font-sans font-normal text-[#6b6963]">/ {summary.totalMessagesInConv} msgs</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  summary.isAllSelected
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : summary.isNoneSelected
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb]'
                }`}
              >
                {summary.percentageSelected}% Selected
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-56 h-2 bg-[#f0eee6] rounded-full mt-2 overflow-hidden border border-[#e8e5dd]">
              <div
                className="h-full bg-[#cc5a36] transition-all duration-300 rounded-full"
                style={{ width: `${summary.percentageSelected}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* User Messages Count */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white rounded-full border border-[#e8e5dd] text-[#1f1e1d] shadow-sm">
            <User className="w-3.5 h-3.5 text-[#6b6963]" />
            <span>{summary.userSelectedCount} User</span>
          </div>

          {/* Assistant Messages Count */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white rounded-full border border-[#e8e5dd] text-[#1f1e1d] shadow-sm">
            <ClaudeIcon className="w-3.5 h-3.5 text-[#cc5a36]" />
            <span>{summary.assistantSelectedCount} Claude</span>
          </div>

          {/* Context Auto-Linked Badge */}
          {summary.contextMessagesAttachedCount > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-medium shadow-sm">
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>+{summary.contextMessagesAttachedCount} Parent Context</span>
            </div>
          )}

          {/* Date Span Badge */}
          {summary.effectiveDateRange && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white rounded-full border border-[#e8e5dd] text-[#6b6963] font-mono shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-[#9e9b91]" />
              <span>
                {(() => {
                  const fmt = (ds: string) => {
                    try {
                      const parts = ds.split('-');
                      if (parts.length === 3) {
                        const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                        const day = d.getUTCDate();
                        const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
                        const year = d.getUTCFullYear();
                        return `${day}-${month}-${year}`;
                      }
                      return ds;
                    } catch { return ds; }
                  };
                  const start = fmt(summary.effectiveDateRange!.start);
                  const end = fmt(summary.effectiveDateRange!.end);
                  return start === end ? start : `${start} → ${end}`;
                })()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
