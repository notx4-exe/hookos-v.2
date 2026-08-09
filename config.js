// ==========================================================================
// HOOKOS — shared config + API client
// Loaded on every page, before any other script.
// ==========================================================================

const HOOKOS_CONFIG = {
  API_BASE_URL:
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://hookos-backend.onrender.com',
};

const HookosAPI = (() => {
  let csrfToken = null;

  async function ensureCsrfToken() {
    if (csrfToken) return csrfToken;
    try {
      const res = await fetch(`${HOOKOS_CONFIG.API_BASE_URL}/csrf-token`, { credentials: 'include' });
      const body = await res.json();
      csrfToken = body?.data?.csrfToken || null;
    } catch (_) {
      // CSRF is optional for the current public generate endpoint.
    }
    return csrfToken;
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    if (method !== 'GET') {
      const token = await ensureCsrfToken();
      if (token) headers['X-CSRF-Token'] = token;
    }

    const res = await fetch(`${HOOKOS_CONFIG.API_BASE_URL}${path}`, {
      credentials: 'include',
      headers,
      ...options,
    });

    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      /* not all responses have a JSON body */
    }

    if (!res.ok) {
      const err = new Error((body && body.message) || `Request failed with status ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  return {
    me() {
      return request('/me', { method: 'GET' });
    },
    logout() {
      return request('/logout', { method: 'POST' });
    },
    generate(payload) {
      return request('/generate', { method: 'POST', body: JSON.stringify(payload) });
    },
    getHistory() {
      return request('/history', { method: 'GET' });
    },
    deleteHistoryItem(id) {
      return request(`/history/${id}`, { method: 'DELETE' });
    },
    joinEarlyAccess(payload) {
      return request('/early-access', { method: 'POST', body: JSON.stringify(payload) });
    },
    googleLoginUrl() {
      return `${HOOKOS_CONFIG.API_BASE_URL}/auth/google`;
    },
  };
})();
