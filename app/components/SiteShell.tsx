'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Concierge from './Concierge';

const ChatContext = createContext<() => void>(() => {});
export const useOpenChat = () => useContext(ChatContext);

const navigation = [
  { href: '/equipment/diagnostics.html', label: 'The system' },
  { href: '/service/emergency-repair.html', label: 'Emergency care' },
  { href: '/case-studies/comfort-restored.html', label: 'Comfort restored' },
  { href: '/company/verified-reviews.html', label: 'Reviews' },
  { href: '/booking/secure-dispatch.html', label: 'Book a visit' },
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const requestSurvey = () => { setChatOpen(true); setMenuOpen(false); };
  const bookingPage = pathname === '/booking/secure-dispatch.html';

  return <ChatContext.Provider value={requestSurvey}>
    <div className="status-bar"><span><i className="status-indicator" /> RESIDENTIAL CLIMATE / ENGINEERED WITH INTENT</span><span className="status-right">THERMAL COMFORT, CONSIDERED <ArrowUpRight size={12} /></span></div>
    <nav className="site-nav" aria-label="Main navigation">
      <Link className="brand" href="/" onClick={() => setMenuOpen(false)} aria-label="VERTICE THERMAL home"><span className="brand-symbol">V</span><span className="brand-name">VERTICE<small>THERMAL</small></span></Link>
      <div id="primary-links" className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {navigation.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
      </div>
      <Link className="nav-cta" href="/booking/secure-dispatch.html" onClick={() => setMenuOpen(false)} aria-current={bookingPage ? 'page' : undefined}>Arrange a visit <ArrowUpRight size={15} /></Link>
      <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="primary-links" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </nav>
    {children}
    <footer className="site-footer"><Link className="brand" href="/"><span className="brand-symbol">V</span><span className="brand-name">VERTICE<small>THERMAL</small></span></Link><span className="footer-note">CLIMATE SYSTEMS / ARCHITECTURAL COMFORT</span><button onClick={requestSurvey}>Talk to Elena <ArrowUpRight size={14} /></button></footer>
    <Concierge open={chatOpen} setOpen={setChatOpen} spotlight={bookingPage} />
  </ChatContext.Provider>;
}
