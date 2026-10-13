'use client';

import React from 'react';
import { TopicEntry } from '../types';

interface TopicCloudProps {
  topics: TopicEntry[];
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f87171', '#34d399',
  '#60a5fa', '#fb923c', '#a78bfa', '#4ade80',
];

function getSize(weight: number): number {
  // Map weight 0–1 to font size range 11–28px
  return Math.round(11 + weight * 17);
}

export const TopicCloud: React.FC<TopicCloudProps> = ({ topics }) => {
  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[#141416] mb-2">Topic Cloud</h3>
        <p className="text-xs text-[#716f68]">No topics detected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#141416]">Topic Cloud</h3>
        <p className="text-xs text-[#716f68] mt-0.5">
          Top {topics.length} recurring keywords (by frequency)
        </p>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-2 items-center py-2">
        {topics.map((topic, i) => {
          const color = COLORS[i % COLORS.length];
          const size = getSize(topic.weight);
          const opacity = 0.7 + topic.weight * 0.3;
          return (
            <span
              key={topic.word}
              className="cursor-default transition-transform duration-150 hover:scale-110 select-none"
              style={{
                fontSize: size,
                color,
                opacity,
                fontWeight: topic.weight > 0.7 ? 700 : topic.weight > 0.4 ? 600 : 400,
                lineHeight: 1.4,
              }}
              title={`"${topic.word}" — ${topic.count} occurrences`}
            >
              {topic.word}
            </span>
          );
        })}
      </div>

      {/* Top-5 bar breakdown */}
      <div className="mt-4 space-y-2 border-t border-[#e5e2d8] pt-4">
        <p className="text-xs text-[#716f68] font-medium mb-2">Top 5 Topics</p>
        {topics.slice(0, 5).map((topic, i) => {
          const color = COLORS[i % COLORS.length];
          return (
            <div key={topic.word} className="flex items-center space-x-3">
              <span className="text-xs text-[#141416] font-medium w-20 truncate">{topic.word}</span>
              <div className="flex-1 bg-[#ebe8df] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${topic.weight * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-xs text-[#716f68] font-mono w-8 text-right">{topic.count}x</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
