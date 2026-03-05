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

const sectionElements = Array.from(document.querySelectorAll('[data-flow-section]'));
const updateActiveSection = (activeId) => {
  document.querySelectorAll('[data-nav-item]').forEach((item) => {
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
    const isCurrent = section.getAttribute('data-section-id') === activeId;
    section.classList.toggle('is-current', isCurrent);
  });
};

if (sectionElements.length > 0) {
  if (prefersReducedMotion) {
    const firstId = sectionElements[0].getAttribute('data-section-id') || '';
    updateActiveSection(firstId);
    sectionElements.forEach((section) => section.classList.add('is-current'));
  } else {
    const visibilityMap = new Map();

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-section-id');
          if (!id) return;
          visibilityMap.set(id, entry.intersectionRatio);
        });

        let bestId = sectionElements[0].getAttribute('data-section-id') || '';
        let bestRatio = -1;

        visibilityMap.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId) updateActiveSection(bestId);
      },
      {
        threshold: [0.2, 0.4, 0.55, 0.7],
        rootMargin: '-12% 0px -32% 0px'
      }
    );

    sectionElements.forEach((section) => sectionObserver.observe(section));
  }
}

const modal = document.querySelector('[data-contact-modal]');
const dialog = document.querySelector('[data-contact-dialog]');
const openModalTriggers = document.querySelectorAll('[data-open-contact]');
const closeModalTriggers = document.querySelectorAll('[data-contact-close]');
let lastFocusedElement = null;

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

const openContactModal = (updateUrl = true) => {
  if (!(modal instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return;
  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
  if (updateUrl) syncContactUrl(true);

  const focusable = getFocusableElements();
  if (focusable.length > 0 && focusable[0] instanceof HTMLElement) {
    focusable[0].focus();
  } else {
    dialog.focus();
  }
};

const closeContactModal = (updateUrl = true) => {
  if (!(modal instanceof HTMLElement)) return;
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
