import type { Metadata } from 'next';
import StoryPage from '../../components/StoryPage';

export const metadata: Metadata = {
  title: 'HVAC diagnostics | VERTICE THERMAL',
  description: 'Clear system diagnostics and considered home-comfort service from VERTICE THERMAL.',
  alternates: { canonical: '/equipment/diagnostics.html' },
};

export default function DiagnosticsPage() {
  return <StoryPage page="diagnostics" />;
}
