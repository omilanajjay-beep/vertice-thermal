import type { Metadata } from 'next';
import PageExperience from '../components/PageExperience';

export const metadata: Metadata = { title: 'The system — Precision repair | VERTICE THERMAL', alternates: { canonical: '/system' } };

export default function Page() { return <PageExperience page="system" />; }
