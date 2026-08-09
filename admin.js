(() => {
  const content = document.getElementById('admin-content');
  const total = document.getElementById('signup-total');
  const userEl = document.getElementById('admin-user');
  const updated = document.getElementById('last-updated');
  const refreshBtn = document.getElementById('refresh-btn');
  const logoutBtn = document.getElementById('logout-btn');

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function renderRows(signups) {
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
    try {
      const auth = await HookosAPI.me();
      const user = auth?.data;
      if (!user) throw new Error('Please sign in first.');
      userEl.textContent = `${user.name || 'Owner'} · ${user.email}`;

      const response = await HookosAPI.adminEarlyAccess();
      const data = response?.data || {};
      total.textContent = data.total ?? 0;
      renderRows(Array.isArray(data.signups) ? data.signups : []);
      updated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      content.className = 'admin-error';
      if (err.status === 403) {
        content.textContent = 'Access denied. This Google account is not the configured owner account.';
      } else if (err.status === 401) {
        content.textContent = 'You are not signed in. Return to HookOS and sign in with Google.';
      } else {
        content.textContent = err.message || 'Could not load the dashboard.';
      }
    }
  }

  refreshBtn.addEventListener('click', load);
  logoutBtn.addEventListener('click', async () => {
    try { await HookosAPI.logout(); } catch (_) {}
    window.location.href = 'index.html';
  });

  load();
})();
