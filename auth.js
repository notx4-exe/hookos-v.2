// ==========================================================================
// HOOKOS — auth UI
//
// Google OAuth uses a short-lived-in-browser JWT handoff in the URL fragment.
// This avoids depending on third-party cookies between Vercel and Render.
// The token is kept in sessionStorage and sent only as an Authorization header.
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
    document.querySelectorAll('[data-user-initial]').forEach((el) => { el.textContent = initial; });
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = user.name || user.email || 'Account'; });
    document.querySelectorAll('[data-user-avatar]').forEach((el) => {
      if (user.avatarUrl) {
        el.src = user.avatarUrl;
        el.hidden = false;
        el.previousElementSibling?.setAttribute('hidden', 'true');
      }
    });
  }

  function consumeOAuthToken() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#auth_token=')) return false;
    const token = decodeURIComponent(hash.slice('#auth_token='.length));
    if (!token) return false;
    HookosAPI.setAccessToken(token);
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
    return true;
  }

  async function refresh() {
    try {
      const res = await HookosAPI.me();
      currentUser = res?.data || null;
      if (currentUser) renderSignedIn(currentUser);
      else renderSignedOut();
    } catch (_err) {
      currentUser = null;
      renderSignedOut();
    }
  }

  async function logout() {
    try { await HookosAPI.logout(); } catch (_) {}
    currentUser = null;
    renderSignedOut();
    window.location.href = 'index.html';
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="logout"]')) logout();
    if (e.target.closest('[data-action="google-login"]')) {
      window.location.href = HookosAPI.googleLoginUrl();
    }
  });

  function checkOAuthRedirectParams() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('auth_error');
    if (error) console.warn('[HookosAuth] Google sign-in failed:', error);
    if (error || params.get('login')) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }

  function init() {
    consumeOAuthToken();
    checkOAuthRedirectParams();
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { refresh, currentUser: () => currentUser };
})();
