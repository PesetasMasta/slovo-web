# Follow-Finger Navigation + Autoplay Reel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scroll-driven zoom with a gesture-driven journey — follow-finger slide+reveal between 4 manual stops, with the five words playing as an autoplay zoom-through reel (slow zoom-in that accelerates), hold-to-pause.

**Architecture:** The page becomes a fixed full-viewport stage; JS owns all gestures (the native scroll timeline is removed). `script.js` `initZoom()` is replaced by `initJourney()`, a state machine with two transition styles — manual `go()` (slide+reveal) and autoplay `autoZoom()` (zoom-through) — plus a dwell scheduler with a slow pre-zoom and pause/resume. The cast viewer and footer code are unchanged.

**Tech Stack:** Vanilla HTML/CSS/JS, no framework, no build step, no dependencies. No test framework — verification is `node --check script.js` plus manual checks in a threaded local server.

## Global Constraints

- **No dependencies, no build step, no framework.** Three files only: `index.html`, `styles.css`, `script.js`.
- **All asset paths stay relative** (`images/...`), never root-absolute — the site is served from the `/slovo-web/` Pages subpath.
- **Czech-only** user-facing copy. No emoji/glyphs as status.
- **Respect `prefers-reduced-motion`**: the journey engine must early-return and the page must fall back to the existing static, scrollable vertical stack.
- **Only the centred panel is interactive** (`pointer-events: auto`); all others `none`, so cast names / the Sledovat link never get click-stolen.
- **Run locally with a threaded server** (single-threaded `http.server` drops images):
  ```
  python3 -c "from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler; ThreadingHTTPServer(('127.0.0.1',8753), SimpleHTTPRequestHandler).serve_forever()"
  ```
  then open http://localhost:8753/
- **Syntax check:** `node --check script.js` must pass before every commit.
- Final tuning constants (verbatim): `GRAB 0.96`, `ZOOM_FROM 0.82`, `COMMIT_FRAC 0.30`, `THRESHOLD 0.42`, `FLICK_V 0.6`, manual `DUR 440`, manual ease `cubic-bezier(.22,.61,.36,1)`, `AUTO_FROM 0.82`, `AUTO_ZOOM 6.0`, `AUTO_DUR 820`, `EASE_IN cubic-bezier(.55,.085,.68,.53)`, `SLOW_TO 1.08`, `DWELL_SENTENCE 5000`, `DWELL_REST 1200`, `ASSEMBLE` step `130` (existing `runAssemble`), wheel trigger `max(48px, 0.10*vh)`, wheel cooldown `560`, pause min-remaining `180`.

## Panel → kind mapping (locked)

DOM order in `.zoom-stage` (`[data-panel]` index → role):

| # | Selector | Role |
|---|---|---|
| 0 | `.zoom-panel--hero` | **stop** — Hero |
| 1 | `.zoom-panel` (photo2) | reel — opening photo |
| 2 | `.zoom-panel--prologue` `[data-assemble]` | reel — **sentence** (assembles) |
| 3 | `[data-acronym="0"]` Sex | reel |
| 4 | `[data-acronym="1"]` Láska | reel |
| 5 | `[data-acronym="2"]` Osamělost | reel |
| 6 | `[data-acronym="3"]` Vina | reel |
| 7 | `.zoom-panel--void` `[data-acronym="4"]` `[data-satiation]` Očista | reel |
| 8 | `.zoom-panel--piece` | **stop** — Word (Slovo o slově) |
| 9 | `.zoom-panel--credits` | **stop** — Cast (Herci) |
| 10 | `.zoom-panel--foot` | **stop** — Follow (Sledovat) |

So `STOPS = [0, 8, 9, 10]`, `REEL_END = 8` (reel lands here), `CAST_STOP = 9` (skip-ahead target).

## File Structure

