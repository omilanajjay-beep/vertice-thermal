const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.resolve(__dirname, '..', name), 'utf8');

test('the five requested deep URLs are separate App Router pages with unique scene assignments', () => {
  const routes = [
    ['equipment/diagnostics.html', 'diagnostics'],
    ['service/emergency-repair.html', 'repair'],
    ['case-studies/comfort-restored.html', 'comfort'],
    ['company/verified-reviews.html', 'reviews'],
    ['booking/secure-dispatch.html', 'booking'],
  ];
  for (const [route, scene] of routes) {
    const source = read(`app/${route}/page.tsx`);
    assert.ok(source.includes(`<StoryPage page="${scene}" />`), `${route} owns the ${scene} view`);
    assert.ok(source.includes(`canonical: '/${route}'`));
  }
  const home = read('app/components/StoryPage.tsx');
  for (const route of ['/equipment/diagnostics.html', '/service/emergency-repair.html', '/case-studies/comfort-restored.html', '/company/verified-reviews.html', '/booking/secure-dispatch.html']) {
    assert.ok(home.includes(route));
  }
  assert.ok(read('app/page.tsx').includes("redirect('/equipment/diagnostics.html')"));
});

test('the shared layout preserves a single concierge between client page transitions', () => {
  assert.ok(read('app/layout.tsx').includes('<SiteShell>{children}</SiteShell>'));
  const shell = read('app/components/SiteShell.tsx');
  assert.equal((shell.match(/<Concierge /g) || []).length, 1);
  assert.ok(shell.includes("import Link from 'next/link'"));
  assert.ok(shell.includes("pathname === '/booking/secure-dispatch.html'"));
  assert.ok(shell.includes('ChatContext.Provider'));
});

test('the final-page guide ends at the real launcher and never intercepts clicks', () => {
  const guide = read('app/components/ChatGuide.tsx');
  assert.ok(guide.includes("querySelector<HTMLElement>('.chat-launcher')"));
  assert.ok(guide.includes("getPropertyValue('--hand-x')"));
  assert.ok(guide.includes("getPropertyValue('--hand-y')"));
  assert.ok(read('app/globals.css').includes('z-index: 49; pointer-events: none;'));
  assert.ok(read('app/components/StoryPage.tsx').includes('onClick={openChat}'));
  assert.ok(read('app/components/StoryPage.tsx').includes('<ChatGuide />'));
});

test('each route owns a high-performance WebGL canvas with reduced-motion and unload cleanup', () => {
  const scene = read('app/components/StoryScene.tsx');
  assert.ok(scene.includes('WebGLRenderer({ antialias: true'));
  assert.ok(scene.includes('renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))'));
  assert.ok(scene.includes('THREE.PCFSoftShadowMap'));
  assert.ok(scene.includes("prefers-reduced-motion: reduce"));
  assert.ok(scene.includes('IntersectionObserver'));
  assert.ok(scene.includes("window.addEventListener('beforeunload', onBeforeUnload)"));
  assert.ok(scene.includes('renderer?.dispose()'));
  assert.ok(scene.includes('device.rotation.y = elapsed * 0.48'));
});

test('the reviews page contains the five supplied review records without invented testimonials', () => {
  const reviews = read('app/lib/reviews.ts');
  for (const name of ['Marcus Vance', 'Elena Rostova', 'David & Sarah Kim', 'Chief Engineering Officer Robert Chen', 'Clara Montgomery']) {
    assert.ok(reviews.includes(name));
  }
  assert.equal((reviews.match(/id: '/g) || []).length, 5);
  assert.ok(read('app/components/StoryPage.tsx').includes('homeownerReviews.map'));
});
