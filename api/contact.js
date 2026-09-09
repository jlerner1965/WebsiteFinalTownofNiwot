/* Submission and newsletter endpoint.

   Runs as a Vercel Function; the rest of the site stays static.

   Configuration (Vercel → Project → Settings → Environment Variables):

     CONTACT_EMAIL    destination for submissions. Required.
     RESEND_API_KEY   https://resend.com API key. Required.
     CONTACT_FROM     verified sender, e.g. "guide@townofniwot.com".
                      Defaults to onboarding@resend.dev, which only delivers
                      to the address that owns the Resend account — fine for
                      testing, not for production.

   With either of the first two unset the endpoint returns 503 and says so.
   It does not accept a submission it cannot deliver: the site's editorial
   rule is to say plainly where the record is silent, and a form that
   swallows what somebody typed breaks it.

   Works without JavaScript: the forms POST here natively and are redirected
   to /thanks/. With JavaScript, forms.js posts the same payload and renders
   the outcome in place.

   Protection, in order: method and content-type checks, an origin check so
   only this site's pages can post, a size cap, a honeypot, per-IP rate
   limiting, then field validation with everything trimmed, control
   characters stripped and lengths capped. The rate limiter is in memory,
   which on a serverless platform means per warm instance: it blunts a burst
   from one address but is not a guarantee. A shared store (Vercel KV) would
   make it one. Newsletter responses never say whether an address is already
   on the list. */

const KINDS = [
  'Business listing',
  'Event listing',
  'Public art inventory',
  'Accessibility correction',
  'Correction to this guide',
  'Something else',
  'newsletter',
];

const LIMITS = { subject: 200, detail: 5000, source: 500, email: 200 };
const MAX_BODY_BYTES = 12000;
const RATE = { window: 10 * 60 * 1000, max: 6 };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const ALLOWED_ORIGINS = new Set(
  [
    'https://townofniwot.com',
    'https://www.townofniwot.com',
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ].filter(Boolean)
);

const buckets = new Map();

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function rateLimited(ip, now = Date.now()) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > RATE.window) buckets.delete(key);
  }
  const bucket = buckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > RATE.window) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  buckets.set(ip, bucket);
  return bucket.count > RATE.max ? Math.ceil((bucket.start + RATE.window - now) / 1000) : 0;
}

function readBody(req) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim();
  if (type === 'application/json') {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  }
  if (type === 'application/x-www-form-urlencoded') {
    if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
    return req.body || {};
  }
  const error = new Error('unsupported');
  error.code = 'UNSUPPORTED_TYPE';
  throw error;
}

/* One line, no control characters, trimmed, capped. */
function clean(value, max, multiline = false) {
  let text = String(value == null ? '' : value);
  text = multiline ? text.replace(/[^\P{Cc}\n\t]/gu, '') : text.replace(/\p{Cc}/gu, ' ');
  text = text.replace(/\s+$/g, '').replace(/^\s+/g, '');
  if (!multiline) text = text.replace(/\s+/g, ' ');
  return text.slice(0, max);
}

export function validate(fields) {
  const errors = [];
  const kind = clean(fields.kind || 'Something else', 60);
  if (!KINDS.includes(kind)) errors.push({ field: 'kind', message: 'Unrecognized submission type.' });

  const email = clean(fields.email, LIMITS.email);
  const subject = clean(fields.subject, LIMITS.subject);
  const detail = clean(fields.detail, LIMITS.detail, true);
  const source = clean(fields.source, LIMITS.source);
  const newsletter = kind === 'newsletter';

  if (newsletter) {
    if (!email) errors.push({ field: 'email', message: 'An email address is required.' });
  } else {
    if (!subject) errors.push({ field: 'subject', message: 'A name is required.' });
    if (!detail) errors.push({ field: 'detail', message: 'Details are required.' });
  }

  if (email && !EMAIL.test(email)) {
    errors.push({ field: 'email', message: 'That email address does not look right.' });
  }
  if (source) {
    let ok = false;
    try {
      ok = ['http:', 'https:'].includes(new URL(source).protocol);
    } catch {
      ok = false;
    }
    if (!ok) errors.push({ field: 'source', message: 'The source should be a full web address, starting with https://.' });
  }

  for (const [field, max] of Object.entries(LIMITS)) {
    if (String(fields[field] || '').length > max) {
      errors.push({ field, message: `The ${field} field is too long (max ${max} characters).` });
    }
  }

  return { errors, kind, newsletter, email, subject, detail, source };
}

