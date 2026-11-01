import type { Metadata } from 'next';
import StoryPage from '../../components/StoryPage';

export const metadata: Metadata = {
  title: 'Homeowner reviews | VERTICE THERMAL',
  description: 'Homeowner service experiences and visit details supplied for VERTICE THERMAL.',
  alternates: { canonical: '/company/verified-reviews.html' },
};

export default function VerifiedReviewsPage() {
  return <StoryPage page="reviews" />;
}
