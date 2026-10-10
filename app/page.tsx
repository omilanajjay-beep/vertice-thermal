'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, Gauge, Menu, MessageCircle, Play, ShieldCheck, X } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero3D from './components/Hero3D';
import ServiceJourney3D from './components/ServiceJourney3D';

type ChatMessage = { role: 'assistant' | 'user'; text: string };

function MotionDirector() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set('[data-motion]', { opacity: 1, y: 0, x: 0, rotateX: 0, scale: 1 });
        return;
      }
      gsap.fromTo('.topbar, nav', { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' });
      gsap.fromTo('.hero-copy > *', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, delay: 0.25, ease: 'power3.out' });
      gsap.fromTo('.hero-visual', { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.4, delay: 0.2, ease: 'power3.out' });
      gsap.utils.toArray<HTMLElement>('[data-motion]').forEach((element) => {
        gsap.fromTo(element, { opacity: 0, y: 42, rotateX: 5 }, {
          opacity: 1, y: 0, rotateX: 0, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
        gsap.to(element, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: element, scrub: 1.2 } });
      });
      gsap.to('.marquee span', { xPercent: -7, ease: 'none', scrollTrigger: { trigger: '.marquee', scrub: 1 } });
      gsap.utils.toArray<HTMLElement>('.feature, .person, .review').forEach((element, index) => {
        gsap.fromTo(element, { x: index % 2 ? 24 : -24 }, { x: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } });
      });
    });
    return () => ctx.revert();
  }, []);
  return null;
}

function Concierge() {
  const sendLockRef = useRef(false);
  const sessionIdRef = useRef('');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Good evening. I’m Elena, your VERTICE dispatch concierge. May I start with your name?' }]);
  const [booked, setBooked] = useState('');
  const slots = ['Tomorrow, 09:30', 'Tomorrow, 13:00', 'Thursday, 16:30'];

  useEffect(() => {
    const key = 'vertice-concierge-session';
    const existing = window.sessionStorage.getItem(key);
    const id = existing || crypto.randomUUID();
    sessionIdRef.current = id;
    window.sessionStorage.setItem(key, id);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || sendLockRef.current) return;
    sendLockRef.current = true;
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, messages: next.map((message) => ({ role: message.role, content: message.text })) }),
      });
      const data = await response.json();
      const reply = typeof data.message === 'string' && data.message.trim() ? data.message.trim() : 'Please share the next detail when you are ready.';
      setMessages((current) => [...current, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'Elena is temporarily offline. Please leave your phone number and dispatch will follow up.' }]);
    } finally {
      sendLockRef.current = false;
      setSending(false);
    }
  };

  const book = async (slot: string) => {
    setBooked(slot);
    const response = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, sessionId: sessionIdRef.current, attendee: { email: process.env.NEXT_PUBLIC_DISPATCH_EMAIL } }),
    });
    const data = await response.json();
    if (data.bookingUrl && !data.ok) window.open(data.bookingUrl, '_blank', 'noopener,noreferrer');
    setMessages((current) => [...current, { role: 'assistant', text: data.ok ? `Perfect — I’ve held ${slot}. A confirmation is on its way.` : data.message }]);
  };

  return <>
    <button className="chat-launch" onClick={() => setOpen(true)}><span className="live-dot" /> <MessageCircle size={18} /> <span>Elena is online</span></button>
    {open && <div className="chat-drawer">
      <div className="chat-head"><div><span className="eyebrow">DISPATCH CONCIERGE</span><h3>Elena <span>• online</span></h3></div><button onClick={() => setOpen(false)} aria-label="Close concierge"><X size={18} /></button></div>
      <div className="chat-body">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>{message.text}</div>)}{sending && <div className="bubble assistant">Elena is typing…</div>}{messages.filter((message) => message.role === 'user').length >= 5 && !booked && <div className="slot-picker"><span className="eyebrow">SELECT A SURVEY WINDOW</span>{slots.map((slot) => <button key={slot} onClick={() => book(slot)}>{slot}<ArrowUpRight size={14} /></button>)}</div>}</div>
      <div className="chat-input"><input value={input} disabled={sending} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void send(); } }} placeholder={sending ? 'Elena is replying…' : 'Type your reply…'} /><button onClick={() => void send()} disabled={sending || !input.trim()} aria-label="Send message"><ArrowUpRight size={18} /></button></div>
    </div>}
  </>;
}

