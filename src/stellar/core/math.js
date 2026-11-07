// Four-sample approximation of a normal distribution, clamped to roughly ±1.5σ.
export const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 1.35;

export const pad2 = (value) => String(value).padStart(2, '0');

export const formatClock = (date = new Date()) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
