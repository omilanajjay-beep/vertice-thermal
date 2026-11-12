# VERTICE THERMAL — Lamplit HVAC field note

## Product and design direction

The site is a cinematic, editorial field note for local HVAC owners. The design movement is **Lamplit technical noir**: a black lacquered oak desk, a matte black hardcover book, warm tungsten light, off-white paper, and restrained engineering annotations. It should feel like a premium direct-response story rather than a generic service landing page.

Core principles:

- **Contrast earns attention:** pure black and dark slate create the room; off-white paper carries the argument; muted brass is reserved for signals and conversion.
- **The book is the interface:** the front cover is the opening action; page turns are the navigation model; the narrative moves from missed call to recovered revenue.
- **Evidence over decoration:** every page has a concrete visual case, timestamp, pipeline state, or metric.
- **Quietly cinematic:** camera push-in, cursor lean, warm lamp pulse, page-curl shader, and small UI transitions should feel deliberate rather than flashy.

Typography is Inter for all interface and narrative copy with DM Mono for field labels, timestamps, and system annotations. Signature motifs are the V monogram, warm status dots, folios, thin measurement rules, and the 24/7 pipeline indicator. Brand voice is direct, calm, and commercially specific: “The call you miss is already someone else’s booked job.” / “Show me where your after-hours revenue is leaking.”

## Experience and implementation

- `app/page.tsx`: home route that mounts the client-side book experience.
- `app/components/LamplitBook.tsx`: procedural Three.js desk, hardcover book, lamp, cup, pencil, cards, succulent, cursor lean, cover push-in, page navigation, page-curl shader, story visuals, and Elena chat dock.
- `app/globals.css`: black/dark slate desk system, off-white book pages, responsive book spread, visual case studies, page-turn motion, and chat styling.
- `app/api/concierge/route.ts` and `app/lib/intake.ts`: preserved secure HVAC intake backend used by the enabled chat interface.
- `public/manus-routes.json`: homepage route declaration.
- `app.config.ts`: durable project logo URL for the managed checkpoint.

The page model is cover plus four story pages: the 11:00 PM emergency, the competitor loss, the automated receptionist pipeline, and the recovered-revenue CTA. Navigation works with click halves, edge dragging, arrow keys, and a visible previous/next control. Elena’s floating chat starts collapsed, expands into a live intake dock, submits to `/api/concierge`, keeps answers client-side for the conversation, and preserves the existing backend’s validation and graceful fallback behavior.

## Service boundary

No new secret is required. The chat uses the existing same-origin concierge route and its existing environment-only provider configuration. The experience is fully usable when the optional model provider is unavailable because the route already supplies deterministic fallback replies.
