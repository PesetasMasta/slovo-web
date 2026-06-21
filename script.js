/* S.L.O.V.O. — scroll-driven moments (vanilla, no deps) */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- generic reveal-on-scroll --------------------------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.18 }
);
document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ---- prologue word-by-word assembly (runs when its panel is centred) --- */
function runAssemble(panel) {
  if (panel.dataset.assembled) return;
  panel.dataset.assembled = "1";
  const words = [...panel.querySelectorAll(".prologue__text span")];
  words.forEach((w, i) => setTimeout(() => w.classList.add("lit"), i * 120));
  setTimeout(() => panel.classList.add("done"), words.length * 120 + 500);
}

/* ---- scroll-driven zoom: fall through one panel into the next ---------- */
const ZOOM_IN = 7.0;    // how hard the leaving panel rushes toward the viewer
const ZOOM_FROM = 0.45; // how small the arriving panel starts (zoomed inside)
const FADE_IN = 0.45;   // arriving panel reaches full opacity within this much of centre

function initZoom(wrap) {
  const stage = wrap.querySelector("[data-zoom]");
  if (!stage || reduceMotion) return;

  const panels = [...stage.querySelectorAll("[data-panel]")];
  const letters = [...wrap.querySelectorAll(".acronym [data-letter]")];
  const letterOffset = panels.length - letters.length; // letters track the LAST panels
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
      if (local >= 0) { scale = 1 + local * ZOOM_IN; opacity = 1 - local; }
      else { scale = 1 + local * ZOOM_FROM; opacity = (local + 1) / FADE_IN; }
      panel.style.transform = `scale(${scale.toFixed(3)})`;
      panel.style.opacity = clamp(opacity, 0, 1).toFixed(3);
      panel.style.zIndex = i <= k ? 200 + i : 100 - i;
      panel.style.visibility = Math.abs(local) > 1.05 ? "hidden" : "visible";
    });
    const active = clamp(Math.round(progress), 0, N - 1);
    letters.forEach((l, i) => l.classList.toggle("on", i === active - letterOffset));
    if (satiation) satiation.classList.toggle("go", active === satiationPanel);
    const activePanel = panels[active];
    if (activePanel && "assemble" in activePanel.dataset) runAssemble(activePanel);
  }

  let ticking = false;
  function update() {
    const rect = wrap.getBoundingClientRect();
    const total = wrap.offsetHeight - window.innerHeight;
    const scrolled = clamp(-rect.top, 0, total);
    const u = total > 0 ? (scrolled / total) * totalUnits : 0;
    render(progressAt(u));
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

document.querySelectorAll("[data-zoom-wrap]").forEach(initZoom);

/* ---- cast: click a name → zoom into a portrait card, swipe between ----- */
const castNames = [...document.querySelectorAll(".cast__name")];
const actorView = document.querySelector("[data-actor-view]");

if (castNames.length && actorView) {
  const stage = actorView.querySelector("[data-actor-stage]");
  const track = actorView.querySelector("[data-actor-track]");
  const countEl = actorView.querySelector("[data-actor-count]");
  const actors = castNames.map((b) => ({ name: b.textContent.trim(), photo: b.dataset.photo || "" }));
  const N = actors.length;
  let index = 0;
  let opener = null;

  track.innerHTML = actors
    .map((a) => a.photo
      ? `<div class="actor-slide">
           <div class="actor-slide__img" style="background-image:url('${a.photo}')"></div>
           <div class="actor-slide__veil"></div>
           <p class="actor-slide__name">${a.name}</p>
         </div>`
      : `<div class="actor-slide actor-slide--empty">
           <p class="actor-slide__name">${a.name}</p>
           <p class="actor-slide__pending">portrét připravujeme</p>
         </div>`)
    .join("");
  const slides = [...track.querySelectorAll(".actor-slide")];

  // cross-fade: only the active slide is shown (no track, no neighbour peek)
  function setIndex(i) {
    index = (i + N) % N; // wrap around
    slides.forEach((s, k) => s.classList.toggle("on", k === index));
    countEl.textContent =
      String(index + 1).padStart(2, "0") + " / " + String(N).padStart(2, "0");
  }

  function open(i, btn) {
    opener = btn || null;
    // zoom the stage in from the clicked name's position
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    if (btn && !reduceMotion) {
      const r = btn.getBoundingClientRect();
      stage.style.setProperty("--fx", (r.left + r.width / 2 - cx) + "px");
      stage.style.setProperty("--fy", (r.top + r.height / 2 - cy) + "px");
    } else {
      stage.style.setProperty("--fx", "0px");
      stage.style.setProperty("--fy", "0px");
    }
    stage.style.transform = "";          // use the CSS start state (reads --fx/--fy)
    setIndex(i);
    document.body.classList.add("modal-open");
    actorView.setAttribute("aria-hidden", "false");
    void stage.offsetWidth;              // commit the from-name start state...
    actorView.classList.add("open");     // ...then zoom in
  }

  function close() {
    stage.style.transform = "";          // clear any drag transform so CSS zooms back out
    actorView.classList.remove("open");
    actorView.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (opener) opener.focus();
  }

  const isOpen = () => actorView.classList.contains("open");

  castNames.forEach((b, i) => b.addEventListener("click", () => open(i, b)));
  actorView.querySelector("[data-actor-close]").addEventListener("click", close);
  actorView.querySelector("[data-actor-prev]").addEventListener("click", () => setIndex(index - 1));
  actorView.querySelector("[data-actor-next]").addEventListener("click", () => setIndex(index + 1));
  actorView.addEventListener("click", (e) => { if (e.target === actorView) close(); }); // outside stage
  actorView.addEventListener("wheel", (e) => { if (isOpen() && e.deltaY > 18) close(); }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") setIndex(index - 1);
    else if (e.key === "ArrowRight") setIndex(index + 1);
  });

  // pointer drag on the stage: horizontal = cross-fade to next/prev, down = close
  let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, axis = null;
  stage.addEventListener("pointerdown", (e) => {
    dragging = true; axis = null; sx = e.clientX; sy = e.clientY; dx = dy = 0;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    // light feedback only (the actual switch is a cross-fade, not a slide)
    if (axis === "x") stage.style.transform = `translateX(${(dx * 0.25).toFixed(1)}px)`;
    else if (axis === "y" && dy > 0) stage.style.transform = `translateY(${(dy * 0.5).toFixed(1)}px) scale(${(1 - Math.min(dy / 1000, 0.1)).toFixed(3)})`;
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (axis === "y" && dy > 110) { close(); return; }
    stage.style.transform = "";          // reset feedback (CSS keeps it at scale 1)
    if (axis === "x" && Math.abs(dx) > 60) setIndex(index + (dx < 0 ? 1 : -1));
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  setIndex(0);
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
