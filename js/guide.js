/* ============================================================
   Ecocure — the paper edition's live print.
   The 3D scene is fixed behind the page. Until the paper
   chapters end, it is clipped to the rectangle of the hero's
   [data-world-window], so the world only exists inside the
   print — and fills the viewport when the print opens.
   Past the last paper chapter the clip is released and the
   world returns as the backdrop of the chapters still to be
   rewritten.
   ============================================================ */

import "./plate.js"; /* the scroll opening; initPlates runs on import */

const opening = document.querySelector(".opening");
const windowEl = document.querySelector("[data-world-window]");
const scene = document.querySelector(".scene");
const canvas = document.querySelector("#world");
const sheets = document.querySelectorAll("main .paper");
const lastPaper = sheets[sheets.length - 1];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function paperEnd() {
  if (!lastPaper) return Infinity;
  const r = lastPaper.getBoundingClientRect();
  return r.bottom + window.scrollY;
}

function clearClip() {
  scene.style.clipPath = "";
  if (canvas) {
    canvas.style.transform = "";
    canvas.style.transformOrigin = "";
  }
}

function paint() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* the fixed scene is the coordinate space of the clip and the scale */
  const sw = (scene && scene.clientWidth) || vw;
  const sh = (scene && scene.clientHeight) || vh;
  const pastPaper = window.scrollY >= paperEnd() - 1;

  /* The print only exists inside the opening: once its stage has
     scrolled away the world is released. The paper chapter is
     opaque, so it covers the scene until the old chapters begin. */
  const openingRect = opening ? opening.getBoundingClientRect() : null;
  const openingDone =
    !openingRect || openingRect.bottom <= 1;

  document.body.classList.toggle("past-paper", pastPaper);

  if (scene && windowEl) {
    if (openingDone) {
      clearClip();
    } else {
      const r = windowEl.getBoundingClientRect();
      const top = clamp(r.top, 0, sh);
      const left = clamp(r.left, 0, sw);
      const bottom = clamp(sh - r.bottom, 0, sh);
      const right = clamp(sw - r.right, 0, sw);
      scene.style.clipPath = `inset(${top.toFixed(1)}px ${right.toFixed(
        1
      )}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px)`;

      /* Scale the whole world into the print and let it grow back to
         1:1 as the plate opens, so the closed print is the island
         rather than a crop of empty sky. The viewport centre is
         mapped onto the print centre, which is the identity at
         full bleed — no jump when the opening completes. */
      if (canvas && r.width > 0 && r.bottom > 0 && r.top < sh) {
        const s = Math.min(1, Math.max(r.width / sw, r.height / sh));
        const tx = r.left + r.width / 2 - (s * sw) / 2;
        const ty = r.top + r.height / 2 - (s * sh) / 2;
        canvas.style.transformOrigin = "0 0";
        canvas.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(
          1
        )}px) scale(${s.toFixed(4)})`;
      }
    }
  }

  if (openingRect) {
    const isOpen =
      opening.dataset.open === "1.00" && openingRect.bottom > vh * 0.4;
    document.body.classList.toggle("is-plate-open", isOpen);
  }
}

let queued = false;

function requestPaint() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    paint();
  });
}

window.addEventListener("scroll", requestPaint, { passive: true });
window.addEventListener("resize", requestPaint);
window.addEventListener("load", requestPaint);

/* The plate writes data-open on scroll; watch it so the
   hotspots appear only once the print fills the viewport. */
if (opening && "MutationObserver" in window) {
  new MutationObserver(requestPaint).observe(opening, {
    attributes: true,
    attributeFilter: ["data-open"],
  });
}

paint();
requestAnimationFrame(paint);
