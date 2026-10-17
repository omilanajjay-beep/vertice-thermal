import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const steps = ['name', 'phone', 'email', 'address', 'problem'] as const;
type Step = (typeof steps)[number];
const nextQuestions: Record<Step, string> = {
  name: 'What is the best phone number to reach you?',
  phone: 'Which email address should we use for your appointment details?',
  email: 'What is the property address for the visit?',
  address: 'How would you describe the heating or cooling issue?',
  problem: '',
};
const genericAcknowledgements: Record<Exclude<Step, 'problem'>, string> = {
  name: 'Thank you. I’ll take this one detail at a time.',
  phone: 'Thank you, I have that contact number.',
  email: 'Thank you. I have the address for your appointment details.',
  address: 'Thank you. I have the property location.',
};

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

function validateAnswer(step: Step, answer: string) {
  if (answer.length > (step === 'problem' ? 800 : 240)) return 'That reply is too long. Please shorten it and try again.';
  if (step === 'name' && answer.trim().length < 2) return 'Please enter at least two characters for your name.';
  if (step === 'phone' && answer.replace(/\D/g, '').length < 7) return 'Please enter a phone number with at least seven digits.';
  if (step === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) return 'Please enter a valid email address.';
  if (step === 'address' && answer.trim().length < 5) return 'Please include the street and area for the property.';
  if (step === 'problem' && answer.trim().length < 8) return 'Please share a little more about what the system is doing.';
  return '';
}

function classifyIssue(text: string) {
  const lower = text.toLowerCase();
  if (/no heat|not heating|cold|heating.*not|heat.*fail/.test(lower)) return 'a heating concern';
  if (/no cool|not cooling|air.?con|too hot|warm room/.test(lower)) return 'a cooling concern';
  if (/noise|noisy|rattl|vibrat|sound/.test(lower)) return 'an unusual system-noise concern';
  if (/leak|water|drip|moisture/.test(lower)) return 'a possible water-leak concern';
  if (/thermostat|control|display|sensor/.test(lower)) return 'a controls concern';
  return 'a home-comfort concern';
}

async function acknowledgeIssue(answer: string) {
  const safeCategory = classifyIssue(answer);
  const fallback = 'Thank you for explaining. I’ll look for a suitable visit time.';
  const key = process.env.GROQ_API_KEY;
  if (!key) return fallback;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.25,
        max_completion_tokens: 48,
        messages: [
          { role: 'system', content: 'You are Elena, a calm HVAC dispatch concierge. Write one brief empathetic sentence acknowledging the issue category. Do not ask any question, diagnose, quote prices, claim availability, or promise an outcome. Keep it under 16 words.' },
          { role: 'user', content: `The resident reported ${safeCategory}.` },
        ],
      }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return fallback;
    const reply = content.replace(/[\r\n]+/g, ' ').trim();
    if (!reply || reply.includes('?') || reply.length > 180) return fallback;
    return reply;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Request not allowed.' }, { status: 403 });
  const rawBody = await request.text();
  if (rawBody.length > 6000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  let body: { step?: unknown; answer?: unknown; website?: unknown };
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Please send a valid reply.' }, { status: 400 }); }
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ error: 'Request not accepted.' }, { status: 400 });
  if (typeof body.step !== 'string' || !steps.includes(body.step as Step) || typeof body.answer !== 'string') {
    return NextResponse.json({ error: 'Please send the requested detail.' }, { status: 400 });
  }
  const step = body.step as Step;
  const answer = body.answer.trim();
  const issue = validateAnswer(step, answer);
  if (issue) return NextResponse.json({ error: issue }, { status: 422 });

  if (step === 'problem') {
    return NextResponse.json({ reply: await acknowledgeIssue(answer), complete: true, nextQuestion: '' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ reply: genericAcknowledgements[step], complete: false, nextQuestion: nextQuestions[step] }, { headers: { 'Cache-Control': 'no-store' } });
}
