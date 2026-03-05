const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealElements = document.querySelectorAll('[data-reveal]');
if (prefersReducedMotion) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else if (revealElements.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -10% 0px' }
  );

  revealElements.forEach((element, index) => {
    if (!element.style.getPropertyValue('--reveal-delay')) {
      element.style.setProperty('--reveal-delay', `${Math.min(index * 40, 200)}ms`);
    }
    revealObserver.observe(element);
  });
}

const rail = document.querySelector('[data-side-rail]');
const railToggle = document.querySelector('[data-rail-toggle]');
const railStorageKey = 'bg-rail-collapsed-v1';

const setRailCollapsed = (collapsed) => {
  if (!(rail instanceof HTMLElement) || !(railToggle instanceof HTMLButtonElement)) return;
  rail.dataset.collapsed = String(collapsed);
  railToggle.setAttribute('aria-expanded', String(!collapsed));
  railToggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
  try {
    window.localStorage.setItem(railStorageKey, collapsed ? '1' : '0');
  } catch {
    // Keep a no-op fallback if storage is unavailable.
  }
};

if (rail instanceof HTMLElement && railToggle instanceof HTMLButtonElement) {
  let initialCollapsed = true;
  try {
    initialCollapsed = window.localStorage.getItem(railStorageKey) !== '0';
  } catch {
    initialCollapsed = true;
  }

  setRailCollapsed(initialCollapsed);

  railToggle.addEventListener('click', () => {
    const currentlyCollapsed = rail.dataset.collapsed === 'true';
    setRailCollapsed(!currentlyCollapsed);
  });

  rail.querySelectorAll('.rail-item').forEach((item) => {
    item.addEventListener('click', () => {
      setRailCollapsed(true);
    });
  });
}

const pieToggle = document.querySelector('[data-pie-toggle]');
const pieMenu = document.querySelector('[data-pie-menu]');

const closePieMenu = () => {
  if (!(pieToggle instanceof HTMLButtonElement) || !(pieMenu instanceof HTMLElement)) return;
  pieToggle.setAttribute('aria-expanded', 'false');
  pieMenu.classList.remove('is-open');
};

if (pieToggle instanceof HTMLButtonElement && pieMenu instanceof HTMLElement) {
  pieToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = pieToggle.getAttribute('aria-expanded') === 'true';
    pieToggle.setAttribute('aria-expanded', String(!expanded));
    pieMenu.classList.toggle('is-open', !expanded);
  });

  pieMenu.querySelectorAll('a, button').forEach((element) => {
    element.addEventListener('click', () => {
      closePieMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    if (pieMenu.contains(event.target) || pieToggle.contains(event.target)) return;
    closePieMenu();
  });
}

const navItems = Array.from(document.querySelectorAll('[data-nav-item]'));
const trackedSectionIds = Array.from(
  new Set(
    navItems
      .map((item) => item.getAttribute('data-nav-item') || '')
      .filter(Boolean)
  )
);
const trackedSectionIdSet = new Set(trackedSectionIds);
const sectionElements = Array.from(document.querySelectorAll('[data-flow-section]'));
const trackedSections = sectionElements.filter((section) =>
  trackedSectionIdSet.has(section.getAttribute('data-section-id') || '')
);
const updateActiveSection = (activeId) => {
  navItems.forEach((item) => {
    const targetId = item.getAttribute('data-nav-item');
    const active = targetId === activeId;
    item.classList.toggle('is-active', active);
    if (active) {
      item.setAttribute('aria-current', 'true');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  sectionElements.forEach((section) => {
    const sectionId = section.getAttribute('data-section-id') || '';
    const isCurrent = trackedSectionIdSet.has(sectionId) && sectionId === activeId;
    section.classList.toggle('is-current', isCurrent);
  });
};

if (trackedSections.length > 0) {
  const syncActiveSection = () => {
    // Keep active state tied to the section nearest the top anchor line.
    const anchorY = window.scrollY + 96;
    let activeId = trackedSections[0].getAttribute('data-section-id') || '';
    const atPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

    if (atPageBottom) {
      activeId = trackedSectionIds[trackedSectionIds.length - 1] || activeId;
    } else {
      for (const section of trackedSections) {
        const id = section.getAttribute('data-section-id');
        if (!id) continue;
        if (section.offsetTop <= anchorY) {
          activeId = id;
        } else {
          break;
        }
      }
    }

    updateActiveSection(activeId);
  };

  let activeSyncQueued = false;
  const queueActiveSync = () => {
    if (activeSyncQueued) return;
    activeSyncQueued = true;
    window.requestAnimationFrame(() => {
      activeSyncQueued = false;
      syncActiveSection();
    });
  };

  window.addEventListener('scroll', queueActiveSync, { passive: true });
  window.addEventListener('resize', queueActiveSync);
  window.addEventListener('hashchange', queueActiveSync);

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-nav-item');
      if (targetId) updateActiveSection(targetId);
      queueActiveSync();
    });
  });

  queueActiveSync();
}

