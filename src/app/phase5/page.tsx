import { AnalyticsDashboard } from '@/phase5/components/AnalyticsDashboard';

export const metadata = {
  title: 'Claude ShareChat — Phase 5: Conversation Analytics',
  description:
    'Deep analytics and conversation intelligence dashboard for your Claude conversations. Sentiment trends, topic clouds, code statistics, and activity heatmaps.',
};

export default function Phase5Page() {
  return <AnalyticsDashboard />;
}
