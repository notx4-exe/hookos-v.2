// ==========================================================================
// HOOKOS — shared client script (no backend, local state only)
// ==========================================================================

(function () {
  'use strict';

  /* ---------------- Scroll reveal (landing page) ---------------- */

  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
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
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------------- Tool page logic ---------------- */

  const form = document.getElementById('blueprint-form');
  if (!form) return; // not on tool.html

  const ideaInput = document.getElementById('idea-input');
  const styleCards = document.querySelectorAll('.style-card');
  const formHint = document.getElementById('form-hint');
  const generateBtn = document.getElementById('generate-btn');
  const generateBtnText = document.getElementById('generate-btn-text');
  const resultsSection = document.getElementById('results');

  let selectedStyle = 'psychology';

  styleCards.forEach((card) => {
    card.addEventListener('click', () => {
      styleCards.forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-checked', 'true');
      selectedStyle = card.dataset.style;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const idea = ideaInput.value.trim();

    if (!idea) {
      formHint.textContent = 'Enter an idea before generating your blueprint.';
      formHint.classList.add('error');
      ideaInput.focus();
      return;
    }

    formHint.textContent = '';
    formHint.classList.remove('error');
    setLoading(true);

    // Simulate generation latency for a premium, deliberate feel.
    window.setTimeout(() => {
      const blueprint = generateBlueprint(idea, selectedStyle);
      renderResults(blueprint);
      setLoading(false);
      resultsSection.hidden = false;
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 900);
  });

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
      generateBtnText.innerHTML =
        'Generating<span class="loading-dots"><span></span><span></span><span></span></span>';
    } else {
      generateBtnText.textContent = 'Generate Blueprint';
    }
  }

  /* ---------------- Local blueprint generator ---------------- */
  /* Template-based, deterministic-ish generation. No API, no backend. */

  function cleanIdea(raw) {
    let s = raw.replace(/\s+/g, ' ').trim();
    s = s.charAt(0).toLowerCase() + s.slice(1);
    s = s.replace(/[.?!]+$/, '');
    return s;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function generateBlueprint(rawIdea, style) {
    const idea = cleanIdea(rawIdea);

    if (style === 'psychology') {
      return generatePsychology(idea);
    }
    return generateStorytelling(idea);
  }

  function generatePsychology(idea) {
    const topic = `A curiosity-driven breakdown of ${idea}, built to trigger a pattern interrupt in the first two seconds and resolve it with one surprising insight.`;

    const hookOptions = [
      `Nobody's telling you the real reason ${idea}.`,
      `${capitalize(idea)} — and it's not for the reason you think.`,
      `Here's the uncomfortable truth about ${idea}.`
    ];
    const hook = hookOptions[Math.floor(hashStr(idea)) % hookOptions.length];

    const script =
      `Open with the hook as an on-screen claim, said directly to camera.\n` +
      `Name the common wrong belief people hold about ${idea}.\n` +
      `Introduce the real, counter-intuitive mechanism behind it in one clear sentence.\n` +
      `Back it up with a quick, concrete example the viewer instantly recognizes.\n` +
      `Land on a single reframe the viewer can apply immediately.`;

    const scenePlanItems = [
      `Direct-to-camera delivery of the hook line, tight framing.`,
      `Text overlay stating the common wrong belief, plain background.`,
      `Cutaway visual illustrating the real mechanism (diagram, object, or demonstration).`,
      `Quick real-world example shot to ground the idea.`,
      `Close on camera for the reframe and CTA delivery.`
    ];

    const cta = `Save this if you've believed the myth about ${idea} — you'll want it later.`;

    return {
      topic,
      hook,
      script,
      scenePlan: scenePlanItems,
      cta
    };
  }

  function generateStorytelling(idea) {
    const topic = `A first-person narrative about ${idea}, structured around a turning point so the viewer feels the shift alongside the storyteller.`;

    const hookOptions = [
      `I didn't understand ${idea} until this happened to me.`,
      `This is the story of how I learned ${idea} the hard way.`,
      `Three months ago, ${idea} changed everything for me.`
    ];
    const hook = hookOptions[Math.floor(hashStr(idea)) % hookOptions.length];

    const script =
      `Open with the hook as a personal, vulnerable admission.\n` +
      `Set the scene: where you were and what was going wrong related to ${idea}.\n` +
      `Walk through the specific moment things shifted — the turning point.\n` +
      `Show what changed after that moment, in plain, honest terms.\n` +
      `Close with the lesson learned and how the viewer can apply it.`;

    const scenePlanItems = [
      `Establishing shot setting the scene, slightly muted tone.`,
      `B-roll representing the struggle or setback tied to ${idea}.`,
      `Turning-point moment shown in close-up, change in lighting or pace.`,
      `Present-day shot showing the "after" state.`,
      `Warm, direct-to-camera close for the lesson and CTA.`
    ];

    const cta = `Follow if you want more real stories like this one.`;

    return {
      topic,
      hook,
      script,
      scenePlan: scenePlanItems,
      cta
    };
  }

  function hashStr(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 1000;
    }
    return Math.abs(hash);
  }

  /* ---------------- Render results ---------------- */

  function renderResults(bp) {
    document.getElementById('result-topic').textContent = bp.topic;
    document.getElementById('result-hook').textContent = bp.hook;
    document.getElementById('result-script').textContent = bp.script;
    document.getElementById('result-cta').textContent = bp.cta;

    const sceneEl = document.getElementById('result-scene');
    sceneEl.innerHTML = '';
    bp.scenePlan.forEach((line, idx) => {
      const row = document.createElement('div');
      row.className = 'scene';
      row.innerHTML = `<span class="scene-num">${idx + 1}.</span><span>${escapeHtml(line)}</span>`;
      sceneEl.appendChild(row);
    });

    document.querySelectorAll('.result-card').forEach((card, i) => {
      card.classList.remove('fade-slide-in');
      // Force reflow so the animation can restart on regeneration.
      void card.offsetWidth;
      card.style.animationDelay = `${i * 0.06}s`;
      card.classList.add('fade-slide-in');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- Copy buttons ---------------- */

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    const text = targetEl.innerText;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        window.setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 1600);
      })
      .catch(() => {
        btn.textContent = 'Copy failed';
        window.setTimeout(() => {
          btn.textContent = 'Copy';
        }, 1600);
      });
  });
})();
