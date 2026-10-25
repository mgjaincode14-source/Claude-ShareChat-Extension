'use client';

import React from 'react';
import { UnifiedConversation } from '@/phase1/types';
import { SelectionOptions, SelectionMode } from '../types';
import { getAvailableDates, getDateBoundaries } from '../engine';
import { 
  Calendar, 
  CalendarRange, 
  CheckSquare, 
  Layers, 
  Link2, 
  RotateCcw, 
  CheckCircle2, 
  XSquare,
  ListFilter
} from 'lucide-react';

interface SelectionToolbarProps {
  conversation: UnifiedConversation | null;
  options: SelectionOptions;
  onChangeOptions: (newOptions: SelectionOptions) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  conversation,
  options,
  onChangeOptions,
  onSelectAll,
  onDeselectAll,
  onInvertSelection
}) => {
  if (!conversation) return null;

  const availableDates = getAvailableDates(conversation);
  const { minDate, maxDate } = getDateBoundaries(conversation);

  const activeStartDate = options.startDate && options.startDate >= minDate && options.startDate <= maxDate ? options.startDate : minDate;
  const activeEndDate = options.endDate && options.endDate >= minDate && options.endDate <= maxDate ? options.endDate : maxDate;

  const handleModeChange = (mode: SelectionMode) => {
    const nextOptions: SelectionOptions = {
      ...options,
      mode
    };

    if (mode === 'specific_date' && !options.selectedDate && availableDates.length > 0) {
      nextOptions.selectedDate = availableDates[0].dateString;
    }

    if (mode === 'date_range') {
      nextOptions.startDate = activeStartDate;
      nextOptions.endDate = activeEndDate;
    }

    onChangeOptions(nextOptions);
  };

  return (
    <div className="bg-[#faf9f5]/90 border-b border-[#e8e5dd] p-4 space-y-4 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Top Header Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#cc5a36] flex items-center justify-center text-white shadow-sm">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-claude-serif text-sm font-semibold text-[#1f1e1d] tracking-tight">Message Selection</h2>
            <p className="text-[11px] text-[#6b6963]">Select which messages to include in your export</p>
          </div>
        </div>

        {/* Mode Selector Tabs (Claude Segmented Control) */}
        <div className="flex bg-[#f0eee6] p-1 rounded-full border border-[#e5e0d8] text-xs shadow-inner">
          <button
            onClick={() => handleModeChange('all')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center space-x-1.5 ${
              options.mode === 'all'
                ? 'bg-[#1f1e1d] text-white shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Entire Chat</span>
          </button>

          <button
            onClick={() => handleModeChange('specific_date')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center space-x-1.5 ${
              options.mode === 'specific_date'
                ? 'bg-[#1f1e1d] text-white shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Specific Date</span>
          </button>

          <button
            onClick={() => handleModeChange('date_range')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center space-x-1.5 ${
              options.mode === 'date_range'
                ? 'bg-[#1f1e1d] text-white shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Date Range</span>
          </button>

          <button
            onClick={() => handleModeChange('individual')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center space-x-1.5 ${
              options.mode === 'individual'
                ? 'bg-[#1f1e1d] text-white shadow-sm'
                : 'text-[#6b6963] hover:text-[#1f1e1d]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Individual Msgs</span>
          </button>
        </div>
      </div>

      {/* Sub-controls based on active mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e5e2d8] text-xs">
        {/* Specific Date Mode Sub-control */}
        {options.mode === 'specific_date' && (
          <div className="flex items-center space-x-2">
            <span className="text-[#716f68] font-medium">Select Date:</span>
            <select
              value={options.selectedDate || availableDates[0]?.dateString || ''}
              onChange={(e) => onChangeOptions({ ...options, selectedDate: e.target.value })}
              className="bg-[#ffffff] border border-[#e5e2d8] text-[#141416] rounded-full px-3 py-1.5 focus:outline-none focus:border-[#141416] font-mono text-xs shadow-sm"
            >
              {availableDates.map((d) => (
                <option key={d.dateString} value={d.dateString}>
                  {d.dateString} ({d.count} msgs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range Mode Sub-control */}
        {options.mode === 'date_range' && (
          <div className="flex flex-wrap items-center gap-3">
            {/* From Date */}
            <div className="flex items-center space-x-2">
              <span className="text-[#716f68] font-medium">From:</span>
              <select
                value={activeStartDate}
                onChange={(e) => onChangeOptions({ ...options, startDate: e.target.value })}
                className="bg-[#ffffff] border border-[#e5e2d8] text-[#141416] rounded-full px-3 py-1 focus:outline-none focus:border-[#141416] font-mono text-xs shadow-sm"
              >
                {availableDates.map((d) => (
                  <option key={d.dateString} value={d.dateString}>
                    {d.dateString}
                  </option>
                ))}
              </select>
            </div>

            {/* To Date */}
            <div className="flex items-center space-x-2">
              <span className="text-[#716f68] font-medium">To:</span>
              <select
                value={activeEndDate}
                onChange={(e) => onChangeOptions({ ...options, endDate: e.target.value })}
                className="bg-[#ffffff] border border-[#e5e2d8] text-[#141416] rounded-full px-3 py-1 focus:outline-none focus:border-[#141416] font-mono text-xs shadow-sm"
              >
                {availableDates.map((d) => (
                  <option key={d.dateString} value={d.dateString}>
                    {d.dateString}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Range Presets */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => onChangeOptions({ ...options, startDate: minDate, endDate: maxDate })}
                className="px-2.5 py-1 bg-[#faf1ec] hover:bg-[#f6e5dc] text-[#b84b29] rounded-full border border-[#f0d5cb] text-[11px] font-medium transition-colors shadow-sm"
              >
                All Dates ({minDate} → {maxDate})
              </button>
              <button
                onClick={() => onChangeOptions({ ...options, startDate: minDate, endDate: minDate })}
                className="px-2.5 py-1 bg-[#ffffff] hover:bg-[#f3f2ec] text-[#716f68] rounded-full border border-[#e5e2d8] text-[11px] transition-colors shadow-sm"
              >
                First Day ({minDate})
              </button>
              <button
                onClick={() => onChangeOptions({ ...options, startDate: maxDate, endDate: maxDate })}
                className="px-2.5 py-1 bg-[#ffffff] hover:bg-[#f3f2ec] text-[#716f68] rounded-full border border-[#e5e2d8] text-[11px] transition-colors shadow-sm"
              >
                Last Day ({maxDate})
              </button>
            </div>
          </div>
        )}

        {/* Individual Selection Quick Actions */}
        {options.mode === 'individual' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectAll}
              className="px-3 py-1.5 bg-[#ffffff] hover:bg-[#f3f2ec] text-[#141416] border border-[#e5e2d8] rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 active:scale-95 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Select All</span>
            </button>
            <button
              onClick={onDeselectAll}
              className="px-3 py-1.5 bg-[#ffffff] hover:bg-[#f3f2ec] text-[#716f68] border border-[#e5e2d8] rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 active:scale-95 shadow-sm"
            >
              <XSquare className="w-3.5 h-3.5 text-[#716f68]" />
              <span>Deselect All</span>
            </button>
            <button
              onClick={onInvertSelection}
              className="px-3 py-1.5 bg-[#ffffff] hover:bg-[#f3f2ec] text-[#141416] border border-[#e5e2d8] rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#141416]" />
              <span>Invert</span>
            </button>
          </div>
        )}

        {/* Preceding Context Toggle Switch with Keystone Spring Physics */}
        <div className="flex items-center space-x-2.5 bg-[#f3f2ec] px-3 py-1.5 rounded-full border border-[#e5e2d8] ml-auto shadow-sm">
          <Link2 className={`w-3.5 h-3.5 transition-colors ${options.includePrecedingContext ? 'text-[#141416]' : 'text-[#716f68]'}`} />
          <span className="text-[#141416] font-medium text-xs">Auto-link Context:</span>
          <button
            type="button"
            role="switch"
            aria-checked={options.includePrecedingContext}
            onClick={() =>
              onChangeOptions({
                ...options,
                includePrecedingContext: !options.includePrecedingContext
              })
            }
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-out focus:outline-none cursor-pointer ${
              options.includePrecedingContext ? 'bg-[#141416]' : 'bg-[#dcd9ce]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                options.includePrecedingContext ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
