import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ message: 'Elena is in offline mode. Please use the intake form and our dispatch team will follow up shortly.' });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.35, messages: [
        { role: 'system', content: 'You are Elena, a calm, empathetic HVAC Dispatch Concierge for VERTICE THERMAL. Collect intake strictly one item at a time in this order: name, phone, email, address, problem description. Ask only for the next missing item. Keep responses concise and high-touch.' }, ...(messages || [])
      ]})
    });
    const data = await response.json();
    return NextResponse.json({ message: data.choices?.[0]?.message?.content || 'I’m ready when you are. May I start with your name?' });
  } catch { return NextResponse.json({ message: 'I’m temporarily unable to connect. Please leave your number and our dispatch team will call you.' }, { status: 200 }); }
}
