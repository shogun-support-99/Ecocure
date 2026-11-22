import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mulberry32, std } from "./util.js";
import { buildTerrain } from "./terrain.js";
import { buildVegetation } from "./vegetation.js";
import { buildCreatures } from "./creatures.js";

/* ------------------------------------------------------------
   EcocureWorld — one persistent Three.js island.
   Native scroll is the conductor; the camera travels between
   six authored compositions while the world stays alive.
   ------------------------------------------------------------ */

const STOPS = [
  { pos: [18, 6.0, 24], look: [0, 0.1, 0], fov: 38 },
  { pos: [-8.6, 4.2, 9.6], look: [-3.0, 3.2, -1.2], fov: 40 },
  { pos: [9.4, 3.4, 10.6], look: [0.6, 1.2, 0.4], fov: 38 },
  { pos: [-2.5, 2.6, 8.6], look: [-1.2, 0.7, 2.7], fov: 42 },
  { pos: [-18, 11, 20], look: [0, -0.4, 0], fov: 38 },
  { pos: [0, 15, 26], look: [0, -0.2, 0], fov: 36 },
];

const FOCUS = {
  oak: { pos: [4.2, 4.4, 7.2], look: [-3.0, 3.2, -1.2], fov: 40 },
  deer: { pos: [5.6, 2.2, 5.2], look: [0.7, 1.1, 0.5], fov: 38 },
  fungi: { pos: [2.0, 1.4, 5.6], look: [-1.2, 0.5, 2.7], fov: 42 },
  fox: { pos: [8.2, 2.4, 3.2], look: [5.3, 0.9, -0.9], fov: 38 },
};

const DAY = {
  top: new THREE.Color(0x0e2a22),
  mid: new THREE.Color(0x3f5a3e),
  bottom: new THREE.Color(0x94885a),
  fog: new THREE.Color(0x111e17),
  sun: new THREE.Color(0xffd2a0),
};

const NIGHT = {
  top: new THREE.Color(0x050b10),
  mid: new THREE.Color(0x0b1a1d),
  bottom: new THREE.Color(0x1b2a24),
  fog: new THREE.Color(0x081014),
  sun: new THREE.Color(0xa9c6c0),
};

export class EcocureWorld {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.hotspotEls = opts.hotspotEls || {};
    this.mobile = window.matchMedia("(max-width: 900px)").matches;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.rng = mulberry32(20261122);

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.scroll = 0;
    this.scrollTarget = 0;
    this.night = 0;
    this.focus = null;
    this.hotspotsEnabled = false;

    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.camPos = new THREE.Vector3(...STOPS[0].pos);
    this.camLook = new THREE.Vector3(...STOPS[0].look);
    this.fov = STOPS[0].fov;
    this.tmp = new THREE.Vector3();
    this.tmpColor = new THREE.Color();

