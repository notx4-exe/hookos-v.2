// ==========================================================================
// HOOKOS — auth UI
//
// The session lives in an httpOnly cookie the browser controls — this file
// never reads or stores the token itself. On every page load it asks the
// backend "am I signed in?" via GET /me and renders the navbar accordingly.
// (The previous version trusted a cached localStorage user object, which
// could go stale or be spoofed client-side; this is the real check.)
// ==========================================================================

const HookosAuth = (() => {
  let currentUser = null;

  function renderSignedOut() {
    document.querySelectorAll('[data-auth-state="signed-out"]').forEach((el) => el.classList.add('is-active'));
    document.querySelectorAll('[data-auth-state="signed-in"]').forEach((el) => el.classList.remove('is-active'));
  }

  function renderSignedIn(user) {
    document.querySelectorAll('[data-auth-state="signed-out"]').forEach((el) => el.classList.remove('is-active'));
    document.querySelectorAll('[data-auth-state="signed-in"]').forEach((el) => el.classList.add('is-active'));

    const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
    document.querySelectorAll('[data-user-initial]').forEach((el) => {
      el.textContent = initial;
    });
    document.querySelectorAll('[data-user-name]').forEach((el) => {
      el.textContent = user.name || user.email || 'Account';
    });
    document.querySelectorAll('[data-user-avatar]').forEach((el) => {
      if (user.avatarUrl) {
        el.src = user.avatarUrl;
        el.hidden = false;
        el.previousElementSibling?.setAttribute('hidden', 'true');
      }
    });
  }

  async function refresh() {
    try {
      const res = await HookosAPI.me();
      currentUser = res?.data || null;
      if (currentUser) {
        renderSignedIn(currentUser);
      } else {
        renderSignedOut();
      }
    } catch (_err) {
      currentUser = null;
      renderSignedOut();
    }
  }

  async function logout() {
    try {
      await HookosAPI.logout();
    } finally {
      currentUser = null;
      renderSignedOut();
      window.location.href = 'index.html';
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="logout"]')) {
      logout();
    }
    if (e.target.closest('[data-action="google-login"]')) {
      window.location.href = HookosAPI.googleLoginUrl();
    }
  });

  // Surface OAuth callback errors (e.g. ?auth_error=google_auth_failed) as a
  // one-line, dismissable notice instead of failing silently.
  function checkOAuthRedirectParams() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('auth_error');
    const success = params.get('login');

    if (error || success) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
    if (error) {
      console.warn('[HookosAuth] Google sign-in failed:', error);
    }
  }

  function init() {
    checkOAuthRedirectParams();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refresh, currentUser: () => currentUser };
})();
