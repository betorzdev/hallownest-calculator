#!/usr/bin/env node
/* tools/trailer-v3/walk.js — the Knight's walk on the Map, filmed in real time for the trailer.
   The walk runs on requestAnimationFrame, which a --screenshot under virtual time never ticks, so
   this opens debug.html (&view=map&walk=<the bench before>&way=1: the map fitted to his way) in
   headless Chrome over the DevTools protocol and keeps every frame of its screencast, with its time.
   `node tools/trailer-v3/walk.js <lang> <ls JSON file> <bench before> [w h]`.
   Out: tools/trailer-v3/out/shots/<lang>-wide-walk/NNN.png and <lang>-wide-walk.js (each frame's time). */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const [lang = 'en', lsFile, from = 'Town', W = '1440', H = '900'] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out', 'shots');
const DIR = path.join(OUT, `${lang}-wide-walk`);
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });
const PORT = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless', '--hide-scrollbars', '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--user-data-dir=' + path.join(__dirname, 'out', '.chrome-walk'),
  '--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4',
  '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let url = null;
  for (let i = 0; i < 50 && !url; i++) {
    try { const p = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === 'page'); if (p) url = p.webSocketDebuggerUrl; } catch (e) { /* not up yet */ }
    if (!url) await sleep(200);
  }
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiting = new Map(), frames = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, (msg) => (msg.error ? reject(new Error(method + ': ' + msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    if (msg.method === 'Page.screencastFrame') {
      const { data, metadata, sessionId } = msg.params;
      frames.push({ t: metadata.timestamp, data });
      send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    }
  });
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  await send('Page.enable');
  const q = new URLSearchParams({ view: 'map', ls: fs.readFileSync(lsFile, 'utf8'), walk: from, way: '1', wayat: '12000', lang, w: W, h: H });
  await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await send('Page.navigate', { url: 'file://' + path.join(ROOT, 'debug.html') + '?' + q });
  // The way's debug lines are hidden: the trailer shows only the map and him.
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    await send('Runtime.evaluate', { expression: `(() => { const f = document.querySelector('iframe'); const d = f && f.contentDocument; if (!d || !d.head || d.getElementById('trl')) return; const s = d.createElement('style'); s.id = 'trl'; s.textContent = '#dbg-way { display: none }'; d.head.appendChild(s); })()` }).catch(() => {});
  }
  await sleep(8000);
  await send('Page.stopScreencast');
  ws.close(); chrome.kill();
  const t0 = frames[0].t;
  frames.forEach((f, i) => fs.writeFileSync(path.join(DIR, String(i).padStart(3, '0') + '.png'), Buffer.from(f.data, 'base64')));
  fs.writeFileSync(path.join(OUT, `${lang}-wide-walk.js`), `(window.WALK = window.WALK || {})['${lang}-wide'] = ${JSON.stringify(frames.map((f) => +(f.t - t0).toFixed(3)))};\n`);
  console.log(`${frames.length} frames → ${DIR}`);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
