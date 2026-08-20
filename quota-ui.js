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
      .hookos-idea-wrap{position:relative}
      .hookos-idea-wrap #idea-input{transition:border-color .18s ease,box-shadow .18s ease}
      .hookos-idea-wrap.is-auth-required #idea-input{border-color:#111;box-shadow:0 0 0 3px rgba(0,0,0,.06)}
      .hookos-inline-auth{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:10px 0 0;padding:12px 14px;border:1px solid #e6e6e6;border-radius:14px;background:#fafafa;color:#333;font-size:13px;line-height:1.4}
      .hookos-inline-auth-copy{min-width:0}
      .hookos-inline-auth-title{font-weight:750;color:#111;margin-bottom:2px}
      .hookos-inline-auth-text{color:#666}
      .hookos-inline-auth button{flex:0 0 auto;border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:9px 13px;font:inherit;font-size:12px;font-weight:750;cursor:pointer;white-space:nowrap}
      .hookos-inline-auth button:hover{opacity:.9}
      .hookos-inline-auth[hidden]{display:none}
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

  function ensureIdeaUX() {
    const textarea = document.getElementById('idea-input');
    if (!textarea || document.getElementById('hookos-inline-auth')) return;

    textarea.placeholder = 'Tell me what you’re creating today...';

    const wrapper = document.createElement('div');
    wrapper.className = 'hookos-idea-wrap';
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

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
    wrapper.insertAdjacentElement('afterend', message);

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
    if (!form || !HOOKOS_CONFIG.TURNSTILE_SITE_KEY || document.getElementById('turnstile-container')) return;
    const container = document.createElement('div');
    container.id = 'turnstile-container';
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
      el.classList.remove('is-limit', 'is-ready');
      return;
    }

    const remaining = Math.max(0, Number(usage.remaining ?? LIMIT));
    el.textContent = remaining === 0
      ? 'Daily limit reached · 3/3 generations used. Come back tomorrow.'
      : `${remaining} of ${LIMIT} free generations left today.`;
    el.classList.toggle('is-limit', remaining === 0);
    el.classList.toggle('is-ready', remaining > 0);
    hideAuthRequired();
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
    installStyles();
    ensureQuotaElement();
    ensureIdeaUX();
    loadTurnstile();
    refreshQuota();

    // Run before the main generator handler so signed-out users get an inline
    // explanation instead of a generic API error.
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
