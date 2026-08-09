// ==========================================================================
// HOOKOS — shared navbar + footer
// ==========================================================================

function hookosCurrentPageKey() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  if (file === '' || file === 'index.html') {
    return window.location.hash === '#generator' ? 'generator' : 'home';
  }
  if (file === 'tutorial.html') return 'tutorial';
  if (file === 'support.html') return 'support';
  return null;
}

function renderNavbar() {
  const root = document.getElementById('navbar-root');
  if (!root) return;

  const active = hookosCurrentPageKey();
  const navItem = (key, href, label) =>
    `<li><a href="${href}" data-nav="${key}"${active === key ? ' aria-current="page" class="is-active"' : ''}>${label}</a></li>`;

  root.innerHTML = `
    <header class="navbar">
      <div class="container">
        <a href="index.html" class="logo-link" aria-label="HOOKOS home">
          <span class="logo-wordmark">HOOKOS</span>
        </a>

        <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-right" aria-label="Toggle menu">
          <span class="nav-toggle-bars"><span></span><span></span><span></span></span>
        </button>

        <div class="nav-backdrop" id="nav-backdrop" aria-hidden="true"></div>

        <nav class="nav-right" id="nav-right" aria-label="Primary">
          <div class="mobile-nav-header">
            <span class="mobile-nav-title">HOOKOS</span>
            <button type="button" class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">×</button>
          </div>

          <ul class="nav-links">
            ${navItem('home', 'index.html', 'Home')}
            ${navItem('generator', 'index.html#generator', 'Generator')}
            ${navItem('tutorial', 'tutorial.html', 'Tutorial')}
            ${navItem('support', 'support.html', 'Support')}
          </ul>

          <div class="auth-area">
            <div data-auth-state="signed-out" class="is-active">
              <button type="button" class="btn btn-google" data-action="google-login">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"/>
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>
                </svg>
                <span>Log In</span>
              </button>
            </div>

            <div data-auth-state="signed-in" class="profile-menu" id="profile-menu">
              <button type="button" class="profile-trigger" id="profile-trigger" aria-haspopup="true" aria-expanded="false">
                <span class="avatar" data-user-initial aria-hidden="true">?</span>
                <img class="avatar avatar-img" data-user-avatar alt="" hidden>
                <span data-user-name>Account</span>
              </button>
              <div class="profile-dropdown" role="menu">
                <button type="button" role="menuitem" data-action="logout">Log Out</button>
              </div>
            </div>
          </div>

          <a href="index.html#generator" class="btn btn-primary">Get Started</a>
        </nav>
      </div>
    </header>`;

  initNavInteractions();
  installMobileNavStyles();
}

