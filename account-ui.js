// ============================================================================
// HOOKOS — account/dashboard UI helpers
// ============================================================================

(function initAccountUI() {
  function wireProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (!menu) return;
    const dropdown = menu.querySelector('.profile-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = `
      <a role="menuitem" href="dashboard.html">Dashboard</a>
      <a role="menuitem" href="dashboard.html#history">History</a>
      <button type="button" role="menuitem" data-action="delete-account" class="danger">Delete Account</button>
      <button type="button" role="menuitem" data-action="logout">Log Out</button>
    `;
  }

  function init() {
    wireProfileMenu();
    document.addEventListener('hookos:authenticated', wireProfileMenu);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
