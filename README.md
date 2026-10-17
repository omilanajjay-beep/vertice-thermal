# VERTICE THERMAL

A responsive architectural climate-systems site with a procedural Three.js product study, GSAP camera hotspots, contractor revenue calculator, truthful service/review states, and server-side concierge, Cal.com, and SendGrid routes.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The front end runs without credentials. Live appointment availability and booking are enabled only after the server-side integrations are configured. No secret belongs in client-side code or in Git.

## Required production environment

- `GROQ_API_KEY` — optional for the intake fallback; used with `llama-3.3-70b-versatile` to acknowledge the final HVAC concern. Customer names, phone numbers, email addresses and property addresses are not sent to Groq.
- `CAL_API_KEY` — required for live slots and booking.
- `CAL_EVENT_TYPE_ID`, or `CAL_EVENT_TYPE_SLUG` plus `CAL_USERNAME` or `CAL_TEAM_SLUG`; optionally `CAL_ORGANIZATION_SLUG`.
- `SENDGRID_API_KEY` — required for booking confirmations.
- `SENDGRID_FROM_EMAIL` — verified sender address (the requested default is `omilanajjay@gmail.com`).
- `SENDGRID_TECH_EMAIL` — on-call technician/dispatch recipient.
- `NEXT_PUBLIC_SITE_URL` — optional canonical URL for metadata.

Add these in the hosting provider's encrypted environment-variable settings for Production, Preview and Development as appropriate. Do not commit `.env.local` or any actual API key. The app will not create a booking unless it can verify the live Cal.com slot and has the email configuration needed to notify both recipients.

## Backend routes

- `POST /api/concierge` — validates one requested field at a time; uses the requested Groq model only to acknowledge a locally classified HVAC issue category.
- `GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD&timeZone=...` — returns live availability from Cal.com.
- `POST /api/book` — re-checks the selected slot, creates the Cal.com booking, then sends distinct homeowner and technician confirmations through SendGrid.

The visitor's intake details remain in the browser until they confirm an appointment. Once confirmed, booking data is sent to Cal.com and the two transactional emails are sent through SendGrid.

## Deployment

The repository is configured for Vercel's standard Next.js build. Connect the private GitHub repository to the Vercel project and deploy the `main` branch. Add the environment variables above before enabling live appointment booking.
