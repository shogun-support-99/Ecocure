import * as THREE from "three";
import { POND, surfaceHeight } from "./util.js";

/* ------------------------------------------------------------
   Vegetation: oaks, pines, wind-blown grass, wildflowers,
   moss, mushrooms and the shrubby edge of the wood.
   ------------------------------------------------------------ */

const TREES = [
  { x: -3.4, z: -1.4, s: 1.65, type: "oak" },
  { x: -6.6, z: 1.7, s: 1.15, type: "oak" },
  { x: -1.8, z: -5.8, s: 1.1, type: "pine" },
  { x: 5.9, z: -4.3, s: 1.25, type: "pine" },
  { x: 7.3, z: 1.8, s: 0.95, type: "oak" },
  { x: -5.3, z: 5.1, s: 0.85, type: "oak" },
  { x: 3.7, z: 6.6, s: 0.95, type: "pine" },
  { x: 0.5, z: 7.1, s: 0.75, type: "oak" },
  { x: 8.2, z: 4.7, s: 0.65, type: "pine" },
  { x: -8.0, z: -2.2, s: 0.75, type: "pine" },
  { x: -8.4, z: 4.3, s: 0.6, type: "oak" },
];

function createTree(rng, mats, type, scale) {
  const group = new THREE.Group();

  if (type === "pine") {
    const h = 2.5 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.17 * scale, h, 6), mats.trunk);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    for (let i = 0; i < 4; i++) {
      const r = (1.24 - i * 0.24) * scale;
      const coneH = (1.16 - i * 0.11) * scale;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r, coneH, 7, 1),
        mats.pine[i % mats.pine.length]
      );
      cone.position.y = h * 0.56 + i * 0.58 * scale;
      cone.rotation.y = rng() * Math.PI;
      cone.castShadow = true;
      group.add(cone);
    }
    return group;
  }

  const h = 2.2 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.24 * scale, h, 6), mats.trunk);
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  for (let i = 0; i < 2; i++) {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028 * scale, 0.075 * scale, 0.95 * scale, 5),
      mats.trunk
    );
    branch.position.set(0, h * 0.72 + i * 0.16 * scale, 0);
    branch.rotation.z = (i === 0 ? 1 : -1) * 0.72;
    branch.rotation.y = rng() * Math.PI;
    branch.castShadow = true;
    group.add(branch);
  }

  const blobs = 4 + Math.floor(rng() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = (0.72 + rng() * 0.52) * scale;
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      mats.foliage[Math.floor(rng() * mats.foliage.length)]
    );
    const a = (i / blobs) * Math.PI * 2 + rng() * 0.9;
    const rad = (i === 0 ? 0 : 0.5 + rng() * 0.55) * scale;
    leaf.position.set(
      Math.cos(a) * rad,
      h + (i === 0 ? 0.24 : 0.08 + rng() * 0.62) * scale,
      Math.sin(a) * rad
    );
    leaf.scale.y = 0.72 + rng() * 0.22;
    leaf.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);
  }

  return group;
}

function bladeGeometry() {
  const g = new THREE.BufferGeometry();
  const w = 0.038;
  const h = 0.44;
  const positions = new Float32Array([
    -w, 0, 0,
    w, 0, 0,
    -w * 0.72, h * 0.45, 0.02,
    w * 0.72, h * 0.45, 0.02,
    0, h, 0.055,
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  g.computeVertexNormals();
  return g;
}

function addGrass(group, rng, count, uTime) {
  const geo = bladeGeometry();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      /* glsl */ `
      #include <begin_vertex>
      vec4 swayOrigin = instanceMatrix * vec4(position, 1.0);
      float bend = pow(max(position.y, 0.0) / 0.44, 1.6);
      transformed.x += sin(uTime * 1.35 + swayOrigin.x * 0.8 + swayOrigin.z * 0.6) * 0.075 * bend;
      transformed.z += cos(uTime * 1.05 + swayOrigin.x * 0.5) * 0.042 * bend;
      `
    );
  };
  mat.customProgramCacheKey = () => "ecocure-grass";

  const transforms = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 9.7;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.25) continue;

    dummy.position.set(x, surfaceHeight(x, z) - 0.02, z);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    const s = 0.7 + rng() * 1.05;
    dummy.scale.set(s, s * (0.75 + rng() * 0.7), s);
    dummy.updateMatrix();
    transforms.push(dummy.matrix.clone());
  }

  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  const color = new THREE.Color();
  transforms.forEach((matrix, i) => {
    mesh.setMatrixAt(i, matrix);
    color.setHSL(0.23 + rng() * 0.055, 0.3 + rng() * 0.22, 0.26 + rng() * 0.16);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addFlowers(group, rng, count) {
  const stems = [];
  const heads = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = 1.2 + Math.sqrt(rng()) * 8.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.3) continue;

    const y = surfaceHeight(x, z);
    const s = 0.7 + rng() * 0.8;
    stems.push({ x, y, z, s, rot: rng() * Math.PI });
    heads.push({ x, y: y + 0.41 * s, z, s, rot: rng() * Math.PI });
  }

  const stemMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.011, 0.016, 0.42, 4),
    new THREE.MeshStandardMaterial({ color: 0x4f7138, roughness: 1, flatShading: true }),
    stems.length
  );
  stems.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 0.21 * p.s, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    stemMesh.setMatrixAt(i, dummy.matrix);
  });
  stemMesh.instanceMatrix.needsUpdate = true;
  group.add(stemMesh);

  const headGeo = new THREE.CircleGeometry(0.062, 5);
  headGeo.rotateX(-Math.PI / 2);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, heads.length);
  const palette = [0xf4eed6, 0xf0d59a, 0xe8b9c4, 0xdfe7c4, 0xf6e3b5];
  const color = new THREE.Color();
  heads.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set((rng() - 0.5) * 0.2, p.rot, (rng() - 0.5) * 0.2);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);
    color.setHex(palette[Math.floor(rng() * palette.length)]);
    headMesh.setColorAt(i, color);
  });
  headMesh.instanceMatrix.needsUpdate = true;
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;
  group.add(headMesh);

  return heads.map((p) => new THREE.Vector3(p.x, p.y + 0.1, p.z));
}

