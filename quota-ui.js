// ============================================================================
// HOOKOS — daily generation quota + Turnstile UI
// ============================================================================

(function initQuotaUI() {
  const LIMIT = 3;
  let turnstileWidgetId = null;
  let turnstileToken = '';

  function ensureQuotaElement() {
    const textarea = document.getElementById('idea-input');
    if (!textarea || document.getElementById('generation-quota')) return;

    const el = document.createElement('p');
    el.id = 'generation-quota';
    el.className = 'generation-quota';
    el.setAttribute('aria-live', 'polite');
    el.textContent = `Sign in with Google to generate · ${LIMIT} free generations per day.`;
    textarea.insertAdjacentElement('afterend', el);
  }

  function ensureTurnstileElement() {
    const form = document.getElementById('blueprint-form');
    if (!form || !HOOKOS_CONFIG.TURNSTILE_SITE_KEY || document.getElementById('turnstile-container')) return;
    const container = document.createElement('div');
    container.id = 'turnstile-container';
    container.style.margin = '12px 0';
    form.insertBefore(container, form.querySelector('#generate-btn'));
  }

  function loadTurnstile() {
    if (!HOOKOS_CONFIG.TURNSTILE_SITE_KEY) return;
    ensureTurnstileElement();
    if (window.turnstile) return renderTurnstile();

    const existing = document.querySelector('script[data-hookos-turnstile]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.hookosTurnstile = 'true';
    script.onload = renderTurnstile;
    document.head.appendChild(script);
  }

  function renderTurnstile() {
    const container = document.getElementById('turnstile-container');
    if (!container || !window.turnstile || turnstileWidgetId !== null) return;
    turnstileWidgetId = window.turnstile.render(container, {
      sitekey: HOOKOS_CONFIG.TURNSTILE_SITE_KEY,
      theme: 'light',
      callback: (token) => { turnstileToken = token || ''; },
      'expired-callback': () => { turnstileToken = ''; },
      'error-callback': () => { turnstileToken = ''; },
    });
  }

  function resetTurnstile() {
    turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
  }

  function setQuota(usage) {
    ensureQuotaElement();
    const el = document.getElementById('generation-quota');
    if (!el) return;

    if (!usage) {
      el.textContent = `Sign in with Google to generate · ${LIMIT} free generations per day.`;
      el.classList.remove('is-limit');
      return;
    }

    const remaining = Math.max(0, Number(usage.remaining ?? LIMIT));
    el.textContent = remaining === 0
      ? 'Daily limit reached · 3/3 generations used. Come back tomorrow.'
      : `${remaining} of ${LIMIT} free generations left today.`;
    el.classList.toggle('is-limit', remaining === 0);
  }

  async function refreshQuota() {
    ensureQuotaElement();
    if (!HookosAPI.getAccessToken()) {
      setQuota(null);
      return;
    }
    try {
      const response = await HookosAPI.getUsage();
      setQuota(response?.data);
    } catch (_) {
      setQuota(null);
    }
  }

  const originalGenerate = HookosAPI.generate;
  HookosAPI.generate = async function wrappedGenerate(payload) {
    if (HOOKOS_CONFIG.TURNSTILE_SITE_KEY && !turnstileToken) {
      throw new Error('Please complete the human verification before generating.');
    }

    const requestPayload = turnstileToken ? { ...payload, turnstileToken } : payload;
    try {
      const response = await originalGenerate(requestPayload);
      if (response?.data?.usage) setQuota(response.data.usage);
      else refreshQuota();
      return response;
    } finally {
      if (HOOKOS_CONFIG.TURNSTILE_SITE_KEY) resetTurnstile();
    }
  };

  function init() {
    ensureQuotaElement();
    loadTurnstile();
    refreshQuota();
    document.addEventListener('hookos:authenticated', () => {
      refreshQuota();
      loadTurnstile();
    });
    document.addEventListener('hookos:signed-out', () => setQuota(null));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
