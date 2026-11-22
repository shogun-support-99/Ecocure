import * as THREE from "three";
import { POND, radialTexture, surfaceHeight, std } from "./util.js";

/* ------------------------------------------------------------
   Creatures & atmosphere: roe deer and fawn, a sitting fox,
   circling birds, butterflies, fireflies, pollen, distant
   islets and slow clouds.
   ------------------------------------------------------------ */

function deerMaterials() {
  return {
    fur: std(0x916844, { roughness: 1 }),
    furLight: std(0xac8055, { roughness: 1 }),
    cream: std(0xd6c6a9, { roughness: 1 }),
    dark: std(0x2a221b, { roughness: 0.9 }),
    antler: std(0x8a7a5f, { roughness: 1 }),
  };
}

function createDeer(rng, mats, { fawn = false } = {}) {
  const g = new THREE.Group();
  const bodyY = 1.02;
  const fur = fawn ? mats.furLight : mats.fur;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.62, 4, 8), fur);
  torso.rotation.z = Math.PI / 2;
  torso.scale.set(1, 1, 0.9);
  torso.position.set(0, bodyY, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  g.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), fur);
  chest.position.set(0.4, bodyY, 0);
  chest.castShadow = true;
  g.add(chest);

  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 6), fur);
  haunch.position.set(-0.4, bodyY + 0.01, 0);
  haunch.castShadow = true;
  g.add(haunch);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 5), mats.cream);
  belly.scale.set(1.5, 0.55, 0.85);
  belly.position.set(0, bodyY - 0.24, 0);
  g.add(belly);

  // Neck and head.
  const neck = new THREE.Group();
  neck.position.set(0.48, bodyY + 0.12, 0);
  neck.rotation.z = -0.78;
  const neckMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.42, 3, 7), fur);
  neckMesh.position.y = 0.24;
  neckMesh.castShadow = true;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = 0.52;
  head.rotation.z = 0.66;

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), fur);
  skull.scale.set(1.35, 1, 0.92);
  skull.castShadow = true;
  head.add(skull);

  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.26, 6), mats.furLight);
  muzzle.rotation.z = -Math.PI / 2;
  muzzle.position.set(0.2, -0.01, 0);
  head.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), mats.dark);
  nose.position.set(0.335, -0.01, 0);
  head.add(nose);

  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), mats.dark);
    eye.position.set(0.13, 0.035, side * 0.115);
    head.add(eye);
    eyes.push(eye);
  }

  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.18, 4), mats.furLight);
    ear.position.set(-0.01, 0.15, side * 0.11);
    ear.rotation.z = side * 0.22;
    ear.rotation.x = side * 0.2;
    ear.castShadow = true;
    head.add(ear);
    ears.push(ear);
  }

  if (!fawn) {
    for (const side of [-1, 1]) {
      const antler = new THREE.Group();
      antler.position.set(-0.02, 0.15, side * 0.06);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.4, 4), mats.antler);
      beam.position.y = 0.2;
      beam.rotation.z = -0.22;
      beam.rotation.x = side * 0.28;
      antler.add(beam);

      for (let i = 0; i < 2; i++) {
        const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.013, 0.19, 4), mats.antler);
        tine.position.set(0.03 + i * 0.03, 0.24 + i * 0.11, side * (0.06 + i * 0.02));
        tine.rotation.z = 0.7;
        tine.rotation.x = side * 0.4;
        antler.add(tine);
      }
      head.add(antler);
    }
  }

  neck.add(head);
  g.add(neck);

  // Legs.
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.038, 0.032, 0.68, 5);
  const hoofGeo = new THREE.BoxGeometry(0.075, 0.07, 0.065);
  for (const [x, z] of [
    [0.38, 0.19],
    [0.38, -0.19],
    [-0.38, 0.19],
    [-0.38, -0.19],
  ]) {
    const leg = new THREE.Group();
    leg.position.set(x, bodyY - 0.22, z);
    const limb = new THREE.Mesh(legGeo, fur);
    limb.position.y = -0.34;
    limb.castShadow = true;
    leg.add(limb);
    const hoof = new THREE.Mesh(hoofGeo, mats.dark);
    hoof.position.y = -0.69;
    leg.add(hoof);
    g.add(leg);
    legs.push(leg);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 5), mats.cream);
  tail.position.set(-0.66, bodyY + 0.1, 0);
  tail.rotation.z = 1.15;
  g.add(tail);

  if (fawn) {
    for (let i = 0; i < 7; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), mats.cream);
      spot.position.set(
        -0.25 + rng() * 0.55,
        bodyY + 0.14 + (rng() - 0.5) * 0.18,
        (rng() - 0.5) * 0.42
      );
      g.add(spot);
    }
  }

  g.userData.rig = { head, neck, tail, legs, ears, baseY: bodyY };
  return g;
}

