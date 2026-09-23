#!/usr/bin/env node
/* tools/fetch-journal.js — the Hunter's Journal: the combat picker and your game.
   Writes js/journal.js (order, texts and the book of 168 entries), assets/journal/<id>.png
   (the Journal list's icons, the wiki's `HJ <Name>.png`) and assets/hunter/ (what your
   game's Journal paints). No dependencies (Node ≥ 18).
   Usage: node tools/fetch-journal.js [--force]      (--force downloads the artwork again)

   The icons arrive as RGBA (about 2 MB for the 163). If there's python3 with Pillow they're
   converted to a 256-colour palette with their alpha: 443 KB and indistinguishable. Without
   Pillow they stay as they arrive, and the site works just the same.

   Four sources, and no translation by hand:
     · the order and the icons  "Hunter's Journal (Hollow Knight)" on hollowknight.wiki,
                                and from its table, the defeats each entry requires and its note
                                (whether it's inspected, whether it counts for the Hunter's Mark…)
     · the English text         the `{{Quote|description<hr/>notes|Hr = Bestiary}}` on each
                                creature's page
     · the Spanish text         the `{{Journal|description|notes}}` on the Spanish page
                                (hollowknight.fandom.com/es), reached through the English
                                page's `langlinks`
     · the game's text          the dump of its TextAssets (DUMP, EN and ES keys), for what the
                                wikis don't carry cleanly: the five entries that aren't
                                creatures (the Shade, the Hunter's Mark, the Seal, the Idol with
                                its three texts and the Weathered Mask), the game's line when
                                inspecting, and the Journal name where it isn't the foe entry's
                                ("Hornet", "Radiance")

   The Journal has 168 entries and we have 180 foe entries, and they don't match one to one:
     · SHARES: three foe entries complete another's Journal entry (the wiki's table says so:
       Enraged Guardian completes Crystal Guardian's, Hornet Sentinel Hornet's, and Absolute
       Radiance opens the Radiance's). They go after it and show its text.
     · BEHIND: the ones with no entry (the three bosses' dreams, the Godhome versions, the
       Zotelings of the Eternal Ordeal). They go after their original, without text. Revek has
       no original and closes the list.
     · The five entries that aren't a foe entry (the Shade, the Hunter's Mark, the Seal of
       Binding, the Void Idol and the Weathered Mask) don't go in ORDER or in ENTRIES, which
       belong to combat: they go in BOOK and in EXTRAS, which belong to your game's Journal. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const foes = require('../js/enemies.js');

const ROOT = path.join(__dirname, '..');
const OUT_JS = path.join(ROOT, 'js', 'journal.js');
const OUT_ICONS = path.join(ROOT, 'assets', 'journal');
const OUT_HUNTER = path.join(ROOT, 'assets', 'hunter');
const FORCE = process.argv.includes('--force');
const UA = { 'user-agent': 'hollow-stats/1.0 (proyecto personal)' };
const API = 'https://hollowknight.wiki/mw/api.php';
const API_ES = 'https://hollowknight.fandom.com/es/api.php';
const ICON_PX = 96;   // painted at 48 px: double for dense screens
/* The game's texts: its decrypted TextAssets, in one dump per language. Pinned to the
   commit of patch 1.5.12620, the game's last, so that downloading again gives the same thing. */
const DUMP = 'https://raw.githubusercontent.com/stradivari96/hollow-knight-translator/'
  + '216cf0b2d78da27357205946ffa18b8ab2476e22/src/all_text.json';

/* Journal entry title → foe entry id, when it isn't its English name. */
const TITLE_ID = {
  'Watcher Knight': 'watcher-knights',
  'Grimm': 'grimm',
  'Nightmare King Grimm': 'nkg',
  'Brothers Oro & Mato': 'oro-mato',
  'Paintmaster Sheo': 'sheo',
  'Great Nailsage Sly': 'sly',
  'Zote': 'zote-the-mighty',
  'Radiance': 'the-radiance',
};
const SHARES = {
  'enraged-guardian': 'crystal-guardian',
  'hornet-sentinel': 'hornet-protector',
  'absolute-radiance': 'the-radiance',
};
const BEHIND = {
  'failed-champion': 'false-knight',
  'soul-tyrant': 'soul-master',
  'lost-kin': 'broken-vessel',
  'winged-nosk': 'nosk',
  'sisters-of-battle': 'mantis-lords',
  'fluke-larva': 'flukemarm',
  'zoteling-the-mighty': 'volatile-zoteling',
  'heavy-zoteling': 'zoteling-the-mighty',
  'turret-zoteling': 'heavy-zoteling',
  'lanky-zoteling': 'turret-zoteling',
  'zote-s-curse': 'lanky-zoteling',
  'head-of-zote': 'zote-s-curse',
  'fluke-zoteling': 'head-of-zote',
};
const AT_END = ['revek'];

