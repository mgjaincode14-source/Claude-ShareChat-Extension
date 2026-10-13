'use client';

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CodeLanguageStat } from '../types';
import { Code2 } from 'lucide-react';

interface CodeStatsPanelProps {
  totalBlocks: number;
  totalLines: number;
  languages: CodeLanguageStat[];
}

const LANG_COLORS: Record<string, string> = {
  python: '#3b82f6',
  javascript: '#f59e0b',
  typescript: '#6366f1',
  js: '#f59e0b',
  ts: '#6366f1',
  bash: '#10b981',
  shell: '#10b981',
  sh: '#10b981',
  css: '#ec4899',
  html: '#f87171',
  json: '#34d399',
  sql: '#06b6d4',
  rust: '#fb923c',
  go: '#60a5fa',
  java: '#a78bfa',
  cpp: '#4ade80',
  c: '#4ade80',
  ruby: '#f43f5e',
  php: '#818cf8',
  swift: '#ff6b6b',
  kotlin: '#a855f7',
  unknown: '#64748b',
};

function getLangColor(lang: string): string {
  return LANG_COLORS[lang.toLowerCase()] || '#64748b';
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CodeLanguageStat & { fill: string } }[];
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-[#e5e2d8] rounded-xl p-3 text-xs shadow-md">
      <p className="font-semibold text-[#141416] mb-1 capitalize">{p.language}</p>
      <p className="text-[#716f68]">{p.count} blocks</p>
      <p className="text-[#716f68]">{p.totalLines} lines</p>
    </div>
  );
};

export const CodeStatsPanel: React.FC<CodeStatsPanelProps> = ({
  totalBlocks,
  totalLines,
  languages,
}) => {
  if (totalBlocks === 0) {
    return (
      <div className="rounded-2xl border border-[#e5e2d8] bg-white p-5 flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
        <Code2 className="w-8 h-8 text-[#9ca3af]" />
        <p className="text-sm text-[#716f68]">No code blocks detected in this conversation.</p>
      </div>
    );
  }

  const chartData = languages.slice(0, 8).map((lang) => ({
    ...lang,
    fill: getLangColor(lang.language),
  }));

  return (
    <div className="rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm transition-all duration-300">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#141416] flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-[#716f68]" />
          <span>Code Statistics</span>
        </h3>
        <p className="text-xs text-[#716f68] mt-0.5">
          {totalBlocks} code blocks · {totalLines} total lines
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Radial chart */}
        <div className="w-full sm:w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="30%"
              outerRadius="100%"
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="count"
                cornerRadius={4}
                background={{ fill: '#ebe8df' }}
              >
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ))}
              </RadialBar>
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Language breakdown list */}
        <div className="flex-1 space-y-2.5 w-full">
          {languages.slice(0, 8).map((lang) => {
            const color = getLangColor(lang.language);
            const pct = totalBlocks > 0 ? Math.round((lang.count / totalBlocks) * 100) : 0;
            return (
              <div key={lang.language} className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-[#141416] font-medium capitalize w-20 truncate">{lang.language}</span>
                <div className="flex-1 bg-[#ebe8df] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs text-[#716f68] font-mono w-8 text-right">{lang.count}×</span>
                <span className="text-xs text-[#9ca3af] font-mono w-14 text-right">{lang.totalLines} lines</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
