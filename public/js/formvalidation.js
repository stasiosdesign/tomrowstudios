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

    /* The reference relies on Webflow to post the form and swap in its own
       done/fail blocks. There is no endpoint behind these pages yet, so a
       valid submit is caught here and the success state is shown in place —
       swap this for the real post once a handler exists. */
    const successBlock = formContainer.querySelector('[data-form-success]');
    const errorBlock = formContainer.querySelector('[data-form-error]');

    function showNotification(type, message) {
      const block = type === 'error' ? errorBlock : successBlock;
      if (!block) return;
      if (message) {
        const p = block.querySelector('.form-notification-p');
        if (p) p.textContent = message;
      }
      block.classList.add('is--visible');
      if (type === 'error') {
        clearTimeout(block.__hideTimer);
        block.__hideTimer = setTimeout(() => block.classList.remove('is--visible'), 6000);
      }
    }

    form.addEventListener('submit', function (event) {
      const action = form.getAttribute('action');
      if (action && action !== '#') return; // a real endpoint takes over
      event.preventDefault();
      form.classList.add('is--sent');
      showNotification('success');
    });
  });
}

// Initialize Basic Form Validation
document.addEventListener('DOMContentLoaded', () => {
  initBasicFormValidation();
});
