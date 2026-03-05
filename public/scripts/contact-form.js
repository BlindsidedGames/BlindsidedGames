const form = document.querySelector('[data-contact-form]');

if (form instanceof HTMLFormElement) {
  const statusElement = form.querySelector('[data-form-status]');
  const submitButton = form.querySelector('.submit-button');

  const fieldErrorEntries = [...form.querySelectorAll('[data-field-error]')].map((element) => [
    element.getAttribute('data-field-error'),
    element
  ]);
  const fieldErrors = new Map(fieldErrorEntries);

  const setStatus = (message, state) => {
    if (!(statusElement instanceof HTMLElement)) return;
    statusElement.textContent = message;
    statusElement.dataset.state = state;
  };

  const clearErrors = () => {
    for (const element of fieldErrors.values()) {
      if (element instanceof HTMLElement) element.textContent = '';
    }
  };

  const setFieldError = (field, message) => {
    const element = fieldErrors.get(field);
    if (element instanceof HTMLElement) element.textContent = message;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      turnstileToken: String(formData.get('turnstileToken') || '').trim()
    };

    if (!payload.turnstileToken) {
      setFieldError('turnstileToken', 'Complete the Turnstile check before sending.');
      setStatus('Turnstile verification is required.', 'error');
      return;
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }
    setStatus('Sending message...', '');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || !body?.ok) {
        const fieldMap = body?.error?.fields;
        if (fieldMap && typeof fieldMap === 'object') {
          Object.entries(fieldMap).forEach(([field, message]) => {
            setFieldError(field, String(message));
          });
        }

        setStatus(body?.error?.message || 'Message failed to send. Please try again.', 'error');
        return;
      }

      form.reset();
      const tokenInput = form.querySelector('#turnstileToken');
      if (tokenInput instanceof HTMLInputElement) tokenInput.value = '';
      if (window.turnstile && typeof window.turnstile.reset === 'function') {
        window.turnstile.reset();
      }
      setStatus('Message sent. You should receive a response as soon as possible.', 'success');
    } catch {
      setStatus('Network error. Please retry or email support@blindsidedgames.com.', 'error');
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
      }
    }
  });
}
