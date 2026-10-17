import { NextResponse } from 'next/server';
import { fetchCalSlots, validTimeZone } from '../../lib/cal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const timeZone = searchParams.get('timeZone') || 'UTC';
  if (!validDate(start) || !validDate(end) || !validTimeZone(timeZone)) {
    return NextResponse.json({ error: 'Choose a valid date range and timezone.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const rangeDays = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
  if (rangeDays < 0 || rangeDays > 14) return NextResponse.json({ error: 'Choose a date range of up to 14 days.' }, { status: 400 });
  try {
    const slots = await fetchCalSlots(start, end, timeZone);
    return NextResponse.json({ slots, timeZone }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === 'CAL_NOT_CONFIGURED';
    return NextResponse.json({ error: notConfigured ? 'Scheduling is not configured.' : 'Live appointment availability could not be loaded.' }, { status: notConfigured ? 503 : 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
