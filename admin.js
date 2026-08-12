(() => {
  const content = document.getElementById('admin-content');
  const usersContent = document.getElementById('users-content');
  const userEl = document.getElementById('admin-user');
  const updated = document.getElementById('last-updated');
  const usersUpdated = document.getElementById('users-updated');
  const refreshBtn = document.getElementById('refresh-btn');
  const logoutBtn = document.getElementById('logout-btn');

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function money(value) {
    return `$${Number(value || 0).toFixed(4)}`;
  }

  function renderUsers(users) {
    if (!users.length) {
      usersContent.innerHTML = '<div class="admin-empty">No registered accounts yet.</div>';
      return;
    }

    usersContent.innerHTML = `
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>Account</th><th>Plan</th><th>Generations</th><th>Today</th><th>Logins</th><th>Last login</th><th>Joined</th></tr></thead>
          <tbody>
            ${users.map((item) => `
              <tr>
                <td><div class="email">${escapeHtml(item.email)}</div><div class="admin-note">${escapeHtml(item.name || '')}</div></td>
                <td><span class="plan-pill">${escapeHtml(item.plan || 'free')}</span></td>
                <td>${escapeHtml(item.totalGenerations)}</td>
                <td>${escapeHtml(item.todayGenerations)}</td>
                <td>${escapeHtml(item.loginCount)}</td>
                <td>${escapeHtml(item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never')}</td>
                <td>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderEarlyAccess(signups) {
    if (!signups.length) {
      content.innerHTML = '<div class="admin-empty">No early-access signups yet.</div>';
      return;
    }
    content.innerHTML = `
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>Email</th><th>Feedback</th><th>Joined</th></tr></thead>
          <tbody>
            ${signups.map((item) => `
              <tr>
                <td class="email">${escapeHtml(item.email)}</td>
                <td class="feedback">${escapeHtml(item.feedback || 'No feedback provided.')}</td>
                <td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  async function load() {
    content.className = 'admin-loading';
    content.textContent = 'Loading…';
    usersContent.className = 'admin-loading';
    usersContent.textContent = 'Loading accounts…';

    try {
      const auth = await HookosAPI.me();
      const user = auth?.data;
      if (!user) throw new Error('Please sign in first.');
      userEl.textContent = `${user.name || 'Owner'} · ${user.email}`;

      const [overviewResponse, usersResponse, earlyResponse] = await Promise.all([
        HookosAPI.adminOverview(),
        HookosAPI.adminUsers(),
        HookosAPI.adminEarlyAccess(),
      ]);

      const overview = overviewResponse?.data || {};
      document.getElementById('stat-users').textContent = overview.totalUsers ?? 0;
      document.getElementById('stat-generations').textContent = overview.totalGenerations ?? 0;
      document.getElementById('stat-today').textContent = overview.todayGenerations ?? 0;
      document.getElementById('stat-cost').textContent = money(overview.estimatedCostUsd);
      document.getElementById('stat-cost-note').textContent = overview.pricingConfigured
        ? `${overview.totalTokens.toLocaleString()} tracked tokens`
        : 'Set Gemini token prices in Render to calculate cost';

      renderUsers(Array.isArray(usersResponse?.data?.users) ? usersResponse.data.users : []);
      renderEarlyAccess(Array.isArray(earlyResponse?.data?.signups) ? earlyResponse.data.signups : []);
      const now = new Date().toLocaleTimeString();
      updated.textContent = `Updated ${now}`;
      usersUpdated.textContent = `${overview.totalUsers ?? 0} accounts · ${now}`;
    } catch (err) {
      content.className = 'admin-error';
      usersContent.className = 'admin-error';
      const message = err.status === 403
        ? 'Access denied. This Google account is not the configured owner account.'
        : err.status === 401
          ? 'You are not signed in. Return to HookOS and sign in with Google.'
          : (err.message || 'Could not load the dashboard.');
      content.textContent = message;
      usersContent.textContent = message;
    }
  }

  refreshBtn.addEventListener('click', load);
  logoutBtn.addEventListener('click', async () => {
    try { await HookosAPI.logout(); } catch (_) {}
    HookosAPI.clearAccessToken();
    window.location.href = 'index.html';
  });

  load();
})();
