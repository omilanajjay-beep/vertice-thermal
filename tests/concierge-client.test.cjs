const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const appPage = path.resolve(__dirname, '../app/page.tsx');
const landingFile = path.resolve(__dirname, '../app/components/VerticeLanding.tsx');
const modelFile = path.resolve(__dirname, '../app/components/Hero3D.jsx');
const experienceFile = path.resolve(__dirname, '../app/components/HvacSlideDeck.tsx');
const cssFile = path.resolve(__dirname, '../app/globals.css');
const layoutFile = path.resolve(__dirname, '../app/layout.tsx');
const readLanding = () => fs.readFileSync(landingFile, 'utf8');
const readExperience = () => fs.readFileSync(experienceFile, 'utf8');
const readCss = () => fs.readFileSync(cssFile, 'utf8');

test('homepage renders the VERTICE THERMAL one-page landing experience', () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const landing = Symbol('VerticeLanding');
  const code = ts.transpileModule(fs.readFileSync(appPage, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: appPage }).outputText;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (request === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (request === './components/VerticeLanding') return { __esModule: true, default: landing };
    return original.call(this, request, parent, main);
  };
  let tree;
  try {
    const mod = new Module(appPage, module);
    mod.filename = appPage;
    mod.paths = Module._nodeModulePaths(path.dirname(appPage));
    mod._compile(code, appPage);
    tree = mod.exports.default();
  } finally { Module._load = original; }
  assert.equal(tree.type, landing);
});

test('landing includes the pinned climate reveal, worker thermal map, and recording mode', () => {
  const source = readLanding();
  assert.match(source, /Precision<br \/><em>Climate\.<\/em>/);
  assert.match(source, /We Cool/);
  assert.match(source, /human comfort/);
  assert.match(source, /new Worker\(workerUrl\)/);
  assert.match(source, /get\('demo'\) !== '1'/);
  assert.match(source, /className="thermal-track"/);
  assert.match(source, /className="thermal-sheet"/);
});

test('VERTICE THERMAL remains the selected brand and the model panel carries the exact unit mark', () => {
  const source = readLanding();
  const model = fs.readFileSync(modelFile, 'utf8');
  const metadata = fs.readFileSync(layoutFile, 'utf8');
  assert.match(source, /VERTICE THERMAL/);
  assert.match(model, /VERTICE THERMAL · Commercial Grade 2026©/);
  assert.match(metadata, /VERTICE THERMAL/);
  assert.doesNotMatch(`${source}\n${model}\n${metadata}`, /Apex Air|APEX AIR|VERTEX/);
});

test('maintenance and contact CTAs open the same floating Elena chat', () => {
  const source = readLanding();
  const chatSource = readExperience();
  assert.match(source, /Book maintenance/);
  assert.match(source, /Talk with Elena/);
  assert.match(source, /import \{ ChatPanel \} from '\.\/HvacSlideDeck'/);
  assert.match(source, /aria-expanded=\{chatOpen\}/);
  assert.match(chatSource, /role="dialog"/);
  assert.match(source, /Skip to services/);
});

test('auto flip is on by default and user-interruptible without a visible pause toggle', () => {
  const source = readLanding();
  assert.match(source, /useState\(true\)/);
  assert.doesNotMatch(source, /AUTO FLIP|auto-flip-toggle/);
  assert.match(source, /setAutoFlip\(false\)/);
  assert.match(source, /addEventListener\('wheel', stopForInput/);
  assert.match(source, /addEventListener\('touchstart', stopForInput/);
  assert.match(source, /addEventListener\('pointerdown', stopForInput/);
});

test('chat keeps the required intake order and only advances after accepted replies', () => {
  const source = readExperience();
  assert.match(source, /\['name', 'phone', 'email', 'address', 'problem'\]/);
  assert.match(source, /fetch\('\/api\/concierge'/);
  assert.match(source, /if \(!data\.accepted\) return/);
  assert.match(source, /if \(data\.complete\)/);
  assert.match(source, /knownName: answers\.name/);
});

test('availability and booking use only the existing Cal.com API routes', () => {
  const source = readExperience();
  assert.match(source, /fetch\(`\/api\/slots\?/);
  assert.match(source, /fetch\('\/api\/book'/);
  assert.match(source, /Confirm appointment/);
  assert.match(source, /Cal\.com will handle your appointment confirmation email/);
  assert.doesNotMatch(source, /make\.com|pipedream|sendgrid/i);
});

test('3D unit has GPU telemetry, user drag, inertial orbit, louvers, and mobile/reduced-motion coverage', () => {
  const source = fs.readFileSync(modelFile, 'utf8');
  const css = readCss();
  assert.match(source, /particleCount = 1100/);
  assert.match(source, /vertexShader:/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /drag\.velocity/);
  assert.match(source, /louverRefs\.current\.forEach/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /overflow-y: auto/);
});
