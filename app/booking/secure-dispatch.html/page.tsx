import type { Metadata } from 'next';
import StoryPage from '../../components/StoryPage';

export const metadata: Metadata = {
  title: 'Book HVAC service | VERTICE THERMAL',
  description: 'Talk with Elena, review live appointment availability, and confirm the visit that works for you.',
  alternates: { canonical: '/booking/secure-dispatch.html' },
};

export default function SecureDispatchPage() {
  return <StoryPage page="booking" />;
}
