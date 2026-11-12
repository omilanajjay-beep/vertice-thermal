import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERTICE THERMAL — HVAC Response Systems',
  description: 'A field briefing for local HVAC owners on after-hours calls, lead response, and recovered revenue.',
  applicationName: 'VERTICE THERMAL',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vertice-thermal.onrender.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'VERTICE THERMAL — HVAC Response Systems',
    description: 'An exclusive breakdown for US HVAC owners.',
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
