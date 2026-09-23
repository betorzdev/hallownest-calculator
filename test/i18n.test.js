/* test/i18n.test.js — no stray Spanish left when the site switches to English.
   Two nets: the data and the dictionary have both keys, and a pass of the engine in
   English returns neither a single Spanish accented letter nor words that slip through. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const i18n = require('../js/i18n.js');
const data = require('../js/data.js');
const engine = require('../js/engine.js');
const codec = require('../js/codec.js');
const foes = require('../js/enemies.js');

/* Characters that only appear in this site's Spanish. */
const SPANISH_CHARS = /[áéíóúüñ¿¡]/i;
/* Frequent words that would give away an untranslated string even without an accent. */
const SPANISH_WORDS = /\b(de|del|con|sin|por|para|los|las|una|un|el|la|que|más|cada|desde|hasta|tras|todas|todos|alma|golpe|golpes|daño|amuleto|amuletos|máscara|máscaras|muesca|muescas|aguijón|hechizo|hechizos|recipiente|vasija|vasijas|saviavida|Requiere|Caballero)\b/i;

/* Walks an object and returns every { es, en } it finds. */
function pairs(node, path = '', out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((v, i) => pairs(v, path + '[' + i + ']', out));
    return out;
  }
  if (typeof node.es === 'string') out.push({ path, value: node });
  for (const [k, v] of Object.entries(node)) {
    if (k === 'es' || k === 'en') continue;
    pairs(v, path ? path + '.' + k : k, out);
  }
  return out;
}

test('every { es, en } pair in the data has both languages', () => {
  const found = pairs({
    NAILS: data.NAILS, ARTS: data.ARTS, SPELLS: data.SPELLS,
    CHARMS: data.CHARMS, GROUPS: data.GROUPS, STAT_DEFS: data.STAT_DEFS,
    EFFECT_WHEN: data.EFFECT_WHEN, CHARM_EFFECTS: data.CHARM_EFFECTS,
    FOES: foes.FOES, PANTHEONS: require('../js/pantheons.js').PANTHEONS,
    JOURNAL: require('../js/journal.js').ENTRIES, HALL: require('../js/hall.js').STATUES,
    BOOK: require('../js/journal.js').BOOK, EXTRAS: require('../js/journal.js').EXTRAS,
  });
  assert.ok(found.length > 250, `expected many pairs, there are ${found.length}`);
  for (const { path, value } of found) {
    assert.equal(typeof value.en, 'string', `${path} has no English: ${JSON.stringify(value)}`);
    assert.ok(value.en.length > 0, `${path} has empty English`);
  }
});

