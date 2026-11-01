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
  assert.equal((home.match(/<StoryScene\s/g) || []).length, 1, 'the selected page mounts one current scene, not all five stages');
  assert.equal((home.match(/<section className="deep-hero"/g) || []).length, 1, 'each route renders one page hero');
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
  assert.ok(scene.includes('renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth >= 1440 ? 2.5 : 2))'));
  assert.ok(scene.includes('THREE.PCFSoftShadowMap'));
  assert.ok(scene.includes("prefers-reduced-motion: reduce"));
  assert.ok(scene.includes('IntersectionObserver'));
  assert.ok(scene.includes("window.addEventListener('beforeunload', onBeforeUnload)"));
  assert.ok(scene.includes('renderer?.dispose()'));
  assert.ok(!scene.includes('renderer?.forceContextLoss()'), 'release old scenes without racing the next route’s shader compilation');
  assert.ok(scene.includes('key.castShadow = !motionSource'));
  assert.ok(scene.includes("key.shadow.mapSize.set(step === 'diagnostics' ? 2048 : 1024, step === 'diagnostics' ? 2048 : 1024)"));
  assert.ok(scene.includes('device.rotation.y = elapsed * 0.68'));
});

test('the reviews page contains the five supplied review records without invented testimonials', () => {
  const reviews = read('app/lib/reviews.ts');
  for (const name of ['Marcus Vance', 'Elena Rostova', 'David & Sarah Kim', 'Chief Engineering Officer Robert Chen', 'Clara Montgomery']) {
    assert.ok(reviews.includes(name));
  }
  assert.equal((reviews.match(/id: '/g) || []).length, 5);
  assert.ok(read('app/components/StoryPage.tsx').includes('homeownerReviews.map'));
});

test('all five story routes use a warm light page theme and matching bright 3D environments', () => {
  const styles = read('app/globals.css');
  const scene = read('app/components/StoryScene.tsx');
  assert.match(styles, /color-scheme:\s*light;/);
  assert.match(styles, /--page-background:\s*#f7f5ef;/);
  assert.match(styles, /background:\s*var\(--page-background\);/);
  assert.ok(styles.includes('background: #fffdf8;'));
  assert.match(scene, /const backdrop\s*=\s*step === 'repair' \?/);
  assert.match(scene, /'#f7f4ed'/);
  assert.match(scene, /'#e9f2ee'/);
});

test('each separate narrative page uses its own photoreal motion asset and one transparent WebGL stage', () => {
  const scene = read('app/components/StoryScene.tsx');
  for (const [route, asset] of [['repair', 'room-repair'], ['comfort', 'room-comfort'], ['reviews', 'room-reviews'], ['booking', 'room-dispatch']]) {
    assert.ok(scene.includes(`${route}: { src: '/video/${asset}.mp4'`), `${route} page has its own motion file`);
    assert.ok(scene.includes(`poster: '/video/${asset}-poster.jpg'`), `${route} page has its own still fallback`);
  }
  assert.match(scene, /<video className="story-photoreal-video"/);
  assert.match(scene, /alpha: Boolean\(motionSource\)/);
  assert.match(scene, /addSunlitDust\(scene/);
  const page = read('app/components/StoryPage.tsx');
  assert.equal((page.match(/<StoryScene\s/g) || []).length, 1, 'each URL shows only its own scene rather than five stacked videos');
});

test('all four filmed scenes receive animated 3D airflow, depth particles and gentle camera drift', () => {
  const scene = read('app/components/StoryScene.tsx');
  const styles = read('app/globals.css');
  assert.ok(scene.includes('function addComfortAirflow(scene: THREE.Scene, step: StoryStep)'));
  assert.ok(scene.includes('const updateAirflow = addComfortAirflow(scene, step)'));
  assert.ok(scene.includes('updateAirflow(time)'));
  assert.ok(scene.includes('step === \'reviews\' ? 64 : 88'));
  assert.ok(scene.includes('camera.position.x = Math.sin(elapsed * 0.18) * 0.1'));
  assert.ok(styles.includes('animation: story-camera-drift 28s ease-in-out infinite alternate'));
  assert.ok(styles.includes('.story-photoreal-video { animation: none !important; transform: none; }'));
});

test('each story route exposes page boundaries, page-local scrolling and real previous/next URLs', () => {
  const page = read('app/components/StoryPage.tsx');
  assert.ok(page.includes('data-story-page={page}'));
  assert.ok(page.includes('PAGE {currentIndex + 1} OF 5'));
  assert.ok(page.includes('END OF PAGE {currentIndex + 1} OF 5'));
  assert.ok(page.includes('href="#page-details"'));
  assert.ok(page.includes('id="page-details"'));
  assert.ok(page.includes('href={next.path} scroll={true}'));
  assert.ok(page.includes('href={previous.path} scroll={true}'));
  assert.ok(page.includes('currentIndex < orderedRoutes.length - 1'));
  assert.ok(!page.includes('(currentIndex + 1) % orderedRoutes.length'));
  assert.ok(!page.includes('onWheel'));
});

test('the Apex-inspired layout keeps editorial facts and only the current stage details', () => {
  const page = read('app/components/StoryPage.tsx');
  assert.ok(page.includes('story-hero-facts'));
  assert.ok(page.includes('story-manifesto'));
  assert.ok(page.includes('<RouteEditorial page={page} openChat={openChat} />'));
  assert.ok(page.includes('story-closing-band'));
  assert.ok(read('app/components/RouteEditorial.tsx').includes('feature-stack'));
});
