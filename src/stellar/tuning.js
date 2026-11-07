export const TUNE_DEFAULTS = {
  bhScale: 0.19,
  rBound: 12,
  diskIn: 2.45,
  diskOut: 11.5,
  diskH: 0.13,
  emission: 2.2,
  burst: 2.8,
  falloff: 1.3,
  absorb: 0.05,
  ring: 1.2,
  bloomStrength: 0.1,
  bloomThreshold: 0.97,
  bloomRadius: 0.45,
  flow: 1,
  flowSpeed: 1,
  flowDir: 1,
  galaxySize: 1,
  galaxyAlpha: 1,
  dustSize: 1,
  dustAlpha: 1,
  hazeAlpha: 1,
  starThick: 1,
  starWidth: 1,
  riverSize: 1,
  riverAlpha: 1,
  deepSize: 1,
  deepAlpha: 1,
  inflowSize: 1,
  inflowAlpha: 1.3,
  planetGlow: 1,
  planetCore: 1,
  planetRipple: 1,
  orbitScale: 1,
};

const BASE_CONFIG = [
  { group: '黑洞', key: 'bhScale', label: '整体大小', min: 0.12, max: 0.3, step: 0.005, dec: 3 },
  { key: 'rBound', label: '透镜范围', min: 9, max: 16, step: 0.1, dec: 1 },
  { key: 'diskIn', label: '盘内径', min: 2, max: 4, step: 0.05, dec: 2 },
  { key: 'diskOut', label: '盘外径', min: 6, max: 14, step: 0.1, dec: 1 },
  { key: 'diskH', label: '盘厚度', min: 0.05, max: 0.4, step: 0.01, dec: 2 },
  { key: 'burst', label: '内缘爆亮', min: 0, max: 6, step: 0.1, dec: 1 },
  { key: 'falloff', label: '外盘衰减', min: 0.8, max: 2.5, step: 0.05, dec: 2 },
  { key: 'emission', label: '盘亮度', min: 0.5, max: 4, step: 0.05, dec: 2 },
  { key: 'absorb', label: '盘吸收', min: 0, max: 0.2, step: 0.005, dec: 3 },
  { key: 'ring', label: '光子环', min: 0, max: 2, step: 0.05, dec: 2 },
  { key: 'flow', label: '盘面流动', min: 0, max: 1.5, step: 0.05, dec: 2 },
  { key: 'flowSpeed', label: '流动速度', min: 0, max: 3, step: 0.05, dec: 2 },
  { key: 'flowDir', label: '流动方向', min: -1, max: 1, step: 2, dec: 0 },

  { group: '星盘', key: 'galaxySize', label: '主星粒径', min: 0.5, max: 2, step: 0.05, dec: 2 },
  { key: 'galaxyAlpha', label: '主星亮度', min: 0, max: 2, step: 0.05, dec: 2 },
  { key: 'dustSize', label: '尘埃粒径', min: 0, max: 2, step: 0.05, dec: 2 },
  { key: 'dustAlpha', label: '尘埃亮度', min: 0, max: 2, step: 0.05, dec: 2 },
  { key: 'hazeAlpha', label: '星系雾面', min: 0, max: 2, step: 0.05, dec: 2 },
  { key: 'starThick', label: '星盘厚度', min: 0.5, max: 2, step: 0.05, dec: 2 },
  { key: 'starWidth', label: '星盘宽度', min: 0.5, max: 1.8, step: 0.05, dec: 2 },

  { group: '行星', key: 'planetGlow', label: '光晕亮度', min: 0, max: 1.5, step: 0.05, dec: 2 },
  { key: 'planetCore', label: '核心大小', min: 0.5, max: 1.6, step: 0.05, dec: 2 },
  { key: 'planetRipple', label: '扩散光频率', min: 0.2, max: 3, step: 0.05, dec: 2 },
  { key: 'orbitScale', label: '卫星轨道', min: 0.5, max: 1.8, step: 0.05, dec: 2 },

  { group: '辉光', key: 'bloomStrength', label: 'Bloom 强度', min: 0, max: 0.8, step: 0.01, dec: 2 },
  { key: 'bloomThreshold', label: 'Bloom 阈值', min: 0.6, max: 1, step: 0.01, dec: 2 },
  { key: 'bloomRadius', label: 'Bloom 半径', min: 0, max: 1, step: 0.02, dec: 2 },

  { group: '星河', key: 'riverSize', label: '外层星河粒径', min: 0.5, max: 2, step: 0.05, dec: 2 },
  { key: 'riverAlpha', label: '外层星河亮度', min: 0, max: 2, step: 0.05, dec: 2 },
  { key: 'deepSize', label: '远景星粒径', min: 0.5, max: 2, step: 0.05, dec: 2 },
  { key: 'deepAlpha', label: '远景星亮度', min: 0, max: 2, step: 0.05, dec: 2 },

  { group: '入流', key: 'inflowSize', label: '入流粒径', min: 0.5, max: 2, step: 0.05, dec: 2 },
  { key: 'inflowAlpha', label: '入流亮度', min: 0.5, max: 2, step: 0.05, dec: 2 },
];

