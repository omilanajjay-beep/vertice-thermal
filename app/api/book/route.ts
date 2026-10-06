import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { slot, attendee } = await req.json();
    if (!process.env.CAL_API_KEY || !process.env.CAL_EVENT_TYPE_ID) {
      return NextResponse.json({ ok: false, message: 'Booking is in preview mode. A dispatch specialist will confirm this slot shortly.' });
    }
    const booking = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CAL_API_KEY}` },
      body: JSON.stringify({ eventTypeId: Number(process.env.CAL_EVENT_TYPE_ID), start: slot, attendee: { name: attendee?.name || 'VERTICE enquiry', email: attendee?.email || process.env.SENDGRID_FROM_EMAIL, timeZone: 'Europe/London', language: 'en' } })
    });
    const bookingData = await booking.json();
    if (!booking.ok) return NextResponse.json({ ok: false, message: 'That slot is no longer available. Elena will help you choose another.' });
    if (process.env.SENDGRID_API_KEY && attendee?.email) {
      await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` }, body: JSON.stringify({ personalizations: [{ to: [{ email: attendee.email }] }], from: { email: process.env.SENDGRID_FROM_EMAIL }, subject: 'Your VERTICE THERMAL survey request', content: [{ type: 'text/plain', value: `Your survey request for ${slot} is confirmed. Our dispatch team will be in touch shortly.` }] }) });
    }
    return NextResponse.json({ ok: true, booking: bookingData });
  } catch { return NextResponse.json({ ok: false, message: 'We could not lock that slot. Please try another.' }); }
}
