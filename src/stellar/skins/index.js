import { createClassicStar } from './star/classic.js';
import { createSunStar } from './star/sun.js';
import { createRockPlanet } from './planet/rock.js';
import { createIcePlanet } from './planet/ice.js';
import { createLavaPlanet } from './planet/lava.js';

const starRegistry = new Map();
const planetRegistry = new Map();

/**
 * Register a custom project-star skin.
 * A skin is `{ label, create({ app, project, radius, color, glowTexture }) }`
 * and must return `{ object3D, update(t, opts), dispose() }`.
 */
export function registerStarSkin(name, skin) {
  if (!name || !skin?.create) throw new Error('[stellar-console] invalid star skin');
  starRegistry.set(name, skin);
}

/** Register a custom planet / satellite skin with the same contract. */
export function registerPlanetSkin(name, skin) {
  if (!name || !skin?.create) throw new Error('[stellar-console] invalid planet skin');
  planetRegistry.set(name, skin);
}

export function getStarSkin(name) {
  return starRegistry.get(name) || starRegistry.get('classic');
}

export function getPlanetSkin(name) {
  return planetRegistry.get(name) || planetRegistry.get('rock');
}

export function listStarSkins() {
  return [...starRegistry.entries()].map(([value, skin]) => ({ value, label: skin.label }));
}

export function listPlanetSkins() {
  return [...planetRegistry.entries()].map(([value, skin]) => ({ value, label: skin.label }));
}

registerStarSkin('classic', { label: '经典恒星', create: createClassicStar });
registerStarSkin('sun', { label: '火焰恒星', create: createSunStar });

registerPlanetSkin('rock', { label: '岩石行星', create: createRockPlanet });
registerPlanetSkin('ice', { label: '冰晶行星', create: createIcePlanet });
registerPlanetSkin('lava', { label: '熔岩行星', create: createLavaPlanet });
