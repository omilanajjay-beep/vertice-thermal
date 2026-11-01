import type { Metadata } from 'next';
import PageExperience from '../components/PageExperience';

export const metadata: Metadata = { title: 'Our approach — The expert arrives | VERTICE THERMAL', alternates: { canonical: '/approach' } };

export default function Page() { return <PageExperience page="approach" />; }
