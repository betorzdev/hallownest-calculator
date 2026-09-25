#!/usr/bin/env node
/* tools/fetch-collectibles.js — generates js/collectibles.js: every collectible of the kingdom
   (grubs, mask shards, vessel fragments, pale ore, charm notches, simple keys, rancid eggs, the
   four relics, whispering roots, Grimmkin flames, Cornifer's maps and the stag stations), each
   with its room and how a save says you have it. `npm run collectibles`. Node 18 (fetch).

   Source: the community's ItemChanger (homothetyhk/HollowKnight.ItemChanger, LGPL-2.1, pinned to
   a commit), whose locations.json gives each place its room and the name of the object in it:
   the game marks a thing picked up in sceneData.persistentBoolItems with that same pair, so
   the pair is how it's detected. Only those facts are taken. What isn't picked up from the
   floor has its own playerData, set here by hand from the wiki: the Seer's rewards
   (dreamReward<n>), the Grubfather's (his "Reward <n>" in his room, or grubRewards), the
   Colosseum, the Grimm Troupe's notch, the Pale Lurker's key, Tuk's egg, Sly's shop and
   Salubra's notches (with their prices), the maps and the stag stations (ItemChanger's
   items.json gives each one's field). The area and the place of each room are js/rooms.js's. */
'use strict';
const fs = require('fs');
const path = require('path');

const IC = 'https://raw.githubusercontent.com/homothetyhk/HollowKnight.ItemChanger/e57bc4e37bf7297f39b51b17af93f80c1ef8ce9e/ItemChanger/Resources/';
const OUT = path.join(__dirname, '..', 'js', 'collectibles.js');

// ItemChanger's prefix → the site's kind, in the order they're shown.
const KINDS = [
  ['Grub', 'grub'], ['Mask_Shard', 'mask-shard'], ['Vessel_Fragment', 'vessel-fragment'], ['Pale_Ore', 'pale-ore'],
  ['Charm_Notch', 'charm-notch'], ['Simple_Key', 'simple-key'], ['Rancid_Egg', 'rancid-egg'],
  ["Wanderer's_Journal", 'wanderers-journal'], ['Hallownest_Seal', 'hallownest-seal'], ["King's_Idol", 'kings-idol'],
  ['Arcane_Egg', 'arcane-egg'], ['Whispering_Root', 'whispering-root'], ['Grimmkin_Flame', 'grimmkin-flame'],
  ['Map', 'map'], ['Stag', 'stag'],
];
// The Seer's rewards: playerData dreamReward<n> and the essence each asks (wiki, "Seer").
const SEER = { 'hallownest-seal': [1, 100], 'pale-ore': [2, 300], 'vessel-fragment': [4, 700], 'arcane-egg': [6, 1200], 'mask-shard': [7, 1500] };
// The Grubfather's: the grubs each asks (wiki, "Grub"); his room keeps "Reward <n>" once given.
const GRUBS = { 'mask-shard': 5, 'rancid-egg': 16, 'hallownest-seal': 23, 'pale-ore': 31, 'kings-idol': 38 };
// Special places with a playerData bool of their own.
const PD = {
  'Charm_Notch-Colosseum': 'colosseumBronzeCompleted', 'Pale_Ore-Colosseum': 'colosseumSilverCompleted',
  'Charm_Notch-Grimm': 'gotGrimmNotch', 'Charm_Notch-Shrumal_Ogres': 'notchShroomOgres', 'Charm_Notch-Fog_Canyon': 'notchFogCanyon',
  'Simple_Key-Lurker': 'gotLurkerKey', "Rancid_Egg-Tuk_Defender's_Crest": 'tukDungEgg', 'Grimmkin_Flame-Brumm': 'gotBrummsFlame',
  'Dirtmouth_Stag': 'openedTown',
  // Its room doesn't keep it: the game has a bool of its own (checked on 51 real saves).
  'Vessel_Fragment-Stag_Nest': 'vesselFragStagNest',
};
// Bought, not found: the shops' stock (wiki, "Sly" and "Charm Lover Salubra").
const SHOPS = [
  ['mask-shard', 'sly-1', 'slyShellFrag1', 150], ['mask-shard', 'sly-2', 'slyShellFrag2', 500],
  ['mask-shard', 'sly-3', 'slyShellFrag3', 800], ['mask-shard', 'sly-4', 'slyShellFrag4', 1500],
  ['vessel-fragment', 'sly-1', 'slyVesselFrag1', 550], ['vessel-fragment', 'sly-2', 'slyVesselFrag2', 900],
  ['simple-key', 'sly', 'slySimpleKey', 950], ['rancid-egg', 'sly', 'slyRancidEgg', 60],
  ['charm-notch', 'salubra-1', 'salubraNotch1', 120], ['charm-notch', 'salubra-2', 'salubraNotch2', 500],
  ['charm-notch', 'salubra-3', 'salubraNotch3', 900], ['charm-notch', 'salubra-4', 'salubraNotch4', 1400],
];
const SHOP_ROOM = { sly: 'Room_shop', salubra: 'Room_Charm_Shop' };

const slug = (s) => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const round = (n) => Math.round(n * 10) / 10;

