// ==========================================================================
// HOOKOS — auth UI
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
      el.hidden = Boolean(user.avatarUrl);
    });

    document.querySelectorAll('[data-user-name]').forEach((el) => {
      el.textContent = user.name || user.email || 'Account';
    });

    document.querySelectorAll('[data-user-avatar]').forEach((el) => {
      if (user.avatarUrl) {
        el.src = user.avatarUrl;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });

    document.querySelectorAll('[data-user-email]').forEach((el) => {
      el.textContent = user.email || '';
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
        document.dispatchEvent(new CustomEvent('hookos:authenticated', { detail: currentUser }));
        return true;
      }
      renderSignedOut();
      document.dispatchEvent(new CustomEvent('hookos:signed-out'));
      return false;
    } catch (err) {
      currentUser = null;
      renderSignedOut();
      document.dispatchEvent(new CustomEvent('hookos:signed-out'));
      return false;
    }
  }

  async function init() {
    const receivedOAuthToken = consumeOAuthToken();
    const error = checkOAuthRedirectParams();
    const authenticated = await refresh();

    if (receivedOAuthToken || error) cleanOAuthUrl();

    // First successful Google login opens the account dashboard.
    if (receivedOAuthToken && authenticated && !window.location.pathname.endsWith('/dashboard.html')) {
      window.location.replace('dashboard.html');
      return;
    }
  }

  async function logout() {
    try { await HookosAPI.logout(); } catch (_) {}
    currentUser = null;
    HookosAPI.clearAccessToken();
    renderSignedOut();
    window.location.href = 'index.html';
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="logout"]')) logout();

    if (e.target.closest('[data-action="google-login"]')) {
      window.location.href = HookosAPI.googleLoginUrl();
    }

    if (e.target.closest('[data-action="delete-account"]')) {
      deleteAccount();
    }
  });

  async function deleteAccount() {
    const confirmed = window.confirm(
      'Delete your HookOS account and all saved generation history? This cannot be undone.'
    );
    if (!confirmed) return;

    const button = document.querySelector('[data-action="delete-account"]');
    if (button) button.disabled = true;

    try {
      await HookosAPI.deleteAccount();
      HookosAPI.clearAccessToken();
      currentUser = null;
      window.location.replace('index.html');
    } catch (err) {
      if (button) button.disabled = false;
      window.alert(err.message || 'Could not delete your account. Please try again.');
    }
  }

  function checkOAuthRedirectParams() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('auth_error');
    if (error) console.warn('[HookosAuth] Google sign-in failed:', error);
    return Boolean(error);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { refresh, currentUser: () => currentUser, logout, deleteAccount };
})();
