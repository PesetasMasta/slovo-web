# S.L.O.V.O. — Follow-Finger Navigation + Autoplay Reel

**Date:** 2026-06-24
**Status:** Designed (validated against an interactive prototype); ready for implementation plan.
**Supersedes** the scroll-driven zoom navigation described in
`2026-06-20-slovo-web-design.md` (the panels and their content stay; only how you
*move through them* changes).

## Goal

Replace the single, continuous **scroll-driven** zoom with a **gesture-driven
journey**. Two distinct motions:

1. **Manual navigation** between a small set of stops — the page **follows your
   finger** and slides away to reveal the next (a "card off the deck").
2. **Autoplay reel** — the five words play themselves as a short film, using the
   site's existing **zoom-through** look (current page zooms toward the viewer and
   fades, next zooms in), now beginning as a slow zoom-in that **accelerates** into
   the page change.

The native scrollbar/scroll-timeline is removed entirely; the viewport is fixed and
JS owns the gesture.

## Structure: 4 manual stops + 1 autoplay reel

The 11 panels collapse, from the visitor's point of view, into **four stops** they
swipe between, with the letters playing automatically in between:

```
HERO ─swipe─▶ ⟨ autoplay reel ⟩ ─lands on─▶ WORD ─swipe─▶ CAST ─swipe─▶ FOLLOW
                │
                ├ opening photo        (reel)
                ├ prologue / sentence  (reel, word-by-word assemble)
                ├ S — Sex              (reel)
                ├ L — Láska            (reel)
                ├ O — Osamělost        (reel)
                ├ V — Vina             (reel)
                └ O — Očista           (reel)
```

- **Manual stops** (you can rest here): **Hero**, **Word** (Slovo o slově),
  **Cast** (Herci), **Follow** (Sledovat).
- **Reel frames** (autoplay past them, never rest): opening photo, prologue, and the
  five word panels. *Letters + Word = one slide* — swiping once from Hero plays the
  whole reel and lands on the Word.

Every panel keeps its existing content, photography, and copy. Only the navigation
engine changes.

## Two motion modes

### A. Manual navigation — follow-finger slide + reveal

Used for: Hero→reel entry, reel→Cast skip, reel→Hero back, and Word↔Cast↔Follow.

- **Touch / pointer drag:** on `pointerdown` the current page does a **subtle
  zoom-out "grab"** (scale `0.96`) so it feels grabbed. The page then **follows the
  finger 1:1**.
  - **Forward** (drag up): leaving page translates up with the finger and fades; the
    arriving page sits behind, opaque, zooming in `0.82 → 1` and fading in.
  - **Backward** (drag down): mirrored — the previous page slides down from the top
    following the finger; the current page un-zooms (`1 → 0.82`) behind it.
  - **Release:** past **42%** of the commit distance (commit distance = 30% of
    viewport height) **or** a fast flick (`|velocity| > 0.6 px/ms`) → commit and
    animate the rest; otherwise **snap back**.
