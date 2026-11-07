// Camera-aware Schwarzschild ray tracer.
//
// The geodesic integration follows the standard photon-orbit formulation used
// by real-time black-hole renderers (see docs/black-hole.md for the papers).
// The screen-space composition, silver palette and flow model here are written
// for this project. It runs as a full-screen ShaderPass after the scene render;
// the accretion disk is shaded from volumetric samples (not a thin plane) so it
// stays smooth at every zoom and does not produce moiré.
export const blackHoleShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: null },
    uTime: { value: 0 },
    uCamPos: { value: null },
    uCamRight: { value: null },
    uCamUp: { value: null },
    uCamFwd: { value: null },
    uTanHalfFov: { value: 0.5 },
    uAspect: { value: 1 },
    uStrength: { value: 1 },
    uDiskIn: { value: 2.45 },
    uDiskOut: { value: 11.5 },
    uDiskH: { value: 0.13 },
    uRBound: { value: 12.0 },
    uEmission: { value: 2.2 },
    uBurst: { value: 2.8 },
    uFalloff: { value: 1.30 },
    uAbsorb: { value: 0.05 },
    uRing: { value: 1.2 },
    uCloudDensity: { value: 0.55 },
    uFlowX: { value: 0.12 },
    uFlowY: { value: 0.05 },
    uFlowTilingX: { value: 9.0 },
    uFlowTilingY: { value: 1.35 },
    uSpaceGlow: { value: 1.0 },
    uGrazing: { value: 0.3 },
    uEdgeBoost: { value: 2.0 },
    uFlowMap: { value: null },
    uFlowMap2: { value: null },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;

    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec3 uCamPos;
    uniform vec3 uCamRight;
    uniform vec3 uCamUp;
    uniform vec3 uCamFwd;
    uniform float uTanHalfFov;
    uniform float uAspect;
    uniform float uStrength;
    uniform float uDiskIn;
    uniform float uDiskOut;
    uniform float uDiskH;
    uniform float uRBound;
    uniform float uEmission;
    uniform float uBurst;
    uniform float uFalloff;
    uniform float uAbsorb;
    uniform float uRing;
    uniform float uCloudDensity;
    uniform float uFlowX;
    uniform float uFlowY;
    uniform float uFlowTilingX;
    uniform float uFlowTilingY;
    uniform float uSpaceGlow;
    uniform float uGrazing;
    uniform float uEdgeBoost;
    uniform sampler2D uFlowMap;
    uniform sampler2D uFlowMap2;

    #define PI 3.141592653589793
    const int MAX_STEPS = 260;

    vec3 aces(vec3 x) {
      const float a = 2.51; const float b = 0.03; const float c = 2.43;
      const float d = 0.59; const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    vec3 accel(vec3 p, float h2) {
      float r2 = dot(p, p);
      return -1.5 * h2 * p / (r2 * r2 * sqrt(r2));
    }

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // Deep-space starfield seen through the lens. Sparse points become arcs
    // when the geodesic compresses them near the critical curve.
    vec3 lensedSky(vec3 d) {
      vec3 col = vec3(0.0035, 0.006, 0.014);
      float lon = atan(d.z, d.x) / 6.2831853;
      float lat = asin(clamp(d.y, -1.0, 1.0)) / 3.14159265;
      for (int k = 0; k < 2; k++) {
        float scale = k == 0 ? 84.0 : 158.0;
        vec2 uv = vec2(lon, lat) * scale + float(k) * 19.7;
        vec2 id = floor(uv);
        vec2 f = fract(uv) - 0.5;
        float h = hash21(id);
        float thresh = k == 0 ? 0.972 : 0.990;
        if (h > thresh) {
          float s = smoothstep(0.20, 0.0, length(f));
          float tw = 0.45 + 0.55 * fract(h * 91.7);
          vec3 tint = mix(vec3(0.74, 0.86, 1.0), vec3(1.0, 0.94, 0.86), fract(h * 13.0));
          col += tint * s * tw * 1.8;
        }
      }
      col += vec3(0.006, 0.010, 0.026) * smoothstep(-0.3, 0.9, d.y);
      return col;
    }

    // Bright silver, cooling to blue-silver at the outer edge.
    vec3 silverPalette(float r) {
      float t = clamp((r - uDiskIn) / (uDiskOut - uDiskIn), 0.0, 1.0);
      vec3 c = mix(vec3(0.90, 0.95, 1.0), vec3(0.78, 0.86, 0.98), smoothstep(0.00, 0.10, t));
      c = mix(c, vec3(0.55, 0.66, 0.86), smoothstep(0.08, 0.35, t));
      c = mix(c, vec3(0.34, 0.44, 0.64), smoothstep(0.33, 0.68, t));
      c = mix(c, vec3(0.18, 0.24, 0.38), smoothstep(0.66, 1.00, t));
      return c;
    }

    float diskThickness() {
      // Only thicken when the camera is close to the disk plane; face-on
      // views keep the tuned thickness.
      float g = smoothstep(0.70, 0.98, uGrazing);
      return uDiskH * (1.0 + g * uEdgeBoost);
    }

    // Smooth volumetric disk: no texture noise, so no moiré. The volume
    // (rather than a thin plane) also softens the projected near/far fold.
    float diskDensity(vec3 p) {
      float rr = length(p.xz);
      float vert = 1.0 - abs(p.y) / diskThickness();
      if (vert <= 0.0) return 0.0;
      float inner = smoothstep(uDiskIn, uDiskIn * 1.06, rr);
      float outer = 1.0 - smoothstep(uDiskOut * 0.76, uDiskOut, rr);
      float radial = inner * outer / pow(max(rr, 1.0), 2.20);
      float rim = 1.0 + 1.30 * exp(-pow((rr - uDiskIn * 1.30) / 0.55, 2.0));
      // Cloud field in polar UV: X wraps around the disk, Y runs outward.
      // The two axes translate independently, so a speed ratio stretches the
      // clouds instead of producing concentric rings.
      float phi = atan(p.z, p.x);
      vec2 baseUv = vec2(phi / 6.2831853 * uFlowTilingX, log(max(rr, 1.0)) * uFlowTilingY);
      vec2 drift = vec2(uFlowX, uFlowY) * uTime * 0.75;
      // A gentle domain warp keeps the texture from reading as a tiled sheet.
      vec2 warp = vec2(
        texture2D(uFlowMap2, baseUv * 0.45 + drift * 0.25 + vec2(0.13, 0.71), 0.8).r,
        texture2D(uFlowMap, baseUv * 0.45 + drift * 0.25 + vec2(0.67, 0.21), 0.8).r
      ) - 0.5;
      vec2 uv1 = baseUv + drift + warp * 0.22;
      vec2 uv2 = baseUv * vec2(1.9, 1.6) + drift * 1.7 + vec2(3.7, 1.9) + warp * 0.35;
      float n1 = texture2D(uFlowMap, uv1, 0.8).r;
      float n2 = texture2D(uFlowMap2, uv2, 0.8).r;
      float n = mix(n1, n2, 0.42);
      // Density controls coverage: low = sparse wisps, high = nearly solid.
      float threshold = mix(0.78, 0.08, clamp(uCloudDensity, 0.0, 1.0));
      float flow = smoothstep(threshold, threshold + 0.26, n);
      float d = pow(vert, 1.6) * radial * rim;
      d *= mix(0.16, 1.0, flow);
      d = pow(d, uFalloff);
      // Narrow, very bright inner edge: the "burst" at the horizon.
      float burst = exp(-pow((rr - uDiskIn * 1.06) / 0.18, 2.0));
      d *= 1.0 + uBurst * burst;
      return d;
    }

    void main() {
      vec2 uv = vUv;
      vec2 ndc = uv * 2.0 - 1.0;
      vec3 dir = normalize(
        uCamFwd
        + uCamRight * (ndc.x * uTanHalfFov * uAspect)
        + uCamUp * (ndc.y * uTanHalfFov)
      );

      vec3 here = texture2D(tDiffuse, uv).rgb;

      float b2 = dot(cross(uCamPos, dir), cross(uCamPos, dir));
      float b = sqrt(b2);
      float tc = -dot(uCamPos, dir);

      float rb = uRBound;
      float rb2 = rb * rb;
      if (b >= rb || tc <= 0.0 || uStrength < 0.001) {
        gl_FragColor = vec4(here, 1.0);
        return;
      }

      float root = sqrt(max(rb2 - b2, 0.0));
      vec3 pos = uCamPos + dir * max(0.0, tc - root);
      vec3 vel = dir;
      float h2 = b2;
      bool captured = false;
      vec3 diskColor = vec3(0.0);
      float trans = 1.0;

      for (int i = 0; i < MAX_STEPS; i++) {
        float r2 = dot(pos, pos);
        if (r2 < 1.0) { captured = true; break; }
        if (r2 > rb2 && dot(pos, vel) > 0.0) break;

        float r = sqrt(r2);
        float dt = clamp(r * 0.065, 0.06, 0.95);
        if (abs(pos.y) < diskThickness() * 2.0 && r < uDiskOut * 1.18) dt = min(dt, 0.05);
        vec3 a = accel(pos, h2);
        vec3 halfv = vel + a * (dt * 0.5);
        vec3 next = pos + halfv * dt;
        vec3 nextv = halfv + accel(next, h2) * (dt * 0.5);

        vec3 mid = (pos + next) * 0.5;
        float dens = diskDensity(mid);
        if (dens > 0.0004 && trans > 0.01) {
          float rr = length(mid.xz);
          float phi = atan(mid.z, mid.x);
          vec3 hp = vec3(cos(phi) * rr, 0.0, sin(phi) * rr);
          vec3 tangent = vec3(-sin(phi), 0.0, cos(phi));
          float vd = dot(tangent, normalize(uCamPos - hp));
          float dop = 1.0 + 0.16 * vd;
          diskColor += silverPalette(rr) * dens * uEmission * dop * trans;
          trans *= exp(-dens * uAbsorb);
        }
        pos = next;
        vel = nextv;
      }

      // Photon ring, anti-aliased with screen derivatives.
      float aa = max(0.014, fwidth(b) * 1.15);
      float ring = exp(-pow((b - 2.598) / aa, 2.0));
      float ringHalo = exp(-pow((b - 2.85) / 0.50, 2.0)) * 0.10;
      diskColor *= uStrength;
      diskColor += vec3(0.90, 0.96, 1.0) * ring * uRing;
      diskColor += vec3(0.62, 0.76, 1.0) * ringHalo * 0.65;

      vec3 diskOut = vec3(1.0) - exp(-diskColor * 1.20);

      vec3 outCol;
      if (captured) {
        outCol = diskOut;
      } else {
        vec3 d = normalize(vel);
        float skyAmt = smoothstep(5.0, 2.8, b);
        vec3 bg = mix(here, lensedSky(d) * uSpaceGlow, skyAmt);
        bg = max(bg, vec3(0.006, 0.010, 0.022) * uSpaceGlow);
        // The galaxy core is much brighter than the disk; suppress it locally
        // so the silver plasma reads as the volume, not a white cut-out.
        bg *= mix(0.12, 1.0, smoothstep(uDiskIn, uDiskOut * 1.15, b));
        outCol = diskOut + bg * trans;
      }

      gl_FragColor = vec4(outCol, 1.0);
    }
  `,
};