/* Pages not named like the Journal entry. */
const PAGE_EN = { 'grimm': 'Troupe Master Grimm' };   // "Grimm" is the character's page
const PAGE_ES = { 'oblobbles': 'Oblobble', 'grimm': 'Grimm' };

/* The five entries that aren't creatures: their id and their key in the game's dump
   (NAME_<key>, DESC_<key>, NOTE_<key>). The Void Idol has three, one per level:
   its description changes on beating all 44 on Ascended and on Radiant. */
const EXTRA_ID = {
  'Shade': 'shade',
  "Hunter's Mark": 'hunters-mark',
  'Seal of Binding': 'seal-of-binding',
  'Void Idol': 'void-idol',
  'Weathered Mask': 'weathered-mask',
};
const EXTRA_KEY = {
  'shade': 'HOLLOW_SHADE',
  'hunters-mark': 'HUNTERMARK',
  'seal-of-binding': 'KIN_SEAL',
  'void-idol': ['VOID_IDOL_1', 'VOID_IDOL_2', 'VOID_IDOL_3'],
  'weathered-mask': 'GODSEEKER_MASK',
};
/* What the game says when inspecting what gives you the entry without defeating anyone. */
const INSPECT_KEY = {
  'goam': 'JOURNAL_GOAM',
  'charged-lumafly': 'JOURNAL_ZAP_BUGS',
  'garpede': 'JOURNAL_CENTIPEDE',
  'void-tendrils': 'JOURNAL_TENDRILS',
  'mossy-vagabond': 'JOURNAL_FAT_MOSS_CULTIST',
};
/* What your game's Journal paints, into assets/hunter/: destination → [file, height]. The
   extras' portraits carry their id; the Idol uses the ones in assets/hall/ and the Seal has
   none (the wiki only keeps its medallion). */
const HUNTER_ART = {
  'book.png': ["Hunter's Journal.png", 112],          // the item: the button that opens the Journal
  'hunter.png': ['Hunter.png', 240],                  // the Hunter, who tells you how much you have left
  'frame.png': ['Bestiary frame upgrade.png', 105],   // the complete entry's frame
  'fleur.png': ['Bestiary.png', 37],                  // the page's flourish
  'shade.png': ['B Shade.png', 115],
  'hunters-mark.png': ["Hunter's Mark.png", 340],
  'weathered-mask.png': ['B Weathered Mask.png', 259],
};

