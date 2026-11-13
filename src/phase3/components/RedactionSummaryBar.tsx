'use client';

import React from 'react';
import Link from 'next/link';
import { RedactionOptions, RedactionStats } from '../types';
import { ShieldCheck, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface RedactionSummaryBarProps {
  options: RedactionOptions;
  stats: RedactionStats;
  /** href to navigate back to Phase 3 — defaults to '/phase3' */
  adjustHref?: string;
}

export const RedactionSummaryBar: React.FC<RedactionSummaryBarProps> = ({
  options,
  stats,
  adjustHref = '/phase3'
}) => {
  const hasMasks = stats.totalRedacted > 0;

  // Active filters list
  const activeGuards: string[] = [];
  if (options.redactApiKeys) activeGuards.push('API Keys');
  if (options.redactEmails) activeGuards.push('Emails');
  if (options.redactIpAddresses) activeGuards.push('IPs');
  if (options.redactPhoneNumbers) activeGuards.push('Phones');
  if (options.customKeywords.length > 0) activeGuards.push(`${options.customKeywords.length} Keywords`);
  if (options.anonymizeUser) activeGuards.push('User Hidden');
  if (options.anonymizeAssistant) activeGuards.push('AI Hidden');

  return (
    <div className="bg-white border border-[#e8e5dd] rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none">
      {/* Left: icon + redaction status */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#1f1e1d]">
        <div className="w-6 h-6 rounded-lg bg-[#faf1ec] border border-[#f0d5cb] flex items-center justify-center text-[#cc5a36] flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>

        <span className="font-medium">Privacy & Redactions</span>
        <span className="text-[#9e9b91]">·</span>

        {hasMasks ? (
          <>
            <span className="text-[#6b6963]">
              <span className="font-semibold text-[#1f1e1d]">{stats.totalRedacted}</span>
              {' sensitive item'}{stats.totalRedacted === 1 ? '' : 's'}{' masked'}
            </span>

            {/* Detailed item tags */}
            <div className="hidden sm:flex items-center gap-1.5">
              {stats.apiKeysCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb]">
                  {stats.apiKeysCount} Keys
                </span>
              )}
              {stats.emailsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb]">
                  {stats.emailsCount} Emails
                </span>
              )}
              {stats.ipsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb]">
                  {stats.ipsCount} IPs
                </span>
              )}
              {stats.keywordsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#faf1ec] text-[#b84b29] border border-[#f0d5cb]">
                  {stats.keywordsCount} Keywords
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">Clean conversation · Zero secrets detected</span>
          </span>
        )}

        {/* Style Tag */}
        <span className="text-[#9e9b91] hidden md:inline">·</span>
        <span className="text-[11px] text-[#8e8b82] font-mono hidden md:inline">
          Style: {options.replacementStyle === 'label' ? '[CONFIDENTIAL]' : '••••'}
        </span>
      </div>

      {/* Right: Adjust Redactions link */}
      <Link
        href={adjustHref}
        className="flex items-center space-x-1 text-xs text-[#6b6963] hover:text-[#1f1e1d] transition-colors duration-150 font-medium group"
      >
        <span>Adjust Redactions</span>
        <ArrowUpRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
};
