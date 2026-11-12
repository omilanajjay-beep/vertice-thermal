# VERTICE THERMAL — delivery outcomes

## 1. Lamplit black-desk visual direction

- Use pure black `#000000`, dark slate `#111111`, off-white/paper `#F3F2EE`, and clean white `#FFFFFF` as the primary palette.
- Use a clean Inter / Google Sans-style sans-serif system with mono field labels for technical annotations.
- Present a moody, high-end dark desk setup with a realistic black hardcover book lying flat on a lacquered black oak desk, illuminated by a warm pool of lamplight.
- Include nearby desktop details such as a cappuccino cup, pencil, business card, and succulent model.

## 2. Interactive 3D book navigation

- Use React, Vite/Next-compatible TypeScript, Three.js, WebGL, and Tailwind-compatible styling already present in the project.
- Clicking the front cover must trigger a smooth cinematic push-in and open the field note.
- Support page-turning by clicking either half of the open book or dragging its edges, with a paper-curl shader treatment.
- Support arrow-key navigation.
- Gently lean the scene toward the cursor.
- When the book opens, the introductory headlines must step aside rather than obscure the book.

## 3. HVAC story pages

- Cover page must use: “The After-Hours Leak: How Local HVAC Companies Lose $5,000+ Every Month (And How to Fix It in 30 Minutes).”
- Page 1 must show an HVAC contractor’s phone ringing at 11:00 PM to an empty voicemail, with the caption: “The 11:00 PM Emergency: A homeowner's AC breaks down, they call your number, but it rings out to voicemail.”
- Page 2 must show a frustrated homeowner hanging up and dialing a local competitor who answers instantly, with the caption: “The Direct Loss: Because nobody picked up, a $450 repair and a lifelong customer just walked straight to your competitor.”
- Page 3 must show an automated receptionist pipeline capturing the lead, texting back, and locking in bookings automatically, with the caption: “The 24/7 AI Receptionist: While you sleep, our automated pipeline engages the lead instantly, qualifies them, and books the job directly onto your calendar.”
- Page 4 must show recovered revenue of `$5,400+` and the CTA: “Claim Your Custom 30-Minute Pipeline Demo For Your HVAC Business.”

## 4. Enabled chat interface

- Make the Elena / AI receptionist interface visible from the main experience and expandable from the header, floating dock, or CTA.
- Preserve the existing secure `/api/concierge` intake flow, including validation, conversational side replies, same-origin protection, and graceful provider fallback.
- Keep the chat responsive on mobile and desktop, show assistant/user messages, typing state, input state, and a clear completion state.
