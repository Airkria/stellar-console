# 数据模型

`createStellarConsole({ data })` 只要求 `data.projects` 是数组；其余字段缺省都有兜底。所有 id 在同一份数据内唯一。

```js
{
  brand: { title, subtitle },
  core: { name, tag },
  labels: {
    state: { run, wait, alert, idle, paused, archived },
    task: { pending, approved, doing, review, passed, released, paused, risk },
  },
  projects: [Project],
  decisions: [Decision],
  ideas: [Idea],
  signals: [Signal],
  demoSignals: [Signal],
  links: [[projectId, projectId]],
}
```

## Project

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✓ | 唯一标识，用于 links / decisions / signals |
| `name` | string | ✓ | 英文或内部名，显示在标签与目标卡 |
| `cn` | string |  | 中文名，显示为目标卡标题 |
| `code` | string |  | 项目编号，如 `OR-01` |
| `r` | number |  | 轨道半径（世界单位），`0` 表示核心 |
| `a` | number |  | 轨道角度（弧度） |
| `p` | number |  | 星体大小，影响 3D 恒星半径 |
| `halo` | number |  | 光晕 / 标签偏移基准 |
| `hue` | number |  | 色相 0–360 |
| `state` | string |  | `run` / `wait` / `alert` / `idle` / `paused` / `archived` |
| `phase` | string |  | 当前阶段一句话 |
| `goal` | string |  | 当前目标 |
| `mass` | string |  | 体量，可自由解释 |
| `miles` | number |  | 里程碑数量 |
| `last` | string |  | 最近活动，如 `2H`、`10-31` |
| `updated` | string |  | 最近同步，如 `14:22` |
| `satellites` | string[] |  | 卫星 / 插件 / 扩展，最多渲染 4 个轨道 |
| `files` | FileRef[] |  | 文件监视列表 |
| `sections` | Section[] |  | 板块与任务 |
| `core` | boolean |  | 中心核心节点；不渲染 3D 恒星，只保留标签 |
| `labelBelow` | boolean |  | 标签显示在下方 |

### FileRef

```js
{ time: '14:22', path: 'src/render/Pipeline.ts', tag: '源码' }
```

### Section

```js
{
  id: 'pipeline',          // 同一项目内唯一，用于决策跳转
  name: '渲染管线',
  state: 'doing',          // 可选，用于板块状态徽标
  more: 2,                 // 可选，未展开的任务数
  tasks: [Task],
}
```

### Task

```js
{ p: 2, title: '管线节点合并与排序', state: 'review', next: '新版设置核对顺序' }
```

`p` 是优先级（P1–P4），`state` 取 `labels.task` 的键。

## Decision

```js
{
  project: 'orion',        // project.id
  section: '渲染管线',      // 展示用板块名
  sec: 'pipeline',         // 点击跳转的 section.id
  title: '管线节点改名与归位',
  age: '2H',
  state: 'review',
  p: 2,
}
```

## Idea

```js
{ project: 'Orion', text: '标签页可拖拽分屏', time: '11-05' }
```

`project` 可以是 `project.id` 或 `project.name`，两种都会匹配。

## Signal

```js
{ time: '14:22', project: 'orion', text: '管线规则设置 v3 已交候选', src: '更新队列' }
```

`time` 仅用于初始数据；通过 `pushSignal()` 推送时会自动填当前时间。`demoSignals` 每隔 14 秒循环推送一条。

## Links

```js
links: [
  ['orion', 'lyra'],
  ['orion', 'helios'],
]
```

控制台底部的「星链」区域会列出与当前项目相连的其他项目，点击可直接切换。

## 默认值

`normalizeData()` 会补齐：

- `sections: []`、`satellites: []`、`files: []`
- `miles: 0`、`mass: '0'`、`last: '—'`、`updated: '—'`
- `p: 4`、`halo: 70`、`hue: 200`、`state: 'idle'`
- 根据 `r` / `a` 计算 `x` / `y` 世界坐标
- 过滤指向不存在项目的 `decisions` / `signals` / `demoSignals`

因此最小可用项目是：

```js
{ id: 'alpha', name: 'Alpha', code: 'AL-01', state: 'run' }
```
