import * as THREE from 'three';

export function makePointTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,.9)');
  grd.addColorStop(0.55, 'rgba(255,255,255,.28)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeGlowTexture(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.18, outer);
  grd.addColorStop(0.5, 'rgba(255,255,255,.08)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tileable low-frequency noise, advected by the accretion disk rotation.
export function makeFlowTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const octaves = [
    { freq: 4, amp: 0.55 },
    { freq: 8, amp: 0.3 },
    { freq: 16, amp: 0.15 },
  ];
  const grids = octaves.map(({ freq }) => {
    const grid = new Float32Array(freq * freq);
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
    return grid;
  });
  const smooth = (t) => t * t * (3 - 2 * t);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 0;
      for (let o = 0; o < octaves.length; o++) {
        const f = octaves[o].freq;
        const grid = grids[o];
        const fx = (x / size) * f;
        const fy = (y / size) * f;
        const x0 = Math.floor(fx) % f;
        const y0 = Math.floor(fy) % f;
        const x1 = (x0 + 1) % f;
        const y1 = (y0 + 1) % f;
        const tx = smooth(fx - Math.floor(fx));
        const ty = smooth(fy - Math.floor(fy));
        const a = grid[y0 * f + x0] * (1 - tx) + grid[y0 * f + x1] * tx;
        const b = grid[y1 * f + x0] * (1 - tx) + grid[y1 * f + x1] * tx;
        value += (a * (1 - ty) + b * ty) * octaves[o].amp;
      }
      const c = Math.max(0, Math.min(255, Math.round(value * 255)));
      const i = (y * size + x) * 4;
      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = c;
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Procedural deep-space backdrop used when no background image is supplied.
export function makeNebulaTexture() {
  const w = 1600;
  const h = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');

  const base = g.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#02050a');
  base.addColorStop(0.45, '#050a15');
  base.addColorStop(1, '#020408');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const blobs = [
    [0.62, 0.18, 0.42, 80, 70, 190, 0.2],
    [0.28, 0.36, 0.36, 30, 100, 130, 0.16],
    [0.76, 0.52, 0.34, 120, 45, 150, 0.13],
    [0.45, 0.68, 0.42, 40, 70, 160, 0.14],
    [0.18, 0.72, 0.3, 80, 40, 120, 0.12],
  ];
  g.globalCompositeOperation = 'lighter';
  for (const [x, y, r, rr, gg, bb, aa] of blobs) {
    const rad = Math.max(w, h) * r;
    const grd = g.createRadialGradient(w * x, h * y, 0, w * x, h * y, rad);
    grd.addColorStop(0, `rgba(${rr},${gg},${bb},${aa})`);
    grd.addColorStop(0.55, `rgba(${rr},${gg},${bb},${aa * 0.25})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }

  // Distant, dimmed galaxies.
  const farPalette = [
    [120, 160, 255],
    [180, 120, 255],
    [80, 220, 210],
    [255, 150, 130],
    [100, 140, 255],
  ];
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rx = 26 + Math.random() * 165;
    const ry = rx * (0.18 + Math.random() * 0.38);
    const col = farPalette[Math.floor(Math.random() * farPalette.length)];
    g.save();
    g.translate(x, y);
    g.rotate((Math.random() - 0.5) * 1.2);
    g.scale(1, ry / rx);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${0.18 + Math.random() * 0.16})`);
    grd.addColorStop(0.28, `rgba(${col[0]},${col[1]},${col[2]},${0.04 + Math.random() * 0.06})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Distant coloured nebulae.
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rad = 120 + Math.random() * 260;
    const col = i % 3 === 0 ? [70, 190, 220] : i % 3 === 1 ? [170, 90, 230] : [255, 130, 170];
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.055)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }

  g.save();
  g.translate(w * 0.5, h * 0.48);
  g.rotate(-0.42);
  const band = g.createLinearGradient(0, -h * 0.2, 0, h * 0.2);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.45, 'rgba(80,120,220,.055)');
  band.addColorStop(0.55, 'rgba(150,120,240,.06)');
  band.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = band;
  g.fillRect(-w, -h * 0.2, w * 2, h * 0.4);
  g.restore();

  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(2,5,12,.16)';
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';

  for (let i = 0; i < 900; i++) {
    const a = Math.random() * 0.18;
    g.fillStyle = `rgba(${180 + Math.random() * 60},${200 + Math.random() * 40},255,${a})`;
    const s = Math.random() * 1.2;
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  g.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Soft radial galaxy haze used as a camera-facing billboard.
export function makeGalaxyHazeTexture() {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext('2d');
  const cx = S / 2;
  const cy = S / 2;
  const R = S * 0.46;
  g.globalCompositeOperation = 'lighter';

  const blob = (x, y, rad, col, a) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
    grd.addColorStop(0.42, `rgba(${col[0]},${col[1]},${col[2]},${a * 0.42})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
  };

  const palette = [
    [86, 132, 255],
    [140, 108, 255],
    [72, 196, 230],
    [255, 186, 120],
    [190, 150, 255],
  ];
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(Math.random(), 0.55);
    const r = (0.08 + t * 0.94) * R;
    const arm = i % 3;
    const th = arm * ((Math.PI * 2) / 3) + 2.15 * Math.log(r / (0.06 * R)) + (Math.random() - 0.5) * (0.1 + 0.2 * t);
    const x = cx + Math.cos(th) * r;
    const y = cy + Math.sin(th) * r;
    const col = t < 0.16 ? [255, 196, 130] : palette[i % palette.length];
    blob(x, y, (0.1 + 0.16 * t + Math.random() * 0.12) * S, col, 0.012 + Math.random() * 0.018);
  }
  for (let i = 0; i < 44; i++) {
    const x = cx + (Math.random() - 0.5) * S * 0.86;
    const y = cy + (Math.random() - 0.5) * S * 0.86;
    blob(x, y, (0.1 + Math.random() * 0.18) * S, palette[i % 3], 0.008 + Math.random() * 0.012);
  }
  blob(cx, cy, S * 0.2, [255, 214, 168], 0.12);
  blob(cx, cy, S * 0.34, [255, 176, 110], 0.035);

  const out = document.createElement('canvas');
  out.width = S;
  out.height = S;
  const og = out.getContext('2d');
  og.filter = 'blur(10px)';
  og.drawImage(canvas, 0, 0);
  og.filter = 'none';
  og.globalCompositeOperation = 'destination-in';
  const mask = og.createRadialGradient(cx, cy, 0, cx, cy, S * 0.5);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.52, 'rgba(0,0,0,.9)');
  mask.addColorStop(0.78, 'rgba(0,0,0,.28)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  og.fillStyle = mask;
  og.fillRect(0, 0, S, S);
  og.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
