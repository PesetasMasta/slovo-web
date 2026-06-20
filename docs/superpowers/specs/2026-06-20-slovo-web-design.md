# S.L.O.V.O. — Production Site Design

**Date:** 2026-06-20
**Status:** Approved (design), mockups pending review

## Purpose

A standing online presentation for the alternative theatre production **S.L.O.V.O.**
(*"a play of words we've robbed of meaning"*), written and directed by Alisa
Gertsovskaya. The site exists to say "this piece exists — come experience it,"
with a ticket link present but not the central purpose. Blend of promotion (A)
and artistic portfolio/presentation (C).

The production's theme is the emptiness of words and the gradual loss of their
meaning. The site should make a visitor *feel* that idea, quietly, without
sacrificing readability or the photography.

## Audience

Prague theatre-goers, festival/press, and the creators' own circle. **Czech-only**
text (the original language of the piece). English was tried during mockup and felt
like noise against the photography; a language toggle (EN, others) may be added
later but is out of scope for v1.

## Aesthetic

- Single slow vertical scroll, like reading a poem / watching the play unfold.
  The scroll *is* the dramaturgy.
- **Photography leads.** Photos are standalone, full-bleed content in every
  section — not decoration. Full-screen photo "plates" sit between the text
  sections; the piece and footer are built around images too.
- Black background, white type, full-bleed black-and-white photography.
- No nav bar, no menu, no clutter. Black space used as a material, not a flaw.
- Type: high-contrast serif for the large words (echoing the "S.L.O.V.O." poster
  lettering); plain sans for body and credits.
- Restraint level **B (quietly expressive)**: mostly calm and legible, with two
  earned conceptual moments.

## Source material

- **The acronym is the spine.** S.L.O.V.O. (Czech for "word") is itself built from
  five words: **S**ex · **L**áska · **O**samělost · **V**ina · **O**čista
  (sex · love · loneliness · guilt · catharsis). The word is made of words. The
  five-word core is presented as a **page-turning "book"** (see Interaction).
- **Script** (Czech `Slovo - scénář` and English `The Word`). The play's prologue
  splits one thought word-by-word across five characters. Used for the Prologue
  assembly moment. Per-chapter script quotes were tried and **dropped** — the
  words alone, with photography, carry the book.
  - Prologue fragment: *"Slovo prostě je. Ale nebylo tu vždy. Co tedy bylo, když
    slovo nebylo? Byly smysly. Kde jsou teď? Zůstala jen slova."* /
    *"The word just is. But it hadn't always been there. What existed before
    words? There were meanings. Where are they now? Only words are left."*
  - Characters: Chtivý muž, Krásná žena, Nezkušený mladík, Čistá holčička,
    Tvor bezpohlavní a bezejmenný.
- **Photos:** ~115 polished B&W shots in `fotky/IG post` (+ ~280 more). Mostly
  portrait. Curated subset prepared web-sized into `images/`.

## Page structure (top to bottom)

1. **Opening** — full screen. Eyes photo (poster image), "S.L.O.V.O.", tagline
   *"a play of words we've robbed of meaning."* Faint scroll cue.
2. **Prologue** — the word-by-word fragment assembling as you scroll. First place
   the concept bites.
3. **The book** — the five words as a page-turning sequence (S·L·O·V·O). Each page:
   full-bleed photo + the word + its highlighted letter. An acronym indicator at
   the top tracks which letter/word is active. No script quotes.
4. **The piece** — 2–3 sentences on what it is (CZ + EN). Date, venue, "in Czech
   with English subtitles."
5. **Cast & creators** — Alisa Gertsovskaya (written & directed) and the six
   performers (Antonina Toregeldi, Michal Hauf, Barbora Mečířova, Jan Jašek,
   Anna Dyntarová, Simon Yakimov). Quiet, typographic.
6. **Tickets / footer** — booking link (from the poster QR), venue address
   (Divadlo Na prádle, Besední 3, Prague), Instagram link. Minimal.

## Interaction: the book (listování)

The five-word core is a page-turning book embedded in the scrolling page:

- **Desktop:** the book section is pinned (sticky) while scrolling drives a gradual
  3D page rotation — one full-bleed page turns around its left spine to reveal the
  next. Scroll = leafing through.
- **Mobile:** same scroll/swipe-driven turn (touch-scroll flips the pages). A true
  discrete swipe-snap gesture can be added later if wanted.
- An acronym indicator (S·L·O·V·O) at the top highlights the active letter/word.

## Expressive moments

1. **Prologue assembly** — words fade in one at a time on scroll; the sentence
   comes together, then the closing line *"Zůstala jen slova"* lingers as the rest
   dims. Meaning arriving, then thinning out.
2. **The emptied word** — on the **OSAMĚLOST** page, the word repeats and softly
   blurs/fades apart until illegible — *semantic satiation*. Used once.

All motion respects `prefers-reduced-motion`: the book falls back to a static
vertical stack of full-screen pages; assembly/satiation/reveals render static.

## Tech

- Single static page: `index.html` + one CSS file + minimal vanilla JS
  (IntersectionObserver / scroll for the two moments). No framework, no build step.
- Works opened directly from disk and when served.
- Git repo prepared for **GitHub Pages** hosting.
- Photos in `images/`; large/HEIC originals converted to web-sized JPG/WebP for
  speed.

## Out of scope (YAGNI)

- CMS / admin, multi-page routing, full CS/EN toggle (Czech is woven in, not a
  parallel translation), e-commerce (ticketing is an external link), analytics.

## Open items

- Real booking URL and Instagram handle (placeholders until provided).
- Final photo selection and per-chapter assignment.
- Exact English production blurb (2–3 sentences) — draft from script, confirm
  with creators.
