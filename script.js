// ==========================================================================
// HOOKOS — generator (homepage)
// UI + API calls only. All generation happens on the backend; this file
// only renders whatever progress/results the backend actually reports.
// ==========================================================================

/* ---------------------------------------------------------------------- */
/* Scroll reveal                                                           */
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
/* Generator                                                                */
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

  // Mirrors backend/utils/constants.js LOADING_STATES — used only to render
  // the step list; the actual sequencing always comes from real SSE events,
  // never a local timer.
  const STEP_ORDER = ['analyzing', 'audience', 'framework', 'title', 'hook', 'script', 'scenes', 'cta', 'metrics', 'finalizing', 'done'];

  const frameworkGrid = document.getElementById('framework-grid');
  const ideaInput = document.getElementById('idea-input');
  const formHint = document.getElementById('form-hint');
  const apiError = document.getElementById('api-error');
  const generateBtn = document.getElementById('generate-btn');
  const generateBtnText = document.getElementById('generate-btn-text');
  const loadingPanel = document.getElementById('loading-panel');
  const loadingStatus = document.getElementById('loading-status');
  const loadingBar = document.getElementById('loading-bar');
  const loadingStepsEl = document.getElementById('loading-steps');
  const resultsSection = document.getElementById('results');

  let selectedFramework = FRAMEWORKS[0].id;
  let activeEventSource = null;

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
    startLoadingUI();

    try {
      const startRes = await HookosAPI.startGenerate({ topic: idea, framework: selectedFramework });
      const jobId = startRes?.data?.jobId;
      if (!jobId) throw new Error('No job was returned by the server.');

      streamJob(jobId);
    } catch (err) {
      stopLoadingUI();
      showError(
        err.status === 429
          ? "You're generating a little too fast — wait a moment and try again."
          : 'Something went wrong starting your blueprint. Please try again.'
      );
    }
  });

  function streamJob(jobId) {
    if (activeEventSource) activeEventSource.close();

    const es = new EventSource(HookosAPI.streamUrl(jobId), { withCredentials: true });
    activeEventSource = es;

    es.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      renderLoadingStep(data.step, data.label);

      // "Results Ready" — and only this event — carries the final data.
      // Nothing renders as complete before this fires.
      if (data.step === 'done' && data.result) {
        renderResults(data.result);
        resultsSection.hidden = false;
        stopLoadingUI();
        es.close();
        activeEventSource = null;
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    es.addEventListener('error', (event) => {
      let message = 'Something went wrong generating your blueprint. Please try again.';
      try {
        const data = JSON.parse(event.data);
        if (data?.message) message = data.message;
      } catch (_) {
        /* connection-level error, not a payload — keep default message */
      }
      stopLoadingUI();
      showError(message);
      es.close();
      activeEventSource = null;
    });

    // Native EventSource connection failures (e.g. network drop) also land
    // here without a parsable payload.
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      stopLoadingUI();
      showError('Lost connection while generating. Please try again.');
      es.close();
      activeEventSource = null;
    };
  }

  function startLoadingUI() {
    generateBtn.disabled = true;
    generateBtnText.innerHTML = 'Generating<span class="loading-dots"><span></span><span></span><span></span></span>';
    loadingPanel.classList.add('is-active');
    loadingBar.style.width = '0%';
    loadingStatus.textContent = 'Connecting...';
    loadingStepsEl.innerHTML = STEP_ORDER.map((s) => `<li data-step="${s}"></li>`).join('');
  }

  function stopLoadingUI() {
    generateBtn.disabled = false;
    generateBtnText.textContent = 'Generate Blueprint';
    window.setTimeout(() => loadingPanel.classList.remove('is-active'), 300);
  }

  function renderLoadingStep(step, label) {
    loadingStatus.textContent = label;
    const index = STEP_ORDER.indexOf(step);
    if (index === -1) return;

    loadingBar.style.width = `${((index + 1) / STEP_ORDER.length) * 100}%`;

    loadingStepsEl.querySelectorAll('li').forEach((li) => {
      const liIndex = STEP_ORDER.indexOf(li.dataset.step);
      li.classList.toggle('is-done', liIndex < index);
      li.classList.toggle('is-active', liIndex === index);
    });
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
    setText('result-title', bp.title);
    setText('result-topic', bp.topicRefinement);
    setText('result-hook', bp.hook);
    setText('result-script', bp.script);
    setText('result-cta', bp.cta);

    const sceneEl = document.getElementById('result-scene');
    sceneEl.innerHTML = '';
    String(bp.scenePlan || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, idx) => {
        const row = document.createElement('div');
        row.className = 'scene';
        row.innerHTML = `<span class="scene-num">${idx + 1}.</span><span>${escapeHtml(line.replace(/^\d+[.)]\s*/, ''))}</span>`;
        sceneEl.appendChild(row);
      });

    renderMetrics(bp.metrics || {});

    document.querySelectorAll('.result-card').forEach((card, i) => {
      card.classList.remove('fade-slide-in');
      void card.offsetWidth;
      card.style.animationDelay = `${i * 0.06}s`;
      card.classList.add('fade-slide-in');
    });
  }

  function renderMetrics(metrics) {
    setText('metric-virality', metrics.viralityScore != null ? `${metrics.viralityScore}` : '—');
    setText('metric-retention', metrics.retentionScore != null ? `${metrics.retentionScore}` : '—');
    setText('metric-watchtime', metrics.predictedWatchTime != null ? `${metrics.predictedWatchTime}` : '—');
    setText('metric-emotion', metrics.emotionTrigger || '—');
    setText('metric-framework', metrics.framework || '—');
    setText('metric-confidence', metrics.confidence || '—');

    setBar('metric-virality-bar', metrics.viralityScore);
    setBar('metric-retention-bar', metrics.retentionScore);
    setBar('metric-watchtime-bar', metrics.predictedWatchTime);
  }

  function setBar(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = value != null ? `${Math.max(0, Math.min(100, value))}%` : '0%';
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
        window.setTimeout(() => {
          btn.textContent = 'Copy';
        }, 2000);
      });
  });
})();

/* ---------------------------------------------------------------------- */
/* Early Access form                                                        */
/* ---------------------------------------------------------------------- */

(function initEarlyAccess() {
  const form = document.getElementById('early-access-form');
  if (!form) return;

  const emailInput = document.getElementById('ea-email');
  const feedbackInput = document.getElementById('ea-feedback');
  const hint = document.getElementById('ea-hint');
  const submitBtn = document.getElementById('ea-submit-btn');
  const submitText = document.getElementById('ea-submit-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    hint.classList.remove('error');

    if (!email) {
      hint.textContent = 'Enter your email to join the list.';
      hint.classList.add('error');
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = 'Submitting...';
    hint.textContent = '';

    try {
      await HookosAPI.joinEarlyAccess({ email, feedback: feedbackInput.value.trim() });
      submitText.textContent = "✓ You're on the list";
      form.reset();
      window.setTimeout(() => {
        submitText.textContent = 'Request Early Access';
        submitBtn.disabled = false;
      }, 2500);
    } catch (err) {
      submitBtn.disabled = false;
      submitText.textContent = 'Request Early Access';
      hint.textContent =
        err.status === 501
          ? 'Early access signups open soon — check back shortly.'
          : 'Something went wrong. Please try again.';
      hint.classList.add('error');
    }
  });
})();
