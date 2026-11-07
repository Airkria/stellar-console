/**
 * Skin selection state. Numeric tuning lives in `tuning.js`; this module keeps
 * per-project star and planet skin choices, persisted separately.
 */
export function createSkinState(app) {
  const prefix = app.options.storagePrefix || 'stellar-console';
  const key = `${prefix}:skins`;
  const state = {
    star: {},
    planet: app.data.planetSkin || 'rock',
    planetById: {},
  };

  try {
    Object.assign(state, JSON.parse(localStorage.getItem(key) || '{}'));
  } catch (e) {
    /* storage unavailable */
  }
  state.star = state.star || {};
  state.planetById = state.planetById || {};

  for (const project of app.data.projects) {
    if (project.core) continue;
    if (!state.star[project.id]) state.star[project.id] = project.starSkin || 'classic';
    project.starSkin = state.star[project.id];
    if (!state.planetById[project.id]) state.planetById[project.id] = project.planetSkin || state.planet;
    project.planetSkin = state.planetById[project.id];
  }
  if (!state.planet) state.planet = app.data.planetSkin || 'rock';

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable */
    }
  }

  function starFor(project) {
    return state.star[project.id] || project.starSkin || 'classic';
  }

  function planetFor(project) {
    return state.planetById[project.id] || state.planet || project.planetSkin || 'rock';
  }

  function setStar(projectId, skin) {
    const project = app.byId(projectId);
    if (!project) return false;
    state.star[projectId] = skin;
    project.starSkin = skin;
    save();
    return true;
  }

  function setPlanet(skin, projectId) {
    if (projectId) {
      const project = app.byId(projectId);
      if (!project) return false;
      state.planetById[projectId] = skin;
      project.planetSkin = skin;
    } else {
      state.planet = skin;
    }
    save();
    return true;
  }

  return { state, starFor, planetFor, setStar, setPlanet };
}
