/* Viewport switch for the review page: desktop comp or mobile comp. */

const buttons = Array.from(document.querySelectorAll("[data-view-set]"));
const STORAGE_KEY = "ecocure-frames-view";

function setView(view, persist = true) {
  document.body.dataset.view = view;
  buttons.forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.viewSet === view));
  });
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch (e) {
      /* private mode: no persistence */
    }
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewSet));
});

let saved = null;
try {
  saved = localStorage.getItem(STORAGE_KEY);
} catch (e) {
  saved = null;
}

if (saved === "desktop" || saved === "mobile") {
  setView(saved, false);
} else if (window.innerWidth < 760) {
  setView("mobile", false);
}
