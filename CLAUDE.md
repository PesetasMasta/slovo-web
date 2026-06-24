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

The page is a **fixed full-viewport stage**, navigated by gesture — not by scrolling.

- One pinned section `.zoom-wrap` → fixed `.zoom-pin` → `.zoom-stage` holds ~11
  full-screen `.zoom-panel`s. From the visitor's view they collapse into **4 manual
  stops** — hero → "slovo o slově" → Herci (credits) → Sledovat (footer) — with the
  opening photo, prologue and the five words (S/L/O/V/O) playing as an **autoplay
  reel** between hero and the word stop.
- `script.js` `initJourney(wrap)` drives it. **Manual** moves between stops use a
  follow-finger **slide + reveal** (`go()`): the leaving panel translates with the
  finger and fades while the next zooms in from `ZOOM_FROM`. The **autoplay reel**
  uses a **zoom-through** (`autoZoom()`): a slow pre-zoom (`SLOW_TO`) that
  accelerates (ease-in) — current panel zooms toward the viewer and fades, next
  zooms in. Touch/scroll both drive it; scroll has no zoom-out "grab". Hold pauses
  the reel; a forward gesture during the reel skips to Cast, a backward one returns
  to hero. Every transition forces a reflow before animating (prevents an
  arrival "jump"). Only the centred panel is clickable.
- Tuning lives in the constants at the top of `initJourney` (`GRAB`, `ZOOM_FROM`,
  `AUTO_ZOOM`, `AUTO_DUR`, `EASE_IN`, `SLOW_TO`, `DWELL_SENTENCE`, `DWELL_REST`, …).
- Full design + rationale: `docs/superpowers/specs/2026-06-24-follow-finger-navigation-design.md`.

### Per-panel data attributes (how the engine knows what to do)

- `data-panel` — marks a frame.
- `data-stop` — marks one of the 4 manual stops (hero, slovo-o-slově, credits,
  footer). Panels without it are reel frames the autoplay plays through.
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
