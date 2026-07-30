// ==========================================================================
// HOOKOS — script.js
// UI, animations, and API requests only. No AI/generation logic lives here.
// ==========================================================================

/* ---------------------------------------------------------------------- */
/* 0. API configuration — the ONLY place the backend URL is set           */
/* ---------------------------------------------------------------------- */

const HOOKOS_CONFIG = {
  API_BASE_URL:
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://hookos-backend.onrender.com',
};

const HookosAPI = (() => {
  async function request(path, options = {}) {
    const res = await fetch(`${HOOKOS_CONFIG.API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });

    let body = null;
    try { body = await res.json(); } catch (_) { /* no JSON body */ }

    if (!res.ok) {
      const err = new Error((body && body.message) || `Request failed with status ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  return {
    generateBlueprint(payload) {
      return request('/generate', { method: 'POST', body: JSON.stringify(payload) });
    },
    getHistory() {
      return request('/history', { method: 'GET' });
    },
    login(credentials) {
      return request('/login', { method: 'POST', body: JSON.stringify(credentials) });
    },
    logout() {
      return request('/logout', { method: 'POST' });
    },
  };
})();

/* ---------------------------------------------------------------------- */
/* 1. Mobile navigation                                                    */
/* ---------------------------------------------------------------------- */

(function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav-right');
  if (!toggle || !nav) return;

  function closeNav() {
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });
})();

/* ---------------------------------------------------------------------- */
/* 2. Auth UI (Google Login prep — UI only, no real auth yet)             */
/* ---------------------------------------------------------------------- */

const HookosAuth = (() => {
  const STORAGE_KEY = 'hookos-user';

  function readCachedUser() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function render() {
    const user = readCachedUser();
    document.querySelectorAll('[data-auth-state="signed-out"]').forEach((el) => el.classList.toggle('is-active', !user));
    document.querySelectorAll('[data-auth-state="signed-in"]').forEach((el) => el.classList.toggle('is-active', Boolean(user)));

    if (user) {
      document.querySelectorAll('[data-user-initial]').forEach((el) => {
        el.textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
      });
      document.querySelectorAll('[data-user-name]').forEach((el) => {
        el.textContent = user.name || user.email || 'Account';
      });
    }
  }

  async function logout() {
    try { await HookosAPI.logout(); } catch (_) { /* best effort */ }
    window.localStorage.removeItem(STORAGE_KEY);
    render();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="logout"]')) logout();

    if (e.target.closest('[data-action="google-login"]')) {
      // Placeholder — once the backend exposes Google OAuth, redirect here:
      // window.location.href = `${HOOKOS_CONFIG.API_BASE_URL}/auth/google`;
      console.info('Google Login is not implemented yet — UI only.');
    }

    const trigger = e.target.closest('#profile-trigger');
    const menu = document.getElementById('profile-menu');
    if (trigger && menu) {
      const isOpen = menu.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    } else if (menu && !e.target.closest('#profile-menu')) {
      menu.classList.remove('is-open');
    }
  });

  document.addEventListener('DOMContentLoaded', render);

  return { currentUser: readCachedUser, render };
})();

/* ---------------------------------------------------------------------- */
/* 3. Scroll reveal                                                        */
/* ---------------------------------------------------------------------- */

(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
})();

/* ---------------------------------------------------------------------- */
/* 4. Generator                                                            */
/* ---------------------------------------------------------------------- */

