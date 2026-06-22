/* S.L.O.V.O. — scroll-driven moments (vanilla, no deps) */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ---- prologue word-by-word assembly (runs when its panel is centred) --- */
function runAssemble(panel) {
  if (panel.dataset.assembled) return;
  panel.dataset.assembled = "1";
  const words = [...panel.querySelectorAll(".prologue__text span")];
  words.forEach((w, i) => setTimeout(() => w.classList.add("lit"), i * 130));
  setTimeout(() => panel.classList.add("done"), words.length * 130 + 600);
}

/* ---- scroll-driven zoom: fall through one panel into the next ---------- */
const ZOOM_IN = 7.0;    // how hard the leaving panel rushes toward the viewer
const ZOOM_FROM = 0.2;  // arriving panel zooms IN from a bit smaller up to 1
const FADE_IN = 0.5;    // arriving panel reaches full opacity within this much of centre

function initZoom(wrap) {
  const stage = wrap.querySelector("[data-zoom]");
  if (!stage || reduceMotion) return;

  const panels = [...stage.querySelectorAll("[data-panel]")];
  const acronymNav = wrap.querySelector(".acronym");
  const letters = [...wrap.querySelectorAll(".acronym [data-letter]")];
  const satiation = stage.querySelector("[data-satiation]");
  const satiationPanel = panels.findIndex((p) => satiation && p.contains(satiation));
  const N = panels.length;

  // Scroll timeline: each transition is 1 unit; a panel's data-dwell adds units
  // where it stays centred (for reading), so the photo and prologue don't rush by.
  const segs = [];
  let cum = 0;
  for (let i = 0; i < N; i++) {
    const dwell = parseFloat(panels[i].dataset.dwell || "0");
    if (dwell > 0) { segs.push([cum, cum + dwell, i, i]); cum += dwell; }
    if (i < N - 1) { segs.push([cum, cum + 1, i, i + 1]); cum += 1; }
  }
  const totalUnits = cum || 1;
  function progressAt(u) {
    for (const [u0, u1, p0, p1] of segs) {
      if (u <= u1) return p0 + (p1 - p0) * (u1 > u0 ? clamp((u - u0) / (u1 - u0), 0, 1) : 0);
    }
    return N - 1;
  }

  function render(progress) {
    // local = 0 centred, >0 leaving (zoom in), <0 arriving. Arriving panels sit
    // BEHIND and go opaque fast, so the leaving panel fades over a solid backdrop:
    // no black gap, minimal ghosting, identical going up or down.
    const k = Math.floor(progress);
    panels.forEach((panel, i) => {
      const local = progress - i;
      let scale, opacity;
      // leaving panel zooms toward viewer + fades; arriving stays full-screen,
      // easing from slightly-larger down to 1 (full-screen → no black borders)
      if (local >= 0) { scale = 1 + local * ZOOM_IN; opacity = 1 - local * 1.4; }
      else { scale = 1 + local * ZOOM_FROM; opacity = (local + 1) / FADE_IN; }
      panel.style.transform = `scale(${scale.toFixed(3)})`;
      panel.style.opacity = clamp(opacity, 0, 1).toFixed(3);
      panel.style.zIndex = i <= k ? 200 + i : 100 - i;
      panel.style.visibility = Math.abs(local) > 1.05 ? "hidden" : "visible";
      // only the centred frame is clickable; others must not steal clicks
      panel.style.pointerEvents = Math.abs(local) < 0.5 ? "auto" : "none";
    });
    const active = clamp(Math.round(progress), 0, N - 1);
    const activePanel = panels[active];
    const ai = activePanel ? activePanel.dataset.acronym : undefined; // which letter, if any
    letters.forEach((l, i) => l.classList.toggle("on", String(i) === ai));
    // hide the acronym navigator on the hero (panel 0); fade it in from page two
    if (acronymNav) acronymNav.style.opacity = clamp((progress - 0.45) / 0.45, 0, 1).toFixed(2);
    if (satiation) satiation.classList.toggle("go", active === satiationPanel);
    if (activePanel && "assemble" in activePanel.dataset) runAssemble(activePanel);
  }

  // Cache viewport + wrap height and refresh only on resize. Reading
  // window.innerHeight every scroll frame made the mapping jump on the first
  // scroll, when mobile browser chrome (the URL bar) collapses mid-gesture.
  let ticking = false;
  let viewportH = window.innerHeight;
  let wrapH = wrap.offsetHeight;
  function measure() { viewportH = window.innerHeight; wrapH = wrap.offsetHeight; }
  function update() {
    const rect = wrap.getBoundingClientRect();
    const total = wrapH - viewportH;
    const scrolled = clamp(-rect.top, 0, total);
    const u = total > 0 ? (scrolled / total) * totalUnits : 0;
    render(progressAt(u));
    ticking = false;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); onScroll(); });
  measure();
  update();
}

