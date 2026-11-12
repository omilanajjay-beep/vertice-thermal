'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { IntakeStep } from '../lib/intake';

type Slide = {
  id: number;
  type?: 'cover';
  badge?: string;
  headline?: string;
  subtext?: string;
  cta?: string;
  chapter?: string;
  title?: string;
  body?: string;
  metric?: string;
  metricLabel?: string;
};

type ChatMessage = { role: 'assistant' | 'user'; text: string };
type Answers = Partial<Record<IntakeStep, string>>;
type CalSlot = { start: string; end?: string; date: string };
type ChatPhase = 'intake' | 'loading-slots' | 'slots' | 'booking' | 'booked';

const slides: Slide[] = [
  {
    id: 1,
    type: 'cover',
    badge: 'HVAC RESPONSE SYSTEMS — FIELD NOTE / 01',
    headline: 'The After-Hours Leak: How Local HVAC Companies Lose $5,000+ Every Month (And How to Fix It in 30 Minutes).',
    subtext: 'An exclusive breakdown for US HVAC owners.',
    cta: 'Start Briefing',
  },
  {
    id: 2,
    chapter: '01',
    title: 'The 11:00 PM Emergency',
    body: "A homeowner's AC breaks down late at night. They dial your number, but it rings straight out to voicemail because your team is asleep.",
    metric: '11:00 PM',
    metricLabel: 'Unanswered Call Window',
  },
  {
    id: 3,
    chapter: '02',
    title: 'The Direct Loss',
    body: 'Because nobody answered, a lucrative repair job and a lifelong customer walk straight to your nearest competitor who picked up on the first ring.',
    metric: '100%',
    metricLabel: 'Captured by Competitor',
  },
  {
    id: 4,
    chapter: '03',
    title: 'The 24/7 AI Receptionist',
    body: 'While you sleep, our automated pipeline engages incoming leads instantly, qualifies their problem, and locks bookings directly onto your calendar.',
    metric: 'Instant',
    metricLabel: 'Response Time (0s Delay)',
  },
  {
    id: 5,
    chapter: '04',
    title: 'Revenue Recovery',
    body: 'Turn missed after-hours calls into booked work. Lock in an extra $5,400+ in monthly revenue without hiring extra staff.',
    metric: '+$5,400',
    metricLabel: 'Estimated Monthly Recovery',
    cta: 'Claim Your Custom 30-Minute Pipeline Demo For Your HVAC Business',
  },
];

const intakeSteps: IntakeStep[] = ['name', 'phone', 'email', 'address', 'problem'];
const stepLabels: Record<IntakeStep, string> = {
  name: 'name',
  phone: 'phone number',
  email: 'email address',
  address: 'property address',
  problem: 'heating or cooling issue',
};

function getTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

function dateInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function formatSlot(start: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(start));
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi, I’m Elena with VERTICE. I can help coordinate a visit. What name should I use?' },
  ]);
  const [step, setStep] = useState<IntakeStep>('name');
  const [answers, setAnswers] = useState<Answers>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<ChatPhase>('intake');
  const [slots, setSlots] = useState<CalSlot[]>([]);
  const [timeZone, setTimeZone] = useState('UTC');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && phase === 'intake') inputRef.current?.focus();
  }, [open, phase, step]);

  useEffect(() => {
    if (open && transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [open, messages, phase, slots.length]);

  const loadAvailability = async (zone: string) => {
    setPhase('loading-slots');
    setBookingError('');
    setSelectedSlot('');
    try {
      const start = dateInTimeZone(new Date(), zone);
      const end = addCalendarDays(start, 13);
      const query = new URLSearchParams({ start, end, timeZone: zone });
      const response = await fetch(`/api/slots?${query.toString()}`, { cache: 'no-store' });
      const data = await response.json() as { slots?: CalSlot[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Live appointment times could not be loaded.');
      const liveSlots = Array.isArray(data.slots) ? data.slots : [];
      setSlots(liveSlots);
      setPhase('slots');
      if (liveSlots.length) setMessages((current) => [...current, { role: 'assistant', text: 'Here are the upcoming live visit times. Choose one that works for you.' }]);
      else setBookingError('There are no online visit times in the next two weeks. Please try again later.');
    } catch (error) {
      setSlots([]);
      setPhase('slots');
      setBookingError(error instanceof Error ? error.message : 'Live appointment times could not be loaded. Please try again.');
    }
  };

  const submitIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = input.trim();
    if (!answer || busy || phase !== 'intake') return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: answer }]);
    setBusy(true);
    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, answer, website: '', knownName: answers.name || '', completedFields: Object.keys(answers) }),
      });
      const data = await response.json() as { accepted?: boolean; value?: string; reply?: string; complete?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || 'Please check that reply and try again.');
      if (data.reply) setMessages((current) => [...current, { role: 'assistant', text: data.reply! }]);
      if (!data.accepted) return;
      const nextAnswers = { ...answers, [step]: data.value || answer };
      setAnswers(nextAnswers);
      if (data.complete) {
        const zone = getTimeZone();
        setTimeZone(zone);
        await loadAvailability(zone);
      } else {
        const next = intakeSteps[intakeSteps.indexOf(step) + 1];
        if (next) setStep(next);
      }
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'Please try that reply again.' }]);
    } finally {
      setBusy(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedSlot || bookingBusy || !answers.name || !answers.phone || !answers.email || !answers.address || !answers.problem) return;
    setBookingBusy(true);
    setBookingError('');
    setPhase('booking');
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: selectedSlot,
          timeZone,
          website: '',
          attendee: {
            name: answers.name,
            phone: answers.phone,
            email: answers.email,
            address: answers.address,
            problem: answers.problem,
          },
        }),
      });
      const data = await response.json() as { ok?: boolean; bookingId?: string | null; error?: string };
      if (!response.ok) {
        setPhase('slots');
        setBookingError(data.error || 'The appointment could not be confirmed. Please choose another time.');
        if (response.status === 409) await loadAvailability(timeZone);
        return;
      }
      setBookingId(data.bookingId || '');
      setPhase('booked');
      setMessages((current) => [...current, { role: 'assistant', text: `You’re booked, ${answers.name}. Cal.com will handle your appointment confirmation email.` }]);
    } catch {
      setPhase('slots');
      setBookingError('The booking service could not be reached. Please try again.');
    } finally {
      setBookingBusy(false);
    }
  };

  if (!open) return null;

  const autocomplete: Record<IntakeStep, string> = {
    name: 'name',
    phone: 'tel',
    email: 'email',
    address: 'street-address',
    problem: 'off',
  };

  return (
    <aside className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-heading" data-chat-panel>
      <div className="chat-header">
        <div>
          <span className="chat-kicker">VERTICE / LIVE INTAKE</span>
          <h2 id="chat-heading">Talk with Elena</h2>
          <p>Share a few details and choose a live visit time.</p>
        </div>
        <button className="chat-close" type="button" onClick={onClose} aria-label="Close chat">×</button>
      </div>

      <div className="chat-transcript" ref={transcriptRef} aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
            <span aria-hidden="true">{message.role === 'assistant' ? 'ELENA' : 'YOU'}</span>
            <p>{message.text}</p>
          </div>
        ))}
        {busy && <div className="chat-message assistant"><span aria-hidden="true">ELENA</span><p>One moment…</p></div>}

        {phase === 'loading-slots' && <p className="booking-status" role="status">Checking live Cal.com availability…</p>}
        {phase === 'slots' && (
          <section className="slot-picker" aria-label="Choose an appointment time">
            {slots.length > 0 && (
              <div className="slot-list">
                {slots.map((slot) => (
                  <button
                    className={`slot-option ${selectedSlot === slot.start ? 'selected' : ''}`}
                    key={slot.start}
                    type="button"
                    aria-pressed={selectedSlot === slot.start}
                    onClick={() => { setSelectedSlot(slot.start); setBookingError(''); }}
                  >
                    {formatSlot(slot.start, timeZone)}
                  </button>
                ))}
              </div>
            )}
            {bookingError && <p className="booking-error" role="alert">{bookingError}</p>}
            {slots.length === 0 && !bookingError && <p className="booking-status">No live times are available right now.</p>}
            <div className="slot-actions">
              <button className="chat-secondary" type="button" onClick={() => loadAvailability(timeZone)}>Refresh times</button>
              {slots.length > 0 && <button className="chat-primary" type="button" disabled={!selectedSlot} onClick={confirmBooking}>Confirm appointment</button>}
            </div>
          </section>
        )}
        {phase === 'booking' && <p className="booking-status" role="status">Confirming your appointment with Cal.com…</p>}
        {phase === 'booked' && (
          <div className="booking-confirmation" role="status">
            <strong>Appointment confirmed</strong>
            <span>{selectedSlot ? formatSlot(selectedSlot, timeZone) : ''}</span>
            <small>Cal.com will send the confirmation using its normal email flow.</small>
            {bookingId && <span className="booking-reference">Confirmation reference: {bookingId}</span>}
          </div>
        )}
      </div>

      {phase === 'intake' && (
        <form className="chat-form" onSubmit={submitIntake} aria-label="Reply to Elena">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={busy}
            placeholder={`Your ${stepLabels[step]}`}
            aria-label={`Your ${stepLabels[step]}`}
            autoComplete={autocomplete[step]}
            spellCheck={step !== 'email'}
          />
          <button type="submit" disabled={busy || !input.trim()}>Send</button>
        </form>
      )}
    </aside>
  );
}

