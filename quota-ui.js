// ============================================================================
// HOOKOS — daily generation quota UI
// ============================================================================

(function initQuotaUI() {
  const LIMIT = 3;

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
    const response = await originalGenerate(payload);
    if (response?.data?.usage) setQuota(response.data.usage);
    else refreshQuota();
    return response;
  };

  function init() {
    ensureQuotaElement();
    refreshQuota();
    document.addEventListener('hookos:authenticated', refreshQuota);
    document.addEventListener('hookos:signed-out', () => setQuota(null));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
