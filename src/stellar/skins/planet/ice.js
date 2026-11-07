import * as THREE from 'three';
import { NOISE_GLSL, SURFACE_VERTEX_GLSL } from '../glsl.js';

/** Pale ice planet: soft bands, strong specular, cold rim. */
export function createIcePlanet({ color }) {
  const geometry = new THREE.SphereGeometry(1, 28, 20);
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uDim: { value: 1 } },
    vertexShader: SURFACE_VERTEX_GLSL,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uDim;
      varying vec3 vN;
      varying vec3 vPos;
      varying vec3 vV;
      ${NOISE_GLSL}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        vec3 p = normalize(vPos);
        float band = 0.5 + 0.5 * sin(p.y * 16.0 + fbm3(p * 3.0) * 4.0);
        vec3 base = mix(uColor * 0.55, uColor * 1.15, band * 0.65 + 0.35);
        vec3 lightDir = normalize(vec3(-0.45, 0.75, 0.5));
        float diff = max(dot(n, lightDir), 0.0);
        float day = 0.12 + 0.88 * diff;
        float spec = pow(max(dot(reflect(-lightDir, n), v), 0.0), 42.0) * 0.55;
        float rim = pow(1.0 - max(dot(n, v), 0.0), 2.2) * 0.22;
        vec3 col = base * day + vec3(0.55, 0.8, 1.0) * (spec + rim);
        gl_FragColor = vec4(col * uDim, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  function update(t, { stateAlpha = 1 } = {}) {
    material.uniforms.uDim.value = stateAlpha;
    mesh.rotation.y = t * 0.04;
  }
  function dispose() {
    geometry.dispose();
    material.dispose();
  }
  return { object3D: mesh, update, dispose };
}
