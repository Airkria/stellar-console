export const DEFAULT_STATE_LABELS = {
  run: '运行中',
  wait: '待决策',
  alert: '警告',
  idle: '休眠',
  paused: '暂停',
  archived: '归档',
};

export const DEFAULT_TASK_LABELS = {
  pending: '待确认',
  approved: '已批准',
  doing: '开发中',
  review: '待验收',
  passed: '已认可',
  released: '已发布',
  paused: '暂缓',
  risk: '风险',
};

const list = (value) => (Array.isArray(value) ? value : []);

/**
 * Normalise the data supplied by a host application.
 *
 * Only `projects` is required. Everything else has a safe default so a host
 * can start with a single project and grow from there.
 */
export function normalizeData(raw = {}) {
  const projects = list(raw.projects).map((project, index) => {
    const angle = Number(project.a ?? 0);
    const radius = Number(project.r ?? 0);
    return {
      sections: [],
      satellites: [],
      files: [],
      miles: 0,
      mass: '0',
      last: '—',
      updated: '—',
      p: 4,
      halo: 70,
      hue: 200,
      state: 'idle',
      ...project,
      index,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  const known = new Set(projects.map((p) => p.id));
  const links = list(raw.links).filter((pair) => Array.isArray(pair) && pair.length === 2);

  return {
    brand: {
      title: '群星交互系统',
      subtitle: 'STELLAR CONSOLE',
      ...(raw.brand || {}),
    },
    core: {
      name: '核心',
      tag: '核心节点',
      ...(raw.core || {}),
    },
    labels: {
      state: { ...DEFAULT_STATE_LABELS, ...(raw.labels?.state || {}) },
      task: { ...DEFAULT_TASK_LABELS, ...(raw.labels?.task || {}) },
    },
    projects,
    decisions: list(raw.decisions).filter((d) => known.has(d.project)),
    ideas: list(raw.ideas),
    signals: list(raw.signals).filter((s) => known.has(s.project)),
    demoSignals: list(raw.demoSignals).filter((s) => known.has(s.project)),
    links,
  };
}

export function createByProject(projects) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return (id) => byId.get(id) || null;
}