test('the interface dictionary covers both languages', () => {
  for (const [key, value] of Object.entries(i18n.UI)) {
    assert.equal(typeof value.es, 'string', `UI.${key} has no Spanish`);
    assert.equal(typeof value.en, 'string', `UI.${key} has no English`);
    // The {x} placeholders have to be the same in both.
    const slots = (s) => (s.match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
    assert.equal(slots(value.en), slots(value.es), `UI.${key}: different placeholders`);
  }
});

/* The dictionary's English doesn't drag Spanish along either: not an accent, not a stray word.
   It was born with the arena's explanations (helpNotches, helpStagger…), which are long prose in
   both languages; the game names don't go here, they arrive through {charm} and {label} from the data. */
test('the interface English leaves no stray Spanish', () => {
  for (const [key, value] of Object.entries(i18n.UI)) {
    assert.ok(!SPANISH_CHARS.test(value.en), `UI.${key}: Spanish accent in the English "${value.en}"`);
    assert.ok(!SPANISH_WORDS.test(value.en), `UI.${key}: Spanish word in the English "${value.en}"`);
  }
});

test('the codec.js reasons are in both languages', () => {
  for (const [key, value] of Object.entries(codec.REASON)) {
    assert.equal(typeof value.es, 'string', `REASON.${key} has no Spanish`);
    assert.equal(typeof value.en, 'string', `REASON.${key} has no English`);
  }
});

/* Varied builds so the engine walks through all its text branches. */
const BUILDS = [
  {},
  { nail: 4, masks: 9, vessels: 3, notches: 11, spells: { vs: 2, dd: 2, hw: 2 },
    arts: { cyclone: true, dash: true, great: true },
    charms: ['ustrength', 'quickslash', 'fury', 'shaman'], hp: 1 },
  { nail: 2, masks: 7, vessels: 2, notches: 11, spells: { vs: 1, dd: 1, hw: 1 },
    charms: ['joni', 'lbcore', 'lbheart', 'hiveblood', 'stalwart'], hp: 0 },
  { nail: 3, notches: 11, spells: { vs: 2 }, arts: { great: true },
    charms: ['flukenest', 'crest', 'spore', 'womb', 'weaversong', 'grimmchild', 'melody', 'wielder'] },
  { nail: 4, notches: 11, charms: ['sharpshadow', 'dashmaster', 'sprintmaster', 'unn', 'quickfocus', 'deepfocus', 'elegy', 'grubsong'] },
  { nail: 1, notches: 3, charms: ['uheart', 'joni'] },   // overcharmed
];

/* Every string the engine leaves in view on a sheet. */
function textsOf(sheet) {
  const out = [];
  for (const group of sheet.groups) out.push(group.label);
  for (const stat of Object.values(sheet.stats)) {
    out.push(stat.label);
    if (stat.reason) out.push(stat.reason);
    if (stat.note) out.push(stat.note);
    for (const part of stat.parts || []) { out.push(part.label); if (part.unit) out.push(part.unit); }
    for (const c of stat.contribs) { out.push(c.label); if (c.text) out.push(c.text); if (c.cond) out.push(c.cond); }
  }
  return out.filter(Boolean);
}

test('the engine in English leaves no stray Spanish', () => {
  for (const build of BUILDS) {
    const st = codec.normalize(build);
    for (const text of textsOf(engine.compute(st, 'en'))) {
      assert.ok(!SPANISH_CHARS.test(text), `Spanish accent in "${text}" (build ${JSON.stringify(build.charms || [])})`);
      assert.ok(!SPANISH_WORDS.test(text), `Spanish word in "${text}" (build ${JSON.stringify(build.charms || [])})`);
    }
  }
});

test('the engine in Spanish stays in Spanish and the numbers change separator', () => {
  const st = codec.normalize(BUILDS[1]);
  const es = engine.compute(st, 'es');
  const en = engine.compute(st, 'en');
  assert.equal(es.stats['nail.damage'].label, 'Daño del aguijón');
  assert.equal(en.stats['nail.damage'].label, 'Nail damage');
  assert.equal(es.stats['nail.damage'].value, en.stats['nail.damage'].value);   // the arithmetic doesn't change

  const textOf = (sheet, id, needle) => sheet.stats[id].contribs.map((c) => c.text).find((t) => t && t.includes(needle));
  assert.equal(textOf(es, 'nail.greatSlash', '×'), '2,5 × aguijón base');
  assert.equal(textOf(en, 'nail.greatSlash', '×'), '2.5 × base nail');
});

test('i18n: t() fills the placeholders and pick() chooses the language', () => {
  i18n.setLang('es');
  assert.equal(i18n.t('maskMany', { n: 7 }), '7 máscaras');
  assert.equal(i18n.pick({ es: 'hola', en: 'hi' }), 'hola');
  i18n.setLang('en');
  assert.equal(i18n.t('maskMany', { n: 7 }), '7 masks');
  assert.equal(i18n.pick({ es: 'hola', en: 'hi' }), 'hi');
  assert.equal(i18n.pick({ es: 'solo español' }), 'solo español');   // with no en, it falls back to es
  assert.equal(i18n.pick('texto plano'), 'texto plano');
  i18n.setLang('es');
});

/* ── Enemies and bosses ─────────────────────────────────────────────────────
   Each one's entry goes into the site, so it's worth pinning down its shape: a unique
   id, a health that can be painted and a damage in masks. */
test('enemy entries have a unique id and usable health', () => {
  const seen = new Set();
  assert.ok(foes.FOES.length > 150, `expected the 176 entries, there are ${foes.FOES.length}`);
  for (const f of foes.FOES) {
    assert.ok(/^[a-z0-9-]+$/.test(f.id), `odd id: ${f.id}`);
    assert.ok(!seen.has(f.id), `repeated id: ${f.id}`);
    seen.add(f.id);
    assert.ok(['boss', 'enemy'].includes(f.kind), `${f.id}: kind ${f.kind}`);
    for (const k of ['hp', 'at', 'asra']) {
      const v = f[k];
      if (v === undefined || v === null) continue;
      const nums = Array.isArray(v) ? v : [v];
      assert.ok(Array.isArray(v) ? v.length === 5 : true, `${f.id}.${k}: the list must have 5 values`);
      for (const n of nums) assert.ok(Number.isFinite(n) && n > 0, `${f.id}.${k}: health ${n}`);
    }
    assert.ok(f.dmg >= 1 && f.dmg <= 4, `${f.id}: damage ${f.dmg} masks`);
    for (const a of f.attacks || []) {
      assert.ok(a.dmg === undefined || (a.dmg >= 1 && a.dmg <= 4), `${f.id}/${a.en}: damage ${a.dmg}`);
    }
  }
});

/* The phases are what keeps the entry honest: the bar you see is the game's, not the
   sum. If someone touches a health value, this fires. */
test('the phases add up to what kb/03-bosses.md says', () => {
  const sumHp = (phaseList) => phaseList.reduce((n, ph) => n + ph.parts.reduce((m, p) => m + (Array.isArray(p.hp) ? p.hp[0] : p.hp), 0), 0);
  const expected = {
    'false-knight': 355, 'failed-champion': 1260, 'mantis-lords': 530, 'soul-master': 385,
    'soul-tyrant': 1250, 'oro-mato': 2100, 'sly': 1050, 'sisters-of-battle': 2750,
    'the-radiance': 1700, 'absolute-radiance': 2181, 'oblobbles': 520, 'god-tamer': 1050,
    // Flukemarm isn't a boss, but it isn't one bar either: 25 whole and two halves of 15.
    'flukemon': 55,
    // The Hollow Knight is 1000 and heals 250 on entering phase 4: 1250 if you get there.
    'hollow-knight': 1250,
  };
  for (const [id, total] of Object.entries(expected)) {
    const f = foes.FOE_BY_ID[id];
    assert.ok(f && f.phases, `${id} should have phases`);
    assert.equal(sumHp(f.phases), total, `${id}: the phases add up to ${sumHp(f.phases)} and kb/ says ${total}`);
  }
  // The Watcher Knights are the exception: one bar repeated six times.
  const w = foes.FOE_BY_ID['watcher-knights'];
  assert.equal(w.pool, 6);
  assert.equal(w.active, 2);
  assert.equal(w.phases[0].parts[0].hp[0] * w.pool, 1320, 'six Watcher Knights of 220 make 1320');
});

/* The Godhome health declared on top (at, asra) is the one the Hall and the Journal show; the
   parts' is the one that's fought. If they don't match, the plaque lies. That's how Oblobbles
   (no at/asra on top), Vengefly King (two on Ascended) and Oro and Mato (asra 2600 with 3400
   in the parts) came out. Radiant shares health with Ascended. */
test('in Godhome, the health declared on top is the sum of its parts', () => {
  const partHp = (p, d) => { const v = p[d] !== undefined ? p[d] : p.hp; return Array.isArray(v) ? v[0] : v; };
  let n = 0;
  for (const f of foes.FOES) {
    if (f.at === null || f.at === undefined) continue;
    for (const [d, own] of [['at', f.phasesAt], ['asra', f.phasesAsra]]) {
      const phaseList = own || f.phases;
      if (!phaseList) continue;
      n += 1;
      const partsSum = phaseList.reduce((acc, ph) => acc + ph.parts.reduce((m, p) => m + partHp(p, own ? 'hp' : d), 0), 0)
        * (f.pool || 1);
      const declared = Array.isArray(f[d]) ? f[d][0] : f[d];
      assert.equal(partsSum, declared, `${f.id}.${d}: the parts add up to ${partsSum} and the top says ${declared}`);
    }
  }
  assert.ok(n >= 24, `expected quite a few bosses with phases in Godhome, there are ${n}`);
});

test('every part of a phase has a name in two languages and usable health', () => {
  for (const f of foes.FOES) {
    for (const phaseKey of ['phases', 'phasesAt', 'phasesAsra']) {
      for (const ph of f[phaseKey] || []) {
        assert.ok(ph.parts && ph.parts.length, `${f.id}.${phaseKey}: a phase with no parts`);
        for (const p of ph.parts) {
          assert.equal(typeof p.name.es, 'string', `${f.id}: part with no Spanish`);
          assert.equal(typeof p.name.en, 'string', `${f.id}: part with no English`);
          for (const v of [p.hp, p.at, p.asra]) {
            if (v === undefined) continue;
            for (const n of Array.isArray(v) ? v : [v]) {
              assert.ok(Number.isFinite(n) && n > 0, `${f.id}: part health ${n}`);
            }
          }
        }
      }
    }
    // A boss with its own Godhome phases has to have both, or neither.
    assert.equal(!!f.phasesAt, !!f.phasesAsra, `${f.id}: phasesAt and phasesAsra go together`);
  }
});

/* Each arena card shows who it is: the entry's portrait or, for the parts that are another
   character or another state, their own (art). The ones that went wrong, pinned. */
test('every entry has its portrait, and every part with art, its picture', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'assets', 'enemies');
  const hasPortrait = (id) => fs.existsSync(path.join(dir, id + '.png'));
  assert.deepEqual(foes.FOES.filter((f) => !hasPortrait(f.id)).map((f) => f.id), [], 'entries with no portrait: npm run enemies');
  const partArt = {};
  for (const f of foes.FOES) {
    for (const phaseKey of ['phases', 'phasesAt', 'phasesAsra']) {
      for (const ph of f[phaseKey] || []) for (const p of ph.parts) if (p.art) (partArt[f.id] = partArt[f.id] || new Set()).add(p.art);
    }
  }
  for (const [id, set] of Object.entries(partArt)) {
    for (const a of set) {
      assert.ok(hasPortrait(a), `${id}: assets/enemies/${a}.png is missing`);
      assert.ok(!foes.FOE_BY_ID[a], `${id}: the picture "${a}" is named like an entry`);
    }
  }
  const de = (id) => [...(partArt[id] || [])].sort().join(',');
  assert.equal(de('god-tamer'), 'god-tamer-beast,god-tamer-tamer', 'the Tamer and the Beast, each their own');
  assert.equal(de('oro-mato'), 'oro-mato-mato,oro-mato-oro');
  assert.equal(de('false-knight'), 'false-knight-maggot', 'the armour carries the portrait; the maggot, its own');
  assert.equal(de('failed-champion'), 'failed-champion-head');
  assert.equal(de('flukemon'), 'flukemon-bottom,flukemon-top');
  assert.equal(de('mantis-lords'), 'mantis-lord');
  assert.equal(de('sisters-of-battle'), 'mantis-lord', 'in the fight they are the same figures');
});