- **`index.html`** — add `data-stop` to the 4 stop panels; drop the now-unused `data-dwell`. No structural change otherwise.
- **`styles.css`** — convert `.zoom-wrap`/`.zoom-pin` from tall-scroll+sticky to a fixed full-viewport stage; add `touch-action: none`; keep (and slightly extend) the reduced-motion fallback so it stays a scrollable static stack.
- **`script.js`** — replace the `initZoom` region (constants at the top of that block through the `forEach(initZoom)` call) with `initJourney`. Keep `reduceMotion`, `clamp`, `runAssemble`, the cast viewer, and the footer code untouched.
- **`CLAUDE.md`** — update the Architecture + per-panel-attributes sections to describe the new model.

---

### Task 1: Layout — fixed stage + stop markers

**Files:**
- Modify: `index.html` (4 panel tags)
- Modify: `styles.css:117-121`, `styles.css:296-299`, reduced-motion block `styles.css:302-317`

**Interfaces:**
- Produces: `[data-stop]` on panels 0/8/9/10 (consumed by `initJourney` in Task 2); a fixed `.zoom-pin` stage with `touch-action: none`.

- [ ] **Step 1: Mark the four stop panels in `index.html`**

Add `data-stop` to each stop panel and remove the obsolete `data-dwell`:

Hero (line ~26):
```html
<article class="zoom-panel zoom-panel--hero" data-panel data-stop>
```
Piece / Word (line ~96):
```html
<article class="zoom-panel zoom-panel--piece" data-panel data-stop>
```
Credits / Cast (line ~109):
```html
<article class="zoom-panel zoom-panel--credits" data-panel data-stop>
```
Foot / Follow (line ~138):
```html
<article class="zoom-panel zoom-panel--foot" data-panel data-stop>
```

- [ ] **Step 2: Convert the stage to a fixed full-viewport pin in `styles.css`**

Replace lines 117-121:
```css
.zoom-wrap { position: relative; height: 900vh; }
.zoom-pin {
  position: sticky; top: 0; height: 100dvh; overflow: hidden;
  background: var(--ink);
}
```
with:
```css
.zoom-wrap { position: relative; height: 100dvh; }
.zoom-pin {
  position: fixed; inset: 0; height: 100dvh; overflow: hidden;
  background: var(--ink); touch-action: none;
}
```

- [ ] **Step 3: Drop the tall-scroll responsive override**

In the `@media (max-width: 720px)` block (lines ~296-299), remove the `.zoom-wrap { height: 780vh; }` rule (keep the `.zoom-letter` rule):
```css
@media (max-width: 720px) {
  .zoom-letter { font-size: 64vh; }
}
```

- [ ] **Step 4: Keep reduced-motion a scrollable static stack**

In the `@media (prefers-reduced-motion: reduce)` block, ensure the pin is static and scrollable. Replace the `.zoom-pin` line (line ~309) with:
```css
  .zoom-pin { position: static !important; height: auto !important; touch-action: auto !important; }
```
(The existing `.zoom-wrap { height: auto !important; }` and relative-panel rules stay as-is.)

- [ ] **Step 5: Verify in the browser (engine not rewritten yet)**

