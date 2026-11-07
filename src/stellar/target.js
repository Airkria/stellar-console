import { $, esc } from './core/dom.js';

/**
 * Small summary card that follows the selected project. Hovering only shows
 * the name label; the card is reserved for an actual selection.
 */
export function createTarget(app) {
  const cardSize = { w: 276, h: 150 };

  function decisionsFor(id) {
    return app.data.decisions.filter((d) => d.project === id).length;
  }

  function render(project) {
    const card = $('#targetCard');
    if (!card) return;
    if (!project) {
      card.classList.add('empty');
      return;
    }
    const labels = app.data.labels.state;
    card.classList.remove('empty');
    card.style.setProperty(
      '--tag',
      project.state === 'run' ? 'var(--cyan)' : project.state === 'wait' ? 'var(--amber)' : project.state === 'alert' ? 'var(--red)' : '#96abcb',
    );
    card.innerHTML = `<div class="tc-code">目标 // ${esc(project.code)}</div>
      <div class="tc-title">${esc(project.cn || project.name)}</div>
      <div class="tc-sub">${esc(project.name)} · ${esc(project.code)}</div>
      <div class="tc-phase">${esc(project.phase)}</div>
      <div class="tc-grid">
        <span><i>体量</i><b>${esc(project.mass)}</b></span>
        <span><i>里程碑</i><b>${String(project.miles).padStart(2, '0')}</b></span>
        <span><i>最近</i><b>${esc(project.last)}</b></span>
      </div>
      <div class="tc-status"><span>[ ${esc(labels[project.state] || project.state)} ] · ${decisionsFor(project.id)} 待决</span><b>${esc(project.last)}</b></div>`;

    requestAnimationFrame(() => {
      cardSize.w = card.offsetWidth;
      cardSize.h = card.offsetHeight;
      app.updateLeader?.();
    });
  }

  return { render, cardSize };
}
