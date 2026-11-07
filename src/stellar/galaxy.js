import * as THREE from 'three';
import { gauss } from './core/math.js';
import { makeGlowTexture, makeGalaxyHazeTexture } from './textures.js';

/**
 * Builds every star/nebula layer around the central black hole.
 * All layers share additive point materials and the same generated sprite.
 */
export function createGalaxy({ scene, galaxyGroup, starTexture, refs }) {
  function buildGalaxyPlane() {
    const tex = makeGalaxyHazeTexture();
    // Camera-facing haze billboard: a flat plane collapses to a hard bright
    // line at grazing angles.
    refs.hazeMaterial = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(refs.hazeMaterial);
    sprite.scale.set(8.4, 8.4, 1);
    sprite.renderOrder = -1;
    galaxyGroup.add(sprite);
  }

  function buildGalaxyPoints() {
    const N = 140000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const alphas = new Float32Array(N);
    const armT = new Float32Array(N);
    const offset = new Float32Array(N * 3);
    const warm = new THREE.Color('#ffe2bd');
    const blue = new THREE.Color('#a9c8ff');
    const pale = new THREE.Color('#e4f0ff');
    const violet = new THREE.Color('#cdb8ff');
    let k = 0;

    // Spiral arms, built from 3D points only (no galaxy texture).
    for (let i = 0; i < N * 0.88; i++) {
      const arm = i % 3;
      const t = Math.pow(Math.random(), 0.52);
      const r = 0.18 + t * 4.25;
      const th = arm * ((Math.PI * 2) / 3) + 1.65 * Math.log(r / 0.18) + gauss() * (0.004 + 0.02 * t);
      // Base spiral is fixed; the cross-section offset is applied in the
      // vertex shader so arm width can be tuned without rebuilding geometry.
      pos[k * 3] = Math.cos(th) * r;
      pos[k * 3 + 1] = 0;
      pos[k * 3 + 2] = Math.sin(th) * r;
      offset[k * 3] = gauss();
      offset[k * 3 + 1] = gauss() * 1.1;
      offset[k * 3 + 2] = gauss();
      armT[k] = t;
      const c = t < 0.1 || Math.random() < 0.1 ? warm : Math.random() < 0.45 ? pale : Math.random() < 0.75 ? blue : violet;
      col[k * 3] = c.r;
      col[k * 3 + 1] = c.g;
      col[k * 3 + 2] = c.b;
      const bright = Math.random() < 0.004;
      sizes[k] = (0.24 + Math.random() * 0.78) * (bright ? 1.3 : 1);
      alphas[k] = (0.025 + Math.random() * 0.2) * (bright ? 1 : 0.8);
      k++;
    }

    // Diffuse halo and central cluster.
    while (k < N) {
      const r = Math.pow(Math.random(), 0.55) * 4.7;
      const th = Math.random() * Math.PI * 2;
      pos[k * 3] = Math.cos(th) * r;
      pos[k * 3 + 1] = gauss() * (0.12 + 0.75 * Math.random());
      pos[k * 3 + 2] = Math.sin(th) * r;
      const c = Math.random() < 0.55 ? pale : Math.random() < 0.6 ? blue : violet;
      col[k * 3] = c.r;
      col[k * 3 + 1] = c.g;
      col[k * 3 + 2] = c.b;
      sizes[k] = 0.18 + Math.random() * 0.5;
      alphas[k] = 0.008 + Math.random() * 0.06;
      k++;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aArmT', new THREE.BufferAttribute(armT, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offset, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: starTexture },
        uPixelRatio: { value: refs.DPR },
        uSize: { value: 0.075 },
        uAlpha: { value: 1 },
        uThick: { value: 1 },
        uWidth: { value: 1 },
        uArmInner: { value: 0.07 },
        uArmOuter: { value: 0.26 },
        uArmWidth: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        attribute float aArmT;
        attribute vec3 aOffset;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uAlpha;
        uniform float uThick;
        uniform float uWidth;
        uniform float uArmInner;
        uniform float uArmOuter;
        uniform float uArmWidth;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha * uAlpha;
          float armR = mix(uArmInner, uArmOuter, aArmT) * uArmWidth;
          vec3 p = position + aOffset * armR;
          p.y *= uThick;
          p.xz *= uWidth;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = min(64.0, aSize * uSize * uPixelRatio * (300.0 / max(0.1, -mv.z)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.01) discard;
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    refs.galaxyMaterial = mat;
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 0;
    galaxyGroup.add(points);
  }

  function buildDustPoints() {
    const N = 140000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const alphas = new Float32Array(N);
    const armT = new Float32Array(N);
    const offset = new Float32Array(N * 3);
    const warm = new THREE.Color('#ffc98f');
    const amber = new THREE.Color('#d9946b');
    const violet = new THREE.Color('#b79bff');
    const pale = new THREE.Color('#8fb9ff');

    for (let i = 0; i < N; i++) {
      const halo = Math.random() < 0.12;
      let x;
      let y;
      let z;
      if (halo) {
        const r = Math.pow(Math.random(), 0.55) * 4.6;
        const th = Math.random() * Math.PI * 2;
        x = Math.cos(th) * r;
        z = Math.sin(th) * r;
        y = gauss() * (0.45 + 1.5 * Math.random());
      } else {
        const arm = i % 3;
        const t = Math.pow(Math.random(), 0.6);
        const r = 0.14 + t * 4.35;
        const th = arm * ((Math.PI * 2) / 3) + 1.65 * Math.log(r / 0.14) + gauss() * (0.015 + 0.06 * t);
        x = Math.cos(th) * r;
        z = Math.sin(th) * r;
        y = 0;
        offset[i * 3] = gauss();
        offset[i * 3 + 1] = gauss() * 1.1;
        offset[i * 3 + 2] = gauss();
        armT[i] = t;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const c = Math.random() < 0.38 ? warm : Math.random() < 0.7 ? violet : Math.random() < 0.7 ? amber : pale;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sizes[i] = 0.32 + Math.random() * 1.15;
      alphas[i] = 0.0015 + Math.random() * 0.006;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aArmT', new THREE.BufferAttribute(armT, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offset, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: starTexture },
        uPixelRatio: { value: refs.DPR },
        uSize: { value: 0.1 },
        uTime: { value: 0 },
        uAlpha: { value: 1 },
        uThick: { value: 1 },
        uWidth: { value: 1 },
        uArmInner: { value: 0.09 },
        uArmOuter: { value: 0.34 },
        uArmWidth: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        attribute float aArmT;
        attribute vec3 aOffset;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uTime;
        uniform float uAlpha;
        uniform float uThick;
        uniform float uWidth;
        uniform float uArmInner;
        uniform float uArmOuter;
        uniform float uArmWidth;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha * uAlpha;
          float armR = mix(uArmInner, uArmOuter, aArmT) * uArmWidth;
          vec3 p = position + aOffset * armR;
          p.y += sin(uTime * 0.12 + p.x * 1.7 + p.z * 1.3) * 0.012;
          p.y *= uThick;
          p.xz *= uWidth;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = min(46.0, aSize * uSize * uPixelRatio * (300.0 / max(0.1, -mv.z)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.008) discard;
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    refs.dustMaterial = mat;
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 1;
    galaxyGroup.add(points);
  }

  // Ordered star streams falling toward the disk; animated entirely on the GPU.
  function buildInflow() {
    const N = 28000;
    const seed = new Float32Array(N);
    const arm = new Float32Array(N);
    const stream = new Float32Array(N);
    const jitter = new Float32Array(N);
    const speed = new Float32Array(N);
    const yoff = new Float32Array(N);
    const sizes = new Float32Array(N);
    const seaFlag = new Float32Array(N);
    const color = new Float32Array(N * 3);
    const silver = new THREE.Color('#e7f4ff');
    const warm = new THREE.Color('#ffefd2');
    const gold = new THREE.Color('#ffcf8d');
    const blue = new THREE.Color('#a9cfff');

    for (let i = 0; i < N; i++) {
      const sea = Math.random() < 0.12;
      seed[i] = Math.random();
      arm[i] = i % 3;
      seaFlag[i] = sea ? 1 : 0;
      if (sea) {
        stream[i] = gauss() * 0.3;
        jitter[i] = gauss() * 1.1;
      } else {
        stream[i] = ((Math.floor(Math.random() * 8) + 0.5) / 8 - 0.5) * 0.42 + gauss() * 0.014;
        jitter[i] = gauss() * 0.24;
      }
      speed[i] = (sea ? 0.014 : 0.019) + Math.random() * (sea ? 0.01 : 0.013);
      yoff[i] = gauss() * (sea ? 0.95 : 0.45);
      sizes[i] = sea ? 0.24 + Math.random() * 0.28 : 0.18 + Math.random() * 0.24;
      if (Math.random() < 0.008) sizes[i] *= 1.5;
      const c = Math.random() < 0.58 ? silver : Math.random() < 0.83 ? warm : Math.random() < 0.97 ? blue : gold;
      color[i * 3] = c.r;
      color[i * 3 + 1] = c.g;
      color[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aArm', new THREE.BufferAttribute(arm, 1));
    geo.setAttribute('aStream', new THREE.BufferAttribute(stream, 1));
    geo.setAttribute('aJitter', new THREE.BufferAttribute(jitter, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aY', new THREE.BufferAttribute(yoff, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aSea', new THREE.BufferAttribute(seaFlag, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: starTexture },
        uPixelRatio: { value: refs.DPR },
        uSize: { value: 0.06 },
        uTime: { value: 0 },
        uAlpha: { value: 1.3 },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        attribute float aArm;
        attribute float aStream;
        attribute float aJitter;
        attribute float aSpeed;
        attribute float aY;
        attribute float aSize;
        attribute float aSea;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uTime;
        uniform float uAlpha;
        void main() {
          float life = fract(uTime * aSpeed + aSeed);
          float fall = pow(life, 1.6);
          float r = mix(4.85, 0.68, fall);
          float th = aArm * 2.0943951 + 1.65 * log(r / 0.18) + aStream
            + aJitter * (0.012 + 0.050 * clamp(r / 4.85, 0.0, 1.0));
          float yy = aY * (0.02 + 0.22 * clamp(r / 4.85, 0.0, 1.0));
          vec3 p = vec3(cos(th) * r, yy, sin(th) * r);
          float tw = 0.72 + 0.28 * sin(uTime * (1.2 + aSpeed * 46.0) + aSeed * 6.2831);
          vColor = aColor;
          float baseA = mix(0.30, 0.16, aSea);
          float amp = mix(0.38, 0.22, aSea);
          vAlpha = smoothstep(0.0, 0.10, life) * (1.0 - smoothstep(0.72, 0.95, life)) * (baseA + amp * tw) * uAlpha;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = min(7.0, aSize * uSize * uPixelRatio * (300.0 / max(0.1, -mv.z)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.01) discard;
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    refs.inflowMaterial = mat;
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    galaxyGroup.add(points);
  }

  // A wide, faint halo that makes the spiral read as a star river.
  function buildStarRiver() {
    const N = 20000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const alphas = new Float32Array(N);
    const pale = new THREE.Color('#d4e4ff');
    const blue = new THREE.Color('#93baff');
    const violet = new THREE.Color('#b9a8ff');
    const warm = new THREE.Color('#ffe8cb');

    for (let i = 0; i < N; i++) {
      const r = 5 + Math.pow(Math.random(), 0.7) * 9.8;
      const spherical = Math.random() < 0.78;
      let x;
      let y;
      let z;
      if (spherical) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        x = Math.cos(th) * Math.sin(ph) * r;
        y = Math.cos(ph) * r * 0.8;
        z = Math.sin(th) * Math.sin(ph) * r;
      } else {
        const arm = i % 3;
        const th = arm * ((Math.PI * 2) / 3) + 0.95 * Math.log(r / 5) + gauss() * (0.22 + 0.55 * Math.random());
        x = Math.cos(th) * r + gauss() * 0.42;
        y = gauss() * (0.2 + 0.95 * Math.random());
        z = Math.sin(th) * r + gauss() * 0.42;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const c = Math.random() < 0.58 ? pale : Math.random() < 0.72 ? blue : Math.random() < 0.84 ? violet : warm;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      const bright = Math.random() < 0.012;
      sizes[i] = (0.3 + Math.random() * 0.95) * (bright ? 2 : 1);
      alphas[i] = (0.02 + Math.random() * 0.085) * (bright ? 1.8 : 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: starTexture },
        uPixelRatio: { value: refs.DPR },
        uSize: { value: 0.08 },
        uAlpha: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha * uAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(40.0, aSize * uSize * uPixelRatio * (300.0 / max(0.1, -mv.z)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.01) discard;
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    refs.riverMaterial = mat;
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 1;
    refs.riverGroup = new THREE.Group();
    refs.riverGroup.add(points);
    // Independent of galaxyGroup so riverSpeed = 0 really freezes the halo.
    scene.add(refs.riverGroup);
  }

  function buildGalaxyAura() {
    const tex = makeGlowTexture('rgba(205,226,255,1)', 'rgba(110,160,240,.42)');
    refs.auraMaterial = new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.07,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(refs.auraMaterial);
    sprite.scale.set(22, 22, 1);
    sprite.renderOrder = -3;
    scene.add(sprite);
  }

  function buildNebulaClouds() {
    const defs = [
      { p: [-10.5, 2.2, -3.5], s: 12, c: ['rgba(145,185,255,1)', 'rgba(55,100,220,.32)'], o: 0.05 },
      { p: [10, -1.8, -5], s: 10, c: ['rgba(160,130,255,1)', 'rgba(90,55,210,.30)'], o: 0.045 },
      { p: [-7, -3, 4.5], s: 9, c: ['rgba(90,205,235,1)', 'rgba(30,120,200,.28)'], o: 0.04 },
      { p: [8.5, 3.2, 4], s: 9.5, c: ['rgba(255,205,160,1)', 'rgba(180,110,60,.22)'], o: 0.028 },
      { p: [0, 5, -10], s: 13, c: ['rgba(130,165,255,1)', 'rgba(60,90,190,.26)'], o: 0.038 },
      { p: [-4, -5, -9], s: 11, c: ['rgba(175,145,255,1)', 'rgba(95,60,190,.24)'], o: 0.032 },
    ];
    const texCache = new Map();
    const group = new THREE.Group();
    group.renderOrder = -4;
    refs.nebulaMaterials = [];
    for (const d of defs) {
      const key = d.c.join('|');
      let tex = texCache.get(key);
      if (!tex) {
        tex = makeGlowTexture(d.c[0], d.c[1]);
        texCache.set(key, tex);
      }
      const material = new THREE.SpriteMaterial({
        map: tex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: d.o,
        toneMapped: false,
      });
      refs.nebulaMaterials.push({ material, baseOpacity: d.o });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(d.p[0], d.p[1], d.p[2]);
      sprite.scale.set(d.s, d.s, 1);
      sprite.renderOrder = -4;
      group.add(sprite);
    }
    scene.add(group);
  }

  // Distant parallax stars: fills vertical space and gives the console depth.
  function buildDeepStars() {
    const N = 18000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const alphas = new Float32Array(N);
    const seed = new Float32Array(N);
    const speed = new Float32Array(N);
    const pale = new THREE.Color('#dfeeff');
    const blue = new THREE.Color('#9fc4ff');
    const warm = new THREE.Color('#ffe9c9');
    const violet = new THREE.Color('#c9b6ff');

    for (let i = 0; i < N; i++) {
      const r = 9 + Math.pow(Math.random(), 0.7) * 23;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
      const c = Math.random() < 0.56 ? pale : Math.random() < 0.62 ? blue : Math.random() < 0.72 ? violet : warm;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      const bright = Math.random() < 0.04;
      sizes[i] = (0.3 + Math.random() * 0.85) * (bright ? 1.8 : 1);
      alphas[i] = (0.04 + Math.random() * 0.13) * (bright ? 1.6 : 0.8);
      seed[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.35 + Math.random() * 1.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: starTexture },
        uPixelRatio: { value: refs.DPR },
        uSize: { value: 0.08 },
        uTime: { value: 0 },
        uAlpha: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        attribute float aSeed;
        attribute float aSpeed;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uTime;
        uniform float uAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha * (0.66 + 0.34 * sin(uTime * aSpeed + aSeed)) * uAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(22.0, aSize * uSize * uPixelRatio * (300.0 / max(0.1, -mv.z)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.01) discard;
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    refs.deepMaterial = mat;
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = -2;
    refs.deepGroup = new THREE.Group();
    refs.deepGroup.add(points);
    scene.add(refs.deepGroup);
  }

  function build() {
    buildGalaxyPlane();
    buildGalaxyPoints();
    buildDustPoints();
    buildInflow();
    buildStarRiver();
    buildDeepStars();
    buildNebulaClouds();
    buildGalaxyAura();
  }

  return { build };
}
