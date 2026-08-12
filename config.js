// ==========================================================================
// HOOKOS — shared config + API client
// ==========================================================================

const HOOKOS_CONFIG = {
  API_BASE_URL:
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://hookos-backend.onrender.com',

  // Add the public Cloudflare Turnstile site key here when the widget is enabled.
  // The secret key stays only on the backend as TURNSTILE_SECRET_KEY.
  TURNSTILE_SITE_KEY: '',
};

const HookosAPI = (() => {
  let csrfToken = null;
  const TOKEN_KEY = 'hookos_access_token';

  function getAccessToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
  }

  function setAccessToken(token) {
    if (!token) return;
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch (_) {}
  }

  function clearAccessToken() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
  }

  async function ensureCsrfToken() {
    if (csrfToken) return csrfToken;
    try {
      const res = await fetch(`${HOOKOS_CONFIG.API_BASE_URL}/csrf-token`, { credentials: 'include' });
      const body = await res.json();
      csrfToken = body?.data?.csrfToken || null;
    } catch (_) {}
    return csrfToken;
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    if (method !== 'GET') {
      const csrf = await ensureCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    const res = await fetch(`${HOOKOS_CONFIG.API_BASE_URL}${path}`, {
      credentials: 'include',
      headers,
      ...options,
    });

    let body = null;
    try { body = await res.json(); } catch (_) {}

    if (!res.ok) {
      if (res.status === 401 && (path === '/me' || path === '/generate/usage')) clearAccessToken();
      const err = new Error((body && body.message) || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  return {
    me() { return request('/me', { method: 'GET' }); },
    logout() { clearAccessToken(); return request('/logout', { method: 'POST' }); },
    generate(payload) { return request('/generate', { method: 'POST', body: JSON.stringify(payload) }); },
    getUsage() { return request('/generate/usage', { method: 'GET' }); },
    getHistory() { return request('/history', { method: 'GET' }); },
    deleteHistoryItem(id) { return request(`/history/${id}`, { method: 'DELETE' }); },
    deleteAccount() { return request('/profile', { method: 'DELETE' }); },
    getProfile() { return request('/profile', { method: 'GET' }); },
    joinEarlyAccess(payload) { return request('/early-access', { method: 'POST', body: JSON.stringify(payload) }); },
    adminEarlyAccess() { return request('/admin/early-access', { method: 'GET' }); },
    googleLoginUrl() { return `${HOOKOS_CONFIG.API_BASE_URL}/auth/google`; },
    setAccessToken,
    clearAccessToken,
    getAccessToken,
  };
})();
