import "../js/plate.js";

/* ============================================================
   Phase 1 review page: live specimen readouts + plate status.
   The plate itself is driven by js/plate.js.
   ============================================================ */

const stage = document.querySelector("[data-plate]");
const openReadout = document.querySelector("[data-plate-readout]");
const stateReadout = document.querySelector("[data-plate-state]");

function describeOpen(value) {
  if (value > 0.98) return "full bleed";
  if (value < 0.02) return "matted print";
  return "opening";
}

function paintPlateStatus() {
  const value = Number.parseFloat(stage?.dataset.open ?? "0");
  if (openReadout) openReadout.textContent = value.toFixed(2);
  if (stateReadout) stateReadout.textContent = describeOpen(value);
}

if (stage) {
  new MutationObserver(paintPlateStatus).observe(stage, {
    attributes: true,
    attributeFilter: ["data-open"],
  });
  paintPlateStatus();
}

/* ---------- type specimens, measured live ---------- */

const specimens = Array.from(document.querySelectorAll("[data-specimen]"));

function measure(el) {
  const cs = getComputedStyle(el);
  const size = Number.parseFloat(cs.fontSize);
  const leading = cs.lineHeight === "normal" ? size * 1.2 : Number.parseFloat(cs.lineHeight);
  const tracking = cs.letterSpacing === "normal" ? 0 : Number.parseFloat(cs.letterSpacing);
  const maxWidth = cs.maxWidth.endsWith("px") ? Number.parseFloat(cs.maxWidth) : 0;

  const parts = [
    `${size.toFixed(1)}px`,
    `/${leading.toFixed(1)}`,
    tracking ? `${((tracking / size) * 1000).toFixed(0)}/1000 em` : "0 tracking",
  ];

  if (maxWidth) parts.push(`${Math.round(maxWidth)}px measure`);

  return parts.join(" · ");
}

function paintSpecimens() {
  for (const el of specimens) {
    /* Each specimen sits directly under its own .spec__head, which holds
       the readout — the mono specimen repeats that pattern three times. */
    const out = el.previousElementSibling?.querySelector("[data-read]");
    if (out) out.textContent = measure(el);
  }
}

paintSpecimens();

let resizeFrame = 0;
window.addEventListener(
  "resize",
  () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      paintSpecimens();
    });
  },
  { passive: true }
);

/* Fonts can land after first paint and change the measure. */
if (document.fonts) {
  document.fonts.ready.then(paintSpecimens);
}
