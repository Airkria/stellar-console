# 调参说明

面板在页面右上角「调参」；值实时生效，并写入 `localStorage` 的 `stellar-console:tune`（前缀可通过 `options.storagePrefix` 修改）。

```js
// 代码中读取 / 修改
const tune = consoleApp.getTune();
consoleApp.setTune('emission', 2.6);
```

URL 一次性覆盖：

```
?tune={"emission":2.6,"diskOut":12.4}
?panel=0
```

## 宿主参数（0.7.0）

```js
createStellarConsole({
  mount: '#app',
  data,
  options: {
    quality: 'auto',          // auto | high | low
    panelOpen: false,         // 宿主默认收起调参面板
    motion: true,             // 不传则跟随 prefers-reduced-motion
    tune: { emission: 2.4 },  // 初始值；localStorage 与 URL 仍可覆盖
    onTuneChange(change) {},  // { key, value, tune } 或 { reset: true, tune }
  },
});
```

`quality: 'auto'` 在设备像素比大于 2 或 CPU 核数不大于 4 时选择低画质；低画质使用 DPR 1 并跳过 Bloom。

## 黑洞

| 键 | 说明 | 默认 | 范围 |
| --- | --- | --- | --- |
| `bhScale` | 世界单位 / Schwarzschild 半径，整体大小 | 0.19 | 0.12–0.30 |
| `rBound` | 引力透镜计算边界 | 12 | 9–16 |
| `diskIn` | 吸积盘内径 | 2.45 | 2–4 |
| `diskOut` | 吸积盘外径 | 11.5 | 6–14 |
| `diskH` | 盘半厚 | 0.13 | 0.05–0.40 |
| `edgeThickness` | 水平视角下的盘厚度偏移（负=压缩，正=增厚，0=不变） | 0.0 | -0.9–4 |
| `burst` | 内缘爆亮强度 | 2.8 | 0–6 |
| `falloff` | 外盘衰减指数 | 1.30 | 0.8–2.5 |
| `emission` | 盘亮度 | 2.2 | 0.5–4 |
| `absorb` | 盘吸收 | 0.05 | 0–0.2 |
| `ring` | 光子环强度 | 1.2 | 0–2 |
| `cloudDensity` | 云层密度 / 覆盖率 | 0.55 | 0–1 |
| `flowX` | 横向流速（绕盘方向） | 0.12 | -5–5 |
| `flowY` | 纵向流速（外扩 / 内收） | 0.05 | -5–5 |
| `flowTilingX` | 云层横向平铺次数 | 9.0 | 0.5–40 |
| `flowTilingY` | 云层纵向平铺次数 | 1.35 | 0.1–8 |

`flowX` 与 `flowY` 是独立的 UV 平移速度；两者比例不同会拉长 / 压扁云团，形成“拉伸”的流动感。速度为 0 时云层冻结，速度很小时也不会退化成同心细线。

`rBound` 会被自动抬到 `max(rBound, diskOut + 0.35)`，避免盘超出透镜边界。

`edgeThickness` 只在相机接近盘面时通过 `smoothstep(0.70, 0.98, grazing)` 生效；正面视角仍使用 `diskH`。负值会压缩近侧盘面，正值会加厚；可以分别试 `-0.5` 和 `+2` 找到更舒服的水平视角。

## 星盘

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `galaxySize` | 主星粒径 | 1.0 |
| `galaxyAlpha` | 主星亮度 | 1.0 |
| `dustSize` | 尘埃粒径 | 1.0 |
| `dustAlpha` | 尘埃亮度 | 1.0 |
| `starThick` | 星盘厚度（Y 轴缩放） | 1.0 |
| `starWidth` | 星盘宽度（XZ 轴缩放） | 1.0 |
| `armInner` | 旋臂内宽（世界单位） | 0.07 |
| `armOuter` | 旋臂外宽（世界单位） | 0.26 |
| `armWidth` | 旋臂宽度整体倍数 | 1.0 |

## 恒星

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `planetGlow` | 项目光晕亮度（光罩/粒子整体亮度） | 1.0 |
| `planetCore` | 3D 恒星核心大小 | 1.0 |
| `starScale` | 恒星整体大小 | 1.0 |
| `planetHalo_<id>` | 单个项目光晕大小，按项目自动生成 | 1.0 |

## 光罩（Fresnel shell）

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `starShellEnabled` | 光罩开关 | `true` |
| `starShellThickness` | 光罩外扩范围 | 1.0 |
| `starShellEdge` | 轮廓边缘亮度 | 1.0 |
| `starShellInner` | 光罩内部亮度；0 时中心全透明 | 0.35 |

