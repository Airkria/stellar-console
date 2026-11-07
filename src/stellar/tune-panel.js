import { $, $$, esc } from './core/dom.js';
import { listPlanetSkins, listStarSkins } from './skins/index.js';

/** Live tuning panel. Values persist in localStorage and can be overridden
 *  with `?tune={...}` or hidden with `?panel=0`. */
export function createTunePanel(app) {
  const tuning = app.tuning;

  function optionMarkup(options, current) {
    return options
      .map((o) => `<option value="${esc(o.value)}"${o.value === current ? ' selected' : ''}>${esc(o.label)}</option>`)
      .join('');
  }

  function skinSection() {
    if (!app.skinState) return '';
    const stars = listStarSkins();
    const planets = listPlanetSkins();
    let html = '<div class="tune-group">皮肤</div>';
    for (const project of app.data.projects) {
      if (project.core) continue;
      html += `<label class="tune-row tune-select"><span>${esc(project.cn || project.name)} 恒星</span><select data-star-skin="${esc(project.id)}">${optionMarkup(stars, app.skinState.starFor(project))}</select></label>`;
      html += `<label class="tune-row tune-select"><span>${esc(project.cn || project.name)} 行星</span><select data-planet-skin="${esc(project.id)}">${optionMarkup(planets, app.skinState.planetFor(project))}</select></label>`;
    }
    return html;
  }

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
      const type = c.type || 'range';
      if (type === 'toggle') {
        html += `<label class="tune-row tune-switch"><span>${c.label}</span><input type="checkbox" data-tune="${c.key}"${tuning.tune[c.key] ? ' checked' : ''}></label>`;
      } else if (type === 'text') {
        html += `<label class="tune-row tune-text"><span>${c.label}</span><input type="text" data-tune="${c.key}" value="${esc(tuning.tune[c.key])}" placeholder="${esc(c.placeholder || '')}"></label>`;
      } else if (type === 'color') {
        html += `<label class="tune-row tune-color"><span>${c.label}</span><input type="color" data-tune="${c.key}" value="${esc(tuning.tune[c.key])}"></label>`;
      } else if (type === 'file') {
        html += `<div class="tune-row tune-file"><span>${c.label}</span><button type="button" class="tune-file-btn" data-file-btn="${c.key}">选择…</button><input type="file" accept="image/*" data-file="${c.key}" hidden></div>`;
      } else {
        const dec = c.dec ?? 2;
        html += `<label class="tune-row"><span>${c.label}</span><b data-tune-val="${c.key}">${Number(tuning.tune[c.key]).toFixed(dec)}</b><input type="range" data-tune="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${tuning.tune[c.key]}"></label>`;
      }
    }
    html += skinSection();
    body.innerHTML = html;

    $$('#tuneBody input[data-tune]').forEach((input) => {
      const key = input.dataset.tune;
      const config = tuning.config.find((x) => x.key === key);
      const type = config?.type || 'range';
      const output = $(`#tuneBody [data-tune-val="${key}"]`);

      if (type === 'toggle') {
        input.addEventListener('change', () => tuning.set(key, input.checked));
      } else if (type === 'text') {
        input.addEventListener('change', () => tuning.set(key, input.value));
      } else if (type === 'color') {
        input.addEventListener('input', () => tuning.set(key, input.value));
      } else {
        input.addEventListener('input', () => {
          tuning.set(key, Number(input.value));
          if (output) output.textContent = Number(input.value).toFixed(config.dec ?? 2);
        });
      }
    });

    $$('#tuneBody input[data-file]').forEach((input) => {
      const button = $(`#tuneBody [data-file-btn="${input.dataset.file}"]`);
      button?.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) app.toast?.('图片较大，刷新后可能无法保留');
        const reader = new FileReader();
        reader.onload = () => {
          tuning.set('bgImageUrl', String(reader.result || ''));
          tuning.set('bgUseImage', true);
          const urlInput = $('#tuneBody input[data-tune="bgImageUrl"]');
          if (urlInput) urlInput.value = tuning.tune.bgImageUrl;
          const toggle = $('#tuneBody input[data-tune="bgUseImage"]');
          if (toggle) toggle.checked = true;
          app.toast?.('背景图片已更新');
        };
        reader.readAsDataURL(file);
      });
    });

    $$('#tuneBody select[data-star-skin]').forEach((select) => {
      select.addEventListener('change', () => {
        app.skinState.setStar(select.dataset.starSkin, select.value);
        app.scene.S.bodies?.rebuild();
        app.requestRender?.();
      });
    });
    $$('#tuneBody select[data-planet-skin]').forEach((select) => {
      select.addEventListener('change', () => {
        app.skinState.setPlanet(select.value, select.dataset.planetSkin);
        app.scene.S.bodies?.rebuild();
        app.requestRender?.();
      });
    });

    $('#tuneToggle')?.addEventListener('click', () => setOpen(!!$('#tunePanel')?.hidden));
    $('#tuneClose')?.addEventListener('click', () => setOpen(false));
    $('#tuneReset')?.addEventListener('click', () => {
      tuning.reset();
      for (const c of tuning.config) {
        if (c.type === 'file') continue;
        const input = $(`#tuneBody input[data-tune="${c.key}"]`);
        const output = $(`#tuneBody [data-tune-val="${c.key}"]`);
        if (!input) continue;
        if (input.type === 'checkbox') input.checked = tuning.tune[c.key];
        else input.value = tuning.tune[c.key];
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
