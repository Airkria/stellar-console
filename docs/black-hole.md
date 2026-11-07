# 黑洞与吸积盘

实现位于 `src/stellar/blackhole-shader.js`（GLSL）与 `src/stellar/blackhole.js`（pass 绑定）。

## 为什么用全屏 pass

普通 3D 网格只能画一个“看起来像黑洞”的圆盘，无法让后方的银河真正弯曲、遮挡。这里把整个场景当作背景纹理，对每个屏幕像素发射一条光线，在 Schwarzschild 度规下积分，得到：

- 事件视界阴影（光线被捕获）；
- 引力透镜后的背景（光线偏折后采样天空）；
- 吸积盘的体积发光与透射；
- 光子环。

因此黑洞与银河有真实的深度关系，而不是贴在最前面的 billboard。

## 光线积分

对每条光线维护位置 `p` 与方向 `v`，使用 kick-drift-kick：

```glsl
vec3 accel(vec3 p, float h2) {
  float r2 = dot(p, p);
  return -1.5 * h2 * p / (r2 * r2 * sqrt(r2));
}
```

其中 `h2 = |p × v|²` 是守恒的角动量平方。步长随半径变化：

```glsl
float dt = clamp(r * 0.065, 0.06, 0.95);
if (abs(pos.y) < uDiskH * 2.0 && r < uDiskOut * 1.18) dt = min(dt, 0.05);
```

- 光线进入 `r < 1` 视为被捕获。
- 光线逃出 `r > uRBound` 且远离黑洞时停止。
- 最大步数 260。

相机位置、右/上/前方向由 JS 每帧传入；相机世界坐标除以 `bhScale` 转成 Schwarzschild 单位，所以调「整体大小」不会改变物理比例。

## 吸积盘

盘面不是薄平面，而是一个有厚度的体积：

```glsl
float vert   = 1.0 - abs(p.y) / uDiskH;
float inner  = smoothstep(uDiskIn, uDiskIn * 1.06, rr);
float outer  = 1.0 - smoothstep(uDiskOut * 0.76, uDiskOut, rr);
float radial = inner * outer / pow(max(rr, 1.0), 2.20);
float rim    = 1.0 + 1.30 * exp(-pow((rr - uDiskIn * 1.30) / 0.55, 2.0));
float d      = pow(vert, 1.6) * radial * rim;
```

- `pow(vert, 1.6)`：垂直方向柔和衰减，避免薄平面在低视角变成硬线。
- `radial` 中的 `1 / r^2.2`：外盘快速变暗。
- `rim`：内缘外的窄环增强。
- 内缘再叠加一个高斯爆亮（`uBurst`），形成“从视界边缘爆出来”的亮带。
- 最终 `pow(d, uFalloff)` 控制整体衰减速度。

颜色是银白到蓝银的渐变：

```glsl
vec3 silverPalette(float r) { ... }
```

采样时还会按盘面切向速度做一个轻微多普勒权重 `dop`。

## 盘面流动

使用两张 256² 可平铺 fBm 纹理（`makeFlowTexture()`，JS 端生成），在盘面局部坐标中平流：

```glsl
float phi = atan(p.z, p.x);
vec2 baseUv = vec2(phi / 6.2831853 * uFlowTilingX, log(max(rr, 1.0)) * uFlowTilingY);
vec2 drift = vec2(uFlowX, uFlowY) * uTime * 0.75;
vec2 uv1 = baseUv + drift + warp * 0.22;
vec2 uv2 = baseUv * vec2(1.9, 1.6) + drift * 1.7 + vec2(3.7, 1.9) + warp * 0.35;
float n = mix(texture2D(uFlowMap, uv1).r, texture2D(uFlowMap2, uv2).r, 0.42);
float threshold = mix(0.78, 0.08, clamp(uCloudDensity, 0.0, 1.0));
float flow = smoothstep(threshold, threshold + 0.26, n);
d *= mix(0.04, 1.0, flow);
```

