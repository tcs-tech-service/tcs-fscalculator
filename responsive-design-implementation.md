# Responsive Web App: Desktop/Mobile Adaptive Layout
### Implementation Guide — HTML5 / CSS3 / JavaScript / Embedded JS Dataset (`data-*`)

This guide implements **Approach 1 (responsive, CSS-driven)** with a JavaScript layer that
uses **HTML5 `dataset` attributes** to expose the current device/breakpoint state to your
scripts and CSS, so both styling and behavior can react to device type without duplicating markup.

---

## 1. Project Structure

```
/project
  index.html
  /css
    styles.css
  /js
    app.js
```

---

## 2. HTML — Base Markup

Set the viewport meta tag (required for responsive behavior) and add a `data-*` hook on
`<html>` or `<body>` that JS will keep in sync with the current breakpoint.

```html
<!DOCTYPE html>
<html lang="en" data-device="unknown">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Responsive App</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <header class="site-header">
    <div class="logo">MyApp</div>

    <!-- Desktop nav: full menu -->
    <nav class="nav nav--desktop" data-nav="desktop">
      <a href="#">Home</a>
      <a href="#">Features</a>
      <a href="#">Pricing</a>
      <a href="#">Contact</a>
    </nav>

    <!-- Mobile nav: hamburger toggle -->
    <button class="nav-toggle" data-nav="mobile-toggle" aria-label="Toggle menu" aria-expanded="false">
      ☰
    </button>
  </header>

  <!-- Mobile menu panel (hidden by default, toggled by JS) -->
  <nav class="nav nav--mobile" data-nav="mobile" data-open="false">
    <a href="#">Home</a>
    <a href="#">Features</a>
    <a href="#">Pricing</a>
    <a href="#">Contact</a>
  </nav>

  <main class="layout">
    <section class="content">
      <h1>Welcome</h1>
      <p>This layout reflows automatically between desktop and mobile.</p>
    </section>

    <aside class="sidebar">
      <p>Sidebar content (becomes a bottom section on mobile).</p>
    </aside>
  </main>

  <script src="js/app.js"></script>
</body>
</html>
```

**Key idea:** `data-device` on `<html>` is the single source of truth. CSS can select on it
(`html[data-device="mobile"] { ... }`) and JS can read/write it (`document.documentElement.dataset.device`).

---

## 3. CSS3 — Media Queries + Dataset Selectors

Two complementary techniques:

1. **Media queries** — pure CSS, works even before JS runs (avoids flash of wrong layout).
2. **`[data-device]` attribute selectors** — for cases where JS-detected state (e.g. touch
   capability) should override pure viewport width.

```css
:root {
  --gap: 1rem;
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }

/* ---------- Mobile-first base styles ---------- */
.layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap);
}

.nav--desktop { display: none; }
.nav-toggle   { display: inline-block; background: none; border: none; font-size: 1.5rem; }

.nav--mobile {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.25s ease;
}
.nav--mobile[data-open="true"] { max-height: 300px; }

.sidebar { order: 2; } /* sidebar below content on mobile */

/* ---------- Tablet ---------- */
@media (min-width: 768px) {
  .layout { flex-direction: row; }
  .sidebar { order: 0; flex: 0 0 240px; }
  .content { flex: 1; }
}

/* ---------- Desktop ---------- */
@media (min-width: 1024px) {
  .nav--desktop { display: flex; gap: var(--gap); }
  .nav-toggle,
  .nav--mobile { display: none; }
}

/* ---------- Optional: JS-driven overrides via data-device ---------- */
/* Useful when you need JS logic (e.g. touch detection) to win over width alone */
html[data-device="mobile"] .content  { font-size: 0.95rem; }
html[data-device="desktop"] .content { font-size: 1rem; }
```

---

## 4. JavaScript — Detecting Device & Syncing the Dataset

JS keeps `document.documentElement.dataset.device` in sync with the real viewport (via
`matchMedia`, which is more efficient than a `resize` listener) and wires up mobile-only
interactions like the hamburger toggle.