function installMobileNavStyles() {
  if (document.getElementById('hookos-mobile-nav-styles')) return;

  const style = document.createElement('style');
  style.id = 'hookos-mobile-nav-styles';
  style.textContent = `
    @media (max-width: 860px) {
      body.nav-open { overflow: hidden; }

      .nav-backdrop {
        position: fixed;
        inset: 0;
        z-index: 109;
        background: rgba(0,0,0,.28);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity .24s var(--ease), visibility .24s;
      }

      .nav-open .nav-backdrop {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .nav-right {
        z-index: 110;
        position: fixed;
        inset: 0 auto 0 0;
        width: min(360px, 88vw);
        height: 100dvh;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 0;
        background: var(--bg);
        border-right: 1px solid var(--border);
        border-radius: 0 22px 22px 0;
        box-shadow: 18px 0 50px rgba(0,0,0,.10);
        transform: translateX(-104%);
        opacity: 1;
        visibility: hidden;
        pointer-events: none;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        transition: transform .28s var(--ease), visibility .28s;
      }

      .nav-open .nav-right {
        transform: translateX(0);
        visibility: visible;
        pointer-events: auto;
      }

      .mobile-nav-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 72px;
        padding: 0 18px 0 22px;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }

      .mobile-nav-title {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -.04em;
      }

      .mobile-nav-close {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border);
        border-radius: 50%;
        font-size: 28px;
        font-weight: 300;
        line-height: 1;
        color: var(--text-primary);
      }

      .nav-right .nav-links {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 18px 12px 8px;
      }

      .nav-right .nav-links li { width: 100%; }

      .nav-right .nav-links a {
        display: flex;
        align-items: center;
        min-height: 52px;
        padding: 0 14px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        transition: background-color .18s var(--ease), transform .18s var(--ease);
      }

      .nav-right .nav-links a:hover,
      .nav-right .nav-links a:focus-visible {
        background: var(--surface);
        transform: none;
      }

      .nav-right .nav-links a.is-active {
        background: var(--surface);
      }

      .nav-right .auth-area {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 8px 12px 0;
      }

      .nav-right .auth-area > div,
      .nav-right .auth-area .btn {
        width: 100%;
      }

      .nav-right .profile-trigger {
        width: 100%;
        justify-content: flex-start;
        min-height: 52px;
      }

      .nav-right > .btn-primary {
        width: calc(100% - 24px);
        margin: 12px;
      }

      .nav-right .profile-dropdown {
        position: static;
        box-shadow: none;
        opacity: 1;
        visibility: visible;
        transform: none;
        display: none;
        margin-top: 4px;
      }

      .nav-right .profile-menu.is-open .profile-dropdown {
        display: block;
      }

      .nav-toggle {
        position: relative;
        z-index: 111;
      }

      .nav-open .nav-toggle {
        opacity: 0;
        pointer-events: none;
      }
    }

    @media (min-width: 861px) {
      .mobile-nav-header,
      .nav-backdrop {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderFooter() {
  const root = document.getElementById('footer-root');
  if (!root) return;

  root.innerHTML = `
    <footer>
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <span class="logo-wordmark footer-wordmark">HOOKOS</span>
            <p class="footer-tag">From Idea To Reel.</p>
          </div>

          <div class="footer-social">
            <h3>Contact</h3>
            <div class="social-links">
              <a class="social-link" href="https://instagram.com/hookos" target="_blank" rel="noopener noreferrer" aria-label="HOOKOS on Instagram (opens in a new tab)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1"/></svg>
              </a>
              <a class="social-link" href="https://youtube.com/@hookos" target="_blank" rel="noopener noreferrer" aria-label="HOOKOS on YouTube (opens in a new tab)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.3 15 12l-4.5 2.7z" fill="currentColor" stroke="none"/></svg>
              </a>
              <a class="social-link" href="https://discord.gg/hookos" target="_blank" rel="noopener noreferrer" aria-label="HOOKOS on Discord (opens in a new tab)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.5 8.5C9 7 15 7 17.5 8.5c1 3 1.3 6 1 9-1.5 1.2-3 1.8-4.4 2l-.7-1.4c.8-.2 1.5-.5 2.2-1-1.9.9-4 1.3-6.1.9-.9-.2-1.8-.5-2.6-.9.7.5 1.4.8 2.2 1L8.4 19.5c-1.4-.2-2.9-.8-4.4-2-.3-3.5.2-6.5 1-9z"/><circle cx="9.2" cy="14" r="1.15" fill="currentColor" stroke="none"/><circle cx="14.8" cy="14" r="1.15" fill="currentColor" stroke="none"/></svg>
              </a>
            </div>
          </div>

          <div class="footer-legal">
            <h3>Legal</h3>
            <ul class="footer-legal-links">
              <li><a href="privacy.html">Privacy Policy</a></li>
              <li><a href="terms.html">Terms of Service</a></li>
              <li><a href="cookies.html">Cookie Policy</a></li>
              <li><a href="data-deletion.html">Data Deletion</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© 2026 HookOS. All rights reserved.</span>
          <span>v1.0.0 · Built by NOTX4.EXE</span>
        </div>
      </div>
    </footer>`;
}

function initNavInteractions() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav-right');
  const backdrop = document.getElementById('nav-backdrop');
  const closeButton = document.getElementById('mobile-nav-close');

  if (toggle && nav) {
    const closeNav = () => {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    if (closeButton) closeButton.addEventListener('click', closeNav);
    if (backdrop) backdrop.addEventListener('click', closeNav);

    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#profile-trigger');
    const menu = document.getElementById('profile-menu');
    if (trigger && menu) {
      const isOpen = menu.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    } else if (menu && !e.target.closest('#profile-menu')) {
      menu.classList.remove('is-open');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    renderFooter();
  });
} else {
  renderNavbar();
  renderFooter();
}
