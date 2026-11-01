const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.resolve(__dirname, '..', name), 'utf8');

test('each comfort moment is a real App Router page with a distinct scene assignment', () => {
  const routes = ['', 'approach', 'system', 'service-log', 'contact', 'contractors'];
  const keys = ['home', ...routes.slice(1)];
  routes.forEach((route, index) => {
    const source = read(`app/${route ? route + '/' : ''}page.tsx`);
    assert.ok(source.includes(`<PageExperience page="${keys[index]}" />`));
    assert.ok(source.includes('canonical:'));
  });
  const scenes = read('app/components/PageExperience.tsx');
  for (const [key, stage] of [['home',0],['approach',1],['system',2],["'service-log'",3],['contact',4]]) {
    assert.ok(scenes.includes(`${key}: { stage: ${stage},`));
  }
  assert.ok(scenes.includes('stageIndex={data.stage}'));
});

test('the shared layout preserves a single concierge between client page transitions', () => {
  assert.ok(read('app/layout.tsx').includes('<SiteShell>{children}</SiteShell>'));
  const shell = read('app/components/SiteShell.tsx');
  assert.equal((shell.match(/<Concierge /g) || []).length, 1);
  assert.ok(shell.includes("import Link from 'next/link'"));
  assert.ok(shell.includes("spotlight={pathname === '/contact'}"));
  assert.ok(shell.includes('ChatContext.Provider'));
});

test('the final-page guide ends at the real launcher and never intercepts clicks', () => {
  const guide = read('app/components/ChatGuide.tsx');
  assert.ok(guide.includes("querySelector<HTMLElement>('.chat-launcher')"));
  assert.ok(guide.includes("getPropertyValue('--hand-x')"));
  assert.ok(guide.includes("getPropertyValue('--hand-y')"));
  assert.ok(read('app/globals.css').includes('z-index: 49; pointer-events: none;'));
  assert.ok(read('app/components/PageExperience.tsx').includes('onClick={openChat}'));
});

test('photorealistic scenes are page-controlled, lightweight, and reduced-motion safe', () => {
  const scene = read('app/components/PhotorealScene.tsx');
  assert.ok(scene.includes('stageIndex'));
  assert.ok(scene.includes("prefers-reduced-motion: reduce"));
  assert.ok(scene.includes('IntersectionObserver'));
  assert.ok(scene.includes('video.pause()'));
  assert.ok(scene.includes('muted'));
  assert.ok(scene.includes('playsInline'));
  assert.ok(!read('app/components/PageExperience.tsx').includes('<Hero3D'));
  for (const id of ['hot-home', 'arrival', 'repair', 'comfort', 'chat-invitation']) {
    for (const ext of ['mp4', 'jpg']) {
      const file = path.resolve(__dirname, '..', 'public', 'media', `${id}.${ext}`);
      assert.ok(fs.statSync(file).size > 10000);
    }
  }
});
