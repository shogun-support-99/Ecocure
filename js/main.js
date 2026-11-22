import { EcocureWorld } from "./world.js";

/* ------------------------------------------------------------
   Ecocure — interface conductor.
   Loader, scroll progress, reveals, species field notes,
   cursor, live clock and newsletter.
   ------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const SPECIES = {
  oak: {
    group: "Flora",
    name: "English oak",
    latin: "Quercus robur",
    desc: "The oldest resident on the island. Its crown is a village of lichens, beetles and birds, and its roots trade sugar with at least four fungal partners. We leave standing deadwood where it falls.",
    facts: [
      ["Type", "Deciduous hardwood"],
      ["Age", "≈ 340 years"],
      ["Range", "North ridge"],
      ["Status", "Keystone · protected"],
    ],
    coords: "47.3771° N · 8.5412° E",
    section: "#flora",
  },
  deer: {
    group: "Fauna",
    name: "Roe deer",
    latin: "Capreolus capreolus",
    desc: "Roe deer move in small family groups and browse the woodland edge, keeping the understory open. The station counts them at dusk with thermal cameras; the fawn in the scene was born in May.",
    facts: [
      ["Type", "Small cervid"],
      ["Range", "Woodland edge"],
      ["Diet", "Bramble, ivy, herbs"],
      ["Status", "Resident · 14 counted"],
    ],
    coords: "47.3770° N · 8.5415° E",
    section: "#fauna",
  },
  fox: {
    group: "Fauna",
    name: "Red fox",
    latin: "Vulpes vulpes",
    desc: "A generalist with a night shift. The station's foxes are monitored by scent posts and camera traps; their scat carries seeds of bramble and cherry across the meadow.",
    facts: [
      ["Type", "Canid"],
      ["Range", "Whole station"],
      ["Diet", "Rodents, fruit, carrion"],
      ["Status", "Night shift · 3 dens"],
    ],
    coords: "47.3768° N · 8.5421° E",
    section: "#fauna",
  },
  fungi: {
    group: "Fungi",
    name: "Turkey tail",
    latin: "Trametes versicolor",
    desc: "Turkey tail breaks down dead wood into soil. Its bands are a record of the seasons, and its mycelium connects the fallen log to the roots of the nearest oak.",
    facts: [
      ["Type", "Polypore fungus"],
      ["Range", "Fallen log"],
      ["Role", "Decomposer"],
      ["Status", "Fruiting all year"],
    ],
    coords: "47.3769° N · 8.5418° E",
    section: "#understory",
  },
  swallowtail: {
    group: "Insect",
    name: "Swallowtail",
    latin: "Papilio machaon",
    desc: "A sun-loving butterfly that follows the flower front across the meadow. Its caterpillars need umbellifers; the station plants them along every path edge.",
    facts: [
      ["Type", "Butterfly"],
      ["Range", "Wet meadow"],
      ["Diet", "Nectar · larvae on umbellifers"],
      ["Status", "Returning · 9 sightings"],
    ],
    coords: "47.3773° N · 8.5424° E",
    section: "#index",
  },
  crane: {
    group: "Bird",
    name: "Common crane",
    latin: "Grus grus",
    desc: "Cranes pass over the station in spring and autumn, calling before they are seen. We record their flight paths as part of the wider corridor survey.",
    facts: [
      ["Type", "Migratory bird"],
      ["Range", "Airspace above the pond"],
      ["Diet", "Roots, insects, grain"],
      ["Status", "Passage · spring & autumn"],
    ],
    coords: "47.3766° N · 8.5420° E",
    section: "#index",
  },
};

/* ---------- Elements ---------- */

