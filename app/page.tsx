'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Fan,
  MapPin,
  Menu,
  MessageCircle,
  Send,
  ShieldCheck,
  Snowflake,
  Wrench,
  X,
} from 'lucide-react';
import SiteMotion from './components/SiteMotion';
import Hero3D from './components/Hero3D';

type Role = 'assistant' | 'user';
type ChatMessage = { role: Role; text: string };
type IntakeStep = 'name' | 'phone' | 'email' | 'address' | 'problem';
type Intake = Record<IntakeStep, string>;
type AvailableSlot = { start: string; end?: string; date: string };

const intakeFields: IntakeStep[] = ['name', 'phone', 'email', 'address', 'problem'];
const emptyIntake: Intake = { name: '', phone: '', email: '', address: '', problem: '' };

function localDateInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`;
}

function formatSlotTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(value));
}

function formatSlotDay(value: string, timeZone: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function Concierge({ open, setOpen }: { open: boolean; setOpen: (next: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi, I’m Elena, VERTICE’s virtual dispatch assistant. I can help arrange an HVAC visit. What’s your name?' },
  ]);
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotUnavailable, setSlotUnavailable] = useState(false);
  const [consented, setConsented] = useState(false);
  const [booked, setBooked] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const grouped = useMemo(() => slots.reduce<Record<string, AvailableSlot[]>>((days, slot) => {
    days[slot.date] ??= [];
    days[slot.date].push(slot);
    return days;
  }, {}), [slots]);

  const loadSlots = async () => {
    setSlotUnavailable(false);
    const first = shiftDate(localDateInZone(new Date(), timeZone), 1);
    const last = shiftDate(first, 13);
    try {
      const query = new URLSearchParams({ start: first, end: last, timeZone });
      const response = await fetch(`/api/slots?${query.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.slots)) throw new Error('availability-unavailable');
      setSlots(data.slots);
      setSlotUnavailable(data.slots.length === 0);
    } catch {
      setSlotUnavailable(true);
    }
  };

  const send = async () => {
    const answer = input.trim();
    if (!answer || busy || step >= intakeFields.length) return;
    const field = intakeFields[step];
    const withUser: ChatMessage[] = [...messages, { role: 'user', text: answer }];
    setMessages(withUser);
    setInput('');
    setBusy(true);

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: field, answer, completedFields: intakeFields.slice(0, step), website: honeypot }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'I could not process that just now. Please try again.');
      if (typeof data.reply !== 'string' || typeof data.accepted !== 'boolean' || (data.accepted && typeof data.value !== 'string')) {
        throw new Error('I couldn’t save that detail. Could you try again?');
      }
      const nextMessages: ChatMessage[] = [...withUser, { role: 'assistant', text: data.reply }];
      setMessages(nextMessages);
      if (!data.accepted) return;
      setIntake((current) => ({ ...current, [field]: data.value }));
      if (data.complete) {
        setStep(intakeFields.length);
        await loadSlots();
        return;
      }
      setStep(step + 1);
    } catch (error) {
      setMessages([...withUser, { role: 'assistant', text: error instanceof Error ? error.message : 'Please try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !consented || busy || booked) return;
    setBusy(true);
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: selectedSlot, timeZone, attendee: intake }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'That time could not be reserved. Please choose another slot.');
      setBooked(true);
      setMessages((current) => [...current, {
        role: 'assistant',
        text: data.emailWarning
          ? 'Your appointment is reserved. One of the confirmation emails could not be sent, so dispatch will need to follow up.'
          : 'Your appointment is confirmed. A confirmation email has been sent to you and the on-call technician.',
      }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'Please try another time.' }]);
      setSelectedSlot('');
      await loadSlots();
    } finally {
      setBusy(false);
    }
  };

  return <>
    {!open && <button className="chat-launcher" onClick={() => setOpen(true)} aria-label="Open Elena, the HVAC dispatch concierge">
      <span className="launcher-status" aria-hidden="true" />
      <MessageCircle size={17} strokeWidth={1.7} />
      <span>Speak with Elena</span>
      <ArrowUpRight size={15} className="launcher-arrow" />
    </button>}
    {open && <aside className="chat-drawer" aria-label="Elena concierge chat">
      <header className="chat-header">
        <div className="concierge-avatar" aria-hidden="true"><Snowflake size={18} /></div>
        <div className="chat-title"><span className="eyebrow">DISPATCH CONCIERGE</span><h2>Elena <span className="online-label"><i /> ready</span></h2></div>
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
      </header>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>{message.text}</div>)}
        {busy && <div className="chat-bubble assistant typing"><span /><span /><span /></div>}
        {step === intakeFields.length && !busy && !booked && <div className="appointment-panel">
          <div className="appointment-title"><CalendarDays size={15} /><span>AVAILABLE VISIT TIMES</span></div>
          <label className="booking-name">Guest name
            <input value={intake.name} onChange={(event) => setIntake((current) => ({ ...current, name: event.target.value }))} maxLength={80} autoComplete="name" aria-label="Guest name for your appointment" />
          </label>
          {slotUnavailable ? <p className="slot-empty">Live appointment times are not available right now. Please try again later.</p> : <>
            {Object.entries(grouped).map(([date, daySlots]) => <div className="slot-day" key={date}>
              <span className="slot-day-label">{formatSlotDay(date, timeZone)}</span>
              <div className="slot-grid">{daySlots.map((slot) => <button key={slot.start} className={`slot-choice ${selectedSlot === slot.start ? 'selected' : ''}`} onClick={() => setSelectedSlot(slot.start)} disabled={busy}>{formatSlotTime(slot.start, timeZone)}</button>)}</div>
            </div>)}
            <div className="timezone-note"><Clock3 size={12} /> Times shown in {timeZone}</div>
            <label className="consent-line"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /> <span>Share these details with our booking and email providers to arrange this visit.</span></label>
            <button className="confirm-slot" onClick={() => void confirmBooking()} disabled={!selectedSlot || !consented || busy}>{busy ? 'Confirming…' : 'Confirm appointment'}<ArrowRight size={15} /></button>
          </>}
        </div>}
        {booked && <div className="booking-confirmation"><BadgeCheck size={18} /><span>Appointment confirmed</span></div>}
      </div>
      {step < intakeFields.length && <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></label>
        <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={step === 4 ? 800 : 240} placeholder={busy ? 'Elena is replying…' : 'Write a reply'} aria-label="Your reply" disabled={busy} />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send reply"><Send size={16} /></button>
      </form>}
      <p className="chat-footnote">Your contact details are used to arrange your visit. You can check your guest name before confirming.</p>
    </aside>}
  </>;
}