document.querySelectorAll("[data-zoom-wrap]").forEach(initZoom);

/* ---- cast: click a name → a native horizontal scroll-snap filmstrip --------
   Real horizontal scrolling — follows the finger, native momentum — that snaps
   firmly onto each portrait. The centre is lit + full size, neighbours dimmed.
   The strip loops forever: the cast is repeated several times and the scroll
   position is silently jumped by whole copies near the ends (the copies are
   identical, so the jump is invisible). × / Esc / tap-outside / swipe-up close. */
const castNames = [...document.querySelectorAll(".cast__name")];
const actorView = document.querySelector("[data-actor-view]");

if (castNames.length && actorView) {
  const stage = actorView.querySelector("[data-actor-stage]");
  const track = actorView.querySelector("[data-actor-track]");
  const countEl = actorView.querySelector("[data-actor-count]");
  const actors = castNames.map((b) => ({ name: b.textContent.trim(), photo: b.dataset.photo || "" }));
  const N = actors.length;
  const COPIES = 5;                       // repeated runways; we live in the middle
  const MID = Math.floor(COPIES / 2);
  const pad = (n) => String(n).padStart(2, "0");
  let opener = null;
  let current = 0;                        // actor index currently centred

  const cellHTML = (a) => a.photo
    ? `<article class="actor-cell">
         <div class="actor-cell__img" data-bg="${a.photo}"></div>
         <div class="actor-cell__veil"></div>
         <p class="actor-cell__name">${a.name}</p>
       </article>`
    : `<article class="actor-cell actor-cell--empty">
         <p class="actor-cell__name">${a.name}</p>
         <p class="actor-cell__pending">portrét připravujeme</p>
       </article>`;

  track.innerHTML = Array.from({ length: COPIES }, () => actors.map(cellHTML).join("")).join("");
  const cells = [...track.querySelectorAll(".actor-cell")];
  cells.forEach((c, i) => (c.dataset.actor = String(i % N)));

  // distance between two adjacent cell centres (cell width + gap), measured live
  const pitch = () => cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().left;
  const cycle = () => pitch() * N;        // width of one full cast copy
  // scrollLeft that would centre a given cell in the scrollport
  const centreScroll = (cell) => {
    const cr = cell.getBoundingClientRect(), tr = track.getBoundingClientRect();
    return track.scrollLeft + (cr.left + cr.width / 2) - (tr.left + tr.width / 2);
  };

  function ensureBg(cell) {
    const img = cell.querySelector(".actor-cell__img");
    if (img && img.dataset.bg) { img.style.backgroundImage = `url('${img.dataset.bg}')`; img.removeAttribute("data-bg"); }
  }

  // lit centre / dimmed sides, driven by each cell's distance from the centre
  let painting = false;
  function paint() {
    painting = false;
    const tr = track.getBoundingClientRect();
    const mid = tr.left + tr.width / 2;
    const p = pitch() || 1;
    let best = null, bestD = Infinity;
    cells.forEach((cell) => {
      const r = cell.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid) / p;   // distance in cells
      if (d < bestD) { bestD = d; best = cell; }
      cell.style.filter = `brightness(${clamp(1 - d * 0.66, 0.16, 1).toFixed(3)})`;
      cell.style.transform = `scale(${(1 - Math.min(d, 1) * 0.14).toFixed(3)})`;
      cell.classList.toggle("is-center", d < 0.5);
      if (d < 2.2) ensureBg(cell);
    });
    if (best) { current = Number(best.dataset.actor); countEl.textContent = pad(current + 1) + " / " + pad(N); }
  }

  // keep the live position inside the middle copies; jump by whole copies only
  // when motion has settled, so native momentum is never interrupted (which is
  // what used to park the drum between two portraits).
  let settleTimer = null;
  function recentre() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const tr = track.getBoundingClientRect();
      const mid = tr.left + tr.width / 2;
      let bi = 0, bestD = Infinity;
      cells.forEach((cell, i) => {
        const r = cell.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { bestD = d; bi = i; }
      });
      const copy = Math.floor(bi / N);
      if (copy <= 0 || copy >= COPIES - 1) track.scrollLeft += (MID - copy) * cycle();
    }, 90);
  }

  function onTrackScroll() {
    if (!painting) { painting = true; requestAnimationFrame(paint); }
    recentre();
  }

  const isOpen = () => actorView.classList.contains("open");

  function centreOn(actorIndex, smooth) {
    const cell = cells[MID * N + (((actorIndex % N) + N) % N)];
    track.scrollTo({ left: centreScroll(cell), behavior: smooth ? "smooth" : "auto" });
  }
  function step(dir) { track.scrollBy({ left: dir * pitch(), behavior: "smooth" }); }

  function open(i, btn) {
    opener = btn || null;
    document.body.classList.add("modal-open");
    actorView.setAttribute("aria-hidden", "false");
    actorView.classList.add("open");
    centreOn(i, false);
    paint();
  }
  function close() {
    actorView.classList.remove("open");
    actorView.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (opener) opener.focus({ preventScroll: true });
  }

  castNames.forEach((b, i) => b.addEventListener("click", () => open(i, b)));
  actorView.querySelector("[data-actor-close]").addEventListener("click", close);
  actorView.querySelector("[data-actor-prev]").addEventListener("click", () => step(-1));
  actorView.querySelector("[data-actor-next]").addEventListener("click", () => step(1));
  track.addEventListener("scroll", onTrackScroll, { passive: true });

  // mouse wheel: a vertical notch scrolls the horizontal strip (trackpad
  // horizontal swipes already scroll it natively); snap settles it.
  track.addEventListener("wheel", (e) => {
    if (!isOpen()) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); track.scrollLeft += e.deltaY; }
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  // vertical swipe up closes (touch-action: pan-x leaves vertical gestures to
  // us; horizontal pans are consumed by the native scroll). A plain tap on a
  // side portrait centres it; a tap on the dark margin closes.
  let sx = 0, sy = 0, dx = 0, dy = 0, down = false, moved = false;
  stage.addEventListener("pointerdown", (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; dx = dy = 0; });
  stage.addEventListener("pointermove", (e) => {
    if (!down) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
  });
  stage.addEventListener("pointerup", () => {
    if (!down) return;
    down = false;
    if (dy < -70 && Math.abs(dy) > Math.abs(dx)) close();
  });
  stage.addEventListener("pointercancel", () => { down = false; });
  stage.addEventListener("click", (e) => {
    if (!isOpen() || moved) return;
    if (e.target.closest("[data-actor-close]")) return;
    const cell = e.target.closest(".actor-cell");
    if (cell) { track.scrollTo({ left: centreScroll(cell), behavior: "smooth" }); return; }
    close();
  });

  window.addEventListener("resize", () => { if (isOpen()) { centreOn(current, false); paint(); } });
}

/* ---- footer: slow cross-fade through the reserve photos ---------------- */
const footSlides = [...document.querySelectorAll("[data-foot-slides] .foot__slide")];
if (footSlides.length) {
  let fi = 0;
  footSlides[0].classList.add("on");
  if (!reduceMotion && footSlides.length > 1) {
    setInterval(() => {
      footSlides[fi].classList.remove("on");
      fi = (fi + 1) % footSlides.length;
      footSlides[fi].classList.add("on");
    }, 5200);
  }
}