/* False Knight and Failed Champion: armour and maggot alternating, and a last maggot after
   breaking the floor. The wiki: "3 armour stages + 4 head stages"; the Champion, 60 for the
   first head and 40 for the rest. */
test('False Knight and Failed Champion alternate armour and maggot, and end with the finishing blow', () => {
  const phaseOrder = (id) => foes.FOE_BY_ID[id].phases.map((ph) => (ph.parts[0].name.en === 'Armour' ? 'A' : 'G') + ph.parts[0].hp).join(' ');
  assert.equal(phaseOrder('false-knight'), 'A65 G40 A65 G40 A65 G40 G40');
  assert.equal(phaseOrder('failed-champion'), 'A360 G60 A360 G40 A360 G40 G40');
  for (const id of ['false-knight', 'failed-champion']) {
    const phaseList = foes.FOE_BY_ID[id].phases;
    assert.ok(phaseList.at(-1).note, `${id}: the finishing blow explains that it breaks the floor`);
    assert.ok(phaseList.slice(0, -1).every((ph) => !ph.note), `${id}: only the finishing blow carries a note`);
  }
});

/* Each character, its attacks (wiki, each boss's "Behaviour and Tactics"). */
test('attacks with by belong to a part that exists, and each character has its own', () => {
  const partNames = (f) => new Set(['phases', 'phasesAt', 'phasesAsra'].flatMap((k) => (f[k] || []).flatMap((ph) => ph.parts.map((p) => p.name.en))));
  for (const f of foes.FOES) {
    for (const a of f.attacks || []) {
      if (a.by === undefined) continue;
      assert.ok(partNames(f).has(a.by), `${f.id}: "${a.en}" belongs to "${a.by}", which is none of its parts`);
    }
  }
  const de = (id, partHp) => foes.FOE_BY_ID[id].attacks.filter((a) => !a.by || a.by === partHp).map((a) => a.en);
  assert.deepEqual(de('god-tamer', 'Tamer'), ['Leap'], 'the Tamer only jumps with the lance');
  assert.deepEqual(de('god-tamer', 'Beast'), ['Roll', 'Spew']);
  assert.deepEqual(de('false-knight', 'Maggot'), [], "the maggot is its stagger: it doesn't attack");
  assert.deepEqual(de('failed-champion', 'Head'), []);
  assert.equal(de('false-knight', 'Armour').length, 5);
  assert.ok(de('oro-mato', 'Oro').includes('Dash Slash') && !de('oro-mato', 'Oro').includes('Cyclone Slash'));
  assert.ok(de('oro-mato', 'Mato').includes('Cyclone Slash') && !de('oro-mato', 'Mato').includes('Dash Slash'));
});

