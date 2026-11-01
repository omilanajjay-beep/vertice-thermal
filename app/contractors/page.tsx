import type { Metadata } from 'next';
import PageExperience from '../components/PageExperience';

export const metadata: Metadata = { title: 'For contractors — Built together | VERTICE THERMAL', alternates: { canonical: '/contractors' } };

export default function Page() { return <PageExperience page="contractors" />; }
