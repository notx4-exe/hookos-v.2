// ==========================================================================
// HOOKOS — auth UI
//
// Google OAuth returns a short-lived JWT in the URL fragment. The fragment
// is consumed immediately, stored in sessionStorage, and then removed from
// the address bar. Authentication is confirmed with GET /me before the UI
// is considered signed in.
// ============================================================================

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

    try {
      const token = decodeURIComponent(hash.slice('#auth_token='.length));
      if (!token) return false;
      HookosAPI.setAccessToken(token);
      return true;
    } catch (err) {
      console.warn('[HookosAuth] Invalid OAuth token handoff:', err);
      return false;
    }
  }

  function cleanOAuthUrl() {
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState({}, '', cleanUrl);
  }

  async function refresh() {
    try {
      const res = await HookosAPI.me();
      currentUser = res?.data || null;
      if (currentUser) {
        renderSignedIn(currentUser);
        return true;
      }
      renderSignedOut();
      return false;
    } catch (err) {
      currentUser = null;
      renderSignedOut();
      return false;
    }
  }

  async function init() {
    const receivedOAuthToken = consumeOAuthToken();
    const error = checkOAuthRedirectParams();
    const authenticated = await refresh();

    // Only remove OAuth parameters after the authentication check has run.
    // This prevents a failed callback from becoming an invisible login loop.
    if (receivedOAuthToken || error) cleanOAuthUrl();

    if (receivedOAuthToken && !authenticated) {
      console.warn('[HookosAuth] Google returned a token, but /me rejected it.');
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
    return Boolean(error);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { refresh, currentUser: () => currentUser };
})();