function compose({ kind, newsletter, email, subject, detail, source }) {
  if (newsletter) {
    return {
      subject: 'Niwot guide: notice signup',
      text: `Please add this address to update notices:\n\n${email}`,
    };
  }
  return {
    subject: `Niwot guide: ${subject || 'submission'}`,
    text: [
      `Kind:    ${kind}`,
      `Subject: ${subject}`,
      '',
      detail,
      '',
      `Source:  ${source || '(none given)'}`,
      `From:    ${email || '(no reply address given)'}`,
    ].join('\n'),
  };
}

function respond(req, res, status, payload, extraHeaders = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin, Accept');
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);

  const wantsJson = (req.headers.accept || '').includes('application/json');
  if (wantsJson) return res.status(status).json(payload);

  if (status === 200) {
    res.setHeader('Location', '/thanks/');
    return res.status(303).end();
  }
  /* No-JS error path: the message has to be readable on its own, because
     there is no page to render it into. */
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(status).send(`${payload.message}\n\nPress back to return to the form.`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(req, res, 405, { ok: false, message: 'Send this form with POST.' });
  }

  /* Only this site's own pages may post. Browsers send Origin on every
     cross-site POST; a request without one is a same-origin form post or a
     non-browser client, which the rest of the checks handle. No CORS headers
     are ever emitted, so no other site can read a response either. */
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return respond(req, res, 403, { ok: false, message: 'This form only accepts submissions from townofniwot.com.' });
  }

  let fields;
  try {
    fields = readBody(req);
  } catch (error) {
    const unsupported = error && error.code === 'UNSUPPORTED_TYPE';
    return respond(req, res, unsupported ? 415 : 400, {
      ok: false,
      message: unsupported ? 'Send this form as a normal form post or as JSON.' : 'That submission could not be read.',
    });
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || JSON.stringify(fields).length > MAX_BODY_BYTES) {
    return respond(req, res, 413, { ok: false, message: 'That submission is too large.' });
  }

  /* Honeypot. Real people never see this field, so anything in it is a bot.
     Answer 200 so the sender learns nothing from the difference. */
  if (String(fields.company || '').trim()) {
    return respond(req, res, 200, { ok: true, message: 'Thank you.' });
  }

  const wait = rateLimited(clientIp(req));
  if (wait) {
    return respond(
      req,
      res,
      429,
      { ok: false, message: `Too many submissions from this connection. Please try again in about ${Math.ceil(wait / 60)} minute${wait > 60 ? 's' : ''}.` },
      { 'Retry-After': String(wait) }
    );
  }

  const { errors, ...message } = validate(fields);
  if (errors.length) {
    return respond(req, res, 400, { ok: false, message: errors.map((e) => e.message).join(' '), errors });
  }

  const to = process.env.CONTACT_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) {
    return respond(req, res, 503, {
      ok: false,
      configured: false,
      message:
        'This form is not connected yet, so nothing was sent. Please use the direct contacts listed on the page — each one is the responsible body for its subject.',
    });
  }

  const mail = compose(message);

  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'onboarding@resend.dev',
        to: [to],
        subject: mail.subject,
        text: mail.text,
        ...(message.email ? { reply_to: message.email } : {}),
      }),
    });

    if (!sent.ok) {
      console.error('Resend rejected the message', sent.status);
      return respond(req, res, 502, {
        ok: false,
        message: 'The message could not be delivered just now. Please try again, or use the direct contacts on the page.',
      });
    }
  } catch (error) {
    console.error('Delivery failed', error && error.message);
    return respond(req, res, 502, {
      ok: false,
      message: 'The message could not be delivered just now. Please try again, or use the direct contacts on the page.',
    });
  }

  /* The same answer whether or not the address was already on the list. */
  return respond(req, res, 200, {
    ok: true,
    message: message.newsletter ? 'Thank you — your address has been received.' : 'Thank you — your submission has been sent.',
  });
}
