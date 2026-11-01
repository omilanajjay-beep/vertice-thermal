# VERTICE THERMAL implementation plan

## Five separate story routes

The story now uses five independently addressable Next.js App Router pages. Each produces its own HTML response and owns a route-local WebGL canvas:

1. `/equipment/diagnostics.html` — the rotating digital manifold and measured diagnostics.
2. `/service/emergency-repair.html` — a red-lit home and working technician.
3. `/case-studies/comfort-restored.html` — the same room with cool airflow and a happy family.
4. `/company/verified-reviews.html` — a floating review board plus five dated homeowner review cards.
5. `/booking/secure-dispatch.html` — a smiling technician with a toolbox, pointing toward the real chat launcher.

The root and retired shallow story URLs redirect into this deep-route journey. The visible navigation links only to these five story destinations.

## Scenes and presentation

`app/components/StoryPage.tsx` contains the route-local editorial layouts and story navigation. `app/components/StoryScene.tsx` builds the procedural Three.js scenes; no attached reference images are deployed. The room builder is shared so its layout remains the same across the repair, comfort, review and booking states. Each mounted scene initializes its own antialiased renderer with capped retina density, soft shadows, responsive camera fitting, visibility-aware animation and reduced-motion support. Scene resources are disposed on unmount and before window unload.

The diagnostics route keeps its reflective rotating Three.js manifold gauge. Repair, comfort, verified-reviews and secure-dispatch each use their own short, silent photoreal motion scene with the same reference cast and light-filled home. The reviews scene uses a slow camera drift across a high-resolution still, avoiding unstable face and hand motion; all four scenes have lightweight still posters. A transparent, animated WebGL dust-mote layer remains active over the footage. Reduced-motion preference pauses both video and scene movement, and the one-scene-per-route page architecture is unchanged.

The shared theme is warm daylight: ivory page surfaces, soft sage, natural wood, restrained brass and deep-green text. Navigation, review cards, booking panels, mobile menus and the open concierge all use the same bright surface system. Only the selected route's scene and content render, never five concatenated story stages on one long page.

## Shared booking

`app/components/SiteShell.tsx` retains one persistent `Concierge` instance across route changes. The launcher remains fixed above the canvases; the final route adds a click-through guide and soft sage-and-brass spotlight. Booking and notification code is unchanged: `/api/concierge` handles intake, `/api/slots` reads Cal.com availability, and `/api/book` verifies the slot before booking and sending separate SendGrid emails to the homeowner and dispatch. Secrets remain environment-only.

## Reviews and verification

The five review records in `app/lib/reviews.ts` were supplied by the owner for this update. Their names, dates, locations, rating values, headlines and review bodies are presented without third-party review-platform attribution. No additional testimonial, rating or service outcome is invented.

## Validation and deployment boundary

Run `npm test`, `npm run typecheck`, and `npm run build`; booking tests use mocks and do not create bookings or send messages. All five deep routes should return successfully with the global launcher present. The owner chose to keep Next.js unchanged for this deployment. The existing Next.js 14.2.35 dependency audit contains a critical advisory; security remediation remains a separate follow-up, not a claim of a clean audit for this update.
