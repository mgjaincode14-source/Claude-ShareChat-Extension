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
    p.label === 'positive' ? '#34d399' : p.label === 'negative' ? '#f87171' : '#94a3b8';
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">Message #{label}</p>
      <p className="capitalize" style={{ color }}>
        {p.label} ({p.score > 0 ? '+' : ''}{p.score})
      </p>
      <p className="text-slate-500 mt-0.5 capitalize">{p.sender}</p>
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
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Sentiment Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tone of messages over the conversation</p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-slate-400">
              {total > 0 ? Math.round((positiveCount / total) * 100) : 0}% positive
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span className="text-slate-400">
              {total > 0 ? Math.round((negativeCount / total) * 100) : 0}% negative
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span className="text-slate-400">
              {total > 0 ? Math.round((neutralCount / total) * 100) : 0}% neutral
            </span>
          </span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="index"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-1, 1]}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: '#6366f1' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
