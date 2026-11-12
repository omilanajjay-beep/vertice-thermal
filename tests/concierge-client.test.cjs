const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const appPage = path.resolve(__dirname, '../app/page.tsx');
const experienceFile = path.resolve(__dirname, '../app/components/PaperWorlds.tsx');
const readExperience = () => fs.readFileSync(experienceFile, 'utf8');

test('homepage renders the Paper Worlds experience as the entire page', () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const paperWorlds = Symbol('PaperWorlds');
  const code = ts.transpileModule(fs.readFileSync(appPage, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: appPage,
  }).outputText;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (request === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (request === './components/PaperWorlds') return { __esModule: true, default: paperWorlds };
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
  assert.equal(tree.type, 'main');
  assert.equal(tree.props.className, 'paper-site');
  assert.equal(tree.props.children.type, paperWorlds);
  assert.doesNotMatch(fs.readFileSync(appPage, 'utf8'), /VERTICE|Concierge|HVAC/);
});

test('story camera and plane follow one continuous, scroll-keyframed path', () => {
  const source = readExperience();
  assert.match(source, /const cameraTrack: Point\[\]/);
  assert.match(source, /const planeTrack: FlightPoint\[\]/);
  assert.match(source, /const p = scrollProgress\(\)/);
  assert.match(source, /sampleTrack\(p, cameraTrack, 'pos'\)/);
  assert.match(source, /sampleTrack\(p, planeTrack, 'pos'\)/);
  assert.match(source, /scene\.background = finalSky/);
});

test('the flight includes code-painted materials, meadow, forest, stone passage and sky-cliff reveal', () => {
  const source = readExperience();
  for (const feature of [
    'makePaintTexture', 'new THREE.CanvasTexture', 'woodMat', 'cottage', 'smokePuffs',
    'forestWinds', 'Fern fronds', 'mushroomCap', 'archRadius', 'waterfall', 'cloudSea', 'birds',
  ]) assert.ok(source.includes(feature), `Expected the experience to include ${feature}`);
  assert.match(source, /The Enchanted Forest/);
  assert.match(source, /The Sky Cliffs/);
});

test('reel, still-frame, reduced-quality and interface URL controls are supported', () => {
  const source = readExperience();
  assert.match(source, /params\.get\('demo'\) === '1'/);
  assert.match(source, /params\.get\('p'\)/);
  assert.match(source, /params\.get\('t'\)/);
  assert.match(source, /params\.get\('q'\) === 'low'/);
  assert.match(source, /params\.get\('ui'\) === '0'/);
  assert.match(source, /\/ 13600/);
  assert.match(source, /Start my journey/);
});

test('pointer steering is bounded and contracts through the forest and arch', () => {
  const source = readExperience();
  assert.match(source, /treeNarrow/);
  assert.match(source, /archNarrow/);
  assert.match(source, /const bound =/);
  assert.match(source, /controls\.pointerX \* bound/);
  assert.match(source, /objects\.plane\.rotation\.set/);
});
