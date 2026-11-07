import * as THREE from 'three';
import { $ } from './core/dom.js';

/**
 * Projects the 3D anchors into screen space so the DOM layer can position
 * labels and hit areas. Also applies black-hole occlusion and intro growth.
 */
export function createProjection(app) {
  const screenPositions = app.screenPositions;
  const vec = new THREE.Vector3();

  function update() {
    if (!app.scene?.S.camera) return;
    const S = app.scene.S;
    const now = performance.now();
    const layer = $('#stars');
    if (!layer) return;

    layer.classList.toggle('zoomed-out', S.camera.position.distanceTo(S.controls.target) > 12.8);
    const bh = S.blackHole.screenInfo();

    for (const p of app.data.projects) {
      const el = layer.querySelector(`.star[data-project="${p.id}"]`);
      const anchor = S.planetObjs.get(p.id);
      if (!el || !anchor) continue;

      anchor.getWorldPosition(vec);
      const dist = S.camera.position.distanceTo(vec);
      vec.project(S.camera);
      const sx = (vec.x * 0.5 + 0.5) * S.VW;
      const sy = (-vec.y * 0.5 + 0.5) * S.VH;
      const visible = vec.z > -1 && vec.z < 1 && sx > -140 && sx < S.VW + 140 && sy > -140 && sy < S.VH + 140;
      screenPositions.set(p.id, { x: sx, y: sy, visible });

      el.style.visibility = visible ? 'visible' : 'hidden';
      el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      el.style.zIndex = String(Math.round(1000 - vec.z * 100));

      const k = THREE.MathUtils.clamp(S.BASE_DIST / dist, 0.55, 2.8);
      const age = now * 0.001 - app.introStart;
      const born = app.state.motion ? THREE.MathUtils.smoothstep(age, p.index * 0.12, p.index * 0.12 + 0.9) : 1;
      const breath = app.state.motion ? 1 + 0.05 * Math.sin(now * 0.0009 + p.index * 1.7) : 1;
      const grow = (0.55 + 0.45 * born) * breath;

      el.style.setProperty('--k', k.toFixed(3));
      el.style.setProperty('--grow', grow.toFixed(3));
      el.style.setProperty('--planet-halo', String(app.tune[`planetHalo_${p.id}`] ?? 1));
      el.style.setProperty('--labelOffset', `${(p.halo * 0.5 * k + 10).toFixed(1)}px`);
      el.style.setProperty('--labelBelow', p.core ? '88px' : `${(p.halo * 0.5 * k + 14).toFixed(1)}px`);
      el.style.setProperty('--hitSize', p.core ? '300px' : Math.min(260, Math.max(46, p.halo * 0.62 * k)).toFixed(1) + 'px');

      const baseOpacity = p.state === 'archived' ? 0.5 : p.state === 'paused' ? 0.62 : p.state === 'idle' ? 0.82 : 1;
      // Solid occlusion: bodies nearer than the hole are composited after the
      // BH pass, bodies behind are covered by it. The DOM label follows the
      // same rule: only projects behind the hole fade in the shadow circle.
      const behindHole = dist > bh.dist + 0.05;
      const screenDist = Math.hypot(sx - bh.x, sy - bh.y);
      const occlusion =
        behindHole && bh.visible ? 1 - THREE.MathUtils.smoothstep(screenDist, bh.r * 0.72, bh.r * 1.1) : 0;
      el.style.opacity = String(baseOpacity * born * (1 - occlusion * 0.94));
      el.style.pointerEvents = occlusion > 0.55 ? 'none' : '';

      const quiet =
        !p.core &&
        S.VW < 900 &&
        ['idle', 'paused', 'archived'].includes(p.state) &&
        app.state.hovered !== p.id &&
        app.state.selected !== p.id;
      el.classList.toggle('quiet', quiet);
      el.classList.toggle('edge-right', sx > S.VW - 120);
      el.classList.toggle('edge-left', sx < 120);
    }

    app.updateLeader?.();
  }

  return { update };
}
