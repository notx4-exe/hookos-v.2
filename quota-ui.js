// ============================================================================
// HOOKOS — daily generation quota + Turnstile UI + contextual generator UX
// ============================================================================

(function initQuotaUI() {
  const LIMIT = 3;
  let turnstileWidgetId = null;
  let turnstileToken = '';

  function installStyles() {
    if (document.getElementById('hookos-quota-styles')) return;
    const style = document.createElement('style');
    style.id = 'hookos-quota-styles';
    style.textContent = `
      .generation-quota{margin:8px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.45;min-height:19px}
      .generation-quota.is-limit{color:#b42318}
      .generation-quota.is-ready{color:#444}
      #turnstile-container{display:flex;justify-content:center;margin:14px 0}
      .hookos-inline-auth{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:10px 0 0;padding:13px 14px;border:1px solid #e6e6e6;border-radius:16px;background:#fafafa;color:#333;font-size:13px;line-height:1.4}
      .hookos-inline-auth-copy{min-width:0}
      .hookos-inline-auth-title{font-weight:800;color:#111;margin-bottom:2px}
      .hookos-inline-auth-text{color:#666}
      .hookos-inline-auth button{flex:0 0 auto;border:1px solid #111;background:#111;color:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
      .hookos-inline-auth button:hover{opacity:.9}
      .hookos-inline-auth[hidden]{display:none}
      .hookos-usage-wrap{margin:12px 0 0;padding:14px 16px;border:1px solid #e6e6e6;border-radius:18px;background:#fff}
      .hookos-usage-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:9px}
      .hookos-usage-title{font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#777}
      .hookos-usage-count{font-size:13px;font-weight:800;color:#111}
      .hookos-usage-track{height:7px;border-radius:999px;background:#ededed;overflow:hidden}
      .hookos-usage-fill{height:100%;width:0;border-radius:inherit;background:#111;transition:width .25s ease}
      @media(max-width:560px){
        .hookos-inline-auth{align-items:flex-start;flex-direction:column}
        .hookos-inline-auth button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

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

  function ensureUsageCard() {
    const textarea = document.getElementById('idea-input');
    if (!textarea || document.getElementById('hookos-usage-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'hookos-usage-wrap';
    wrap.className = 'hookos-usage-wrap';
    wrap.innerHTML = `
      <div class="hookos-usage-head">
        <span class="hookos-usage-title">Free daily generations</span>
        <span class="hookos-usage-count" id="hookos-usage-count">3 left</span>
      </div>
      <div class="hookos-usage-track" aria-hidden="true"><div class="hookos-usage-fill" id="hookos-usage-fill"></div></div>
    `;
    textarea.closest('.hookos-idea-wrap')?.insertAdjacentElement('afterend', wrap);
  }

  function ensureIdeaUX() {
    const textarea = document.getElementById('idea-input');
    if (!textarea || document.getElementById('hookos-inline-auth')) return;

    const message = document.createElement('div');
    message.id = 'hookos-inline-auth';
    message.className = 'hookos-inline-auth';
    message.hidden = true;
    message.innerHTML = `
      <div class="hookos-inline-auth-copy">
        <div class="hookos-inline-auth-title">One small thing — sign in first.</div>
        <div class="hookos-inline-auth-text">Your 3 free generations are saved to your account.</div>
      </div>
      <button type="button" data-action="google-login">Sign in with Google</button>
    `;
    textarea.closest('.hookos-idea-wrap')?.insertAdjacentElement('afterend', message);
    textarea.addEventListener('input', hideAuthRequired);
  }

  function showAuthRequired() {
    ensureIdeaUX();
    const message = document.getElementById('hookos-inline-auth');
    const textarea = document.getElementById('idea-input');
    const wrapper = textarea?.closest('.hookos-idea-wrap');
    if (!message || !wrapper) return;
    message.hidden = false;
    wrapper.classList.add('is-auth-required');
    textarea.setAttribute('aria-describedby', 'hookos-inline-auth generation-quota');
  }

  function hideAuthRequired() {
    const message = document.getElementById('hookos-inline-auth');
    const textarea = document.getElementById('idea-input');
    const wrapper = textarea?.closest('.hookos-idea-wrap');
    if (message) message.hidden = true;
    if (wrapper) wrapper.classList.remove('is-auth-required');
  }

  function ensureTurnstileElement() {
    const form = document.getElementById('blueprint-form');
    const container = document.getElementById('turnstile-container');
    if (!form || !HOOKOS_CONFIG.TURNSTILE_SITE_KEY || !container) return;
    container.hidden = false;
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
    ensureUsageCard();
    const el = document.getElementById('generation-quota');
    const countEl = document.getElementById('hookos-usage-count');
    const fillEl = document.getElementById('hookos-usage-fill');
    if (!el || !countEl || !fillEl) return;

    if (!usage) {
      el.textContent = `Sign in with Google to generate · ${LIMIT} free generations per day.`;
      el.classList.remove('is-limit', 'is-ready');
      countEl.textContent = `${LIMIT} left`;
      fillEl.style.width = '0%';
      return;
    }

    const remaining = Math.max(0, Math.min(LIMIT, Number(usage.remaining ?? LIMIT)));
    const used = Math.max(0, LIMIT - remaining);
    el.textContent = remaining === 0
      ? 'Daily limit reached · 3/3 generations used. Come back tomorrow.'
      : `${remaining} of ${LIMIT} free generations left today.`;
    el.classList.toggle('is-limit', remaining === 0);
    el.classList.toggle('is-ready', remaining > 0);
    countEl.textContent = remaining === 0 ? '0 left' : `${remaining} left`;
    fillEl.style.width = `${(used / LIMIT) * 100}%`;
    hideAuthRequired();
  }

  async function refreshQuota() {
    ensureQuotaElement();
    ensureUsageCard();
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
    installStyles();
    ensureQuotaElement();
    ensureIdeaUX();
    ensureUsageCard();
    loadTurnstile();
    refreshQuota();

    const form = document.getElementById('blueprint-form');
    if (form) {
      form.addEventListener('submit', (event) => {
        if (!HookosAPI.getAccessToken()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showAuthRequired();
          document.getElementById('idea-input')?.focus();
        }
      }, true);
    }

    document.addEventListener('hookos:authenticated', () => {
      hideAuthRequired();
      refreshQuota();
      loadTurnstile();
    });
    document.addEventListener('hookos:signed-out', () => {
      setQuota(null);
      hideAuthRequired();
    });
    document.addEventListener('hookos:auth-required', showAuthRequired);
  }

  window.HookosQuotaUI = { showAuthRequired, refreshQuota };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
