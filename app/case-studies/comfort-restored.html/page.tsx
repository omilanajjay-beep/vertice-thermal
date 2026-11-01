import type { Metadata } from 'next';
import StoryPage from '../../components/StoryPage';

export const metadata: Metadata = {
  title: 'Comfort restored | VERTICE THERMAL',
  description: 'A family home returns to quiet, even comfort after thoughtful HVAC service.',
  alternates: { canonical: '/case-studies/comfort-restored.html' },
};

export default function ComfortRestoredPage() {
  return <StoryPage page="comfort" />;
}
