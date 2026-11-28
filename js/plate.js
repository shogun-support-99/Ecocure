/* ============================================================
   Ecocure — the plate that opens.
   Writes a single value, --plate-open (0 → 1), onto each
   [data-plate] scroll stage. css/plate.css does the rest.
   Reduced motion: the plate is simply open, no listeners.
   ============================================================ */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

const smoothstep = (t) => t * t * (3 - 2 * t);

function setOpen(stage, plate, value) {
  const v = Math.round(value * 1000) / 1000;
  stage.style.setProperty("--plate-open", v);
  stage.dataset.open = v.toFixed(2);
  plate.classList.toggle("is-open", v > 0.98);
}

function initPlate(stage) {
  const plate = stage.querySelector(".plate") || stage;

  if (reduced.matches) {
    /* A static plate (the opening) stays closed: the title page
       carries the copy and the print stays a print, no morph. */
    setOpen(stage, plate, stage.hasAttribute("data-plate-static") ? 0 : 1);
    return () => {};
  }

  let queued = 0;
  let last = -1;

  const paint = () => {
    queued = 0;
    const rect = stage.getBoundingClientRect();
    const travel = stage.offsetHeight - window.innerHeight;
    let p;

    if (travel > 8) {
      p = -rect.top / travel;
    } else {
      p = rect.top < window.innerHeight * 0.5 ? 1 : 0;
    }

    p = Math.min(1, Math.max(0, p));
    /* Hold the print closed for the first 6% of the run, then
       open across most of the stage, and settle open at the end. */
    const value = smoothstep(Math.min(1, Math.max(0, (p - 0.06) / 0.62)));

    if (Math.abs(value - last) < 0.002) return;
    last = value;
    setOpen(stage, plate, value);
  };

  const request = () => {
    if (!queued) queued = requestAnimationFrame(paint);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  paint();

  return request;
}

export function initPlates(root = document) {
  return Array.from(root.querySelectorAll("[data-plate]"), initPlate);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initPlates());
  } else {
    initPlates();
  }
}