const canvas = $("#world");
const loader = $("#loader");
const loaderFill = $("#loader-fill");
const loaderPct = $("#loader-pct");
const loaderStatus = $(".loader__status");
const fallback = $("#fallback");
const railFill = $("#rail-fill");
const railLabels = $$("#rail-labels li");
const panel = $("#panel");
const panelClose = $("#panel-close");
const panelAction = $("#panel-action");
const cursor = $("#cursor");
const hotspotEls = {};
$$("[data-hotspot]").forEach((el) => {
  hotspotEls[el.dataset.hotspot] = el;
});

let world = null;
let panelOpen = false;
let panelOpenAt = 0;
let lastFocused = null;
let currentSpecies = null;
let ready = false;

/* ---------- Loader ---------- */

const statusWords = ["Growing the island", "Planting the oaks", "Waking the deer", "Lighting the fireflies"];
let statusIndex = 0;
let progress = 0;

function paintLoader(value) {
  const pct = Math.max(0, Math.min(100, value));
  loaderFill.style.transform = `scaleX(${pct / 100})`;
  loaderPct.textContent = `${Math.round(pct)}%`;
}

const statusTimer = window.setInterval(() => {
  statusIndex = (statusIndex + 1) % statusWords.length;
  loaderStatus.textContent = statusWords[statusIndex];
}, 700);

const creep = window.setInterval(() => {
  progress = Math.min(progress + (88 - progress) * 0.08, 88);
  paintLoader(progress);
}, 90);

function finishLoading(success) {
  window.clearInterval(creep);
  window.clearInterval(statusTimer);
  let p = Math.max(progress, 40);
  const finish = window.setInterval(() => {
    p += (100 - p) * 0.22 + 1;
    paintLoader(p);
    if (p >= 99.4) {
      window.clearInterval(finish);
      paintLoader(100);
      loaderStatus.textContent = success ? "Welcome to the field" : "The field notes are still open";
      window.setTimeout(() => {
        loader.classList.add("is-done");
        ready = true;
        if (world) {
          world.setHotspotsEnabled(true);
          window.setTimeout(() => world.setHotspotsEnabled(true), 900);
        }
        document.body.classList.add("is-ready");
      }, 420);
    }
  }, 55);
}

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    try {
      world = new EcocureWorld(canvas, { hotspotEls });
      world.start();
      updateScroll();
      finishLoading(true);
      if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        window.__ecocure = world;
      }
    } catch (err) {
      console.error("Ecocure world failed to start:", err);
      fallback.hidden = false;
      document.documentElement.classList.add("no-webgl");
      finishLoading(false);
    }
  });
});

/* ---------- Scroll conductor ---------- */

function updateScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

  if (world) world.setScroll(p);

  railFill.style.height = `${p * 100}%`;
  const step = Math.min(railLabels.length - 1, Math.round(p * (railLabels.length - 1)));
  railLabels.forEach((li, i) => li.classList.toggle("is-active", i === step));

  if (panelOpen && Math.abs(window.scrollY - panelOpenAt) > 160) closePanel();
}

let lenis = null;
let scrollQueued = false;

window.addEventListener(
  "scroll",
  () => {
    if (lenis || scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      updateScroll();
      scrollQueued = false;
    });
  },
  { passive: true }
);
window.addEventListener("resize", updateScroll);

function scrollToSection(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  if (lenis) lenis.scrollTo(target, { duration: 1.5, offset: 0 });
  else target.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Lenis is loaded dynamically so a CDN hiccup can never take the site down. */
(async () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const { default: Lenis } = await import("lenis");
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: true,
      touchMultiplier: 1.4,
    });
    lenis.on("scroll", updateScroll);
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  } catch (err) {
    console.warn("Lenis unavailable — native scroll is active.", err);
  }
})();

/* ---------- Reveals ---------- */

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);

$$(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- Counters ---------- */

const nf = new Intl.NumberFormat("en-US");
const counterObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      counterObserver.unobserve(el);
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target)) continue;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = nf.format(target);
        continue;
      }
      const start = performance.now();
      const duration = 1500;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = nf.format(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  },
  { threshold: 0.5 }
);

$$("[data-count]").forEach((el) => counterObserver.observe(el));