async function api(base, params) {
  const url = base + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}: ${url}`);
  return res.json();
}

/* The wikitext of many pages, 50 at a time. Returns { requested title: text }. */
async function pages(base, titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const json = await api(base, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: batch.join('|') });
    const alias = {};
    for (const n of [...(json.query.normalized || []), ...(json.query.redirects || [])]) alias[n.to] = alias[n.from] || n.from;
    for (const p of json.query.pages) {
      const rev = p.revisions && p.revisions[0];
      if (!rev) continue;
      let asked = p.title;
      while (alias[asked]) asked = alias[asked];
      out[asked] = rev.slots.main.content;
    }
    process.stdout.write('.');
  }
  return out;
}

async function langlinks(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const json = await api(API, { action: 'query', prop: 'langlinks', lllang: 'es', titles: titles.slice(i, i + 50).join('|') });
    const norm = {};
    for (const n of json.query.normalized || []) norm[n.to] = n.from;
    for (const p of json.query.pages) if (p.langlinks) out[norm[p.title] || p.title] = p.langlinks[0].title;
    process.stdout.write('.');
  }
  return out;
}

/* The other way round: the Spanish pages that link to an English one. Most pages on
   hollowknight.wiki don't link to the Spanish one, but many Spanish ones do link to the English. */
async function langbacklinks() {
  const json = await api(API_ES, { action: 'query', list: 'langbacklinks', lbllang: 'en', lblprop: 'lltitle', lbllimit: '500' });
  return Object.fromEntries(json.query.langbacklinks.map((x) => [x.lltitle, x.title]));
}

/* Closes a template by counting braces: the text can carry {{…}} inside. */
function template(src, start) {
  let depth = 0;
  for (let i = start; i < src.length - 1; i++) {
    if (src[i] === '{' && src[i + 1] === '{') { depth++; i++; }
    else if (src[i] === '}' && src[i + 1] === '}') { depth--; i++; if (!depth) return src.slice(start + 2, i - 1); }
  }
  return null;
}

/* Splits on top-level |, without breaking [[a|b]] or {{a|b}}. */
function args(body) {
  const out = [];
  let cur = '', sq = 0, cu = 0;
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '[[') { sq++; cur += two; i++; continue; }
    if (two === ']]') { sq--; cur += two; i++; continue; }
    if (two === '{{') { cu++; cur += two; i++; continue; }
    if (two === '}}') { cu--; cur += two; i++; continue; }
    if (body[i] === '|' && !sq && !cu) { out.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  out.push(cur);
  return out;
}

/* Wikitext → plain text: links, italics, tags and spaces. */
function plain(s) {
  return s
    .replace(/\s*\n\s*/g, ' ')
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{!\}\}/g, '|')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<br\s*\/?>/gi, '\n')   // the Grimmkin's verses go on separate lines
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim();
}

/* {{Quote|description<hr/>notes|Hr = Bestiary}} — the Journal quote on the English page.
   The dream warriors and the Zotelings mark it as `Hr = Dreamjournal`, and the
   Grimm Troupe as `Hr = Troupejournal`. */
function journalEn(src) {
  for (let at = src.indexOf('{{Quote'); at >= 0; at = src.indexOf('{{Quote', at + 2)) {
    const body = template(src, at);
    if (!body) continue;
    const a = args(body);
    if (!a.some((x) => /^\s*Hr\s*=\s*(Bestiary|Dreamjournal|Troupejournal)\s*$/i.test(x))) continue;
    const text = a[1] || '';
    const [desc, notes] = text.split(/<hr\s*\/?>/i);
    // The signature (Xero, Grimm, "The Grey Prince" Chapter 112) is the next argument.
    const by = a.slice(2).find((x) => x.trim() && !/^\s*\w+\s*=/.test(x));
    return { desc: plain(desc || ''), notes: plain(notes || ''), by: by ? plain(by) : '' };
  }
  return null;
}

/* The Spanish page glues the signature to the end of the notes («… con la gloria. -Xero»);
   the English one keeps it apart. It's split off so both are treated the same. */
function splitSignature(x) {
  const m = x.notes.match(/\s*-\s?([^-\n]{2,60})$/);
  return m ? { ...x, notes: x.notes.slice(0, m.index).trim(), by: m[1].trim() } : { ...x, by: '' };
}

/* {{Journal|description|notes}} — the «Diario del Cazador» section on the Spanish page.
   Some pages (Goam) put it like the English one: {{Cita|description<hr/>notes}}. */
function journalEs(src) {
  const at = src.search(/\{\{\s*Journal\s*\|/);
  if (at >= 0) {
    const a = args(template(src, at) || '').slice(1).filter((x) => !/^\s*\w+\s*=/.test(x));
    return splitSignature({ desc: plain(a[0] || ''), notes: plain(a[1] || '') });
  }
  const quoteAt = src.search(/\{\{\s*Cita\s*\|/);
  if (quoteAt < 0) return null;
  const text = args(template(src, quoteAt) || '')[1] || '';
  if (!/<hr\s*\/?>/i.test(text)) return null;
  const [desc, notes] = text.split(/<hr\s*\/?>/i);
  return splitSignature({ desc: plain(desc), notes: plain(notes || '') });
}

/* A wiki picture, at a width or a height. The CDN only serves thumbnails someone has already
   requested: if the thumbnail isn't there, the original is downloaded (the medallions are small). */
async function download(file, dest, size) {
  const json = await api(API, { action: 'query', prop: 'imageinfo', iiprop: 'url|size', ...size, titles: 'File:' + file });
  const ii = json.query.pages[0].imageinfo && json.query.pages[0].imageinfo[0];
  if (!ii) throw new Error('no such file');
  let res = await fetch(ii.thumburl || ii.url, { headers: UA });
  if (!res.ok && ii.thumburl) res = await fetch(ii.url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}
const icon = (file, dest) => download(file, dest, { iiurlwidth: String(ICON_PX) });

/* To a 256-colour palette with its alpha, if there's python3 with Pillow; if not, they stay RGBA. */
function toPalette(files) {
  if (!files.length) return;
  const py = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n'
    + '  im = Image.open(f)\n'
    + '  if im.mode != "RGBA": im = im.convert("RGBA")\n'
    + '  im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(f, optimize=True)\n';
  try { execFileSync('python3', ['-c', py, ...files], { stdio: 'pipe' }); console.log('Converted to a palette.'); }
  catch (err) { console.log('No python3/Pillow: they stay RGBA.'); }
}

/* The Journal table: in each row, the medallion and the page, the defeats it requires and its note.
   The note can span several rows (`rowspan`): the ones below carry no cell and inherit the
   one above. The Husk Hornhead's row starts with "||". */
function parseTable(raw, idOf) {
  const out = [];
  let span = null;
  raw.split('\n|-').slice(1).forEach((row) => {
    const m = row.match(/\[\[F[iI]le:\s*(HJ[ _][^|\]]+?\.png)[^\]]*\]\]\s*\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/);
    if (!m) return;
    const page = m[2].trim();
    const title = page.replace(/ \(Hollow Knight\)$/, '');
    const cells = row.split('\n').filter((l) => /^\|(?![}-])/.test(l)).map((l) => l.replace(/^\|\|?/, ''));
    let note = cells[2];
    const rs = note !== undefined && note.match(/^\s*rowspan="(\d+)"[^|]*\|(.*)$/);
    if (rs) { span = { left: +rs[1] - 1, note: rs[2] }; note = rs[2]; }
    else if (note === undefined && span && span.left > 0) { note = span.note; span.left--; }
    out.push({
      n: out.length + 1, icon: m[1].replace(/_/g, ' '), page: page, title,
      shown: (m[3] || title).trim(), id: idOf(title), extra: EXTRA_ID[title] || null,
      kills: (cells[1] || '').trim(), note: plain(note || ''),
    });
  });
  return out;
}

/* "45" → 45; "Entry" (you get it by inspecting something) → null; "10 or Entry" → 10. */
function killsOf(e) {
  if (/^\d+$/.test(e.kills)) return +e.kills;
  if (/^Entry$/i.test(e.kills)) return null;
  const m = e.kills.match(/^(\d+) or Entry$/i);
  if (m) return +m[1];
  throw new Error(`${e.title}: can't read the kill count "${e.kills}"`);
}

