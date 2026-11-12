import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERTEX — HVAC Response Systems',
  description: 'A crisp top-down studio field note about the calls local HVAC companies miss after hours.',
  applicationName: 'VERTEX',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vertice-thermal.onrender.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'VERTEX — HVAC Response Systems',
    description: 'A top-down interactive HVAC field note.',
    type: 'website',
    siteName: 'VERTEX',
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
