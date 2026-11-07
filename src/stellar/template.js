import { esc } from './core/dom.js';

/**
 * The console owns its full DOM. A host only needs to provide a mount point
 * and a data object; every control below has a stable id/class contract.
 */
export function mountTemplate(host, data) {
  const { brand, labels, core } = data;
  const legend = [
    ['run', labels.state.run],
    ['wait', labels.state.wait],
    ['alert', labels.state.alert],
    ['idle', labels.state.idle],
  ]
    .map(([state, text]) => `<span><i class="d ${state}"></i>${esc(text)}</span>`)
    .join('');

  host.innerHTML = `
  <header class="hud">
    <div class="hud-left">
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="6.4" stroke="currentColor" stroke-width=".8" stroke-dasharray="1.5 2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width=".8"/></svg>
      </span>
      <div class="brand-copy"><b>${esc(brand.title)}</b><small>${esc(brand.subtitle)}</small></div>
    </div>
    <div class="hud-stats" aria-label="全局态势">
      <span><b data-kpi="fleets">0</b><small>编队</small></span>
      <span><b data-kpi="running">0</b><small>运行</small></span>
      <span><b data-kpi="decisions">0</b><small>待决</small></span>
      <span><b data-kpi="milestones">0</b><small>里程碑</small></span>
    </div>
    <div class="hud-right">
      <div class="legend">${legend}</div>
      <button class="hud-btn" id="demoToggle" type="button" aria-pressed="true">演示 <span>开</span></button>
      <button class="hud-btn" id="motionToggle" type="button" aria-pressed="true">动效 <span>开</span></button>
      <span class="clock" id="clock">--:--:--</span>
    </div>
  </header>

  <span class="screen-bracket tl" aria-hidden="true"></span>
  <span class="screen-bracket tr" aria-hidden="true"></span>
  <span class="screen-bracket bl" aria-hidden="true"></span>
  <span class="screen-bracket br" aria-hidden="true"></span>

  <main class="space" id="space">
    <canvas id="sky" aria-hidden="true"></canvas>
    <div class="star-layer" id="stars"></div>
    <svg class="leader-layer" id="leaderLayer" aria-hidden="true">
      <path id="leaderPath" d=""></path>
      <circle id="leaderDot" r="2.6"></circle>
      <circle id="leaderDot2" r="3.4"></circle>
      <circle id="leaderPacket" r="2.4"></circle>
    </svg>
    <section class="target-card" id="targetCard" aria-live="polite"></section>
    <div class="live-strip" id="liveStrip">
      <span class="live-dot"></span><b>LIVE</b>
      <span class="live-tag" id="liveTag">系统</span>
      <span class="live-text" id="liveText">等待信号…</span>
      <em id="liveTime">--:--</em>
    </div>
    <div class="view-hint" id="hint">左键旋转 · 滚轮缩放 · 中键拖动平移 · 点击打开</div>
    <button class="reset-view" id="resetView" type="button">归位</button>
  </main>

  <div class="overlay" id="overlay" hidden>
    <div class="dim" data-close></div>
    <section class="console" role="dialog" aria-modal="true" aria-labelledby="consoleTitle">
      <div class="projector" aria-hidden="true"></div>
      <div class="holo-orb" aria-hidden="true">
        <svg viewBox="0 0 600 600" fill="none">
          <circle cx="300" cy="300" r="250"/>
          <circle cx="300" cy="300" r="214" stroke-dasharray="3 7"/>
          <circle cx="300" cy="300" r="160"/>
          <ellipse cx="300" cy="300" rx="250" ry="92"/>
          <ellipse cx="300" cy="300" rx="250" ry="168"/>
          <ellipse cx="300" cy="300" rx="92" ry="250"/>
          <ellipse cx="300" cy="300" rx="168" ry="250"/>
          <path d="M50 300h500M300 50v500"/>
          <path d="M92 170h416M92 430h416" stroke-dasharray="2 8"/>
          <circle cx="300" cy="300" r="6"/>
          <path d="M300 44v18M300 538v18M44 300h18M538 300h18"/>
          <path d="M135 135l14 14M451 451l14 14M465 135l-14 14M149 451l-14 14"/>
        </svg>
      </div>
      <header class="ch">
        <div class="ch-id">项目 // <b id="cCode">—</b></div>
        <div class="ch-main">
          <span class="c-orb" id="cOrb" aria-hidden="true"></span>
          <h2 id="consoleTitle">—</h2>
          <span class="c-state" id="cState"></span>
        </div>
        <div class="ch-data">
          <span>体量 <b id="cMass">—</b></span>
          <span>里程碑 <b id="cMiles">—</b></span>
          <span>最近 <b id="cLast">—</b></span>
        </div>
        <button class="c-close" id="cClose" type="button">[ 关闭 ]</button>
      </header>
      <div class="ch-sub"><span id="cPhase"></span><span id="cAttach"></span></div>
      <div class="ch-body">
        <div class="ch-maincol">
          <div class="flow-band">
            <div class="flow-head"><span>信号图</span><b id="flowMeta">—</b><em>实时</em></div>
            <svg id="flow" viewBox="0 0 820 138" preserveAspectRatio="none" aria-hidden="true"></svg>
          </div>
          <div class="goal"><span>当前目标</span><p id="cGoal"></p></div>
          <div class="sections" id="cSections"></div>
          <div class="miles" id="cMilesRow"></div>
          <div class="links-row" id="cLinks"></div>
          <div id="cWatch"></div>
          <div class="stream-band">
            <div class="stream-head"><span>数据流</span><em>实时</em></div>
            <div class="spectrum" id="spectrum"></div>
          </div>
        </div>
        <aside class="ch-side">
          <section class="c-panel">
            <header><span>待决策</span><b id="cDecisionCount">0</b></header>
            <div class="c-list" id="cDecisions"></div>
          </section>
          <section class="c-panel">
            <header><span>想法</span><b id="cIdeaCount">0</b></header>
            <form class="c-idea" id="cIdeaForm"><input id="cIdeaInput" type="text" maxlength="80" placeholder="记录一个想法…" autocomplete="off" aria-label="记录想法"><kbd>回车</kbd></form>
            <div class="c-list" id="cIdeas"></div>
          </section>
          <section class="c-panel comms">
            <header><span>通信</span><em>实时</em></header>
            <div class="c-list" id="cSignals"></div>
          </section>
          <section class="c-panel">
            <header><span>系统</span><em>正常</em></header>
            <div class="c-sys" id="cSys"></div>
          </section>
        </aside>
      </div>
      <footer class="ch-foot">
        <span>链路稳定</span><span id="fNodes">节点 0</span><span id="fMiles">里程碑 0</span><span id="fSync">最近同步 —</span><b>▮</b>
      </footer>
      <span class="bracket tl"></span><span class="bracket tr"></span><span class="bracket bl"></span><span class="bracket br"></span>
    </section>
  </div>

  <button class="tune-toggle" id="tuneToggle" type="button" aria-controls="tunePanel">调参</button>
  <aside class="tune-panel" id="tunePanel" hidden>
    <header>
      <b>实时调参</b>
      <span class="tune-actions"><button id="tuneReset" type="button">重置</button><button id="tuneClose" type="button" aria-label="关闭">×</button></span>
    </header>
    <div class="tune-body" id="tuneBody"></div>
  </aside>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <div class="boot-status" id="bootStatus">正在接入 WebGL 星河…</div>
  `;

  // Keep a reference for hosts that want to translate or theme the core tag.
  host.dataset.coreName = core.name;
}