test('what bosses summon points to entries that exist', () => {
  let n = 0;
  for (const f of foes.FOES) {
    for (const x of f.summons || []) {
      n += 1;
      assert.ok(foes.FOE_BY_ID[x.id], `${f.id} summons "${x.id}", which is no entry`);
      assert.ok(foes.FOE_BY_ID[x.id].kind === 'enemy', `${f.id} summons a boss: ${x.id}`);
      if (x.hp !== undefined) assert.ok(x.hp > 0, `${f.id}/${x.id}: health ${x.hp}`);
      assert.equal(typeof x.note.es, 'string', `${f.id}/${x.id}: note with no Spanish`);
      assert.equal(typeof x.note.en, 'string', `${f.id}/${x.id}: note with no English`);
      for (const d of x.diffs || []) assert.ok(['base', 'at', 'asra', 'radiant'].includes(d), `${f.id}/${x.id}: difficulty "${d}"`);
    }
  }
  assert.ok(n >= 25, `expected quite a few minions, there are ${n}`);
  // Broken Vessel's Balloon is worth 1 there and 15 on its own: the override is the point.
  const bv = foes.FOE_BY_ID['broken-vessel'].summons.find((x) => x.id === 'infected-balloon');
  assert.equal(bv.hp, 1);
  assert.equal(foes.FOE_BY_ID['infected-balloon'].hp, 15);
});

