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

## 黑洞

| 键 | 说明 | 默认 | 范围 |
| --- | --- | --- | --- |
| `bhScale` | 世界单位 / Schwarzschild 半径，整体大小 | 0.19 | 0.12–0.30 |
| `rBound` | 引力透镜计算边界 | 12 | 9–16 |
| `diskIn` | 吸积盘内径 | 2.45 | 2–4 |
| `diskOut` | 吸积盘外径 | 11.5 | 6–14 |
| `diskH` | 盘半厚 | 0.13 | 0.05–0.40 |
| `burst` | 内缘爆亮强度 | 2.8 | 0–6 |
| `falloff` | 外盘衰减指数 | 1.30 | 0.8–2.5 |
| `emission` | 盘亮度 | 2.2 | 0.5–4 |
| `absorb` | 盘吸收 | 0.05 | 0–0.2 |
| `ring` | 光子环强度 | 1.2 | 0–2 |
| `flow` | 盘面流动（空隙对比） | 1.0 | 0–1.5 |
| `flowSpeed` | 流动速度 | 1.0 | 0–3 |
| `flowDir` | 流动方向 | 1 | -1 / 1 |

`rBound` 会被自动抬到 `max(rBound, diskOut + 0.35)`，避免盘超出透镜边界。

## 星盘

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `galaxySize` | 主星粒径 | 1.0 |
| `galaxyAlpha` | 主星亮度 | 1.0 |
| `dustSize` | 尘埃粒径 | 1.0 |
| `dustAlpha` | 尘埃亮度 | 1.0 |
| `hazeAlpha` | 星系雾面 | 1.0 |
| `starThick` | 星盘厚度（Y 轴缩放） | 1.0 |
| `starWidth` | 星盘宽度（XZ 轴缩放） | 1.0 |

## 行星

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `planetGlow` | 项目光晕亮度 | 1.0 |
| `planetCore` | 3D 恒星核心大小 | 1.0 |
| `planetRipple` | 运行扩散光频率（CSS 动画时长） | 1.0 |
| `orbitScale` | 卫星轨道整体缩放 | 1.0 |
| `planetHalo_<id>` | 单个项目光晕大小，按项目自动生成 | 1.0 |

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
| `deepSize` | 远景星粒径 | 1.0 |
| `deepAlpha` | 远景星亮度 | 1.0 |

## 入流

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `inflowSize` | 入流粒径 | 1.0 |
| `inflowAlpha` | 入流亮度 | 1.3 |

## 修改默认值

编辑 `src/stellar/tuning.js`：

- `TUNE_DEFAULTS`：默认值。
- `BASE_CONFIG`：面板中的分组、标签、范围、步长与小数位。
- `buildTuneConfig()`：为每个非核心项目追加 `planetHalo_<id>`。

新增一个数值参数的最小步骤：

1. 在 `TUNE_DEFAULTS` 增加键与默认值。
2. 在 `BASE_CONFIG` 增加一条配置（或在 `buildTuneConfig` 动态追加）。
3. 在 `tuning.apply()` 中把值写到 uniform / material / CSS 变量。