export default function Home() {
  const [partnerCount, setPartnerCount] = useState(3);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const setupTotal = partnerCount * 2500;
  const monthlyTotal = partnerCount * 1000;
  const firstYearTotal = setupTotal + monthlyTotal * 12;

  const requestSurvey = () => {
    setChatOpen(true);
    setMenuOpen(false);
  };

  return <main className="min-h-screen bg-ink text-paper">
    <div className="status-bar"><span><i className="status-indicator" /> RESIDENTIAL CLIMATE / ENGINEERED WITH INTENT</span><span className="status-right">THERMAL COMFORT, CONSIDERED <ArrowUpRight size={12} /></span></div>
    <nav className="site-nav" aria-label="Main navigation">
      <a className="brand" href="#top" aria-label="VERTICE THERMAL home"><span className="brand-symbol">V</span><span className="brand-name">VERTICE<small>THERMAL</small></span></a>
      <div id="primary-links" className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <a onClick={() => setMenuOpen(false)} href="#system">The system</a>
        <a onClick={() => setMenuOpen(false)} href="#team">Our approach</a>
        <a onClick={() => setMenuOpen(false)} href="#partners">For contractors</a>
        <a onClick={() => setMenuOpen(false)} href="#reviews">Service log</a>
      </div>
      <button className="nav-cta" onClick={requestSurvey}>Request a survey <ArrowUpRight size={15} /></button>
      <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="primary-links" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </nav>

    <section className="hero" id="top">
      <div className="hero-copy">
        <span className="eyebrow">CLIMATE SYSTEMS / A CLOSER LOOK</span>
        <h1>Comfort,<br /><i>quietly</i> perfected.</h1>
        <p>Thoughtful heat-pump systems, considered as part of the architecture—not an afterthought outside it.</p>
        <div className="hero-actions"><button className="button button-gold" onClick={() => document.getElementById('system')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>Explore the system <ArrowUpRight size={15} /></button><button className="quiet-link" onClick={requestSurvey}>Arrange a conversation <ArrowRight size={15} /></button></div>
        <div className="hero-facts"><div><span>01</span><small>Inverter-led<br />performance</small></div><div><span>02</span><small>Designed for<br />quiet operation</small></div><div><span>03</span><small>Serviceable<br />by design</small></div></div>
      </div>
      <div className="hero-visual"><Hero3D /><div className="visual-label"><span>PRODUCT STUDY / OUTDOOR UNIT</span><span>INTERACTIVE 3D VIEW</span></div></div>
      <a className="scroll-cue" href="#system"><span>SCROLL TO EXPLORE</span><ArrowDownRight size={15} /></a>
    </section>

    <section className="manifesto" aria-label="Design principle"><span>FORM FOLLOWS COMFORT</span><i /> <span>QUIETLY BUILT INTO THE HOME</span><i /> <span>DESIGNED FOR THE LONG VIEW</span></section>

    <section className="section system-section" id="system">
      <div className="section-heading" data-reveal><span className="eyebrow">01 / THE SYSTEM</span><h2>Engineering you<br /><i>feel, not hear.</i></h2><p>Every component has a role in the whole: steady output, clean airflow and a system that can be understood and serviced over time.</p></div>
      <div className="feature-stack">
        <article className="feature-row" data-reveal><span className="feature-index">01</span><div className="feature-icon"><Fan size={19} /></div><div><h3>AeroBlade fan</h3><p>Airflow shaped to move efficiently and keep the outdoor unit visually composed.</p></div><ChevronRight size={17} className="feature-chevron" /></article>
        <article className="feature-row" data-reveal><span className="feature-index">02</span><div className="feature-icon"><Snowflake size={19} /></div><div><h3>Inverter compressor</h3><p>Output modulates with demand instead of cycling at a single fixed rate.</p></div><ChevronRight size={17} className="feature-chevron" /></article>
        <article className="feature-row" data-reveal><span className="feature-index">03</span><div className="feature-icon"><Wrench size={19} /></div><div><h3>Copper core exchanger</h3><p>A considered thermal pathway, designed for dependable service access.</p></div><ChevronRight size={17} className="feature-chevron" /></article>
        <div className="system-note"><ShieldCheck size={15} /><span>Performance and equipment selection depend on the property, climate and a proper site assessment.</span></div>
      </div>
    </section>

    <section className="team-section" id="team">
      <div className="team-intro" data-reveal><div><span className="eyebrow">02 / THE PEOPLE</span><h2>Good work begins<br /><i>with good questions.</i></h2></div><p>A responsible visit starts with listening, checking the property and matching the work to the right local specialist.</p></div>
      <div className="service-cards">
        <article className="service-card" data-reveal data-depth><span className="card-number">01 / ASSESS</span><div className="service-glyph"><MapPin size={21} /></div><h3>Survey &amp; sizing</h3><p>Understand the home, existing equipment and the comfort you want to achieve.</p><span className="card-rule" /></article>
        <article className="service-card" data-reveal data-depth><span className="card-number">02 / INSTALL</span><div className="service-glyph"><Wrench size={21} /></div><h3>Installation &amp; commissioning</h3><p>Plan the system around access, airflow, controls and the character of the property.</p><span className="card-rule" /></article>
        <article className="service-card" data-reveal data-depth><span className="card-number">03 / CARE</span><div className="service-glyph"><Clock3 size={21} /></div><h3>Service &amp; aftercare</h3><p>Keep the system understandable, maintainable and supported after handover.</p><span className="card-rule" /></article>
      </div>
      <div className="directory-note" data-reveal><BadgeCheck size={16} /><p><strong>Technician directory</strong><br />Individual profiles are published only when licensing and service-area details have been verified. No technician credentials are represented here without supporting records.</p><button onClick={requestSurvey}>Ask about a visit <ArrowUpRight size={14} /></button></div>
    </section>

    <section className="partner-section" id="partners">
      <div className="partner-copy" data-reveal><span className="eyebrow">03 / FOR CONTRACTORS</span><h2>Build a better<br /><i>service model.</i></h2><p>A clear setup and predictable recurring support model for contractors who want a considered customer experience from first survey through aftercare.</p><ul><li><Check size={15} /> A defined setup engagement</li><li><Check size={15} /> A consistent monthly retainer</li><li><Check size={15} /> A service-led homeowner journey</li></ul><button className="partner-link" onClick={requestSurvey}>Discuss partnership <ArrowUpRight size={15} /></button></div>
      <div className="calculator glass-panel" data-reveal data-depth>
        <div className="calc-top"><span>PARTNER REVENUE MODEL</span><span className="calc-mark">V / 01</span></div>
        <h3>Estimate contracted revenue</h3>
        <label className="range-label" htmlFor="partner-count">Contractor accounts <strong>{partnerCount}</strong></label>
        <input id="partner-count" type="range" min="1" max="12" step="1" value={partnerCount} onChange={(event) => setPartnerCount(Number(event.target.value))} />
        <div className="range-ends"><span>1 account</span><span>12 accounts</span></div>
        <div className="calc-primary"><span>Estimated first-year gross</span><strong>${firstYearTotal.toLocaleString('en-US')}</strong></div>
        <div className="calc-breakdown"><div><span>One-time setup</span><b>${setupTotal.toLocaleString('en-US')}</b></div><div><span>Monthly retainer</span><b>${monthlyTotal.toLocaleString('en-US')} / mo</b></div></div>
        <p className="calc-disclaimer">Illustrative contracted revenue before delivery costs. Assumes each account pays $2,500 setup and $1,000 per month for 12 months.</p>
        <button className="button button-light" onClick={requestSurvey}>Request partnership details <ArrowUpRight size={15} /></button>
      </div>
    </section>

    <section className="reviews-section" id="reviews">
      <div className="reviews-intro" data-reveal><span className="eyebrow">04 / SERVICE LOG</span><h2>Proof should<br /><i>be verifiable.</i></h2><p>Every published review should belong to a real visit and a real homeowner.</p></div>
      <div className="review-empty glass-panel" data-reveal data-depth><span className="review-seal"><ShieldCheck size={23} /></span><span className="eyebrow">VERIFIED SERVICE NOTES</span><h3>Only the real thing.</h3><p>Reviews will appear here once completed service records and homeowner permission are confirmed. No testimonial or rating is invented for this page.</p><button onClick={requestSurvey}>Start a service request <ArrowUpRight size={15} /></button></div>
    </section>

    <section className="closing-band" data-reveal><div><span className="eyebrow">A MORE CONSIDERED KIND OF COMFORT</span><h2>Let’s start with<br /><i>your home.</i></h2></div><button className="button button-gold" onClick={requestSurvey}>Request a home survey <ArrowUpRight size={15} /></button></section>

    <footer className="site-footer"><a className="brand" href="#top"><span className="brand-symbol">V</span><span className="brand-name">VERTICE<small>THERMAL</small></span></a><span className="footer-note">CLIMATE SYSTEMS / ARCHITECTURAL COMFORT</span><button onClick={requestSurvey}>Talk to Elena <ArrowUpRight size={14} /></button></footer>

    <SiteMotion />
    <Concierge open={chatOpen} setOpen={setChatOpen} />
  </main>;
}