const modal = document.querySelector('[data-contact-modal]');
const dialog = document.querySelector('[data-contact-dialog]');
const openModalTriggers = document.querySelectorAll('[data-open-contact]');
const closeModalTriggers = document.querySelectorAll('[data-contact-close]');
const turnstileContainer = document.querySelector('[data-turnstile-widget]');
const turnstileFieldError = document.querySelector('[data-field-error="turnstileToken"]');
let lastFocusedElement = null;
let turnstileWidgetId = null;
let turnstileWaitIntervalId = null;
let turnstileWaitTimeoutId = null;
const turnstilePollIntervalMs = 200;
const turnstilePollTimeoutMs = 5000;

const getFocusableElements = () => {
  if (!(dialog instanceof HTMLElement)) return [];
  return Array.from(
    dialog.querySelectorAll(
      'a[href], button, textarea, input, select, details, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((node) => !node.hasAttribute('disabled'));
};

const syncContactUrl = (isOpen) => {
  const url = new URL(window.location.href);
  if (isOpen) {
    url.searchParams.set('contact', '1');
  } else {
    url.searchParams.delete('contact');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const setTurnstileFieldError = (message) => {
  if (!(turnstileFieldError instanceof HTMLElement)) return;
  turnstileFieldError.textContent = message;
};

const isContactModalOpen = () =>
  modal instanceof HTMLElement && modal.classList.contains('is-open') && !modal.hidden;

const clearTurnstileWaiters = () => {
  if (turnstileWaitIntervalId !== null) {
    window.clearInterval(turnstileWaitIntervalId);
    turnstileWaitIntervalId = null;
  }

  if (turnstileWaitTimeoutId !== null) {
    window.clearTimeout(turnstileWaitTimeoutId);
    turnstileWaitTimeoutId = null;
  }
};

const renderTurnstileIfNeeded = () => {
  if (!(turnstileContainer instanceof HTMLElement)) return false;
  if (!isContactModalOpen()) return false;
  if (turnstileWidgetId !== null) return true;
  if (!(window.turnstile && typeof window.turnstile.render === 'function')) return false;

  const siteKey = turnstileContainer.dataset.sitekey;
  if (!siteKey) {
    setTurnstileFieldError('Turnstile is not configured for this environment.');
    return false;
  }

  try {
    turnstileWidgetId = window.turnstile.render(turnstileContainer, {
      sitekey: siteKey,
      callback: window.onTurnstileSuccess,
      'expired-callback': window.onTurnstileExpired,
      'error-callback': window.onTurnstileError
    });
    setTurnstileFieldError('');
    clearTurnstileWaiters();
    return true;
  } catch {
    turnstileWidgetId = null;
    setTurnstileFieldError('Turnstile failed to load. Disable blockers and retry.');
    return false;
  }
};

const waitForTurnstileAndRender = () => {
  if (turnstileWidgetId !== null) return;
  if (!isContactModalOpen()) return;
  if (renderTurnstileIfNeeded()) return;

  setTurnstileFieldError('Loading verification challenge...');
  if (turnstileWaitIntervalId !== null || turnstileWaitTimeoutId !== null) return;

  turnstileWaitIntervalId = window.setInterval(() => {
    if (!isContactModalOpen()) {
      clearTurnstileWaiters();
      return;
    }

    if (renderTurnstileIfNeeded()) {
      clearTurnstileWaiters();
    }
  }, turnstilePollIntervalMs);

  turnstileWaitTimeoutId = window.setTimeout(() => {
    clearTurnstileWaiters();
    if (turnstileWidgetId === null && isContactModalOpen()) {
      setTurnstileFieldError('Turnstile failed to load. Disable blockers and retry.');
    }
  }, turnstilePollTimeoutMs);
};

const openContactModal = (updateUrl = true) => {
  if (!(modal instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return;
  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
  if (updateUrl) syncContactUrl(true);

  waitForTurnstileAndRender();

  const focusable = getFocusableElements();
  if (focusable.length > 0 && focusable[0] instanceof HTMLElement) {
    focusable[0].focus();
  } else {
    dialog.focus();
  }
};

const closeContactModal = (updateUrl = true) => {
  if (!(modal instanceof HTMLElement)) return;
  clearTurnstileWaiters();
  modal.classList.remove('is-open');
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (updateUrl) syncContactUrl(false);

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
};

if (modal instanceof HTMLElement) {
  // Ensure the modal starts closed unless explicitly opened from URL state.
  modal.hidden = true;
  modal.classList.remove('is-open');
}

openModalTriggers.forEach((element) => {
  element.addEventListener('click', (event) => {
    event.preventDefault();
    openContactModal(true);
    closePieMenu();
  });
});

closeModalTriggers.forEach((element) => {
  element.addEventListener('click', (event) => {
    event.preventDefault();
    closeContactModal(true);
  });
});

if (modal instanceof HTMLElement && dialog instanceof HTMLElement) {
  modal.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    if (!dialog.contains(event.target)) {
      closeContactModal(true);
    }
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeContactModal(true);
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePieMenu();
  }
});

const params = new URLSearchParams(window.location.search);
if (params.get('contact') === '1') {
  openContactModal(false);
}

window.addEventListener('popstate', () => {
  const stateParams = new URLSearchParams(window.location.search);
  const wantsContactOpen = stateParams.get('contact') === '1';

  if (wantsContactOpen) {
    openContactModal(false);
  } else {
    closeContactModal(false);
  }
});