function kindOf(name) {
  const k = KINDS.find(([p]) => name.startsWith(p + '-'));
  if (k) return k[1];
  // A map or a station is its own name ("Crossroads_Map", "Dirtmouth_Stag"), with no kind before it.
  // (The Collector's Map isn't one: it marks the grubs on the others.)
  if (/^[A-Za-z_']+_Map(-(Upper|Right))?$/.test(name) && !name.startsWith('Collector')) return 'map';
  if (/^[A-Za-z_']+_Stag$/.test(name)) return 'stag';
  return '';
}
// Where the thing sits, if the location says it (the map will use it).
function coords(loc) {
  const c = loc.x !== undefined ? loc : loc.trueLocation && loc.trueLocation.x !== undefined ? loc.trueLocation : null;
  return c ? [round(c.x), round(c.y)] : null;
}

(async () => {
  const get = async (f) => {
    const res = await fetch(IC + f, { headers: { 'User-Agent': 'hallownest-calculator (fetch-collectibles.js)' } });
    if (!res.ok) throw new Error(f + ': HTTP ' + res.status);
    return res.json();
  };
  const [locs, items] = [await get('locations.json'), await get('items.json')];

  const out = [];
  const seenMap = new Set();
  for (const [name, loc] of Object.entries(locs)) {
    const kind = kindOf(name);
    if (!kind) continue;
    const scene = loc.sceneName || (loc.falseLocation && loc.falseLocation.sceneName);
    const rec = { kind, scene };
    const place = name.includes('-') ? name.slice(name.indexOf('-') + 1) : name;
    let how;
    if (name.endsWith('-Seer')) { const [n, essence] = SEER[kind]; how = ['seer', n]; rec.src = ['seer', essence]; }
    else if (/-(5_)?Grubs$/.test(name)) { how = ['grubs', GRUBS[kind]]; rec.src = ['grubs', GRUBS[kind]]; }
    else if (/^Grub-Collector_/.test(name)) how = ['pd', 'collectorDefeated'];
    else if (PD[name]) how = ['pd', PD[name]];
    else if (kind === 'whispering-root') how = ['root'];
    else if (kind === 'grimmkin-flame') how = ['flame'];
    else if (kind === 'map' || kind === 'stag') {
      const item = items[name.replace(/-(Upper|Right)$/, '')];
      if (!item || !item.fieldName) throw new Error('no field for ' + name);
      how = ['pd', item.fieldName];
    } else if (loc.$type.includes('DualLocation') && loc.Test && loc.Test.id) how = ['o', loc.Test.id];
    else if (loc.objectName) how = ['o', loc.objectName.split('\\').pop()];
    else throw new Error('no rule for ' + name + ' (' + loc.$type + ')');
    if (kind === 'map') {                       // Deepnest's map is sold in two places: one map
      const key = how[1];
      if (seenMap.has(key)) continue;
      seenMap.add(key);
    }
    if (name === 'Charm_Notch-Colosseum' || name === 'Pale_Ore-Colosseum') rec.src = ['colosseum', name.startsWith('Charm') ? 'warrior' : 'conqueror'];
    rec.id = slug(kind === 'map' || kind === 'stag' ? name.replace(/-(Upper|Right)$/, '') : kind + '-' + place);
    rec.how = how;
    const xy = coords(loc);
    if (xy) rec.xy = xy;
    out.push(rec);
  }
  for (const [kind, id, field, geo] of SHOPS) {
    const shop = id.split('-')[0];
    out.push({ kind, scene: SHOP_ROOM[shop], id: slug(kind + '-' + id), how: ['pd', field], src: [shop, geo] });
  }
  const order = KINDS.map(([, k]) => k);
  out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const ids = new Set();
  for (const r of out) { if (ids.has(r.id)) throw new Error('duplicate ' + r.id); ids.add(r.id); }

  const counts = order.map((k) => `${k} ${out.filter((r) => r.kind === k).length}`).join(', ');
  const line = (r) => `    { id: ${q(r.id)}, kind: ${q(r.kind)}, scene: ${q(r.scene)}, how: [${r.how.map((x) => (typeof x === 'number' ? x : q(x))).join(', ')}]`
    + (r.src ? `, src: [${r.src.map((x) => (typeof x === 'number' ? x : q(x))).join(', ')}]` : '')
    + (r.xy ? `, xy: [${r.xy.join(', ')}]` : '') + ' },';
  fs.writeFileSync(OUT, [
    '/* js/collectibles.js — GENERATED by tools/fetch-collectibles.js (`npm run collectibles`): don\'t edit by hand.',
    '   Every collectible of the kingdom: its kind, its room (scene; its area and place are',
    '   js/rooms.js\'s) and how a save says you have it (how):',
    "     ['o', object]   the room's object, picked up (sceneData.persistentBoolItems, activated)",
    "     ['pd', field]   a playerData bool      ['seer', n]   the Seer's dreamReward<n>",
    "     ['grubs', n]    the Grubfather's reward for n grubs     ['root']   the room's Whispering Root completed",
    "     ['flame']       the room's Grimmkin flame taken",
    "   src says where it comes from when it isn't found: ['sly'|'salubra', geo], ['seer', essence],",
    "   ['grubs', n], ['colosseum', trial]. xy is where it sits in its room, when known (the map's).",
    `   ${counts}. */`,
    '(() => {',
    "  'use strict';",
    '  const HK = globalThis.HK || (globalThis.HK = {});',
    `  const KINDS = [${order.map(q).join(', ')}];`,
    '  const ITEMS = [',
    ...out.map(line),
    '  ];',
    '  HK.collectibles = { KINDS, ITEMS };',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = HK.collectibles;",
    '})();',
    '',
  ].join('\n'));
  console.log(`js/collectibles.js: ${out.length} — ${counts}`);
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