(function initGenerator() {
  const form = document.getElementById('blueprint-form');
  if (!form) return;

  const FRAMEWORKS = [
    { id: 'curiosity-gap', name: 'Curiosity Gap', desc: 'Opens a gap the viewer needs closed.' },
    { id: 'fear', name: 'Fear', desc: 'Leads with a risk the viewer wants to avoid.' },
    { id: 'contrarian', name: 'Contrarian', desc: 'Challenges a widely held belief.' },
    { id: 'story', name: 'Story', desc: 'A personal narrative with a turning point.' },
    { id: 'statistics', name: 'Statistics', desc: 'Leads with a surprising number.' },
    { id: 'authority', name: 'Authority', desc: 'Leans on expertise and credibility.' },
    { id: 'emotion', name: 'Emotion', desc: 'Leads with feeling over logic.' },
    { id: 'open-loop', name: 'Open Loop', desc: 'Delays the payoff to hold attention.' },
  ];

  const LOADING_STEPS = [
    'Analyzing topic...',
    'Finding audience...',
    'Choosing framework...',
    'Writing hook...',
    'Writing script...',
    'Creating scene plan...',
    'Generating CTA...',
    'Calculating viral metrics...',
    'Done.',
  ];

  const frameworkGrid = document.getElementById('framework-grid');
  const ideaInput = document.getElementById('idea-input');
  const formHint = document.getElementById('form-hint');
  const apiError = document.getElementById('api-error');
  const generateBtn = document.getElementById('generate-btn');
  const generateBtnText = document.getElementById('generate-btn-text');
  const loadingPanel = document.getElementById('loading-panel');
  const loadingStatus = document.getElementById('loading-status');
  const loadingBar = document.getElementById('loading-bar');
  const resultsSection = document.getElementById('results');

  let selectedFramework = FRAMEWORKS[0].id;
  let loadingTimer = null;

  // Build the framework selector
  frameworkGrid.innerHTML = FRAMEWORKS.map(
    (fw, i) => `
    <button type="button" class="framework-chip${i === 0 ? ' selected' : ''}" data-framework="${fw.id}" role="radio" aria-checked="${i === 0}">
      <span class="check" aria-hidden="true">✓</span>
      <span class="fw-name">${fw.name}</span>
      <span class="fw-desc">${fw.desc}</span>
    </button>`
  ).join('');

  frameworkGrid.addEventListener('click', (e) => {
    const chip = e.target.closest('.framework-chip');
    if (!chip) return;
    frameworkGrid.querySelectorAll('.framework-chip').forEach((c) => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    chip.classList.add('selected');
    chip.setAttribute('aria-checked', 'true');
    selectedFramework = chip.dataset.framework;
  });

  // Keyboard support for the radiogroup (arrow keys move selection)
  frameworkGrid.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const chips = Array.from(frameworkGrid.querySelectorAll('.framework-chip'));
    const currentIndex = chips.findIndex((c) => c.classList.contains('selected'));
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + dir + chips.length) % chips.length;
    e.preventDefault();
    chips[nextIndex].focus();
    chips[nextIndex].click();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idea = ideaInput.value.trim();
    hideError();

    if (!idea) {
      formHint.textContent = 'Enter an idea before generating your blueprint.';
      formHint.classList.add('error');
      ideaInput.focus();
      return;
    }

    formHint.textContent = '';
    formHint.classList.remove('error');
    resultsSection.hidden = true;
    startLoading();

    try {
      const blueprint = await HookosAPI.generateBlueprint({topic: idea, framework: selectedFramework });
      renderResults(blueprint.data);
      resultsSection.hidden = false;
      stopLoading();
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      stopLoading();
      showError(
        err.status === 429
          ? "You're generating a little too fast — wait a moment and try again."
          : 'Something went wrong generating your blueprint. Please try again.'
      );
    }
  });

  function startLoading() {
    generateBtn.disabled = true;
    generateBtnText.innerHTML = 'Generating<span class="loading-dots"><span></span><span></span><span></span></span>';
    loadingPanel.classList.add('is-active');

    let step = 0;
    loadingStatus.textContent = LOADING_STEPS[0];
    loadingBar.style.width = `${(1 / LOADING_STEPS.length) * 100}%`;

    loadingTimer = window.setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      loadingStatus.textContent = LOADING_STEPS[step];
      loadingBar.style.width = `${((step + 1) / LOADING_STEPS.length) * 100}%`;
      if (step >= LOADING_STEPS.length - 1) window.clearInterval(loadingTimer);
    }, 450);
  }

  function stopLoading() {
    if (loadingTimer) window.clearInterval(loadingTimer);
    generateBtn.disabled = false;
    generateBtnText.textContent = 'Generate Blueprint';
    window.setTimeout(() => loadingPanel.classList.remove('is-active'), 300);
  }

  function showError(message) {
    apiError.textContent = message;
    apiError.classList.add('is-active');
  }

  function hideError() {
    apiError.textContent = '';
    apiError.classList.remove('is-active');
  }

  function renderResults(bp) {
    setText('result-topic', bp.topic);
    setText('result-hook', bp.hook);
    setText('result-script', bp.script);
    setText('result-cta', bp.cta);

    const sceneEl = document.getElementById('result-scene');
    sceneEl.innerHTML = '';
    (bp.scenePlan || []).forEach((line, idx) => {
      const row = document.createElement('div');
      row.className = 'scene';
      row.innerHTML = `<span class="scene-num">${idx + 1}.</span><span>${escapeHtml(line)}</span>`;
      sceneEl.appendChild(row);
    });

    renderMetrics(bp.metrics || {}, bp.framework || selectedFramework);

    document.querySelectorAll('.result-card').forEach((card, i) => {
      card.classList.remove('fade-slide-in');
      void card.offsetWidth;
      card.style.animationDelay = `${i * 0.06}s`;
      card.classList.add('fade-slide-in');
    });
  }

  function renderMetrics(metrics, framework) {
    setText('metric-virality', metrics.viralityScore != null ? `${metrics.viralityScore}` : '—');
    setText('metric-retention', metrics.retentionScore != null ? `${metrics.retentionScore}` : '—');
    setText('metric-watchtime', metrics.predictedWatchTime || '—');
    setText('metric-emotion', metrics.emotionTrigger || '—');
    setText('metric-framework', formatFrameworkName(framework));
    setText('metric-confidence', metrics.confidence != null ? `${metrics.confidence}%` : '—');

    setBar('metric-virality-bar', metrics.viralityScore);
    setBar('metric-retention-bar', metrics.retentionScore);
    setBar('metric-confidence-bar', metrics.confidence);
  }

  function setBar(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = value != null ? `${Math.max(0, Math.min(100, value))}%` : '0%';
  }

  function formatFrameworkName(id) {
    const fw = FRAMEWORKS.find((f) => f.id === id);
    return fw ? fw.name : id || '—';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Copy buttons (event delegation — works for all current and future cards)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;

    const targetEl = document.getElementById(btn.dataset.target);
    if (!targetEl) return;

    navigator.clipboard
      .writeText(targetEl.innerText)
      .then(() => {
        const original = btn.textContent;
        btn.textContent = '✓ Copied';
        btn.classList.add('copied', 'success-pop');
        window.setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied', 'success-pop');
        }, 2000);
      })
      .catch(() => {
        btn.textContent = 'Copy failed';
        window.setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
  });
})();
