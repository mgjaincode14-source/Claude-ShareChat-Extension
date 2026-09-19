import { Phase3Dashboard } from '@/phase3/components/Phase3Dashboard';

export const metadata = {
  title: 'Phase 3 — Export & Privacy Redaction Suite | Claude Selective Sharing',
  description: 'Sanitize sensitive data, mask API keys, PII, anonymize senders, and export selective Claude conversations to Markdown, JSON, HTML, or Plain Text.'
};

export default function Phase3Page() {
  return <Phase3Dashboard />;
}
