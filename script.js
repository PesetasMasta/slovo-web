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

/* ---- cast: click a name → a looping filmstrip "drum" of portraits --------
   Centre cell is large/sharp, neighbours shrink and dim; drag/swipe spins it
   (loops forever); swipe up / Esc / handle / outside closes. ---------------- */
const castNames = [...document.querySelectorAll(".cast__name")];
const actorView = document.querySelector("[data-actor-view]");

if (castNames.length && actorView) {
  const stage = actorView.querySelector("[data-actor-stage]");
  const reel = actorView.querySelector("[data-actor-track]");
  const countEl = actorView.querySelector("[data-actor-count]");
  const actors = castNames.map((b) => ({ name: b.textContent.trim(), photo: b.dataset.photo || "" }));
  const N = actors.length;
  let opener = null;
  let offset = 0;     // continuous centre position, in cells (loops)
  let raf = null;
  let wheelTimer = null;
  let vel = 0;        // drag velocity for momentum (used by inertia)
  const pad = (n) => String(n).padStart(2, "0");

  reel.innerHTML = actors
    .map((a) => a.photo
      ? `<article class="actor-cell">
           <div class="actor-cell__img" data-bg="${a.photo}"></div>
           <div class="actor-cell__veil"></div>
           <p class="actor-cell__name">${a.name}</p>
         </article>`
      : `<article class="actor-cell actor-cell--empty">
           <p class="actor-cell__name">${a.name}</p>
           <p class="actor-cell__pending">portrét připravujeme</p>
         </article>`)
    .join("");
  const cells = [...reel.querySelectorAll(".actor-cell")];
  const spacingPx = () => (cells[0].offsetWidth || (stage.getBoundingClientRect().width || 1) * 0.2) * 0.98;

  function ensureBg(i) {
    const cell = cells[((i % N) + N) % N];
    const img = cell && cell.querySelector(".actor-cell__img");
    if (img && img.dataset.bg) { img.style.backgroundImage = `url('${img.dataset.bg}')`; img.removeAttribute("data-bg"); }
  }

  function layout() {
    const spacing = spacingPx();
    cells.forEach((cell, i) => {
      let rel = (((i - offset) % N) + N) % N;   // 0..N
      if (rel > N / 2) rel -= N;                 // wrap to -N/2..N/2 (shortest way)
      const ax = Math.abs(rel);
      // continuous strip: same size, touching; centre lit, neighbours dimmed
      cell.style.transform = `translate(-50%, -50%) translateX(${(rel * spacing).toFixed(1)}px)`;
      cell.style.filter = `brightness(${Math.max(0.42, 1 - ax * 0.24).toFixed(3)})`;
      cell.style.opacity = "1";
      cell.style.zIndex = String(Math.round(100 - ax * 10));
      cell.style.visibility = ax > 3.2 ? "hidden" : "visible";
      cell.classList.toggle("is-center", ax < 0.5);
      if (ax <= 2.2) ensureBg(i);
    });
    countEl.textContent = pad(((Math.round(offset) % N) + N) % N + 1) + " / " + pad(N);
  }

  function animateTo(target) {
    cancelAnimationFrame(raf); raf = null;
    const step = () => {
      offset += (target - offset) * 0.12;   // gentler settle
      if (Math.abs(target - offset) < 0.002) { offset = target; layout(); raf = null; return; }
      layout(); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  const isOpen = () => actorView.classList.contains("open");

  function open(i, btn) {
    opener = btn || null;
    cancelAnimationFrame(raf); raf = null;
    offset = i;
    document.body.classList.add("modal-open");
    actorView.setAttribute("aria-hidden", "false");
    actorView.classList.add("open");
    layout();
  }
  function close() {
    stage.style.transform = "";
    actorView.classList.remove("open");
    actorView.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (opener) opener.focus();
  }

  castNames.forEach((b, i) => b.addEventListener("click", () => open(i, b)));
  actorView.querySelector("[data-actor-close]").addEventListener("click", close);
  actorView.querySelector("[data-actor-prev]").addEventListener("click", () => animateTo(Math.round(offset) - 1));
  actorView.querySelector("[data-actor-next]").addEventListener("click", () => animateTo(Math.round(offset) + 1));
  // trackpad: horizontal swipe spins the drum, downward scroll closes
  actorView.addEventListener("wheel", (e) => {
    if (!isOpen()) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      offset += e.deltaX / spacingPx() * 0.6;
      layout();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => animateTo(Math.round(offset)), 140);
    } else if (e.deltaY > 24) {
      close();
    }
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") animateTo(Math.round(offset) - 1);
    else if (e.key === "ArrowRight") animateTo(Math.round(offset) + 1);
  });

  // momentum glide that gently settles on the nearest cell (smooth, no hard snap)
  function inertia() {
    cancelAnimationFrame(raf); raf = null;
    const step = () => {
      offset += vel;
      vel *= 0.9;                          // friction
      const nearest = Math.round(offset);
      vel += (nearest - offset) * 0.025;   // soft pull toward the nearest cell
      layout();
      if (Math.abs(vel) < 0.0009 && Math.abs(nearest - offset) < 0.003) { offset = nearest; layout(); raf = null; return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // pointer drag: horizontal spins the drum (with momentum), swipe up closes
  let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, axis = null, startOffset = 0;
  stage.addEventListener("pointerdown", (e) => {
    dragging = true; axis = null; sx = e.clientX; sy = e.clientY; dx = dy = 0; vel = 0;
    startOffset = offset; cancelAnimationFrame(raf); raf = null;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (axis === "x") {
      const no = startOffset - dx / spacingPx();
      vel = Math.max(-1.2, Math.min(1.2, no - offset)); // track speed for momentum
      offset = no;
      layout();
    } else if (axis === "y" && dy < 0) {
      stage.style.transform = `translateY(${(dy * 0.5).toFixed(1)}px) scale(${(1 - Math.min(-dy / 1000, 0.1)).toFixed(3)})`;
    }
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (axis === "y" && dy < -110) { close(); return; }
    stage.style.transform = "";
    if (axis === "x") inertia();
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  window.addEventListener("resize", () => { if (isOpen()) layout(); });
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