    this.anchors = {
      oak: new THREE.Vector3(-3.2, 4.75, -1.2),
      deer: new THREE.Vector3(0.55, 2.05, 0.55),
      fungi: new THREE.Vector3(-1.15, 0.55, 2.72),
    };

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0e1b15, 0.017);

    this.camera = new THREE.PerspectiveCamera(this.fov, this.width / this.height, 0.1, 140);
    this.camera.position.set(...STOPS[0].pos);
    this.camera.lookAt(...STOPS[0].look);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.mobile,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 1.8));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setClearColor(0x070d0a, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.buildMaterials();
    this.buildSky();
    this.buildLights();

    this.terrain = buildTerrain(this.scene, this.rng, this.mats);
    this.vegetation = buildVegetation(this.scene, this.rng, this.mats, {
      grass: this.mobile ? 750 : 1500,
      flowers: this.mobile ? 80 : 130,
    });
    this.creatures = buildCreatures(this.scene, this.rng, this.mats);

    this.buildPost();
    this.resize();

    window.addEventListener("resize", () => this.resize());
  }

  buildMaterials() {
    this.mats = {
      trunk: std(0x4a3928),
      bark: std(0x453528),
      root: std(0x3a2d20),
      foliage: [std(0x3d6138), std(0x4b7140), std(0x5b8248), std(0x6c9451)],
      pine: [std(0x2f4d32), std(0x3b5d39), std(0x486b40)],
      moss: std(0x5d7c3f),
      rock: std(0x3f3d34),
      lily: std(0x4c7a3e, { side: THREE.DoubleSide }),
      lilyFlower: std(0xf1e6c8),
      fungus: std(0x9a7250),
      mushroomStem: std(0xcbbd9d),
      mushroomCap: std(0xa8613f),
      mushroomCapPale: std(0xc9b58f),
      bird: std(0x2f3d35),
      isletTop: std(0x5c7c40),
      cloud: new THREE.MeshStandardMaterial({
        color: 0xd9e6d2,
        transparent: true,
        opacity: 0.12,
        roughness: 1,
        flatShading: true,
        depthWrite: false,
      }),
    };
  }

  buildSky() {
    const uniforms = {
      uTop: { value: DAY.top.clone() },
      uMid: { value: DAY.mid.clone() },
      uBottom: { value: DAY.bottom.clone() },
      uSunColor: { value: DAY.sun.clone() },
      uSunDir: { value: new THREE.Vector3(-10, 18, 16).normalize() },
    };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uBottom;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        varying vec3 vWorld;
        void main() {
          vec3 d = normalize(vWorld);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uBottom, uMid, smoothstep(0.34, 0.52, h));
          col = mix(col, uTop, smoothstep(0.52, 0.92, h));
          float sd = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * pow(sd, 240.0) * 2.4;
          col += uSunColor * pow(sd, 9.0) * 0.15;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMat = mat;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 18), mat);
    this.scene.add(this.sky);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xb6d2bb, 0x1a241b, 1.18);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffd0a0, 2.55);
    this.sun.position.set(-10, 18, 16);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    this.sun.shadow.camera.left = -16;
    this.sun.shadow.camera.right = 16;
    this.sun.shadow.camera.top = 16;
    this.sun.shadow.camera.bottom = -16;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 50;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.sun.target.position.set(0, 0, 0);
    this.scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0x7fa7c9, 0.5);
    this.fill.position.set(10, 7, 12);
    this.scene.add(this.fill);

    // A cool uplight keeps the rock underside readable against the sky.
    this.under = new THREE.DirectionalLight(0x9fceb0, 2.0);
    this.under.position.set(2, -14, 10);
    this.under.target.position.set(0, -2, 0);
    this.scene.add(this.under);
    this.scene.add(this.under.target);

    // Warm rim from behind the island.
    this.rim = new THREE.DirectionalLight(0xffc78f, 0.55);
    this.rim.position.set(0, 5, -18);
    this.scene.add(this.rim);
  }

  buildPost() {
    if (this.mobile) return;
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.width, this.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.5, 0.7, 0.84);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 1.8));
    this.renderer.setSize(this.width, this.height, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(this.width, this.height);
    }
  }

  setScroll(progress) {
    this.scrollTarget = THREE.MathUtils.clamp(progress, 0, 1);
  }

  setPointer(x, y) {
    this.pointerTarget.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1)
    );
  }

  setFocus(id) {
    const f = FOCUS[id];
    this.focus = f ? { pos: new THREE.Vector3(...f.pos), look: new THREE.Vector3(...f.look), fov: f.fov } : null;
    return Boolean(f);
  }

  setHotspotsEnabled(value) {
    this.hotspotsEnabled = value;
  }

  updateCamera(dt) {
    this.scroll += (this.scrollTarget - this.scroll) * Math.min(1, dt * 5.2);
    this.pointer.lerp(this.pointerTarget, Math.min(1, dt * 5));

    const t = this.scroll * (STOPS.length - 1);
    const i = Math.min(STOPS.length - 2, Math.max(0, Math.floor(t)));
    const f = THREE.MathUtils.clamp(t - i, 0, 1);
    const e = f * f * (3 - 2 * f);
    const a = STOPS[i];
    const b = STOPS[i + 1];

    const targetPos = this.tmp.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], e),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], e),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], e)
    );
    const targetLook = new THREE.Vector3(
      THREE.MathUtils.lerp(a.look[0], b.look[0], e),
      THREE.MathUtils.lerp(a.look[1], b.look[1], e),
      THREE.MathUtils.lerp(a.look[2], b.look[2], e)
    );
    let targetFov = THREE.MathUtils.lerp(a.fov, b.fov, e);

    if (this.focus) {
      targetPos.copy(this.focus.pos);
      targetLook.copy(this.focus.look);
      targetFov = this.focus.fov;
    }

    const k = 1 - Math.exp(-dt * (this.focus ? 2.4 : 1.9));
    this.camPos.lerp(targetPos, k);
    this.camLook.lerp(targetLook, k);
    this.fov += (targetFov - this.fov) * k;

    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    const still = this.reduced ? 0 : 1;
    const driftX = Math.sin(this.elapsed * 0.17) * 0.22 * still;
    const driftY = Math.cos(this.elapsed * 0.21) * 0.1 * still;
    const parX = this.pointer.x * 0.7 * still;
    const parY = this.pointer.y * 0.42 * still;

    this.camera.position.set(
      this.camPos.x + driftX + parX,
      this.camPos.y + driftY + parY,
      this.camPos.z
    );
    this.camera.lookAt(
      this.camLook.x + this.pointer.x * 0.28 * still,
      this.camLook.y + this.pointer.y * 0.18 * still,
      this.camLook.z
    );
  }

  updateEnvironment() {
    this.night = Math.exp(-Math.pow((this.scroll - 0.6) / 0.16, 2));

    const u = this.skyMat.uniforms;
    u.uTop.value.lerpColors(DAY.top, NIGHT.top, this.night);
    u.uMid.value.lerpColors(DAY.mid, NIGHT.mid, this.night);
    u.uBottom.value.lerpColors(DAY.bottom, NIGHT.bottom, this.night);
    u.uSunColor.value.lerpColors(DAY.sun, NIGHT.sun, this.night);

    this.scene.fog.color.lerpColors(DAY.fog, NIGHT.fog, this.night);
    this.scene.fog.density = 0.016 + this.night * 0.006;
    this.sun.intensity = 2.55 - this.night * 1.2;
    this.hemi.intensity = 1.18 - this.night * 0.38;
    this.fill.intensity = 0.5 + this.night * 0.2;
    this.under.intensity = 2.0 - this.night * 0.35;
    this.rim.intensity = 0.55 + this.night * 0.15;
    this.renderer.toneMappingExposure = 1.04 - this.night * 0.08;
  }

  updateHotspots() {
    const v = this.tmp;
    for (const [id, pos] of Object.entries(this.anchors)) {
      const el = this.hotspotEls[id];
      if (!el) continue;

      v.copy(pos).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * this.width;
      const y = (-v.y * 0.5 + 0.5) * this.height;
      const visible =
        this.hotspotsEnabled &&
        v.z > -1 &&
        v.z < 1 &&
        x > 30 &&
        x < this.width - 30 &&
        y > 90 &&
        y < this.height - 70 &&
        this.scroll < 0.87;

      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-5px, -50%)`;
      el.classList.toggle("is-visible", visible);
    }
  }

  render(dt) {
    const step = Math.min(dt, 0.05);
    this.elapsed += step;

    this.terrain.update(this.elapsed);
    this.vegetation.update(this.elapsed);
    this.creatures.update(this.elapsed, this.night);

    this.updateCamera(step);
    this.updateEnvironment();
    this.updateHotspots();

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  start(loop) {
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      if (document.hidden) return;
      this.render(this.clock.getDelta());
      if (loop) loop(this.elapsed);
    });
  }
}
