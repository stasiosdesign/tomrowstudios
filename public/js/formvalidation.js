function initBasicFormValidation() {
  const forms = document.querySelectorAll('[data-form-validate]');

  forms.forEach((formContainer) => {
    // Barba re-runs this on every navigation; never bind the same form twice
    if (formContainer.__formValidate) return;
    formContainer.__formValidate = true;

    const startTime = new Date().getTime();

    const form = formContainer.querySelector('form');
    if (!form) return;

    const validateFields = form.querySelectorAll('[data-validate]');
    const dataSubmit = form.querySelector('[data-submit]');
    if (!dataSubmit) return;

    const realSubmitInput = dataSubmit.querySelector('input[type="submit"]');
    if (!realSubmitInput) return;

    function isSpam() {
      const currentTime = new Date().getTime();
      return currentTime - startTime < 5000;
    }

    function validateAndStartLiveValidationForAll() {
      let allValid = true;
      let firstInvalidField = null;

      validateFields.forEach(function (fieldGroup) {
        const input = fieldGroup.querySelector('input, textarea');
        if (!input) return;

        input.__validationStarted = true;

        updateFieldStatus(fieldGroup);

        if (!isValid(fieldGroup)) {
          allValid = false;
          if (!firstInvalidField) {
            firstInvalidField = input;
          }
        }
      });

      if (!allValid && firstInvalidField) {
        firstInvalidField.focus();
      }

      return allValid;
    }

    function isValid(fieldGroup) {
      const input = fieldGroup.querySelector('input, textarea');
      if (!input) return false;

      let valid = true;
      const min = parseInt(input.getAttribute('min')) || 0;
      const max = parseInt(input.getAttribute('max')) || Infinity;
      const value = input.value.trim();
      const length = value.length;

      if (input.type === 'email') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        valid = emailPattern.test(value);
      } else {
        if (input.hasAttribute('min') && length < min) valid = false;
        if (input.hasAttribute('max') && length > max) valid = false;
      }

      return valid;
    }

    function updateFieldStatus(fieldGroup) {
      const input = fieldGroup.querySelector('input, textarea');
      if (!input) return;

      const value = input.value.trim();

      if (value) {
        fieldGroup.classList.add('is--filled');
      } else {
        fieldGroup.classList.remove('is--filled');
      }

      const valid = isValid(fieldGroup);

      if (valid) {
        fieldGroup.classList.add('is--success');
        fieldGroup.classList.remove('is--error');
      } else {
        fieldGroup.classList.remove('is--success');
        if (input.__validationStarted) {
          fieldGroup.classList.add('is--error');
        } else {
          fieldGroup.classList.remove('is--error');
        }
      }
    }

    validateFields.forEach(function (fieldGroup) {
      const input = fieldGroup.querySelector('input, textarea');
      if (!input) return;

      input.__validationStarted = false;

      input.addEventListener('input', function () {
        const value = input.value.trim();
        const length = value.length;
        const min = parseInt(input.getAttribute('min')) || 0;
        const max = parseInt(input.getAttribute('max')) || Infinity;

        if (!input.__validationStarted) {
          if (input.type === 'email') {
            if (isValid(fieldGroup)) input.__validationStarted = true;
          } else {
            if (
              (input.hasAttribute('min') && length >= min) ||
              (input.hasAttribute('max') && length <= max)
            ) {
              input.__validationStarted = true;
            }
          }
        }

        if (input.__validationStarted) {
          updateFieldStatus(fieldGroup);
        }
      });

      input.addEventListener('blur', function () {
        input.__validationStarted = true;
        updateFieldStatus(fieldGroup);
      });
    });

    dataSubmit.addEventListener('click', function () {
      if (validateAndStartLiveValidationForAll()) {
        if (isSpam()) {
          showNotification('error', 'That was too quick — give it a moment and try again.');
          return;
        }
        form.requestSubmit(realSubmitInput);
      }
    });

    form.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (validateAndStartLiveValidationForAll()) {
          if (isSpam()) {
            showNotification('error', 'That was too quick — give it a moment and try again.');
            return;
          }
          form.requestSubmit(realSubmitInput);
        }
      }
    });

    /* Sending. A valid form goes as form data to the address in contact.ts
       (data-endpoint on the form), asking for JSON back. Only a successful
       answer (2xx) counts: then, and only then, the fields give way to the
       thank-you. Anything else (an error, no answer within fifteen seconds,
       or no endpoint set yet) keeps what was typed and says plainly that
       nothing was sent, with the enquiry ready to go by email to the site's
       address (data-email) instead. While it is on its way the button is
       held, so it cannot go twice. It never pretends. */
    const successBlock = formContainer.querySelector('[data-form-success]');
    const errorBlock = formContainer.querySelector('[data-form-error]');
    const endpoint = (form.dataset.endpoint || '').trim();
    const address = form.dataset.email || '';
    const submitLabel = dataSubmit.querySelector('[data-cta-label]');
    const idleLabel = submitLabel ? submitLabel.textContent : '';
    let sending = false;

    // An error stays up when it carries the email to send instead (`stay`),
    // and goes after a few seconds when it is only a nudge
    function showNotification(type, message, stay) {
      const block = type === 'error' ? errorBlock : successBlock;
      if (!block) return;
      if (message) {
        const p = block.querySelector('.form-notification-p');
        if (p) p.textContent = message;
      }
      block.classList.add('is--visible');
      if (type === 'error') {
        clearTimeout(block.__hideTimer);
        if (!stay) block.__hideTimer = setTimeout(() => block.classList.remove('is--visible'), 6000);
      }
    }

    function hideError() {
      if (!errorBlock) return;
      clearTimeout(errorBlock.__hideTimer);
      errorBlock.classList.remove('is--visible');
    }

    // The enquiry as an email: what was typed, ready to send. Every filled
    // field under its own label (whatever the form asks for: the contact
    // panel's name and company, the Partner page's first and last name,
    // role and project type; a chosen option under its group's legend), the
    // message last; the subject is the form's (data-subject, else "Project
    // enquiry"), with the sender's name
    function enquiryMailto() {
      const lines = [];
      let message = '';
      Array.from(form.elements).forEach((el) => {
        if (!el.name || el.disabled || ['submit', 'button', 'checkbox', 'hidden'].includes(el.type)) return;
        if (el.type === 'radio' && !el.checked) return;
        const value = (el.tagName === 'SELECT' ? (el.value ? el.options[el.selectedIndex].text : '') : el.value).trim();
        if (!value) return;
        if (el.name === 'message') { message = value; return; }
        const group = el.type === 'radio' && el.closest('fieldset');
        const label = group ? group.querySelector('legend') : el.id && form.querySelector(`label[for="${el.id}"]`);
        lines.push(`${label ? label.textContent.replace(/\*/g, '').trim() : el.name}: ${value}`);
      });
      const field = (name) => (form.elements.namedItem(name) || {}).value || '';
      const name = (field('name') || [field('first-name'), field('last-name')].join(' ')).trim();
      const subject = `${form.dataset.subject || 'Project enquiry'}${name ? ` from ${name}` : ''}`;
      lines.push('', message);
      return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    }

    // Not sent: says so, then offers the email (when the form has an address)
    function showNotSent(words, emailWords) {
      showNotification('error', address ? `${words} ${emailWords}` : words, true);
      const p = errorBlock && errorBlock.querySelector('.form-notification-p');
      if (!p || !address) return;
      const link = document.createElement('a');
      link.href = enquiryMailto();
      link.textContent = address;
      p.append(' ', link, '.');
    }

    function hold(on) {
      sending = on;
      if (on) {
        form.setAttribute('aria-busy', 'true');
        dataSubmit.setAttribute('aria-disabled', 'true');
      } else {
        form.removeAttribute('aria-busy');
        dataSubmit.removeAttribute('aria-disabled');
      }
      if (submitLabel) submitLabel.textContent = on ? 'Sending…' : idleLabel;
    }

    // What the error said no longer holds once the form is changed
    form.addEventListener('input', hideError);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (sending) return;

      if (!endpoint) {
        showNotSent('This form is not connected yet, so nothing was sent.', 'Please email your enquiry to');
        return;
      }

      hold(true);
      hideError();
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
        form.classList.add('is--sent');
        showNotification('success');
        if (successBlock) successBlock.focus({ preventScroll: true });
      } catch (error) {
        showNotSent('Your enquiry could not be sent just now.', 'Please try again, or email it to');
      } finally {
        clearTimeout(timer);
        hold(false);
      }
    });
  });
}

// Initialize Basic Form Validation
document.addEventListener('DOMContentLoaded', () => {
  initBasicFormValidation();
});
