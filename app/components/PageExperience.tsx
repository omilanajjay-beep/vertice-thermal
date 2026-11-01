'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MessageCircle, ShieldCheck } from 'lucide-react';
import PhotorealScene from './PhotorealScene';
import SiteMotion from './SiteMotion';
import ChatGuide from './ChatGuide';
import { useOpenChat } from './SiteShell';
import { ApproachDetails, ContractorDetails, ServiceDetails, SystemDetails } from './PageDetails';

type PageKey = 'home' | 'approach' | 'system' | 'service-log' | 'contact' | 'contractors';
const journey = [
  { href: '/', label: 'The hot home' },
  { href: '/approach', label: 'The expert arrives' },
  { href: '/system', label: 'The careful repair' },
  { href: '/service-log', label: 'Comfort restored' },
  { href: '/contact', label: 'Your next step' },
];
const pages = {
  home: { stage: 0, eyebrow: '01 / THE HOT HOME', title: 'When home', accent: 'feels too warm.', description: 'The room is still. The family is uncomfortable. When your cooling stops working, the right care makes all the difference.', next: '/approach', nextLabel: 'Meet your expert', detail: 'A warm evening. A system that needs attention.' },
  approach: { stage: 1, eyebrow: '02 / THE EXPERT ARRIVES', title: 'Good care starts', accent: 'at your door.', description: 'A prepared technician. A careful conversation. We start by understanding your home, your system, and what needs to feel better.', next: '/system', nextLabel: 'See the repair', detail: 'Thoughtful questions before tools come out.' },
  system: { stage: 2, eyebrow: '03 / THE CAREFUL REPAIR', title: 'Precision work.', accent: 'Lasting comfort.', description: 'A closer look at the system, a considered repair, and attention to the details that keep air moving. Care you can see—and feel.', next: '/service-log', nextLabel: 'Feel the difference', detail: 'A stylised repair study. Always assessed on site.' },
  'service-log': { stage: 3, eyebrow: '04 / COMFORT RESTORED', title: 'Back to being', accent: 'at home.', description: 'The air begins to move. The room feels calmer. The family settles back into their evening—the kind of comfort good service is meant to restore.', next: '/contact', nextLabel: 'Make it your story', detail: 'Cool airflow. A quieter, more comfortable evening.' },
  contact: { stage: 4, eyebrow: '05 / YOUR NEXT STEP', title: 'Your comfort.', accent: 'One chat away.', description: 'Follow our technician’s lead. The glowing chat button at the bottom right opens Elena, our live dispatch concierge. Tell her what your home needs.', next: '/', nextLabel: 'Back to the beginning', detail: 'The technician is pointing to your real chat button.' },
  contractors: { stage: 3, eyebrow: 'FOR CONTRACTORS / THE LONG VIEW', title: 'Better service.', accent: 'Built together.', description: 'A considered homeowner journey from first conversation to aftercare. Explore a clear partnership model for contractors who care about the whole experience.', next: '/contact', nextLabel: 'Discuss a partnership', detail: 'A service-led experience, from survey to aftercare.' },
} satisfies Record<PageKey, { stage: number; eyebrow: string; title: string; accent: string; description: string; next: string; nextLabel: string; detail: string }>;

export default function PageExperience({ page }: { page: PageKey }) {
  const data = pages[page];
  const openChat = useOpenChat();
  return <main className={`journey-page page-${page}`}>
    <section className="hero journey-hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <span className="eyebrow">{data.eyebrow}</span>
        <h1 id="page-title">{data.title}<br /><i>{data.accent}</i></h1>
        <p>{data.description}</p>
        <div className="hero-actions">
          {page === 'contact' ? <button className="button button-gold final-chat-cta" onClick={openChat}>Open Elena’s chat <MessageCircle size={17} /></button> : <Link className="button button-gold" href={data.next}>{data.nextLabel} <ArrowUpRight size={15} /></Link>}
          <button className="quiet-link" onClick={openChat}>{page === 'contact' ? 'Request a home survey' : 'Talk to Elena'} <ArrowRight size={15} /></button>
        </div>
        <div className="scene-context"><span className="context-line" /><span>{data.detail}</span></div>
      </div>
      <div className="hero-visual"><PhotorealScene key={page} stageIndex={data.stage} /></div>
    </section>
    <nav className="journey-navigation" aria-label="The five-page comfort story">
      {journey.map(({ href, label }, index) => <Link key={href} href={href} aria-current={page !== 'contractors' && data.stage === index ? 'page' : undefined}><span>0{index + 1}</span><b>{label}</b><ArrowUpRight size={12} /></Link>)}
    </nav>
    {page === 'home' && <section className="home-bridge"><span className="eyebrow">A MORE CONSIDERED KIND OF COMFORT</span><h2>Not just a system.<br /><i>A home, feeling right.</i></h2><p>Follow the journey across five pages. Each moment is part of the same story: a family, a skilled expert, and comfort brought back with care.</p><Link className="quiet-link" href="/approach">Continue to the arrival <ArrowRight size={16} /></Link></section>}
    {page === 'approach' && <ApproachDetails />}
    {page === 'system' && <SystemDetails />}
    {page === 'service-log' && <ServiceDetails />}
    {page === 'contractors' && <ContractorDetails />}
    {page === 'contact' && <><ChatGuide /><section className="contact-details"><div><span className="eyebrow">MEET ELENA / YOUR DISPATCH CONCIERGE</span><h2>A real next step.<br /><i>Not just a scene.</i></h2><p>Share your name, contact details, address and what needs attention. Elena will help you view available visit times and review your details before you confirm.</p></div><div className="contact-action-panel"><MessageCircle size={29} strokeWidth={1.3} /><h3>Let’s talk about your home.</h3><p>No appointment is booked until you choose a time and confirm.</p><button className="button button-gold" onClick={openChat}>Talk to Elena <ArrowUpRight size={16} /></button><small><ShieldCheck size={13} /> Your existing secure booking flow.</small></div></section></>}
    <section className="page-next"><span>{page === 'contact' ? 'THE JOURNEY CONTINUES WITH YOU' : 'NEXT IN THE COMFORT STORY'}</span><Link href={data.next}>{data.nextLabel} <ArrowRight size={20} /></Link></section>
    <SiteMotion />
  </main>;
}
