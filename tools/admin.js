#!/usr/bin/env node
/* tools/admin.js — the site served locally, with the Map's admin mode able to save.
   `npm run admin` serves the repo on http://localhost:8787 (the site itself needs no server:
   this one is only so the admin mode can write) and answers two calls of js/app-map.js's:
     GET  /__admin/ping       → { ok: true }: the page knows it can save, not just copy
     POST /__admin/map-fixes  { id: [x, y], … } → writes js/map-fixes.js (keys sorted, three
                              decimals, its header kept) → { ok: true, n }
   Nothing else: no listing, no paths outside the repo, no other writes. No dependencies. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const M = require('../js/map.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);
const FIXES_FILE = path.join(ROOT, 'js', 'map-fixes.js');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

/* The fixes checked: an object of id → [x, y], both finite and on the map (its bounds and a
   margin: a pin may sit a little outside the drawn rooms). → the error, or '' */
function check(fixes) {
  if (!fixes || typeof fixes !== 'object' || Array.isArray(fixes)) return 'not an object';
  const [x0, y0, x1, y1] = M.BOUNDS, PAD = 5;
  for (const [id, p] of Object.entries(fixes)) {
    if (!id || typeof id !== 'string') return 'an empty id';
    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) return `${id}: not [x, y]`;
    if (p[0] < x0 - PAD || p[0] > x1 + PAD || p[1] < y0 - PAD || p[1] > y1 + PAD) return `${id}: off the map`;
  }
  return '';
}
// The file's new text: its body between "const FIXES = {" and its "};", the rest (the header) as it is.
function withFixes(text, fixes) {
  const open = text.indexOf('const FIXES = {'), close = text.indexOf('\n  };', open);
  if (open < 0 || close < 0) throw new Error('js/map-fixes.js has lost its shape');
  const body = Object.keys(fixes).sort().map((k) => `\n    ${JSON.stringify(k)}: [${fixes[k].map((v) => Number(v).toFixed(3)).join(', ')}],`).join('');
  return text.slice(0, open + 'const FIXES = {'.length) + body + text.slice(close);
}

function serveFile(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || file.includes(path.sep + '.git' + path.sep)) return json(res, 403, { error: 'outside the repo' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__admin/ping') return json(res, 200, { ok: true });
  if (req.method === 'POST' && req.url === '/__admin/map-fixes') {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      let fixes;
      try { fixes = JSON.parse(data); } catch { return json(res, 400, { error: 'not JSON' }); }
      const err = check(fixes);
      if (err) return json(res, 400, { error: err });
      try {
        fs.writeFileSync(FIXES_FILE, withFixes(fs.readFileSync(FIXES_FILE, 'utf8'), fixes));
      } catch (e) { return json(res, 500, { error: e.message }); }
      const n = Object.keys(fixes).length;
      console.log(`js/map-fixes.js written: ${n} fix${n === 1 ? '' : 'es'}`);
      return json(res, 200, { ok: true, n });
    });
    return;
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'method' });
  serveFile(req, res);
});
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Admin: open http://localhost:${PORT}/#view=map&admin=1`);
    console.log('Drag a pin where it goes and press Guardar: it writes js/map-fixes.js. Ctrl+C to stop.');
  });
}

module.exports = { check, withFixes };
