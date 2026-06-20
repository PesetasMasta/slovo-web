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
    words.forEach((w, i) => {
      setTimeout(() => w.classList.add("lit"), i * 180);
    });
    // once the sentence has assembled, let the closing line take over
    setTimeout(() => prologue.classList.add("done"), words.length * 180 + 600);
  };

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started) {
          started = true;
          lightUp();
          obs.disconnect();
        }
      });
    },
    { threshold: 0.4 }
  );
  obs.observe(prologue);
}

/* ---- moment 2: semantic satiation (the emptied word) ---- */
const satiation = document.querySelector("[data-satiation]");
if (satiation && !reduceMotion) {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          satiation.classList.add("go");
          obs.disconnect();
        }
      });
    },
    { threshold: 0.5 }
  );
  obs.observe(satiation);
}
