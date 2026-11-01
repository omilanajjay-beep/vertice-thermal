import type { Metadata } from 'next';
import PageExperience from './components/PageExperience';

export const metadata: Metadata = { title: 'Home comfort, restored | VERTICE THERMAL', alternates: { canonical: '/' } };

export default function Page() { return <PageExperience page="home" />; }
