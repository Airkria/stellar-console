import * as THREE from 'three';
import { SURFACE_VERTEX_GLSL } from '../glsl.js';
import { createGlowShell } from './glow-shell.js';

/**
 * Classic emissive star: Fresnel rim + slow surface bands + a thin Fresnel
 * glow shell. The shell keeps the centre transparent so the star stays solid.
 */
export function createClassicStar({ color }) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 32, 24);
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uTime: { value: 0 }, uDim: { value: 1 } },
    vertexShader: SURFACE_VERTEX_GLSL,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uDim;
      varying vec3 vN;
      varying vec3 vPos;
      varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.0);
        float band = 0.5 + 0.5 * sin(n.y * 14.0 + uTime * 0.7 + n.x * 9.0);
        vec3 c = mix(uColor, vec3(1.0), 0.35 + 0.45 * fres);
        c += uColor * fres * 1.5;
        c *= 0.86 + 0.14 * band;
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const shell = createGlowShell({ color });
  group.add(shell.object3D);

  function update(
    t,
    {
      stateAlpha = 1,
      shellEnabled = true,
      shellThickness = 1,
      shellEdge = 1,
      shellInner = 0.35,
    } = {},
  ) {
    material.uniforms.uTime.value = t;
    material.uniforms.uDim.value = stateAlpha;
    mesh.rotation.y = t * 0.12;
    shell.update(t, {
      stateAlpha,
      enabled: shellEnabled,
      edge: shellEdge,
      inner: shellInner,
      thickness: shellThickness,
    });
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    shell.dispose();
  }

  return { object3D: group, update, dispose };
}
