# VERTEX — top-down HVAC flatlay

## Design direction

The experience is **Lamplit Precision**: a fixed, top-down studio flatlay with a dark textured black-oak desk, a warm overhead pool of light, and a horizontal open book as the only focal object. The composition is deliberately crisp and physical: no vertical page, no blur, no backdrop-filter, and no frosted UI. The black desk absorbs the frame, the off-white left page carries the index, and the bright editorial right page turns a missed call into a measurable HVAC business problem.

The layout is a single viewport (`100vw × 100vh`) with `overflow: hidden`. The VERTEX wordmark sits at top-left in clean white sans-serif; a compact white “Get in Touch” pill sits at top-right; small mono metadata sits at the edges without competing with the book.

The camera uses a Three.js PerspectiveCamera positioned high and steeply downward (`y=13, z=5`) toward the desk center. The book sits on a low black cover with two 16:10 page planes. The far-left framing props are a geometric succulent and angled dark wooden pencil. The far-right framing prop is a white ceramic cappuccino cup, latte surface, white saucer, and handle cropped by the viewport edge. A warm overhead spotlight creates a clean pool and soft cast shadows.

## Texture and interaction implementation

`app/components/LamplitBook.tsx` owns the scene. Every page is drawn into a 2048×1280 HTML5 Canvas and converted to a `THREE.CanvasTexture`; each texture uses `texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy())`, sRGB color space, and linear filtering. The first spread is a clean off-white Contents page with a two-column four-chapter index and a full-bleed right story page. Later spreads reuse those crisp canvas story pages for the four HVAC chapters.

The page-turn model uses left and right page pivot groups anchored at the center spine. Clicking a rendered page is raycast against the actual 3D page meshes; the right page advances and the left page reverses. Left/Right arrow keys call the same turn queue. A hidden under-spread is populated before animation so the turn reveals the next spread instead of an empty desk. The pivot animates across the spine with a subtle segmented page bend from the subdivided plane, then swaps the high-resolution textures.

The top-right contact pill preserves the existing same-origin `/api/concierge` intake route in a crisp, non-blurred panel. It remains optional to the flatlay and does not introduce a second provider or expose secrets.

## Project structure

- `app/page.tsx` mounts `LamplitBook` as the only homepage experience.
- `app/components/LamplitBook.tsx` contains the Three.js desk, physical props, canvas page renderer, raycast page hit detection, page-turn state, keyboard controls, and contact panel.
- `app/globals.css` defines the fixed viewport, sharp studio chrome, contact panel, responsive safe area, and zero blur/backdrop-filter policy.
- `app/api/concierge/route.ts` and `app/lib/intake.ts` remain the secure HVAC intake backend.
- `public/manus-routes.json` remains synchronized to the single `/` route.
- `app.config.ts` preserves the durable project logo metadata.
