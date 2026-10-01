'use client';

import React, { useMemo } from 'react';
import { DayActivity } from '../types';

interface ActivityHeatmapProps {
  activityByDay: DayActivity[];
}

const CELL_SIZE = 13;
const CELL_GAP = 2;
const STEP = CELL_SIZE + CELL_GAP; // 15px per cell
const DAYS_IN_WEEK = 7;
const WEEKS_TO_SHOW = 24; // ~6 months

// Left margin reserved for day labels inside the SVG
const DAY_LABEL_WIDTH = 30;
// Top margin reserved for month labels inside the SVG
const MONTH_LABEL_HEIGHT = 18;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Only show Mon / Wed / Fri to avoid clutter (GitHub style)
const DAY_LABELS: { day: number; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 3, label: 'Wed' },
  { day: 5, label: 'Fri' },
];

function getColor(count: number, max: number): string {
  if (count === 0) return '#1e293b';
  const intensity = count / max;
  if (intensity < 0.25) return '#065f46';
  if (intensity < 0.5)  return '#059669';
  if (intensity < 0.75) return '#10b981';
  return '#34d399';
}

function generateDateRange(weeks: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  const startOffset = -(weeks * DAYS_IN_WEEK - 1);
  for (let i = startOffset; i <= 0; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityByDay }) => {
  const activityMap = useMemo(() => {
    const map: Record<string, DayActivity> = {};
    for (const day of activityByDay) map[day.date] = day;
    return map;
  }, [activityByDay]);

  const allDates = useMemo(() => generateDateRange(WEEKS_TO_SHOW), []);

  const maxCount = useMemo(
    () => Math.max(...activityByDay.map((d) => d.count), 1),
    [activityByDay],
  );

  // ── Build week grid ──────────────────────────────────────────────────────────
  const firstDate = new Date(allDates[0]);
  const startDow = firstDate.getDay(); // 0 = Sunday

  // Pad so the grid always starts on Sunday column
  const paddedDates: (string | null)[] = [
    ...Array(startDow).fill(null),
    ...allDates,
  ];

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < paddedDates.length; i += DAYS_IN_WEEK) {
    weeks.push(paddedDates.slice(i, i + DAYS_IN_WEEK));
  }

  // ── Month label positions ────────────────────────────────────────────────────
  const monthPositions: { x: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week.find(Boolean);
    if (!firstDay) return;
    const month = new Date(firstDay).getMonth();
    if (month !== lastMonth) {
      monthPositions.push({
        x: DAY_LABEL_WIDTH + wi * STEP,
        label: MONTH_NAMES[month],
      });
      lastMonth = month;
    }
  });

  // ── SVG dimensions ───────────────────────────────────────────────────────────
  const svgWidth  = DAY_LABEL_WIDTH + weeks.length * STEP;
  const svgHeight = MONTH_LABEL_HEIGHT + DAYS_IN_WEEK * STEP;

  const totalActiveDays = activityByDay.length;
  const totalMessages   = activityByDay.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Activity Heatmap</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalActiveDays} active day{totalActiveDays !== 1 ? 's' : ''} · {totalMessages} message{totalMessages !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-1 text-xs text-slate-500">
          <span>Less</span>
          {['#1e293b', '#065f46', '#059669', '#10b981', '#34d399'].map((c) => (
            <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Single SVG — day labels + month labels + grid all share one coordinate space */}
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block' }}
        >
          {/* ── Month labels (top row) ── */}
          {monthPositions.map(({ x, label }) => (
            <text
              key={`${x}-${label}`}
              x={x}
              y={11}
              fontSize={10}
              fill="#64748b"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* ── Day-of-week labels (left column, perfectly aligned per row) ── */}
          {DAY_LABELS.map(({ day, label }) => (
            <text
              key={label}
              x={DAY_LABEL_WIDTH - 4}
              // Centre text vertically in the cell row
              y={MONTH_LABEL_HEIGHT + day * STEP + CELL_SIZE / 2 + 3}
              fontSize={9}
              fill="#64748b"
              textAnchor="end"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* ── Grid cells ── */}
          {weeks.map((week, wi) =>
            week.map((date, di) => {
              const x = DAY_LABEL_WIDTH + wi * STEP;
              const y = MONTH_LABEL_HEIGHT + di * STEP;

              if (!date) {
                // Empty padding cell (before first real date)
                return (
                  <rect
                    key={`empty-${wi}-${di}`}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    fill="transparent"
                  />
                );
              }

              const activity = activityMap[date];
              const count    = activity?.count || 0;
              const color    = getColor(count, maxCount);

              return (
                <g key={`${wi}-${di}`}>
                  <rect
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    fill={color}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseEnter={(e) => ((e.target as SVGRectElement).style.opacity = '0.7')}
                    onMouseLeave={(e) => ((e.target as SVGRectElement).style.opacity = '1')}
                  />
                  <title>
                    {date}: {count} message{count !== 1 ? 's' : ''}
                    {activity
                      ? ` (you: ${activity.userMessages}, Claude: ${activity.assistantMessages})`
                      : ''}
                  </title>
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};