test('only bosses have attacks, and all of them do except the two undocumented ones', () => {
  const withAttacks = foes.FOES.filter((f) => (f.attacks || []).length);
  assert.ok(withAttacks.every((f) => f.kind === 'boss'), 'a common enemy with a list of attacks');
  const bossesWithoutAttacks = foes.FOES.filter((f) => f.kind === 'boss' && !(f.attacks || []).length);
  assert.deepEqual(bossesWithoutAttacks.map((f) => f.id).sort(), ['pale-lurker', 'zote-the-mighty'],
    "the wiki doesn't document attacks for these two; if that changes, update kb/03-bosses.md");
});

/* ── The Hunter's Journal ───────────────────────────────────────────────────
   It's the enemy picker: each entry has to appear once and in its place, and each text,
   in both languages or in none, because the site doesn't mix languages. */
const journal = require('../js/journal.js');

test('the Journal orders the 180 entries, each one once', () => {
  assert.equal(journal.ORDER.length, foes.FOES.length);
  assert.deepEqual([...journal.ORDER].sort(), foes.FOES.map((f) => f.id).sort());
  assert.equal(journal.ORDER[0], 'crawlid', "the game's Journal starts with the Crawlid");
  // The ones without their own entry go after their original.
  const pos = (id) => journal.ORDER.indexOf(id);
  assert.equal(pos('failed-champion'), pos('false-knight') + 1);
  assert.equal(pos('enraged-guardian'), pos('crystal-guardian') + 1);
});

