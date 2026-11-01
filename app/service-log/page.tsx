import type { Metadata } from 'next';
import PageExperience from '../components/PageExperience';

export const metadata: Metadata = { title: 'Service log — Comfort restored | VERTICE THERMAL', alternates: { canonical: '/service-log' } };

export default function Page() { return <PageExperience page="service-log" />; }
