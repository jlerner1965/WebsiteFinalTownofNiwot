import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { validate } from '../api/contact.js';

function makeReq({ method = 'POST', headers = {}, body = {} } = {}) {
  return {
    method,
    headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
    body,
    socket: { remoteAddress: '203.0.113.5' },
  };
}

function makeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.setHeader = (k, v) => {
    res.headers[k.toLowerCase()] = v;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  res.send = (text) => {
    res.body = text;
    return res;
  };
  res.end = () => res;
  return res;
}

async function call(options) {
  const req = makeReq(options);
  const res = makeRes();
  await handler(req, res);
  return res;
}

test('validate: newsletter needs an email, corrections need a name and details', () => {
  assert.deepEqual(validate({ kind: 'newsletter', email: '' }).errors.map((e) => e.field), ['email']);
  assert.deepEqual(validate({ kind: 'Business listing' }).errors.map((e) => e.field), ['subject', 'detail']);
  assert.deepEqual(validate({ kind: 'Business listing', subject: 'X', detail: 'Y', email: 'not-an-email' }).errors.map((e) => e.field), ['email']);
  assert.deepEqual(validate({ kind: 'Business listing', subject: 'X', detail: 'Y', source: 'javascript:alert(1)' }).errors.map((e) => e.field), ['source']);
});

test('validate: strips control characters, trims and caps lengths', () => {
  const crlf = String.fromCharCode(13, 10);
  const out = validate({ kind: 'Business listing', subject: '  Bad  Name' + crlf + 'Injected: yes  ', detail: 'ok\n\nfine', email: 'a@b.co' });
  assert.equal(out.subject, 'Bad Name Injected: yes');
  assert.equal(out.detail, 'ok\n\nfine');
  const long = validate({ kind: 'newsletter', email: 'a@b.co', subject: 'x'.repeat(201) });
  assert.ok(long.errors.some((e) => e.field === 'subject' && /too long/.test(e.message)));
});

test('rejects anything but POST', async () => {
  const res = await call({ method: 'GET' });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
});

test('rejects cross-site origins and unsupported content types', async () => {
  const res = await call({ headers: { origin: 'https://evil.example' }, body: { kind: 'newsletter', email: 'a@b.co' } });
  assert.equal(res.statusCode, 403);
  const same = await call({ headers: { origin: 'https://townofniwot.com' }, body: { kind: 'newsletter', email: 'a@b.co' } });
  assert.notEqual(same.statusCode, 403);
  const type = await call({ headers: { 'content-type': 'text/plain' }, body: 'hello' });
  assert.equal(type.statusCode, 415);
});

test('field errors are returned with the field they belong to', async () => {
  const res = await call({ body: { kind: 'Business listing', subject: '', detail: '' } });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.errors.map((e) => e.field), ['subject', 'detail']);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('the honeypot answers 200 without doing anything', async () => {
  const res = await call({ body: { kind: 'newsletter', email: 'a@b.co', company: 'bot' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});

test('without delivery configuration the endpoint says so instead of pretending', async () => {
  delete process.env.CONTACT_EMAIL;
  delete process.env.RESEND_API_KEY;
  const res = await call({ body: { kind: 'newsletter', email: 'a@b.co' } });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.configured, false);
});

test('newsletter responses do not reveal whether an address is already subscribed', async () => {
  const first = await call({ body: { kind: 'newsletter', email: 'repeat@b.co' } });
  const second = await call({ body: { kind: 'newsletter', email: 'repeat@b.co' } });
  assert.deepEqual(first.body, second.body);
});

test('a burst from one address is rate limited', async () => {
  let last;
  for (let i = 0; i < 8; i++) {
    last = await call({ headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' }, body: { kind: 'newsletter', email: 'a@b.co' } });
  }
  assert.equal(last.statusCode, 429);
  assert.ok(Number(last.headers['retry-after']) > 0);
});

test('the no-JavaScript path redirects to /thanks/ on success and returns plain text on error', async () => {
  const form = { accept: 'text/html', 'content-type': 'application/x-www-form-urlencoded' };
  const res = await call({ headers: form, body: 'kind=newsletter&email=' });
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /Press back/);
  const honey = await call({ headers: form, body: 'kind=newsletter&email=a%40b.co&company=x' });
  assert.equal(honey.statusCode, 303);
  assert.equal(honey.headers.location, '/thanks/');
});
