# 架构说明

## 分层

```
数据层      data.js           归一化 host 传入的对象
状态层      index.js          app.state（选中 / 悬停 / 当前控制台 / 动效 / 演示）
表现层      DOM + WebGL       同一组项目在两层中各出现一次
配置层      tuning.js         默认值、校验、localStorage、?tune
```

`index.js` 是唯一知道所有模块的编排者；模块之间不互相 import，只接收同一个 `app` 上下文。这样替换任意一层（例如把 `signals.js` 换成 WebSocket 适配器）不需要改其他模块。

## app 上下文

```js
{
  data,          // normalizeData() 的结果
  state,         // { current, selected, hovered, motion, demo, backgroundPaused, ideas, signals }
  tune,          // 当前调参值
  refs,          // Three.js 对象：bhPass、bloomPass、材料、bodyGroup…
  scene,         // SceneApi：S（renderer/camera/controls/VW/VH…）、setup、start…
  updatePlanets, // projection.update
  updateLeader,  // leader.update
  renderTarget,  // target.render
  openProject,   // console-view.open
  requestRender, // scene.requestRender
  screenPositions, // Map<projectId, {x, y, visible}>
  introStart,
}
```

## 启动顺序

1. `mountTemplate()` 注入 HUD、星图、控制台、调参面板。
2. `createTuning()` 读取 localStorage 与 URL，生成含每个项目光晕项的配置。
3. 创建 HUD、目标卡、引线、控制台、星体 DOM、皮肤状态、Three.js 场景、投影、调参面板、信号。
4. `scene.setup()`：渲染器 → 背景 → 相机 → 银河 → 黑洞 pass → 项目锚点 → 3D 项目本体 → Composer。
5. 读取 URL 参数（相机、打开/选中/悬停、信号）。
6. `scene.renderOnce()` + `scene.start()`。

## 渲染管线

```
RenderPass(scene, camera)          银河、尘埃、入流、星河、远景星、星云、项目恒星/卫星
  ↓
黑 hole ShaderPass                 全屏 Schwarzschild 光线追踪 + 吸积盘
  ↓
UnrealBloomPass                    辉光（低画质时跳过）
```

- 银河与项目锚点共享 `galaxyGroup`，因此整体一起旋转。
- 项目恒星 / 卫星与银河在同一个场景里；黑洞 pass 会真实遮挡它们，吸积盘也会覆盖前方星体。相应地，DOM 标签在黑洞阴影范围内淡出，隐藏的项目需要旋转视角才能点到。
- DOM 星体层每帧由 `projection.update()` 同步到屏幕坐标，并计算黑洞遮挡。

## 坐标

- 世界坐标：`x = cos(a) * r`，`y = sin(a) * r`；Three.js 中项目锚点位于 `(x, 0.035, y)`。
- `galaxyGroup` 绕 Y 轴缓慢旋转；DOM 投影使用锚点的世界位置，因此标签会跟随。
- 黑洞使用自己的 Schwarzschild 单位：相机位置除以 `bhScale` 后传入 shader。

## 状态与事件

| 动作 | 路径 |
| --- | --- |
| 悬停星体 | `stars.js` → `state.hovered` → `setFocus()` |
| 点击星体 | `stars.js` / `scene.js` 的 pointerup 兜底 → `console.open()` |
| 点击空白 | pointerup 兜底 → 取消选中 → `target.render(null)` |
| 选中 | `state.selected` → `target.render()` + `updateLeader()` |
| 打开控制台 | `state.current`、`backgroundPaused=true`；控制台填充 DOM |
| 关闭控制台 | 恢复 `backgroundPaused`，重新渲染目标卡 |
| 推送信号 | `signals.addSignal()` → LIVE 条 + 当前控制台侧栏 + 星体闪光 |
| 调参 | `tuning.set()` → `apply()` → uniform / CSS 变量 → 重绘 |

## 扩展点

- **数据适配器**：在调用 `createStellarConsole` 之前把任意来源映射成 `data-model.md` 的结构。
- **自定义标签**：`data.labels.state` / `data.labels.task` 可整体本地化。
- **自定义品牌**：`data.brand` 与 `data.core`。
- **背景**：`options.backgroundUrl` 指向任意图片；传 `''` 使用程序化星云。
- **存储命名空间**：`options.storagePrefix`，避免同一页面多个控制台互相覆盖。
- **调参默认值**：修改 `src/stellar/tuning.js` 的 `TUNE_DEFAULTS` 与 `BASE_CONFIG`。
- **替换某一层**：例如用 WebSocket 驱动信号，只需在外部调用 `api.pushSignal()`，或替换 `signals.js`。

## 皮肤层

- `skins/index.js`：`registerStarSkin` / `registerPlanetSkin` 注册表与内置注册。
- `skins/star/classic.js`：经典恒星球 + 光晕。
- `skins/star/sun.js`：熔岩表面 + 高温粒子壳 + 周期性耀斑，活动强度由项目状态决定。
- `skins/planet/rock.js` / `ice.js` / `lava.js`：不透明行星材质。
- `bodies.js`：按 `project.starSkin` / `project.planetSkin`（或全局 `planetSkin`）创建，面板切换时重建。
- `skins/state.js`：皮肤选择的 localStorage 持久化。

## 已知边界

- 吸积盘流动是视觉平流模拟，不是流体解。
- 项目本体遵循屏幕空间的实体遮挡，但不做逐像素的引力透镜重投影。
- 全屏体积 pass 对低端 GPU 较重；当前只有 `?quality=low` 一档降级。
- DOM 标签使用 `will-change: transform`，项目数量很大时需要改为虚拟化或 Canvas 文本。