function foxMaterials() {
  return {
    fur: std(0xc4693a, { roughness: 1 }),
    pale: std(0xe7d8bd, { roughness: 1 }),
    dark: std(0x241d17, { roughness: 0.9 }),
  };
}

function createFox(mats) {
  const g = new THREE.Group();
  const fur = mats.fur;

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.36, 4, 7), fur);
  body.position.y = 0.58;
  body.rotation.x = 0.18;
  body.castShadow = true;
  g.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 6), mats.pale);
  chest.scale.set(0.9, 1.15, 0.75);
  chest.position.set(0, 0.6, 0.1);
  g.add(chest);

  const head = new THREE.Group();
  head.position.set(0, 0.92, 0.06);

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), fur);
  skull.scale.set(0.95, 0.9, 1.05);
  skull.castShadow = true;
  head.add(skull);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 5), mats.pale);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.03, 0.2);
  head.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 5, 4), mats.dark);
  nose.position.set(0, -0.02, 0.34);
  head.add(nose);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 4), fur);
    ear.position.set(side * 0.1, 0.17, -0.01);
    ear.rotation.z = side * 0.16;
    ear.castShadow = true;
    head.add(ear);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), mats.dark);
    tip.position.set(side * 0.1, 0.26, -0.01);
    head.add(tip);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), mats.dark);
    eye.position.set(side * 0.08, 0.04, 0.145);
    head.add(eye);
  }

  g.add(head);

  // Curved tail.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.46, -0.16),
    new THREE.Vector3(-0.18, 0.42, -0.5),
    new THREE.Vector3(-0.38, 0.62, -0.6),
    new THREE.Vector3(-0.46, 0.86, -0.44),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.085, 6, false), fur);
  tail.castShadow = true;
  g.add(tail);

  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 6, 5), mats.pale);
  tailTip.position.set(-0.46, 0.87, -0.44);
  g.add(tailTip);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.38, 5), fur);
    leg.position.set(side * 0.11, 0.24, 0.14);
    leg.rotation.x = -0.05;
    leg.castShadow = true;
    g.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), mats.dark);
    paw.position.set(side * 0.11, 0.045, 0.16);
    g.add(paw);
  }

  g.userData.rig = { head, tail };
  return g;
}

function createBird(mats, tint) {
  const g = new THREE.Group();
  const bodyMat = tint ? std(tint, { roughness: 1 }) : mats.bird;

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.36, 5), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), bodyMat);
  head.position.z = 0.19;
  g.add(head);

  const wings = [];
  const wingGeo = new THREE.PlaneGeometry(0.38, 0.16);
  wingGeo.translate(0, 0, 0);
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.02, 0);
    const wing = new THREE.Mesh(
      wingGeo,
      new THREE.MeshStandardMaterial({
        color: tint || 0x2c3a33,
        roughness: 1,
        side: THREE.DoubleSide,
        flatShading: true,
      })
    );
    wing.position.x = side * 0.19;
    wing.rotation.x = -Math.PI / 2;
    pivot.add(wing);
    g.add(pivot);
    wings.push({ pivot, side });
  }

  g.userData.wings = wings;
  return g;
}

function createButterfly(rng) {
  const g = new THREE.Group();
  const palette = [0xe9b981, 0xf1e6c8, 0xd9a26b, 0xc9d8b0];
  const color = palette[Math.floor(rng() * palette.length)];
  const wingMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.09, 3, 5), std(0x2b2319));
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    const wingGeo = new THREE.CircleGeometry(0.085, 3);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.x = side * 0.07;
    wing.rotation.x = -Math.PI / 2;
    wing.rotation.z = side * 0.2;
    pivot.add(wing);
    g.add(pivot);
    wings.push({ pivot, side });
  }

  g.userData.wings = wings;
  return g;
}

function createFireflies(scene, rng, count) {
  const positions = new Float32Array(count * 3);
  const base = [];
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = 1 + rng() * 8.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = surfaceHeight(x, z) + 0.35 + rng() * 2.2;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    base.push({ x, y, z, phase: rng() * Math.PI * 2, speed: 0.3 + rng() * 0.6 });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffe6a8,
    size: 0.11,
    map: radialTexture(),
    transparent: true,
    opacity: 0.2,
    alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  return { points, base, positions, mat };
}