/* What the table's note says, as flags. Only the true ones are kept. */
function flagsOf(e) {
  const x = e.note, out = {};
  if (/already unlocked after obtaining the Hunter's Journal/i.test(x)) out.start = true;   // Crawlid, Shade
  if (/automatically unlocked/i.test(x)) out.auto = true;          // the three from the White Fragment
  if (/Not required for Keen Hunter/i.test(x)) out.optional = true;   // doesn't count for the Mark
  if (/Not included in total entry count/i.test(x)) out.uncounted = true;
  if (/Only one needs to be killed to obtain the Hunter's Mark/i.test(x)) out.once = true;   // Flukemunga
  return out;
}

/* A text from the game's dump: curly quotes become straight, like the rest of the
   Journal. The game's Spanish carries typos («vuesos», «artedacto», «ningun»): they're copied
   as they are, because it's its text. */
const clean = (s) => (s || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').trim();

const js = (s) => JSON.stringify(s);

(async () => {
  console.log('Journal…');
  const raw = (await pages(API, ["Hunter's Journal (Hollow Knight)"]))["Hunter's Journal (Hollow Knight)"];
  const byName = Object.fromEntries(foes.FOES.map((f) => [f.name.en, f.id]));

  // Each table row: [[File:HJ_X.png|…]] [[Page]] | defeats | note
  const tableRows = parseTable(raw, (title) => TITLE_ID[title] || byName[title] || null);
  const ours = tableRows.filter((e) => e.id);
  const extras = tableRows.filter((e) => e.extra);
  console.log(`\n${tableRows.length} entries; ${ours.length} are our foe entries and ${extras.length} aren't creatures.`);

  /* Your game's book: the game's 168, with what each one requires. They're game figures
     that won't change, so if the table stops giving these counts, something was misread:
     168 entries; 4 outside the total (164, the maximum for "Encountered"); 146 the ones the
     Hunter's Mark and Keen Hunter require. */
  const orphans = tableRows.filter((e) => !e.id && !e.extra).map((e) => e.title);
  if (orphans.length) throw new Error('Journal entries with no foe entry and no place: ' + orphans.join(', '));
  const book = tableRows.map((e) => ({ id: e.id || e.extra, n: e.n, kills: killsOf(e), ...flagsOf(e) }));
  const countOf = (f) => book.filter(f).length;
  if (book.length !== 168) throw new Error(`The Journal has ${book.length} entries, not 168`);
  if (countOf((b) => !b.uncounted) !== 164) throw new Error(`${countOf((b) => !b.uncounted)} count, not 164`);
  if (countOf((b) => !b.optional) !== 146) throw new Error(`${countOf((b) => !b.optional)} are required for the Mark, not 146`);
  if (extras.length !== Object.keys(EXTRA_ID).length) throw new Error('Some non-creature entries are missing');
  if (new Set(book.map((b) => b.id)).size !== 168) throw new Error('An entry appears twice in the book');

  // The order: the Journal's, with the ones that share or have no entry behind their own.
  const order = [];
  const hang = (id) => {
    order.push(id);
    for (const [child, parent] of Object.entries({ ...SHARES, ...BEHIND })) if (parent === id) hang(child);
  };
  for (const e of ours) hang(e.id);
  for (const id of AT_END) order.push(id);
  const unplaced = foes.FOES.filter((f) => !order.includes(f.id)).map((f) => f.id);
  if (unplaced.length) throw new Error('Foe entries with no place in the Journal: ' + unplaced.join(', '));
  if (new Set(order).size !== order.length) throw new Error('A foe entry appears twice in the order');

  console.log('English texts…');
  for (const e of ours) if (PAGE_EN[e.id]) e.page = PAGE_EN[e.id];
  const en = await pages(API, ours.map((e) => e.page));
  console.log('\nSpanish pages…');
  /* The Spanish page is looked for along four paths, from most to least reliable: the English
     page's link, the Spanish page's link back, and the foe entry's official name
     (`name.es`, the game's ESname) as is and with each word capitalised, which is how that
     wiki titles pages. The first one that has its {{Journal}} is kept. */
  const forward = await langlinks(ours.map((e) => e.page));
  const back = await langbacklinks();
  const tc = (x) => x.replace(/(^|\s)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  const candidates = (e) => {
    const n = foes.FOE_BY_ID[e.id].name.es;
    const title = e.page.replace(/ \(Hollow Knight\)$/, '');
    return [...new Set([PAGE_ES[e.id], forward[e.page], back[e.page], back[title], n, tc(n)].filter(Boolean))];
  };
  const es = await pages(API_ES, [...new Set(ours.flatMap(candidates))]);

  const entries = {};
  const issues = [];
  for (const e of ours) {
    const a = en[e.page] && journalEn(en[e.page]);
    let b = null, foundAt = '';
    for (const c of candidates(e)) {
      b = es[c] && journalEs(es[c]);
      if (b && b.desc) { foundAt = c; break; }
    }
    if (!a || !a.desc) issues.push(`${e.id}: no English text (${e.page})`);
    if (!b || !b.desc) issues.push(`${e.id}: no Spanish text (tried: ${candidates(e).join(' / ')})`);
    else if (!a || !a.notes !== !b.notes) issues.push(`${e.id}: notes in only one language (${e.page} / ${foundAt})`);
    else if (!a.by !== !b.by) issues.push(`${e.id}: signature in only one language ("${a.by}" / "${b.by}")`);
    // Without both languages none is shown: the site doesn't mix languages.
    const pair = (k) => (a && b && a[k] && b[k] ? { es: b[k], en: a[k] } : null);
    entries[e.id] = { n: e.n, desc: pair('desc'), notes: pair('notes'), by: pair('by') };
  }
  for (const [child, parent] of Object.entries(SHARES)) entries[child] = { of: parent };
  // The book and the foe entries give the same entry number.
  for (const e of ours) if (entries[e.id].n !== e.n) throw new Error(`${e.id}: n ${entries[e.id].n} vs ${e.n}`);

  console.log('Game texts…');
  const res = await fetch(DUMP, { headers: UA });
  if (!res.ok) throw new Error(`Dump HTTP ${res.status}`);
  const { EN, ES } = await res.json();
  const dump = (k) => (EN[k] && ES[k] ? { es: clean(ES[k]), en: clean(EN[k]) } : null);
  /* The signature goes at the end of the note, on its own line: «"…"\n- Lemm». It's split off as in splitSignature(). */
  const withSignature = (k) => {
    const x = dump(k);
    if (!x) return { notes: null, by: null };
    const parts = { es: x.es.match(/^([\s\S]*?)\n-\s?([^\n]+)$/), en: x.en.match(/^([\s\S]*?)\n-\s?([^\n]+)$/) };
    if (!parts.es !== !parts.en) issues.push(`${k}: signature in only one language`);
    return parts.es && parts.en
      ? { notes: { es: parts.es[1].trim(), en: parts.en[1].trim() }, by: { es: parts.es[2].trim(), en: parts.en[2].trim() } }
      : { notes: x, by: null };
  };
  const extrasOut = {};
  for (const e of extras) {
    const k = EXTRA_KEY[e.extra];
    const keys = Array.isArray(k) ? k : [k];
    const name = dump('NAME_' + keys[0]);
    const descs = keys.map((c) => dump('DESC_' + c));
    const { notes, by } = withSignature('NOTE_' + keys[0]);
    if (!name || descs.some((d) => !d)) issues.push(`${e.extra}: no name or description in the dump (${keys.join(', ')})`);
    // The Idol, one description per Hall level: Attuned, Ascended, Radiant.
    const desc = Array.isArray(k) ? { at: descs[0], asra: descs[1], radiant: descs[2] } : descs[0];
    extrasOut[e.extra] = { name, desc, notes, by };
  }
  const inspect = {};
  for (const [id, k] of Object.entries(INSPECT_KEY)) {
    inspect[id] = dump(k);
    if (!inspect[id]) issues.push(`${id}: no inspect line (${k})`);
    if (!book.some((b) => b.id === id && /inspect/i.test(tableRows[b.n - 1].note))) issues.push(`${id}: the table doesn't say it's inspected`);
  }
  /* The Journal name, where it isn't the foe entry's: «Hornet» and not «Hornet Protectora»,
     «Destello» and not «Destello» with an article. The game's NAME_ whose English is the
     table's is looked up; if there are several, they must all say the same. If none matches,
     the foe entry's is kept (Oblobbles: the wiki puts it in the plural and the game doesn't). */
  const journalNames = {};
  for (const e of ours) {
    if (e.shown === foes.FOE_BY_ID[e.id].name.en) continue;
    const keys = Object.keys(EN).filter((k) => /^NAME_/.test(k) && clean(EN[k]) === e.shown);
    const namePairs = [...new Set(keys.map((k) => JSON.stringify(dump(k))))];
    if (namePairs.length === 1 && dump(keys[0])) journalNames[e.id] = dump(keys[0]);
    else issues.push(`${e.id}: "${e.shown}" matches no game name (${keys.join(', ') || 'none'}); the foe entry's is kept`);
  }

  const pair = (x) => `{ es: ${js(x.es)}, en: ${js(x.en)} }`;
  const row = (b) => {
    const parts = [`id: ${js(b.id)}`, `n: ${b.n}`, `kills: ${b.kills}`];
    for (const f of ['start', 'auto', 'optional', 'uncounted', 'once']) if (b[f]) parts.push(`${f}: true`);
    if (journalNames[b.id]) parts.push(`name: ${pair(journalNames[b.id])}`);
    if (inspect[b.id]) parts.push(`inspect: ${pair(inspect[b.id])}`);
    return `    { ${parts.join(', ')} },`;
  };
  const extra = ([id, x]) => [
    `    ${js(id)}: {`,
    `      name: ${pair(x.name)},`,
    x.desc && x.desc.at
      ? `      desc: {\n${['at', 'asra', 'radiant'].map((d) => `        ${d}: ${pair(x.desc[d])},`).join('\n')}\n      },`
      : `      desc: ${pair(x.desc)},`,
    `      notes: ${x.notes ? pair(x.notes) : 'null'},${x.by ? `\n      by: ${pair(x.by)},` : ''}`,
    '    },',
  ].join('\n');

  const output = [
    "/* js/journal.js — the Hunter's Journal: the combat picker and your game.",
    "   GENERATED by tools/fetch-journal.js: not edited by hand, it's downloaded again.",
    `   Source: hollowknight.wiki (order, English text and what each entry requires),`,
    `   hollowknight.fandom.com/es (Spanish text, the game's) and the dump of the game's`,
    `   text (the entries that aren't creatures). Downloaded on ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '     ORDER    the 180 entries in Journal order. The ones without their own entry',
    '              go after their original (the dreams, Godhome, the Trial).',
    "     ENTRIES  n = the entry's number in the Journal; desc = the description; notes =",
    "              the Hunter's notes; by = who signs the notes, when it isn't him.",
    "              `of` = completes another entry's Journal entry. An entry that isn't",
    '              here has no Journal entry.',
    "     BOOK     the game's 168 entries, in their order, for your game's Journal.",
    '              kills = defeats the complete entry requires (null: you get it by',
    '              inspecting something, and `inspect` is what the game says when you do);',
    '              start = comes complete with the Journal; auto = opens without defeating any (the',
    "              White Fragment); optional = doesn't count for the Hunter's Mark or for",
    "              Keen Hunter; uncounted = doesn't add to the total; once = for the Mark",
    "              one is enough (the wiki); name = the Journal name, if it isn't the entry's.",
    "     EXTRAS   the five entries that aren't a foe entry, with their game text. The Void",
    '              Idol carries one description per Hall level (at, asra, radiant). */',
    '(() => {',
    "  'use strict';",
    '  const HK = globalThis.HK || (globalThis.HK = {});',
    '',
    '  const ORDER = [',
    ...chunk(order, 6).map((l) => '    ' + l.map(js).join(', ') + ','),
    '  ];',
    '',
    '  const ENTRIES = {',
    ...Object.entries(entries).map(([id, x]) => x.of
      ? `    ${js(id)}: { of: ${js(x.of)} },`
      : [`    ${js(id)}: { n: ${x.n},`,
         `      desc: ${x.desc ? `{ es: ${js(x.desc.es)},\n              en: ${js(x.desc.en)} }` : 'null'},`,
         `      notes: ${x.notes ? `{ es: ${js(x.notes.es)},\n               en: ${js(x.notes.en)} }` : 'null'}${x.by ? `,\n      by: { es: ${js(x.by.es)}, en: ${js(x.by.en)} }` : ''} },`].join('\n')),
    '  };',
    '',
    '  const BOOK = [',
    ...book.map(row),
    '  ];',
    '',
    '  const EXTRAS = {',
    ...Object.entries(extrasOut).map(extra),
    '  };',
    '',
    '  HK.journal = { ORDER, ENTRIES, BOOK, EXTRAS };',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = HK.journal;",
    '})();',
    '',
  ].join('\n');
  fs.writeFileSync(OUT_JS, output);
  console.log(`\nWrote ${path.relative(ROOT, OUT_JS)}: ${order.length} foe entries, ${Object.keys(entries).length} with a Journal entry.`);

  console.log('Icons…');
  fs.mkdirSync(OUT_ICONS, { recursive: true });
  const fetched = [];
  for (const e of [...ours, ...extras]) {
    const id = e.id || e.extra;
    const dest = path.join(OUT_ICONS, id + '.png');
    if (!FORCE && fs.existsSync(dest)) continue;
    try { await icon(e.icon, dest); fetched.push(dest); } catch (err) { issues.push(`${id}: icon ${e.icon}: ${err.message}`); }
  }
  console.log(`Downloaded ${fetched.length} icons.`);
  toPalette(fetched);

  console.log("Artwork for your game's Journal…");
  fs.mkdirSync(OUT_HUNTER, { recursive: true });
  const artFiles = [];
  for (const [dest, [file, height]] of Object.entries(HUNTER_ART)) {
    const out = path.join(OUT_HUNTER, dest);
    if (!FORCE && fs.existsSync(out)) continue;
    try { await download(file, out, { iiurlheight: String(height) }); artFiles.push(out); console.log('  ' + dest + '  ←  ' + file); }
    catch (err) { issues.push(`assets/hunter/${dest}: ${file}: ${err.message}`); }
  }
  toPalette(artFiles);
  if (issues.length) {
    console.log(`\nTo check (${issues.length}):`);
    for (const l of issues) console.log('  ' + l);
  }
})().catch((e) => { console.error(e); process.exit(1); });

function chunk(a, n) {
  const out = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}
