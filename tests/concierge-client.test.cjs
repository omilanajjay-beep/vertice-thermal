const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const appPage = path.resolve(__dirname, '../app/page.tsx');
const experienceFile = path.resolve(__dirname, '../app/components/HvacSlideDeck.tsx');
const cssFile = path.resolve(__dirname, '../app/globals.css');
const layoutFile = path.resolve(__dirname, '../app/layout.tsx');
const readExperience = () => fs.readFileSync(experienceFile, 'utf8');
const readCss = () => fs.readFileSync(cssFile, 'utf8');

test('homepage renders the HVAC slide deck as the complete experience', () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const slideDeck = Symbol('HvacSlideDeck');
  const code = ts.transpileModule(fs.readFileSync(appPage, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: appPage }).outputText;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (request === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (request === './components/HvacSlideDeck') return { __esModule: true, default: slideDeck };
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
  assert.equal(tree.type, slideDeck);
});

test('the supplied five-part HVAC story and metrics are present', () => {
  const source = readExperience();
  for (const feature of [
    'The After-Hours Leak: How Local HVAC Companies Lose $5,000+ Every Month',
    'The 11:00 PM Emergency', 'The Direct Loss', 'The 24/7 AI Receptionist', 'Revenue Recovery',
    '11:00 PM', '100%', '+$5,400', 'Instant',
    'Claim Your Custom 30-Minute Pipeline Demo For Your HVAC Business',
  ]) assert.ok(source.includes(feature), `Expected ${feature}`);
  assert.match(source, /const slides: Slide\[\] = \[/);
});

test('VERTICE remains the selected brand in the page and metadata', () => {
  const source = readExperience();
  const metadata = fs.readFileSync(layoutFile, 'utf8');
  assert.match(source, /brand-name">VERTICE</);
  assert.match(source, /VERTICE \/ LIVE INTAKE/);
  assert.doesNotMatch(source, /VERTEX/);
  assert.match(metadata, /VERTICE THERMAL/);
  assert.doesNotMatch(metadata, /VERTEX/);
});

test('the header, final demo CTA, and floating chat launcher share the chat flow', () => {
  const source = readExperience();
  assert.match(source, /Get in Touch/);
  assert.match(source, /Claim Your Custom 30-Minute Pipeline Demo For Your HVAC Business/);
  assert.match(source, /Chat with Elena/);
  assert.match(source, /aria-expanded=\{chatOpen\}/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /Skip to briefing/);
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

test('emergency photo, keyboard controls, responsive layout, and reduced-motion support are present', () => {
  const source = readExperience();
  const css = readCss();
  assert.match(source, /night-hvac-repair\.webp/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /ArrowLeft/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /overflow: auto/);
});
