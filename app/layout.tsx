import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paper Worlds — A little flight. A world of wonder.',
  description: 'Follow a folded paper plane on one continuous, painterly flight through a meadow, an enchanted forest, and a world above the clouds.',
  applicationName: 'Paper Worlds',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vertice-thermal.onrender.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Paper Worlds — A little flight. A world of wonder.',
    description: 'An interactive storybook journey in Three.js.',
    type: 'website',
    siteName: 'Paper Worlds',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c8e5e1',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
