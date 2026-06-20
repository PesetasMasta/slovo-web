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

/* ---- moment 1: prologue word-by-word assembly ----------- */
const prologue = document.querySelector("[data-assemble]");
if (prologue && !reduceMotion) {
  const words = [...prologue.querySelectorAll(".prologue__text span")];
  let started = false;
  const lightUp = () => {
    words.forEach((w, i) => setTimeout(() => w.classList.add("lit"), i * 180));
    setTimeout(() => prologue.classList.add("done"), words.length * 180 + 600);
  };
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting && !started) { started = true; lightUp(); obs.disconnect(); }
    }),
    { threshold: 0.4 }
  );
  obs.observe(prologue);
}

/* ---- the book: scroll-driven page turn ------------------ */
const bookWrap = document.querySelector("[data-book-wrap]");
const book = document.querySelector("[data-book]");

if (bookWrap && book && !reduceMotion) {
  const leaves = [...book.querySelectorAll("[data-leaf]")];
  const letters = [...document.querySelectorAll(".acronym [data-letter]")];
  const satiation = book.querySelector("[data-satiation]");
  const satiationLeaf = leaves.findIndex((l) => satiation && l.contains(satiation));
  const N = leaves.length;
  const lastTurn = N - 1; // number of page-turns

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function render(progress) {
    // progress in [0, lastTurn]
    const k = Math.floor(progress);          // leaf currently turning
    leaves.forEach((leaf, i) => {
      let rot;
      if (i < k) rot = -180;
      else if (i > k) rot = 0;
      else rot = -180 * (progress - k);
      leaf.style.transform = `rotateY(${rot}deg)`;
      // turned leaves drop behind; remaining stack keeps lower index on top
      leaf.style.zIndex = i < k ? i : N - i;
      // paper shading driven by how far this page has turned (0..1)
      const turn = clamp(-rot / 180, 0, 1);
      leaf.style.setProperty("--turn", turn.toFixed(3));
      leaf.style.setProperty("--shade", Math.sin(turn * Math.PI).toFixed(3));
    });
    const active = clamp(Math.round(progress), 0, N - 1);
    letters.forEach((l, i) => l.classList.toggle("on", i === active));
    if (satiation) satiation.classList.toggle("go", active === satiationLeaf);
  }

  let ticking = false;
  function update() {
    const rect = bookWrap.getBoundingClientRect();
    const total = bookWrap.offsetHeight - window.innerHeight;
    const scrolled = clamp(-rect.top, 0, total);
    const progress = total > 0 ? (scrolled / total) * lastTurn : 0;
    render(progress);
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
