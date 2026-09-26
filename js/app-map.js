/* js/app-map.js — the Progress screen's Map: the game's own map (js/map.js, drawn from its files by
   tools/extract-map.py) with your collectibles on it. Shares HK.app with js/app.js (see there).

   The rooms, as your game has them: whole where you've been (scenesVisited and scenesMapped), as
   Cornifer's rough drawing where you've only bought the area's map, and barely there where you
   don't know them yet. Without a save (nothing mapped), the whole map, whole: it's a reference.
   (Always the whole map, if you choose so: prefs.pgMapWhole, which no save touches.)
   On it, in layers the filter under it shows or hides (prefs.pgMapOff): each collectible where
   it is (the game's own pin for grubs, roots, stations and flames; its room's centre for the
   rest), the 112%'s things where they're found, the places (the map's titles, benches, shops
   and characters, trams, springs, cocoons) and yours (your bench, shade, Dreamgate and markers).
   Pins that would overlap gather in a ring around their middle. A tap on one opens its card, to
   mark it as the tablet does.
   It's an SVG in the map's own units (y flipped: the game's grows upwards). Dragging moves it,
   the wheel or a pinch zooms, and three buttons zoom in, out and back to the whole map; the view
   isn't saved. The pins keep about the same size on screen (--k), and close up carry their names. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, P = HK.progress, R = HK.rooms, CO = HK.collectibles, M = HK.map;
  const App = HK.app;
  const { t, pick, el, esc, NT, actions, prefs, savePrefs, render, pctSpace } = App;

  /* ── Where things go ── */
  const pinsOf = (kind) => M.PINS.filter((p) => p[0] === kind);
  const GAME_PIN = { 'grub': 'grub', 'whispering-root': 'root', 'stag': 'stag', 'grimmkin-flame': 'flame' };
  // Rooms the doors don't reach (a storeroom, a basement, the White Palace): placed on their neighbour.
  const ALIAS = { Room_Sly_Storeroom: 'Room_shop', Room_Bretta_Basement: 'Room_Bretta', White_Palace_09: 'Abyss_05' };
  const roomPoint = (scene) => {
    const sc = ALIAS[scene] || scene, r = M.ROOMS[sc];
    return r ? [r[1], r[2]] : M.ANCHORS[sc] || M.HOSTS[sc] || null;
  };
  /* Where a place of ItemChanger's is (js/map.js's SPOTS, from the game's scenes): the characters
     with a pin of their own on the game's map stand there, and what they sell with them. The
     storeroom behind Sly's shop is Sly's. → { p: [x, y], scene } or null */
  const NPC_OF = { Iselda: 'mapper', Leg_Eater: 'leg_eater', Seer: 'dream_moth', Lemm: 'relic_dealer' };
  const SPOT_ALIAS = { "Nailmaster's_Glory": 'Sly', Grubsong: 'Grubfather', Dream_Wielder: 'Seer', Awoken_Dream_Nail: 'Seer' };
  const npcPin = (who) => { const p = M.PINS.find((x) => x[0] === 'npc' && x[1] === who); return p ? [p[2], p[3]] : null; };
  // The Grubfather's and the Seer's rewards are theirs: on their pin, one stack each.
  const aliasOf = (ic) => SPOT_ALIAS[ic] || (/-(5_)?Grubs$/.test(ic) ? 'Grubfather' : /-Seer$/.test(ic) ? 'Seer' : ic);
  function spotOf(ic) {
    const name = aliasOf(ic), sp = M.SPOTS[name];
    if (!sp) return null;
    const pin = name === 'Grubfather' ? pinsOf('grubfather')[0] : null;
    return { p: (pin && [pin[2], pin[3]]) || (NPC_OF[name] && npcPin(NPC_OF[name])) || [sp[0], sp[1]], scene: sp[2] };
  }
  // A collectible: its own spot; the Grimmkin flames, which ItemChanger doesn't place, on the game's pins.
  const COL_POS = (() => {
    const out = {}, used = {};
    for (const it of CO.ITEMS) {
      const sp = it.ic && spotOf(it.ic);
      let pt = sp && sp.scene === it.scene ? sp.p : null;
      const kind = GAME_PIN[it.kind];
      if (!pt && kind) {
        // The game's pins in that room, in order: two in one room are its two pins.
        const list = pinsOf(kind).filter((p) => p[1] === it.scene);
        const k = kind + '|' + it.scene;
        const i = used[k] || 0;
        used[k] = i + 1;
        if (list[i]) pt = [list[i][2], list[i][3]];
      }
      out[it.id] = pt || (sp && sp.p) || roomPoint(it.scene);
    }
    return out;
  })();

  /* Where the 112%'s things are: ItemChanger's place for each (its SPOTS), the shop for what's
     bought; and for the bosses, the room of their fight. Each spell has two pins, one per level. */
  const CHARM_AT = {
    compass: 'Iselda', swarm: 'Sly', stalwart: 'Sly', catcher: 'Soul_Catcher', shaman: 'Salubra', eater: 'Soul_Eater',
    dashmaster: 'Dashmaster', thorns: 'Thorns_of_Agony', fury: 'Fury_of_the_Fallen', heart: 'Leg_Eater', greed: 'Leg_Eater',
    strength: 'Leg_Eater', twister: 'Spell_Twister', steady: 'Salubra', heavy: 'Sly_(Key)', quickslash: 'Quick_Slash',
    longnail: 'Salubra', pride: 'Mark_of_Pride', baldur: 'Baldur_Shell', flukenest: 'Flukenest', crest: "Defender's_Crest",
    womb: 'Glowing_Womb', quickfocus: 'Salubra', deepfocus: 'Deep_Focus', lbheart: 'Salubra', lbcore: 'Lifeblood_Core',
    joni: "Joni's_Blessing", grubsong: 'Grubsong', elegy: 'Grubfather', hiveblood: 'Hiveblood', spore: 'Spore_Shroom',
    sharpshadow: 'Sharp_Shadow', unn: 'Shape_of_Unn', glory: "Nailmaster's_Glory", wielder: 'Dream_Wielder',
    king: 'Queen_Fragment', dreamshield: 'Dreamshield', sprintmaster: 'Sly', weaversong: 'Weaversong', grimmchild: 'Grimmchild',
  };
  const EQUIP_AT = {
    'mothwing-cloak': 'Mothwing_Cloak', 'mantis-claw': 'Mantis_Claw', 'crystal-heart': 'Crystal_Heart',
    'monarch-wings': 'Monarch_Wings', 'isma-tear': "Isma's_Tear", 'shade-cloak': 'Shade_Cloak', 'kings-brand': "King's_Brand",
    'vs-1': 'Vengeful_Spirit', 'vs-2': 'Shade_Soul', 'dd-1': 'Desolate_Dive', 'dd-2': 'Descending_Dark',
    'hw-1': 'Howling_Wraiths', 'hw-2': 'Abyss_Shriek', cyclone: 'Cyclone_Slash', great: 'Great_Slash', dash: 'Dash_Slash',
    'dream-nail': 'RestingGrounds_04', 'dream-awakened': 'Awoken_Dream_Nail', 'seer-ascended': 'Seer',
  };
  // An ItemChanger place, or a room's name when there's none (the Dream Nail's is a dream).
  const placeAt = (key) => spotOf(key) || (roomPoint(key) && { p: roomPoint(key), scene: key });
  const BOSS_AT = {
    'false-knight': 'Crossroads_10', 'gruz-mother': 'Crossroads_04', 'brooding-mawlek': 'Crossroads_09',
    'hornet-protector': 'Fungus1_04', 'mantis-lords': 'Fungus2_15', 'soul-master': 'Ruins1_24', 'dung-defender': 'Waterways_05',
    'broken-vessel': 'Abyss_19', 'watcher-knights': 'Ruins2_03', 'the-collector': 'Ruins2_11', 'uumuu': 'Fungus3_archive_02',
    'traitor-lord': 'Fungus3_23', nosk: 'Deepnest_32', 'hornet-sentinel': 'Deepnest_East_Hornet', 'hive-knight': 'Hive_05',
    'trial-warrior': 'Room_Colosseum_Bronze', 'trial-conqueror': 'Room_Colosseum_Silver', 'trial-fool': 'Room_Colosseum_Gold',
    'troupe-master-grimm': 'Grimm_Main_Tent', nkg: 'Grimm_Main_Tent',
  };
  // The warrior dreams, each on the game's pin for its grave.
  const GRAVE_AT = { gorb: 'Cliffs_02', markoth: 'Deepnest_East_10', 'no-eyes': 'Fungus1_34', 'elder-hu': 'Fungus2_32',
    marmu: 'Fungus3_40', galien: 'Deepnest_40', xero: 'RestingGrounds_02' };
  const gamePin = (kind, scene) => { const p = M.PINS.find((x) => x[0] === kind && x[1] === scene); return p ? [p[2], p[3]] : null; };
  // Who you buy from or deal with, where they are (their room, or the game's own pin).
  const PEOPLE = [
    ['sly', 'Room_shop', { pin: 'vendor' }], ['iselda', 'Room_mapper', { pin: 'vendor' }],
    ['salubra', 'Room_Charm_Shop', { pin: 'vendor' }], ['legeater', 'Fungus2_26', { pin: 'vendor' }],
    ['lemm', 'Ruins1_05b', { pin: 'vendor' }], ['jiji', 'Room_Ouiji', { pin: 'vendor' }],
    ['nailsmith', 'Room_nailsmith', { src: D.art('nails', 1) }], ['seer', 'RestingGrounds_07', { src: D.art('items', 'essence') }],
    ['grubfather', 'Crossroads_38', { pin: 'grubfather' }, 'grubfather'], ['colosseum', 'Deepnest_East_09_b', { pin: 'colosseum' }, 'colosseum'],
    ['blackegg', 'Crossroads_02', { pin: 'blackegg' }, 'blackegg'],
  ];
  // Where each stands: their ItemChanger place (a shop's, on its door or on their own pin).
  const PEOPLE_AT = { sly: 'Sly', iselda: 'Iselda', salubra: 'Salubra', legeater: 'Leg_Eater', lemm: 'Lemm', jiji: 'Egg_Shop', seer: 'Seer' };
  // …or the game's own pin for them, when it has one.
  const PEOPLE_NPC = { iselda: 'mapper', legeater: 'leg_eater', lemm: 'relic_dealer', jiji: 'jiji', nailsmith: 'nailsmith', seer: 'dream_moth' };
  // The Dreamers' pins are named by who they are; their rooms, for where they sleep.
  const DREAMER_ROOM = { lurien: 'Ruins2_Watcher_Room', monomon: 'Fungus3_archive_02', herrah: 'Deepnest_Spider_Town' };

  /* ── The layers, in the filter's four groups ── */
  const PLACE_PINS = { benches: 'bench', trams: 'tram', springs: 'spa', cocoons: 'cocoon' };
  const GROUPS = [
    { id: 'collect', layers: CO.KINDS },
    { id: 'c112', layers: ['charms', 'equip', 'bosses', 'graves', 'dreamers'] },
    { id: 'places', layers: ['benches', 'people', 'trams', 'springs', 'cocoons'] },
    { id: 'mine', layers: ['my-bench', 'shade', 'gate', 'markers'] },
  ];
  // The areas' names are a layer too, switched by their own box beside the filter's two choices.
  const LAYERS = [...GROUPS.flatMap((g) => g.layers), 'names'];
  // A layer's picture in the filter: a collectible's, or one of the game's pins.
  const LAYER_ART = {
    charms: { src: 'assets/charms/compass.png' }, equip: { src: D.art('items', 'mantis-claw') }, bosses: { src: D.art('journal', 'false-knight') },
    graves: { pin: 'grave' }, dreamers: { pin: 'dreamer-monomon' }, benches: { pin: 'bench' }, people: { pin: 'vendor' },
    trams: { pin: 'tram' }, springs: { pin: 'spa' }, cocoons: { pin: 'cocoon' }, 'my-bench': { pin: 'bench' },
    shade: { pin: 'shade' }, gate: { pin: 'dreamgate' }, markers: { pin: 'marker-y' },
  };
  const layerName = (id) => (D.COLLECTIBLE_KINDS[id] ? pick(D.COLLECTIBLE_KINDS[id]) : t('pgmL_' + id));
  const shownLayers = () => {
    // Before the layers, the map kept the kinds shown (pgMapKinds): the rest were hidden.
    if (!Array.isArray(prefs.pgMapOff)) {
      prefs.pgMapOff = Array.isArray(prefs.pgMapKinds) ? CO.KINDS.filter((k) => !prefs.pgMapKinds.includes(k)) : [];
      delete prefs.pgMapKinds;
    }
    return new Set(LAYERS.filter((l) => !prefs.pgMapOff.includes(l)));
  };

  /* ── Everything the map can show, as things: where, its picture, its name, whether you have
     it (on: true or false; null for a place) and what its card's button does ── */
  const where = (scene) => {
    const a = R.areaOf(scene), pl = R.placeOf(scene);
    return [a && pick(R.AREAS[a]), pl && pick(R.PLACES[pl])].filter(Boolean).join(' · ');
  };
  // What it asks for, when it isn't found: a shop's price, the Seer's essence, the Grubfather's grubs.
  const priceOf = (it) => {
    if (!it.src) return '';
    const [who, n] = it.src, num = App.NF[0].format(n);
    return who === 'sly' || who === 'salubra' ? `${num} geo` : who === 'seer' ? t('pgmEssence', { n: num }) : who === 'grubs' ? t('pgmGrubs', { n: num }) : '';
  };
  function allThings() {
    const out = [];
    for (const it of CO.ITEMS) {
      if (!COL_POS[it.id]) continue;
      out.push({ id: it.id, layer: it.kind, p: COL_POS[it.id], art: { src: D.art(...D.COLLECTIBLE_KINDS[it.kind].art) },
        name: pick(D.COLLECTIBLE_KINDS[it.kind]), where: where(it.scene), on: P.hasFound(App.progress, it.id), act: { find: it.id },
        note: priceOf(it) });
    }
    // The 112%'s, read as the tablet reads them (js/app-progress.js).
    const cats = Object.fromEntries(App.pgCount().categories.map((c) => [c.id, c]));
    const item = (cat, id) => cats[cat].items.find((x) => x.id === id);
    const mark = (cat, id) => (App.pgWhereOf(cat, id) === 'game' ? { game: true } : { cat, id });
    const add112 = (layer, cat, id, key, p) => {
      const it = item(cat, id), m = App.pgMeta(cat, id);
      const at = p ? { p, scene: key } : placeAt(key);
      if (!it || !at) return;
      const pt = at.p, scene = at.scene;
      out.push({ id: 'c:' + id, layer, p: pt, art: m.art ? { src: m.art } : { pin: 'colosseum' }, name: m.name, where: where(scene),
        on: it.got >= it.max, act: mark(cat, id) });
    };
    for (const it of cats.charms.items) add112('charms', 'charms', it.id, CHARM_AT[it.id]);
    for (const id of ['dreamshield', 'sprintmaster', 'weaversong', 'grimmchild']) add112('charms', 'grimm', id, CHARM_AT[id]);
    for (const it of cats.equipment.items) add112('equip', 'equipment', it.id, EQUIP_AT[it.id]);
    for (const it of cats.arts.items) add112('equip', 'arts', it.id, EQUIP_AT[it.id]);
    for (const it of cats.dreamNail.items) add112('equip', 'dreamNail', it.id, EQUIP_AT[it.id]);
    // A spell, once per level: its name and picture are that level's.
    for (const it of cats.spells.items) {
      for (const lvl of [1, 2]) {
        const at = placeAt(EQUIP_AT[it.id + '-' + lvl]);
        if (!at) continue;
        const pt = at.p, scene = at.scene;
        out.push({ id: 'c:' + it.id + lvl, layer: 'equip', p: pt, art: { src: D.art('spells', lvl === 2 ? it.id + '2' : it.id) },
          name: pick(D.SPELLS[it.id].levels[lvl]), where: where(scene), on: it.got >= lvl, act: { game: true } });
      }
    }
    for (const it of [...cats.bosses.items, ...cats.hive.items]) add112('bosses', it.id === 'hive-knight' ? 'hive' : 'bosses', it.id, BOSS_AT[it.id]);
    for (const it of cats.colosseum.items) add112('bosses', 'colosseum', it.id, BOSS_AT[it.id]);
    for (const id of ['troupe-master-grimm', 'nkg']) add112('bosses', 'grimm', id, BOSS_AT[id]);
    for (const it of cats.dreams.items) add112('graves', 'dreams', it.id, GRAVE_AT[it.id], gamePin('grave', GRAVE_AT[it.id]));
    for (const it of cats.dreamers.items) {
      const pt = gamePin('dreamer', it.id), m = App.pgMeta('dreamers', it.id);
      if (pt) out.push({ id: 'c:' + it.id, layer: 'dreamers', p: pt, art: { pin: 'dreamer-' + it.id }, name: m.name,
        where: where(DREAMER_ROOM[it.id]), on: it.got >= it.max, act: { cat: 'dreamers', id: it.id } });
    }
    // The places: the game's own pins, and who's where.
    for (const [layer, kind] of Object.entries(PLACE_PINS)) {
      pinsOf(kind).forEach(([, scene, x, y], i) => out.push({ id: `${layer}:${i}`, layer, p: [x, y], art: { pin: kind },
        name: t('pgmP_' + kind), where: where(scene), on: null, scene }));
    }
    for (const [who, scene, art, pin] of PEOPLE) {
      const pt = npcPin(PEOPLE_NPC[who]) || (pin && pinsOf(pin)[0] && pinsOf(pin)[0].slice(2))
        || (PEOPLE_AT[who] && placeAt(PEOPLE_AT[who]).p) || roomPoint(scene);
      if (pt) out.push({ id: 'people:' + who, layer: 'people', p: pt, art, name: t('pgmW_' + who), where: where(scene), on: null });
    }
    return out;
  }

  /* Each pin sits on its own spot, always, whatever the zoom. Only things on the very same spot
     (within 0.15 map units: a shop's stock, a house's door, a room's centre) are laid out around
     it in a small grid, in the pins' own units (css: --ox, --oy), so it keeps its shape at any
     zoom and nothing jumps: all of them in view, none hidden behind another. */
  const SAME = 0.15;
  function arrange(list) {
    const groups = [];
    for (const th of list) {
      const g = groups.find((x) => Math.hypot(x.p[0] - th.p[0], x.p[1] - th.p[1]) < SAME);
      if (g) g.list.push(th); else groups.push({ p: th.p, list: [th] });
    }
    for (const g of groups) {
      const n = g.list.length, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
      g.list.forEach((th, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        // The last row, if short, centred under the others.
        const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
        th.at = g.p;
        th.off = n < 2 ? [0, 0] : [(c - (inRow - 1) / 2) * 1.08, (r - (rows - 1) / 2) * 1.08];
      });
    }
  }
  let pinK = 0.5, near = false;   // the pins' size in map units, and whether they're close up (applyView)
  let shown = new Map();          // id → the thing, as last painted
  // Where a pin really is on the map, its place in its spot's grid included.
  const pinAt = (th) => (th.off ? [th.at[0] + th.off[0] * pinK, th.at[1] - th.off[1] * pinK] : th.p);

  /* ── The rooms, as your game has them ── */
  // The area's map from Cornifer, by the name js/map.js gives the area (Dirtmouth's comes with the game).
  const AREA_MAP = { 'Crossroads': 'crossroads-map', 'Green_Path': 'greenpath-map', 'Fog_Canyon': 'fog-canyon-map',
    'Fungal Wastes': 'fungal-wastes-map', 'Deepnest': 'deepnest-map', 'Ancient Basin': 'ancient-basin-map',
    'Kingdoms_Edge': 'kingdoms-edge-map', 'City of Tears': 'city-of-tears-map', 'Waterways': 'royal-waterways-map',
    'Cliffs': 'howling-cliffs-map', 'Crystal Peak': 'crystal-peak-map', 'Queens_Gardens': 'queens-gardens-map',
    'Resting_Grounds': 'resting-grounds-map', 'Town_Tutorial': '' };
  // A room's own scene: its drawing's alternatives ("_b", "_part_b"…) belong to it.
  const sceneOf = (name) => name.replace(/_(b|c|d|part_b|left|right)$/, '');
  function roomState(name, area, mapped) {
    if (!mapped.size || prefs.pgMapWhole) return 'full';
    if (mapped.has(name) || mapped.has(sceneOf(name))) return 'full';
    const m = AREA_MAP[M.AREAS[area]];
    return m === '' || (m && P.hasFound(App.progress, m)) ? 'rough' : 'ghost';
  }
  function roomsSvg() {
    const mapped = new Set(App.progress.mapped);
    const [aw, ah] = M.ATLAS.full, [rw, rh] = M.ATLAS.rough;
    // A room's second drawing, once the world shows it (a lift, a wall broken…); with no save,
    // the world finished: all of them.
    const alts = mapped.size ? new Set(App.progress.alts) : new Set(Object.keys(M.ROOMS));
    return Object.entries(M.ROOMS).map(([name, r]) => {
      const [area, x, y, w, h, rW, rH, full, rough, alt] = r;
      const st = roomState(name, area, mapped);
      const useFull = st !== 'rough';
      const [bw, bh] = useFull ? [w, h] : [rW, rH];
      const [sx, sy, sw, sh] = useFull ? (alt && alts.has(name) ? alt : full) : rough;
      const [iw, ih] = useFull ? [aw, ah] : [rw, rh];
      return `<svg class="pgm-room is-${st}" x="${(x - bw / 2).toFixed(3)}" y="${(-y - bh / 2).toFixed(3)}" width="${bw}" height="${bh}"
        viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="none"><image href="assets/map/rooms-${useFull ? 'full' : 'rough'}.png" width="${iw}" height="${ih}"/></svg>`;
    }).join('');
  }

  /* ── The map's own titles: each area's over the middle of its rooms, each place's on its room ── */
  const AREA_AT = M.AREAS.map((_, i) => {
    const rs = Object.values(M.ROOMS).filter((r) => r[0] === i);
    const x0 = Math.min(...rs.map((r) => r[1] - r[3] / 2)), x1 = Math.max(...rs.map((r) => r[1] + r[3] / 2));
    const y0 = Math.min(...rs.map((r) => r[2] - r[4] / 2)), y1 = Math.max(...rs.map((r) => r[2] + r[4] / 2));
    return [(x0 + x1) / 2, (y0 + y1) / 2];
  });
  const lines = (s, x, lh) => s.split('\n').map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('');
  function namesSvg() {
    const areas = M.AREA_IDS.map((id, i) => (id && R.AREAS[id] ? `<text class="pgm-name is-area" x="${AREA_AT[i][0].toFixed(2)}" y="${(-AREA_AT[i][1]).toFixed(2)}"${NT}>${esc(pick(R.AREAS[id]))}</text>` : ''));
    const places = M.PLACE_LABELS.map(([scene, name]) => {
      const p = roomPoint(scene);
      return p ? `<text class="pgm-name is-place" x="${p[0].toFixed(2)}" y="${(-p[1]).toFixed(2)}"${NT}>${lines(pick(name), p[0].toFixed(2), '1.1em')}</text>` : '';
    });
    return areas.join('') + places.join('');
  }

  /* ── The pins ── */
  let selected = '';
  // A picture: a file, or one of the game's pins from its atlas (assets/map/pins.png).
  function atlasSvg(key, size, cls = '') {
    const [x, y, w, h] = M.PIN_ART[key], [aw, ah] = M.ATLAS.pins;
    const at = size === null ? '' : ` x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"`;
    return `<svg class="pgm-atlas${cls}"${at} viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><image href="assets/map/pins.png" width="${aw}" height="${ah}"/></svg>`;
  }
  const artSvg = (a, size = 0.92) => (a.pin ? atlasSvg(a.pin, size) : `<image href="${a.src}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>`);
  const artHtml = (a) => (!a ? '<i class="pg-glyph" aria-hidden="true"></i>' : a.pin ? atlasSvg(a.pin, null, ' pgm-ico') : `<img src="${a.src}" alt="">`);

  // Yours: your bench, your shade, your Dreamgate and the markers you've placed, where the save says.
  function mineThings() {
    const pr = App.progress, out = [];
    if (pr.bench) {
      // The bench's pin can sit on its room's other drawing (Deepnest_30_b, Ruins1_18_b…).
      const b = pinsOf('bench').find((x) => sceneOf(x[1]) === pr.bench);
      const pt = b ? [b[2], b[3]] : roomPoint(pr.bench);
      if (pt) out.push({ id: 'mine:bench', layer: 'my-bench', p: pt, art: { pin: 'bench' }, name: t('pgmL_my-bench'), where: where(pr.bench), on: null });
    }
    if (pr.shade && pr.shade.x !== undefined) out.push({ id: 'mine:shade', layer: 'shade', p: [pr.shade.x, pr.shade.y], art: { pin: 'shade' },
      name: t('shadeTag'), where: [where(pr.shade.scene), `${App.NF[0].format(pr.shade.geo)} geo`].filter(Boolean).join(' · '), on: null });
    if (pr.gate && pr.gate.x !== undefined) out.push({ id: 'mine:gate', layer: 'gate', p: [pr.gate.x, pr.gate.y], art: { pin: 'dreamgate' },
      name: pick(D.EQUIPMENT.find((x) => x.id === 'dreamgate')), where: where(pr.gate.scene), on: null });
    (pr.markers || []).forEach((m, i) => out.push({ id: 'mine:m' + i, layer: 'markers', p: [m.x, m.y], art: { pin: 'marker-' + m.c },
      name: t('pgmM_' + m.c), where: '', on: null }));
    return out;
  }

  function pinsSvg(layers) {
    const showFound = !!prefs.pgMapFound;
    const list = allThings().filter((th) => layers.has(th.layer) && (th.on !== true || showFound || th.id === selected));
    arrange(list);
    const mine = mineThings().filter((th) => layers.has(th.layer));
    shown = new Map([...list, ...mine].map((th) => [th.id, th]));
    const pin = (th) => {
      const label = th.name + (th.where ? ' · ' + th.where : '');
      const at = th.at || th.p, o = th.off || [0, 0];
      return `<g class="pgm-pin${th.on ? ' is-on' : ''}${th.id === selected ? ' is-sel' : ''}" style="--px:${at[0].toFixed(3)}px;--py:${(-at[1]).toFixed(3)}px;--ox:${o[0].toFixed(2)}px;--oy:${o[1].toFixed(2)}px"
        data-act="pgmPick" data-id="${esc(th.id)}" role="button" tabindex="0" aria-label="${esc(label)}">
        <title>${esc(label)}</title>
        <circle r="0.5"/>${artSvg(th.art)}
        <text class="pgm-lbl" y="1.02">${esc(th.name)}</text></g>`;
    };
    // Yours go on top, where they are (not spread), a little bigger, with no disc.
    const mark = (th) => `<g class="pgm-pin pgm-mark is-${th.layer}${th.id === selected ? ' is-sel' : ''}" style="--px:${th.p[0].toFixed(3)}px;--py:${(-th.p[1]).toFixed(3)}px"
        data-act="pgmPick" data-id="${esc(th.id)}" role="button" tabindex="0" aria-label="${esc(th.name + (th.where ? ' · ' + th.where : ''))}">
        <title>${esc(th.name + (th.where ? ' · ' + th.where : ''))}</title>${th.layer === 'my-bench' ? '<circle r="0.62"/>' : ''}${artSvg(th.art, 1.2)}</g>`;
    return list.map(pin).join('') + mine.map(mark).join('');
  }

  /* ── The view: the SVG's viewBox, kept between repaints ── */
  const [bx0, by0, bx1, by1] = M.BOUNDS;
  const PAD = 0.8;
  const FIT = { x: bx0 - PAD, y: -by1 - PAD, w: bx1 - bx0 + PAD * 2, h: by1 - by0 + PAD * 2 };
  let vb = null;   // set on the first measure (fitView)
  /* The whole map, fitted to the box: a wide box shows it all; a tall one (a phone) fills its
     height and centres it, to be slid sideways. The view keeps the box's proportions. */
  function fitView(bw, bh) {
    const ratio = bw / bh;
    if (ratio >= FIT.w / FIT.h) { const w = FIT.h * ratio; return { x: FIT.x - (w - FIT.w) / 2, y: FIT.y, w, h: FIT.h }; }
    const h = FIT.h * 0.92, w = h * ratio;
    return { x: FIT.x + (FIT.w - w) / 2, y: FIT.y + (FIT.h - h) / 2, w, h };
  }
  const box = () => el.pg.querySelector('.pgm-box');
  const svg = () => el.pg.querySelector('.pgm-svg');
  // The pins' size on screen: about 26 px, whatever the zoom.
  function applyView() {
    const s = svg();
    if (!s) return;
    const r = s.getBoundingClientRect();
    if (!r.width) return;                  // still hidden: measured once it shows (afterPaint)
    if (!vb) vb = fitView(r.width, r.height);
    // The view takes the box's proportions, so the map is never letterboxed.
    const h = vb.w * (r.height / r.width);
    if (Math.abs(h - vb.h) > 1e-6) vb = { ...vb, y: vb.y + (vb.h - h) / 2, h };
    s.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    /* The pins' size on screen: about 22 px with the whole map (18 on a phone), a little more
       close up (a quarter more at most), so zooming in makes room between them rather than
       making them bigger; close enough (twice the whole map's zoom), each carries its name. */
    const zoom = FIT.w / vb.w;
    const px = (r.width < 600 ? 18 : 22) * Math.min(1.25, Math.max(1, Math.pow(zoom, 0.15)));
    pinK = Math.max(0.02, (vb.w / r.width) * px);
    near = zoom >= 2;
    s.style.setProperty('--k', String(pinK));
    s.classList.toggle('is-near', near);
    s.classList.toggle('is-mid', zoom >= 1.5);
    if (near) hideCrowdedLabels(s, zoom);
    paintCard();
  }
  /* Close up, a name that would run into one already shown is hidden (its pin still says it on
     hover, and its card on a tap): measured on screen, in the pins' order, the chosen one first,
     and only when the zoom changes (moving the map doesn't change what overlaps). */
  let labelsAt = 0;
  function hideCrowdedLabels(s, zoom) {
    if (Math.abs(zoom - labelsAt) < 1e-6) return;
    labelsAt = zoom;
    const labels = [...s.querySelectorAll('.pgm-lbl')];
    labels.forEach((l) => l.classList.remove('is-off'));
    const sel = labels.findIndex((l) => l.parentNode.classList.contains('is-sel'));
    if (sel > 0) labels.unshift(labels.splice(sel, 1)[0]);
    // It mustn't cover another name, nor another pin's circle either.
    const hits = (r, k) => r.left < k.right + 2 && r.right > k.left - 2 && r.top < k.bottom && r.bottom > k.top;
    const circles = [...s.querySelectorAll('.pgm-pin circle')].map((c) => ({ pin: c.parentNode, r: c.getBoundingClientRect() }));
    const kept = [];
    for (const l of labels) {
      const r = l.getBoundingClientRect();
      if (kept.some((k) => hits(r, k)) || circles.some((c) => c.pin !== l.parentNode && hits(r, c.r))) l.classList.add('is-off');
      else kept.push(r);
    }
  }
  function zoomAt(f, cx, cy) {
    const w = Math.min(FIT.w * 1.6, Math.max(2, vb.w * f));
    const h = w * (vb.h / vb.w);
    vb = { x: cx - (cx - vb.x) * (w / vb.w), y: cy - (cy - vb.y) * (h / vb.h), w, h };
    applyView();
  }
  // A point on screen → the map's units.
  function toMap(clientX, clientY) {
    const r = svg().getBoundingClientRect();
    return [vb.x + ((clientX - r.left) / r.width) * vb.w, vb.y + ((clientY - r.top) / r.height) * vb.h];
  }

  /* ── The card of the pin chosen, over the map: what it is, where, and its button (marking a
     collectible or a thing of the 112%, or taking you to the Inventory for what's marked there) ── */
  function btnHtml(th) {
    const a = th.act;
    return !a ? ''
      : a.game ? `<button type="button" class="text-btn" data-act="view" data-value="game" title="${esc(t('pgInGameHint'))}">${esc(t('pgmGoInv'))}</button>`
        : `<button type="button" class="text-btn" ${a.find ? `data-act="pgFind" data-id="${esc(a.find)}"` : `data-act="pgMark" data-key="${a.cat}" data-id="${esc(a.id)}"`} aria-pressed="${!!th.on}">${esc(t(th.on ? 'pgUnmark' : 'pgMark'))}</button>`;
  }
  function cardHtml(th) {
    const btn = btnHtml(th);
    return `<div class="pgm-card" role="dialog" aria-label="${esc(th.name)}">
      <span class="pgm-card-art">${artHtml(th.art)}</span>
      <span class="pgm-card-t"><b${NT}>${esc(th.name)}</b>${th.where ? `<span${NT}>${esc(th.where)}</span>` : ''}${th.note ? `<span>${esc(th.note)}</span>` : ''}</span>
      ${btn}
      <button type="button" class="banner-close pgm-card-x" data-act="pgmPick" data-id="" aria-label="${esc(t('importHintOff'))}">×</button>
    </div>`;
  }
  function paintCard() {
    const b = box();
    if (!b) return;
    let c = b.querySelector('.pgm-card-wrap');
    const th = selected && shown.get(selected);
    if (!th) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.className = 'pgm-card-wrap'; b.appendChild(c); }
    c.innerHTML = cardHtml(th);
    const [x, y] = pinAt(th);
    const r = svg().getBoundingClientRect(), br = b.getBoundingClientRect();
    const sx = ((x - vb.x) / vb.w) * r.width + (r.left - br.left), sy = ((-y - vb.y) / vb.h) * r.height + (r.top - br.top);
    // Whole inside the box: centred on its pin unless that would cut it at an edge.
    const half = c.firstElementChild.offsetWidth / 2 + 8;
    c.style.left = (half * 2 > br.width ? br.width / 2 : Math.max(half, Math.min(br.width - half, sx))) + 'px';
    c.style.top = sy + 'px';
    c.classList.toggle('is-below', sy < c.firstElementChild.offsetHeight + 24);
  }
  const MINE = { 'my-bench': 1, shade: 1, gate: 1, markers: 1 };

  /* ── The filter, under the map: every layer in its group, each with how many of its things
     you have where that's counted; show all, hide all; what you have too; the whole map ── */
  function filterHtml(layers, things) {
    const chip = (l) => {
      const of = things.filter((th) => th.layer === l && th.on !== null);
      const got = of.filter((th) => th.on).length;
      const n = of.length ? `<span class="pgm-kind-n"><b>${App.NF[0].format(got)}</b><i class="u">/${App.NF[0].format(of.length)}</i></span>` : '';
      const art = D.COLLECTIBLE_KINDS[l] ? { src: D.art(...D.COLLECTIBLE_KINDS[l].art) } : LAYER_ART[l];
      return `<button type="button" class="pg-area pgm-kind${layers.has(l) ? ' is-on' : ''}${of.length && got === of.length ? ' is-full' : ''}" data-act="pgmLayer" data-value="${l}" aria-pressed="${layers.has(l)}">
        ${art ? artHtml(art) : '<i class="pgm-ico is-name" aria-hidden="true">A</i>'}<span${NT}>${esc(layerName(l))}</span>${n}</button>`;
    };
    const title = (g) => (g === 'c112' ? t('pgmG_c112', { pct: pctSpace() }) : t('pgmG_' + g));
    return `<section class="pgm-filter" aria-label="${esc(t('pgMapKinds'))}">
      <div class="pgm-filter-bar">
        <h3 class="pgm-filter-t">${esc(t('pgMapKinds'))}</h3>
        <span class="pgm-all">
          <button type="button" class="text-btn" data-act="pgmAll" data-value="show">${esc(t('pgmShowAll'))}</button>
          <button type="button" class="text-btn" data-act="pgmAll" data-value="hide">${esc(t('pgmHideAll'))}</button>
        </span>
      </div>
      <div class="pgm-opts">
        <label class="pgm-found"><input type="checkbox" data-change="pgmWhole" ${prefs.pgMapWhole ? 'checked' : ''}> ${esc(t('pgMapWhole'))}</label>
        <label class="pgm-found"><input type="checkbox" data-change="pgmFound" ${prefs.pgMapFound ? 'checked' : ''}> ${esc(t('pgMapShowFound'))}</label>
        <label class="pgm-found"><input type="checkbox" data-change="pgmNames" ${layers.has('names') ? 'checked' : ''}> ${esc(t('pgMapNames'))}</label>
      </div>
      ${GROUPS.map((g) => `<div class="pgm-group"><h4 class="pgm-group-t">${esc(title(g.id))}</h4>
        <div class="pg-areas pgm-kinds" role="group" aria-label="${esc(title(g.id))}">${g.layers.map(chip).join('')}</div></div>`).join('')}
    </section>`;
  }

  /* ── The whole view ── */
  function renderPgMap() {
    const layers = shownLayers();
    const pins = pinsSvg(layers);
    const reference = !App.progress.mapped.length;
    const note = reference ? 'pgMapReference' : prefs.pgMapWhole ? 'pgMapWholeOn' : 'pgMapFromSave';
    return `<div class="pgm">
      <div class="pgm-bar">
        <p class="pgm-note">${esc(t(note))}</p>
        <span class="pgm-zoom">
          <button type="button" class="step" data-act="pgmZoom" data-value="in" aria-label="${esc(t('pgZoomIn'))}" title="${esc(t('pgZoomIn'))}">+</button>
          <button type="button" class="step" data-act="pgmZoom" data-value="out" aria-label="${esc(t('pgZoomOut'))}" title="${esc(t('pgZoomOut'))}">−</button>
          <button type="button" class="step pgm-fit" data-act="pgmZoom" data-value="fit" aria-label="${esc(t('pgZoomFit'))}" title="${esc(t('pgZoomFit'))}">⤢</button>
        </span>
      </div>
      <div class="pgm-box">
        <svg class="pgm-svg" viewBox="${vb ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : `${FIT.x} ${FIT.y} ${FIT.w} ${FIT.h}`}" role="img" aria-label="${esc(t('pgTabMap'))}">
          <g class="pgm-rooms">${roomsSvg()}</g>
          <g class="pgm-pins">${pins}</g>
          ${layers.has('names') ? `<g class="pgm-names">${namesSvg()}</g>` : ''}
        </svg>
      </div>
      ${filterHtml(layers, allThings())}
    </div>`;
  }
  // After the screen is painted: the view as it was, and the card on its pin.
  // (render() shows the screen after painting it, so the measuring waits for the next frame.)
  const afterPaint = () => { if (svg()) { labelsAt = 0; applyView(); requestAnimationFrame(() => { labelsAt = 0; applyView(); }); } };

  /* ── Moving around ── */
  const touches = new Map();
  let drag = null, pinch = null, moved = false, dragEnd = 0;
  el.pg.addEventListener('pointerdown', (e) => {
    const s = svg();
    if (!s || !s.contains(e.target)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    moved = false;
    if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, vb: { ...vb } };
    else if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: { ...vb }, c: toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
      drag = null;
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    const s = svg();
    if (!s) return;
    const r = s.getBoundingClientRect();
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      vb = { ...drag.vb, x: drag.vb.x - (dx / r.width) * drag.vb.w, y: drag.vb.y - (dy / r.height) * drag.vb.h };
      applyView();
    } else if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      moved = true;
      vb = { ...pinch.vb };
      zoomAt(pinch.d / d, pinch.c[0], pinch.c[1]);
    }
  });
  const end = (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.delete(e.pointerId);
    if (!touches.size) { drag = null; pinch = null; if (moved) dragEnd = performance.now(); moved = false; }
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  el.pg.addEventListener('wheel', (e) => {
    const s = svg();
    if (!s || !s.contains(e.target)) return;
    e.preventDefault();
    const [cx, cy] = toMap(e.clientX, e.clientY);
    zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy);
  }, { passive: false });
  // A drag isn't a tap: the click that comes with letting go of a drag doesn't pick the pin under it.
  el.pg.addEventListener('click', (e) => {
    if (performance.now() - dragEnd < 350 && svg() && svg().contains(e.target)) { e.stopPropagation(); dragEnd = 0; }
  }, true);
  el.pg.addEventListener('keydown', (e) => {
    const pin = e.target.closest && e.target.closest('.pgm-pin[data-id]');
    if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); actions.pgmPick(pin); }
  });
  el.pg.addEventListener('change', (e) => {
    if (e.target.closest('[data-change="pgmFound"]')) { prefs.pgMapFound = e.target.checked; savePrefs(); render(); }
    // A choice of yours, not the save's: a bench doesn't undo it.
    if (e.target.closest('[data-change="pgmWhole"]')) { prefs.pgMapWhole = e.target.checked; savePrefs(); render(); }
    if (e.target.closest('[data-change="pgmNames"]')) {
      shownLayers();
      prefs.pgMapOff = e.target.checked ? prefs.pgMapOff.filter((x) => x !== 'names') : [...prefs.pgMapOff, 'names'];
      savePrefs();
      render();
    }
  });
  window.addEventListener('resize', () => { if (prefs.view === 'progress' && prefs.pgTab === 'map') applyView(); });

  Object.assign(actions, {
    pgmPick(node) {
      selected = node.dataset.id && node.dataset.id !== selected ? node.dataset.id : '';
      render();
    },
    pgmLayer(node) {
      const l = node.dataset.value;
      const on = shownLayers().has(l);
      prefs.pgMapOff = on ? [...prefs.pgMapOff, l] : prefs.pgMapOff.filter((x) => x !== l);
      savePrefs();
      render();
    },
    pgmAll(node) {
      prefs.pgMapOff = node.dataset.value === 'hide' ? [...LAYERS] : [];
      savePrefs();
      render();
    },
    pgmZoom(node) {
      const v = node.dataset.value;
      if (v === 'fit') { vb = null; applyView(); return; }
      zoomAt(v === 'in' ? 1 / 1.4 : 1.4, vb.x + vb.w / 2, vb.y + vb.h / 2);
    },
  });

  Object.assign(App, { renderPgMap, pgMapAfterPaint: afterPaint });
})();
