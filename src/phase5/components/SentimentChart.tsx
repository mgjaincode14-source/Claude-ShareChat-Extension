'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SentimentPoint {
  index: number;
  label: string;
  score: number;
  sender: string;
}

interface SentimentChartProps {
  sentimentOverTime: SentimentPoint[];
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: SentimentPoint }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color =
    payload?.label === 'positive'
      ? '#34d399'
      : payload?.label === 'negative'
      ? '#f87171'
      : '#94a3b8';
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: SentimentPoint }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const color =
    p.label === 'positive' ? '#10b981' : p.label === 'negative' ? '#f43f5e' : '#9ca3af';
  return (
    <div className="bg-white border border-[#e5e2d8] rounded-xl p-3 text-xs shadow-md text-[#141416]">
      <p className="text-[#716f68] mb-1 font-mono">Message #{label}</p>
      <p className="capitalize font-semibold" style={{ color }}>
        {p.label} ({p.score > 0 ? '+' : ''}{p.score})
      </p>
      <p className="text-[#9ca3af] mt-0.5 capitalize">{p.sender}</p>
    </div>
  );
};

export const SentimentChart: React.FC<SentimentChartProps> = ({ sentimentOverTime }) => {
  // Sample for readability
  const maxPoints = 80;
  const step = Math.max(1, Math.ceil(sentimentOverTime.length / maxPoints));
  const chartData = sentimentOverTime.filter((_, i) => i % step === 0);

  const positiveCount = sentimentOverTime.filter((s) => s.label === 'positive').length;
  const negativeCount = sentimentOverTime.filter((s) => s.label === 'negative').length;
  const neutralCount = sentimentOverTime.filter((s) => s.label === 'neutral').length;
  const total = sentimentOverTime.length;

  return (
    <div className="rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm text-[#141416]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#141416]">Sentiment Trend</h3>
          <p className="text-xs text-[#716f68] mt-0.5">Tone of messages over the conversation</p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[#716f68]">
              {total > 0 ? Math.round((positiveCount / total) * 100) : 0}% positive
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span className="text-[#716f68]">
              {total > 0 ? Math.round((negativeCount / total) * 100) : 0}% negative
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#9ca3af] inline-block" />
            <span className="text-[#716f68]">
              {total > 0 ? Math.round((neutralCount / total) * 100) : 0}% neutral
            </span>
          </span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f2ec" vertical={false} />
            <XAxis
              dataKey="index"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-1, 1]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <ReferenceLine y={0} stroke="#e5e2d8" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#141416"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: '#141416' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
