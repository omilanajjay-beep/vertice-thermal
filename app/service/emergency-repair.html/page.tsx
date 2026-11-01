import type { Metadata } from 'next';
import StoryPage from '../../components/StoryPage';

export const metadata: Metadata = {
  title: 'Emergency HVAC repair | VERTICE THERMAL',
  description: 'When home comfort slips, get clear next steps and careful HVAC service.',
  alternates: { canonical: '/service/emergency-repair.html' },
};

export default function EmergencyRepairPage() {
  return <StoryPage page="repair" />;
}