function addBushes(group, rng, mats) {
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    const r = 3.4 + rng() * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.8) continue;

    const bush = new THREE.Group();
    const s = 0.35 + rng() * 0.35;
    const blobs = 2 + Math.floor(rng() * 3);
    for (let b = 0; b < blobs; b++) {
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(s * (0.7 + rng() * 0.5), 0),
        mats.foliage[Math.floor(rng() * mats.foliage.length)]
      );
      leaf.position.set((rng() - 0.5) * s * 1.8, s * 0.55 + rng() * s * 0.3, (rng() - 0.5) * s * 1.8);
      leaf.scale.y = 0.75;
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      bush.add(leaf);
    }
    bush.position.set(x, surfaceHeight(x, z), z);
    group.add(bush);
  }
}

function addMushrooms(group, rng, mats, x, z, count = 3) {
  const base = surfaceHeight(x, z);
  for (let i = 0; i < count; i++) {
    const s = 0.55 + rng() * 0.65;
    const ox = (rng() - 0.5) * 0.5;
    const oz = (rng() - 0.5) * 0.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * s, 0.035 * s, 0.22 * s, 5), mats.mushroomStem);
    stem.position.set(x + ox, base + 0.11 * s, z + oz);
    stem.castShadow = true;
    group.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      rng() > 0.45 ? mats.mushroomCap : mats.mushroomCapPale
    );
    cap.position.set(x + ox, base + 0.21 * s, z + oz);
    cap.scale.y = 0.55;
    cap.rotation.y = rng() * Math.PI;
    cap.castShadow = true;
    group.add(cap);
  }
}

function addMoss(group, rng, mats) {
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2;
    const r = 1.5 + rng() * 7.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.5) continue;
    const patch = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rng() * 0.3, 0), mats.moss);
    patch.position.set(x, surfaceHeight(x, z) + 0.03, z);
    patch.scale.set(1.4, 0.16, 1.1);
    patch.rotation.y = rng() * Math.PI;
    patch.receiveShadow = true;
    group.add(patch);
  }
}

export function buildVegetation(scene, rng, mats, opts = {}) {
  const group = new THREE.Group();
  const uTime = { value: 0 };

  for (const t of TREES) {
    const tree = createTree(rng, mats, t.type, t.s);
    tree.position.set(t.x, surfaceHeight(t.x, t.z), t.z);
    tree.rotation.y = rng() * Math.PI * 2;
    group.add(tree);
  }

  addGrass(group, rng, opts.grass ?? 1500, uTime);
  const flowerPoints = addFlowers(group, rng, opts.flowers ?? 130);
  addBushes(group, rng, mats);
  addMoss(group, rng, mats);

  addMushrooms(group, rng, mats, -1.05, 3.15, 4);
  addMushrooms(group, rng, mats, -4.55, 0.25, 3);
  addMushrooms(group, rng, mats, 5.3, -3.0, 3);
  addMushrooms(group, rng, mats, -0.2, 3.75, 2);

  scene.add(group);

  return {
    group,
    flowerPoints,
    update(t) {
      uTime.value = t;
    },
  };
}
