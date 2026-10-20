// -----------------------------------------
// THE ENQUIRY FORM (the floating navigation's contact form)
// -----------------------------------------
//
// FloatingNav.astro; opened and closed by floatingnav.js. Checks the form
// and sends it to the address in contact.ts (data-endpoint).
//
//   - A field says what is wrong with it once it has been left (or the form
//     sent), and stops saying it as soon as it is put right. Name, email and
//     the project are needed; the email must look like one.
//   - Sent as form data to the endpoint, asking for JSON back. Only a
//     successful answer (2xx) counts: then, and only then, the form gives
//     way to a thank-you. Anything else keeps what was typed and says it was
//     not sent, with the enquiry ready to go by email instead.
//   - While it is on its way the button is held, so it cannot go twice;
//     after fifteen seconds without an answer it is given up as not sent.
//   - With no endpoint set, nothing is sent and the form says so, with the
//     same email in its place. It never pretends.
// Once a sent form's panel has closed, it is cleared for the next time.
//
// Bound once: the form is in the layout and survives a navigation.

function initEnquiryForm() {
  const form = document.querySelector('[data-enquiry-form]');
  if (!form || form.__enquiry) return;
  form.__enquiry = true;

  const endpoint = (form.dataset.endpoint || '').trim();
  const address = form.dataset.email || '';
  const submit = form.querySelector('[data-enquiry-submit]');
  const label = form.querySelector('[data-enquiry-label]');
  const status = form.querySelector('[data-enquiry-status]');
  const done = form.parentElement.querySelector('[data-enquiry-done]');
  const fields = Array.from(form.querySelectorAll('input, textarea'));
  const idleLabel = label.textContent;
  const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  const NEEDED = {
    name: 'Please add your name.',
    email: 'Please add your email address.',
    message: 'Please tell Tom a little about the project.',
  };

  let sending = false;
  let sent = false;
  const visited = new Set();

  function problem(el) {
    const value = el.value.trim();
    if (el.required && !value) return NEEDED[el.name] || 'This is needed.';
    if (el.type === 'email' && value && !EMAIL.test(value)) return 'That email address does not look right.';
    const min = Number(el.dataset.minlength || 0);
    if (min && value && value.length < min) return `A few more words, please (at least ${min} characters).`;
    return '';
  }

  function mark(el, message) {
    const field = el.closest('[data-enquiry-field]');
    const out = document.getElementById(el.getAttribute('aria-describedby'));
    if (field) field.classList.toggle('is--invalid', Boolean(message));
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    if (out) out.textContent = message;
  }

  // The status line: words, and an email link with the enquiry in it
  function say(kind, words, withEmail) {
    status.className = 'fnav-contact__status' + (kind ? ` is--${kind}` : '');
    status.textContent = words;
    if (withEmail && address) {
      const values = Object.fromEntries(new FormData(form));
      const subject = `Project enquiry${values.name ? ` from ${values.name}` : ''}`;
      const lines = [];
      if (values.name) lines.push(`Name: ${values.name}`);
      if (values.company) lines.push(`Company: ${values.company}`);
      if (values.email) lines.push(`Email: ${values.email}`);
      lines.push('', values.message || '');
      const link = document.createElement('a');
      link.href = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      link.textContent = address;
      status.append(' ', link, '.');
    }
  }

  fields.forEach((el) => {
    el.addEventListener('blur', () => {
      if (!el.value.trim() && !visited.has(el)) return;
      visited.add(el);
      mark(el, problem(el));
    });
    el.addEventListener('input', () => {
      if (el.getAttribute('aria-invalid') === 'true') mark(el, problem(el));
      if (status.classList.contains('is--error')) say('', '');
    });
  });

  function hold(on) {
    sending = on;
    submit.disabled = on;
    form.toggleAttribute('aria-busy', on);
    label.textContent = on ? 'Sending…' : idleLabel;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;

    let firstWrong = null;
    fields.forEach((el) => {
      visited.add(el);
      const message = problem(el);
      mark(el, message);
      if (message && !firstWrong) firstWrong = el;
    });
    if (firstWrong) {
      say('error', 'Please check the fields marked above.');
      firstWrong.focus();
      return;
    }

    if (!endpoint) {
      say('error', 'This form is not connected yet, so nothing was sent. Please email your enquiry to', true);
      return;
    }

    hold(true);
    say('', '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`The endpoint answered ${response.status}`);
      sent = true;
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
    } catch (error) {
      say('error', 'Your enquiry could not be sent just now. Please try again, or email it to', true);
    } finally {
      clearTimeout(timer);
      hold(false);
    }
  });

  // A sent form, cleared once its panel has closed
  document.addEventListener('fnav:contactclosed', () => {
    if (!sent) return;
    sent = false;
    form.reset();
    fields.forEach((el) => mark(el, ''));
    visited.clear();
    say('', '');
    form.hidden = false;
    done.hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', () => initEnquiryForm());
