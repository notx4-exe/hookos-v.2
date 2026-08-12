// ============================================================================
// HOOKOS — auth UI
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

    const hasAvatar = Boolean(user.avatarUrl);
    const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

    document.querySelectorAll('[data-user-initial]').forEach((el) => {
      el.textContent = initial;
      el.hidden = hasAvatar;
      el.style.display = hasAvatar ? 'none' : 'inline-flex';
    });

    document.querySelectorAll('[data-user-name]').forEach((el) => {
      el.textContent = user.name || user.email || 'Account';
    });

    document.querySelectorAll('[data-user-avatar]').forEach((el) => {
      if (hasAvatar) {
        el.src = user.avatarUrl;
        el.hidden = false;
        el.style.display = 'block';
      } else {
        el.hidden = true;
        el.style.display = 'none';
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

    // OAuth already returns to dashboard.html. This fallback also handles
    // providers/configurations that return to the home page.
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

  function ensureDeleteModal() {
    if (document.getElementById('hookos-delete-modal')) return;

    const style = document.createElement('style');
    style.id = 'hookos-delete-modal-styles';
    style.textContent = `
      .hookos-modal-backdrop{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(10,10,10,.52);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;visibility:hidden;transition:opacity .2s ease,visibility .2s ease}
      .hookos-modal-backdrop.is-open{opacity:1;visibility:visible}
      .hookos-modal{width:min(440px,100%);background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.22);transform:translateY(10px) scale(.98);transition:transform .2s ease}
      .hookos-modal-backdrop.is-open .hookos-modal{transform:translateY(0) scale(1)}
      .hookos-modal-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#f4f4f4;color:#111;font-size:21px;font-weight:800;margin-bottom:18px}
      .hookos-modal h2{margin:0;font-size:26px;letter-spacing:-.035em}
      .hookos-modal p{margin:10px 0 0;color:#666;line-height:1.55;font-size:15px}
      .hookos-modal-warning{margin-top:18px;padding:13px 14px;border-radius:14px;background:#fafafa;color:#444;font-size:13px;line-height:1.5}
      .hookos-modal-actions{display:flex;gap:10px;margin-top:24px}
      .hookos-modal-actions button{flex:1;min-height:48px;border-radius:12px;border:1px solid #ddd;background:#fff;font:inherit;font-weight:700;cursor:pointer}
      .hookos-modal-actions .hookos-delete-confirm{background:#111;color:#fff;border-color:#111}
      .hookos-modal-actions button:disabled{opacity:.55;cursor:wait}
      @media(max-width:520px){.hookos-modal{border-radius:22px;padding:22px}.hookos-modal-actions{flex-direction:column-reverse}}
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'hookos-delete-modal';
    modal.className = 'hookos-modal-backdrop';
    modal.innerHTML = `
      <section class="hookos-modal" role="dialog" aria-modal="true" aria-labelledby="hookos-delete-title">
        <div class="hookos-modal-icon" aria-hidden="true">!</div>
        <h2 id="hookos-delete-title">Delete your account?</h2>
        <p>This permanently removes your HookOS account and the blueprints saved to it.</p>
        <div class="hookos-modal-warning"><strong>This can't be undone.</strong><br>Your generation history and daily usage data will also be deleted.</div>
        <div class="hookos-modal-actions">
          <button type="button" class="hookos-delete-cancel">Cancel</button>
          <button type="button" class="hookos-delete-confirm">Delete account</button>
        </div>
      </section>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('.hookos-delete-cancel')) closeDeleteModal();
    });
    modal.querySelector('.hookos-delete-confirm').addEventListener('click', performDeleteAccount);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) closeDeleteModal();
    });
  }

  function openDeleteModal() {
    ensureDeleteModal();
    const modal = document.getElementById('hookos-delete-modal');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.querySelector('.hookos-delete-cancel')?.focus(), 0);
  }

  function closeDeleteModal() {
    const modal = document.getElementById('hookos-delete-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  async function performDeleteAccount() {
    const modal = document.getElementById('hookos-delete-modal');
    const button = modal?.querySelector('.hookos-delete-confirm');
    if (button) {
      button.disabled = true;
      button.textContent = 'Deleting…';
    }

    try {
      await HookosAPI.deleteAccount();
      HookosAPI.clearAccessToken();
      currentUser = null;
      closeDeleteModal();
      window.location.replace('index.html');
    } catch (err) {
      if (button) {
        button.disabled = false;
        button.textContent = 'Delete account';
      }
      window.alert(err.message || 'Could not delete your account. Please try again.');
    }
  }

  function deleteAccount() {
    openDeleteModal();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="logout"]')) logout();
    if (e.target.closest('[data-action="google-login"]')) window.location.href = HookosAPI.googleLoginUrl();
    if (e.target.closest('[data-action="delete-account"]')) deleteAccount();
  });

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
