const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('visual choreography starts only after the existing loader completes', () => {
  const page = read('app/components/VerticeLanding.tsx');
  const motion = read('app/components/ClimateMotion.tsx');
  assert.match(page, /<ClimateMotion ready=\{!loading\}/);
  assert.match(motion, /if \(!ready\) return/);
  assert.match(motion, /prefers-reduced-motion: no-preference/);
  assert.match(motion, /media\.revert\(\)/);
  assert.doesNotMatch(motion, /fetch\(|\/api\/|cal\.com/i);
});

test('hero and thermal peel consume the same bounded scroll staging progress', () => {
  assert.match(read('app/components/VerticeLanding.tsx'), /track\.dataset\.motionProgress = progress\.toFixed/);
  assert.match(read('app/components/Hero3D.jsx'), /thermalTrack\?\.dataset\.motionProgress/);
  assert.match(read('app/components/ThermalPeel.tsx'), /data-motion-progress/);
});

test('the product study retains drag, airflow and mobile frame budgeting', () => {
  const source = read('app/components/Hero3D.jsx');
  assert.match(source, /streamlineCount = mobile \? 6 : 10/);
  assert.match(source, /streamlineRefs\.current\.forEach/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /1000 \/ 30/);
  assert.match(source, /IntersectionObserver/);
  assert.doesNotMatch(source, /className="hotspot/);
});

test('automatic reveal remains default with no visible pause controls added', () => {
  const source = read('app/components/VerticeLanding.tsx');
  assert.match(source, /\[autoFlip, setAutoFlip\] = useState\(true\)/);
  assert.match(source, /addEventListener\('touchstart', stopForInput/);
  assert.doesNotMatch(source, /auto-flip-toggle|Pause animation|Resume animation/);
});
