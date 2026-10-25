'use client';

import React from 'react';
import Link from 'next/link';
import { SelectionOptions, SelectionSummary } from '../types';
import { ListFilter, Calendar, ArrowUpRight } from 'lucide-react';

interface SelectionSummaryBarProps {
  options: SelectionOptions;
  summary: SelectionSummary;
  /** href to navigate back to Phase 2 — e.g. '/phase2' */
  adjustHref: string;
}

/** A human-readable label for the active selection mode. */
function modeLabel(options: SelectionOptions): string {
  switch (options.mode) {
    case 'all':          return 'Entire conversation';
    case 'specific_date':
      return options.selectedDate ? `Date: ${options.selectedDate}` : 'Specific date';
    case 'date_range':
      if (options.startDate && options.endDate) {
        return options.startDate === options.endDate
          ? `Date: ${options.startDate}`
          : `${options.startDate} → ${options.endDate}`;
      }
      return 'Date range';
    case 'individual':   return 'Custom selection';
    default:             return 'All messages';
  }
}

export const SelectionSummaryBar: React.FC<SelectionSummaryBarProps> = ({
  options,
  summary,
  adjustHref
}) => {
  return (
    <div className="bg-white border border-[#e8e5dd] rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      {/* Left: icon + mode description */}
      <div className="flex items-center space-x-2.5 text-xs text-[#1f1e1d]">
        <div className="w-6 h-6 rounded-lg bg-[#f0eee6] border border-[#e5e0d8] flex items-center justify-center">
          <ListFilter className="w-3.5 h-3.5 text-[#6b6963]" />
        </div>
        <span className="font-medium">{modeLabel(options)}</span>
        <span className="text-[#9e9b91]">·</span>
        <span className="text-[#6b6963]">
          <span className="font-semibold text-[#1f1e1d]">{summary.totalSelected}</span>
          {' of '}
          <span>{summary.totalMessagesInConv}</span>
          {' messages selected'}
        </span>
        {summary.effectiveDateRange && (
          <>
            <span className="text-[#9e9b91]">·</span>
            <span className="flex items-center space-x-1 text-[#6b6963] font-mono">
              <Calendar className="w-3 h-3" />
              <span>
                {summary.effectiveDateRange.start === summary.effectiveDateRange.end
                  ? summary.effectiveDateRange.start
                  : `${summary.effectiveDateRange.start} → ${summary.effectiveDateRange.end}`}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Right: Adjust selection link */}
      <Link
        href={adjustHref}
        className="flex items-center space-x-1 text-xs text-[#6b6963] hover:text-[#1f1e1d] transition-colors duration-150 font-medium group"
      >
        <span>Adjust Selection</span>
        <ArrowUpRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
};
