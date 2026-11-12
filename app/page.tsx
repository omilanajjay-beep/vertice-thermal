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
  MapPin,
  Menu,
  MessageCircle,
  Send,
  ShieldCheck,
  Snowflake,
  Wrench,
  X,
} from 'lucide-react';
import ClimateJourney from './components/ClimateJourney';

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
    { role: 'assistant', text: 'Hi there! I’m Elena, PRINCE’s virtual dispatch assistant. I’d be happy to help arrange a visit. To get us started, what name would you like me to use?' },
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
        body: JSON.stringify({ step: field, answer, completedFields: intakeFields.slice(0, step), knownName: intake.name, website: honeypot }),
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
        text: `${intake.name ? `${intake.name}, you’re all set! ` : 'You’re all set! '}Your appointment is confirmed. Cal.com will send the confirmation details by email.`,
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
    {!open && <button type="button" className="chat-launcher" onClick={() => setOpen(true)} aria-label="Open chat" title="Open chat">
      <MessageCircle size={25} strokeWidth={1.7} aria-hidden="true" />
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
          <label className="booking-name">Name for the appointment
            <input value={intake.name} onChange={(event) => setIntake((current) => ({ ...current, name: event.target.value }))} maxLength={80} autoComplete="name" aria-label="Name for the appointment" />
          </label>
          {slotUnavailable ? <p className="slot-empty">Sorry, live appointment times aren’t available just now. Please try again a little later.</p> : <>
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
        <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={step === 4 ? 800 : 240} placeholder={busy ? 'Elena is typing…' : 'Type your reply…'} aria-label="Your reply" disabled={busy} />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send reply"><Send size={16} /></button>
      </form>}
      <p className="chat-footnote">Your details help the team arrange your visit. You can review the name on the appointment before confirming.</p>
    </aside>}
  </>;
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  return <main id="top">
    <ClimateJourney chatOpen={chatOpen} onRequestSurvey={() => setChatOpen(true)} />
    <Concierge open={chatOpen} setOpen={setChatOpen} />
  </main>;
}
