import { NextResponse } from 'next/server';

type ChatMessage = { role?: string; content?: string };
type SessionState = { hits: number[]; fields: Record<string, string> };

const intakePrompts = [
  'May I start with your name?',
  'Thank you. What is the best phone number for you?',
  'And which email address should we use for your confirmation?',
  'What is the property address for the visit?',
  'Finally, could you describe the heating or cooling issue you are experiencing?',
];
const sessions = new Map<string, SessionState>();
const ipHits = new Map<string, number[]>();
const knowledge = [
  'HVAC systems: heat pumps provide heating and cooling; do not quote prices without a survey.',
  'Noise: VERTICE targets quiet operation and diagnoses fan, compressor, airflow and mounting issues.',
  'Service: collect symptoms, property address and contact details before recommending a technician visit.',
];

function clientKey(req: Request, sessionId: string) {
  return `${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}:${sessionId || 'anonymous'}`;
}
function allowed(key: string) {
  const now = Date.now();
  const hits = (ipHits.get(key) || []).filter((time) => now - time < 60_000);
  hits.push(now);
  ipHits.set(key, hits);
  return { ok: hits.length <= 12, captcha: hits.length > 3 };
}
function userCount(messages: ChatMessage[]) { return messages.filter((m) => m.role === 'user' && m.content?.trim()).length; }
function fallbackReply(messages: ChatMessage[]) { return intakePrompts[Math.min(userCount(messages), intakePrompts.length - 1)]; }
function nextField(messages: ChatMessage[]) { return ['name', 'phone', 'email', 'address', 'problem'][Math.min(userCount(messages), 4)]; }
function extractFields(messages: ChatMessage[]) {
  const fields: Record<string, string> = {};
  messages.filter((m) => m.role === 'user' && m.content?.trim()).forEach((m, i) => { fields[['name', 'phone', 'email', 'address', 'problem'][Math.min(i, 4)]] = m.content!.trim(); });
  return fields;
}

export async function POST(req: Request) {
  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 100) : 'anonymous';
    const state = sessions.get(sessionId) || { hits: [], fields: {} };
    const gate = allowed(clientKey(req, sessionId));
    if (body?.website || !gate.ok) return NextResponse.json({ message: 'Please wait a moment before sending another message.', blocked: true }, { status: 429 });
    if (gate.captcha && !body?.captchaToken && process.env.TURNSTILE_SECRET_KEY) return NextResponse.json({ message: 'Please complete the quick verification so Elena can continue.', captchaRequired: true }, { status: 429 });
    state.fields = { ...state.fields, ...extractFields(messages) };
    sessions.set(sessionId, state);
    const nextPrompt = intakePrompts[Math.min(userCount(messages), intakePrompts.length - 1)];
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ message: fallbackReply(messages), offline: false, mode: 'structured', fields: state.fields });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'qwen/qwen3.8-27b', temperature: 0.15, messages: [{ role: 'system', content: `You are Elena, a precise HVAC receptionist. Use this knowledge: ${knowledge.join(' ')}. Never invent prices, availability, diagnoses or guarantees. Collect one field at a time in this order: name, phone, email, address, problem. Ask exactly this next question: ${nextPrompt}. Do not repeat questions. Keep the reply concise and warm.` }, ...messages] }),
    });
    if (!response.ok) return NextResponse.json({ message: fallbackReply(messages), offline: false, mode: 'structured', fields: state.fields });
    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    if (typeof message !== 'string' || !message.trim()) return NextResponse.json({ message: fallbackReply(messages), offline: false, mode: 'structured', fields: state.fields });
    return NextResponse.json({ message: message.trim(), offline: false, fields: state.fields });
  } catch {
    return NextResponse.json({ message: fallbackReply(messages), offline: false, mode: 'structured' });
  }
}
