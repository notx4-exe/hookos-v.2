// ============================================================================
// HOOKOS — dashboard
// ============================================================================

(function initDashboard() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  async function loadDashboard() {
    const authenticated = await HookosAuth.refresh();
    if (!authenticated) {
      window.location.replace('index.html');
      return;
    }
    await Promise.all([loadProfile(), loadUsage(), loadHistory()]);
  }

  async function loadProfile() {
    try {
      const response = await HookosAPI.getProfile();
      const profile = response?.data || {};
      document.getElementById('account-email').textContent = profile.email || '—';
      document.getElementById('account-name').textContent = profile.name || '';
      document.getElementById('account-plan').textContent = `${profile.plan || 'free'} plan`;
    } catch (err) {
      document.getElementById('account-email').textContent = err.message || 'Could not load account.';
    }
  }

  async function loadUsage() {
    try {
      const response = await HookosAPI.getUsage();
      const usage = response?.data || { used: 0, limit: 3, remaining: 3 };
      const limit = Number(usage.limit || 3);
      const remaining = Math.max(0, Number(usage.remaining ?? limit - Number(usage.used || 0)));
      document.getElementById('usage-number').textContent = remaining;
      document.getElementById('usage-copy').textContent = remaining === 0
        ? 'Daily limit reached. Come back tomorrow.'
        : `${remaining} generation${remaining === 1 ? '' : 's'} remaining today.`;
      document.getElementById('usage-bar').style.width = `${Math.min(100, (remaining / limit) * 100)}%`;
    } catch (err) {
      document.getElementById('usage-copy').textContent = err.message || 'Could not load usage.';
    }
  }

  async function loadHistory() {
    try {
      const response = await HookosAPI.getHistory();
      const items = Array.isArray(response?.data?.items)
        ? response.data.items
        : Array.isArray(response?.data)
          ? response.data
          : [];
      const count = document.getElementById('history-count');
      if (count) count.textContent = items.length ? `${items.length} saved` : '';

      if (!items.length) {
        historyList.innerHTML = '<div class="dashboard-empty">No blueprints yet. Create your first one.</div>';
        return;
      }

      historyList.innerHTML = items.map((item) => `
        <article class="history-item" data-history-id="${escapeHtml(item.id)}">
          <div class="history-item-head">
            <div>
              <h3>${escapeHtml(item.topic || 'Untitled idea')}</h3>
              <div class="history-meta">${escapeHtml(item.framework || 'Framework')} · ${escapeHtml(item.savedAt ? new Date(item.savedAt).toLocaleString() : '')}</div>
            </div>
            <button type="button" class="mini-btn" data-delete-history="${escapeHtml(item.id)}">Delete</button>
          </div>
          <div class="history-preview">${escapeHtml(item.hook || 'Saved blueprint')}</div>
        </article>
      `).join('');
    } catch (err) {
      historyList.innerHTML = `<div class="dashboard-empty">${escapeHtml(err.message || 'Could not load history.')}</div>`;
    }
  }

  historyList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-history]');
    if (!button) return;
    const id = button.dataset.deleteHistory;
    if (!window.confirm('Delete this saved blueprint?')) return;
    button.disabled = true;
    try {
      await HookosAPI.deleteHistoryItem(id);
      await loadHistory();
    } catch (err) {
      button.disabled = false;
      window.alert(err.message || 'Could not delete this blueprint.');
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadDashboard);
  else loadDashboard();
})();
