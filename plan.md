# VERTICE THERMAL implementation plan

## Product and design direction

VERTICE THERMAL is positioned as a quiet-luxury climate systems brand for design-conscious homeowners and specialist contractors. The design movement is editorial architectural minimalism: charcoal surfaces, champagne metal, sand typography and restrained motion. The layout uses asymmetrical editorial bands and a technical field-log cadence rather than generic centered cards. Signature motifs are the V monogram, engineering labels and gold measurement lines. Motion is deliberate and slow: hotspot emphasis, fan rotation and soft GSAP focus shifts reinforce precision. Manrope carries the UI; Playfair Display carries the high-end editorial voice.

## Structure

- `app/page.tsx`, `app/approach`, `app/system`, `app/service-log`, `app/contact`, `app/contractors`: real App Router pages, each with page-specific photorealistic, human-looking rendered motion.
- `app/components/SiteShell.tsx`: persistent root navigation and the same live concierge on every page.
- `app/components/PageExperience.tsx`: controlled scene stage and page-local content.
- `app/components/ChatGuide.tsx`: final-page hand-to-real-chatbot direction guide.
- `app/components/PhotorealScene.tsx`: lazy video playback, offscreen pausing, motion preference posters and replay.
- `public/media`: five optimized cinematic clips and their reduced-motion JPEG posters.
- `app/globals.css`: responsive visual system, luxury palette, typography, layout and motion styling.
- `app/api/concierge/route.ts`: server-side Groq relay with strict one-field-at-a-time intake persona.

## Service boundary

Secrets are environment-only. The API route degrades gracefully to offline copy when Groq is unavailable. Cal.com and SendGrid are reserved for server-side booking and confirmation wiring after production account configuration; no client secret is exposed.
