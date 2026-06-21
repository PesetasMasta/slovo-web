# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page promotional/art site for the Czech theatre production **S.L.O.V.O.**
(Sex · Láska · Osamělost · Vina · Očista — the title is an acronym of its five
"words"). Plain static **HTML/CSS/JS, no framework, no build step, no dependencies**.
The entire site is three files: `index.html`, `styles.css`, `script.js`. Czech-only copy.

## Commands

- **Run locally** (must be a *threaded* server — the default `python -m http.server`
  is single-threaded and drops images when the gallery/zoom load several at once,
  causing broken images especially when scrolling back):
  ```
  python3 -c "from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler; ThreadingHTTPServer(('127.0.0.1',8753), SimpleHTTPRequestHandler).serve_forever()"
  ```
  then open http://localhost:8753/
- **Syntax-check the JS**: `node --check script.js`
- **Deploy**: `git push origin main` — GitHub Pages auto-rebuilds. Live at
  https://pesetasmasta.github.io/slovo-web/ (Pages serves from `main`/root; the
  empty `.nojekyll` keeps Jekyll from touching the files).
- No tests, no linter, no bundler.

## Architecture

The whole page is **one continuous, scroll-driven zoom** — not normal scrolling.

- One pinned section `.zoom-wrap` → sticky `.zoom-pin` → `.zoom-stage` holds ~11
  full-screen `.zoom-panel`s in order: hero → opening photo → prologue → the five
  words (S/L/O/V/O, Očista is a black "semantic-satiation" frame) → slovo o slově
  → Herci (credits) → Sledovat (footer). Each panel zooms into the next.
- `script.js` `initZoom(wrap)` drives it. Scroll position → `u` along a timeline of
  unit-length transitions; `render(progress)` sets each panel's `transform: scale`,
  `opacity`, `z-index`, `visibility` and `pointer-events` every frame.
  - **Leaving** panel (`local >= 0`) zooms toward the viewer (`ZOOM_IN`) and fades.
  - **Arriving** panel (`local < 0`) zooms in from slightly smaller (`ZOOM_FROM`).
    Tuning these three constants (`ZOOM_IN`, `ZOOM_FROM`, `FADE_IN`) changes the feel.
  - Only the centred frame gets `pointer-events: auto` — leaving frames are huge and
    invisible but would otherwise steal clicks (this is why links like Sledovat /
    cast names work). Keep this when adding interactive content to a panel.
  - `.zoom-stage` has its own `z-index` so panel z-indexes stay contained and the
    `.acronym` navigator paints on top.

### Per-panel data attributes (how the engine knows what to do)

- `data-panel` — marks a frame.
- `data-dwell="0.8"` — adds scroll units where the panel stays centred (used on the
  credits + footer so their clickable content is easy to land on).
- `data-acronym="0..4"` — maps a word panel to its letter in the top S·L·O·V·O
  indicator (mapping is NOT positional — set this when adding/reordering word panels).
- `data-assemble` — runs the prologue word-by-word reveal when that panel centres.
- `data-satiation` — the OČISTA dissolving-word block (only visible on its own frame).

### Other JS pieces (all in `script.js`)

- **Cast viewer** (`[data-actor-view]`): clicking a `.cast__name` (which carries a
  `data-photo`) opens a full-screen looping **filmstrip "drum"** of portraits —
  same-size touching cells, lit centre + dimmed neighbours, momentum/inertia glide.
  Built from the cast names in the DOM; portraits lazy-load via `data-bg`. Spin with
  drag / arrows / trackpad horizontal wheel (`deltaX`); swipe up / Esc / rollet
  handle / click-outside closes.
- **Footer** (`[data-foot-slides]`): slow cross-fade through the reserve photos.
- Everything respects `prefers-reduced-motion` (panels fall back to a static stack).

## Conventions / gotchas

- **All asset paths are relative** (`images/...`, `styles.css`) so the site works at
  the `/slovo-web/` Pages subpath — do not switch to root-absolute (`/images/...`).
- **Images are web-sized into `images/`** (`sex/osamelost/vina/slovo.jpg`,
  `actors/*`, `reserve/*` for the footer, `sample/*` for hero/intro/láska). Originals
  live outside the repo; resize new ones (e.g. `sips -Z 1800`) before adding — don't
  commit raw camera files.
- Display font **Bodoni Moda**, body **Hanken Grotesk** (Google Fonts, in `<head>`).
  The real logo font ("The Awesome Serif") is paid and intentionally not used.
- Several actor portraits are **placeholder scene crops**, not real headshots
  (tracked in the spec). Dimitriy's was pulled from Instagram's `og:image`.
- Design intent and history: `docs/superpowers/specs/2026-06-20-slovo-web-design.md`.
