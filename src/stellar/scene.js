import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { $ } from './core/dom.js';
import { createGalaxy } from './galaxy.js';
import { createBlackHole } from './blackhole.js';
import { createBodies } from './bodies.js';
import { makeNebulaTexture, makePointTexture } from './textures.js';

export const BASE_DIST = 8.9;

export function createScene(app) {
  const S = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    composer: null,
    galaxyGroup: null,
    planetGroup: null,
    planetObjs: new Map(),
    starTexture: null,
    clock: null,
    VW: 0,
    VH: 0,
    DPR: 1,
    BASE_DIST,
    needsRender: true,
    raf: 0,
    low: false,
    paused: false,
    disposed: false,
  };
  const refs = app.refs;
  let galaxy = null;
  let blackHole = null;
  let bodies = null;
  let bgTexture = null;
  let bgKey = '';
  let bgRequest = 0;

  // Image / solid-colour backdrop, driven by the tuning panel. Both paths
  // always set a clear colour so a failed image still has a usable fallback.
  function applyBackground() {
    if (!S.scene) return;
    const tune = app.tune;
    const colorHex = String(tune.bgColor || '#03060c');
    const color = new THREE.Color(colorHex);
    document.documentElement.style.setProperty('--bg', colorHex);
    S.renderer?.setClearColor(color, 1);

    const url = String(tune.bgImageUrl || '').trim();
    if (!tune.bgUseImage || !url) {
      if (bgKey !== `color|${colorHex}`) {
        bgKey = `color|${colorHex}`;
        bgRequest++;
        if (bgTexture) {
          bgTexture.dispose();
          bgTexture = null;
        }
        S.scene.background = color;
        S.needsRender = true;
      }
      return;
    }

    const key = `image|${url}`;
    if (key === bgKey) return;
    bgKey = key;
    const request = ++bgRequest;
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        if (request !== bgRequest || S.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        if (bgTexture) bgTexture.dispose();
        bgTexture = texture;
        S.scene.background = texture;
        S.needsRender = true;
      },
      undefined,
      () => {
        if (request !== bgRequest) return;
        if (bgTexture) {
          bgTexture.dispose();
          bgTexture = null;
        }
        S.scene.background = color;
        S.needsRender = true;
      },
    );
  }

  function setup() {
    S.VW = $('#space')?.clientWidth || window.innerWidth;
    S.VH = $('#space')?.clientHeight || window.innerHeight;
    S.DPR = Math.min(1.5, window.devicePixelRatio || 1);
    const requestedQuality = app.options.quality || new URLSearchParams(location.search).get('quality') || 'high';
    S.low = requestedQuality === 'low'
      || (requestedQuality === 'auto' && ((window.devicePixelRatio || 1) > 2 || (navigator.hardwareConcurrency || 8) <= 4));
    if (S.low) S.DPR = 1;
    document.documentElement.classList.toggle('low-quality', S.low);
    refs.DPR = S.DPR;

    try {
      S.renderer = new THREE.WebGLRenderer({
        canvas: $('#sky'),
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      const status = $('#bootStatus');
      if (status) {
        status.textContent = '当前环境无法创建 WebGL。请开启浏览器硬件加速，或使用桌面 Chrome。';
        status.classList.add('error');
      }
      throw err;
    }

    S.renderer.setPixelRatio(S.DPR);
    S.renderer.setSize(S.VW, S.VH, false);
    S.renderer.setClearColor(0x03060c, 1);
    S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    S.renderer.toneMappingExposure = 0.92;
    S.renderer.outputColorSpace = THREE.SRGBColorSpace;

    S.scene = new THREE.Scene();
    S.starTexture = makePointTexture();
    // Procedural nebula is the immediate fallback; applyBackground() replaces
    // it with the tuned image or solid colour once the scene is ready.
    S.scene.background = makeNebulaTexture();

    S.camera = new THREE.PerspectiveCamera(52, S.VW / S.VH, 0.1, 100);
    S.camera.position.set(0, 2.6, BASE_DIST);

    S.galaxyGroup = new THREE.Group();
    S.scene.add(S.galaxyGroup);

    galaxy = createGalaxy({ scene: S.scene, galaxyGroup: S.galaxyGroup, starTexture: S.starTexture, refs });
    galaxy.build();

    blackHole = createBlackHole(app, S, refs);
    S.blackHole = blackHole;
    blackHole.buildPass();

    // Projects closer to the camera than the black hole are rendered after the
    // BH pass, so they occlude it; projects behind stay in the main scene and
    // are occluded by it. The two roots share the same rotation.
    refs.frontScene = new THREE.Scene();
    refs.frontRoot = new THREE.Group();
    refs.frontScene.add(refs.frontRoot);

    S.planetGroup = new THREE.Group();
    S.galaxyGroup.add(S.planetGroup);
    for (const p of app.data.projects) {
      const anchor = new THREE.Object3D();
      anchor.position.set(p.x, 0.035, p.y);
      S.planetGroup.add(anchor);
      S.planetObjs.set(p.id, anchor);
    }

    bodies = createBodies(app, S, refs);
    bodies.build();
    S.bodies = bodies;

    S.composer = new EffectComposer(S.renderer);
    S.composer.setPixelRatio(S.DPR);
    S.composer.setSize(S.VW, S.VH);
    S.composer.addPass(new RenderPass(S.scene, S.camera));
    if (refs.bhPass) S.composer.addPass(refs.bhPass);
    if (refs.frontScene) {
      const frontPass = new RenderPass(refs.frontScene, S.camera);
      frontPass.clear = false;
      S.composer.addPass(frontPass);
      refs.frontPass = frontPass;
    }
    if (!S.low) {
      refs.bloomPass = new UnrealBloomPass(new THREE.Vector2(S.VW, S.VH), 0.1, 0.45, 0.97);
      S.composer.addPass(refs.bloomPass);
    }

    S.clock = new THREE.Clock();
    refs.inflowTime = 0;
    $('#leaderLayer')?.setAttribute('viewBox', `0 0 ${S.VW} ${S.VH}`);
    const boot = $('#bootStatus');
    if (boot) boot.style.display = 'none';

    app.tuning.apply();
  }

  function frame() {
    if (S.disposed || S.paused) return;
    const dt = Math.min(0.05, S.clock.getDelta());
    const now = performance.now();

    if (app.state.motion && !app.state.backgroundPaused) {
      S.galaxyGroup.rotation.y += dt * 0.012 * (app.tune.galaxySpeed || 0);
      if (refs.riverGroup) refs.riverGroup.rotation.y += dt * 0.004 * (app.tune.riverSpeed || 0);
      if (refs.deepGroup) refs.deepGroup.rotation.y -= dt * 0.0022 * (app.tune.riverSpeed || 0);
      if (refs.dustMaterial) refs.dustMaterial.uniforms.uTime.value = now * 0.001;
      if (refs.inflowMaterial) {
        refs.inflowTime = (refs.inflowTime || 0) + dt * (app.tune.inflowSpeed || 0);
        refs.inflowMaterial.uniforms.uTime.value = refs.inflowTime;
      }
      if (refs.deepMaterial) refs.deepMaterial.uniforms.uTime.value = now * 0.001;
      S.needsRender = true;
    }

    S.controls?.update();
    blackHole?.update(now);
    bodies?.update(now);

    if (S.needsRender) {
      S.composer.render();
      app.updatePlanets?.();
      S.needsRender = false;
    }
    S.raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(S.raf);
    S.paused = false;
    S.needsRender = true;
    S.clock?.start();
    S.raf = requestAnimationFrame(frame);
  }

  /** Stop the RAF loop and timers while the host view is hidden. */
  function pause() {
    if (S.disposed || S.paused) return;
    S.paused = true;
    cancelAnimationFrame(S.raf);
    S.raf = 0;
    S.clock?.stop();
    app.hud?.pause?.();
    app.signals?.pauseDemo?.();
  }

  function resume() {
    if (S.disposed || !S.paused) return;
    app.hud?.resume?.();
    app.signals?.resumeDemo?.();
    start();
  }

  function requestRender() {
    S.needsRender = true;
  }

  function renderOnce() {
    if (!S.composer) return;
    blackHole?.update(performance.now());
    S.composer.render();
    app.updatePlanets?.();
    S.needsRender = false;
  }

  function resize() {
    S.VW = $('#space')?.clientWidth || window.innerWidth;
    S.VH = $('#space')?.clientHeight || window.innerHeight;
    if (!S.renderer) return;
    S.camera.aspect = S.VW / S.VH;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(S.VW, S.VH, false);
    S.composer.setSize(S.VW, S.VH);
    refs.bloomPass?.setSize(S.VW, S.VH);
    S.needsRender = true;
    $('#leaderLayer')?.setAttribute('viewBox', `0 0 ${S.VW} ${S.VH}`);
    app.updateLeader?.();
    renderOnce();
  }

  function setupControls() {
    const space = $('#space');
    if (!space) return;
    S.controls = new OrbitControls(S.camera, space);
    S.controls.enableDamping = true;
    S.controls.dampingFactor = 0.065;
    S.controls.enablePan = true;
    S.controls.screenSpacePanning = true;
    S.controls.panSpeed = 0.8;
    S.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
    S.controls.rotateSpeed = 0.55;
    S.controls.zoomSpeed = 0.85;
    S.controls.zoomToCursor = true;
    S.controls.minDistance = 3;
    S.controls.maxDistance = 12.2;
    S.controls.minPolarAngle = 0.38;
    S.controls.maxPolarAngle = Math.PI * 0.49;
    S.controls.target.set(0, 0, 0);
    S.controls.update();

    S.controls.addEventListener('change', () => {
      if (S.controls.target.length() > 5.5) S.controls.target.setLength(5.5);
      S.needsRender = true;
    });
    space.addEventListener('wheel', () => { S.needsRender = true; }, { passive: true });

    let downX = 0;
    let downY = 0;
    space.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });
    space.addEventListener('pointerup', (e) => {
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) app.suppressClickUntil = performance.now() + 260;
    });

    // OrbitControls captures pointer events, so keep an explicit planet
    // click fallback and an empty-space deselect path.
    let downPlanet = null;
    let planetX = 0;
    let planetY = 0;
    let downTarget = null;
    space.addEventListener('pointerdown', (e) => {
      downPlanet = e.target.closest?.('.star') || null;
      planetX = e.clientX;
      planetY = e.clientY;
      downTarget = e.target;
    }, true);
    space.addEventListener('pointerup', (e) => {
      const dx = Math.abs(e.clientX - planetX);
      const dy = Math.abs(e.clientY - planetY);
      const el = downPlanet;
      downPlanet = null;
      if (el) {
        if (dx + dy > 6) return;
        const project = app.byId(el.dataset.project);
        if (!project) return;
        app.suppressClickUntil = performance.now() + 160;
        app.activateProject(project.id, el);
        return;
      }
      if (dx + dy > 6) return;
      if (downTarget?.closest?.('.reset-view')) return;
      app.state.selected = null;
      app.state.hovered = null;
      app.renderTarget(null);
      app.setFocus();
    }, true);

    S.controls.addEventListener('start', () => {
      const hint = $('#hint');
      if (hint) hint.style.opacity = '0';
    });

    $('#resetView')?.addEventListener('click', () => {
      S.camera.position.set(0, 2.6, window.innerWidth < 900 ? 10.8 : BASE_DIST);
      S.controls.target.set(0, 0, 0);
      S.controls.update();
      app.updatePlanets?.();
    });

    window.addEventListener('resize', resize);
  }

  function dispose() {
    S.disposed = true;
    cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', resize);
    S.controls?.dispose();
    S.composer?.dispose?.();
    bodies?.dispose();
    S.renderer?.dispose();
    bgTexture?.dispose();
    bgTexture = null;
  }

  return {
    S, setup, setupControls, start, pause, resume,
    isPaused: () => S.paused,
    requestRender, renderOnce, resize, dispose, applyBackground,
  };
}
