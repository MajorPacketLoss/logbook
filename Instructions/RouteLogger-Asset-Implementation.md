# RouteLogger — Visual Asset Implementation Handoff

This document covers everything needed to implement the RouteLogger branding assets into the PWA. It is written as a complete handoff for another developer or AI continuing the build.

---

## Project Context

RouteLogger is a personal PWA (Progressive Web App) hosted on GitHub Pages. It is a CRA-compliant vehicle mileage and fuel logbook for Canadian business use. The app targets iPhone via Safari "Add to Home Screen" and requires no App Store publishing. It uses vanilla HTML/CSS/JS with IndexedDB for storage.

---

## Branding Summary

- **App name:** RouteLogger
- **Slogan:** The convenient vehicle logbook for Canadian business.
- **Wordmark:** "Route" in regular weight + "Logger" in bold, Inter font, dark navy color
- **Logo mark:** Open logbook/notebook with a dashed route line and two teardrop map pins drawn across the pages
- **Primary font:** Inter (Google Fonts)

---

## Asset File Structure

All assets live inside the project under `assets/`:

```
routelogger/
├── index.html
├── manifest.json
├── sw.js
├── style.css
├── app.js
├── db.js
├── pages/
└── assets/
    ├── icons/
    │   ├── icon-192.png          ← PWA manifest icon (192×192px)
    │   ├── icon-512.png          ← PWA manifest icon (512×512px, maskable)
    │   └── apple-touch-icon.png  ← iOS home screen icon (180×180px)
    └── logo/
        ├── logo-mark.svg         ← Icon only, no text, no background
        ├── logo-full-light.svg   ← Full logo for light mode
        └── logo-full-dark.svg    ← Full logo inverted for dark mode
```

### PNG Icon Export Notes (from Inkscape)
- Export `logo-mark.svg` at 192×192px → `icon-192.png`
- Export `logo-mark.svg` at 512×512px → `icon-512.png`
- Export `logo-mark.svg` at 180×180px → `apple-touch-icon.png`
- Use File → Export PNG Image → set width/height → Export As
- Background: transparent or `#f7f6f2` fill for PNG icons

---

## Color Palette

### Light Mode
| CSS Variable | Hex | Usage |
|---|---|---|
| `--color-bg` | `#f7f6f2` | Page background — matches logo background |
| `--color-surface` | `#fafaf8` | Cards, modals |
| `--color-surface-2` | `#f0efe9` | Input fields, nested surfaces |
| `--color-border` | `#dedad3` | Dividers, input borders |
| `--color-text` | `#1a1f2e` | Primary text — matches logo navy |
| `--color-text-muted` | `#6b6a65` | Secondary labels |
| `--color-text-faint` | `#b0afa9` | Placeholders, disabled |
| `--color-primary` | `#01696f` | Teal accent — buttons, active nav, links |
| `--color-primary-hover` | `#0c4e54` | Teal hover state |
| `--color-success` | `#437a22` | Business trip tags |
| `--color-warning` | `#b07a00` | Personal trip tags |
| `--color-error` | `#a12c7b` | Destructive actions |

### Dark Mode
| CSS Variable | Hex | Usage |
|---|---|---|
| `--color-bg` | `#0d1017` | Page background — dark navy-black |
| `--color-surface` | `#1a1f2e` | Cards — logo navy becomes the surface |
| `--color-surface-2` | `#1f2538` | Nested surfaces |
| `--color-surface-offset` | `#252b3d` | Input fields, hover states |
| `--color-border` | `#2e3447` | Dividers |
| `--color-text` | `#edecea` | Primary text — warm off-white |
| `--color-text-muted` | `#8a8fa0` | Secondary labels |
| `--color-text-faint` | `#4a4f60` | Placeholders, disabled |
| `--color-primary` | `#4f98a3` | Teal lightened for dark bg contrast |
| `--color-primary-hover` | `#227f8b` | |
| `--color-success` | `#6daa45` | Business trip tags |
| `--color-warning` | `#e8af34` | Personal trip tags |
| `--color-error` | `#d163a7` | Destructive actions |

---

## manifest.json

```json
{
  "name": "RouteLogger",
  "short_name": "RouteLogger",
  "description": "The convenient vehicle logbook for Canadian business.",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f7f6f2",
  "theme_color": "#1a1f2e",
  "icons": [
    {
      "src": "./assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./assets/icons/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

---

## index.html Head Tags

Add these to `<head>` for full PWA and iOS support:

```html
<!-- PWA manifest -->
<link rel="manifest" href="./manifest.json">