- **X / Y 独立平移**：`uFlowX` 绕盘方向移动，`uFlowY` 沿 `log(r)` 内外移动。两者速度不同时，云团会被拉长，产生“拉伸”的流动感。
- **不再做差速旋转**：旧实现用 `ω(r)` 做角向平流 + 径向漂移，低速度时容易退化成同心细线；现在只做两层不同尺度的 UV 平移 + 轻微 domain warp。
- **云层密度**：`uCloudDensity` 把噪声阈值从 0.78（稀疏云团）压到 0.08（几乎铺满），控制的是覆盖率，不是亮度。
- `uFlowTilingX/Y` 控制两个方向的平铺次数；横向越高云团越碎，纵向越高径向层次越密。
- 速度为 0 时云层完全冻结，不会继续漂移。
- 盘内背景被压到 `0.12`，让空隙看起来是黑的。
- 这是视觉平流模拟，不是 Navier–Stokes 解。

## 光子环

```glsl
float aa = max(0.014, fwidth(b) * 1.15);
float ring = exp(-pow((b - 2.598) / aa, 2.0));
```

`b` 是碰撞参数。用屏幕导数 `fwidth` 控制宽度，避免在不同缩放级别出现摩尔纹或闪烁。`2.598` 是 Schwarzschild 黑洞光子球对应的临界碰撞参数（`3√3 M`，取 `M = 0.5` 的单位制）。

## 背景与遮挡

- 光线逃逸后，用偏折后的方向采样程序化星空 `lensedSky(d)`，并与原始场景纹理混合。
- 盘内区域把背景压暗到 `0.12`，避免星系核心比吸积盘还亮。
- `outCol = diskOut + bg * trans`：盘面发光叠加经过吸收后的背景。
- `uSpaceGlow = 0` 时，透镜天空与背景下限一起归零；配合纯色黑色背景可以得到真正的纯黑，只剩吸积盘、光子环和前景星体。
- DOM 项目标签的遮挡由 `projection.js` 单独计算：项目在黑洞后方且屏幕距离小于阴影半径时淡出。

## Uniforms

| Uniform | 含义 | 默认 |
| --- | --- | --- |
| `uCamPos/Right/Up/Fwd` | 相机姿态（Schwarzschild 单位） | 每帧 |
| `uTanHalfFov` / `uAspect` | 投影 | 每帧 |
| `uStrength` | 整体强度（低画质 0.85） | 1 |
| `uDiskIn` / `uDiskOut` | 盘内外径 | 2.45 / 11.5 |
| `uDiskH` | 盘半厚 | 0.13 |
| `uRBound` | 透镜计算边界 | 12 |
| `uEmission` | 盘亮度 | 2.2 |
| `uBurst` | 内缘爆亮 | 2.8 |
| `uFalloff` | 外盘衰减指数 | 1.30 |
| `uAbsorb` | 盘吸收 | 0.05 |
| `uRing` | 光子环强度 | 1.2 |
| `uCloudDensity` | 云层覆盖率 | 0.55 |
| `uFlowX` / `uFlowY` | 横向 / 纵向移动速度 | 0.12 / 0.05 |
| `uFlowTilingX` / `uFlowTilingY` | 横向 / 纵向平铺次数 | 9.0 / 1.35 |
| `uSpaceGlow` | 透镜天空与背景下限亮度 | 1.0 |
| `uFlowMap` / `uFlowMap2` | 两张 fBm 纹理 | 运行时生成 |

## 性能

- 全屏 pass 的成本与分辨率、步数成正比；`uRBound` 越小，逃逸越快。
- 盘附近步长自动降到 0.05，是主要开销。
- `?quality=low`：DPR=1、关闭 Bloom、`uStrength=0.85`。
- WebGL1：不执行追踪，退回一个屏幕空间风格化黑洞（`blackhole.js#buildFallback`）。

## 参考

- Gravitational Lensing by Spinning Black Holes in Astrophysics, and in the Movie Interstellar
- Trajectory Around A Spherically Symmetric Non-Rotating Black Hole — Sumanta
- Approximating Light Rays In The Schwarzschild Field — O. Semerak
- Implementing a Rasterization Framework for a Black Hole Spacetime — Yoshiyuki Yamashita
- [rossning92/Blackhole](https://github.com/rossning92/Blackhole)（实现思路参考；本项目 shader 为浏览器实时渲染重写）
