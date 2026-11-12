import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The After-Hours Leak — VERTICE THERMAL',
  description: 'An interactive HVAC field note about the calls local contractors miss after hours — and the 30-minute pipeline that recovers them.',
  applicationName: 'VERTICE THERMAL',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vertice-thermal.onrender.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'The After-Hours Leak — VERTICE THERMAL',
    description: 'A cinematic interactive book for local HVAC companies.',
    type: 'website',
    siteName: 'VERTICE THERMAL',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
