'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type?: 'success' | 'info' | 'warning' | 'clean';
  title: string;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 4500;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const duration = toast.duration || 4500;

  // Visual configuration mapped to Claude site theme
  const config = (() => {
    switch (toast.type) {
      case 'clean':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-700" />,
          iconBg: 'bg-emerald-50 border-emerald-200/80',
          badgeText: 'Clean',
          badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
          progressColor: 'bg-emerald-600',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" />,
          iconBg: 'bg-emerald-50 border-emerald-200/80',
          badgeText: 'Success',
          badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
          progressColor: 'bg-emerald-600',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-amber-700" />,
          iconBg: 'bg-amber-50 border-amber-200/80',
          badgeText: 'Notice',
          badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200/90',
          progressColor: 'bg-amber-600',
        };
      case 'info':
      default:
        return {
          icon: <Sparkles className="w-5 h-5 text-[#cc5a36]" />,
          iconBg: 'bg-[#faf1ec] border-[#f0d5cb]',
          badgeText: 'Protected',
          badgeStyle: 'bg-[#faf1ec] text-[#b84b29] border-[#f0d5cb]',
          progressColor: 'bg-[#cc5a36]',
        };
    }
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-3rem)] animate-claude-slide-right pointer-events-auto"
    >
      <div className="relative overflow-hidden bg-[#faf9f5]/95 border border-[#e8e5dd] rounded-2xl shadow-xl shadow-stone-900/8 p-4 flex items-start space-x-3.5 backdrop-blur-md text-[#1f1e1d]">
        {/* Icon box in site theme */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.iconBg}`}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 pr-2 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-claude-serif font-semibold text-xs sm:text-sm text-[#1f1e1d] tracking-tight leading-tight">
              {toast.title}
            </h4>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border uppercase tracking-wider ${config.badgeStyle}`}
            >
              {config.badgeText}
            </span>
          </div>
          <p className="text-xs text-[#6b6963] mt-1 leading-relaxed font-sans">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Dismiss notification"
          className="text-[#8e8b82] hover:text-[#1f1e1d] hover:bg-[#edeae3] transition-colors p-1 rounded-lg flex-shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Subtle timeout countdown indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8e5dd]/60 overflow-hidden">
          <div
            className={`h-full ${config.progressColor} transition-all origin-left`}
            style={{
              animation: `toastCountdown ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes toastCountdown {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};
