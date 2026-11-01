import type { Metadata } from 'next';
import PageExperience from '../components/PageExperience';

export const metadata: Metadata = { title: 'Talk to Elena — Your next step | VERTICE THERMAL', alternates: { canonical: '/contact' } };

export default function Page() { return <PageExperience page="contact" />; }