Run the threaded server and open http://localhost:8753/
Expected: the **Hero fills the viewport**, there is **no scrollbar / no tall page**, and the page does not scroll. (Navigation does nothing yet — the old engine no longer has a scroll range. That's expected for this task.)
Then toggle OS "Reduce motion" on and reload: the panels become a **normal vertical scrollable stack**.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css
git commit -m "Layout: fixed full-viewport stage + data-stop markers"
```

---

### Task 2: Replace the engine with `initJourney`

**Files:**
- Modify: `script.js` — replace the region from the `/* ---- scroll-driven zoom ... */` comment and its constants (lines ~16-19) through `document.querySelectorAll("[data-zoom-wrap]").forEach(initZoom);` (line ~104). Keep `reduceMotion`, `clamp`, `runAssemble` (lines 1-14) and everything from the cast-viewer comment onward unchanged.

**Interfaces:**
- Consumes: `clamp(v,a,b)` and `runAssemble(panel)` (already defined above the replaced region); `[data-stop]` from Task 1; existing `[data-panel]`, `[data-acronym]`, `[data-assemble]`, `[data-satiation]`, `.acronym [data-letter]`.
- Produces: `initJourney(wrap)` and the `forEach(initJourney)` call.

- [ ] **Step 1: Replace the engine block**

Delete lines ~16-104 (the `ZOOM_IN/ZOOM_FROM/FADE_IN` constants, all of `initZoom`, and the `forEach(initZoom)` line) and paste this in their place:

```javascript
/* ---- gesture-driven journey: follow-finger stops + autoplay reel -------
   The page is a fixed full-viewport stage (no scroll timeline). You move
   between 4 manual STOPS (hero, "slovo o slově", herci, sledovat) with a
   follow-finger slide+reveal. Between hero and the word stop the opening
   photo, prologue and the five letters AUTOPLAY as a zoom-through reel: a
   slow zoom-in that accelerates into each page change. Hold to pause. */
const GRAB = 0.96;            // subtle zoom-out "grab" on touch (manual nav)
const ZOOM_FROM = 0.82;       // manual arriving panel start scale
const COMMIT_FRAC = 0.30;     // commit distance = 30% of viewport height
const THRESHOLD = 0.42;       // release past this fraction of commit -> commit
const FLICK_V = 0.6;          // px/ms flick velocity that commits regardless
const DUR = 440;              // manual transition duration (ms)
const MANUAL_EASE = "cubic-bezier(.22,.61,.36,1)";
const AUTO_FROM = 0.82;       // autoplay arriving start scale
const AUTO_ZOOM = 6.0;        // autoplay leaving zoom-toward-viewer target
const AUTO_DUR = 820;         // autoplay page-change duration (ms)
const EASE_IN = "cubic-bezier(.55,.085,.68,.53)";  // slow -> fast
const SLOW_TO = 1.08;         // gentle pre-zoom target reached across the dwell
const DWELL_SENTENCE = 5000;  // hold on the prologue/sentence frame
const DWELL_REST = 1200;      // hold on every other reel frame
const WHEEL_COOLDOWN = 560;   // ms after a wheel step before another can fire

function initJourney(wrap) {
  const stage = wrap.querySelector("[data-zoom]");
  if (!stage || reduceMotion) return;

  const panels = [...stage.querySelectorAll("[data-panel]")];
  const acronymNav = wrap.querySelector(".acronym");
  const letters = [...wrap.querySelectorAll(".acronym [data-letter]")];
  const satiation = stage.querySelector("[data-satiation]");
  const satiationPanel = panels.findIndex((p) => satiation && p.contains(satiation));

  const STOPS = panels.map((p, i) => ("stop" in p.dataset ? i : -1)).filter((i) => i >= 0);
  const REEL_END = STOPS[1];     // the word stop the reel lands on
  const CAST_STOP = STOPS[2];    // skip-ahead target while the reel plays
  const isSentence = (i) => "assemble" in panels[i].dataset;

  const vh = () => window.innerHeight;
  const commitDist = () => vh() * COMMIT_FRAC;
  const getScale = (el) => { try { return new DOMMatrix(getComputedStyle(el).transform).a || 1; } catch (e) { return 1; } };

  let cur = 0, busy = false, autoplay = false, autoTimer = null, autoWait = 0, autoStart = 0, paused = false;

  const hide = (el) => { el.style.transition = "none"; el.style.opacity = "0"; el.style.visibility = "hidden"; el.style.zIndex = "1"; el.style.transform = "scale(1)"; el.style.pointerEvents = "none"; };

  function settle() {
    panels.forEach((el, i) => {
      if (i === cur) {
        el.style.transition = "none"; el.style.transform = "scale(1)"; el.style.opacity = "1";
        el.style.visibility = "visible"; el.style.zIndex = "20"; el.style.pointerEvents = "auto";
      } else hide(el);
    });
    paintChrome();
  }

  function paintChrome() {
    const ai = panels[cur].dataset.acronym;
    letters.forEach((l, i) => l.classList.toggle("on", String(i) === ai));
    if (acronymNav) acronymNav.style.opacity = cur === 0 ? "0" : "1";
    if (satiation) satiation.classList.toggle("go", cur === satiationPanel);
  }

  const reflow = () => { void stage.offsetWidth; };

  const nextStop = () => { const i = STOPS.indexOf(cur); return (i >= 0 && i < STOPS.length - 1) ? STOPS[i + 1] : -1; };
  const prevStop = () => { const i = STOPS.indexOf(cur); return i > 0 ? STOPS[i - 1] : -1; };
  const arriveTarget = () => (autoplay ? CAST_STOP : cur === 0 ? 1 : nextStop());
  const backTarget = () => (autoplay ? 0 : prevStop());

  // live follow-finger frame during a manual drag/scroll
  function preview(rawDy, grabbed) {
    const h = vh();
    panels.forEach(hide);
    if (rawDy < 0) {
      const t = arriveTarget(); if (t < 0) { settle(); return; }
      const p = clamp(-rawDy / commitDist(), 0, 1), leave = panels[cur], arr = panels[t];
      leave.style.visibility = "visible"; leave.style.zIndex = "20";
      leave.style.transform = `translateY(${rawDy}px) scale(${grabbed ? GRAB : 1})`; leave.style.opacity = (1 - p * 0.6).toFixed(3);
      arr.style.visibility = "visible"; arr.style.zIndex = "10";
      arr.style.transform = `scale(${(ZOOM_FROM + (1 - ZOOM_FROM) * p).toFixed(3)})`; arr.style.opacity = p.toFixed(3);
    } else if (rawDy > 0) {
      const t = backTarget(); if (t < 0) { settle(); return; }
      const p = clamp(rawDy / commitDist(), 0, 1), incoming = panels[t], leaving = panels[cur];
      leaving.style.visibility = "visible"; leaving.style.zIndex = "10";
      leaving.style.transform = `scale(${(1 - (1 - ZOOM_FROM) * p).toFixed(3)})`; leaving.style.opacity = (1 - p * 0.8).toFixed(3);
      incoming.style.visibility = "visible"; incoming.style.zIndex = "20";
      incoming.style.transform = `translateY(${Math.min(rawDy - h, 0)}px) scale(${grabbed ? GRAB : 1})`; incoming.style.opacity = "1";
    } else settle();
  }

  // MANUAL transition: slide + reveal (forward or backward)
  function go(target) {
    if (busy || target === cur || target < 0) return;
    busy = true; const h = vh(), dir = target > cur ? -1 : 1;
    const ease = `transform ${DUR}ms ${MANUAL_EASE}, opacity ${DUR}ms ease`;
    panels.forEach((el, i) => { if (i !== cur && i !== target) hide(el); });
    if (dir < 0) {
      const leave = panels[cur], arr = panels[target];
      leave.style.transition = "none"; leave.style.zIndex = "20"; leave.style.visibility = "visible"; leave.style.transform = "translateY(0) scale(1)"; leave.style.opacity = "1"; leave.style.pointerEvents = "none";
      arr.style.transition = "none"; arr.style.zIndex = "10"; arr.style.visibility = "visible"; arr.style.transform = `scale(${ZOOM_FROM})`; arr.style.opacity = "0"; arr.style.pointerEvents = "none";
      reflow();
      leave.style.transition = ease; arr.style.transition = ease;
      leave.style.transform = `translateY(${-h * 1.05}px) scale(${GRAB})`; leave.style.opacity = "0";
      arr.style.transform = "scale(1)"; arr.style.opacity = "1";
    } else {
      const incoming = panels[target], behind = panels[cur];
      incoming.style.transition = "none"; incoming.style.zIndex = "20"; incoming.style.visibility = "visible"; incoming.style.transform = `translateY(${-h}px) scale(1)`; incoming.style.opacity = "1"; incoming.style.pointerEvents = "none";
      behind.style.transition = "none"; behind.style.zIndex = "10"; behind.style.visibility = "visible"; behind.style.transform = "scale(1)"; behind.style.opacity = "1"; behind.style.pointerEvents = "none";
      reflow();
      incoming.style.transition = ease; behind.style.transition = ease;
      incoming.style.transform = "translateY(0) scale(1)"; behind.style.transform = `scale(${ZOOM_FROM})`; behind.style.opacity = "0";
    }
    setTimeout(() => { cur = target; settle(); busy = false; onLand(); }, DUR);
  }

  // AUTOPLAY page change: continue from the slow pre-zoom and ACCELERATE
  function autoZoom(target) {
    if (busy || target === cur) return; busy = true;
    const leave = panels[cur], arr = panels[target];
    panels.forEach((el, i) => { if (i !== cur && i !== target) hide(el); });
    arr.style.transition = "none"; arr.style.zIndex = "10"; arr.style.visibility = "visible"; arr.style.transform = `scale(${AUTO_FROM})`; arr.style.opacity = "0"; arr.style.pointerEvents = "none";
    reflow();
    leave.style.zIndex = "20"; leave.style.pointerEvents = "none";
    leave.style.transition = `transform ${AUTO_DUR}ms ${EASE_IN}, opacity ${Math.round(AUTO_DUR * 0.6)}ms ${EASE_IN}`;
    leave.style.transform = `scale(${AUTO_ZOOM})`; leave.style.opacity = "0";
    arr.style.transition = `transform ${AUTO_DUR}ms ${EASE_IN}, opacity ${Math.round(AUTO_DUR * 0.75)}ms ease`;
    arr.style.transform = "scale(1)"; arr.style.opacity = "1";
    setTimeout(() => { cur = target; settle(); busy = false; onLand(); }, AUTO_DUR);
  }

  function snapBack() {
    busy = true; const ease = `transform ${DUR}ms ${MANUAL_EASE}, opacity ${DUR}ms ease`;
    panels.forEach((el, i) => { el.style.transition = i === cur ? ease : "none"; });
    reflow(); panels[cur].style.transform = "scale(1)"; panels[cur].style.opacity = "1";
    setTimeout(() => { settle(); busy = false; }, DUR);
  }

  // gentle pre-zoom that begins the moment a reel frame lands; ends with autoZoom
  function beginDwell(fromScale) {
    const el = panels[cur];
    el.style.transition = "none"; el.style.transform = `scale(${fromScale})`; reflow();
    el.style.transition = `transform ${autoWait}ms linear`; el.style.transform = `scale(${SLOW_TO})`;
    autoStart = performance.now();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function tick() {
      if (!autoplay || paused) return;
      if (busy) { autoTimer = setTimeout(tick, 80); return; }
      autoZoom(cur + 1);
    }, autoWait);
  }

  function onLand() { if (isSentence(cur)) runAssemble(panels[cur]); scheduleNext(); }

  function scheduleNext() {
    if (!autoplay) return;
    if (cur >= REEL_END) { autoplay = false; return; }
    autoWait = isSentence(cur) ? DWELL_SENTENCE : DWELL_REST;
    beginDwell(1);
  }

  function pauseAuto() {
    if (!autoplay || paused || cur >= REEL_END) return;
    paused = true;
    const el = panels[cur], sc = getScale(el);
    el.style.transition = "none"; el.style.transform = `scale(${sc})`;
    autoWait = Math.max(180, autoWait - (performance.now() - autoStart));
    clearTimeout(autoTimer);
  }

  function resumeAuto() {
    if (!autoplay || !paused) return;
    paused = false; beginDwell(getScale(panels[cur]));
  }

  function startReel() { autoplay = true; paused = false; go(1); }
  function cancelAuto() { if (autoplay) { autoplay = false; paused = false; clearTimeout(autoTimer); } }

  // pointer drag (touch + mouse): follow-finger, grab, hold-to-pause
  let down = false, sY = 0, lY = 0, lT = 0, vel = 0, dy = 0, moved = false;
  stage.addEventListener("pointerdown", (e) => {
    if (busy) return;
    down = true; moved = false; sY = lY = e.clientY; lT = performance.now(); dy = 0; vel = 0;
    stage.setPointerCapture(e.pointerId);
    if (autoplay) pauseAuto(); else { clearTimeout(autoTimer); preview(0, true); }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!down) return;
    const now = performance.now(); dy = e.clientY - sY; if (now > lT) vel = (e.clientY - lY) / (now - lT);
    lY = e.clientY; lT = now;
    if (Math.abs(dy) > 8) moved = true;
    if (moved) preview(dy, true);
  });
  function endDrag() {
    if (!down) return; down = false;
    const fwd = dy < 0, p = clamp(Math.abs(dy) / commitDist(), 0, 1), flick = Math.abs(vel) > FLICK_V;
    if (moved && (p >= THRESHOLD || flick)) {
      if (fwd) {
        const t = arriveTarget(); if (t < 0) { if (paused) resumeAuto(); else snapBack(); return; }
        if (cur === 0 && t === 1) startReel(); else { cancelAuto(); go(t); }
      } else {
        const t = backTarget(); if (t < 0) { if (paused) resumeAuto(); else snapBack(); return; }
        cancelAuto(); go(t);
      }
    } else if (paused) {
      if (moved) { snapBack(); paused = false; scheduleNext(); } else resumeAuto();
    } else { snapBack(); scheduleNext(); }
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // wheel / trackpad: discrete one-step-per-gesture, never stuck, no grab
  let wAccum = 0, wTimer = null, wCool = false;
  const wTrig = () => Math.max(48, vh() * 0.10);
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (busy || wCool) return;
    clearTimeout(autoTimer); wAccum += -e.deltaY;
    if (wAccum < 0 && arriveTarget() < 0) { wAccum = 0; return; }
    if (wAccum > 0 && backTarget() < 0) { wAccum = 0; return; }
    preview(wAccum, false);
    if (Math.abs(wAccum) >= wTrig()) {
      const fwd = wAccum < 0; wAccum = 0; clearTimeout(wTimer);
      if (fwd) { const t = arriveTarget(); if (cur === 0 && t === 1) startReel(); else { cancelAuto(); go(t); } }
      else { const t = backTarget(); cancelAuto(); go(t); }
      wCool = true; setTimeout(() => { wCool = false; }, WHEEL_COOLDOWN);
    } else {
      clearTimeout(wTimer);
      wTimer = setTimeout(() => { if (!busy) { snapBack(); scheduleNext(); wAccum = 0; } }, 170);
    }
  }, { passive: false });

  window.addEventListener("resize", () => { if (!busy && !paused) settle(); });
  settle();
}

