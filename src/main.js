import { createStellarConsole } from './stellar/index.js';
import { demoData } from './demo/data.js';

const reportError = (message) => {
  const status = document.getElementById('bootStatus');
  if (!status) return;
  status.style.display = '';
  status.textContent = `页面脚本错误：${message}`;
  status.classList.add('error');
};

window.addEventListener('error', (event) => reportError(event.message || '未知错误'));
window.addEventListener('unhandledrejection', (event) => reportError(String(event.reason?.message || event.reason || '未知错误')));

window.stellarConsole = createStellarConsole({
  mount: '#app',
  data: demoData,
  options: {
    backgroundUrl: './assets/bg.jpg',
    storagePrefix: 'stellar-console',
  },
});