/* ---------- Live station clock ---------- */

const stationTime = $("#station-time");
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zurich",
  hour: "2-digit",
  minute: "2-digit",
});

function paintClock() {
  if (!stationTime) return;
  stationTime.textContent = `Field station · ${timeFmt.format(new Date())}`;
}
paintClock();
window.setInterval(paintClock, 30000);

/* ---------- Field notes panel ---------- */

function openSpecies(id) {
  const data = SPECIES[id];
  if (!data) return;

  currentSpecies = id;
  lastFocused = document.activeElement;

  $("#panel-group").textContent = `Field note · ${data.group}`;
  $("#panel-latin").textContent = data.latin;
  $("#panel-name").textContent = data.name;
  $("#panel-desc").textContent = data.desc;
  $("#panel-coords").textContent = data.coords;

  const facts = $("#panel-facts");
  facts.replaceChildren();
  for (const [term, value] of data.facts) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    row.append(dt, dd);
    facts.append(row);
  }

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  panelOpen = true;
  panelOpenAt = window.scrollY;

  if (world) world.setFocus(data.section === "#index" ? null : id);
  window.setTimeout(() => panelClose.focus({ preventScroll: true }), 120);
}

function closePanel({ restoreFocus = true } = {}) {
  if (!panelOpen) return;
  panelOpen = false;
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
  if (world) world.setFocus(null);
  if (restoreFocus && lastFocused && typeof lastFocused.focus === "function") {
    lastFocused.focus({ preventScroll: true });
  }
  currentSpecies = null;
}

$$("[data-species]").forEach((el) => {
  el.addEventListener("click", () => openSpecies(el.dataset.species));
});

panelClose.addEventListener("click", () => closePanel());

panelAction.addEventListener("click", () => {
  const data = SPECIES[currentSpecies];
  closePanel({ restoreFocus: false });
  if (!data) return;
  scrollToSection(data.section);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

document.addEventListener("click", (e) => {
  if (!panelOpen) return;
  if (panel.contains(e.target)) return;
  if (e.target.closest("[data-species]")) return;
  closePanel();
});

/* ---------- Pointer parallax ---------- */

window.addEventListener(
  "pointermove",
  (e) => {
    if (!world || e.pointerType === "touch") return;
    world.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  },
  { passive: true }
);

/* ---------- Custom cursor ---------- */

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && cursor) {
  const dot = $(".cursor__dot", cursor);
  const ring = $(".cursor__ring", cursor);
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    },
    { passive: true }
  );

  const follow = () => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  document.addEventListener("pointerover", (e) => {
    if (e.target.closest("a, button, input, .hotspot")) document.body.classList.add("cursor-hover");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest("a, button, input, .hotspot")) document.body.classList.remove("cursor-hover");
  });
}

/* ---------- Newsletter ---------- */

const signup = $("#signup");
const email = $("#email");
const signupNote = $("#signup-note");

if (signup && email && signupNote) {
  email.addEventListener("input", () => {
    email.classList.remove("is-invalid");
    if (signupNote.classList.contains("is-error")) {
      signupNote.classList.remove("is-error");
      signupNote.textContent = "One letter a season. No noise, no tracking.";
    }
  });

  signup.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = email.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

    if (!valid) {
      email.classList.add("is-invalid");
      signupNote.classList.remove("is-success");
      signupNote.classList.add("is-error");
      signupNote.textContent = "That address does not look right — try again.";
      email.focus();
      return;
    }

    email.classList.remove("is-invalid");
    signupNote.classList.remove("is-error");
    signupNote.classList.add("is-success");
    signupNote.textContent = "You're on the list. The next field letter arrives with the equinox.";
    signup.reset();
  });
}

/* ---------- Tiny ready flourish ---------- */

window.setTimeout(() => {
  if (!ready) return;
  $$(".hero .reveal").forEach((el) => el.classList.add("is-in"));
}, 900);