export default function Home() {
  const [monthly, setMonthly] = useState(3);
  const [menu, setMenu] = useState(false);
  const annual = 2500 * monthly + 1000 * monthly * 12;
  return <main>
    <div className="topbar"><span><span className="live-dot" /> SYSTEM STATUS: ALL NETWORKS NOMINAL</span><span className="topbar-right">SERVICE AREA: LONDON / SURREY / KENT <ArrowUpRight size={13} /></span></div>
    <nav><a className="wordmark" href="#top"><span className="mark">V</span><span>VERTICE<br /><em>THERMAL</em></span></a><div className={`navlinks ${menu ? 'show' : ''}`}><a href="#system">The system</a><a href="#team">Technicians</a><a href="#partners">For contractors</a><a href="#reviews">Field notes</a></div><button className="nav-cta" onClick={() => document.getElementById('partners')?.scrollIntoView({ behavior: 'smooth' })}>Book a survey <ArrowUpRight size={16} /></button><button className="menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X /> : <Menu />}</button></nav>
    <section className="hero" id="top"><div className="hero-copy"><span className="eyebrow">PRECISION CLIMATE SYSTEMS / 2025</span><h1>Quiet power.<br /><i>Precisely</i> engineered.</h1><p>Architectural heat-pump systems for spaces where comfort, silence and considered detail are non-negotiable.</p><div className="hero-actions"><button className="button primary" onClick={() => document.getElementById('system')?.scrollIntoView({ behavior: 'smooth' })}>Explore the system <ArrowUpRight size={16} /></button><button className="text-button"><Play size={14} fill="currentColor" /> Watch the 90s film</button></div><div className="hero-meta"><div><strong>01</strong><span>Heat pump<br />redefined</span></div><div><strong>42</strong><span>dB at<br />1 metre</span></div><div><strong>A+++</strong><span>Seasonal<br />efficiency</span></div></div></div><div className="hero-visual"><Hero3D /></div></section>
    <section className="marquee"><span>DESIGNED FOR THE ARCHITECTURE OF EVERYDAY LIFE</span><span>•</span><span>COMMISSIONED IN LONDON</span><span>•</span><span>BUILT FOR THE LONG TERM</span></section>
    <section className="journey-section"><ServiceJourney3D /></section>
    <section className="section system" id="system"><div className="section-intro" data-motion><span className="eyebrow">01 / THE SYSTEM</span><h2>Performance you<br /><i>don’t have to see.</i></h2><p>Every VERTICE system is commissioned as a whole: envelope, airflow, sound and the rhythm of the home considered together.</p><a className="arrow-link" href="#partners">View technical specification <ArrowUpRight size={16} /></a></div><div className="feature-list">{[['01', 'AeroBlade fan', 'Laminar airflow keeps the exterior unit calm — even at peak demand.'], ['02', 'Inverter intelligence', 'The compressor modulates in real time, using only the energy the room calls for.'], ['03', 'Copper core exchanger', 'Rapid thermal response, corrosion resistance and a 25-year serviceable architecture.']].map(([number, title, description]) => <div className="feature" data-motion key={number}><span className="feature-num">{number}</span><div><h3>{title}</h3><p>{description}</p></div><ChevronRight size={18} /></div>)}</div></section>
    <section className="section team" id="team"><div className="team-header" data-motion><div><span className="eyebrow">02 / THE PEOPLE</span><h2>Technical minds.<br /><i>Human hands.</i></h2></div><p>Installation is where performance becomes personal. Our licensed technicians bring a commissioning mindset to every room, roof and return visit.</p></div><div className="team-grid">{[['LM', 'Luca Moretti', 'Lead commissioning engineer', 'MCS / NATE certified'], ['AN', 'Aisha Noor', 'Controls & diagnostics', 'CIBSE / Daikin accredited'], ['JW', 'James Wren', 'Service & aftercare', 'MCS / Daikin accredited'], ['JW', 'James Wren', 'Service & aftercare', 'MCS / F-Gas certified']].slice(0,3).map(([initials, name, role, certification]) => <article className="person" data-motion key={name}><div className="person-photo"><span>{initials}</span><div className="person-index">{certification}</div></div><div className="person-info"><h3>{name}</h3><p>{role}</p><ArrowUpRight size={16} /></div></article>)}</div></section>
    <section className="partner-band" id="partners"><div className="partner-copy" data-motion><span className="eyebrow">03 / PARTNER WITH VERTICE</span><h2>A better margin<br /><i>for better work.</i></h2><p>Join the contractor network built for firms who care about the final 10%. We bring the system, the specification and the aftercare model. You bring the craft.</p><ul><li><Check size={15} /> Qualified lead flow, pre-scoped</li><li><Check size={15} /> White-label commissioning support</li><li><Check size={15} /> One predictable monthly retainer</li></ul></div><div className="calculator" data-motion data-parallax><div className="calc-top"><span>PARTNER MODEL / 2025</span><Gauge size={18} /></div><h3>Estimate your annual upside</h3><label>Active installations <strong>{monthly}</strong></label><input type="range" min="1" max="12" value={monthly} onChange={(event) => setMonthly(+event.target.value)} /><div className="range-labels"><span>1</span><span>12</span></div><div className="calc-total"><span>Estimated annual gross</span><strong>£{annual.toLocaleString()}</strong></div><div className="calc-detail"><span>Setup fees <b>£{(2500 * monthly).toLocaleString()}</b></span><span>Retainer value <b>£{(1000 * monthly * 12).toLocaleString()}</b></span></div><button className="button light">Request partner pack <ArrowUpRight size={16} /></button></div></section>
    <section className="section reviews" id="reviews"><div className="reviews-left" data-motion><span className="eyebrow">04 / FIELD NOTES</span><h2>Verified in<br /><i>the real world.</i></h2><div className="review-rating"><strong>4.9</strong><span>★★★★★<small>128 verified installs</small></span></div></div><div className="review-log">{[['MAY 24, 2025', '“The first system we’ve installed that feels like part of the architecture.”', 'N. HART / RESIDENTIAL'], ['APR 18, 2025', '“Clear specification, immaculate commissioning, no callbacks.”', 'W. & S. BUILDING CO. / TRADE'], ['MAR 02, 2025', '“The house is warmer, quieter and our bills are finally predictable.”', 'E. CLARKE / HOMEOWNER']].map(([date, quote, author]) => <div className="review" data-motion key={date}><span className="review-date">{date}</span><p>{quote}</p><span className="review-author"><ShieldCheck size={13} /> {author}</span></div>)}</div></section>
    <footer><a className="wordmark" href="#top"><span className="mark">V</span><span>VERTICE<br /><em>THERMAL</em></span></a><span>© 2025 VERTICE THERMAL SYSTEMS</span><span>PRIVACY / TERMS / INSTAGRAM</span></footer><MotionDirector /><Concierge />
  </main>;
}
