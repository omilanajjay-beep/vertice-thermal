const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the actual client component without a browser or external services.
function createClient(initialOpen = true) {
  const values = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
    },
    useMemo(fn) { return fn(); },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const file = path.resolve(__dirname, '../app/page.tsx');
  const code = ts.transpileModule(`${fs.readFileSync(file, 'utf8')}\nexport { Concierge };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (request === 'react') return react;
    if (request === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (request === 'lucide-react') return new Proxy({}, { get: (_, name) => name });
    if (request.startsWith('./components/')) return { default: () => null };
    return original.call(this, request, parent, main);
  };
  let component;
  try {
    const mod = new Module(file, module);
    mod.filename = file;
    mod.paths = Module._nodeModulePaths(path.dirname(file));
    mod._compile(code, file);
    component = mod.exports.Concierge;
  } finally { Module._load = original; }
  let open = initialOpen;
  return () => { cursor = 0; return component({ open, setOpen(next) { open = next; } }); };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) {
    for (const child of tree) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  if (predicate(tree)) return tree;
  return find(tree.props?.children, predicate);
}
const byLabel = (tree, label) => find(tree, (node) => node.props?.['aria-label'] === label);
async function submit(render, text) {
  byLabel(render(), 'Your reply').props.onChange({ target: { value: text } });
  find(render(), (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  // Component intentionally voids its async form handler; drain pending promise continuations.
  await new Promise(setImmediate);
  await new Promise(setImmediate);
}
const reply = (body, status = 200) => ({ ok: status < 400, status, async json() { return body; } });

test.afterEach(() => { delete global.fetch; });

test('icon-only launcher has an accessible label and opens the existing chat', () => {
  const render = createClient(false);
  const launcher = byLabel(render(), 'Open chat');
  assert.ok(launcher);
  assert.equal(launcher.type, 'button');
  assert.equal(launcher.props.children.type, 'MessageCircle');
  assert.equal(launcher.props.children.props['aria-hidden'], 'true');
  launcher.props.onClick();
  assert.ok(byLabel(render(), 'Elena concierge chat'));
  byLabel(render(), 'Close chat').props.onClick();
  assert.ok(byLabel(render(), 'Open chat'));
});

test('greeting does not advance, and canonical name reaches booking rather than raw introduction', async () => {
  const render = createClient();
  const calls = [];
  const start = new Date(Date.now() + 86400000).toISOString();
  global.fetch = async (url, options = {}) => {
    const payload = options.body ? JSON.parse(options.body) : null;
    calls.push({ url: String(url), payload });
    if (url === '/api/concierge') {
      if (payload.answer === 'Hi') return reply({ accepted: false, reply: 'Hi there! What’s your name?', complete: false });
      return reply({ accepted: true, value: payload.step === 'name' ? 'Jay Omilana' : payload.answer, reply: 'Got it. Let’s carry on.', complete: payload.step === 'problem' });
    }
    if (String(url).startsWith('/api/slots?')) return reply({ slots: [{ start, date: start.slice(0, 10) }] });
    if (url === '/api/book') return reply({ ok: true, emailWarning: false }, 201);
    throw new Error(`Unexpected request: ${url}`);
  };
  await submit(render, 'Hi');
  await submit(render, "Hi, I'm Jay Omilana");
  await submit(render, '5551234567');
  await submit(render, 'jay@example.com');
  await submit(render, '123 Main Street, Portland');
  await submit(render, 'The furnace rattles loudly');
  assert.deepEqual(calls.filter((call) => call.url === '/api/concierge').map((call) => call.payload.step), ['name', 'name', 'phone', 'email', 'address', 'problem']);
  assert.equal(byLabel(render(), 'Name for the appointment').props.value, 'Jay Omilana');
  find(render(), (node) => node.props?.className?.startsWith('slot-choice')).props.onClick();
  find(render(), (node) => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  find(render(), (node) => node.props?.className === 'confirm-slot').props.onClick();
  await new Promise(setImmediate);
  const booking = calls.find((call) => call.url === '/api/book');
  assert.equal(booking.payload.attendee.name, 'Jay Omilana');
  assert.equal(booking.payload.attendee.address, '123 Main Street, Portland');
  assert.equal(booking.payload.attendee.problem, 'The furnace rattles loudly');
});

test('rejected reply stays on the same field and a reviewed guest name is submitted', async () => {
  const render = createClient();
  const calls = [];
  const start = new Date(Date.now() + 86400000).toISOString();
  global.fetch = async (url, options = {}) => {
    const payload = options.body ? JSON.parse(options.body) : null;
    calls.push({ url: String(url), payload });
    if (url === '/api/concierge') {
      if (payload.answer === 'bad email') return reply({ error: 'Please enter a valid email address.' }, 422);
      return reply({ accepted: true, value: payload.answer, reply: 'Thanks — next detail.', complete: payload.step === 'problem' });
    }
    if (String(url).startsWith('/api/slots?')) return reply({ slots: [{ start, date: start.slice(0, 10) }] });
    if (url === '/api/book') return reply({ ok: true }, 201);
    throw new Error(`Unexpected request: ${url}`);
  };
  for (const answer of ['Jay', '5551234567', 'bad email', 'jay@example.com', '123 Main Street', 'AC is not cooling']) await submit(render, answer);
  const chatCalls = calls.filter((call) => call.url === '/api/concierge');
  assert.equal(chatCalls[2].payload.step, 'email');
  assert.equal(chatCalls[3].payload.step, 'email');
  byLabel(render(), 'Name for the appointment').props.onChange({ target: { value: 'Jay Omilana' } });
  find(render(), (node) => node.props?.className?.startsWith('slot-choice')).props.onClick();
  find(render(), (node) => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  find(render(), (node) => node.props?.className === 'confirm-slot').props.onClick();
  await new Promise(setImmediate);
  assert.equal(calls.find((call) => call.url === '/api/book').payload.attendee.name, 'Jay Omilana');
});
