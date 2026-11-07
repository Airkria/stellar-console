import { $, $$ } from './core/dom.js';

/** Live tuning panel. Values persist in localStorage and can be overridden
 *  with `?tune={...}` or hidden with `?panel=0`. */
export function createTunePanel(app) {
  const tuning = app.tuning;

  function build() {
    const body = $('#tuneBody');
    if (!body) return;
    let html = '';
    let group = '';
    for (const c of tuning.config) {
      if (c.group && c.group !== group) {
        group = c.group;
        html += `<div class="tune-group">${c.group}</div>`;
      }
      const dec = c.dec ?? 2;
      html += `<label class="tune-row"><span>${c.label}</span><b data-tune-val="${c.key}">${Number(tuning.tune[c.key]).toFixed(dec)}</b><input type="range" data-tune="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${tuning.tune[c.key]}"></label>`;
    }
    body.innerHTML = html;

    $$('#tuneBody input[data-tune]').forEach((input) => {
      const key = input.dataset.tune;
      const config = tuning.config.find((x) => x.key === key);
      const output = $(`#tuneBody [data-tune-val="${key}"]`);
      input.addEventListener('input', () => {
        tuning.set(key, Number(input.value));
        if (output) output.textContent = Number(input.value).toFixed(config.dec ?? 2);
      });
    });

    $('#tuneToggle')?.addEventListener('click', () => setOpen(!!$('#tunePanel')?.hidden));
    $('#tuneClose')?.addEventListener('click', () => setOpen(false));
    $('#tuneReset')?.addEventListener('click', () => {
      tuning.reset();
      for (const c of tuning.config) {
        const input = $(`#tuneBody input[data-tune="${c.key}"]`);
        const output = $(`#tuneBody [data-tune-val="${c.key}"]`);
        if (input) input.value = tuning.tune[c.key];
        if (output) output.textContent = Number(tuning.tune[c.key]).toFixed(c.dec ?? 2);
      }
      tuning.apply();
      tuning.save();
    });
  }

  function setOpen(open) {
    const panel = $('#tunePanel');
    if (!panel) return;
    panel.hidden = !open;
    tuning.savePanelOpen(open);
    app.requestRender?.();
  }

  return { build, setOpen };
}
