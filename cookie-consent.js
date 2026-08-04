// ==========================================================================
// HOOKOS — cookie consent banner
// Stores the choice in localStorage; no cookies are set for tracking, and
// none of HOOKOS's own cookies (session, CSRF) are optional/marketing —
// they're strictly necessary for login and security, so the banner is
// informational rather than gating functionality.
// ==========================================================================

(function () {
  const STORAGE_KEY = 'hookos-cookie-consent';

  function hasConsented() {
    try {
      return Boolean(window.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return true; // if storage is unavailable, don't block the page on a banner that can't persist
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      /* ignore */
    }
  }

  function renderBanner() {
    if (hasConsented()) return;

    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie notice');
    banner.innerHTML = `
      <p>
        HookOS uses strictly necessary cookies for sign-in and security.
        See our <a href="cookies.html">Cookie Policy</a>.
      </p>
      <div class="cookie-banner-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-cookie-action="decline">Decline</button>
        <button type="button" class="btn btn-primary btn-sm" data-cookie-action="accept">Accept</button>
      </div>`;

    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('is-visible'));

    banner.addEventListener('click', (e) => {
      const action = e.target.closest('[data-cookie-action]')?.dataset.cookieAction;
      if (!action) return;
      setConsent(action);
      banner.classList.remove('is-visible');
      window.setTimeout(() => banner.remove(), 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})();
