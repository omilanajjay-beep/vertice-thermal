import { NextResponse } from 'next/server';

type ChatMessage = { role?: string; content?: string };

const intakePrompts = [
  'May I start with your name?',
  'Thank you. What is the best phone number for you?',
  'And which email address should we use for your confirmation?',
  'What is the property address for the visit?',
  'Finally, could you describe the heating or cooling issue you are experiencing?',
];

function userCount(messages: ChatMessage[]) {
  return messages.filter((message) => message.role === 'user' && message.content?.trim()).length;
}

function fallbackReply(messages: ChatMessage[]) {
  const prompt = intakePrompts[Math.min(userCount(messages), intakePrompts.length - 1)];
  return `Elena is currently in offline dispatch mode. ${prompt}`;
}

function isRepeated(reply: string, messages: ChatMessage[]) {
  const normalized = reply.trim().toLowerCase();
  return messages.some((message) => message.role === 'assistant' && message.content?.trim().toLowerCase() === normalized);
}

export async function POST(req: Request) {
  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    const nextPrompt = intakePrompts[Math.min(userCount(messages), intakePrompts.length - 1)];

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ message: fallbackReply(messages), offline: true });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are Elena, a calm HVAC dispatch concierge. Collect one item at a time in this order: name, phone, email, address, problem description. The user has already answered ${userCount(messages)} intake question(s). Ask exactly this next question and do not repeat an earlier question: ${nextPrompt} Keep it concise and high-touch.`,
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) return NextResponse.json({ message: fallbackReply(messages), offline: true });
    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    if (typeof message !== 'string' || !message.trim() || isRepeated(message, messages)) {
      return NextResponse.json({ message: fallbackReply(messages), offline: true });
    }
    return NextResponse.json({ message: message.trim(), offline: false });
  } catch {
    return NextResponse.json({ message: fallbackReply(messages), offline: true });
  }
}
