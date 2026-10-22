import { NextResponse } from 'next/server';
import { fieldQuestion, isQuestionOrSideRequest, normalizeAnswer, normalizeName, validateIntakeAnswer, type IntakeStep } from '../../lib/intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const steps: readonly IntakeStep[] = ['name', 'phone', 'email', 'address', 'problem'];
const labels: Record<IntakeStep, string> = { name: 'name', phone: 'phone number', email: 'email address', address: 'property address', problem: 'system issue' };

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }
function clean(value: unknown) { return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : ''; }
function issueCategory(text: string) {
  const lower = text.toLowerCase();
  if (/no heat|not heating|cold|heat.*fail/.test(lower)) return 'heating';
  if (/no cool|not cooling|air.?con|too hot|warm room/.test(lower)) return 'cooling';
  if (/noise|noisy|rattl|vibrat|sound/.test(lower)) return 'noise';
  if (/leak|water|drip|moisture/.test(lower)) return 'water';
  if (/thermostat|control|display|sensor/.test(lower)) return 'controls';
  return 'comfort';
}
function issueAck(category: string) {
  return ({ heating: 'I’m sorry your home is dealing with a heating problem.', cooling: 'I’m sorry your home is dealing with a cooling problem.', noise: 'That unusual system noise sounds frustrating.', water: 'A possible system leak is worth addressing promptly.', controls: 'Trouble with the controls can be frustrating.', comfort: 'Thanks for explaining what is happening with your home comfort.' } as Record<string, string>)[category] || 'Thanks for explaining what is happening with your home comfort.';
}
function sideReply(answer: string, step: IntakeStep) {
  const lower = answer.toLowerCase();
  if (/^(?:hi|hello|hey|hiya|howdy)(?:\s+there)?[!?.\s]*$/.test(lower)) return `Hi there! ${fieldQuestion(step)}`;
  if (/how are you/.test(lower)) return `I’m well, thanks — I’m a virtual assistant helping coordinate HVAC visits. ${fieldQuestion(step)}`;
  if (/are you (?:a|an?)?\s*ai|artificial intelligence/.test(lower)) return `Yes. I’m VERTICE’s virtual assistant, here to collect details for the team. ${fieldQuestion(step)}`;
  if (/what (?:do you|service)|what(?:'s| is) the service/.test(lower)) return `We help coordinate heating and cooling service visits. ${fieldQuestion(step)}`;
  if (/cost|price|how much|quote/.test(lower)) return `The team can discuss pricing after reviewing the job; I don’t provide quotes here. ${fieldQuestion(step)}`;
  if (/available|availability|when can/.test(lower)) return `I’ll show you live visit times once we’ve got the details. ${fieldQuestion(step)}`;
  if (/why.*(need|ask)|need.*(data|information)/.test(lower)) return `These details help the team contact you and prepare for the visit. ${fieldQuestion(step)}`;
  return `I can answer questions about arranging heating and cooling visits, and I’ll keep this intake focused. ${fieldQuestion(step)}`;
}
function intentLabel(answer: string) {
  const lower = answer.toLowerCase();
  if (/^(?:hi|hello|hey|hiya|howdy)/.test(lower)) return 'greeting';
  if (/how are you/.test(lower)) return 'smalltalk';
  if (/are you (?:a|an?)?\s*ai|artificial intelligence/.test(lower)) return 'identity';
  if (/what (?:do you|service)|what(?:'s| is) the service/.test(lower)) return 'service scope';
  if (/cost|price|how much|quote/.test(lower)) return 'pricing scope';
  if (/available|availability|when can/.test(lower)) return 'availability';
  if (/why.*(need|ask)|need.*(data|information)/.test(lower)) return 'privacy explanation';
  return 'out of scope question';
}
function diagnostic(event: 'missing_key' | 'timeout' | 'failure' | 'empty' | 'success') {
  // Deliberately emit only a fixed event label: no request, category, key, or model text.
  console.info(`[concierge] groq ${event}`);
}
async function acknowledge(category: string, fallback: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) { diagnostic('missing_key'); return fallback; }
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: 'openai/gpt-oss-120b', temperature: 0.3, max_completion_tokens: 512, reasoning_effort: 'low', messages: [{ role: 'system', content: 'Write one warm, concise sentence acknowledging the supplied HVAC intake category or step. Do not ask questions, diagnose, quote, promise booking or availability, mention personal data, or say you are AI. Use only the supplied label.' }, { role: 'user', content: `Intake label: ${category}` }] }), signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) { diagnostic('failure'); return fallback; }
    const data = await response.json();
    const text = typeof data?.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content.replace(/[\r\n]+/g, ' ').trim() : '';
    if (!text || text.length > 180 || text.includes('?') || /@|\b\d{7,}\b|\b(?:price|cost|quote|diagnos|book|appoint|available|availability)\b/i.test(text)) { diagnostic('empty'); return fallback; }
    diagnostic('success');
    return text;
  } catch (error) { diagnostic(error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'failure'); return fallback; }
}
async function conversationalReply(answer: string, step: IntakeStep) {
  const fallback = sideReply(answer, step);
  // Factual answers (especially virtual-assistant identity) must not be replaced
  // by a model acknowledgement that could omit or contradict the answer.
  if (!['greeting', 'smalltalk'].includes(intentLabel(answer))) return fallback;
  const fallbackAck = fallback.replace(` ${fieldQuestion(step)}`, '');
  const ack = await acknowledge(intentLabel(answer), fallbackAck);
  return `${ack} ${fieldQuestion(step)}`.trim();
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request not allowed.' }, 403);
  const raw = await request.text();
  if (raw.length > 6000) return json({ error: 'Request is too large.' }, 413);
  let body: { step?: unknown; answer?: unknown; website?: unknown; completedFields?: unknown; issueCategory?: unknown };
  try { const parsed: unknown = JSON.parse(raw); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: 'Please send a valid reply.' }, 400); body = parsed as typeof body; } catch { return json({ error: 'Please send a valid reply.' }, 400); }
  if (typeof body.website === 'string' && body.website.trim()) return json({ error: 'Request not accepted.' }, 400);
  if (typeof body.step !== 'string' || !steps.includes(body.step as IntakeStep) || typeof body.answer !== 'string') return json({ error: 'Please send the requested detail.' }, 400);
  if (body.completedFields !== undefined && (!Array.isArray(body.completedFields) || body.completedFields.length > 20 || body.completedFields.some((f) => typeof f !== 'string' || f.length > 40))) return json({ error: 'Invalid completed fields.' }, 422);
  if (body.issueCategory !== undefined && (typeof body.issueCategory !== 'string' || body.issueCategory.length > 80)) return json({ error: 'Invalid issue category.' }, 422);
  const step = body.step as IntakeStep;
  const rawAnswer = clean(body.answer);
  if (rawAnswer.length > (step === 'problem' ? 800 : 240)) return json({ error: 'That reply is too long. Please shorten it and try again.' }, 422);
  const name = step === 'name' ? normalizeName(rawAnswer) : '';
  if (step === 'name' && (!name || isQuestionOrSideRequest(rawAnswer) || /\b(?:furnace|boiler|air\s*condition|hvac|heating|cooling|leak|broken|not working)\b/i.test(rawAnswer))) return json({ accepted: false, reply: await conversationalReply(rawAnswer, step), complete: false, nextQuestion: '' });
  if (step !== 'name' && isQuestionOrSideRequest(rawAnswer)) return json({ accepted: false, reply: await conversationalReply(rawAnswer, step), complete: false, nextQuestion: '' });
  const value = step === 'name' ? name : normalizeAnswer(step, rawAnswer);
  const validation = validateIntakeAnswer(step, value);
  if (validation) return json({ error: validation }, 422);
  if (step === 'problem') return json({ accepted: true, value, reply: `${await acknowledge(issueCategory(value), issueAck(issueCategory(value)))} Let’s look at live visit times.`, complete: true, nextQuestion: '' });
  const next = fieldQuestion(steps[steps.indexOf(step) + 1]);
  const fallbacks: Record<Exclude<IntakeStep, 'problem'>, string> = {
    name: `Nice to meet you, ${value}.`, phone: 'Got it.', email: 'Perfect, we’ll use that for your confirmation.', address: 'Thanks, that’s where the visit will be.',
  };
  const ack = await acknowledge(labels[step], fallbacks[step]);
  return json({ accepted: true, value, reply: `${ack} ${next}`.trim(), complete: false, nextQuestion: '' });
}