export default function HvacSlideDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [bookHovered, setBookHovered] = useState(false);
  const [isTurning, setIsTurning] = useState(false);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = slides[currentSlide];

  const turnTo = useCallback((newIndex: number) => {
    if (newIndex === currentSlide || isTurning) return;
    if (turnTimer.current) clearTimeout(turnTimer.current);
    setIsTurning(true);
    turnTimer.current = setTimeout(() => {
      setCurrentSlide(newIndex);
      setIsTurning(false);
      turnTimer.current = null;
    }, 400);
  }, [currentSlide, isTurning]);

  useEffect(() => () => {
    if (turnTimer.current) clearTimeout(turnTimer.current);
  }, []);

  useEffect(() => {
    if (!autoPlay || bookHovered || isTurning) return;
    const timer = window.setTimeout(() => turnTo((currentSlide + 1) % slides.length), 4500);
    return () => window.clearTimeout(timer);
  }, [autoPlay, bookHovered, currentSlide, isTurning, turnTo]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && chatOpen) {
        setChatOpen(false);
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest('[data-chat-panel]') || target.closest('button, a, input, textarea, select, [contenteditable="true"]'))) return;
      if (event.key === 'ArrowRight' || event.code === 'Space') {
        event.preventDefault();
        setAutoPlay(false);
        turnTo(Math.min(slides.length - 1, currentSlide + 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setAutoPlay(false);
        turnTo(Math.max(0, currentSlide - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, currentSlide, turnTo]);

  const openChat = () => {
    setAutoPlay(false);
    setChatOpen(true);
  };

  return (
    <div className="book-shell" id="top">
      <div className="walnut-desk" aria-hidden="true"><div className="walnut-grain" /><div className="walnut-vignette" /></div>
      <a className="skip-link" href="#slide-content">Skip to briefing</a>
      <header className="book-header">
        <a className="book-brand" href="#top" aria-label="VERTICE THERMAL home">
          <span className="book-brand-name brand-name">VERTICE</span>
          <span className="book-brand-name">THERMAL</span>
          <span className="book-brand-divider" aria-hidden="true">/</span>
          <span className="book-brand-label">HVAC Systems</span>
        </a>
        <div className="book-header-actions">
          <button className={`book-autoplay ${autoPlay ? 'active' : ''}`} type="button" onClick={() => setAutoPlay((playing) => !playing)} aria-pressed={autoPlay}>
            <span aria-hidden="true">{autoPlay ? '●' : '○'}</span> {autoPlay ? 'Auto-Turning Active' : 'Paused'}
          </button>
          <span className="book-count" aria-live="polite">0{currentSlide + 1} / 0{slides.length}</span>
          <button className="book-contact" type="button" onClick={openChat}>Get in Touch</button>
        </div>
      </header>

      <main
        className="book-main"
        id="slide-content"
        tabIndex={-1}
        onMouseEnter={() => setBookHovered(true)}
        onMouseLeave={() => setBookHovered(false)}
      >
        <div className="book-stage">
          <div className="book-shadow" aria-hidden="true" />
          <article className={`physical-book ${slide.type === 'cover' ? 'book-cover-page' : 'book-chapter-page'}`} aria-labelledby={`slide-title-${slide.id}`}>
            <div className="book-page-stack" aria-hidden="true" />
            <div className="book-spine" aria-hidden="true" />
            <div className={`book-page-content ${isTurning ? 'is-turning' : ''}`}>
              <div className="book-page-glow" aria-hidden="true" />
              {slide.type === 'cover' ? (
                <div className="book-cover-copy">
                  <span className="book-badge">{slide.badge}</span>
                  <h1 id={`slide-title-${slide.id}`}>{slide.headline}</h1>
                  <p>{slide.subtext}</p>
                  <button className="book-start" type="button" onClick={() => { setAutoPlay(false); turnTo(1); }}>
                    <span>{slide.cta}</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              ) : (
                <div className="book-chapter-layout">
                  <div className="book-chapter-copy">
                    <div className="book-chapter-kicker">
                      <span>Chapter {slide.chapter}</span><i aria-hidden="true" /><span>HVAC Growth Framework</span>
                    </div>
                    <h1 id={`slide-title-${slide.id}`}>{slide.title}</h1>
                    <p>{slide.body}</p>
                    {slide.cta && <button className="book-demo-cta" type="button" onClick={openChat}>{slide.cta}</button>}
                  </div>
                  <div className={`book-metric ${slide.id === 2 ? 'book-emergency-metric' : ''}`} aria-label={`${slide.metric}, ${slide.metricLabel}`}>
                    {slide.id === 2 && <img className="book-emergency-photo" src="/night-hvac-repair.webp" alt="An HVAC technician responding to a late-night repair" />}
                    <strong>{slide.metric}</strong>
                    <span>{slide.metricLabel}</span>
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </main>

      <footer className="book-footer">
        <div className="book-hint">{autoPlay && !bookHovered ? 'Hover book to pause page turns' : 'Page turning paused'}</div>
        <nav className="book-progress" aria-label="Briefing pages">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`book-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => { setAutoPlay(false); turnTo(index); }}
              aria-label={`Go to page ${index + 1}: ${item.title || 'Introduction'}`}
              aria-current={currentSlide === index ? 'step' : undefined}
              disabled={isTurning}
            />
          ))}
        </nav>
        <div className="book-footer-brand">VERTICE</div>
      </footer>

      <button
        className="chat-launcher"
        type="button"
        onClick={() => setChatOpen((open) => !open)}
        aria-label={chatOpen ? 'Close chat with Elena' : 'Open chat with Elena'}
        aria-expanded={chatOpen}
        aria-controls="vertice-chat-panel"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.4-.75L4 20l1.25-4.05A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8 11.5h.01M12.25 11.5h.01M16.5 11.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
        <span>{chatOpen ? 'Close chat' : 'Chat with Elena'}</span>
      </button>
      <div id="vertice-chat-panel"><ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} /></div>
    </div>
  );
}
