import { $, $$, esc } from './core/dom.js';

/**
 * The DOM star layer. It carries hit areas, labels and the ripple that grows
 * around running projects; the 3D body itself lives in the WebGL pass.
 */
export function createStars(app) {
  function markup(p) {
    const labels = app.data.labels.state;
    const core = app.data.core;
    const label = p.core
      ? `<b>${esc(core.name)}</b><span class="tag">${esc(core.tag)}</span>`
      : `<b>${esc(p.name)}</b><span class="tag">${esc(labels[p.state] || p.state)}</span>`;
    return `<button class="star${p.labelBelow ? ' label-below' : ''}${p.core ? ' core-star' : ''}" type="button"
      data-project="${esc(p.id)}" data-state="${esc(p.state)}" data-focus="${app.state.selected === p.id}" data-selected="${app.state.selected === p.id}"
      style="--i:${p.index};--halo:${(p.halo * 1.8).toFixed(1)}px;--p:${(p.p * 1.9).toFixed(1)}px;--hue:${p.hue};--labelOffset:${(p.halo * 0.5 + 10).toFixed(1)}px;--labelBelow:${(p.halo * 0.5 + 14).toFixed(1)}px;--hitSize:${Math.min(260, Math.max(46, p.halo * 0.62)).toFixed(1)}px"
      aria-label="${esc(p.cn || p.name)}，${esc(labels[p.state] || p.state)}，点击打开数控制板">
      <span class="label">${label}</span>
      <span class="hit"></span>
    </button>`;
  }

  function render() {
    const layer = $('#stars');
    if (!layer) return;
    layer.innerHTML = app.data.projects.map(markup).join('');
    $$('#stars .star').forEach((el) => {
      const project = app.byId(el.dataset.project);
      if (!project) return;
      const hit = el.querySelector('.hit');
      hit?.addEventListener('pointerenter', () => {
        app.state.hovered = project.id;
        setFocus();
      });
      hit?.addEventListener('pointerleave', () => {
        if (app.state.hovered === project.id) app.state.hovered = null;
        setFocus();
      });
      el.addEventListener('click', () => {
        if (performance.now() < app.suppressClickUntil) return;
        app.state.selected = project.id;
        app.renderTarget(project);
        setFocus();
        app.openProject(project.id, el);
      });
    });
  }

  function setFocus() {
    const focused = app.state.hovered || app.state.selected;
    $$('#stars .star').forEach((el) => {
      el.setAttribute('data-focus', String(el.dataset.project === focused));
      el.setAttribute('data-selected', String(el.dataset.project === app.state.selected));
    });
  }

  return { render, setFocus };
}