test('every Journal entry has its text in both languages and its medallion', () => {
  const fs = require('fs');
  const path = require('path');
  for (const [id, e] of Object.entries(journal.ENTRIES)) {
    assert.ok(foes.FOE_BY_ID[id], `${id}: isn't an entry`);
    if (e.of) {
      assert.ok(journal.ENTRIES[e.of] && !journal.ENTRIES[e.of].of, `${id}: shares with ${e.of}, which has no Journal entry`);
      continue;
    }
    assert.ok(Number.isInteger(e.n) && e.n > 0, `${id}: entry number ${e.n}`);
    assert.ok(e.desc, `${id}: no description`);
    for (const k of ['desc', 'notes', 'by']) {
      if (!e[k]) continue;
      assert.ok(e[k].es && e[k].en, `${id}.${k}: missing a language`);
      assert.ok(!SPANISH_CHARS.test(e[k].en), `${id}.${k}: Spanish accent in the English "${e[k].en}"`);
    }
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'journal', id + '.png')), `${id}: no medallion`);
  }
});

/* Your game's Journal adds five entries that aren't foe entries (the Shade, the Hunter's Mark,
   the Seal, the Idol and the Weathered Mask), with the game's text. And eight entries are named
   differently in the Journal than in the foe entry: also in both languages. */
test("the entries that aren't foe entries and the Journal names come in both languages", () => {
  const texts = [];
  for (const [id, x] of Object.entries(journal.EXTRAS)) {
    assert.ok(!foes.FOE_BY_ID[id], `${id}: is a foe entry, not an extra`);
    assert.ok(x.name && x.desc, `${id}: no name or no description`);
    texts.push([id + '.name', x.name], [id + '.notes', x.notes], [id + '.by', x.by]);
    if (x.desc.at) for (const d of ['at', 'asra', 'radiant']) texts.push([`${id}.desc.${d}`, x.desc[d]]);
    else texts.push([id + '.desc', x.desc]);
  }
  for (const r of journal.BOOK) texts.push([r.id + '.name', r.name], [r.id + '.inspect', r.inspect]);
  for (const [where, v] of texts) {
    if (!v) continue;
    assert.ok(v.es && v.en, `${where}: missing a language`);
    assert.ok(!SPANISH_CHARS.test(v.en), `${where}: Spanish accent in the English "${v.en}"`);
  }
});

/* The September 2026 review against the wiki's 180 pages: these common enemies summon
   too, and three boss notes were wrong. */
test('the common enemies that summon, and the summons by difficulty', () => {
  const de = (id) => (foes.FOE_BY_ID[id].summons || []).map((x) => x.id);
  assert.deepEqual(de('aspid-mother'), ['aspid-hatchling']);
  assert.deepEqual(de('carver-hatcher'), ['dirtcarver']);
  assert.deepEqual(de('elder-baldur'), ['baldur']);
  assert.deepEqual(de('husk-hive'), ['hiveling']);
  assert.deepEqual(de('wandering-husk'), ['corpse-creeper']);
  // Vengefly King calls normal Vengeflies, at 8.
  assert.ok(foes.FOE_BY_ID['vengefly-king'].summons.every((x) => x.hp === undefined));
  // On Ascended the Collector brings out another repertoire, all at 26.
  const asc = foes.FOE_BY_ID['the-collector'].summons.filter((x) => (x.diffs || []).includes('asra'));
  assert.deepEqual(asc.map((x) => x.id).sort(), ['armoured-squit', 'primal-aspid', 'sharp-baldur']);
  assert.ok(asc.every((x) => x.hp === 26));
  // The eleven "Ascended arena" rooms of the Pantheon of Hallownest summon as on Ascended.
  const h = require('../js/pantheons.js').PANTHEON_BY_ID.hallownest;
  assert.equal(h.rooms.filter((r) => r.ascended).length, 11);
});

/* The "Effects" plates: their English drags nothing from the Spanish. */
test('the charm effects, in clean English', () => {
  const found = pairs({ EFFECT_WHEN: data.EFFECT_WHEN, CHARM_EFFECTS: data.CHARM_EFFECTS });
  assert.ok(found.length > 90, `expected many pairs, there are ${found.length}`);
  for (const { path, value } of found) {
    assert.ok(!SPANISH_CHARS.test(value.en), `${path}: Spanish accent in the English "${value.en}"`);
    assert.ok(!SPANISH_WORDS.test(value.en), `${path}: Spanish word in the English "${value.en}"`);
  }
});
