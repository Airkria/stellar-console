import { $, esc, svgElement } from './core/dom.js';

/**
 * The holographic project console (overlay). Everything is rendered from the
 * host data object; project-to-project links come from `data.links`.
 */
export function createConsole(app) {
  function decisionsFor(id) {
    return app.data.decisions.filter((d) => d.project === id).length;
  }

  function secMarkup(section) {
    const taskLabels = app.data.labels.task;
    const total = section.tasks.length + (section.more || 0);
    const done = section.tasks.filter((t) => ['passed', 'released'].includes(t.state)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const tasks = section.tasks
      .map(
        (task) => `<li class="task">
          <span class="prio" data-p="${task.p}">P${task.p}</span>
          <span class="task-copy"><p>${esc(task.title)}</p><small>下一步 · ${esc(task.next)}</small></span>
          <span class="state" data-state="${esc(task.state)}">${esc(taskLabels[task.state] || task.state)}</span>
        </li>`,
      )
      .join('');
    return `<section class="sec" id="sec-${esc(section.id)}" data-state="${esc(section.state)}">
      <header class="sec-head"><h4>${esc(section.name)}</h4><span class="sec-state" data-state="${esc(section.state)}">${esc(taskLabels[section.state] || section.state)}</span></header>
      <div class="sec-bar"><i style="width:${pct}%"></i></div>
      <ul class="tasks">${tasks}</ul>
      <footer class="sec-foot"><span>${done}/${total} 已认可</span>${section.more ? `<b>另有 ${section.more} 项</b>` : '<b></b>'}</footer>
    </section>`;
  }

  function renderFlow(project) {
    const svg = $('#flow');
    if (!svg) return;
    svg.innerHTML = '';
    const cx = 410;
    const cy = 69;
    const n = Math.max(3, project.sections.length);
    const nodeR = 46;
    const add = (tag, attrs) => {
      const el = svgElement(tag, attrs);
      svg.appendChild(el);
      return el;
    };

    add('circle', { cx, cy, r: 62, class: 'ring solid' });
    add('circle', { cx, cy, r: 46, class: 'ring' });
    add('circle', { cx, cy, r: 24, class: 'ring' });
    [16, 30, 42].forEach((ry) => {
      add('ellipse', { cx, cy, rx: 46, ry, class: 'globe' });
      add('ellipse', { cx, cy, rx: ry, ry: 46, class: 'globe' });
    });
    add('circle', { cx, cy, r: 46, class: 'globe' });
    add('line', { x1: 18, y1: 16, x2: 802, y2: 16, class: 'cross' });
    add('line', { x1: 18, y1: 122, x2: 802, y2: 122, class: 'cross' });
    add('text', { x: 24, y: 30, class: 'label' }).textContent = '星区 04';
    add('text', { x: 24, y: 42, class: 'label' }).textContent = '链路 98.4%';
    add('text', { x: 796, y: 30, class: 'label', 'text-anchor': 'end' }).textContent = `节点 ${project.mass}`;
    add('text', { x: 796, y: 42, class: 'label', 'text-anchor': 'end' }).textContent = '数据锁定';
    for (let i = 0; i < 10; i++) {
      add('line', { x1: 18, y1: 52 + i * 7, x2: 24, y2: 52 + i * 7, stroke: 'rgba(110,215,255,.25)', 'stroke-width': '.8' });
      add('line', { x1: 796, y1: 52 + i * 7, x2: 802, y2: 52 + i * 7, stroke: 'rgba(110,215,255,.25)', 'stroke-width': '.8' });
    }
    add('circle', { cx, cy, r: 3, fill: '#bff6ff', opacity: '.9' });

    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + ((Math.PI * 2) / n) * i;
      const x = cx + Math.cos(a) * nodeR;
      const y = cy + Math.sin(a) * nodeR;
      add('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'spoke', id: `fl-${i}` });
      add('circle', { cx: x, cy: y, r: 4, class: 'node' });
      add('circle', { cx: x, cy: y, r: 1.2, class: 'node-core' });
      add('text', {
        x: cx + Math.cos(a) * (nodeR + 14),
        y: cy + Math.sin(a) * (nodeR + 14) + 2,
        class: 'label',
        'text-anchor': 'middle',
      }).textContent = `S${i + 1}`;

      if (app.state.motion) {
        const dot = add('circle', { r: 1.5, class: 'dot' });
        const motion = svgElement('animateMotion', {
          dur: `${2.6 + i * 0.4}s`,
          repeatCount: 'indefinite',
          begin: `${i * 0.35}s`,
        });
        const mpath = svgElement('mpath', { href: `#fl-${i}` });
        motion.appendChild(mpath);
        dot.appendChild(motion);
      }
    }

    const sweep = add('line', { x1: cx, y1: cy, x2: cx + 64, y2: cy, class: 'sweep' });
    if (app.state.motion) {
      const transform = svgElement('animateTransform', {
        attributeName: 'transform',
        type: 'rotate',
        from: `0 ${cx} ${cy}`,
        to: `360 ${cx} ${cy}`,
        dur: '9s',
        repeatCount: 'indefinite',
      });
      sweep.appendChild(transform);
    }

    const meta = $('#flowMeta');
    if (meta) meta.textContent = `${String(project.sections.length).padStart(2, '0')} 板块 · ${String(decisionsFor(project.id)).padStart(2, '0')} 待决`;
  }

  function watchMarkup(project) {
    const files = project.files || [];
    return `<section class="watch"><header><span>文件监视</span><b>3 天窗口</b></header>
      ${
        files.length
          ? files
              .map(
                (f) => `<div class="watch-row"><time>${esc(f.time)}</time><span title="${esc(f.path)}">${esc(f.path)}</span><b>${esc(f.tag)}</b></div>`,
              )
              .join('')
          : '<p class="watch-empty">3 天内无文件变动 · 暗淡表示近期未动</p>'
      }
    </section>`;
  }

  function renderSide() {
    const project = app.state.current;
    if (!project) return;
    const taskLabels = app.data.labels.task;
    const decisions = app.data.decisions.filter((d) => d.project === project.id);
    const ideas = app.state.ideas.filter((i) => i.project === project.name || i.project === project.id);
    const signals = app.state.signals.filter((s) => s.project === project.id);

    const decisionsEl = $('#cDecisions');
    if (decisionsEl) {
      decisionsEl.innerHTML =
        decisions
          .map(
            (d) => `<button class="c-dec" type="button" data-sec="${esc(d.sec)}" data-risk="${d.state === 'alert'}"><span><p>${esc(d.title)}</p><small>${esc(d.section)} · ${esc(taskLabels[d.state] || d.state)}</small></span><time>${esc(d.age)}</time></button>`,
          )
          .join('') || '<p class="c-empty">暂无待决事项</p>';
    }
    const decisionCount = $('#cDecisionCount');
    if (decisionCount) decisionCount.textContent = String(decisions.length);

    const ideasEl = $('#cIdeas');
    if (ideasEl) {
      ideasEl.innerHTML =
        ideas.map((i) => `<div class="c-idea-item"><p>${esc(i.text)}</p><time>${esc(i.time)}</time></div>`).join('') ||
        '<p class="c-empty">暂无记录</p>';
    }
    const ideaCount = $('#cIdeaCount');
    if (ideaCount) ideaCount.textContent = String(ideas.length);

    const signalsEl = $('#cSignals');
    if (signalsEl) {
      signalsEl.innerHTML =
        signals
          .map(
            (s) => `<div class="c-sig" data-live="${project.state === 'run' ? 'true' : 'false'}"><time>${esc(s.time)}</time><i></i><div><p>${esc(s.text)}</p><small>${esc(s.src)}</small></div></div>`,
          )
          .join('') || '<p class="c-empty">暂无信号</p>';
    }
  }

  function renderSpectrum() {
    const el = $('#spectrum');
    if (!el) return;
    el.innerHTML = Array.from({ length: 72 }, (_, i) => {
      const h = 18 + Math.abs(Math.sin(i * 0.53)) * 50 + Math.random() * 22;
      return `<i style="--h:${h.toFixed(0)}%;--d:${(i * 0.035).toFixed(2)}s"></i>`;
    }).join('');
  }

  function connected(project) {
    const ids = new Set();
    for (const [a, b] of app.data.links) {
      if (a === project.id) ids.add(b);
      if (b === project.id) ids.add(a);
    }
    return [...ids].map(app.byId).filter(Boolean);
  }

  function open(id, trigger) {
    const project = app.byId(id);
    if (!project) return;
    app.lastTrigger = trigger || null;
    app.state.selected = project.id;
    app.renderTarget(project);
    app.setFocus();
    app.state.current = project;
    app.state.backgroundPaused = true;
    app.requestRender?.();

    const labels = app.data.labels.state;
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };

    setText('#cCode', project.code);
    setText('#consoleTitle', project.cn || project.name);
    setText('#cPhase', `${project.phase} // ${project.name}`);
    setText('#cAttach', project.satellites.length ? `附属 // ${project.satellites.join(' · ')}` : '无附属产物');

    const stateEl = $('#cState');
    if (stateEl) {
      stateEl.textContent = labels[project.state] || project.state;
      stateEl.style.setProperty(
        '--tag',
        project.state === 'run' ? 'var(--cyan)' : project.state === 'wait' ? 'var(--amber)' : project.state === 'alert' ? 'var(--red)' : '#96abcb',
      );
      stateEl.style.setProperty(
        '--tag-h',
        project.state === 'run' ? '190' : project.state === 'wait' ? '38' : project.state === 'alert' ? '2' : '215',
      );
    }
    document.documentElement.style.setProperty('--c-hue', project.hue);

    const orb = $('#cOrb');
    if (orb) {
      orb.style.background = `radial-gradient(circle at 40% 38%, #fff 0 12%, hsl(${project.hue} 100% 74%) 40%, hsl(${project.hue} 95% 46%) 75%, transparent 82%)`;
      orb.style.boxShadow = `0 0 18px hsla(${project.hue},100%,66%,.75)`;
    }

    setText('#cMass', project.mass);
    setText('#cMiles', String(project.miles).padStart(2, '0'));
    setText('#cLast', project.last);
    setText('#fNodes', `节点 ${project.mass}`);
    setText('#fMiles', `里程碑 ${String(project.miles).padStart(2, '0')}`);
    setText('#fSync', `最近同步 ${project.updated}`);
    setText('#cGoal', project.goal);

    const sections = $('#cSections');
    if (sections) sections.innerHTML = project.sections.map(secMarkup).join('');

    const passed = project.sections.flatMap((s) =>
      s.tasks.filter((t) => t.state === 'passed').map((t) => ({ title: t.title, section: s.name })),
    );
    const extra = Math.max(0, project.miles - passed.length);
    const milesRow = $('#cMilesRow');
    if (milesRow) {
      milesRow.innerHTML = passed.length
        ? `<span>里程碑</span>${passed
            .slice(0, 4)
            .map((m) => `<span class="mile"><i></i><b>${esc(m.title)}</b><small>${esc(m.section)}</small></span>`)
            .join('')}${extra ? `<span class="mile-more">+${extra}</span>` : ''}`
        : '';
    }

    const links = connected(project);
    const linksRow = $('#cLinks');
    if (linksRow) {
      linksRow.innerHTML = links.length
        ? `<span>星链</span>${links
            .map((x) => `<button type="button" data-open-project="${esc(x.id)}">${esc(x.cn || x.name)} // ${esc(x.code)}</button>`)
            .join('')}`
        : '';
    }

    const watch = $('#cWatch');
    if (watch) watch.innerHTML = watchMarkup(project);

    const sys = $('#cSys');
    if (sys) {
      sys.innerHTML = `<div><span>监视</span><b>3 天</b></div><div><span>风险</span><b>${project.state === 'alert' ? '01' : '00'}</b></div><div><span>文件</span><b>${String((project.files || []).length).padStart(2, '0')}</b></div><div><span>链路</span><b>98.4%</b></div>`;
    }

    renderFlow(project);
    renderSide();
    renderSpectrum();

    const overlay = $('#overlay');
    if (overlay) overlay.hidden = false;
    document.body.classList.add('locked');
    const hint = $('#hint');
    if (hint) hint.style.opacity = '0';
    requestAnimationFrame(() => $('#cClose')?.focus({ preventScroll: true }));
  }

  function close() {
    const overlay = $('#overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('locked');
    app.state.current = null;
    app.state.backgroundPaused = false;
    app.requestRender?.();
    const hint = $('#hint');
    if (hint) hint.style.opacity = '';
    app.renderTarget(app.byId(app.state.selected));
    app.lastTrigger?.focus?.({ preventScroll: true });
    app.lastTrigger = null;
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && !$('#overlay')?.hidden) {
      e.preventDefault();
      close();
    }
  }

  function bind() {
    $('#cClose')?.addEventListener('click', close);
    $('#overlay')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
    });
    $('#cPlan')?.addEventListener('click', () => {
      if (app.state.current) {
        app.options.onAction?.('open-editor', { projectId: app.state.current.id, tab: 'plan' });
      }
    });
    $('#cDiscuss')?.addEventListener('click', () => {
      if (app.state.current) {
        app.options.onAction?.('open-editor', { projectId: app.state.current.id, tab: 'discuss' });
      }
    });
    document.addEventListener('keydown', onKeydown);
    $('#cDecisions')?.addEventListener('click', (e) => {
      const item = e.target.closest('.c-dec');
      if (!item || !app.state.current) return;
      const target = $(`#sec-${item.dataset.sec}`);
      target?.scrollIntoView({ behavior: app.state.motion ? 'smooth' : 'auto', block: 'center' });
      target?.classList.add('flash');
      setTimeout(() => target?.classList.remove('flash'), 1100);
    });
    $('#cLinks')?.addEventListener('click', (e) => {
      const button = e.target.closest('[data-open-project]');
      if (button) open(button.dataset.openProject, null);
    });
    $('#cIdeaForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#cIdeaInput');
      const text = input?.value.trim();
      if (!text || !app.state.current) return;
      if (app.options.onAction) {
        app.options.onAction('add-idea', { projectId: app.state.current.id, text });
        if (input) input.value = '';
        app.toast?.('想法已记录');
        return;
      }
      app.state.ideas.unshift({ project: app.state.current.name, text, time: '刚刚' });
      if (input) input.value = '';
      renderSide();
      app.toast?.('已记入想法（演示不保存）');
    });
  }

  function dispose() {
    document.removeEventListener('keydown', onKeydown);
  }

  return { open, close, renderFlow, renderSide, bind, dispose };
}
