'use client';

import React from 'react';
import { UnifiedConversation } from '@/phase1/types';
import { SelectionOptions, SelectionMode, DateSummary } from '../types';
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
  Sparkles,
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

  const handleModeChange = (mode: SelectionMode) => {
    const nextOptions: SelectionOptions = {
      ...options,
      mode
    };

    if (mode === 'specific_date' && !options.selectedDate && availableDates.length > 0) {
      nextOptions.selectedDate = availableDates[0].dateString;
    }

    if (mode === 'date_range') {
      if (!options.startDate) nextOptions.startDate = minDate;
      if (!options.endDate) nextOptions.endDate = maxDate;
    }

    onChangeOptions(nextOptions);
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800/80 p-4 space-y-4 backdrop-blur-md">
      {/* Top Header Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Selection Filter Engine</h2>
            <p className="text-[11px] text-slate-400">Choose how to filter conversation messages</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => handleModeChange('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              options.mode === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Entire Chat</span>
          </button>

          <button
            onClick={() => handleModeChange('specific_date')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              options.mode === 'specific_date'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Specific Date</span>
          </button>

          <button
            onClick={() => handleModeChange('date_range')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              options.mode === 'date_range'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Date Range</span>
          </button>

          <button
            onClick={() => handleModeChange('individual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              options.mode === 'individual'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Individual Msgs</span>
          </button>
        </div>
      </div>

      {/* Sub-controls based on active mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/50 text-xs">
        {/* Specific Date Mode Sub-control */}
        {options.mode === 'specific_date' && (
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Select Date:</span>
            <select
              value={options.selectedDate || availableDates[0]?.dateString || ''}
              onChange={(e) => onChangeOptions({ ...options, selectedDate: e.target.value })}
              className="bg-slate-950 border border-slate-800 text-amber-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-mono text-xs"
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
            {/* From Date Selection */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">From:</span>
              <select
                value={options.startDate && options.startDate >= minDate && options.startDate <= maxDate ? options.startDate : minDate}
                onChange={(e) => onChangeOptions({ ...options, startDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-amber-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 font-mono text-xs"
              >
                {availableDates.map((d) => (
                  <option key={d.dateString} value={d.dateString}>
                    {d.dateString}
                  </option>
                ))}
              </select>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={options.startDate && options.startDate >= minDate && options.startDate <= maxDate ? options.startDate : minDate}
                onChange={(e) => onChangeOptions({ ...options, startDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            {/* To Date Selection */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">To:</span>
              <select
                value={options.endDate && options.endDate >= minDate && options.endDate <= maxDate ? options.endDate : maxDate}
                onChange={(e) => onChangeOptions({ ...options, endDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-amber-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 font-mono text-xs"
              >
                {availableDates.map((d) => (
                  <option key={d.dateString} value={d.dateString}>
                    {d.dateString}
                  </option>
                ))}
              </select>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={options.endDate && options.endDate >= minDate && options.endDate <= maxDate ? options.endDate : maxDate}
                onChange={(e) => onChangeOptions({ ...options, endDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 text-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            {/* Quick Range Presets */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => onChangeOptions({ ...options, startDate: minDate, endDate: maxDate })}
                className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 rounded border border-amber-500/30 text-[11px] font-medium transition-colors"
              >
                All Dates ({minDate} → {maxDate})
              </button>
              <button
                onClick={() => onChangeOptions({ ...options, startDate: minDate, endDate: minDate })}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[11px] transition-colors"
              >
                First Day ({minDate})
              </button>
              <button
                onClick={() => onChangeOptions({ ...options, startDate: maxDate, endDate: maxDate })}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[11px] transition-colors"
              >
                Last Day ({maxDate})
              </button>
            </div>
          </div>
        )}
                onClick={() => onChangeOptions({ ...options, startDate: minDate, endDate: minDate })}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[11px] transition-colors"
              >
                First Day
              </button>
              <button
                onClick={() => onChangeOptions({ ...options, startDate: maxDate, endDate: maxDate })}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[11px] transition-colors"
              >
                Last Day
              </button>
            </div>
          </div>
        )}

        {/* Individual Selection Quick Actions */}
        {options.mode === 'individual' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectAll}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select All</span>
            </button>
            <button
              onClick={onDeselectAll}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
            >
              <XSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Deselect All</span>
            </button>
            <button
              onClick={onInvertSelection}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Invert</span>
            </button>
          </div>
        )}

        {/* Preceding Context Toggle Switch */}
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 ml-auto">
          <Link2 className={`w-3.5 h-3.5 ${options.includePrecedingContext ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="text-slate-300 font-medium">Auto-link Parent Context:</span>
          <button
            onClick={() =>
              onChangeOptions({
                ...options,
                includePrecedingContext: !options.includePrecedingContext
              })
            }
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              options.includePrecedingContext ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                options.includePrecedingContext ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
