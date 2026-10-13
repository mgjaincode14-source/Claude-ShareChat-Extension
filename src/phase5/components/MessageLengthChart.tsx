'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MessageStats } from '../types';

interface MessageLengthChartProps {
  messageStats: MessageStats[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e5e2d8] rounded-xl p-3 text-xs shadow-md">
      <p className="text-[#716f68] mb-2">Msg #{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value} words
        </p>
      ))}
    </div>
  );
};

export const MessageLengthChart: React.FC<MessageLengthChartProps> = ({ messageStats }) => {
  // Sample every N messages to keep the chart readable (max 60 data points)
  const maxPoints = 60;
  const step = Math.max(1, Math.ceil(messageStats.length / maxPoints));
  const chartData = messageStats
    .filter((_, i) => i % step === 0)
    .map((m, i) => ({
      index: (i * step) + 1,
      user: m.sender === 'user' ? m.wordCount : 0,
      claude: m.sender === 'assistant' ? m.wordCount : 0,
    }));

  return (
    <div className="rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#141416]">Message Length Distribution</h3>
        <p className="text-xs text-[#716f68] mt-0.5">Word count per message — User vs Claude</p>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={0} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e2d8" vertical={false} />
            <XAxis
              dataKey="index"
              tick={{ fill: '#716f68', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Message #', position: 'insideBottom', offset: -3, fill: '#716f68', fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: '#716f68', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#716f68', paddingTop: 8 }}
            />
            <Bar dataKey="user" name="You" fill="#141416" radius={[2, 2, 0, 0]} maxBarSize={16} />
            <Bar dataKey="claude" name="Claude" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
