import { Phase1Dashboard } from '@/phase1/components/Phase1Dashboard';

export const metadata = {
  title: 'Claude Selective Sharing Tool',
  description: 'Selectively share, redact, and export portions of your Anthropic Claude conversations.'
};

export default function Home() {
  return <Phase1Dashboard />;
}
