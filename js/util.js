import * as THREE from "three";

export const ISLAND_R = 11;
export const POND = { x: 2.55, z: 2.35, r: 2.05 };
export const WATER_Y = -0.2;

/* Deterministic randomness so the island grows the same way every visit. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Height of the island surface before the rim falloff. */
export function baseHeight(x, z) {
  let h =
    0.28 * Math.sin(x * 0.55) * Math.cos(z * 0.5) +
    0.16 * Math.sin(x * 1.25 + z * 0.75);

  // A soft hill under the old oak.
  h += 0.95 * Math.exp(-(((x + 3.4) ** 2) + ((z + 1.6) ** 2)) / 22);

  // The pond basin.
  const dp = Math.hypot(x - POND.x, z - POND.z);
  h -= 0.95 * Math.exp(-(dp * dp) / 3.2);

  return h;
}

export function surfaceHeight(x, z, radius = Math.hypot(x, z)) {
  return baseHeight(x, z) - 0.6 * Math.pow(Math.min(1, radius / ISLAND_R), 7);
}

export function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    ...extra,
  });
}

/* A soft round sprite used for fireflies and pollen. */
export function radialTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.85)");
  g.addColorStop(0.65, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
