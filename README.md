# Paper Worlds

**A little flight. A world of wonder.**

A single-page, real-time Three.js storybook in the existing `omilanajjay-beep/vertice-thermal` Next.js project. It replaces the VERTICE THERMAL homepage on the existing Render service; it does not create or change any other client site.

The opening camera descends from clouds to a folded paper plane on a wooden table. Scrolling carries it through a sunlit meadow, a forest corridor and stone arch, then into a valley of sky cliffs and clouds. Pointer movement adds bounded steering; the bounds close at the narrow passages. A continuous keyframed chase camera, procedural CanvasTextures, soft shafts, pollen, wind, waterfalls, rim light, restrained bloom and a grain/vignette grade render the scene without external image textures.

## Run locally

```bash
npm ci
npm run dev
```

The experience itself needs no credentials. Build and validate with:

```bash
npm run build
npm run typecheck
npm test
```

## Controls and capture URLs

- Scroll or swipe to fly forward and backward.
- Move the pointer to steer gently; the plane banks and its wings flex.
- `?demo=1`: plays a 13.6-second cinematic take, including the opening descent.
- `?p=0.56`: freezes the journey at normalized progress from 0 to 1.
- `?t=8`: freezes the equivalent progress at 8 seconds of the 13.6-second take.
- `?ui=0`: hides the interface for captures.
- `?q=low`: lowers pixel ratio, disables antialiasing and bloom for weaker GPUs.
- Options can be combined, for example `?p=0.84&ui=0&q=low`.

The end screen's **Start my journey** button resets the capture/flight state and replays the descent. Reduced-motion preferences suppress environmental drift and wing flutter while retaining manual scroll navigation.

## Existing deployment

- Repository: `omilanajjay-beep/vertice-thermal`, branch `main`.
- Render service: `srv-db9f7lajnfac73c2r3o0`.
- Public URL: https://vertice-thermal.onrender.com
- Build: `npm ci && npm run build`.
- Start: `npm start`.

The existing `/api/book`, `/api/slots`, `/api/concierge` routes and their Cal.com configuration are retained unchanged for rollback/compatibility. The Paper Worlds homepage does not call those routes, expose the previous HVAC chat, send emails, create bookings, or require their API keys. Credentials must remain in encrypted hosting environment variables and must not be committed to Git. No booking/webhook/email configuration is changed by this redesign.
