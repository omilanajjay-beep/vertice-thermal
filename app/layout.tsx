import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PRINCE HVAC | Architectural Climate Systems',
  description: 'A world of comfort, built around you. Explore Prince HVAC cooling, heating and indoor air quality, then arrange a home assessment with Elena.',
  applicationName: 'PRINCE HVAC',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://prince-hvac.onrender.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'PRINCE HVAC | Architectural Climate Systems',
    description: 'One home. Every season. Cooling, heating and clean air by Prince HVAC.',
    type: 'website',
    siteName: 'PRINCE HVAC',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0c0e',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /></head><body>{children}</body></html>;
}
