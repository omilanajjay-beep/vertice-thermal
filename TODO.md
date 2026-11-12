# VERTEX — flatlay delivery outcomes

## Fixed viewport and sharp studio presentation

- Delete the vertical scrolling layout and use `overflow: hidden` with a full-viewport `h-screen w-screen` composition.
- Remove all CSS `blur()` and `backdrop-filter` effects; every surface, control, page, and texture must remain razor-sharp and crisp.
- Position a Three.js PerspectiveCamera steeply downward around 65–75 degrees over a dark textured black oak desk surface `#111111`.
- Keep the composition top-down and flatlay-focused rather than presenting a scrolling landing page.

## Desk props and lighting

- Place a small geometric potted succulent and a dark wooden pencil angled slightly toward the book at far left.
- Place a white ceramic cappuccino cup with latte art on a white saucer at far right, partially cropped at the right edge.
- Use a warm overhead spotlight/lamplight that casts a clean pool of light onto the open book with realistic soft shadows around the cup, succulent, and book edges.

## Open book and high-resolution page content

- Keep a wide horizontal hardcover book lying flat in the center, open to a two-page spread with 16:10 page proportions.
- Render page contents onto high-resolution HTML5 Canvas textures at `2048x1280`, with anisotropy `16`, so typography and graphics stay readable and sharp on the 3D pages.
- Make the left page off-white `#F3F2EE` with a “Contents” header and a clean two-column list: “01. The 11:00 PM Emergency”, “02. The Competitor Loss”, “03. 24/7 AI Receptionist”, and “04. Revenue Recovery”.
- Make the right page a full-bleed crisp HVAC story visual with bold white editorial typography on the left side, such as “Every missed call costs a job.”, and a small yellow pill button at the bottom.

## UI overlay and page turning

- Use a minimal top-left white sans-serif “VERTEX” logo and a top-right white pill button labeled “Get in Touch”.
- Clicking the right page, clicking the left page, or pressing Left/Right arrow keys must smoothly flip the 3D page mesh across the center spine with a subtle bend/curl animation.
- Keep the existing concierge intake available behind “Get in Touch” without adding blur or changing the secure backend boundary.