function createPollen(scene, rng, count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 15;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = 0.4 + rng() * 9;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xe8efd8,
    size: 0.028,
    map: radialTexture(),
    transparent: true,
    opacity: 0.34,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return points;
}

function createIslet(rng, mats, scale = 1) {
  const g = new THREE.Group();

  const rock = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 7, 2), mats.rock);
  rock.rotation.x = Math.PI;
  rock.position.y = -1.25;
  rock.scale.setScalar(scale);
  g.add(rock);

  const top = new THREE.Mesh(new THREE.CircleGeometry(1.38, 9), mats.isletTop);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.01;
  top.scale.setScalar(scale);
  g.add(top);

  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.8, 5), mats.trunk);
  trunk.position.y = 0.4;
  tree.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mats.foliage[1]);
  crown.position.y = 0.92;
  crown.scale.y = 0.85;
  tree.add(crown);
  tree.position.set(0.2, 0, 0);
  tree.scale.setScalar(scale);
  g.add(tree);

  return g;
}

function createCloud(rng, mats) {
  const g = new THREE.Group();
  const blobs = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < blobs; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats.cloud);
    blob.position.set((rng() - 0.5) * 2.6, (rng() - 0.5) * 0.5, (rng() - 0.5) * 1.4);
    blob.scale.set(1.3 + rng() * 0.9, 0.4 + rng() * 0.25, 0.8 + rng() * 0.5);
    blob.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    g.add(blob);
  }
  return g;
}

