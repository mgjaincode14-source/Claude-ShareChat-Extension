import { UnifiedConversation } from './types';
import { parseClaudeConversationObject } from './parser';

export const SAMPLE_CLAUDE_CONVERSATIONS: UnifiedConversation[] = [
  parseClaudeConversationObject(
    {
      uuid: 'conv_sample_001_nextjs_architecture',
      name: 'Architecting High-Performance Next.js 15 Applications',
      created_at: '2026-08-23T09:15:00Z',
      updated_at: '2026-08-23T11:45:00Z',
      model: 'Claude 3.5 Sonnet',
      chat_messages: [
        {
          uuid: 'msg_001_1',
          sender: 'human',
          created_at: '2026-08-23T09:15:00Z',
          text: 'How do I optimize React Server Components (RSC) and streaming SSG in Next.js 15 App Router for a high-traffic dashboard?'
        },
        {
          uuid: 'msg_001_2',
          sender: 'assistant',
          created_at: '2026-08-23T09:16:30Z',
          text: `Optimizing Next.js 15 React Server Components requires a clean separation of static data fetching, async Server Components, and client boundary components.

### 1. Key Performance Strategies

1. **Parallel Data Fetching with \`Promise.all\`**: Avoid waterfall fetching inside nested async components.
2. **Streaming with \`<Suspense>\` Boundaries**: Render skeleton UI immediately while data resolves on the server.
3. **Selective Client Components**: Keep Client Components (\`'use client'\`) at the leaf nodes of your DOM tree to minimize bundle hydration size.

### Architecture Code Blueprint

\`\`\`tsx
import { Suspense } from 'react';
import MetricsCardSkeleton from '@/components/skeletons/MetricsCardSkeleton';
import AnalyticsChart from '@/components/client/AnalyticsChart';

// Server Component (Async)
async function MetricsWidget({ tenantId }: { tenantId: string }) {
  const metrics = await fetchTenantMetrics(tenantId);

  return (
    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-100">Live Traffic Volume</h3>
      <p className="text-3xl font-bold text-emerald-400 mt-2">
        {metrics.totalRequests.toLocaleString()} req/s
      </p>
      {/* Interactive client element hydrated independently */}
      <AnalyticsChart initialData={metrics.timeSeries} />
    </div>
  );
}

export default async function DashboardPage({ params }: { params: { tenantId: string } }) {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Tenant Analytics Dashboard</h1>
      <Suspense fallback={<MetricsCardSkeleton />}>
        <MetricsWidget tenantId={params.tenantId} />
      </Suspense>
    </main>
  );
}
\`\`\`

> **Pro Tip**: Use \`unstable_cache\` or \`fetch\` with explicit revalidation tags (\`next: { tags: ['metrics'] }\`) for fine-grained cache invalidation upon webhooks.`
        },
        {
          uuid: 'msg_001_3',
          sender: 'human',
          created_at: '2026-08-23T11:40:00Z',
          text: 'What about handling API keys securely when using third-party integrations like OpenAI or Anthropic in Next.js server actions?'
        },
        {
          uuid: 'msg_001_4',
          sender: 'assistant',
          created_at: '2026-08-23T11:45:00Z',
          text: `When executing server actions or API routes, environment variables must remain strictly server-side.

Never prefix secrets with \`NEXT_PUBLIC_\`.

\`\`\`env
# .env.local - SERVER ONLY (Secure)
# Example placeholders — do NOT commit real secrets
ANTHROPIC_API_KEY=[REDACTED_ANTHROPIC_API_KEY]
DATABASE_URL=postgresql://user:password@db.internal:5432/appdb
\`\`\`

Here is a secure server action example:

\`\`\`typescript
'use server';

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Access server-side secret safely
});

export async function generateSummary(prompt: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Server configuration error: Missing API Key');
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}
\`\`\``
        }
      ]
    },
    'claude_zip'
  ),

  parseClaudeConversationObject(
    {
      uuid: 'conv_sample_002_data_structures',
      name: 'Algorithm Optimization & Redundancy Reduction',
      created_at: '2026-08-25T14:20:00Z',
      updated_at: '2026-08-27T16:10:00Z',
      model: 'Claude 3.5 Sonnet',
      chat_messages: [
        {
          uuid: 'msg_002_1',
          sender: 'human',
          created_at: '2026-08-25T14:20:00Z',
          text: 'Can you write a TypeScript function that efficiently detects and redacts sensitive pattern matches (like API keys and emails) from a string?'
        },
        {
          uuid: 'msg_002_2',
          sender: 'assistant',
          created_at: '2026-08-25T14:22:15Z',
          text: `Here is a high-performance regex-based secret detection utility in TypeScript.

\`\`\`typescript
export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export const DEFAULT_RULES: RedactionRule[] = [
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-api\d{2}-[A-Za-z0-9\-_]{32,}/g,
    replacement: '[REDACTED_ANTHROPIC_KEY]'
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[A-Za-z0-9]{32,}/g,
    replacement: '[REDACTED_OPENAI_KEY]'
  },
  {
    name: 'Email Address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACTED_EMAIL]'
  }
];

export function sanitizeText(input: string, customRules = DEFAULT_RULES): string {
  let sanitized = input;
  for (const rule of customRules) {
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  }
  return sanitized;
}
\`\`\``
        },
        {
          uuid: 'msg_002_3',
          sender: 'human',
          created_at: '2026-08-27T16:00:00Z',
          text: 'We also need to redact user IP addresses and JWT tokens. Please update the rules.'
        },
        {
          uuid: 'msg_002_4',
          sender: 'assistant',
          created_at: '2026-08-27T16:10:00Z',
          text: `Here are the updated redaction patterns including IPv4/IPv6 addresses and JWT bearer tokens:

\`\`\`typescript
export const ENHANCED_RULES: RedactionRule[] = [
  ...DEFAULT_RULES,
  {
    name: 'IPv4 Address',
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[REDACTED_IP]'
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replacement: '[REDACTED_JWT]'
  }
];
\`\`\`

Tested against sample token: \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\` -> Safely masked!`
        }
      ]
    },
    'claude_zip'
  ),

  parseClaudeConversationObject(
    {
      uuid: 'conv_791d8870-1931-45eb-a7b7-3110f50c4940',
      name: 'Claude Selective Sharing Architecture & Strategy',
      created_at: '2026-08-23T10:00:00Z',
      updated_at: '2026-08-27T18:30:00Z',
      model: 'Claude 3.5 Sonnet',
      chat_messages: [
        {
          uuid: 'msg_791d_1',
          sender: 'human',
          created_at: '2026-08-23T10:00:00Z',
          text: 'How can we build a Claude conversation selective sharing tool that allows users to export specific dates, date ranges, and individual messages?'
        },
        {
          uuid: 'msg_791d_2',
          sender: 'assistant',
          created_at: '2026-08-23T10:02:15Z',
          text: `Building a **Claude Selective Sharing Tool** requires a modular 6-phase architecture:

### Key Feature Pillars

1. **Phase 1: Ingestion & Core Model**: Parse Claude Zip exports, shared URLs, raw text, and live DOM nodes into a standard \`UnifiedConversation\` data format.
2. **Phase 2: Selective Slicing Engine**:
   - Filter by **Entire Conversation**.
   - Filter by **Specific Date** (e.g. \`2026-08-23\` vs \`2026-08-27\`).
   - Filter by **Date Range** (\`2026-08-23\` to \`2026-08-27\`).
   - Filter by **Individual Messages** with context auto-linking.
3. **Phase 4: Privacy & Redaction**: Detect API keys, JWTs, emails, and credentials with interactive click-to-redact.
4. **Phase 6: Browser Extension**: Chrome Manifest V3 extension running directly on \`claude.ai\` for 1-click native ingestion!`
        },
        {
          uuid: 'msg_791d_3',
          sender: 'human',
          created_at: '2026-08-27T18:00:00Z',
          text: 'What happens when Cloudflare protects shared URLs against automated server requests?'
        },
        {
          uuid: 'msg_791d_4',
          sender: 'assistant',
          created_at: '2026-08-27T18:30:00Z',
          text: `When Cloudflare protects \`claude.ai/share/...\` against automated server scrapers:

1. **Web App Level**: We use a 1-click **Browser Import Bridge** that runs inside the user's browser where Cloudflare has already granted clearance.
2. **Extension Level**: The Manifest V3 extension runs natively inside the \`claude.ai\` tab with full access to the DOM and state!

\`\`\`typescript
export function sliceConversationByDate(messages: UnifiedMessage[], targetDate: string) {
  return messages.filter(m => m.dateString === targetDate);
}
\`\`\``
        }
      ]
    },
    'claude_share_link'
  ),

  parseClaudeConversationObject(
    {
      uuid: 'conv_sample_004_date_range_demo',
      name: 'Full Stack App Development & Deployment Log',
      created_at: '2026-08-15T08:00:00Z',
      updated_at: '2026-09-02T19:30:00Z',
      model: 'Claude 3.5 Sonnet',
      chat_messages: [
        {
          uuid: 'msg_aug15_1',
          sender: 'human',
          created_at: '2026-08-15T08:00:00Z',
          text: 'Let us initialize our new Next.js 15 project with Tailwind CSS and IndexedDB support.'
        },
        {
          uuid: 'msg_aug15_2',
          sender: 'assistant',
          created_at: '2026-08-15T08:05:00Z',
          text: 'Project initialized on **15-Aug-2026**. Configured Dexie.js for IndexedDB and Tailwind CSS theme system.'
        },
        {
          uuid: 'msg_aug20_1',
          sender: 'human',
          created_at: '2026-08-20T10:15:00Z',
          text: 'How should we handle selective slicing by date range?'
        },
        {
          uuid: 'msg_aug20_2',
          sender: 'assistant',
          created_at: '2026-08-20T10:20:00Z',
          text: 'Created `filterMessagesBySelection()` on **20-Aug-2026** supporting startDate and endDate filtering.'
        },
        {
          uuid: 'msg_aug28_1',
          sender: 'human',
          created_at: '2026-08-28T14:00:00Z',
          text: 'Let us verify redaction rules for JWT tokens and secret credentials.'
        },
        {
          uuid: 'msg_aug28_2',
          sender: 'assistant',
          created_at: '2026-08-28T14:10:00Z',
          text: 'Redaction engine rules updated on **28-Aug-2026**. Tested with sample API keys and secret bearer tokens.'
        },
        {
          uuid: 'msg_sep02_1',
          sender: 'human',
          created_at: '2026-09-02T19:25:00Z',
          text: 'Final check before creating our share link preview. Everything is ready!'
        },
        {
          uuid: 'msg_sep02_2',
          sender: 'assistant',
          created_at: '2026-09-02T19:30:00Z',
          text: 'Completed testing on **02-Sep-2026**. Full date span available: **15-Aug-2026 → 02-Sep-2026**.'
        }
      ]
    },
    'claude_zip'
  ),

  parseClaudeConversationObject(
    {
      uuid: 'conv_sample_005_cpu_scheduling',
      name: 'Operating System CPU Scheduling Assignment',
      created_at: '2026-08-24T18:46:00Z',
      updated_at: '2026-08-24T18:47:00Z',
      model: 'Claude 3.5 Sonnet',
      chat_messages: [
        {
          uuid: 'msg_aug24_user',
          sender: 'human',
          created_at: 'Aug 24, 2026, 6:46 PM',
          text: 'complete the assignment and also fulfill all the needs of the question',
          attachments: [
            {
              id: 'att_pdf_1',
              file_name: 'Assignment 3.pdf',
              file_size: 245000,
              file_type: 'application/pdf'
            }
          ]
        },
        {
          uuid: 'msg_aug24_claude',
          sender: 'assistant',
          created_at: 'Aug 24, 2026, 6:47 PM',
          text: `### Summary Table

| Algorithm | Avg TAT | Avg WT |
|---|---|---|
| Round Robin (Q=1) | 9.20 | 5.40 |
| SJF (Non-Preemptive) | 6.20 | 3.20 |
| SRTF (Preemptive) | 6.00 | 3.00 |

SRTF gives the **minimum average waiting time** among all scheduling algorithms, which is considered optimal for minimizing average WT.`
        }
      ]
    },
    'browser_extension'
  )
];
