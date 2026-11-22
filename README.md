# Ecocure — a living atlas of the wild

A scroll-driven 3D field station: one persistent, low-poly floating island you travel through while meeting the plants, animals and fungi that hold it together.

**Live site:** _added after the first Pages deployment_ — `https://shogun-support-99.github.io/Ecocure/`

![Ecocure](https://img.shields.io/badge/Three.js-r170-b9d48f?style=flat-square) ![No build step](https://img.shields.io/badge/build-none-b9d48f?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-b9d48f?style=flat-square)

---

## The idea

Ecocure is a fictional biodiversity field station. Instead of stacking sections, the site keeps **one live Three.js world** and uses native scroll as its conductor. The camera moves through six authored compositions while the island keeps breathing: grass sways, birds circle, a deer and her fawn browse the pond edge, a fox wakes on a stone, fireflies come out under the log.

The editorial layer — field notes, species index, mission figures — is semantic HTML above the canvas, so the content still works without WebGL.

### Chapters

| # | Chapter | What happens |
|---|---|---|
| 00 | Aperture | Wide golden-hour reveal of the island |
| 01 | Flora | Camera settles on the 340-year-old oak |
| 02 | Fauna | Roe deer, fawn, fox and circling birds |
| 03 | Understory | Blue hour at the fallen log; mycelium and fireflies |
| 04 | Care | Pull back to the whole island and the restoration figures |
| 05 | Field index | Species list, field notes and newsletter |

### Interactions

- Click a 3D marker (oak, deer, turkey tail) or any species card/row to open a field note.
- The camera refocuses on the specimen while the note is open.
- `Esc`, the close button, an outside click, or a deliberate scroll closes the note.
- Custom cursor, chapter rail, animated counters, live Zürich station clock.
- Newsletter form with client-side validation (demo only — nothing is sent).

---

## Stack

- **[Three.js](https://github.com/mrdoob/three.js)** r170 — renderer, geometry, shaders, post-processing.
- **[Lenis](https://github.com/darkroomengineering/lenis)** — smooth native scroll, loaded dynamically so a CDN failure falls back to normal scrolling.
- **Instrument Serif + Inter Tight** via Google Fonts.
- **No build step.** ES modules + import map, served as static files.
- **GitHub Pages** via the official `actions/configure-pages`, `upload-pages-artifact` and `deploy-pages` actions.

### Project structure

```text
index.html              semantic chapters + fixed UI
css/style.css           design system, layout, responsive, reduced motion
js/main.js              loader, scroll conductor, panel, cursor, form
js/world.js             renderer, sky, lights, camera ledger, bloom, hotspots
js/terrain.js           island mesh, rock base, pond shader, log, rocks, mycelium
js/vegetation.js        oaks, pines, instanced grass, flowers, mushrooms
js/creatures.js         deer + fawn, fox, birds, butterflies, fireflies, islets
js/util.js              seeded RNG, height field, shared materials, sprite helper
.github/workflows/      Pages deployment
```

---

## Run locally

Any static server works. With Node installed:

```bash
npx serve .
# or
npx http-server -p 8080
```

Then open `http://localhost:3000` (or the port shown). Opening `index.html` directly from disk will not work because ES modules and import maps require HTTP.

## Deploy

1. Push to `main`.
2. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds the artifact and publishes it.
4. The live URL appears in the Actions run and in the repository sidebar.

---

## Design references

Studied for composition, pacing and typography only. No code, copy, imagery or branding was reused.

- [Penderecki's Garden — HUNCWOT](https://www.awwwards.com/pendereckis-garden-by-huncwot.html) — a real garden as one explorable place; serif + sans pairing; natural palette.
- [Hybrid by Nature — Goethe](https://www.goethe.de/pro/games/oas/hybridbynature/index.html) — spatial, playful navigation through a 3D world.
- [In Pieces](https://inpieces.co/) — endangered species as a scroll-driven exhibition.
- [100 Lost Species — Immersive Garden](https://immersive-g.com/) — dark editorial conservation storytelling.
- [Immersive Garden](https://immersive-g.com/) — minimal chrome, light and material as the interface.
- [Plantica](https://plantica.net/en/) — botanical art direction.
- [Park Photos](https://www.park.photos/) — photographic framing of nature.
- Inspiration library: [Craftwork](https://craftwork.design/) (reference-only licence).

## Accessibility & performance

- Semantic landmarks, one `h1`, ordered headings, skip link, visible focus states.
- All species triggers are real buttons; the note panel is a labelled dialog and restores focus on close.
- `prefers-reduced-motion` disables Lenis, camera drift and parallax; CSS transitions collapse.
- Mobile: reduced grass/flower counts, 1.5 DPR cap, no bloom, 1024 shadow map.
- Desktop: 1.8 DPR cap, 2048 shadow map, bloom only on highlights.
- WebGL failure shows a readable field-notes fallback; no content is trapped behind the canvas.

## Licence

Code is released under the [MIT License](LICENSE). The Ecocure name, copy and art direction are part of this demo project. All restoration figures and species counts are illustrative, not real-world claims.

Built with Three.js, Lenis and a lot of moss.
