const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const appPage = path.resolve(__dirname, '../app/page.tsx');
const experienceFile = path.resolve(__dirname, '../app/components/LamplitBook.tsx');
const readExperience = () => fs.readFileSync(experienceFile, 'utf8');

test('homepage renders the Lamplit HVAC book as the entire page', () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const lamplitBook = Symbol('LamplitBook');
  const code = ts.transpileModule(fs.readFileSync(appPage, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: appPage,
  }).outputText;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (request === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (request === './components/LamplitBook') return { __esModule: true, default: lamplitBook };
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
  assert.equal(tree.type, lamplitBook);
});

test('the experience includes the dark desk, book, lamp, and 3D scene primitives', () => {
  const source = readExperience();
  for (const feature of ['createDeskScene', 'new THREE.WebGLRenderer', 'pageCurlMaterial', 'lampLight', 'new THREE.Mesh', 'pointer']) {
    assert.ok(source.includes(feature), `Expected the experience to include ${feature}`);
  }
  assert.match(source, /black hardcover|coverMaterial|paperMaterial/i);
  assert.match(source, /pointermove/);
});

test('the four HVAC story pages preserve the requested narrative captions', () => {
  const source = readExperience();
  for (const phrase of [
    'The 11:00 PM Emergency',
    'The Direct Loss',
    'The 24/7 AI Receptionist',
    '$5,400',
    'Claim Your Custom 30-Minute Pipeline Demo For Your HVAC Business',
  ]) assert.ok(source.includes(phrase), `Expected the story to include ${phrase}`);
  assert.match(source, /PhoneVisual/);
  assert.match(source, /CompetitorVisual/);
  assert.match(source, /PipelineVisual/);
  assert.match(source, /MetricsVisual/);
});

test('the book supports cover opening, clicks, dragging, and arrow-key navigation', () => {
  const source = readExperience();
  assert.match(source, /const openBook/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /onPointerUp/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /setTurning/);
});

test('the Elena chat dock submits to the secure concierge endpoint', () => {
  const source = readExperience();
  assert.match(source, /Elena/);
  assert.match(source, /AI RECEPTIONIST/);
  assert.match(source, /fetch\('\/api\/concierge'/);
  assert.match(source, /completedFields/);
  assert.match(source, /setChatOpen/);
});
