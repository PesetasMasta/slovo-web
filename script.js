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
