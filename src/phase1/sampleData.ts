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
ANTHROPIC_API_KEY=sk-ant-api03-samplekey982347293847293847923847
DATABASE_URL=postgresql://admin:secretpass123@db.internal:5432/appdb
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
  )
];
