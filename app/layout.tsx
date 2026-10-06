import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERTICE THERMAL — Quiet power, precisely engineered.',
  description: 'Premium heat-pump systems, commissioning and contractor partnerships by VERTICE THERMAL.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
