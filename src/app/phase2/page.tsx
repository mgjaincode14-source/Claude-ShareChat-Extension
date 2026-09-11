import { Phase2Dashboard } from '@/phase2/components/Phase2Dashboard';

export const metadata = {
  title: 'Phase 2 — Selective Conversation Engine | Claude Selective Sharing',
  description: 'Filter Claude conversations by entire chat, specific date, date range, or individual messages with parent context auto-linking.'
};

export default function Phase2Page() {
  return <Phase2Dashboard />;
}
