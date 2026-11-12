# VERTICE THERMAL — HVAC Response Systems

A responsive five-slide field briefing for US HVAC owners about missed after-hours calls, lead response, and revenue recovery. The homepage is served by the existing `omilanajjay-beep/vertice-thermal` Next.js project and Render service; no other client site is changed.

## Run and validate locally

```bash
npm ci
npm run dev
```

Run the production checks with:

```bash
npm run build
npm run typecheck
npm test
```

## Briefing and contact flow

- Navigate the five slides with the on-screen controls, progress buttons, or left/right arrow keys. The photo on the emergency slide is `public/night-hvac-repair.webp`.
- The final demo CTA, header “Get in Touch” button, and floating “Chat with Elena” button open the same accessible intake panel.
- Intake remains in the required order: name, phone, email, property address, then HVAC issue. Replies are checked by the existing `/api/concierge` route; invalid or unrelated replies stay on the current question.
- After the intake is complete, `/api/slots` loads live availability from the existing VERTICE Cal.com event configuration. The customer explicitly selects a time and confirms before `/api/book` creates a Cal.com booking. Cal.com retains its native confirmation-email handling.
- No Make, Pipedream, SendGrid, or replacement booking configuration is used. Server credentials remain in the hosting environment and are not committed.

## Existing deployment

- Repository: `omilanajjay-beep/vertice-thermal`, branch `main`.
- Render service: `srv-db9f7lajnfac73c2r3o0`.
- Public URL: https://vertice-thermal.onrender.com
- Build: `npm ci && npm run build`.
- Start: `npm start`.
