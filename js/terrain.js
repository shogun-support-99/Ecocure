import * as THREE from "three";
import { ISLAND_R, POND, WATER_Y, surfaceHeight, std } from "./util.js";

/* ------------------------------------------------------------
   The floating island: a faceted meadow, a rock underside,
   a spring-fed pond and the small debris of a living place.
   ------------------------------------------------------------ */

function islandGeometry(rng) {
  const rings = 26;
  const segs = 76;
  const pos = [];
  const col = [];
  const idx = [];

  const cMoss = new THREE.Color("#54763b");
  const cGrass = new THREE.Color("#7c9a4e");
  const cDark = new THREE.Color("#35502f");
  const cShore = new THREE.Color("#8d8158");
  const cEdge = new THREE.Color("#2c3d29");
  const tmp = new THREE.Color();

  const paint = (x, z, y, r) => {
    const t = THREE.MathUtils.clamp((y + 0.8) / 1.9, 0, 1);
    tmp.copy(cDark).lerp(cGrass, t);
    const patch = Math.sin(x * 1.7 + z * 0.9) * 0.5 + 0.5;
    tmp.lerp(cMoss, patch * 0.45);

    const dp = Math.hypot(x - POND.x, z - POND.z);
    if (dp < POND.r + 1.1) {
      const shore = 1 - THREE.MathUtils.smoothstep(dp, POND.r - 0.2, POND.r + 1.1);
      tmp.lerp(cShore, shore * 0.5);
    }

    tmp.lerp(cEdge, Math.pow(r / ISLAND_R, 5) * 0.85);
    const jitter = 0.92 + rng() * 0.16;
    col.push(tmp.r * jitter, tmp.g * jitter, tmp.b * jitter);
  };

  // Centre vertex.
  const cy = surfaceHeight(0, 0, 0);
  pos.push(0, cy, 0);
  paint(0, 0, cy, 0);

  for (let r = 1; r <= rings; r++) {
    const rad = (ISLAND_R * r) / rings;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * 5 + 1.3) * 0.012 + Math.sin(a * 9) * 0.008;
      const x = Math.cos(a) * rad * wobble;
      const z = Math.sin(a) * rad * wobble;
      const y = surfaceHeight(x, z, rad);
      pos.push(x, y, z);
      paint(x, z, y, rad);
    }
  }

  // Centre fan (counter-clockwise from above).
  for (let s = 0; s < segs; s++) {
    idx.push(0, 1 + ((s + 1) % segs), 1 + s);
  }

  // Ring quads.
  for (let r = 1; r < rings; r++) {
    const inner = 1 + (r - 1) * segs;
    const outer = 1 + r * segs;
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      idx.push(inner + s, inner + s1, outer + s);
      idx.push(inner + s1, outer + s1, outer + s);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function rockGeometry(rng) {
  const g = new THREE.ConeGeometry(ISLAND_R * 0.995, 8, 20, 5);
  g.rotateX(Math.PI);
  const pos = g.attributes.position;
  const colors = [];
  const top = new THREE.Color("#4a5340");
  const bottom = new THREE.Color("#26251f");
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const jag = 1 + Math.sin(a * 7 + y) * 0.045 + (rng() - 0.5) * 0.03;
    pos.setX(i, pos.getX(i) * jag);
    pos.setZ(i, pos.getZ(i) * jag);
    const t = THREE.MathUtils.clamp((y + 4) / 8, 0, 1);
    tmp.copy(bottom).lerp(top, Math.pow(t, 1.8));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vXZ;
      void main() {
        vXZ = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vXZ;
      void main() {
        float r = length(vXZ);
        float ripple = sin(r * 9.0 - uTime * 1.25) * 0.5 + 0.5;
        float cross = sin(vXZ.x * 4.2 + uTime * 0.7) * cos(vXZ.y * 3.6 - uTime * 0.55);
        vec3 deep = vec3(0.028, 0.082, 0.072);
        vec3 shallow = vec3(0.135, 0.285, 0.225);
        vec3 col = mix(deep, shallow, 0.35 + ripple * 0.22 + cross * 0.08);
        float sparkle = pow(max(0.0, sin(vXZ.x * 8.0 + vXZ.y * 6.0 + uTime * 1.8)), 42.0);
        col += vec3(1.0, 0.86, 0.6) * sparkle * 0.35;
        float edge = smoothstep(1.0, 0.82, r / 2.05);
        gl_FragColor = vec4(col, 0.94 * edge);
      }
    `,
  });
}

function addLilyPads(group, rng, mats) {
  const padGeo = new THREE.CircleGeometry(0.22, 9);
  padGeo.rotateX(-Math.PI / 2);
  const notch = new THREE.CircleGeometry(0.08, 3);
  notch.rotateX(-Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2;
    const r = 0.6 + rng() * 1.1;
    const pad = new THREE.Mesh(padGeo, mats.lily);
    pad.position.set(POND.x + Math.cos(a) * r, WATER_Y + 0.015, POND.z + Math.sin(a) * r);
    pad.rotation.y = rng() * Math.PI;
    pad.scale.setScalar(0.7 + rng() * 0.6);
    pad.receiveShadow = true;
    group.add(pad);

    if (i === 1) {
      const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), mats.lilyFlower);
      flower.position.copy(pad.position).setY(WATER_Y + 0.07);
      group.add(flower);
    }
  }
}

function addLog(group, mats) {
  const log = new THREE.Group();
  const x = -1.35;
  const z = 2.72;
  log.position.set(x, surfaceHeight(x, z) + 0.24, z);
  log.rotation.y = 0.55;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.26, 1.9, 8), mats.bark);
  trunk.rotation.z = Math.PI / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  log.add(trunk);

  const moss = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), mats.moss);
  moss.scale.set(2.4, 0.32, 0.8);
  moss.position.y = 0.16;
  moss.castShadow = true;
  log.add(moss);

  // Turkey-tail brackets along the shaded side.
  const bracketGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.035, 9, 1, false, 0, Math.PI);
  for (let i = 0; i < 4; i++) {
    const bracket = new THREE.Mesh(bracketGeo, mats.fungus);
    bracket.position.set(-0.62 + i * 0.34, -0.03 + (i % 2) * 0.06, 0.2);
    bracket.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    bracket.scale.setScalar(0.7 + (i % 3) * 0.16);
    log.add(bracket);
  }

  group.add(log);
}

function addRocks(group, rng, mats) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const r = 3.2 + rng() * 6.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.7) continue;

    const rock = new THREE.Mesh(geo, mats.rock);
    const s = 0.16 + rng() * 0.42;
    rock.position.set(x, surfaceHeight(x, z) + s * 0.32, z);
    rock.scale.set(s * (0.9 + rng() * 0.5), s * (0.5 + rng() * 0.4), s);
    rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
}

function addRoots(group, rng, mats) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
    const r = ISLAND_R * 0.94;
    const len = 1.1 + rng() * 2.4;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, len, 4), mats.root);
    root.position.set(Math.cos(a) * r, -0.7 - len / 2, Math.sin(a) * r);
    root.rotation.z = (rng() - 0.5) * 0.4;
    root.rotation.x = (rng() - 0.5) * 0.4;
    group.add(root);
  }
}

function addMycelium(group, rng) {
  const positions = [];
  const nodes = [];
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2;
    const r = 1.2 + rng() * 7.6;
    const x1 = Math.cos(a) * r;
    const z1 = Math.sin(a) * r;
    if (Math.hypot(x1 - POND.x, z1 - POND.z) < POND.r + 0.4) continue;

    const a2 = a + (rng() - 0.5) * 0.9;
    const r2 = THREE.MathUtils.clamp(r + (rng() - 0.5) * 3, 0.8, 9.2);
    const x2 = Math.cos(a2) * r2;
    const z2 = Math.sin(a2) * r2;
    if (Math.hypot(x2 - POND.x, z2 - POND.z) < POND.r + 0.2) continue;

    positions.push(x1, surfaceHeight(x1, z1) + 0.025, z1, x2, surfaceHeight(x2, z2) + 0.025, z2);
    nodes.push(x1, surfaceHeight(x1, z1) + 0.05, z1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x8fe3c0,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  group.add(lines);

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodes, 3));
  const nodeMat = new THREE.PointsMaterial({
    color: 0xa9f3d4,
    size: 0.055,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  group.add(new THREE.Points(nodeGeo, nodeMat));

  return mat;
}

export function buildTerrain(scene, rng, mats) {
  const group = new THREE.Group();

  const top = new THREE.Mesh(
    islandGeometry(rng),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })
  );
  top.receiveShadow = true;
  group.add(top);

  const base = new THREE.Mesh(
    rockGeometry(rng),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })
  );
  base.position.y = -4.12;
  base.castShadow = false;
  base.receiveShadow = true;
  group.add(base);

  const waterMat = waterMaterial();
  const waterGeo = new THREE.CircleGeometry(POND.r, 48);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(POND.x, WATER_Y, POND.z);
  group.add(water);

  addLilyPads(group, rng, mats);
  addLog(group, mats);
  addRocks(group, rng, mats);
  addRoots(group, rng, mats);
  const myceliumMat = addMycelium(group, rng);

  scene.add(group);

  return {
    group,
    update(t) {
      waterMat.uniforms.uTime.value = t;
      myceliumMat.opacity = 0.16 + Math.sin(t * 0.7) * 0.05 + 0.05;
    },
  };
}
