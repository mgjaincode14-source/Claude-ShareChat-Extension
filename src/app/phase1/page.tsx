import { Phase1Dashboard } from '@/phase1/components/Phase1Dashboard';

export const metadata = {
  title: 'Phase 1 — Claude Data & Core Processing | Selective Share',
  description: 'Import, parse, store, and view Anthropic Claude conversation export files locally.'
};

export default function Phase1Page() {
  return <Phase1Dashboard />;
}
