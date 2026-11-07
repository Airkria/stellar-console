import * as THREE from 'three';
import { NOISE_GLSL, SURFACE_VERTEX_GLSL } from '../glsl.js';

/** Dark volcanic crust with glowing cracks. */
export function createLavaPlanet({ color }) {
  const geometry = new THREE.SphereGeometry(1, 28, 20);
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uDim: { value: 1 }, uTime: { value: 0 } },
    vertexShader: SURFACE_VERTEX_GLSL,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uDim;
      uniform float uTime;
      varying vec3 vN;
      varying vec3 vPos;
      varying vec3 vV;
      ${NOISE_GLSL}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        vec3 p = normalize(vPos);
        float crust = fbm3(p * 4.5 + vec3(uTime * 0.03, 0.0, 0.0));
        float crack = smoothstep(0.52, 0.62, fbm3(p * 7.0 + vec3(2.0, 1.0, 3.0)));
        vec3 rock = uColor * (0.16 + 0.30 * crust);
        vec3 glow = vec3(1.0, 0.25, 0.03) * crack * 1.6;
        vec3 lightDir = normalize(vec3(-0.45, 0.75, 0.5));
        float diff = max(dot(n, lightDir), 0.0);
        vec3 col = rock * (0.18 + 0.82 * diff) + glow * (0.55 + 0.45 * diff);
        gl_FragColor = vec4(col * uDim, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  function update(t, { stateAlpha = 1 } = {}) {
    material.uniforms.uDim.value = stateAlpha;
    material.uniforms.uTime.value = t;
    mesh.rotation.y = t * 0.03;
  }
  function dispose() {
    geometry.dispose();
    material.dispose();
  }
  return { object3D: mesh, update, dispose };
}
