export type IntakeStep = 'name' | 'phone' | 'email' | 'address' | 'problem';

const GREETING_ONLY = /^(?:hi|hello|hey|hiya|howdy|good\s+(?:morning|afternoon|evening)|greetings)(?:\s+there)?[!?.\s]*$/i;
const REFUSAL = /^(?:no|nope|nah|rather not|prefer not|i(?:'m| am) not comfortable|don't want to|not telling you|unknown|n\/a|na)[!.\s]*$/i;
// Keep this sentence-level: single-word names such as May, Will, and Can are valid.
const QUESTION = /[?]|^(?:what|why|how|when|where|who)\s+|^(?:can|could|would|do|does|is|are|will|may)\s+(?:you|i|we|it|this|there|the|a|an|he|she|they)\b|^tell\s+me\b/i;
// Do not blacklist ordinary surnames (for example Price or Tech); only reject an
// explicit request/action phrase. The caller checks the normalized candidate.
const ACTION_PHRASE = /\b(?:book|booking|schedule|appointment|service\s+call|come\s+out|quote|cost)\b/i;
const ISSUE_FIRST = /^(?:my\s+)?(?:ac|air\s*condition(?:er)?|furnace|boiler|hvac|heating|cooling|thermostat|system)\b.*\b(?:broken|broke|failed|fail(?:ed|ing)?|isn't|is\s+not|not\s+working|leak(?:ing)?|no\s+(?:heat|cool)|won't)\b/i;
const SELF_INTRO = /^(?:hi|hello|hey)[,\s]+(?:i(?:'m| am)|my\s+name\s+is)\s+(.+?)[!.\s]*$/i;
const MY_NAME = /^(?:my\s+name\s+is|i(?:'m| am))\s+(.+?)[!.\s]*$/i;
const CORRECTION = /\b(?:i\s+(?:made|have)\s+(?:a\s+)?(?:typo|mistake)|(?:a\s+)?(?:typo|mistake|correction)\s+(?:in|for)\b|that(?:'s| is)\s+wrong|wrong\s+(?:address|number|email)|let me correct)\b/i;
const ADDRESS_MARKER = /\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|way|place|pl|boulevard|blvd|terrace|ter|close|square|sq|highway|hwy|unit|apartment|apt|flat)\b/i;
const PROBLEM_CONTEXT = /\b(?:no\s+(?:heat|heating|cool|cooling)|not\s+(?:heating|cooling|working)|too\s+(?:hot|cold)|freezing|cold|warm|hot|house|home|room|airflow|air\s*flow|vent|fan|thermostat|furnace|boiler|\bac\b|air\s*condition(?:er|ing)?|hvac|heating|cooling|system|unit|leak|water|drip|noise|noisy|rattl|vibrat|smell|odor|broken|won't\s+(?:turn\s+on|start|stop)|shut(?:ting)?\s+off)\b/i;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
}

/** Normalize a person's name without title-casing or otherwise changing their spelling. */
export function normalizeName(value: unknown): string {
  const input = clean(value);
  if (!input || input.length > 120 || GREETING_ONLY.test(input) || REFUSAL.test(input) || ISSUE_FIRST.test(input)) return '';
  const intro = input.match(SELF_INTRO) ?? input.match(MY_NAME);
  const candidate = clean(intro?.[1] ?? input).replace(/^[,.:;\-\s]+|[,.:;\-\s]+$/g, '');
  if (!candidate || candidate.length > 80 || GREETING_ONLY.test(candidate) || REFUSAL.test(candidate) || QUESTION.test(candidate) || ACTION_PHRASE.test(candidate) || ISSUE_FIRST.test(candidate)) return '';
  // Names may contain letters from any script, marks, spaces, apostrophes, periods, and hyphens.
  const namePattern = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M}'’.\\- ]*[\\p{L}\\p{M}]$|^[\\p{L}\\p{M}]$", 'u');
  if (!namePattern.test(candidate)) return '';
  return candidate;
}

export function normalizeAnswer(step: IntakeStep, value: unknown): string {
  const answer = clean(value);
  return step === 'email' ? answer.toLowerCase() : answer;
}

export function isQuestionOrSideRequest(value: unknown): boolean {
  const answer = clean(value);
  return !answer || QUESTION.test(answer) || GREETING_ONLY.test(answer) || /\b(?:how are you|are you (?:a|an?)?\s*ai|what (?:do you|service)|what(?:'s| is) the (?:service|cost|price)|how much|available|availability|why do you need)\b/i.test(answer);
}

export function validateIntakeAnswer(step: IntakeStep, answer: string): string {
  if (answer.length > (step === 'problem' ? 800 : 240)) return 'That reply is too long. Please shorten it and try again.';
  if (CORRECTION.test(answer)) {
    if (step === 'address') return 'No problem—could you re-enter the property address, please?';
    if (step === 'phone') return 'No problem—could you re-enter the best phone number, please?';
    if (step === 'email') return 'No problem—could you re-enter the email address, please?';
    if (step === 'problem') return 'No problem—could you re-enter the heating or cooling issue, please?';
  }
  if (step === 'name' && !normalizeName(answer)) return 'Please share the name you’d like me to use.';
  if (step === 'phone' && (!/^[\d\s()+.\-]+$/.test(answer) || answer.replace(/\D/g, '').length < 7)) return 'That number doesn’t look quite right. Could you enter at least seven digits?';
  if (step === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) return 'Please check the email address and try again.';
  if (step === 'address' && (answer.length < 5 || (!/\d/.test(answer) && !ADDRESS_MARKER.test(answer)))) return 'Could you include the street and area for the property?';
  if (step === 'problem' && answer.length < 8) return 'Could you share a little more about what the heating or cooling system is doing?';
  if (step === 'problem' && !PROBLEM_CONTEXT.test(answer)) return 'Could you describe a heating or cooling symptom or the equipment involved—for example, no heat, not cooling, a leak, unusual noise or smell, poor airflow, or a thermostat issue?';
  return '';
}

export function fieldQuestion(step: IntakeStep, name = ''): string {
  if (step === 'address' && name) return `And ${name}, what’s the property address for the visit?`;
  if (step === 'problem' && name) return `One last thing, ${name}: could you tell me a little about the heating or cooling issue?`;
  return ({
    name: 'To get us started, what name would you like me to use?',
    phone: 'What’s the best phone number for the team to reach you on?',
    email: 'Which email address would you like us to use for your appointment details?',
    address: 'What’s the property address for the visit?',
    problem: 'Could you tell me a little about the heating or cooling issue?',
  } as const)[step];
}
