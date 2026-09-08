/* Submission and newsletter forms.

   These compose a mailto: link, which is a stopgap — see README.md, "What
   still needs building". A real endpoint replaces this module; the markup and
   the success state stay as they are.

   When no destination address is configured the form does not pretend to have
   sent anything: the surrounding template says so, and submitting is a no-op
   beyond native validation. */

function outcomeNode(form, selector) {
  const template = form.parentElement.querySelector(selector);
  if (!template) return null;
  return template.content.firstElementChild.cloneNode(true);
}

function fieldValue(form, name) {
  const field = form.elements[name];
  return field ? field.value : '';
}

function compose(form) {
  const kind = fieldValue(form, 'kind');
  const subject = fieldValue(form, 'subject');
  const detail = fieldValue(form, 'detail');
  const source = fieldValue(form, 'source');
  const email = fieldValue(form, 'email');

  /* The newsletter form carries only an address. */
  if (!subject && !detail) {
    return {
      subject: form.dataset.subject || 'Niwot guide',
      body: 'Please add this address to update notices: ' + email,
    };
  }

  return {
    subject: 'Niwot guide: ' + (subject || 'submission'),
    body: [
      'Kind: ' + kind,
      'Subject: ' + subject,
      '',
      detail,
      '',
      'Source: ' + source,
      'From: ' + email,
    ].join('\n'),
  };
}

document.querySelectorAll('[data-mailto-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const to = (form.dataset.to || '').trim();

    if (to) {
      const message = compose(form);
      window.location.href =
        'mailto:' + to +
        '?subject=' + encodeURIComponent(message.subject) +
        '&body=' + encodeURIComponent(message.body);
    }

    /* Without a destination nothing was handed off, so the page must not
       claim it was. It says what happened and where to go instead. */
    const outcome = outcomeNode(
      form,
      to ? '[data-mailto-success]' : '[data-mailto-unavailable]'
    );
    if (!outcome) return;

    form.replaceWith(outcome);
    /* role="status" announces it; move focus so keyboard users land on it. */
    outcome.setAttribute('tabindex', '-1');
    outcome.focus();
  });
});
