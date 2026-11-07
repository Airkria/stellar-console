import * as THREE from 'three';
import { SURFACE_VERTEX_GLSL } from '../glsl.js';

/**
 * Classic emissive star: Fresnel rim + slow surface bands + soft halo.
 * This is the original project-body look, kept as the default skin.
 */
export function createClassicStar({ radius, color, glowTexture }) {
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

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.32,
      toneMapped: false,
    }),
  );
  const glowBase = 7.0;
  glow.scale.setScalar(glowBase);
  group.add(glow);

  function update(
    t,
    {
      stateAlpha = 1,
      halo = 1,
      glowStrength = 1,
      cloudThickness = 1,
      cloudEdge = 1,
      cloudInner = 1,
    } = {},
  ) {
    material.uniforms.uTime.value = t;
    material.uniforms.uDim.value = stateAlpha * (0.7 + 0.3 * cloudInner);
    mesh.rotation.y = t * 0.12;
    const pulse = 1 + 0.05 * Math.sin(t * 1.25 + radius * 30);
    glow.scale.setScalar(glowBase * halo * pulse * (0.6 + 0.6 * cloudThickness));
    glow.material.opacity =
      0.32 * glowStrength * stateAlpha * (0.35 + 0.65 * cloudEdge) * (0.92 + 0.08 * Math.sin(t * 1.25 + radius * 30));
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    glow.material.dispose();
  }

  return { object3D: group, update, dispose };
}
