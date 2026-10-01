import { Phase4Dashboard } from '@/phase4/components/Phase4Dashboard';

export const metadata = {
  title: 'Phase 4 — Shareable Web Snapshot Engine | Claude Selective Sharing',
  description: 'Generate immutable public web share links, custom slugs, iFrame embeds, and passcodes for selectively filtered Claude conversations.'
};

export default function Phase4Page() {
  return <Phase4Dashboard />;
}
