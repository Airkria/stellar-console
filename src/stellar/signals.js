import { $ } from './core/dom.js';
import { pad2 } from './core/math.js';

export function createSignals(app) {
  let demoTimer = 0;
  let demoIndex = 0;

  function toast(text) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function updateLive(text, time, tag) {
    const textEl = $('#liveText');
    if (textEl) textEl.textContent = text;
    const timeEl = $('#liveTime');
    if (timeEl) timeEl.textContent = time || '--:--';
    const tagEl = $('#liveTag');
    if (tagEl && tag) tagEl.textContent = tag;
  }

  function addSignal(signal) {
    const now = new Date();
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    app.state.signals.unshift({ ...signal, time });
    if (app.state.signals.length > 18) app.state.signals.pop();
    updateLive(signal.text, time, signal.src);
    if (app.state.current && app.state.current.id === signal.project) app.console.renderSide();
    const star = $(`.star[data-project="${signal.project}"]`);
    if (star) {
      star.classList.add('flash');
      setTimeout(() => star.classList.remove('flash'), 1200);
    }
  }

  function startDemo() {
    clearInterval(demoTimer);
    if (!app.state.demo || !app.data.demoSignals.length) return;
    demoTimer = setInterval(() => {
      addSignal(app.data.demoSignals[demoIndex % app.data.demoSignals.length]);
      demoIndex += 1;
    }, 14000);
  }

  function setMotion(on) {
    app.state.motion = on;
    document.documentElement.dataset.motion = on ? 'on' : 'off';
    const button = $('#motionToggle');
    if (button) {
      button.setAttribute('aria-pressed', String(on));
      const label = button.querySelector('span');
      if (label) label.textContent = on ? '开' : '关';
    }
    app.scene?.start();
    if (app.state.current) app.console.renderFlow(app.state.current);
  }

  function setDemo(on) {
    app.state.demo = on;
    const button = $('#demoToggle');
    if (button) {
      button.setAttribute('aria-pressed', String(on));
      const label = button.querySelector('span');
      if (label) label.textContent = on ? '开' : '关';
    }
    startDemo();
  }

  function bind() {
    $('#demoToggle')?.addEventListener('click', () => setDemo(!app.state.demo));
    $('#motionToggle')?.addEventListener('click', () => setMotion(!app.state.motion));
  }

  function dispose() {
    clearInterval(demoTimer);
  }

  return { toast, updateLive, addSignal, startDemo, setMotion, setDemo, bind, dispose };
}
