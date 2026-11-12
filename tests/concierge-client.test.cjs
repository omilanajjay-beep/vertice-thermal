const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const appPage = path.resolve(__dirname, '../app/page.tsx');
const experienceFile = path.resolve(__dirname, '../app/components/LamplitBook.tsx');
const cssFile = path.resolve(__dirname, '../app/globals.css');
const readExperience = () => fs.readFileSync(experienceFile, 'utf8');
const readCss = () => fs.readFileSync(cssFile, 'utf8');

test('homepage renders the flatlay book experience as the entire page', () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const flatlayBook = Symbol('LamplitBook');
  const code = ts.transpileModule(fs.readFileSync(appPage, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: appPage }).outputText;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (request === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (request === './components/LamplitBook') return { __esModule: true, default: flatlayBook };
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
  assert.equal(tree.type, flatlayBook);
});

test('the scene is a top-down desk flatlay with the requested props and lighting', () => {
  const source = readExperience();
  for (const feature of ['PerspectiveCamera', "camera.position.set(0, 13, 5)", 'woodTexture', 'succulent', 'pencil', 'saucer', 'latte', 'SpotLight', 'PCFSoftShadowMap']) assert.ok(source.includes(feature), `Expected ${feature}`);
  assert.match(source, /#111111/);
  assert.match(source, /#FFD28B/);
});

test('page artwork is high-resolution canvas texturing with anisotropy 16', () => {
  const source = readExperience();
  for (const feature of ['PAGE_WIDTH = 2048', 'PAGE_HEIGHT = 1280', 'CanvasTexture', 'anisotropy', 'getMaxAnisotropy', 'Contents', 'The 11:00 PM Emergency', 'Every missed call']) assert.ok(source.includes(feature), `Expected ${feature}`);
  assert.match(source, /Math\.min\(16/);
});

test('page turns are real 3D spine pivots triggered by clicks and arrow keys', () => {
  const source = readExperience();
  for (const feature of ['Raycaster', 'leftPivot', 'rightPivot', 'rotation.z', 'uCurl', 'pointerup', 'ArrowRight', 'ArrowLeft']) assert.ok(source.includes(feature), `Expected ${feature}`);
  assert.match(source, /underLeft\.visible = true/);
  assert.match(source, /underRight\.visible = true/);
});

test('sharp fixed CSS contains no blur or backdrop-filter effects', () => {
  const css = readCss();
  assert.match(css, /overflow:\s*hidden/);
  assert.doesNotMatch(css, /blur\s*\(/i);
  assert.doesNotMatch(css, /backdrop-filter/i);
  assert.doesNotMatch(css, /filter\s*:/i);
});

test('the crisp VERTEX overlay preserves the secure contact flow', () => {
  const source = readExperience();
  assert.match(source, />VERTEX</);
  assert.match(source, /Get in Touch/);
  assert.match(source, /fetch\('\/api\/concierge'/);
});
