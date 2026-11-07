import { $ } from './core/dom.js';

/** Dashed leader line from the selected project to its target card. */
export function createLeader(app) {
  function update() {
    const card = $('#targetCard');
    const svg = $('#leaderLayer');
    if (!card || !svg || !app.scene) return;

    const S = app.scene.S;
    const id = app.state.selected;
    const project = app.byId(id);
    const pos = app.screenPositions.get(id);
    if (!project || !pos || !pos.visible) {
      card.classList.add('empty');
      svg.style.opacity = '0';
      const hp = $('#leaderPacket');
      if (hp) hp.style.opacity = '0';
      return;
    }

    card.classList.remove('empty');
    svg.style.opacity = '1';
    const packet = $('#leaderPacket');
    if (packet) packet.style.opacity = '1';

    const { w: cw, h: ch } = app.target.cardSize;
    const side = pos.x + 54 + cw <= S.VW - 12 ? 'right' : 'left';
    let cx = side === 'right' ? pos.x + 54 : pos.x - 54 - cw;
    cx = Math.max(12, Math.min(S.VW - cw - 12, cx));
    let cy = pos.y - ch * 0.55;
    cy = Math.max(12, Math.min(S.VH - ch - 12, cy));
    card.style.transform = `translate3d(${cx}px,${cy}px,0)`;

    const ax = side === 'right' ? cx : cx + cw;
    const ay = cy + 24;
    const mx = side === 'right' ? pos.x + 32 : pos.x - 32;
    const path = $('#leaderPath');
    if (path) {
      path.setAttribute('d', `M ${pos.x} ${pos.y} L ${mx} ${pos.y} L ${ax} ${ay}`);
      path.style.strokeDashoffset = String(-((performance.now() / 48) % 20));
    }
    const dot = $('#leaderDot');
    if (dot) {
      dot.setAttribute('cx', pos.x);
      dot.setAttribute('cy', pos.y);
    }
    const dot2 = $('#leaderDot2');
    if (dot2) {
      dot2.setAttribute('cx', ax);
      dot2.setAttribute('cy', ay);
    }
    if (packet) {
      const t = (performance.now() / 1700) % 1;
      let px;
      let py;
      if (t < 0.45) {
        const k = t / 0.45;
        px = pos.x + (mx - pos.x) * k;
        py = pos.y;
      } else {
        const k = (t - 0.45) / 0.55;
        px = mx + (ax - mx) * k;
        py = pos.y + (ay - pos.y) * k;
      }
      packet.setAttribute('cx', px);
      packet.setAttribute('cy', py);
    }
  }

  return { update };
}