export function buildCreatures(scene, rng, mats) {
  const group = new THREE.Group();
  const deerMats = deerMaterials();
  const foxMats = foxMaterials();

  // Roe deer and fawn near the pond edge.
  const deer = createDeer(rng, deerMats);
  const dx = 0.55;
  const dz = 0.55;
  deer.position.set(dx, surfaceHeight(dx, dz) - 0.09, dz);
  deer.rotation.y = -1.15;
  deer.scale.setScalar(1.02);
  group.add(deer);

  const fawn = createDeer(rng, deerMats, { fawn: true });
  const fx = 1.45;
  const fz = 0.05;
  fawn.position.set(fx, surfaceHeight(fx, fz) - 0.05, fz);
  fawn.rotation.y = -0.72;
  fawn.scale.setScalar(0.66);
  group.add(fawn);

  // A flat stone for the fox.
  const foxRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), mats.rock);
  const frx = 5.35;
  const frz = -0.95;
  foxRock.position.set(frx, surfaceHeight(frx, frz) + 0.18, frz);
  foxRock.scale.set(1.25, 0.42, 1);
  foxRock.rotation.y = 0.6;
  foxRock.castShadow = true;
  foxRock.receiveShadow = true;
  group.add(foxRock);

  const fox = createFox(foxMats);
  fox.position.set(frx, surfaceHeight(frx, frz) + 0.38, frz);
  fox.rotation.y = -0.55;
  fox.scale.setScalar(0.95);
  group.add(fox);

  // Birds.
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const bird = createBird(mats, i % 2 ? 0x3d4f43 : 0x33443a);
    const radius = 6.5 + rng() * 4;
    bird.userData.orbit = {
      radius,
      y: 6.6 + rng() * 3.4,
      speed: 0.08 + rng() * 0.05,
      phase: rng() * Math.PI * 2,
      cx: -0.5,
      cz: -0.8,
    };
    bird.scale.setScalar(0.9 + rng() * 0.35);
    group.add(bird);
    birds.push(bird);
  }

  // Butterflies around the flower meadow.
  const butterflies = [];
  for (let i = 0; i < 8; i++) {
    const b = createButterfly(rng);
    const a = rng() * Math.PI * 2;
    const r = 2 + rng() * 6;
    b.userData.orbit = {
      cx: Math.cos(a) * r,
      cz: Math.sin(a) * r,
      radius: 0.35 + rng() * 0.5,
      height: surfaceHeight(Math.cos(a) * r, Math.sin(a) * r) + 0.5 + rng() * 1.1,
      speed: 0.5 + rng() * 0.5,
      phase: rng() * Math.PI * 2,
    };
    b.scale.setScalar(0.9 + rng() * 0.5);
    group.add(b);
    butterflies.push(b);
  }

  // Fireflies + pollen.
  const fireflies = createFireflies(group, rng, 80);
  const pollen = createPollen(group, rng, 380);

  // Distant islets.
  const islets = [];
  const isletSpots = [
    [-15.5, -2.4, -7.5, 1.15],
    [15, 1.8, -11, 0.85],
    [11.5, -4.6, 10, 0.7],
  ];
  for (const [x, y, z, s] of isletSpots) {
    const islet = createIslet(rng, mats, s);
    islet.position.set(x, y, z);
    islet.userData.baseY = y;
    islet.userData.phase = rng() * Math.PI * 2;
    group.add(islet);
    islets.push(islet);
  }

  scene.add(group);

  const tmp = new THREE.Vector3();
  const headWorld = new THREE.Vector3();

  return {
    group,
    deer,
    fawn,
    fox,
    update(t, night) {
      // Deer idle: breathing, head turns, ear flicks, tail.
      for (const [animal, speed] of [
        [deer, 1],
        [fawn, 1.35],
      ]) {
        const rig = animal.userData.rig;
        rig.head.rotation.y = Math.sin(t * 0.42 * speed) * 0.26;
        rig.head.rotation.z = 0.66 + Math.sin(t * 0.7 * speed) * 0.045;
        rig.neck.rotation.z = -0.78 + Math.sin(t * 0.55 * speed) * 0.025;
        rig.tail.rotation.z = 1.15 + Math.sin(t * 2.1 * speed) * 0.28;
        rig.ears[0].rotation.z = -0.22 + Math.sin(t * 1.8 * speed) * 0.1;
        rig.ears[1].rotation.z = 0.22 + Math.sin(t * 1.8 * speed + 1.4) * 0.1;
        rig.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(t * 0.5 * speed + i) * 0.015;
        });
      }

      // Fox: tail sway and a slow look around.
      const foxRig = fox.userData.rig;
      foxRig.tail.rotation.y = Math.sin(t * 0.9) * 0.16;
      foxRig.tail.rotation.z = Math.sin(t * 0.7) * 0.06;
      foxRig.head.rotation.y = Math.sin(t * 0.3 + 1.2) * 0.35;
      foxRig.head.rotation.z = Math.sin(t * 0.5) * 0.03;

      // Birds circle the island.
      for (const bird of birds) {
        const o = bird.userData.orbit;
        const a = t * o.speed + o.phase;
        bird.position.set(o.cx + Math.cos(a) * o.radius, o.y + Math.sin(t * 0.6 + o.phase) * 0.25, o.cz + Math.sin(a) * o.radius);
        bird.rotation.y = -a;
        bird.rotation.z = Math.sin(t * 0.4 + o.phase) * 0.12;
        for (const { pivot, side } of bird.userData.wings) {
          pivot.rotation.z = side * (0.18 + Math.sin(t * 8 + o.phase) * 0.55);
        }
      }

      // Butterflies orbit their flowers.
      for (const b of butterflies) {
        const o = b.userData.orbit;
        const a = t * o.speed + o.phase;
        b.position.set(
          o.cx + Math.cos(a) * o.radius,
          o.height + Math.sin(t * 2.2 + o.phase) * 0.16,
          o.cz + Math.sin(a) * o.radius
        );
        b.rotation.y = -a + Math.PI / 2;
        for (const { pivot, side } of b.userData.wings) {
          pivot.rotation.y = side * (0.45 + Math.sin(t * 14 + o.phase) * 0.55);
        }
      }

      // Fireflies drift.
      const pos = fireflies.positions;
      fireflies.base.forEach((f, i) => {
        const a = f.phase + t * f.speed * 0.35;
        pos[i * 3] = f.x + Math.cos(a) * 0.35;
        pos[i * 3 + 1] = f.y + Math.sin(t * 0.9 + f.phase) * 0.22;
        pos[i * 3 + 2] = f.z + Math.sin(a) * 0.35;
      });
      fireflies.points.geometry.attributes.position.needsUpdate = true;
      fireflies.mat.opacity = 0.05 + night * 0.9 + Math.sin(t * 1.7) * 0.04;

      pollen.rotation.y = t * 0.008;

      for (const islet of islets) {
        islet.position.y = islet.userData.baseY + Math.sin(t * 0.35 + islet.userData.phase) * 0.18;
        islet.rotation.y = t * 0.01 + islet.userData.phase;
      }
    },
    // World-space anchors for the DOM markers.
    anchors: {
      deer: () => {
        headWorld.set(0.9, 1.6, 0);
        return deer.localToWorld(headWorld);
      },
      fox: () => {
        headWorld.set(0, 1.1, 0);
        return fox.localToWorld(headWorld);
      },
    },
    tmp,
  };
}