```js
// js/app.js

const BREAKPOINTS = {
  mobile:  '(max-width: 767px)',
  tablet:  '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
};

function detectDevice() {
  if (window.matchMedia(BREAKPOINTS.desktop).matches) return 'desktop';
  if (window.matchMedia(BREAKPOINTS.tablet).matches) return 'tablet';
  return 'mobile';
}

function applyDeviceDataset() {
  const device = detectDevice();
  document.documentElement.dataset.device = device;
  document.body.dataset.touch = ('ontouchstart' in window) ? 'true' : 'false';
  return device;
}

// Initial run
let currentDevice = applyDeviceDataset();

// Re-check on breakpoint crossings only (not every pixel of resize)
Object.values(BREAKPOINTS).forEach((query) => {
  window.matchMedia(query).addEventListener('change', () => {
    const next = applyDeviceDataset();
    if (next !== currentDevice) {
      currentDevice = next;
      document.dispatchEvent(new CustomEvent('devicechange', { detail: { device: next } }));
    }
  });
});

// ---------- Mobile nav toggle (dataset-driven state, no class juggling) ----------
const navToggle = document.querySelector('[data-nav="mobile-toggle"]');
const mobileNav  = document.querySelector('[data-nav="mobile"]');

navToggle.addEventListener('click', () => {
  const isOpen = mobileNav.dataset.open === 'true';
  mobileNav.dataset.open = String(!isOpen);
  navToggle.setAttribute('aria-expanded', String(!isOpen));
});

// ---------- React to device changes in JS if needed ----------
document.addEventListener('devicechange', (e) => {
  // Example: auto-close mobile menu if user resizes into desktop
  if (e.detail.device === 'desktop') {
    mobileNav.dataset.open = 'false';
    navToggle.setAttribute('aria-expanded', 'false');
  }
});
```

### Why `dataset` + `matchMedia` instead of `navigator.userAgent`?

| Method | Reliable? | Notes |
|---|---|---|
| `navigator.userAgent` sniffing | ❌ Fragile | Spoofable, breaks on new devices, not future-proof |
| `window.innerWidth` + `resize` listener | ⚠️ Works but noisy | Fires constantly during resize/drag |
| `matchMedia().addEventListener('change')` | ✅ Recommended | Fires only on breakpoint crossings, matches CSS media queries exactly |
| `element.dataset` | ✅ Recommended | Native HTML5 API, no extra libraries, readable in both CSS (`[data-device]`) and JS (`el.dataset.device`) |

---

## 5. Testing Checklist

- [ ] Resize the browser window slowly across 767px, 768px, and 1024px — layout and `data-device` should flip at those exact points.
- [ ] Open Chrome/Firefox DevTools → Device Toolbar → test iPhone, iPad, and a desktop preset.
- [ ] Confirm `document.documentElement.dataset.device` in the console matches what you expect at each width.
- [ ] Verify the mobile menu closes automatically when resizing from mobile → desktop.
- [ ] Check touch devices get `data-touch="true"` on `<body>` (useful for disabling hover-only effects).

---

## 6. Optional Extensions

- **Persist user override**: let users force "desktop view" on mobile by writing to `localStorage` and reading it before `applyDeviceDataset()` runs.
- **Server-side hint**: if you also render server-side, you can set an initial `data-device` value from the `User-Agent` header to avoid a flash of the wrong layout before JS runs, then let client JS correct it.
- **CSS containment**: use `content-visibility: auto` on off-screen sections (e.g. hidden mobile nav) for a small perf gain.

---

## Summary

- **CSS3 media queries** do the heavy lifting for layout (mobile-first, `min-width` breakpoints).
- **`matchMedia` + `dataset`** give JavaScript a clean, standards-based way to know and react to the current device tier without duplicating breakpoint logic.
- **`data-*` attributes** on `<html>`/`<body>`/components act as the shared state contract between your CSS and JS — no class-name gymnastics required.

