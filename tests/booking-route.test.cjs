const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const routePath = path.resolve(__dirname, '../app/api/book/route.ts');
const routeSource = fs.readFileSync(routePath, 'utf8');
const routeCode = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: routePath,
}).outputText;
const intakePath = path.resolve(__dirname, '../app/lib/intake.ts');
function loadIntake() {
  const mod = new Module(intakePath, module);
  mod.filename = intakePath;
  mod.paths = Module._nodeModulePaths(path.dirname(intakePath));
  mod._compile(ts.transpileModule(fs.readFileSync(intakePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: intakePath,
  }).outputText, intakePath);
  return mod.exports;
}

let liveSlots = [];
const calConfig = {
  apiKey: 'cal-test-key',
  eventTypeSlug: 'hvac-service',
  username: 'prince',
};
const calMock = {
  bookingEventIdentity: () => ({ eventTypeSlug: 'hvac-service', username: 'prince' }),
  fetchCalSlots: async () => liveSlots,
  getCalConfig: () => calConfig,
  validTimeZone: (value) => value === 'America/Los_Angeles' || value === 'UTC',
};

const NextResponseMock = {
  json(body, init = {}) {
    return { body, status: init.status || 200, headers: init.headers || {} };
  },
};

function loadRoute() {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'next/server') return { NextResponse: NextResponseMock };
    if (request === '../../lib/cal' && parent && parent.filename === routePath) return calMock;
    if (request === '../../lib/intake' && parent && parent.filename === routePath) return loadIntake();
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const mod = new Module(routePath, module);
    mod.filename = routePath;
    mod.paths = Module._nodeModulePaths(path.dirname(routePath));
    mod._compile(routeCode, routePath);
    return mod.exports;
  } finally {
    Module._load = originalLoad;
  }
}

const { POST } = loadRoute();

let fetchCalls;
let bookingResponse;

function requestFor(start, attendee = validAttendee()) {
  return new Request('https://prince.test/api/book', {
    method: 'POST',
    headers: { origin: 'https://prince.test', host: 'prince.test', 'content-type': 'application/json' },
    body: JSON.stringify({ start, timeZone: 'America/Los_Angeles', attendee }),
  });
}

function validAttendee(overrides = {}) {
  return {
    name: '  Alex Homeowner  ',
    phone: '  (555) 123-4567  ',
    email: '  alex@example.com  ',
    address: '  123 Main Street, Portland  ',
    problem: '  Furnace is making a loud rattling noise  ',
    ...overrides,
  };
}

function response(ok, status, body = {}) {
  return { ok, status, async json() { return body; } };
}

function installFetchMock({ booking = response(true, 201, { data: { uid: 'booking-123' } }) } = {}) {
  fetchCalls = [];
  bookingResponse = booking;
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).includes('/bookings')) return bookingResponse;
    throw new Error(`Unexpected outgoing request: ${url}`);
  };
}

function setup(start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()) {
  liveSlots = [{ start }];
  installFetchMock();
  return start;
}

test.afterEach(() => {
  delete global.fetch;
});

test('successful booking sends exact Cal field answers without email delivery', async () => {
  const start = setup();
  const result = await POST(requestFor(start));
  assert.equal(result.status, 201);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.bookingId, 'booking-123');

  const bookingCall = fetchCalls.find((call) => call.url.includes('/bookings'));
  assert.ok(bookingCall, 'Cal booking request should be sent');
  const payload = JSON.parse(bookingCall.options.body);
  assert.deepEqual(payload.bookingFieldsResponses, {
    'service-address': '123 Main Street, Portland',
    'hvac-issue': 'Furnace is making a loud rattling noise',
  });
  assert.deepEqual(payload.attendee, {
    name: 'Alex Homeowner',
    email: 'alex@example.com',
    phoneNumber: '(555) 123-4567',
    timeZone: 'America/Los_Angeles',
    language: 'en',
  });

  assert.equal(fetchCalls.filter((call) => call.url.includes('sendgrid.com')).length, 0);
});

test('missing address or HVAC issue stops before any outgoing call', async (t) => {
  for (const [field, value] of [['address', ''], ['problem', '']]) {
    await t.test(`missing ${field}`, async () => {
      const start = setup();
      const result = await POST(requestFor(start, validAttendee({ [field]: value })));
      assert.equal(result.status, 422);
      assert.equal(fetchCalls.length, 0);
    });
  }
});

test('slot unavailable does not attempt booking or email', async () => {
  const start = setup();
  liveSlots = [];
  const result = await POST(requestFor(start));
  assert.equal(result.status, 409);
  assert.equal(fetchCalls.length, 0);
});

test('Cal booking failure does not send email', async () => {
  const start = setup();
  installFetchMock({ booking: response(false, 500) });
  const result = await POST(requestFor(start));
  assert.equal(result.status, 502);
  assert.equal(fetchCalls.filter((call) => call.url.includes('/bookings')).length, 1);
  assert.equal(fetchCalls.filter((call) => call.url.includes('sendgrid.com')).length, 0);
});

test('greetings and non-names cannot create a booking or send email', async (t) => {
  for (const name of ['Hi', 'hello!', 'Hey there', 'Good morning', 'How are you?', 'I need a booking', '', 'A'.repeat(81)]) {
    await t.test(name || 'empty name', async () => {
      const start = setup();
      const result = await POST(requestFor(start, validAttendee({ name })));
      assert.equal(result.status, 422);
      assert.equal(fetchCalls.length, 0);
    });
  }
});

test('a conversational introduction sends the actual name to Cal', async () => {
  const start = setup();
  const result = await POST(requestFor(start, validAttendee({ name: "Hi, I'm Jay Omilana" })));
  assert.equal(result.status, 201);
  const booking = JSON.parse(fetchCalls.find((call) => call.url.includes('/bookings')).options.body);
  assert.equal(booking.attendee.name, 'Jay Omilana');
  assert.ok(booking.bookingFieldsResponses['service-address']);
  assert.ok(booking.bookingFieldsResponses['hvac-issue']);
});