export function buildTuneConfig(projects) {
  const config = [...BASE_CONFIG];
  const orbitIndex = config.findIndex((c) => c.key === 'orbitScale');
  const perProject = projects
    .filter((p) => !p.core)
    .map((p) => ({
      key: `planetHalo_${p.id}`,
      label: `${p.cn || p.name} 光晕`,
      min: 0.2,
      max: 1.5,
      step: 0.05,
      dec: 2,
    }));
  config.splice(orbitIndex + 1, 0, ...perProject);
  return config;
}

export function createTuning(app) {
  const defaults = { ...TUNE_DEFAULTS };
  for (const p of app.data.projects) {
    if (!p.core) defaults[`planetHalo_${p.id}`] = 1;
  }
  const tune = { ...defaults };
  const config = buildTuneConfig(app.data.projects);
  const prefix = app.options.storagePrefix || 'stellar-console';

  function load() {
    try {
      Object.assign(tune, JSON.parse(localStorage.getItem(`${prefix}:tune`) || '{}'));
    } catch (e) {
      /* storage unavailable */
    }
    const fromUrl = new URLSearchParams(location.search).get('tune');
    if (fromUrl) {
      try {
        Object.assign(tune, JSON.parse(fromUrl));
      } catch (e) {
        /* malformed URL override */
      }
    }
    for (const key of Object.keys(defaults)) {
      if (typeof tune[key] !== 'number' || Number.isNaN(tune[key])) tune[key] = defaults[key];
    }
  }

  function save() {
    try {
      localStorage.setItem(`${prefix}:tune`, JSON.stringify(tune));
    } catch (e) {
      /* storage unavailable */
    }
  }

  function reset() {
    Object.assign(tune, defaults);
  }

  function apply() {
    const refs = app.refs;
    if (refs.bhPass) {
      const u = refs.bhPass.material.uniforms;
      u.uRBound.value = Math.max(tune.rBound, tune.diskOut + 0.35);
      u.uDiskIn.value = tune.diskIn;
      u.uDiskOut.value = tune.diskOut;
      u.uDiskH.value = tune.diskH;
      u.uEmission.value = tune.emission;
      u.uBurst.value = tune.burst;
      u.uFalloff.value = tune.falloff;
      u.uAbsorb.value = tune.absorb;
      u.uRing.value = tune.ring;
      u.uFlow.value = tune.flow;
      u.uFlowSpeed.value = tune.flowSpeed;
      u.uFlowDir.value = tune.flowDir;
    }
    if (refs.bloomPass) {
      refs.bloomPass.strength = tune.bloomStrength;
      refs.bloomPass.threshold = tune.bloomThreshold;
      refs.bloomPass.radius = tune.bloomRadius;
    }
    if (refs.galaxyMaterial) {
      refs.galaxyMaterial.uniforms.uSize.value = 0.075 * tune.galaxySize;
      refs.galaxyMaterial.uniforms.uAlpha.value = tune.galaxyAlpha;
      refs.galaxyMaterial.uniforms.uThick.value = tune.starThick;
      refs.galaxyMaterial.uniforms.uWidth.value = tune.starWidth;
    }
    if (refs.dustMaterial) {
      refs.dustMaterial.uniforms.uSize.value = 0.1 * tune.dustSize;
      refs.dustMaterial.uniforms.uAlpha.value = tune.dustAlpha;
      refs.dustMaterial.uniforms.uThick.value = tune.starThick;
      refs.dustMaterial.uniforms.uWidth.value = tune.starWidth;
    }
    if (refs.hazeMaterial) refs.hazeMaterial.opacity = 0.42 * tune.hazeAlpha;
    if (refs.riverMaterial) {
      refs.riverMaterial.uniforms.uSize.value = 0.08 * tune.riverSize;
      refs.riverMaterial.uniforms.uAlpha.value = tune.riverAlpha;
    }
    if (refs.deepMaterial) {
      refs.deepMaterial.uniforms.uSize.value = 0.08 * tune.deepSize;
      refs.deepMaterial.uniforms.uAlpha.value = tune.deepAlpha;
    }
    if (refs.inflowMaterial) {
      refs.inflowMaterial.uniforms.uSize.value = 0.06 * tune.inflowSize;
      refs.inflowMaterial.uniforms.uAlpha.value = tune.inflowAlpha;
    }
    document.documentElement.style.setProperty('--planet-glow', String(tune.planetGlow));
    document.documentElement.style.setProperty('--planet-core', String(tune.planetCore));
    document.documentElement.style.setProperty('--planet-ripple', String(tune.planetRipple));
    app.requestRender?.();
  }

  function set(key, value) {
    if (!(key in defaults)) return false;
    tune[key] = Number(value);
    apply();
    save();
    return true;
  }

  const panelKey = `${prefix}:panel`;
  function loadPanelOpen() {
    const param = new URLSearchParams(location.search).get('panel');
    if (param === '0') return false;
    if (param === '1') return true;
    try {
      return localStorage.getItem(panelKey) !== '0';
    } catch (e) {
      return true;
    }
  }
  function savePanelOpen(open) {
    try {
      localStorage.setItem(panelKey, open ? '1' : '0');
    } catch (e) {
      /* storage unavailable */
    }
  }

  return { tune, defaults, config, load, save, reset, apply, set, loadPanelOpen, savePanelOpen };
}
