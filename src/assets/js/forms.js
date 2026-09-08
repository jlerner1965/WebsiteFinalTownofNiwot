/* Submission and newsletter forms.

   The forms POST to /api/contact on their own, so they work with this file
   absent or broken. This only upgrades the experience: it posts the same
   payload in the background and renders the outcome in place, instead of
   navigating away to /thanks/.

   Outcome text comes from the endpoint, not from here — so a form that
   cannot deliver says exactly why rather than showing a thank-you the
   server never earned. */

function outcomeNode(form, selector, text) {
  const template = form.parentElement.querySelector(selector);
  if (!template) return null;
  const node = template.content.firstElementChild.cloneNode(true);
  if (text) {
    const slot = node.querySelector('[data-message]');
    if (slot) slot.textContent = text;
  }
  return node;
}

function show(form, node) {
  if (!node) return;
  form.replaceWith(node);
  /* role="status" announces it; move focus so keyboard users land on it. */
  node.setAttribute('tabindex', '-1');
  node.focus();
}

function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? 'Sending…' : button.dataset.label || button.textContent;
}

document.querySelectorAll('[data-contact-form]').forEach((form) => {
  const button = form.querySelector('button[type="submit"]');
  if (button) button.dataset.label = button.textContent;

  form.addEventListener('submit', async (event) => {
    /* Let the browser handle its own validation first. */
    if (!form.reportValidity()) return;

    event.preventDefault();
    setBusy(form, true);

    let payload;
    let ok = false;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      payload = await response.json();
      ok = response.ok && payload.ok;
    } catch {
      payload = {
        message:
          'That could not be sent — the connection failed. Please try again, or use the direct contacts on this page.',
      };
    }

    setBusy(form, false);

    if (ok) {
      show(form, outcomeNode(form, '[data-form-success]'));
      return;
    }

    /* Errors keep the form in place so the reader can correct and retry;
       only an unconfigured endpoint replaces it, since retrying is futile. */
    if (payload && payload.configured === false) {
      show(form, outcomeNode(form, '[data-form-unavailable]', payload.message));
      return;
    }

    let error = form.querySelector('[data-form-error]');
    if (!error) {
      error = document.createElement('p');
      error.setAttribute('data-form-error', '');
      error.setAttribute('role', 'alert');
      error.className = 'n-small';
      error.style.cssText = 'margin:14px 0 0;max-width:48ch;color:var(--n-gold-lt)';
      form.appendChild(error);
    }
    error.textContent = payload ? payload.message : 'That could not be sent.';
  });
});