## 发光云（粒子壳）

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `starParticleCount` | 粒子数量，0–1400 | 520 |
| `starParticleSpeed` | 粒子出生时的外扩速度，0–10 | 1.0 |
| `starParticleDrag` | 阻力，0–10；越大越早被拉回表面 | 1.0 |
| `starParticleSize` | 粒子大小 | 1.0 |
| `starParticleBrightness` | 粒子亮度 | 1.0 |

## 行星

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `planetSize` | 行星整体大小 | 1.0 |
| `orbitScale` | 卫星轨道整体缩放 | 1.0 |
| `orbitSpeed` | 公转速度倍数 | 1.0 |
| `orbitAlpha` | 轨道环亮度 | 1.0 |

## 辉光

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `bloomStrength` | Bloom 强度 | 0.10 |
| `bloomThreshold` | Bloom 阈值 | 0.97 |
| `bloomRadius` | Bloom 半径 | 0.45 |

## 星河

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `riverSize` | 外层星河粒径 | 1.0 |
| `riverAlpha` | 外层星河亮度 | 1.0 |
| `riverSpeed` | 外层星河独立转速 | 1.0 |
| `galaxySpeed` | 主星盘（银河）转速 | 1.0 |
| `deepSize` | 远景星粒径 | 1.0 |
| `deepAlpha` | 远景星亮度 | 1.0 |

## 入流

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `inflowSize` | 入流粒径 | 1.0 |
| `inflowAlpha` | 入流亮度 | 1.3 |
| `inflowSpeed` | 入流粒子速度 | 1.0 |

## 背景

| 键 | 类型 | 说明 | 默认 |
| --- | --- | --- | --- |
| `spaceGlow` | number | 背景光晕总开关 | 1.0 |
| `cssNebula` | number | CSS 星云渐变（`.space::before`） | 1.0 |
| `galaxyAura` | number | 22 单位的星系大光晕 | 1.0 |
| `nebulaClouds` | number | 6 个星云团 Sprite | 1.0 |
| `bgUseImage` | boolean | 启用图片背景；关闭后使用纯色 | `true` |
| `bgImageUrl` | string | 背景图片地址，相对页面或绝对 URL | `./assets/bg.jpg` |
| `bgColor` | string | 纯色背景 / 图片加载失败时的回退色 | `#03060c` |

切换图片时会异步加载新纹理；关闭图片或加载失败会立即回退到 `bgColor`，同时更新 `--bg` CSS 变量与渲染器 clear color。

「选择图片」按钮会打开系统文件选择器，把图片读成 data URL 写入 `bgImageUrl`，因此刷新后仍能保留；大图可能超出 localStorage 配额，超出的情况只在当前会话有效。

要逐个排查远处亮光：把 `背景光晕` 保持 1，依次把 `CSS 星云` / `星系大光晕` / `星云团` 调到 0，即可定位来源。透镜天空与星系雾面已从引擎移除；星云团已移到相机最大距离之外。

## 皮肤

恒星、行星皮肤不放在 `TUNE_DEFAULTS` 里，而是由面板「皮肤」组管理：

- 每个非核心项目两个下拉框：恒星皮肤（`classic` / `sun`）与行星皮肤（`rock` / `ice` / `lava`）。
- 数据里也可以直接写 `starSkin` / `planetSkin` 作为初始值。

选择写入 `localStorage` 的 `<prefix>:skins`，并通过 `setStarSkin` / `setPlanetSkin` API 重建 3D 项目本体。自定义皮肤见 [数据模型 · 皮肤](data-model.md#皮肤)。

## 修改默认值

编辑 `src/stellar/tuning.js`：

- `TUNE_DEFAULTS`：默认值。
- `BASE_CONFIG`：面板中的分组、标签、范围、步长与小数位。
- `buildTuneConfig()`：为每个非核心项目追加 `planetHalo_<id>`。

新增一个数值参数的最小步骤：

1. 在 `TUNE_DEFAULTS` 增加键与默认值（number / boolean / string 都支持）。
2. 在 `BASE_CONFIG` 增加一条配置（或在 `buildTuneConfig` 动态追加），并用 `type: 'toggle' | 'text' | 'color'` 选择控件；缺省为 range。
3. 在 `tuning.apply()` 中把值写到 uniform / material / CSS 变量 / 背景。
