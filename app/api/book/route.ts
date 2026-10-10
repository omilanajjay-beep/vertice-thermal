import { NextResponse } from 'next/server';

const publicBookingUrl = process.env.PUBLIC_CAL_BOOKING_URL || 'https://cal.com/jomiloju-ql3ix6/30min';

export async function POST(req: Request) {
  try {
    const { slot, attendee, sessionId } = await req.json();
    const eventTypeId = Number(process.env.CAL_EVENT_TYPE_ID || '7357447');
    if (!process.env.CAL_API_KEY) {
      return NextResponse.json({ ok: false, bookingUrl: publicBookingUrl, message: 'Continue in Cal.com to choose your survey time.', preview: true });
    }
    const booking = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CAL_API_KEY}` },
      body: JSON.stringify({ eventTypeId, start: slot, attendee: { name: attendee?.name || 'VERTICE enquiry', email: attendee?.email || process.env.SENDGRID_FROM_EMAIL, timeZone: 'Europe/London', language: 'en' } }),
    });
    const bookingData = await booking.json();
    if (!booking.ok) return NextResponse.json({ ok: false, bookingUrl: publicBookingUrl, message: 'Please choose your survey time in Cal.com.', details: bookingData?.message });
    const lead = { event: 'lead.verified', source: 'vertice-thermal', sessionId, slot, attendee, booking: bookingData };
    if (process.env.LEAD_WEBHOOK_URL) await fetch(process.env.LEAD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    if (process.env.SENDGRID_API_KEY && attendee?.email && process.env.SENDGRID_FROM_EMAIL) await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` }, body: JSON.stringify({ personalizations: [{ to: [{ email: attendee.email }] }], from: { email: process.env.SENDGRID_FROM_EMAIL }, subject: 'Your VERTICE THERMAL survey request', content: [{ type: 'text/plain', value: `Your survey request for ${slot} is confirmed. Our dispatch team will be in touch shortly.` }] }) });
    return NextResponse.json({ ok: true, booking: bookingData });
  } catch {
    return NextResponse.json({ ok: false, bookingUrl: publicBookingUrl, message: 'Continue in Cal.com to choose your survey time.' });
  }
}
