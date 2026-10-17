import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERTICE THERMAL | Architectural Climate Systems',
  description: 'Thoughtful heat-pump systems, service and contractor partnerships—considered as part of the architecture, not an afterthought.',
  applicationName: 'VERTICE THERMAL',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vertice-thermal.vercel.app'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'VERTICE THERMAL | Architectural Climate Systems',
    description: 'Comfort, quietly perfected.',
    type: 'website',
    siteName: 'VERTICE THERMAL',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0c0e',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
