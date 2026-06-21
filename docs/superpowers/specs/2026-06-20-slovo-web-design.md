# S.L.O.V.O. — Production Site Design

**Date:** 2026-06-20 (spec resynced 2026-06-21 to the shipped build)
**Status:** Built; in bug-fixing / polish.

## Purpose

A standing online presentation for the alternative theatre production **S.L.O.V.O.**
by Alisa Gertsovskaya. It exists to say "this piece exists — experience it." The
theme is the emptiness of words and the gradual loss of their meaning; the site
should make a visitor *feel* that. No further performances are currently planned,
so it reads as an artistic record (no dates/tickets).

## Audience & language

Prague theatre-goers, festival/press, the creators' circle. **Czech-only** text.

## Aesthetic

Near-black ground (`--ink #0a0908`), warm off-white type (`--paper #ece8e1`),
full-bleed black-and-white photography. Display: **Bodoni Moda** (high-contrast
didone, echoes the poster). Body/labels: **Hanken Grotesk**. Film-grain overlay.
Scrollbar hidden. No nav/menu.

## The spine: the acronym

**S.L.O.V.O.** (Czech for "word") is built from five words:
**S**ex · **L**áska · **O**samělost · **V**ina · **O**čista
(sex · love · loneliness · guilt · catharsis). The word is made of words.

## Architecture: the whole page is ONE continuous scroll-zoom

A single pinned section (`.zoom-wrap` → sticky `.zoom-pin` → `.zoom-stage`) holds
**11 full-screen panels** (`.zoom-panel`). Scrolling drives a zoom-through: the
current panel rushes toward the viewer and fades while the next emerges. Engine in
`script.js` `initZoom()` (runs for every `[data-zoom-wrap]`; currently one).

Panel order:
1. **Hero** — eyes/portrait photo, "S.L.O.V.O.", tagline, bobbing ↓ cue
2. **Opening photo** — full-bleed
3. **Prologue** — "Slovo prostě je… Zůstala jen slova." assembles word-by-word
4–8. **The five words** — Sex / Láska / Osamělost / Vina / Očista. Each: photo +
   giant photo-filled first letter + the word. **Očista** is a black screen where
   the word repeats and dissolves (*semantic satiation*).
9. **Slovo o slově** — dimmed full-bleed photo + 2-sentence blurb
10. **Herci** — credits (clickable cast names → portrait viewer)
11. **Sledovat** — cross-fading photo backdrop + Instagram button

### Zoom engine details
- Scroll → `u` over a timeline of unit-length transitions. A panel's
  `data-dwell="x"` adds `x` units where it stays centred (used on Herci & Sledovat
  so their interactive content is easy to land on).
- Leaving panels fade ~1.4× faster than they zoom, to limit ghosting/smear.
- **Snap-on-stop:** when scrolling stops (~170 ms idle), it smoothly settles onto
  the nearest panel so you never rest mid-zoom.
- Acronym indicator (top) lights the active letter via per-panel `data-acronym`.
- Respects `prefers-reduced-motion`: panels fall back to a static vertical stack.

## Cast viewer (Herci)

Click a name → full-screen portrait that **fades in** (no zoom), with a gentle
**cross-fade** between people (swipe / arrows / arrow-keys, wraps around). **Swipe
up** (or Esc, or the bottom rollet handle — a pill that becomes × on hover, or
click outside) closes. Portraits lazy-load on demand and are browser-cached.
People with portraits: Alisa (režie), the 7 performers, Zuzana (umělecká
spolupráce). Missing portraits show a "portrét připravujeme" card.

## Credits (Czech)

- **Autorka a režie** — Alisa Gertsovskaya
- **Hrají** — Antonina Toregeldi · Michal Hauf · Barbora Mečířová · Jan Jašek ·
  Anna Dyntarová · Dimitriy Alekhin · Matouš Vyšata
- **Hudba** — Simon Yakimov
- **Umělecká spolupráce** — Zuzana Matušková

Date & venue intentionally omitted (no further shows). Footer CTA: **Sledovat** →
instagram.com/inscenace_slovo.

## Photos

Pool in iCloud `Documents/Slovo/fotky/` (IG post 115 + IG story + 25-11-07_rep).
Cast via a numbered contact sheet; `images/_contact-manifest.tsv` maps numbers →
originals. Web-sized files live in `images/` (`sex/osamelost/vina/slovo.jpg`,
`actors/*`, `reserve/*` for the footer cross-fade). Dimitriy's photo pulled from
Instagram (og:image). **Most performer portraits are still placeholder scene
crops — real headshots needed.**

## Tech

Single static page: `index.html` + `styles.css` + vanilla `script.js`, no build,
no dependencies. Works from disk or served. Destined for GitHub Pages.

## Out of scope / pending

- Real per-actor headshots; possible per-member Instagram links.
- Language toggle (Czech-only for now).
- GitHub Pages deploy.
