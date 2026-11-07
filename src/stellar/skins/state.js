/**
 * Skin selection state. Numeric tuning lives in `tuning.js`; this module keeps
 * the per-project star skin and the global planet skin, persisted separately.
 */
export function createSkinState(app) {
  const prefix = app.options.storagePrefix || 'stellar-console';
  const key = `${prefix}:skins`;
  const state = { star: {}, planet: app.data.planetSkin || 'rock' };

  try {
    Object.assign(state, JSON.parse(localStorage.getItem(key) || '{}'));
  } catch (e) {
    /* storage unavailable */
  }
  state.star = state.star || {};

  for (const project of app.data.projects) {
    if (project.core) continue;
    if (!state.star[project.id]) state.star[project.id] = project.starSkin || 'classic';
    project.starSkin = state.star[project.id];
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

  function setStar(projectId, skin) {
    const project = app.byId(projectId);
    if (!project) return false;
    state.star[projectId] = skin;
    project.starSkin = skin;
    save();
    return true;
  }

  function setPlanet(skin) {
    state.planet = skin;
    save();
    return true;
  }

  return { state, starFor, setStar, setPlanet };
}