<!-- iOS home screen support -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="RouteLogger">
<link rel="apple-touch-icon" href="./assets/icons/apple-touch-icon.png">

<!-- Theme color for browser chrome -->
<meta name="theme-color" content="#1a1f2e" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#1a1f2e" media="(prefers-color-scheme: light)">

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="./assets/logo/logo-mark.svg">

<!-- Inter font -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<!-- Lucide icons -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" defer></script>
```

---

## Logo Usage in HTML

### App header / nav bar (mark only)
```html
<img src="./assets/logo/logo-mark.svg"
     alt="RouteLogger"
     width="32" height="32"
     class="nav-logo">
```

### Splash screen (full logo, theme-aware)
```html
<div class="splash-screen">
  <img src="./assets/logo/logo-full-light.svg"
       alt="RouteLogger" width="180"
       class="splash-logo light-logo">
  <img src="./assets/logo/logo-full-dark.svg"
       alt="RouteLogger" width="180"
       class="splash-logo dark-logo">
</div>
```

### CSS to toggle light/dark logo versions
```css
[data-theme="dark"]  .light-logo { display: none; }
[data-theme="light"] .dark-logo  { display: none; }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .light-logo { display: none; }
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) .dark-logo  { display: none; }
}
```

---

## Splash Screen

Shown on app load before the main UI renders. Fades out after ~800ms.

### Colors
| | Light | Dark |
|---|---|---|
| Background | `#f7f6f2` | `#0d1017` |
| Logo / text | `#1a1f2e` | `#edecea` |
| Slogan | `#6b6a65` | `#8a8fa0` |

### HTML
```html
<div id="splash" class="splash">
  <img src="./assets/logo/logo-full-light.svg" class="splash-logo light-logo" alt="RouteLogger" width="160">
  <img src="./assets/logo/logo-full-dark.svg"  class="splash-logo dark-logo"  alt="RouteLogger" width="160">
</div>
```

### CSS
```css
.splash {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  z-index: 9999;
  transition: opacity 0.4s ease;
}
.splash.hidden {
  opacity: 0;
  pointer-events: none;
}
```

### JS
```js
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 400);
  }, 800);
});
```

---

## Lucide Icons

### CDN (already in head tags above)
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" defer></script>
```

### Usage
```html
<i data-lucide="fuel"></i>
<i data-lucide="map-pin-plus"></i>
```

### Initialize — call after EVERY dynamic page render
```js
lucide.createIcons();
```

### Icon Reference

| Page / Action | Icon Name |
|---|---|
| Dashboard | `layout-dashboard` |
| Vehicles | `car` |
| Log Trip | `map-pin-plus` |
| Log Fuel | `fuel` |
| Trip History | `list` |
| Fuel History | `receipt` |
| Summary / CRA Calculator | `bar-chart-2` |
| Export | `download` |
| Settings | `settings` |
| Dark mode toggle | `moon` / `sun` |
| Edit | `pencil` |
| Delete | `trash-2` |
| Add / new | `plus` |
| Save / confirm | `check` |
| Cancel / close | `x` |
| Business trip tag | `briefcase` |
| Personal trip tag | `house` |
| Odometer | `gauge` |
| Date | `calendar` |
| Distance / km | `milestone` |
| Notes | `notebook-pen` |
| CRA warning | `triangle-alert` |

### Icon Sizing CSS
```css
[data-lucide] {
  width: 20px;
  height: 20px;
  stroke-width: 1.75;
  vertical-align: middle;
  flex-shrink: 0;
}
.nav-icon [data-lucide] {
  width: 24px;
  height: 24px;
}
```

---

## Dark / Light Mode Toggle

Theme is controlled via `data-theme` on `<html>`. Do NOT use localStorage (GitHub Pages iframes may block it) — use an in-memory variable.

```js
(function () {
  const root = document.documentElement;
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    updateToggleIcon();
  }

  function updateToggleIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';
    lucide.createIcons();
  }

  window.toggleTheme = toggleTheme;
  window.addEventListener('load', updateToggleIcon);
})();
```

Toggle button:
```html
<button id="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">
  <i data-lucide="moon"></i>
</button>
```

---

## Font — Inter

```css
:root {
  --font-body: 'Inter', 'Helvetica Neue', Arial, sans-serif;
}
body {
  font-family: var(--font-body);
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}
```

Weight guide:
- `400` — body text, form labels
- `500` — emphasized labels, table headers
- `600` — section headings, button text
- `700` — page titles, active nav
- `800` — wordmark "Logger", hero numbers on summary page
