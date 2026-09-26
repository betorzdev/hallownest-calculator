/* tools/game-text.js — the game's texts, to translate without inventing (CLAUDE.md, "Translations").
     npm run text -- "Shade Cloak"      searches the keys, the English and the Spanish
     npm run text -- --key CHARM_NAME_  lists the keys that start like that
     npm run text -- --audit            cross-checks the game names the site carries against their text
   The dump is the game's decrypted TextAssets, per language ({ EN: { key: text }, ES: … }),
   pinned to patch 1.5.12620 as in tools/fetch-journal.js. It's downloaded to kb/data/all_text.json
   the first time (5 MB) and read from there. No dependencies; needs Node 18 (fetch). */
'use strict';
const fs = require('fs');
const path = require('path');

const DUMP = 'https://raw.githubusercontent.com/stradivari96/hollow-knight-translator/'
  + '216cf0b2d78da27357205946ffa18b8ab2476e22/src/all_text.json';
const FILE = path.join(__dirname, '..', 'kb', 'data', 'all_text.json');
const JS = (f) => path.join(__dirname, '..', 'js', f);

/* Curly quotes to straight and normalised spaces: that's how they're compared, and how they're copied. */
const norm = (s) => String(s == null ? '' : s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const low = (s) => norm(s).toLowerCase();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

async function load() {
  if (!fs.existsSync(FILE)) {
    console.error('downloading ' + DUMP + ' → ' + path.relative(process.cwd(), FILE));
    const res = await fetch(DUMP, { headers: { 'User-Agent': 'hallownest-calculator (game-text.js)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    fs.writeFileSync(FILE, Buffer.from(await res.arrayBuffer()));
  }
  const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return { EN: d.EN, ES: d.ES };
}

/* ── Search ─────────────────────────────────────────────────────────────── */
function search({ EN, ES }, q, byKey) {
  const needle = q.toLowerCase();
  const rows = [];
  for (const k of Object.keys(EN).sort()) {
    const en = norm(EN[k]), es = norm(ES[k]);
    const hit = byKey ? k.startsWith(q) : (k.toLowerCase().includes(needle) || en.toLowerCase().includes(needle) || es.toLowerCase().includes(needle));
    if (hit) rows.push([k, en, es]);
  }
  for (const [k, en, es] of rows) console.log(`${k.padEnd(34)} | ${cut(en, 70).padEnd(70)} | ${cut(es, 90)}`);
  console.log(rows.length + ' keys');
}

/* ── Audit ──────────────────────────────────────────────────────────────────
   An English → { Spanish… } index with every key, plus the titles the game splits into
   two or three keys (<X>_SUPER + <X>_MAIN + <X>_SUB: "Troupe Master" + "Grimm", "Zote" + "The
   Mighty", "Forgotten" + "Crossroads"). The comparison ignores case: the game writes in
   capitals what the screen paints in capitals («SOBRECARGA», «ARMONÍA»). */
function index({ EN, ES }) {
  const map = new Map();
  const add = (en, es) => { if (!norm(en)) return; const k = low(en); if (!map.has(k)) map.set(k, new Set()); map.get(k).add(low(es)); };
  for (const k of Object.keys(EN)) add(EN[k], ES[k]);
  for (const k of Object.keys(EN)) {
    const m = /^(.*)_MAIN(_\d+)?$/.exec(k);      // X_MAIN, or UI_CHALLENGE_TITLE_MAIN_1 with its _SUPER_1
    if (!m) continue;
    const at = (part) => m[1] + '_' + part + (m[2] || '');
    const en = [EN[at('SUPER')], EN[k], EN[at('SUB')]], es = [ES[at('SUPER')], ES[k], ES[at('SUB')]];
    add(en.slice(0, 2).join(' '), es.slice(0, 2).join(' '));
    add(en.slice(1).join(' '), es.slice(1).join(' '));
    add(en.join(' '), es.join(' '));
  }
  return map;
}

function audit(dump) {
  const map = index(dump);
  const D = require(JS('data.js')), F = require(JS('enemies.js')), HG = require(JS('hall.js')), P = require(JS('pantheons.js')), J = require(JS('journal.js'));
  const pairs = [];
  const add = (where, v) => { if (v && typeof v.es === 'string' && typeof v.en === 'string') pairs.push({ where, es: v.es, en: v.en }); };
  D.CHARMS.forEach((c) => add('CHARMS.' + c.id, c));
  D.NAILS.forEach((n) => add('NAILS.' + n.level, n));
  Object.entries(D.ARTS).forEach(([k, v]) => add('ARTS.' + k, v));
  Object.values(D.SPELLS).forEach((s) => { add('SPELLS.' + s.key + '.slot', s.slot); s.levels.forEach((l, i) => l && add('SPELLS.' + s.key + i, l)); });
  add('ABILITIES.dream', D.ABILITIES.dream);
  add('ABILITIES.awoken', D.ABILITIES.awoken);
  [...D.EQUIPMENT, ...D.KEY_ITEMS, ...D.CARRIED].forEach((it) => add('ITEMS.' + it.id, it));
  add('SHARDS', D.SHARDS); add('FRAGMENTS', D.FRAGMENTS);
  const R = require(JS('rooms.js'));
  Object.entries(R.AREAS).forEach(([id, a]) => add('AREAS.' + id, a));
  Object.entries(R.PLACES).forEach(([id, a]) => add('PLACES.' + id, a));
  Object.entries(D.COLLECTIBLE_KINDS).forEach(([id, k]) => add('COLLECTIBLE_KINDS.' + id, k));
  D.ABILITIES.cloaks.forEach((c, i) => c && add('ABILITIES.cloak' + i, c));
  const zones = new Map();
  for (const f of F.FOES) { add('FOES.' + f.id, f.name); if (f.zone && !zones.has(f.zone.en)) zones.set(f.zone.en, f.zone); }
  zones.forEach((z) => add('zone', z));
  for (const s of HG.STATUES) { add('HALL.' + s.id + '.title', s.title); if (s.tablet) add('HALL.' + s.id + '.tablet', s.tablet); }
  for (const p of P.PANTHEONS) {
    add('PANTHEONS.' + p.id, p.name); add('PANTHEONS.' + p.id + '.motto', p.motto);
    p.rooms.forEach((r) => r.who && add('PANTHEONS.' + p.id + '.who', r.who));
  }
  Object.entries(J.EXTRAS).forEach(([id, x]) => add('EXTRAS.' + id, x.name));
  J.BOOK.forEach((r) => r.name && add('BOOK.' + r.id, r.name));

  let bad = 0, none = 0;
  for (const p of pairs) {
    const es = map.get(low(p.en));
    if (!es) { none += 1; console.log(`?  ${p.where.padEnd(30)} "${p.en}" isn't in the game: its source is the wiki (site: "${p.es}")`); continue; }
    if (es.has(low(p.es))) continue;
    bad += 1;
    console.log(`✗  ${p.where.padEnd(30)} "${p.en}" → site "${p.es}", game "${[...es].join('" / "')}"`);
  }

  /* The js/i18n.js strings that carry their key alongside (// KEY) have to say the same as
     the game in both languages. */
  const src = fs.readFileSync(JS('i18n.js'), 'utf8');
  const re = /^\s*(\w+):\s*\{ es: '((?:[^'\\]|\\.)*)',\s*en: '((?:[^'\\]|\\.)*)' \},[ \t]*\/\/[ \t]*([A-Z][A-Z0-9_]+)[ \t]*$/gm;
  const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  let m, keyed = 0;
  while ((m = re.exec(src))) {
    const [, id, es, en, key] = m;
    keyed += 1;
    if (!(key in dump.EN)) { bad += 1; console.log(`✗  UI.${id.padEnd(27)} the key ${key} doesn't exist in the dump`); continue; }
    if (low(unesc(en)) !== low(dump.EN[key])) { bad += 1; console.log(`✗  UI.${id.padEnd(27)} en "${unesc(en)}" ≠ ${key} "${norm(dump.EN[key])}"`); }
    if (low(unesc(es)) !== low(dump.ES[key])) { bad += 1; console.log(`✗  UI.${id.padEnd(27)} es "${unesc(es)}" ≠ ${key} "${norm(dump.ES[key])}"`); }
  }
  console.log(`${pairs.length} names and ${keyed} keyed strings: ${bad} that don't say what the game says, ${none} with no game text`);
  return bad;
}

(async () => {
  const args = process.argv.slice(2);
  const dump = await load();
  if (args[0] === '--audit') process.exitCode = audit(dump) ? 1 : 0;
  else if (args[0] === '--key' && args[1]) search(dump, args[1], true);
  else if (args.length && args[0][0] !== '-') search(dump, args.join(' '), false);
  else console.log('usage: npm run text -- "text" | --key PREFIX_ | --audit');
})().catch((e) => { console.error(e.message); process.exitCode = 2; });
