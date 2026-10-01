'use client';

import React, { useEffect, useState } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  gradient: string; // Tailwind gradient classes
  description?: string;
  delay?: number;
}

function useCountUp(target: number, duration = 1000, delay = 0) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Reset to 0 then animate up — re-fires every time target changes
    setCurrent(0);
    if (target === 0) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setCurrent(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return current;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix = '',
  icon,
  gradient,
  description,
  delay = 0,
}) => {
  const displayed = useCountUp(value, 1000, delay);

  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden border border-white/5 ${gradient} shadow-lg`}>
      {/* Glow orb */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-xl bg-white/10 text-white/80">{icon}</div>
        </div>
        <div className="text-3xl font-bold text-white tracking-tight">
          {displayed.toLocaleString()}
          {suffix && <span className="text-lg font-normal text-white/60 ml-1">{suffix}</span>}
        </div>
        <div className="text-sm font-medium text-white/80 mt-1">{label}</div>
        {description && (
          <div className="text-xs text-white/50 mt-1 leading-relaxed">{description}</div>
        )}
      </div>
    </div>
  );
};

interface StatsGridProps {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalWords: number;
  avgUserWords: number;
  avgAssistantWords: number;
  longestMessageWords: number;
  codeBlockCount: number;
}

export const StatsCards: React.FC<StatsGridProps> = ({
  totalMessages,
  userMessages,
  assistantMessages,
  totalWords,
  avgUserWords,
  avgAssistantWords,
  longestMessageWords,
  codeBlockCount,
}) => {
  const stats: StatCardProps[] = [
    {
      label: 'Total Messages',
      value: totalMessages,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
      gradient: 'bg-gradient-to-br from-violet-700 to-violet-900',
      delay: 0,
    },
    {
      label: 'Your Messages',
      value: userMessages,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      gradient: 'bg-gradient-to-br from-sky-700 to-sky-900',
      delay: 80,
    },
    {
      label: 'Claude Replies',
      value: assistantMessages,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>,
      gradient: 'bg-gradient-to-br from-emerald-700 to-emerald-900',
      delay: 160,
    },
    {
      label: 'Total Words',
      value: totalWords,
      suffix: 'wds',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      gradient: 'bg-gradient-to-br from-amber-600 to-amber-900',
      delay: 240,
    },
    {
      label: 'Avg Your Words',
      value: avgUserWords,
      suffix: '/msg',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
      gradient: 'bg-gradient-to-br from-rose-700 to-rose-900',
      delay: 320,
    },
    {
      label: 'Avg Claude Words',
      value: avgAssistantWords,
      suffix: '/msg',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      gradient: 'bg-gradient-to-br from-teal-600 to-teal-900',
      delay: 400,
    },
    {
      label: 'Code Blocks Shared',
      value: codeBlockCount,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
      gradient: 'bg-gradient-to-br from-orange-600 to-orange-900',
      delay: 480,
    },
    {
      label: 'Longest Message',
      value: longestMessageWords,
      suffix: 'wds',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" /></svg>,
      gradient: 'bg-gradient-to-br from-pink-700 to-pink-900',
      delay: 560,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
};
