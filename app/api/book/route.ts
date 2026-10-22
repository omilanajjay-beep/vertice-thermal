import { NextResponse } from 'next/server';
import { bookingEventIdentity, fetchCalSlots, getCalConfig, validTimeZone } from '../../lib/cal';
import { normalizeName } from '../../lib/intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Attendee = { name?: unknown; phone?: unknown; email?: unknown; address?: unknown; problem?: unknown };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function localDate(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

async function sendEmail(to: string, subject: string, text: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'VERTICE THERMAL' },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  return response.status === 202;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Request not allowed.' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 12000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  let body: { start?: unknown; timeZone?: unknown; attendee?: Attendee; website?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Please choose a valid appointment time.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !body.attendee || typeof body.attendee !== 'object' || Array.isArray(body.attendee)) {
    return NextResponse.json({ error: 'Please complete your appointment details.' }, { status: 400 });
  }
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ error: 'Request not accepted.' }, { status: 400 });
  const start = clean(body.start, 80);
  const startTime = Date.parse(start);
  const timeZone = clean(body.timeZone, 80) || 'UTC';
  const attendee = body.attendee ?? {};
  const name = normalizeName(attendee.name);
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'What name should appear on your appointment? Please enter your name, rather than a greeting.' }, { status: 422 });
  }
  const phone = clean(attendee.phone, 40);
  const email = clean(attendee.email, 254);
  const address = clean(attendee.address, 240);
  const problem = clean(attendee.problem, 800);
  if (!start || !Number.isFinite(startTime) || startTime <= Date.now() || !validTimeZone(timeZone) || phone.replace(/\D/g, '').length < 7 || !emailPattern.test(email) || address.length < 5 || problem.length < 8) {
    return NextResponse.json({ error: 'Please complete each requested detail and choose a valid appointment time.' }, { status: 422 });
  }

  const config = getCalConfig();
  const sender = process.env.SENDGRID_FROM_EMAIL || '';
  const technician = process.env.SENDGRID_TECH_EMAIL || '';
  if (!config || !process.env.SENDGRID_API_KEY || !emailPattern.test(sender) || !emailPattern.test(technician)) {
    return NextResponse.json({ error: 'Online scheduling is not available right now. Please try again later.' }, { status: 503 });
  }

  const visitDay = localDate(start, timeZone);
  let stillAvailable = false;
  try {
    const liveSlots = await fetchCalSlots(visitDay, visitDay, timeZone);
    stillAvailable = liveSlots.some((slot) => Math.abs(Date.parse(slot.start) - startTime) < 60_000);
  } catch {
    return NextResponse.json({ error: 'Live availability could not be verified. Please choose another time in a moment.' }, { status: 502 });
  }
  if (!stillAvailable) return NextResponse.json({ error: 'That time has just become unavailable. Please choose another slot.' }, { status: 409 });

  let bookingResponse: Response;
  try {
    bookingResponse = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}`, 'cal-api-version': '2026-02-25' },
      body: JSON.stringify({
        ...bookingEventIdentity(config),
        start: new Date(startTime).toISOString(),
        attendee: { name, email, phoneNumber: phone, timeZone, language: 'en' },
        // These slugs match the required custom fields on the Cal.com event type.
        bookingFieldsResponses: { 'service-address': address, 'hvac-issue': problem },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: 'The booking service could not be reached. Please try again.' }, { status: 502 });
  }
  if (!bookingResponse.ok) {
    const status = bookingResponse.status === 409 ? 409 : 502;
    return NextResponse.json({ error: status === 409 ? 'That time has just become unavailable. Please choose another slot.' : 'The booking could not be confirmed. Please try another time.' }, { status });
  }

  const bookingPayload = await bookingResponse.json().catch(() => ({}));
  const dateLabel = new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short', timeZone }).format(new Date(startTime));
  const visitDetails = `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nAddress: ${address}\nVisit: ${dateLabel} (${timeZone})\nHVAC issue: ${problem}`;
  const homeownerMessage = `Hello ${name},\n\nYour VERTICE THERMAL visit is confirmed for ${dateLabel} (${timeZone}).\n\n${visitDetails}\n\nOur dispatch team will contact you if any details are needed.\n\nVERTICE THERMAL`;
  const technicianMessage = `A VERTICE THERMAL appointment has been booked.\n\n${visitDetails}\n\nPlease follow up with the homeowner as needed.`;
  const emailResults = await Promise.allSettled([
    sendEmail(email, 'Your VERTICE THERMAL visit is confirmed', homeownerMessage),
    sendEmail(technician, 'New VERTICE THERMAL appointment', technicianMessage),
  ]);
  const emailWarning = emailResults.some((result) => result.status === 'rejected' || !result.value);
  const bookingId = bookingPayload?.data?.uid || bookingPayload?.data?.id || null;
  return NextResponse.json({ ok: true, emailWarning, bookingId }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