document.querySelectorAll("[data-zoom-wrap]").forEach(initJourney);
```

- [ ] **Step 2: Syntax check**

Run: `node --check script.js`
Expected: no output (exit 0). If it errors, fix the paste before continuing.

- [ ] **Step 3: Manual check — manual navigation + clicks**

Serve and open http://localhost:8753/. With a mouse:
- Drag **up** on the Hero (or scroll down once): the reel starts (next step verifies it); for now confirm the gesture is recognised and the page advances.
- After the reel lands on the **Word**, drag up → **Cast (Herci)**; drag down → back to **Word**; from Cast drag up → **Follow (Sledovat)**.
- On **Cast**, click a cast name → the portrait viewer opens (proves `pointer-events` on the centred panel).
- On **Follow**, the **Sledovat** link is clickable.
Expected: each manual move is a slide where the leaving page follows the cursor and fades while the next zooms in from 0.82; clicks work.

- [ ] **Step 4: Manual check — autoplay reel**

Reload. From Hero, swipe/scroll up once.
Expected: the reel **autoplays** — opening photo → prologue (assembles word-by-word, holds ~5s) → S → L → O → V → Očista (each ~1.2s) → lands on the **Word** and stops. During each frame a **slow zoom-in** runs and then **accelerates** into the page change (current rushes toward viewer + fades, next zooms in + fades). The top **S·L·O·V·O** indicator lights the active letter on each word frame; the Očista frame plays its dissolve.

- [ ] **Step 5: Manual check — skip, back, scroll, no-jump**

- Mid-reel, swipe/scroll **up** → jumps to **Cast** (reel abandoned). Reload; mid-reel swipe **down** → back to **Hero**.
- Scroll with a mouse wheel and a trackpad both directions: every gesture advances exactly one step and never gets **stuck** mid-zoom.
- Watch closely on arrival at each frame: there is **no jump/jolt** (the reflow fix).

- [ ] **Step 6: Manual check — pause on hold**

During the reel, **press and hold** (mouse-down or touch) on the stage.
Expected: the reel **pauses** (slow zoom freezes); **release** without dragging → it **resumes** from where it paused. A press that turns into a drag past the threshold navigates instead.

- [ ] **Step 7: Manual check — reduced motion**

Enable OS "Reduce motion", reload.
Expected: `initJourney` returns early; the page is the **static, scrollable vertical stack** of panels (no autoplay, no zoom).

- [ ] **Step 8: Commit**

```bash
git add script.js
git commit -m "Engine: replace scroll-zoom with gesture-driven journey + autoplay reel"
```

---

### Task 3: Update CLAUDE.md to the new model

**Files:**
- Modify: `CLAUDE.md` (Architecture section + per-panel data-attributes list)

**Interfaces:**
- Consumes: nothing. Documentation only.

- [ ] **Step 1: Rewrite the Architecture intro**

Replace the paragraph that begins "The whole page is **one continuous, scroll-driven zoom**" and the bullet beginning "One pinned section `.zoom-wrap`" with:

```markdown
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
```

- [ ] **Step 2: Update the per-panel data-attributes list**

Replace the `data-dwell` bullet with a `data-stop` bullet:

```markdown
- `data-stop` — marks one of the 4 manual stops (hero, slovo-o-slově, credits,
  footer). Panels without it are reel frames the autoplay plays through.
