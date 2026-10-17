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

let liveSlots = [];
const calConfig = {
  apiKey: 'cal-test-key',
  eventTypeSlug: 'hvac-service',
  username: 'vertice',
};
const calMock = {
  bookingEventIdentity: () => ({ eventTypeSlug: 'hvac-service', username: 'vertice' }),
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
let sendgridResponse;

function requestFor(start, attendee = validAttendee()) {
  return new Request('https://vertice.test/api/book', {
    method: 'POST',
    headers: { origin: 'https://vertice.test', host: 'vertice.test', 'content-type': 'application/json' },
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

function installFetchMock({ booking = response(true, 201, { data: { uid: 'booking-123' } }), sendgrid = response(true, 202) } = {}) {
  fetchCalls = [];
  bookingResponse = booking;
  sendgridResponse = sendgrid;
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).includes('/bookings')) return bookingResponse;
    if (String(url).includes('sendgrid.com')) return sendgridResponse;
    throw new Error(`Unexpected outgoing request: ${url}`);
  };
}

function setup(start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()) {
  process.env.SENDGRID_API_KEY = 'sendgrid-test-key';
  process.env.SENDGRID_FROM_EMAIL = 'dispatch@vertice.test';
  process.env.SENDGRID_TECH_EMAIL = 'tech@vertice.test';
  liveSlots = [{ start }];
  installFetchMock();
  return start;
}

test.afterEach(() => {
  delete global.fetch;
  for (const key of ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_TECH_EMAIL']) delete process.env[key];
});

test('successful booking sends exact Cal field answers and two semantically complete emails', async () => {
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

  const emailCalls = fetchCalls.filter((call) => call.url.includes('sendgrid.com'));
  assert.equal(emailCalls.length, 2, 'one email should go to the homeowner and one to dispatch');
  const emails = emailCalls.map((call) => JSON.parse(call.options.body));
  const recipients = emails.map((email) => email.personalizations?.[0]?.to?.[0]?.email).sort();
  assert.deepEqual(recipients, ['alex@example.com', 'tech@vertice.test']);
  for (const email of emails) {
    const message = email.content?.[0]?.value || '';
    for (const value of ['Alex Homeowner', '(555) 123-4567', 'alex@example.com', '123 Main Street, Portland', 'Furnace is making a loud rattling noise']) {
      assert.match(message, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
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
