import * as THREE from 'three';
import { NOISE_GLSL, SURFACE_VERTEX_GLSL } from '../glsl.js';

/** Opaque rocky planet with a hard terminator and subtle specular. */
export function createRockPlanet({ color }) {
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
        float n1 = fbm3(p * 4.0);
        float n2 = fbm3(p * 9.0 + vec3(3.0, 1.0, 2.0));
        vec3 base = mix(uColor * 0.34, uColor * 1.05, n1 * 0.7 + n2 * 0.3);
        vec3 lightDir = normalize(vec3(-0.45, 0.75, 0.5));
        float diff = max(dot(n, lightDir), 0.0);
        float day = 0.10 + 0.90 * diff;
        float spec = pow(max(dot(reflect(-lightDir, n), v), 0.0), 18.0) * 0.18;
        float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.10;
        vec3 col = base * day + uColor * rim + vec3(spec);
        gl_FragColor = vec4(col * uDim, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  function update(t, { stateAlpha = 1 } = {}) {
    material.uniforms.uDim.value = stateAlpha;
    mesh.rotation.y = t * 0.06;
  }
  function dispose() {
    geometry.dispose();
    material.dispose();
  }
  return { object3D: mesh, update, dispose };
}