```
Keep the `data-acronym`, `data-assemble`, and `data-satiation` bullets (still used:
`data-assemble` now also marks the 5-second "sentence" dwell; `data-acronym` lights
the top indicator on each word frame; `data-satiation` plays the Očista dissolve).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: describe gesture-driven journey in CLAUDE.md"
```

---

## Notes / known tuning knobs (not blockers)

- **Očista dwell:** the satiation dissolve runs on a `DWELL_REST` (1.2s) frame; if it
  feels clipped, give that panel a longer dedicated dwell (a one-line branch in
  `scheduleNext`). Out of scope unless it reads poorly.
- **Prologue replay:** `runAssemble` guards with `dataset.assembled`, so re-entering
  the reel shows the prologue already assembled (acceptable; matches current code).
- **Landscape overflow** (backlog, medium): with JS owning vertical gestures, a stop
  taller than the viewport can't scroll. Each stop is designed to fit; if the credits
  overflow on small landscape phones, allow internal scroll on that panel and only
  treat a drag as navigation at its scroll boundary. Tracked separately.

## Self-Review

- **Spec coverage:** structure (4 stops + reel) → Task 1 markers + Task 2 `STOPS`/`arriveTarget`; manual slide+reveal → `go()`/`preview()`; scroll discrete/no-grab → wheel handler; autoplay zoom-through + slow-zoom-accelerate → `autoZoom()`/`beginDwell()`; timing 5s/1.2s → `DWELL_*`; skip-to-Cast / back-to-Hero / enter-from-Hero → `arriveTarget`/`backTarget`/`startReel`; pause-on-hold → `pauseAuto`/`resumeAuto`; reflow anti-jump → `reflow()` in every transition; pointer-events / reduced-motion / acronym / assemble / satiation → `settle`/`paintChrome`/guard. All covered.
- **Placeholders:** none — full code in Task 2, exact edits in Tasks 1 & 3.
- **Type consistency:** `initJourney`, `go`, `autoZoom`, `preview`, `settle`, `paintChrome`, `beginDwell`, `scheduleNext`, `pauseAuto`, `resumeAuto`, `arriveTarget`, `backTarget`, `STOPS`/`REEL_END`/`CAST_STOP` used consistently; constants match the spec's Global Constraints.
