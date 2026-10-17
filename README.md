# VERTICE THERMAL

A responsive architectural climate-systems site with a procedural Three.js product study, GSAP camera hotspots, contractor revenue calculator, truthful service/review states, and server-side concierge, Cal.com, and SendGrid routes.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The front end runs without credentials. Live appointment availability and booking are enabled only after the server-side integrations are configured. No secret belongs in client-side code or in Git.

## Production environment

Set values in the hosting provider's encrypted environment-variable settings. Do not commit `.env.local` or actual API keys.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Optional | Calls `llama-3.3-70b-versatile` for a short acknowledgement of the final HVAC concern; customer contact/address details are not sent to Groq. |
| `CAL_API_KEY` | Yes for booking | Cal.com API access for live availability and booking. |
| `CAL_EVENT_TYPE_ID` | One event selector required | Cal.com event type ID. Use this **or** configure the slug selector below. |
| `CAL_EVENT_TYPE_SLUG` | Alternative event selector | Use with `CAL_USERNAME` or `CAL_TEAM_SLUG`; optionally include `CAL_ORGANIZATION_SLUG`. |
| `CAL_USERNAME` | Conditional | Required with `CAL_EVENT_TYPE_SLUG` when using a personal event. |
| `CAL_TEAM_SLUG` | Conditional | Use with `CAL_EVENT_TYPE_SLUG` when using a team event. |
| `CAL_ORGANIZATION_SLUG` | Optional | Organization identifier for a Cal.com organization event. |
| `SENDGRID_API_KEY` | Yes for booking confirmation | Sends the homeowner and dispatch emails after a confirmed appointment. |
| `SENDGRID_FROM_EMAIL` | Yes for booking email | Verified SendGrid sender; requested default: `omilanajjay@gmail.com`. |
| `SENDGRID_TECH_EMAIL` | Yes for booking email | On-call technician/dispatch recipient. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical public site origin for metadata, e.g. the final Netlify site URL. |

The live booking route verifies Cal.com availability and requires configured Cal.com and SendGrid values before it can create a booking. Until configured, availability and booking routes fail closed; the front-end site remains usable.

## Backend routes

- `POST /api/concierge` — validates one requested field at a time; uses the requested Groq model only to acknowledge a locally classified HVAC issue category.
- `GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD&timeZone=...` — returns live availability from Cal.com.
- `POST /api/book` — re-checks the selected slot, creates the Cal.com booking, then sends distinct homeowner and technician confirmations through SendGrid.

The visitor's intake details remain in the browser until they confirm an appointment. Once confirmed, booking data is sent to Cal.com and the two transactional emails are sent through SendGrid.

## Netlify deployment

The site uses Next.js App Router, which Netlify supports through its automatically managed OpenNext adapter. Import the private repository `https://github.com/omilanajjay-beep/vertice-thermal` and deploy the `main` branch. Use the **Next.js** framework preset, build command `npm run build`, and Node.js 22. Leave the publish directory to Netlify's automatic Next.js adapter detection; do not force a static export or a custom publish directory. Add the environment variables above in Netlify's encrypted site environment settings, then deploy. Set `NEXT_PUBLIC_SITE_URL` to the assigned production origin after Netlify creates the site and redeploy if necessary.
