// Headless smoke test for the public API and the main DOM contracts.
// Usage: APP_URL=http://127.0.0.1:4173/ npm run smoke
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 9223;
const url = process.env.APP_URL || process.argv[2] || 'http://127.0.0.1:4173/';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=${join(tmpdir(), `stellar-console-smoke-${Date.now()}`)}`,
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,1000',
    url,
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((target) => target.type === 'page' && target.url.startsWith('http'));
      if (page) return page;
    } catch {
      /* Chrome is still starting */
    }
    await sleep(250);
  }
  throw new Error('CDP target not found');
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let sequence = 0;
const pending = new Map();
const exceptions = [];

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    exceptions.push(
      message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'unknown',
    );
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

await send('Runtime.enable');
await send('Log.enable');

for (let i = 0; i < 80; i++) {
  if (await evaluate('!!window.stellarConsole')) break;
  await sleep(200);
}

const checks = [];
const check = (name, actual, expected) => {
  checks.push({ name, actual, expected, pass: JSON.stringify(actual) === JSON.stringify(expected) });
};

check('project count', await evaluate('stellarConsole.data.projects.length'), 7);
await evaluate('stellarConsole.openProject("orion")');
await sleep(250);
check('overlay open', await evaluate('document.querySelector("#overlay").hidden'), false);
check('console title', await evaluate('document.querySelector("#consoleTitle").textContent'), '猎户座');
check('links rendered', await evaluate('document.querySelectorAll("#cLinks button").length'), 3);
check('sections rendered', await evaluate('document.querySelectorAll("#cSections .sec").length'), 5);
check('decisions rendered', await evaluate('document.querySelectorAll("#cDecisions .c-dec").length'), 4);
await evaluate('stellarConsole.closeProject()');
await sleep(100);
check('overlay closed', await evaluate('document.querySelector("#overlay").hidden'), true);

await evaluate('stellarConsole.setTune("emission", 3)');
check('tune set', await evaluate('stellarConsole.getTune().emission'), 3);

await evaluate('stellarConsole.setProjectState("orion", "wait")');
check('project state', await evaluate('document.querySelector(".star[data-project=orion]").dataset.state'), 'wait');
check('hud running', await evaluate('document.querySelector("[data-kpi=running]").textContent'), '0');

await evaluate('stellarConsole.pushSignal({project:"orion", text:"API test", src:"test"})');
check('live signal', await evaluate('document.querySelector("#liveText").textContent'), 'API test');

await evaluate('stellarConsole.selectProject("lyra")');
check('selected label', await evaluate('document.querySelector(".star[data-project=lyra]").dataset.selected'), 'true');
await evaluate('stellarConsole.selectProject(null)');
check('deselected label', await evaluate('document.querySelector(".star[data-project=lyra]").dataset.selected'), 'false');

check(
  'new tune keys',
  await evaluate(
    '["cloudDensity","flowTilingX","flowTilingY","riverSpeed","galaxySpeed","inflowSpeed","starShellThickness","starParticleCount","starParticleSpeed","starParticleDrag","spaceGlow","cssNebula","edgeThickness","bgUseImage"].every((k) => k in stellarConsole.getTune())',
  ),
  true,
);
check(
  'panel groups',
  await evaluate('[...document.querySelectorAll("#tuneBody .tune-group")].map((e) => e.textContent).join(",")'),
  '黑洞,星盘,恒星,光罩,发光云,行星,辉光,星河,入流,背景,皮肤',
);
check('star skins', await evaluate('stellarConsole.listStarSkins().map((s) => s.value).join(",")'), 'classic,sun');
await evaluate('stellarConsole.setStarSkin("orion", "classic")');
await sleep(200);
check('star skin applied', await evaluate('stellarConsole.data.projects.find((p) => p.id === "orion").starSkin'), 'classic');

// Two-step activation: first click selects, second click opens.
// Use real pointer events so the scene pointerup fallback is covered too.
async function realClick(project) {
  const pos = await evaluate(
    `(() => { const r = document.querySelector('.star[data-project=${project}] .hit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
  );
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos.x, y: pos.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
}
await evaluate('stellarConsole.selectProject(null)');
await realClick('lyra');
await sleep(150);
check('first click selects', await evaluate('document.querySelector(".star[data-project=lyra]").dataset.selected'), 'true');
check('first click stays closed', await evaluate('document.querySelector("#overlay").hidden'), true);
check('first click shows card', await evaluate('document.querySelector("#targetCard").classList.contains("empty")'), false);
await realClick('lyra');
await sleep(250);
check('second click opens', await evaluate('document.querySelector("#overlay").hidden'), false);
await evaluate('stellarConsole.closeProject()');

await evaluate('stellarConsole.pause()');
check('pause stops loop', await evaluate('stellarConsole.isPaused()'), true);
await evaluate('stellarConsole.resume()');
check('resume restarts loop', await evaluate('stellarConsole.isPaused()'), false);

const patched = await evaluate(
  '(() => { const d = structuredClone(stellarConsole.data); const p = d.projects.find((x) => x.id === "orion"); p.goal = "UPDATED GOAL"; p.state = "wait"; return d; })()',
);
await evaluate(`stellarConsole.updateData(${JSON.stringify(patched)})`);
await sleep(200);
check('update data goal', await evaluate('stellarConsole.data.projects.find((p) => p.id === "orion").goal'), 'UPDATED GOAL');
check('update data star', await evaluate('document.querySelector(".star[data-project=orion]").dataset.state'), 'wait');

check('no runtime exceptions', exceptions.length, 0);

console.log(JSON.stringify({ checks, exceptions }, null, 2));
const failed = checks.filter((item) => !item.pass);
ws.close();
chrome.kill();
process.exit(failed.length ? 1 : 0);
