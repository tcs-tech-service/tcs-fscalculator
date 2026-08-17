# Adaptive Web App: Client-Side Device Branching (Static Hosting)
### Implementation Guide — Approach 2, Variant 4A — HTML5 / CSS3 / JavaScript / Embedded JS Dataset (`data-*`)
### For static hosts with no server-side code (GitHub Pages, static S3, etc.)

This variant serves **genuinely different markup/components** per device tier — not just a
resized layout — using only client-side JavaScript. No server, no `User-Agent` header
inspection, no build-time branching. Everything happens in the browser after the page loads,
which makes it a good fit for **GitHub Pages** or any host that only serves static files.

---

## 1. Project Structure

```
/project
  index.html
  /css
    styles.css
  /js
    app.js
    templates.js
```

Deployable as-is to GitHub Pages (`main` branch or `/docs` folder, or via GitHub Actions).

---

## 2. HTML — Minimal Shell

The page ships an empty mount point. JavaScript decides *which* template to inject based on
the detected device, immediately on load.

```html
<!DOCTYPE html>
<html lang="en" data-device="unknown">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Adaptive App</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <div id="app" data-mount="app">
    <!-- Filled entirely by JS after device detection -->
    <noscript>This app requires JavaScript to display correctly.</noscript>
  </div>

  <script src="js/templates.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

> **Note on `<noscript>`:** since there's no server fallback, users with JS disabled see
> nothing but this message. If that matters for your audience, Approach 1 (responsive CSS)
> degrades more gracefully — worth keeping in mind for static hosting specifically.

---

## 3. JavaScript — Device Detection

```js
// js/app.js

function detectDevice() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const width = window.innerWidth;

  if (width < 768 && isTouch) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function mountApp() {
  const device = detectDevice();
  document.documentElement.dataset.device = device;

  const mount = document.querySelector('[data-mount="app"]');
  mount.innerHTML = ''; // clear previous render

  const renderers = {
    mobile: window.AppTemplates.renderMobile,
    tablet: window.AppTemplates.renderTablet,
    desktop: window.AppTemplates.renderDesktop,
  };

  const node = renderers[device]();
  mount.appendChild(node);

  return device;
}

let currentDevice = mountApp();

// Re-mount only when the device TIER changes (not on every resize pixel)
window.addEventListener('resize', debounce(() => {
  const next = detectDevice();
  if (next !== currentDevice) {
    currentDevice = next;
    mountApp();
  }
}, 200));

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
```

---

## 4. JavaScript — Templates (Different Components Per Device)

```js
// js/templates.js
window.AppTemplates = {

  renderDesktop() {
    const el = document.createElement('div');
    el.className = 'view view--desktop';
    el.innerHTML = `
      <header class="header">
        <div class="logo">MyApp</div>
        <nav>
          <a href="#">Home</a><a href="#">Features</a><a href="#">Pricing</a><a href="#">Contact</a>
        </nav>
      </header>
      <main class="grid">
        <table class="data-table" data-component="data-table">
          <thead><tr><th>Name</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody><!-- rows injected by data logic --></tbody>
        </table>
        <aside class="sidebar">Filters, details panel, etc.</aside>
      </main>
    `;
    return el;
  },

  renderTablet() {
    const el = document.createElement('div');
    el.className = 'view view--tablet';
    el.innerHTML = `
      <header class="header header--compact">
        <div class="logo">MyApp</div>
        <button data-action="open-menu">☰</button>
      </header>
      <main class="two-col">
        <table class="data-table" data-component="data-table">
          <thead><tr><th>Name</th><th>Status</th></tr></thead>
          <tbody></tbody>
        </table>
      </main>
    `;
    return el;
  },

  renderMobile() {
    const el = document.createElement('div');
    el.className = 'view view--mobile';
    el.innerHTML = `
      <header class="header header--compact">
        <div class="logo">MyApp</div>
        <button data-action="open-menu">☰</button>
      </header>
      <main class="card-feed" data-component="card-feed">
        <!-- Mobile gets cards instead of a table -->
        <div class="card"><h3>Item name</h3><p>Status: active</p></div>
      </main>
      <nav class="bottom-nav">
        <a href="#">Home</a><a href="#">Search</a><a href="#">Profile</a>
      </nav>
    `;
    return el;
  },
};
```

**Key idea:** desktop gets a data table + sidebar; mobile gets a card feed + bottom nav —
genuinely different components, not the same table squeezed into a small screen. The `data-device`
attribute on `<html>` and `data-component` attributes on major sections let CSS and any other
JS (analytics, tests) know exactly what's currently mounted.

---

## 5. CSS3 — Per-View Stylesheets

```css
/* Shared resets */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }

/* ---------- Desktop view ---------- */
.view--desktop .grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  padding: 2rem;
}
.view--desktop .data-table { width: 100%; border-collapse: collapse; }
.view--desktop .data-table th,
.view--desktop .data-table td { padding: 0.75rem; border-bottom: 1px solid #eee; }

/* ---------- Tablet view ---------- */
.view--tablet .two-col {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}

/* ---------- Mobile view ---------- */
.view--mobile .card-feed {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  padding-bottom: 4.5rem; /* clear the fixed bottom nav */
}
.view--mobile .card {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 1rem;
}
.view--mobile .bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-around;
  padding: 0.75rem 0;
  background: #fff;
  border-top: 1px solid #eee;
}
```

---

## 6. Avoiding Flash of Wrong Content (FOWC)

Since there's no server to pick the right template before first paint, a brief flash of
empty page (or a default template) can occur while JS runs. On static hosting this is
unavoidable to some degree, but you can minimize it:

- **Inline a tiny blocking script in `<head>`** that sets `data-device` on `<html>`
  *before* CSS/layout paints, so at least CSS-level styling (loading spinner, background)
  is correct immediately:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>
    // Runs synchronously before first paint — keep this tiny
    document.documentElement.dataset.device =
      (window.innerWidth < 768 && ('ontouchstart' in window)) ? 'mobile' :
      (window.innerWidth < 1024) ? 'tablet' : 'desktop';
  </script>
  <link rel="stylesheet" href="css/styles.css">
</head>
```

- **Show a lightweight loading state** in `#app` by default (skeleton/spinner) styled via
  CSS, so the empty-mount gap doesn't look broken:

```css
[data-mount="app"]:empty::before {
  content: "";
  display: block;
  /* simple skeleton/spinner styling here */
}
```

- Keep `templates.js` and `app.js` small and loaded without `defer`/`async` delay if this
  flash matters for your use case — trade-off is blocking parse slightly longer.

---

## 7. GitHub Pages Deployment Notes

- **Publish source**: repo Settings → Pages → choose branch (`main`) and folder (`/root` or `/docs`).
- **Custom domain**: add a `CNAME` file at the repo root if using one; GitHub Pages handles HTTPS automatically for both `github.io` and verified custom domains.
- **Caching**: GitHub Pages sets aggressive caching on assets by default — during development, hard-refresh (Cmd/Ctrl+Shift+R) to avoid seeing a stale `app.js`/`templates.js`.
- **No environment variables or server logic**: anything that needs a secret key or server-side branching (e.g. the `User-Agent`-based 4B variant) is **not possible** on GitHub Pages — that would require Vercel, Netlify, Cloudflare Pages, or a separate backend, as discussed previously.
- **Relative paths**: if deploying to a project page (`username.github.io/repo-name/`) rather than a user/org page, double-check `<script src="js/app.js">` and `<link href="css/styles.css">` use relative (not root-absolute `/js/app.js`) paths, or they'll 404 under the `/repo-name/` subpath.

---

## 8. Testing Checklist

- [ ] Open in Chrome DevTools → Device Toolbar → iPhone preset — confirm the mobile template (cards + bottom nav) renders, not a squeezed desktop table.
- [ ] Resize the browser slowly across 767px/768px and 1023px/1024px — confirm the DOM is actually swapped (inspect `#app`'s children in Elements panel), not just restyled.
- [ ] Disable JavaScript in DevTools and reload — confirm the `<noscript>` message (or your fallback) shows instead of a blank page.
- [ ] Check Network tab payload — confirm no unnecessary template code is a blocker (all templates ship in one bundle here, which is fine at small scale; see note below for larger apps).
- [ ] Deploy to GitHub Pages and test on an actual phone over Wi-Fi, not just DevTools emulation — real touch/viewport behavior can differ.

---

## 9. Note on Scaling This Further

At small-to-medium scale, shipping all three templates (`templates.js`) in one file and
branching client-side is simple and totally fine. If the app grows and you want to avoid
downloading desktop-only code to mobile users (or vice versa), consider:

- **Dynamic `import()`** to lazy-load only the needed template file per device, e.g.
  `const { renderMobile } = await import('./templates/mobile.js')` — still works on static
  hosting, no server needed.
- This keeps the "adaptive" benefit (different UX per device) while trimming the "ships
  everything to everyone" downside of the simple single-file version above.

---

## Summary

- Static hosting (GitHub Pages included) rules out server-side branching (4B) — only
  **client-side branching (4A)** is possible.
- Detect device via `matchMedia`/`innerWidth` + touch detection, then mount a distinct
  template/component tree per tier via JS — no server involved.
- Use an inline head script to set `data-device` before first paint, minimizing flash of
  wrong content.
- For larger apps, lazy-load templates with dynamic `import()` instead of bundling all
  device variants into one file.