- **Scroll / wheel / trackpad:** drives the *same* transitions but with **no
  zoom-out grab** (there's no touch). It is **discrete and never gets stuck**: any
  real scroll gesture (≥ `max(48px, 10% vh)` of accumulated delta — even one mouse
  notch) commits exactly one transition. A **560 ms cooldown** stops trackpad
  inertia from skipping several panels. (This fixes the old failure mode where a
  small scroll fell short of the threshold and snapped back, feeling stuck.)

### B. Autoplay reel — slow zoom-in that accelerates (zoom-through)

Used for: advancing between reel frames while autoplay runs.

- On landing on a reel frame, a **slow zoom-in starts immediately**: scale
  `1 → 1.08`, linear, spread across the frame's dwell.
- When the dwell ends, the zoom **accelerates** (continuing from wherever the slow
  zoom reached, ease-in `cubic-bezier(.55,.085,.68,.53)`, ~`820 ms`): the current
  page zooms toward the viewer (`→ scale 6`) and fades out, while the next page
  zooms in (`0.82 → 1`) and fades in. It reads as **one continuous push-in that
  speeds up**, not "static, then move."
- **Dwell timing:** the **sentence/prologue** page holds **5 s** (assembles
  word-by-word at 150 ms/word, then rests); **every other** reel frame ~**1.2 s**.

### Entering, skipping, and finishing the reel

- **Enter:** swiping forward from Hero is a manual slide into the opening frame;
  autoplay (zoom-through) then takes over for the rest.
- **Skip ahead:** a forward swipe/scroll *during* the reel cancels autoplay and goes
  to **Cast** (manual slide). The Word is the payoff only if you let the reel finish.
- **Back:** a backward swipe/scroll *during* the reel cancels autoplay and returns to
  **Hero**.
- **Finish:** when the reel reaches the Word it stops; from there navigation is
  ordinary stop-to-stop (Word ↔ Cast ↔ Follow, Word → back → Hero).

## Tuning constants (final, from the approved prototype)

| Constant | Value | Meaning |
|---|---|---|
| `GRAB` | `0.96` | zoom-out "grab" on touch (manual) |
| `ZOOM_FROM` | `0.82` | manual arriving page start scale |
| `COMMIT_DIST` | `0.30 * vh` | drag distance that maps to a full transition |
| `THRESHOLD` | `0.42` | release past this fraction → commit |
| `FLICK_V` | `0.6 px/ms` | flick velocity that commits regardless of distance |
| manual `DUR` | `440 ms` | manual transition duration |
| manual easing | `cubic-bezier(.22,.61,.36,1)` | ease-out (settling) |
| `AUTO_FROM` | `0.82` | autoplay arriving page start scale |
| `AUTO_ZOOM` | `6.0` | autoplay leaving page zoom-toward-viewer target |
| `AUTO_DUR` | `820 ms` | autoplay page-change (fast part) |
| `EASE_IN` | `cubic-bezier(.55,.085,.68,.53)` | slow→fast acceleration |
| `SLOW_TO` | `1.08` | how far the gentle pre-zoom pushes during dwell |
| `DWELL_SENTENCE` | `5000 ms` | hold on the sentence/prologue page |
| `DWELL_REST` | `1200 ms` | hold on every other reel frame |
| `ASSEMBLE_STEP` | `150 ms` | per-word delay in the prologue assemble |
| wheel trigger | `max(48px, 0.10*vh)` | scroll delta that commits one step |
| wheel cooldown | `560 ms` | block inertia from multi-skipping |

## Engine architecture

Rewrite `script.js` `initZoom()` into a gesture/autoplay **state machine** (working
name `initJourney`). It replaces the scroll-timeline (`segs` / `progressAt` /
`update` on `window.scroll`) with:

- A **fixed full-viewport stage** (no tall `.zoom-wrap` spacer, `body` no longer
  scrolls — `overflow:hidden`). `.zoom-pin` becomes the fixed stage.
- A **panel list** read from the DOM in order, each annotated with:
  - `kind` — `stop` or `reel` (Hero/Word/Cast/Follow are stops; the rest are reel).
  - per-frame metadata reused from existing attributes: `data-acronym`,
    `data-assemble`/sentence, `data-satiation`.
  - autoplay dwell via `data-dwell` (sentence frame = 5 s, others = 1.2 s).
- **State:** `cur` (current panel index), `busy` (transition in flight),
  `autoplay`, `autoTimer`.
- **Render primitives:**
  - `preview(dy, grabbed)` — live follow-finger frame during a manual drag/scroll.
  - `go(target)` — manual slide+reveal transition (forward or backward), used for
    any stop-to-stop / skip / back / enter move.
  - `autoZoom(target)` — autoplay zoom-through, continuing from the slow pre-zoom.
  - `startSlowZoom(dur)` — the gentle pre-zoom kicked off on each reel landing.
  - `settle()` — snap the current panel to rest, hide the others.
- **Critical detail:** every transition forces a **reflow** (`void
  stage.offsetWidth`) between setting the start state and applying the eased
  transition. Without it the browser batches the style change and the transition
  starts from the wrong frame — the visible **"jump on arrival"** bug observed in an
  earlier prototype. This is mandatory, not optional.
- **Input handlers:** `pointerdown/move/up/cancel` (drag + grab), `wheel`
  (discrete, cooldown). Both resolve a forward/back intent and call `go()`,
  `startReel()`, or skip-to-Cast.

### Preserved behaviours

- **pointer-events:** only the current/centred panel is interactive; others must not
  steal clicks. Keeps the **cast names**, the **Sledovat** button, and the
  **tickets link** clickable.
- **Tap vs drag:** a movement threshold distinguishes a tap (click-through) from a
  drag (navigation) — the same trick the cast viewer already uses.
- **Acronym indicator** (top S·L·O·V·O) keeps lighting the active letter, now driven
  by which reel frame is centred during autoplay (`data-acronym`).
- **Prologue assemble** and **Očista semantic-satiation** fire on their frame as
  today.
- **Cast viewer** (filmstrip drum) and **footer** cross-fade are unchanged.
- **`prefers-reduced-motion`:** autoplay is **disabled** and the journey falls back
  to the existing static vertical stack of panels (no zoom, no auto-advance), as the
  current site already does.

## Open item: tall content / landscape

With JS owning vertical gestures, a panel taller than the viewport can no longer be
scrolled — this collides with the known **landscape mobile cast-overflow** bug
(backlog, medium priority). Recommended rule for the plan:

- Design every stop to **fit the viewport**; the Cast stop opens the existing
  full-screen filmstrip viewer, so the stop itself need not scroll.
- If a stop's content can still overflow (small landscape phones), **allow internal
  scroll on that panel** and only treat a drag as navigation when the panel is at its
  scroll boundary (or when the drag starts from a non-scrollable region). Decide the
  exact mechanism during planning.

## Out of scope (tracked separately in the backlog)

Anagram-word → homepage transition, hero fade-in, clickable down-arrow, cast-browser
swipe-to-close, tickets link, and the haptic-feedback idea
(`navigator.vibrate()` as a progressive enhancement on gesture commit) are separate
backlog items, not part of this change.
