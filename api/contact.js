/* Submission and newsletter endpoint.

   Replaces the mailto: stopgap. Runs as a Vercel Function; the rest of the
   site stays static.

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
   the outcome in place. */

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

function readBody(req) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim();
  if (type === 'application/json') {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  }
  if (type === 'application/x-www-form-urlencoded') {
    if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
    return req.body || {};
  }
  return req.body || {};
}

function validate(fields) {
  const errors = [];
  const kind = String(fields.kind || 'Something else').trim();
  if (!KINDS.includes(kind)) errors.push('Unrecognised submission type.');

  const email = String(fields.email || '').trim();
  const newsletter = kind === 'newsletter';

  if (newsletter) {
    if (!email) errors.push('An email address is required.');
  } else {
    if (!String(fields.subject || '').trim()) errors.push('A name is required.');
    if (!String(fields.detail || '').trim()) errors.push('Details are required.');
  }

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.push('That email address does not look right.');
  }

  for (const [field, max] of Object.entries(LIMITS)) {
    if (String(fields[field] || '').length > max) {
      errors.push(`The ${field} field is too long (max ${max} characters).`);
    }
  }

  return { errors, kind, newsletter, email };
}

function compose({ kind, newsletter, email, fields }) {
  if (newsletter) {
    return {
      subject: 'Niwot guide: notice signup',
      text: `Please add this address to update notices:\n\n${email}`,
    };
  }
  const subject = String(fields.subject || '').trim();
  return {
    subject: `Niwot guide: ${subject || 'submission'}`,
    text: [
      `Kind:    ${kind}`,
      `Subject: ${subject}`,
      '',
      String(fields.detail || '').trim(),
      '',
      `Source:  ${String(fields.source || '').trim() || '(none given)'}`,
      `From:    ${email || '(no reply address given)'}`,
    ].join('\n'),
  };
}

function respond(req, res, status, payload) {
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

  let fields;
  try {
    fields = readBody(req);
  } catch {
    return respond(req, res, 400, { ok: false, message: 'That submission could not be read.' });
  }

  /* Honeypot. Real people never see this field, so anything in it is a bot.
     Answer 200 so the sender learns nothing from the difference. */
  if (String(fields.company || '').trim()) {
    return respond(req, res, 200, { ok: true, message: 'Thank you.' });
  }

  const { errors, kind, newsletter, email } = validate(fields);
  if (errors.length) {
    return respond(req, res, 400, { ok: false, message: errors.join(' ') });
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

  const message = compose({ kind, newsletter, email, fields });

  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'onboarding@resend.dev',
        to: [to],
        subject: message.subject,
        text: message.text,
        ...(email ? { reply_to: email } : {}),
      }),
    });

    if (!sent.ok) {
      const detail = await sent.text();
      console.error('Resend rejected the message', sent.status, detail);
      return respond(req, res, 502, {
        ok: false,
        message: 'The message could not be delivered just now. Please try again, or use the direct contacts on the page.',
      });
    }
  } catch (error) {
    console.error('Delivery failed', error);
    return respond(req, res, 502, {
      ok: false,
      message: 'The message could not be delivered just now. Please try again, or use the direct contacts on the page.',
    });
  }

  return respond(req, res, 200, { ok: true, message: 'Thank you — your submission has been sent.' });
}
