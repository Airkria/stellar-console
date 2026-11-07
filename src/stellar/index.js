import * as THREE from 'three';
import './styles/index.css';
import { createByProject, normalizeData } from './data.js';
import { mountTemplate } from './template.js';
import { createTuning } from './tuning.js';
import { createHud } from './hud.js';
import { createStars } from './stars.js';
import { createTarget } from './target.js';
import { createLeader } from './leader.js';
import { createConsole } from './console-view.js';
import { createProjection } from './projection.js';
import { createScene, BASE_DIST } from './scene.js';
import { createTunePanel } from './tune-panel.js';
import { createSignals } from './signals.js';
import { createSkinState } from './skins/state.js';
import { listPlanetSkins, listStarSkins, registerPlanetSkin, registerStarSkin } from './skins/index.js';

export { listPlanetSkins, listStarSkins, registerPlanetSkin, registerStarSkin };

/**
 * Create a galaxy console inside `mount`.
 *
 * @param {object} config
 * @param {string|Element} config.mount  Mount point.
 * @param {object} config.data           Projects, decisions, ideas, signals, links.
 * @param {object} [config.options]
 * @param {string} [config.options.backgroundUrl] Space backdrop ('' disables).
 * @param {string} [config.options.storagePrefix] localStorage namespace.
 */
export function createStellarConsole({ mount, data: rawData, options = {} }) {
  const host = typeof mount === 'string' ? document.querySelector(mount) : mount;
  if (!host) throw new Error('[stellar-console] mount point not found');
  if (!rawData || !Array.isArray(rawData.projects)) {
    throw new Error('[stellar-console] data.projects is required');
  }

  const data = normalizeData(rawData);
  const app = {
    options,
    data,
    byId: createByProject(data.projects),
    state: {
      ideas: [...data.ideas],
      signals: [...data.signals],
      current: null,
      selected: null,
      hovered: null,
      motion: true,
      demo: true,
      backgroundPaused: false,
    },
    refs: {},
    screenPositions: new Map(),
    introStart: performance.now() * 0.001,
    suppressClickUntil: 0,
    lastTrigger: null,
  };

  mountTemplate(host, data);

  app.tuning = createTuning(app);
  app.tuning.load();
  app.tune = app.tuning.tune;
  app.skinState = createSkinState(app);

  app.hud = createHud(app);
  app.target = createTarget(app);
  app.leader = createLeader(app);
  app.console = createConsole(app);
  app.stars = createStars(app);
  app.scene = createScene(app);
  app.projection = createProjection(app);

  app.updateLeader = app.leader.update;
  app.updatePlanets = app.projection.update;
  app.renderTarget = app.target.render;
  app.setFocus = app.stars.setFocus;
  app.openProject = app.console.open;
  app.closeProject = app.console.close;
  app.requestRender = app.scene.requestRender;

  app.hud.render();
  app.hud.startClock();
  app.stars.render();

  app.scene.setup();
  app.scene.setupControls();

  app.tunePanel = createTunePanel(app);
  app.tunePanel.build();
  app.tunePanel.setOpen(app.tuning.loadPanelOpen());
  app.tuning.apply();

  app.signals = createSignals(app);
  app.toast = app.signals.toast;
  app.console.bind();
  app.signals.bind();

  app.renderTarget(null);
  app.setFocus();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.signals.setMotion(!reduceMotion);
  app.signals.setDemo(true);

  const params = new URLSearchParams(location.search);
  const motion = params.get('motion');
  if (motion === 'off') app.signals.setMotion(false);
  else if (motion === 'on') app.signals.setMotion(true);
  if (params.get('demo') === 'off') app.signals.setDemo(false);

  const defaultDistance = window.innerWidth < 900 ? 10.2 : BASE_DIST;
  const distance = Number(params.get('dist') || defaultDistance);
  const spherical = new THREE.Spherical().setFromVector3(app.scene.S.camera.position);
  spherical.radius = THREE.MathUtils.clamp(distance, app.scene.S.controls.minDistance, app.scene.S.controls.maxDistance);
  if (params.has('yaw')) spherical.theta = Number(params.get('yaw'));
  if (params.has('pitch')) {
    spherical.phi = THREE.MathUtils.clamp(
      Number(params.get('pitch')),
      app.scene.S.controls.minPolarAngle,
      app.scene.S.controls.maxPolarAngle,
    );
  }
  app.scene.S.camera.position.setFromSpherical(spherical);
  app.scene.S.controls.target.set(0, 0, 0);
  app.scene.S.controls.update();

  const openId = params.get('open');
  if (openId && app.byId(openId)) setTimeout(() => app.console.open(openId, null), 120);
  const selectId = params.get('select');
  if (selectId && app.byId(selectId)) {
    app.state.selected = selectId;
    app.renderTarget(app.byId(selectId));
    app.setFocus();
  }
  const hoverId = params.get('hover');
  if (hoverId && app.byId(hoverId)) {
    app.state.hovered = hoverId;
    app.setFocus();
  }
  const signalAt = Number(params.get('signalAt') || 0);
  if (signalAt > 0 && data.demoSignals.length) {
    setTimeout(() => app.signals.addSignal(data.demoSignals[0]), signalAt);
  }

  app.scene.renderOnce();
  app.scene.start();

  const api = {
    data,
    state: app.state,
    tune: app.tuning.tune,

    openProject: (id) => app.console.open(id, null),
    closeProject: () => app.console.close(),

    selectProject: (id) => {
      if (!id) {
        app.state.selected = null;
        app.renderTarget(null);
        app.setFocus();
        return;
      }
      const project = app.byId(id);
      if (!project) return;
      app.state.selected = id;
      app.renderTarget(project);
      app.setFocus();
    },

    setProjectState: (id, stateName) => {
      const project = app.byId(id);
      if (!project) return false;
      project.state = stateName;
      app.stars.render();
      app.setFocus();
      app.hud.render();
      app.requestRender();
      if (app.state.current?.id === id) app.console.open(id, null);
      return true;
    },

    pushSignal: (signal) => {
      if (!signal || !app.byId(signal.project)) return false;
      app.signals.addSignal(signal);
      return true;
    },

    setTune: (key, value) => app.tuning.set(key, value),
    getTune: () => ({ ...app.tuning.tune }),
    setMotion: (on) => app.signals.setMotion(!!on),
    setDemo: (on) => app.signals.setDemo(!!on),
    resize: () => app.scene.resize(),

    setStarSkin: (projectId, skin) => {
      if (!app.skinState.setStar(projectId, skin)) return false;
      app.scene.S.bodies?.rebuild();
      return true;
    },
    setPlanetSkin: (skin, projectId) => {
      if (!app.skinState.setPlanet(skin, projectId)) return false;
      app.scene.S.bodies?.rebuild();
      return true;
    },
    listStarSkins,
    listPlanetSkins,

    destroy: () => {
      app.scene.dispose();
      app.console.dispose();
      app.signals.dispose();
      app.hud.dispose();
      host.innerHTML = '';
      document.documentElement.classList.remove('low-quality');
    },
  };

  return api;
}
