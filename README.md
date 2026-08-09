# HookOS — Frontend (v3.0)

Static HTML/CSS/JS, no build step, no framework.

```
frontend/
├── index.html            home + generator (Hero → Generator → How It Works → Example → Why HookOS → Early Access)
├── privacy.html            Privacy Policy (DPDP-aware)
├── terms.html                Terms of Service
├── cookies.html                Cookie Policy
├── data-deletion.html            Data Deletion request
├── tutorial.html                   Tutorial
├── support.html                      Support / FAQ
│
├── config.js              shared API base URL + CSRF-aware fetch client
├── partials.js              shared navbar + footer (rendered once, reused on every page)
├── auth.js                    real session check (GET /me) — no cached/spoofable local user
├── cookie-consent.js            localStorage consent banner
├── script.js                      generator: framework selector, SSE-driven progress, results, Early Access form
│
├── styles.css
├── vercel.json
└── assets/
    ├── icons/         instagram.svg · youtube.svg · discord.svg
    ├── images/          logo.png (from the supplied HookOS logo, background removed)
    └── favicon.ico
```

## What's new in v1.0

- **Real Google Login.** The "Log In" button redirects to `${API_BASE_URL}/auth/google`. On return, `auth.js` calls `GET /me` to check the actual session — nothing is cached or trusted client-side.
- **Backend-driven loading.** The generator calls `POST /generate/start`, then opens an `EventSource` to `GET /generate/stream/:id`. Every loading label on screen (`Analyzing topic...` → ... → `Results ready.`) comes from a real SSE event; "Results Ready" only ever fires once the backend actually has the data.
- **Title field** added throughout the generator UI and results cards.
- **Shared navbar/footer.** One source of truth (`partials.js`) instead of duplicating markup across 7 pages — includes Home / Generator / Tutorial / Support / Login-or-profile, with active-link state and a zero-layout-shift mobile menu.
- **Legal pages** — Privacy Policy (with an explicit DPDP, India section), Terms, Cookie Policy, Data Deletion — all linked from the footer.
- **Cookie consent banner**, localStorage-based.
- **Early Access section** replaces the old testimonials, wired to `POST /early-access`.
- **Logo** — the supplied HookOS wordmark, background removed, used in the navbar and footer, plus a generated favicon.

## Local development

Serve the folder with any static server, e.g. `npx serve frontend`. `config.js` auto-detects `localhost` and points at `http://localhost:5000`.

## Deploying to Vercel

Root Directory → this folder. No build command. After deploying the backend, update `HOOKOS_CONFIG.API_BASE_URL` in `config.js` and redeploy.

## Known gaps / what to verify before shipping

- **Google OAuth is code-complete but not live-tested** — I don't have real Google Cloud credentials or network access in this environment. Test the full `/auth/google` → callback → session flow against real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` before launch.
- **SSE has no polling fallback.** `EventSource` isn't supported in a handful of very old browsers/proxies; if that matters for your audience, add a polling fallback against a `GET /generate/status/:id` endpoint (not built).
- **Self-service account/data deletion** is email-request only for now (see `data-deletion.html`); a one-click flow is noted as planned.
- **Tutorial/Support pages** have real but minimal placeholder content — expand as the product matures.
