#!/usr/bin/env node
/* tools/trailer-v2/render.js — trailer.html → MP4, frame by frame (as the first trailer's).
   `node tools/trailer-v2/render.js <es|en> <wide|tall> [ffmpeg]`: opens headless Chrome with the
   DevTools protocol (Node's own WebSocket, no dependencies), calls seek(t) at 30 fps, captures
   each frame and pipes it into ffmpeg with the music (Laments of the War by Cethiel, CC0, from
   its 3 s, faded out at the end). Out: tools/trailer-v2/out/trailer-<lang>-<ratio>.mp4.
   Needs out/shots/ (shots.js) and the first trailer's track, tools/trailer/out/music.mp3. */
'use strict';
const path = require('path');
const { spawn } = require('child_process');

const [lang = 'en', ratio = 'wide', FFMPEG = 'ffmpeg'] = process.argv.slice(2);
const FPS = 30, DUR = 30, MUSIC_FROM = 3;
const [W, H] = ratio === 'tall' ? [1080, 1920] : [1920, 1080];
const OUT = path.join(__dirname, 'out');
const PORT = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless', '--hide-scrollbars', '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--user-data-dir=' + path.join(OUT, `.chrome-${lang}-${ratio}`),
  '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

(async () => {
  const ws = new WebSocket(await connect());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, (msg) => (msg.error ? reject(new Error(method + ': ' + msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.enable');
  await send('Page.navigate', { url: 'file://' + path.join(__dirname, 'trailer.html') + `?lang=${lang}&ratio=${ratio}` });
  for (let i = 0; i < 100 && !(await evaluate('!!window.ready').catch(() => false)); i++) await sleep(100);
  await evaluate('window.ready');

  const file = path.join(OUT, `trailer-${lang}-${ratio}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-ss', String(MUSIC_FROM), '-t', String(DUR), '-i', path.join(__dirname, '..', 'trailer', 'out', 'music.mp3'),
    '-filter:a', `afade=t=in:d=0.4,afade=t=out:st=${DUR - 2.5}:d=2.5`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', file], { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = FPS * DUR;
  for (let f = 0; f < total; f++) {
    await evaluate(`seek(${f / FPS})`);
    const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 90 === 0) process.stdout.write(`${lang}-${ratio} ${Math.round(f / FPS)}s\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  ws.close();
  chrome.kill();
  console.log(file);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
