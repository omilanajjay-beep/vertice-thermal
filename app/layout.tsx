import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERTICE THERMAL — Precision Climate',
  description: 'Considered heating, cooling, installation and seasonal care. Explore precision climate systems with VERTICE THERMAL.',
  applicationName: 'VERTICE THERMAL',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vertice-thermal.onrender.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'VERTICE THERMAL — Precision Climate',
    description: 'Thoughtful heating and cooling, from the first site visit to the seasons ahead.',
    type: 'website',
    siteName: 'VERTICE THERMAL',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#11130f',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
