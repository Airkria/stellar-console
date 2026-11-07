import { $ } from './core/dom.js';
import { formatClock } from './core/math.js';

export function createHud(app) {
  let timer = 0;

  function render() {
    const set = (key, value) => {
      const el = $(`[data-kpi="${key}"]`);
      if (el) el.textContent = String(value);
    };
    set('fleets', app.data.projects.length);
    set('running', app.data.projects.filter((p) => p.state === 'run').length);
    set('decisions', app.data.decisions.length);
    set('milestones', app.data.projects.reduce((sum, p) => sum + (Number(p.miles) || 0), 0));
  }

  function tick() {
    const clock = $('#clock');
    if (clock) clock.textContent = formatClock();
  }

  function startClock() {
    tick();
    clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  function dispose() {
    clearInterval(timer);
  }

  return { render, startClock, dispose };
}
