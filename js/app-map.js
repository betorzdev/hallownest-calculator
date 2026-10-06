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
   isn't saved. The pins keep about the same size on screen (--k), and close up carry their names.
   With #…&admin=1 (App.admin) the pins can be dragged to where they really go, and the moves
   are saved to js/map-fixes.js through `npm run admin` (see "The admin mode" below). */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, P = HK.progress, R = HK.rooms, CO = HK.collectibles, M = HK.map, F = HK.foes, HJ = HK.hunter;
  const SO = HK.sceneObjects, PE = HK.people;
  const FIXES = (HK.mapFixes || {}).FIXES || {};   // js/map-fixes.js: where a pin really goes, over what the data says
  const App = HK.app;
  const { t, pick, el, esc, NT, actions, prefs, savePrefs, render, pctSpace } = App;

  /* ── Where things go ── */
  const pinsOf = (kind) => M.PINS.filter((p) => p[0] === kind);
  const GAME_PIN = { 'grub': 'grub', 'whispering-root': 'root', 'stag': 'stag', 'grimmkin-flame': 'flame' };
  /* Where a room is (its centre, or its place on a neighbour: ALIAS, for the rooms the map doesn't
     draw) and where a door is on its edge: js/walk.js, which walks them. */
  const { ALIAS, roomPoint, doorPoint } = HK.walk;
  /* A point in a scene's own units (js/scene-objects.js, js/people.js) → the map, by the game's
     formula (GameMap.PositionCompass, as tools/extract-map.py places things): the room's rough
     drawing stands for the scene's tile map. A room the map doesn't draw: its place (roomPoint). */
  const unit = (v) => Math.min(1, Math.max(0, v));
  function scenePoint(scene, x, y) {
    const r = !ALIAS[scene] && M.ROOMS[scene], sz = SO.SIZES[scene];
    if (!r || !sz) return roomPoint(scene);
    return [r[1] - r[5] / 2 + unit(x / sz[0]) * r[5], r[2] - r[6] / 2 + unit(y / sz[1]) * r[6]];
  }
  /* Where a place of ItemChanger's is (js/map.js's SPOTS, from the game's scenes): the characters
     with a pin of their own on the game's map stand there, and what they sell with them. The
     storeroom behind Sly's shop is Sly's. → { p: [x, y], scene } or null */
  const NPC_OF = { Iselda: 'mapper', Leg_Eater: 'leg_eater', Seer: 'dream_moth', Lemm: 'relic_dealer' };
  const SPOT_ALIAS = { "Nailmaster's_Glory": 'Sly', Grubsong: 'Grubfather', Dream_Wielder: 'Seer', Awoken_Dream_Nail: 'Seer' };
  const npcPin = (who) => { const p = M.PINS.find((x) => x[0] === 'npc' && x[1] === who); return p ? [p[2], p[3]] : null; };
  // The Grubfather's and the Seer's rewards are theirs: around their pin.
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
    dreamshield: 'Dreamshield', sprintmaster: 'Sly', weaversong: 'Weaversong', grimmchild: 'Grimmchild',
  };
  const EQUIP_AT = {
    'mothwing-cloak': 'Mothwing_Cloak', 'mantis-claw': 'Mantis_Claw', 'crystal-heart': 'Crystal_Heart',
    'monarch-wings': 'Monarch_Wings', 'isma-tear': "Isma's_Tear", 'shade-cloak': 'Shade_Cloak', 'kings-brand': "King's_Brand",
    'vs-1': 'Vengeful_Spirit', 'vs-2': 'Shade_Soul', 'dd-1': 'Desolate_Dive', 'dd-2': 'Descending_Dark',
    'hw-1': 'Howling_Wraiths', 'hw-2': 'Abyss_Shriek', cyclone: 'Cyclone_Slash', great: 'Great_Slash', dash: 'Dash_Slash',
    'dream-nail': 'RestingGrounds_04', 'dream-awakened': 'Awoken_Dream_Nail', 'seer-ascended': 'Seer',
  };
  /* The key items, the Inventory's and the two only on the map, where you pick them up (or buy
     them: Sly sells the lantern, and the Elegant Key once he has his key back). */
  const KEY_AT = {
    'lumafly-lantern': 'Sly', 'city-crest': 'City_Crest', 'shopkeepers-key': "Shopkeeper's_Key", 'elegant-key': 'Sly_(Key)',
    'love-key': 'Love_Key', 'tram-pass': 'Tram_Pass', godtuner: 'Godtuner', 'collectors-map': "Collector's_Map",
    'hunters-journal': "Hunter's_Journal",
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
  /* The dream bosses, fought with the Dream Nail where their waking self fell (Grey Prince Zote,
     in Bretta's house): not part of the 112%, but the Journal's; beaten once it has them complete.
     Three have no entry of their own (js/journal.js, `of`): the save's flag says it (js/progress.js). */
  const DREAM_BOSS_AT = { 'failed-champion': 'Crossroads_10', 'soul-tyrant': 'Ruins1_24', 'lost-kin': 'Abyss_19',
    'white-defender': 'Waterways_15', 'grey-prince-zote': 'Room_Bretta' };
  /* Foes no room places (js/scene-objects.js reads what a scene holds; these come some other way),
     on the game's pin for where they're fought, with their layer: the Grimmkin, called by the
     flames of Grimm's ritual (the wiki's page for each; Distant Village's flame is Brumm's), are
     the ritual's, beside their flames; the Hollow Knight and the Radiance, behind the Black Egg,
     are other bosses. */
  const SPAWNED_BOSS_AT = [
    ['grimmkin-novice', 'flame', 'Fungus1_10', 'grimmkin'], ['grimmkin-novice', 'flame', 'Mines_10', 'grimmkin'], ['grimmkin-novice', 'flame', 'Ruins1_28', 'grimmkin'],
    ['grimmkin-master', 'flame', 'Tutorial_01', 'grimmkin'], ['grimmkin-master', 'flame', 'RestingGrounds_06', 'grimmkin'], ['grimmkin-master', 'flame', 'Deepnest_East_03', 'grimmkin'],
    ['grimmkin-nightmare', 'flame', 'Fungus2_30', 'grimmkin'], ['grimmkin-nightmare', 'flame', 'Abyss_02', 'grimmkin'], ['grimmkin-nightmare', 'flame', 'Hive_03', 'grimmkin'],
    ['hollow-knight', 'blackegg', 'Crossroads_02', 'other-bosses'], ['the-radiance', 'blackegg', 'Crossroads_02', 'other-bosses'],
  ];
  /* Two fights load their own copy of a room the map doesn't draw: the Crystal Guardian's, on its
     bench room, and Flukemarm's, where she leaves Flukenest. */
  const BOSS_SCENE = { Mines_18_boss: () => ({ p: roomPoint('Mines_18'), scene: 'Mines_18' }), Waterways_12_boss: () => spotOf('Flukenest') };
  // A second fight that counts for another's Journal entry (killedMegaBeamMiner): named by its room.
  const FOE_IN = { Mines_32: { 'crystal-guardian': 'enraged-guardian' } };
  // Three the site has no Journal medal for (assets/journal): their Journal picture instead.
  const NO_MEDAL = ['failed-champion', 'soul-tyrant', 'lost-kin'];
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
  const PLACE_PINS = { benches: 'bench', trams: 'tram', lifts: 'lift', springs: 'spa', cocoons: 'cocoon' };
  /* Seven sections, by what things are for (30 Sep 2026): what counts for the 112% (the shards and
     the ore too: they're the masks, vessels and nail it counts), what's picked up and doesn't, what
     moves a story on, the Journal's enemies, secrets and geo, places, and your game's own (only with
     a save). The four relics are one layer. */
  const RELICS = ['wanderers-journal', 'hallownest-seal', 'kings-idol', 'arcane-egg'];
  const layerOfKind = (k) => (RELICS.includes(k) ? 'relics' : k);
  const GROUPS = [
    // One layer per kind of thing (design/24, C: Equipment, spells and arts and Bosses and trials were two).
    { id: 'c112', layers: ['charms', 'equipment', 'spells', 'arts', 'dream-nail', 'bosses', 'trials', 'grimm-troupe', 'graves', 'dreamers', 'mask-shard', 'vessel-fragment', 'pale-ore'] },
    { id: 'collect', layers: ['grub', 'charm-notch', 'simple-key', 'keys', 'rancid-egg', 'relics', 'map'] },
    { id: 'quests', layers: ['whispering-root', 'grimmkin-flame', 'grimmkin', 'npcs'] },
    { id: 'hunt', layers: ['foes', 'other-bosses'] },
    { id: 'secrets', layers: ['walls', 'hidden', 'chests', 'rocks'] },
    { id: 'places', layers: ['benches', 'stag', 'trams', 'lifts', 'people', 'springs', 'cocoons', 'totems', 'tablets'] },
    { id: 'mine', layers: ['my-bench', 'shade', 'gate', 'markers'], save: true },
  ];
  // The areas' names are a layer too, switched by their own box beside the filter's two choices.
  const LAYERS = [...GROUPS.flatMap((g) => g.layers), 'names'];
  /* Hidden until you show them, the ones with hundreds of pins: the enemies, the hidden places,
     the geo rocks, the totems. Once: a layer that came later (prefs.pgMapSeen) starts so, then it's
     yours to show or hide. */
  const LATE_OFF = ['foes', 'hidden', 'rocks', 'totems'];
  /* What a new user sees (no prefs yet): the 112%'s things and the key places, about 250 pins; the
     rest (the other collectibles, enemies, meetings, secrets, geo, the lesser places) is theirs to
     switch on. */
  const C112_REF = ['charms', 'equipment', 'spells', 'arts', 'dream-nail', 'bosses', 'trials', 'grimm-troupe', 'graves', 'dreamers'];
  const REF_LAYERS = new Set(C112_REF);
  const DEFAULT_ON = new Set([...C112_REF, 'mask-shard', 'vessel-fragment', 'pale-ore',
    'other-bosses', 'grub', 'benches', 'stag', 'trams', 'people', 'my-bench', 'shade', 'gate', 'markers', 'names']);
  // A layer's picture in the filter: a collectible's, or one of the game's pins.
  const LAYER_ART = {
    equipment: { src: D.art('items', 'mantis-claw') }, spells: { src: D.art('spells', 'vs') }, arts: { src: D.art('arts', 'cyclone') },
    'dream-nail': { src: D.art('abilities', 'dream1') }, trials: { pin: 'colosseum' }, 'grimm-troupe': { src: D.art('journal', 'grimm') },
    keys: { src: D.art('items', 'city-crest') }, relics: { src: D.art('items', 'kings-idol') }, foes: { src: D.art('journal', 'crawlid') }, 'other-bosses': { src: D.art('journal', 'vengefly-king') }, grimmkin: { src: D.art('journal', 'grimmkin-novice') }, npcs: { glyph: 'npc' },
    walls: { glyph: 'wall' }, hidden: { glyph: 'hidden' }, chests: { src: 'assets/world/chest.png' }, rocks: { src: D.art('items', 'geo') },
    totems: { src: 'assets/world/totem.png' }, tablets: { src: 'assets/world/tablet.png' }, charms: { src: 'assets/charms/compass.png' }, bosses: { src: D.art('journal', 'false-knight') },
    graves: { pin: 'grave' }, dreamers: { pin: 'dreamer-monomon' }, benches: { pin: 'bench' }, people: { pin: 'vendor' },
    trams: { pin: 'tram' }, lifts: { glyph: 'lift' }, springs: { pin: 'spa' }, cocoons: { pin: 'cocoon' }, 'my-bench': { pin: 'bench' },
    shade: { pin: 'shade' }, gate: { pin: 'dreamgate' }, markers: { pin: 'marker-y' },
  };
  // A layer's name in the filter, in the plural (a thing's own name is on its card).
  const layerName = (id) => t('pgmL_' + id);
  const shownLayers = () => {
    // Before the layers, the map kept the kinds shown (pgMapKinds): the rest were hidden. Someone
    // new gets the defaults.
    if (!Array.isArray(prefs.pgMapOff)) {
      const fresh = !Array.isArray(prefs.pgMapKinds);
      prefs.pgMapOff = fresh ? LAYERS.filter((l) => !DEFAULT_ON.has(l)) : CO.KINDS.filter((k) => !prefs.pgMapKinds.includes(k));
      if (fresh) prefs.pgMapSeen = 1;
      delete prefs.pgMapKinds;
      savePrefs();
    }
    /* Equipment, spells and arts was one layer (equip), and Bosses and trials one (bosses, which keeps
       its id): hidden then, its new layers are hidden too (design/24, 1 Oct 2026). */
    if (prefs.pgMapOff.includes('equip') || (prefs.pgMapOff.includes('bosses') && !prefs.pgMapSplit)) {
      const off = new Set(prefs.pgMapOff.filter((l) => l !== 'equip'));
      if (prefs.pgMapOff.includes('equip')) ['equipment', 'spells', 'arts', 'dream-nail'].forEach((l) => off.add(l));
      if (off.has('bosses')) ['trials', 'grimm-troupe'].forEach((l) => off.add(l));
      prefs.pgMapOff = [...off];
    }
    if (!prefs.pgMapSplit) { prefs.pgMapSplit = 1; savePrefs(); }
    // The four relics were four layers: one hidden then hides the one they are now.
    if (prefs.pgMapOff.some((l) => RELICS.includes(l))) {
      prefs.pgMapOff = [...new Set(prefs.pgMapOff.map(layerOfKind))];
      savePrefs();
    }
    if (prefs.pgMapSeen !== 1) {
      prefs.pgMapOff = [...new Set([...prefs.pgMapOff, ...LATE_OFF])];
      prefs.pgMapSeen = 1;
      savePrefs();
    }
    return new Set(LAYERS.filter((l) => !prefs.pgMapOff.includes(l)));
  };

  /* ── Everything the map can show, as things: where, its picture, its name, whether you have
     it (on: true or false; null for a place) and what its card's button does ── */
  const where = (scene) => {
    const a = R.areaOf(scene), pl = R.placeOf(scene);
    return [a && pick(R.AREAS[a]), pl && pick(R.PLACES[pl])].filter(Boolean).join(' · ');
  };
  // A collectible's picture: its item's; a stag station's, the game's own map pin (the item's
  // drawing, a dark stag cut by its circle, can't be read at a pin's size).
  const kindArt = (k) => (k === 'stag' ? { pin: 'stag' } : { src: D.art(...D.COLLECTIBLE_KINDS[k].art) });
  // What it asks for, when it isn't found: a shop's price, the Seer's essence, the Grubfather's grubs.
  const priceOf = (it) => {
    if (!it.src) return '';
    const [who, n] = it.src, num = App.NF[0].format(n);
    return who === 'sly' || who === 'salubra' ? `${num} geo` : who === 'seer' ? t('pgmEssence', { n: num }) : who === 'grubs' ? t('pgmGrubs', { n: num }) : '';
  };
  /* Whether a station is open, as your game has it: a stag station once you've opened it (its
     collectible), a tram's once its line is (js/progress.js); undefined when it isn't known
     (no save, or a lift: the game's flags for them aren't clear). */
  const TRAM_LINE = { Crossroads_46: 'tram-upper', Crossroads_46b: 'tram-upper', Abyss_03: 'tram-lower',
    Abyss_03_b: 'tram-lower', Abyss_03_c: 'tram-lower' };
  function openOf(kind, scene) {
    if (!App.progress.mapped.length) return undefined;
    if (kind === 'tram') return TRAM_LINE[scene] ? P.has(App.progress, TRAM_LINE[scene]) : undefined;
    return undefined;
  }
  /* What each room holds (js/scene-objects.js, read from the game's scenes) and the characters'
     meetings (js/people.js), where they are in their room. */
  // The Journal's entry of a playerDataName (killed<X>); the Crawlid's is the first, and the site
  // doesn't read it from a save (js/savefile.js): it's always there.
  const FOE_OF = { ...Object.fromEntries(Object.entries(HK.savefile.JOURNAL_PD).map(([id, x]) => [x, id])), Crawler: 'crawlid' };
  const foeName = (id) => { const r = HJ.ROW[id]; return pick((r && r.name) || (HJ.EXTRAS[id] || F.FOE_BY_ID[id] || {}).name) || id; };
  const SECRET_LAYER = { wall: 'walls', floor: 'walls', oneway: 'walls', hidden: 'hidden' };
  /* The bosses the 112% counts are its own layer's (the Journal's entries its categories read);
     every other boss goes on 'other-bosses' with the dream bosses, the rest of the enemies on 'foes'.
     The 112%'s Troupe Master Grimm is the Journal's 'grimm'. */
  let bosses112 = null;
  const is112Boss = (id) => (bosses112 || (bosses112 = new Set(HK.completion.CATEGORIES
    .filter((c) => ['bosses', 'dreams', 'colosseum', 'grimm'].includes(c.id)).flatMap((c) => c.items.map((it) => it[0])).concat('grimm')))).has(id);
  function worldThings() {
    const out = [], pr = App.progress, book = App.hjBook();
    const opened = new Set(pr.opened), rocks = new Set(pr.rocks), met = new Set(pr.met);
    // No save: nothing's known broken or opened, but nothing's known either way; shown as not yet.
    for (const [scene, rows] of Object.entries(SO.ENEMIES)) {
      for (const [pd, n, x, y] of rows) {
        const id = FOE_OF[pd], at = id && (BOSS_SCENE[scene] ? BOSS_SCENE[scene]() : { p: scenePoint(scene, x, y), scene });
        if (!at || !at.p) continue;
        const boss = (F.FOE_BY_ID[id] || {}).kind === 'boss';
        // A 112% boss is on its layer already, and a dream boss has its pin in its dream's room.
        if (boss && (is112Boss(id) || DREAM_BOSS_AT[id])) continue;
        const s = HJ.stateOf(book, id), shown = (FOE_IN[scene] || {})[id], p = at.p;
        out.push({ id: `f:${scene}:${id}`, layer: boss ? 'other-bosses' : 'foes', p, scene: at.scene, art: { src: D.art('journal', id) },
          name: shown ? pick(F.FOE_BY_ID[shown].name) : foeName(id), where: where(at.scene),
          on: s.done, note: [n > 1 ? t('pgmFoeHere', { n: App.NF[0].format(n) }) : '', t(s.done ? 'hjDone' : s.seen ? 'pgmFoeLeft' : 'hjUnseen', { n: App.NF[0].format(s.left || 0) })].filter(Boolean).join(' · '),
          act: { journal: id } });
      }
    }
    for (const [id, kind, scene, layer] of SPAWNED_BOSS_AT) {
      const p = gamePin(kind, scene), s = HJ.stateOf(book, id);
      if (p) out.push({ id: `f:${scene}:${id}`, layer, p, scene, art: { src: D.art('journal', id) }, name: foeName(id), where: where(scene),
        on: s.done, note: t(s.done ? 'hjDone' : s.seen ? 'pgmFoeLeft' : 'hjUnseen', { n: App.NF[0].format(s.left || 0) }), act: { journal: id } });
    }
    /* A wall, a hidden place or a rock in a room the map doesn't draw (the White Palace, Godhome,
       a house) has no place of its own: they'd pile up on its door. Those aren't shown. */
    const drawn = (scene) => !!M.ROOMS[scene] && !ALIAS[scene];
    for (const [scene, rows] of Object.entries(SO.SECRETS)) {
      if (!drawn(scene)) continue;
      for (const [kind, name, x, y] of rows) {
        const p = scenePoint(scene, x, y);
        if (p) out.push({ id: `s:${scene}|${name}`, layer: SECRET_LAYER[kind], sub: kind, p, scene, art: { glyph: kind === 'hidden' ? 'hidden' : 'wall' },
          name: t('pgmS_' + kind), where: where(scene), on: opened.has(scene + '|' + name), act: { state: true } });
      }
    }
    for (const [scene, rows] of Object.entries(SO.CHESTS)) {
      for (const [name, x, y] of rows) {
        const p = scenePoint(scene, x, y);
        if (p) out.push({ id: `ch:${scene}|${name}`, layer: 'chests', p, scene, art: { src: 'assets/world/chest.png' }, name: t('pgmN_chest'), where: where(scene),
          on: opened.has(scene + '|' + name), act: { state: true } });
      }
    }
    for (const [scene, rows] of Object.entries(SO.ROCKS)) {
      if (!drawn(scene)) continue;
      for (const [name, x, y] of rows) {
        const p = scenePoint(scene, x, y);
        if (p) out.push({ id: `r:${scene}|${name}`, layer: 'rocks', p, scene, art: { src: D.art('items', 'geo') }, name: t('pgmN_rock'), where: where(scene),
          on: rocks.has(scene + '|' + name), act: { state: true } });
      }
    }
    for (const [scene, rows] of Object.entries(SO.TOTEMS)) {
      rows.forEach(([, x, y], i) => {
        const p = scenePoint(scene, x, y);
        if (p) out.push({ id: `to:${scene}:${i}`, layer: 'totems', p, scene, art: { src: 'assets/world/totem.png' }, name: t('pgmN_totem'), where: where(scene), on: null });
      });
    }
    for (const [scene, rows] of Object.entries(SO.TABLETS)) {
      rows.forEach(([, , x, y, text], i) => {
        const p = scenePoint(scene, x, y);
        if (p) out.push({ id: `tb:${scene}:${i}`, layer: 'tablets', p, scene, art: { src: 'assets/world/tablet.png' }, name: t('pgmN_tablet'), where: where(scene),
          on: null, text: pick(text) });
      });
    }
    for (const who of PE.PEOPLE) {
      who.stops.forEach(([scene, x, y, flag], i) => {
        const p = scenePoint(scene, x, y);
        if (p) out.push({ id: `n:${who.id}:${i}`, layer: 'npcs', sub: who.id, p, scene, art: { glyph: 'npc' }, name: pick(who), where: where(scene),
          on: met.has(flag), note: t('pgmMeet', { i: App.NF[0].format(i + 1), n: App.NF[0].format(who.stops.length) }), act: { state: true } });
      });
    }
    return out;
  }
  function allThings() {
    const out = [];
    for (const it of CO.ITEMS) {
      if (!COL_POS[it.id]) continue;
      out.push({ id: it.id, layer: layerOfKind(it.kind), sub: it.kind, p: COL_POS[it.id], scene: it.scene, art: kindArt(it.kind),
        name: pick(D.COLLECTIBLE_KINDS[it.kind]), where: where(it.scene), act: { find: it.id },
        // A stag station is a place too: always on the map, saying whether it's open yet.
        ...(it.kind === 'stag' ? { on: null, closed: !P.hasFound(App.progress, it.id) && !!App.progress.mapped.length, found: P.hasFound(App.progress, it.id),
          note: App.progress.mapped.length ? t(P.hasFound(App.progress, it.id) ? 'pgmOpen' : 'pgmClosed') : '' }
          : { on: P.hasFound(App.progress, it.id), note: priceOf(it) }) });
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
      out.push({ id: 'c:' + id, layer, p: pt, scene, art: m.art ? { src: m.art } : { pin: 'colosseum' }, name: m.name, where: where(scene),
        on: it.got >= it.max, act: mark(cat, id) });
    };
    for (const it of cats.charms.items) if (CHARM_AT[it.id]) add112('charms', 'charms', it.id, CHARM_AT[it.id]);
    /* Kingsoul, in its two halves where each is picked up (wiki, "Kingsoul"): the left from the
       White Lady (ItemChanger's Queen_Fragment), the right from the Pale King's body at the end
       of the White Palace, which the map doesn't draw: where you dream your way in, its
       "Dream Enter" in the Palace Grounds (tools/extract-map.py's Scenes, Abyss_05). Each is
       gone once you have it, or the whole charm. */
    const king = item('charms', 'king'), whole = !!king && king.got >= king.max;
    for (const [half, side, at, note] of [['queen-fragment', 'left', spotOf('Queen_Fragment'), 'pgmFragQueen'],
      ['king-fragment', 'right', { p: scenePoint('Abyss_05', 128.53, 18.33), scene: 'Abyss_05' }, 'pgmFragKing']]) {
      if (at && at.p) out.push({ id: 'c:' + half, layer: 'charms', p: at.p, scene: at.scene, art: { src: D.art('items', 'white-fragment-' + side) },
        name: pick(D.WHITE_FRAGMENT), where: where(at.scene), note: t(note), on: whole || P.has(App.progress, half), act: { state: true } });
    }
    add112('charms', 'grimm', 'grimmchild', CHARM_AT.grimmchild);
    for (const it of cats.equipment.items) add112('equipment', 'equipment', it.id, EQUIP_AT[it.id]);
    for (const it of cats.arts.items) add112('arts', 'arts', it.id, EQUIP_AT[it.id]);
    for (const it of cats.dreamNail.items) add112('dream-nail', 'dreamNail', it.id, EQUIP_AT[it.id]);
    // A spell, once per level: its name and picture are that level's.
    for (const it of cats.spells.items) {
      for (const lvl of [1, 2]) {
        const at = placeAt(EQUIP_AT[it.id + '-' + lvl]);
        if (!at) continue;
        const pt = at.p, scene = at.scene;
        out.push({ id: 'c:' + it.id + lvl, layer: 'spells', p: pt, scene, art: { src: D.art('spells', lvl === 2 ? it.id + '2' : it.id) },
          name: pick(D.SPELLS[it.id].levels[lvl]), where: where(scene), on: it.got >= lvl, act: { game: true } });
      }
    }
    // The key items: marked on the Inventory; the two it doesn't list only say whether you have them.
    for (const it of [...D.KEY_ITEMS, ...D.MAP_ITEMS]) {
      const at = placeAt(KEY_AT[it.id]);
      if (!at) continue;
      const inInv = D.KEY_ITEMS.includes(it);
      out.push({ id: 'k:' + it.id, layer: 'keys', p: at.p, scene: at.scene, art: { src: D.art('items', it.id) }, name: pick(it), where: where(at.scene),
        // Sly's prices (wiki, each item's page).
        on: P.has(App.progress, it.id), note: it.id === 'lumafly-lantern' ? '1800 geo' : it.id === 'elegant-key' ? '800 geo' : '',
        act: inInv ? { game: true } : { state: true } });
    }
    for (const [id, scene] of Object.entries(DREAM_BOSS_AT)) {
      const p = roomPoint(scene), foe = F.FOE_BY_ID[id];
      if (p && foe) out.push({ id: 'd:' + id, layer: 'other-bosses', p, scene, art: { src: D.art(NO_MEDAL.includes(id) ? 'enemies' : 'journal', id) }, name: pick(foe.name), where: where(scene),
        on: P.IDS[id] ? P.has(App.progress, id) : HJ.stateOf(App.hjBook(), id).done, act: { state: true } });
    }
    for (const it of cats.bosses.items) add112('bosses', 'bosses', it.id, BOSS_AT[it.id]);
    for (const it of cats.colosseum.items) add112('trials', 'colosseum', it.id, BOSS_AT[it.id]);
    for (const id of ['troupe-master-grimm', 'nkg']) add112('grimm-troupe', 'grimm', id, BOSS_AT[id]);
    for (const it of cats.dreams.items) add112('graves', 'dreams', it.id, GRAVE_AT[it.id], gamePin('grave', GRAVE_AT[it.id]));
    for (const it of cats.dreamers.items) {
      const pt = gamePin('dreamer', it.id), m = App.pgMeta('dreamers', it.id);
      if (pt) out.push({ id: 'c:' + it.id, layer: 'dreamers', p: pt, scene: DREAMER_ROOM[it.id], art: { pin: 'dreamer-' + it.id }, name: m.name,
        where: where(DREAMER_ROOM[it.id]), on: it.got >= it.max, act: { cat: 'dreamers', id: it.id } });
    }
    out.push(...worldThings());
    // The places: the game's own pins, and who's where. Dirtmouth's lift to Crystal Peak only once
    // its shaft is drawn (the town's second drawing, js/progress.js ALTS: visitedMines10): before
    // that the pin would hang over nothing. With no save the world is finished, and it's there.
    const alts = App.progress.mapped.length ? new Set(App.progress.alts) : null;
    for (const [layer, kind] of Object.entries(PLACE_PINS)) {
      pinsOf(kind).forEach(([, scene, x, y], i) => {
        if (kind === 'lift' && scene === 'Town' && alts && !alts.has('Town')) return;
        const open = openOf(kind, scene);
        out.push({ id: `${layer}:${i}`, layer, p: [x, y], art: kind === 'lift' ? { glyph: 'lift' } : { pin: kind },
          name: t('pgmP_' + kind), where: where(scene), on: null, scene, closed: open === false,
          note: open === undefined ? '' : t(open ? 'pgmOpen' : 'pgmClosed') });
      });
    }
    for (const [who, scene, art, pin] of PEOPLE) {
      const pt = npcPin(PEOPLE_NPC[who]) || (pin && pinsOf(pin)[0] && pinsOf(pin)[0].slice(2))
        || (PEOPLE_AT[who] && placeAt(PEOPLE_AT[who]).p) || roomPoint(scene);
      if (pt) out.push({ id: 'people:' + who, layer: 'people', p: pt, scene, art, name: t('pgmW_' + who), where: where(scene), on: null });
    }
    // Last of all, the corrections (js/map-fixes.js, and the admin mode's unsaved moves).
    return out.map(fixed);
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

  // An atlas's ?v= (js/map.js): its rects change with it, and a cached old one would misplace them.
  const atlasV = (k) => (M.ATLAS.v && M.ATLAS.v[k] ? '?v=' + M.ATLAS.v[k] : '');

  /* ── The rooms, as your game has them ── */
  // The area's map from Cornifer, by the name js/map.js gives the area (Dirtmouth's comes with the game).
  const AREA_MAP = { 'Crossroads': 'crossroads-map', 'Green_Path': 'greenpath-map', 'Fog_Canyon': 'fog-canyon-map',
    'Fungal Wastes': 'fungal-wastes-map', 'Deepnest': 'deepnest-map', 'Ancient Basin': 'ancient-basin-map',
    'Kingdoms_Edge': 'kingdoms-edge-map', 'City of Tears': 'city-of-tears-map', 'Waterways': 'royal-waterways-map',
    'Cliffs': 'howling-cliffs-map', 'Crystal Peak': 'crystal-peak-map', 'Queens_Gardens': 'queens-gardens-map',
    'Resting_Grounds': 'resting-grounds-map', 'Town_Tutorial': '' };
  // A room's own scene: its drawing's alternatives ("_b", "_part_b"…) belong to it.
  const sceneOf = (name) => name.replace(/_(b|c|d|part_b|left|right)$/, '');
  /* As the game draws it (GameMap.SetupMap, RoughMapRoom): nothing of an area until you have its
     map (Dirtmouth's comes with the game), even where you've been; with it, Cornifer's sketch of
     the rooms he drew, and the whole drawing of those you've been to. */
  const SKETCHED = new Set(M.SKETCHED);
  function roomState(name, area, mapped) {
    if (!mapped.size || prefs.pgMapWhole) return 'full';
    const m = AREA_MAP[M.AREAS[area]];
    if (!(m === '' || (m && P.hasFound(App.progress, m)))) return 'ghost';
    if (mapped.has(name) || mapped.has(sceneOf(name))) return 'full';
    return SKETCHED.has(name) ? 'rough' : 'ghost';
  }
  /* All the rooms, or one area's (its index in M.AREAS: Your game draws the area of your bench).
     debug-map.html passes its own { state(name, area) → 'full'|'rough'|'ghost', alts: Set }, to
     check by hand that every state of every room fits its neighbours. */
  function roomsSvg(only, as = null) {
    const mapped = new Set(App.progress.mapped);
    const [aw, ah] = M.ATLAS.full, [rw, rh] = M.ATLAS.rough;
    // A room's second drawing, once the world shows it (a lift, a wall broken…); with no save,
    // the world finished: all of them.
    const alts = as ? as.alts : mapped.size ? new Set(App.progress.alts) : new Set(Object.keys(M.ROOMS));
    /* Each drawing goes BLEED atlas pixels past its edge, onto the ring of its own edge pixels the
       atlas keeps around it (tools/extract-map.py): two rooms that meet overlap there instead of
       each fading out at the seam, which drew a dark hairline across every joint. */
    const B = M.ATLAS.bleed || 0;
    const ghosts = [], rest = [];
    for (const [name, r] of Object.entries(M.ROOMS)) {
      if (only !== undefined && r[0] !== only) continue;
      const [area, x, y, w, h, rW, rH, full, rough, alt] = r;
      const st = as ? as.state(name, area) : roomState(name, area, mapped);
      const useFull = st !== 'rough';
      const [bw, bh] = useFull ? [w, h] : [rW, rH];
      const [sx, sy, sw, sh] = useFull ? (alt && alts.has(name) ? alt : full) : rough;
      const [iw, ih] = useFull ? [aw, ah] : [rw, rh];
      const room = (cls, [rx, ry, rW2, rH2], src, [w2, h2]) => {
        const ex = (B * bw) / rW2, ey = (B * bh) / rH2;   // the bleed, in map units
        return `<svg class="pgm-room ${cls}" data-room="${name}" x="${(x - bw / 2 - ex).toFixed(4)}" y="${(-y - bh / 2 - ey).toFixed(4)}" width="${(bw + 2 * ex).toFixed(4)}" height="${(bh + 2 * ey).toFixed(4)}"
        viewBox="${rx - B} ${ry - B} ${rW2 + 2 * B} ${rH2 + 2 * B}" preserveAspectRatio="none"><image href="assets/map/rooms-${src}.png${atlasV(src)}" width="${w2}" height="${h2}"/></svg>`;
      };
      /* A second drawing the save hasn't earned yet (Dirtmouth's lift shaft before you've ridden it)
         goes under the room's own as a ghost, like the rooms you don't know: what it adds (the
         shaft, up to the Peak's corridor, itself a ghost) shows faintly where the drawing you have
         leaves nothing, so the two don't meet as a wall. */
      if (useFull && alt && !alts.has(name)) ghosts.push(room('is-ghost', alt, 'full', [aw, ah]));
      (st === 'ghost' ? ghosts : rest).push(room(`is-${st}`, [sx, sy, sw, sh], useFull ? 'full' : 'rough', [iw, ih]));
    }
    /* The rooms you don't know, all under the ones you do: a ghost drawn over a room of yours
       (they overlap at their joints, and some lie inside another) darkened it in patches. */
    return ghosts.join('') + rest.join('');
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
  // Several things at once, from another screen's pin (showOnMap): { ids, order, i, name, art }; and a view to fit once measured.
  let focus = null, pendingFit = null;
  /* The pins you came to see from another screen ring out three times (css .pgm-arrive), while
     ARRIVE lasts: { ids, at }. A repaint meanwhile carries on the rings where they were. */
  let arrive = null;
  const ARRIVE_MS = 3000;

  /* ── The admin mode (App.admin, from #…&admin=1): a pin dragged, or nudged with the arrow keys,
     to where it really goes. The moves wait in pending (and in sessionStorage, through a reload)
     until Guardar sends them all to `npm run admin` (tools/admin.js), which writes
     js/map-fixes.js; with no server (file://, or the published site) Copiar puts the file's lines
     on the clipboard instead. A saved fix can be dropped too (pending[id] = null: back to the
     data's point). Your own marks (the save's) are never moved. ── */
  const PENDING_KEY = 'hollow.mapPending';
  let pending = null;     // id → [x, y] moved and unsaved (null: a saved fix to drop); read once, when asked
  let undo = [];          // [id, what pending held before] to undo, last first
  let server = null;      // whether `npm run admin` answers: null until asked
  let copyText = '';      // the lines to copy by hand, when the clipboard can't be written
  const admin = () => !!App.admin;
  const pend = () => {
    if (!pending) { pending = {}; if (admin()) { try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '{}') || {}; } catch (e) { /* no storage */ } } }
    return pending;
  };
  const savePending = () => { try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pend())); } catch (e) { /* no storage */ } };
  // Where a thing goes: its unsaved move, else its saved fix, else nothing (the data's point).
  const fixOf = (id) => (id in pend() ? pend()[id] : FIXES[id] || null);
  const fixed = (th) => { const p = fixOf(th.id); return p ? { ...th, p0: th.p, p } : th; };
  // A move: p the new point, null to drop a saved fix, undefined to forget the unsaved move.
  function move(id, p) {
    const was = pend();
    undo.push([id, id in was ? was[id] : undefined]);
    if (p === undefined) delete was[id]; else was[id] = p;
    savePending();
  }
  // Every fix as it would be saved: the file's, with the moves on top (a dropped one gone).
  function merged() {
    const all = { ...FIXES };
    for (const [id, p] of Object.entries(pend())) { if (p) all[id] = p; else delete all[id]; }
    return all;
  }
  const fixLine = (id, p) => `    ${JSON.stringify(id)}: [${p.map((v) => Number(v).toFixed(3)).join(', ')}],`;
  const xy = (p) => `${p[0].toFixed(3)}, ${p[1].toFixed(3)}`;
  // Whether the server is there: asked once, the panel repainted with the answer.
  function askServer() {
    if (server !== null) return;
    server = false;
    if (location.protocol === 'file:') return;
    fetch('/__admin/ping').then((r) => r.ok, () => false).then((ok) => { if (ok) { server = true; render(); } });
  }
  async function adminSave() {
    const all = merged();
    if (server) {
      try {
        const r = await fetch('/__admin/map-fixes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(all) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || String(r.status));
        // The file holds them now: the page's copy too, with nothing pending, and the view as it was.
        for (const k of Object.keys(FIXES)) delete FIXES[k];
        Object.assign(FIXES, all);
        pending = {}; undo = []; savePending();
        App.toast(t('admSaved'));
      } catch (e) { App.toast(t('admFail', { e: e.message })); }
      render();
      return;
    }
    const text = Object.keys(all).sort().map((k) => fixLine(k, all[k])).join('\n');
    const done = () => { copyText = ''; App.toast(t('admCopied')); render(); };
    const fallback = () => { copyText = text; render(); };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }
  // The dashed way from the data's point to the fix, for every fixed pin on the map.
  function fixLinesSvg() {
    return [...shown.values()].filter((th) => th.p0).map((th) =>
      `<g class="pgm-fix-line${th.id in pend() ? ' is-pending' : ''}" aria-hidden="true"><line x1="${th.p0[0].toFixed(3)}" y1="${(-th.p0[1]).toFixed(3)}" x2="${th.p[0].toFixed(3)}" y2="${(-th.p[1]).toFixed(3)}"/><circle cx="${th.p0[0].toFixed(3)}" cy="${(-th.p0[1]).toFixed(3)}" r="0.08"/></g>`).join('');
  }
  // The panel over the map: the count, the chosen pin's points, the buttons and the list of fixes.
  function adminHtml() {
    askServer();
    const all = merged(), ids = Object.keys(all).sort(), pendIds = Object.keys(pend());
    for (const id of pendIds) if (!ids.includes(id)) ids.push(id);   // a dropped fix, still listed until saved
    const th = selected && shown.get(selected);
    const sel = th && !MINE[th.layer] ? `<div class="pgm-admin-sel">
        <code${NT}>${esc(th.id)}</code>
        <span>${esc(t('admData'))}: <span class="pgm-admin-xy">${xy(th.p0 || th.p)}</span></span>
        ${th.p0 ? `<span>${esc(t('admNow'))}: <span class="pgm-admin-xy">${xy(th.p)}</span> <span class="pgm-admin-xy">(${(th.p[0] - th.p0[0]) >= 0 ? '+' : ''}${(th.p[0] - th.p0[0]).toFixed(3)}, ${(th.p[1] - th.p0[1]) >= 0 ? '+' : ''}${(th.p[1] - th.p0[1]).toFixed(3)})</span></span>` : ''}
        ${th.p0 || th.id in pend() ? `<button type="button" class="text-btn" data-act="admReset" data-id="${esc(th.id)}">${esc(t('admReset'))}</button>` : ''}
      </div>` : `<span class="pgm-admin-hint">${esc(t('admHint'))}</span>`;
    const item = (id) => `<li><button type="button" class="text-btn${id in pend() ? ' is-pending' : ''}" data-act="admGo" data-id="${esc(id)}"${NT}>${esc(id)}${all[id] ? '' : ' ×'}</button></li>`;
    return `<div class="pgm-admin" role="region" aria-label="${esc(t('admTitle'))}">
      <div class="pgm-admin-h"><b>${esc(t('admTitle'))}</b><span>${esc(t('admCount', { s: String(Object.keys(FIXES).length), p: String(pendIds.length) }))}</span></div>
      ${sel}
      <div class="pgm-admin-btns">
        <button type="button" class="text-btn" data-act="admUndo"${undo.length ? '' : ' disabled'}>${esc(t('admUndo'))}</button>
        <button type="button" class="text-btn" data-act="admSave"${pendIds.length ? '' : ' disabled'}>${esc(t(server ? 'admSave' : 'admCopy'))}</button>
        ${server ? '' : `<span class="pgm-admin-hint">${esc(t('admNoServer'))}</span>`}
      </div>
      ${copyText ? `<textarea class="pgm-admin-text" readonly aria-label="${esc(t('admCopy'))}"${NT}>${esc(copyText)}</textarea>` : ''}
      ${ids.length ? `<ul class="pgm-admin-list">${ids.map(item).join('')}</ul>` : ''}
    </div>`;
  }
  // The chosen pin keeps the keyboard after a repaint, so the arrows reach it.
  const focusPin = () => { const g = selected && svg() && svg().querySelector(`.pgm-pin[data-id="${CSS.escape(selected)}"]`); if (g) g.focus({ preventScroll: true }); };
  Object.assign(actions, {
    admUndo() {
      const last = undo.pop();
      if (!last) return;
      const [id, was] = last;
      if (was === undefined) delete pend()[id]; else pend()[id] = was;
      savePending();
      render();
    },
    // Back to the data's point: the unsaved move forgotten, or the saved fix marked to drop.
    admReset(node) { const id = node.dataset.id; move(id, FIXES[id] ? null : undefined); render(); },
    admSave() { adminSave(); },
    admGo(node) {
      const th = allThings().find((x) => x.id === node.dataset.id);
      if (!th) return;
      selected = th.id;
      lookAt(th.p);
      render();
    },
  });
  // A picture: a file, or one of the game's pins from its atlas (assets/map/pins.png).
  function atlasSvg(key, size, cls = '') {
    const [x, y, w, h] = M.PIN_ART[key], [aw, ah] = M.ATLAS.pins;
    const at = size === null ? '' : ` x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"`;
    return `<svg class="pgm-atlas${cls}"${at} viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><image href="assets/map/pins.png${atlasV('pins')}" width="${aw}" height="${ah}"/></svg>`;
  }
  // The lift, which the game has no pin for: a cage between two arrows, in the pins' bone.
  /* …and the rest the game draws with no sprite of its own the site can take: a wall that breaks
     (its bricks, one cracked), a hidden place (a door's outline, dashed), a geo chest, and a
     character you meet (a speech bubble). */
  const GLYPH = {
    lift: '<g class="pgm-glyph"><rect x="-0.2" y="-0.16" width="0.4" height="0.32" rx="0.04"/><path d="M0 -0.4 L0.13 -0.24 L-0.13 -0.24 Z M0 0.4 L0.13 0.24 L-0.13 0.24 Z"/></g>',
    /* design/25 (1 Oct 2026): a brick wall with a hole knocked through (what breaks opens a way),
       and an archway half veiled with a glint (a place that's there but hidden; the game has no
       picture for either). The joints and the veil's edge are cuts in the page's dark (.pgm-glyph-cut).
       The geo chest is the game's own (assets/world/chest.png). */
    wall: '<g class="pgm-glyph"><path d="M-0.34 -0.3 H0.34 V0.3 H-0.34 Z M-0.1 -0.06 L0.04 -0.16 L0.16 -0.04 L0.12 0.14 L-0.04 0.18 L-0.16 0.06 Z" fill-rule="evenodd"/></g><g class="pgm-glyph-cut"><path d="M-0.34 -0.1 H-0.14 M0.2 -0.1 H0.34 M-0.34 0.1 H-0.18 M0.16 0.1 H0.34 M-0.06 -0.3 V-0.14 M0.18 0.1 V0.3 M-0.2 0.1 V0.3 M0.12 -0.3 V-0.12"/></g>',
    hidden: '<g class="pgm-glyph is-line"><path d="M-0.24 0.3 V-0.04 A0.24 0.24 0 0 1 0.24 -0.04 V0.3"/></g><g class="pgm-glyph"><path class="is-veil" d="M-0.24 0.3 V0.06 Q0 -0.04 0.24 0.1 V0.3 Z"/><path d="M0.02 -0.2 L0.05 -0.1 L0.15 -0.07 L0.05 -0.04 L0.02 0.06 L-0.01 -0.04 L-0.11 -0.07 L-0.01 -0.1 Z"/></g>',
    npc: '<g class="pgm-glyph"><path d="M-0.3 -0.24 H0.3 V0.12 H-0.04 L-0.18 0.26 V0.12 H-0.3 Z"/></g>',
  };
  const artSvg = (a, size = 0.92) => (a.glyph ? GLYPH[a.glyph] : a.pin ? atlasSvg(a.pin, size) : `<image href="${a.src}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>`);
  const artHtml = (a) => (!a ? '<i class="pg-glyph" aria-hidden="true"></i>'
    : a.glyph ? `<svg class="pgm-ico" viewBox="-0.5 -0.5 1 1" aria-hidden="true">${GLYPH[a.glyph]}</svg>` : a.pin ? atlasSvg(a.pin, null, ' pgm-ico') : `<img src="${a.src}" alt="">`);

  // Yours: your bench, your shade, your Dreamgate and the markers you've placed, where the save says.
  /* Where a bench is: its pin, which can sit on its room's other drawing (Deepnest_30_b, Ruins1_18_b…), else its room.
     Where you wake after a dreamer (js/progress.js, away) is no bench's room: the dreamer's own pin, by their body.
     Three benches are inside a room the map doesn't draw, and the game puts their pin on the room you enter it from:
     Mato's hut (its door's spot is 1.8 units below the pin, under the cliffs), the Ancestral Mound and Unn's shrine. */
  const BENCH_HOST = { Room_nailmaster: 'Cliffs_02', Crossroads_ShamanTemple: 'Crossroads_06', Room_Slug_Shrine: 'Fungus1_26' };
  const dreamerAt = (scene) => { const id = Object.keys(DREAMER_ROOM).find((k) => DREAMER_ROOM[k] === scene); return id ? gamePin('dreamer', id) : null; };
  const benchPoint = (scene) => {
    const room = BENCH_HOST[scene] || scene, b = pinsOf('bench').find((x) => sceneOf(x[1]) === room);
    return b ? [b[2], b[3]] : dreamerAt(scene) || roomPoint(scene);
  };
  function mineThings() {
    const pr = App.progress, out = [];
    if (pr.bench) {
      const pt = benchPoint(pr.bench);
      // Not a bench (away): on the map only you standing there (youSvg, bare); the Knight in its card and lists.
      if (pt) out.push({ id: 'mine:bench', layer: 'my-bench', p: pt, art: pr.away ? { src: D.art('hud', 'knight') } : { pin: 'bench' }, bare: pr.away,
        name: t(pr.away ? 'pgmRespawn' : 'pgmL_my-bench'), where: where(pr.bench), on: null });
    }
    if (pr.shade && pr.shade.x !== undefined) out.push({ id: 'mine:shade', layer: 'shade', p: [pr.shade.x, pr.shade.y], scene: pr.shade.scene, art: { pin: 'shade' },
      name: t('shadeTag'), where: [where(pr.shade.scene), `${App.NF[0].format(pr.shade.geo)} geo`].filter(Boolean).join(' · '), on: null });
    if (pr.gate && pr.gate.x !== undefined) out.push({ id: 'mine:gate', layer: 'gate', p: [pr.gate.x, pr.gate.y], scene: pr.gate.scene, art: { pin: 'dreamgate' },
      name: pick(D.EQUIPMENT.find((x) => x.id === 'dreamgate')), where: where(pr.gate.scene), on: null });
    (pr.markers || []).forEach((m, i) => out.push({ id: 'mine:m' + i, layer: 'markers', sub: m.c, p: [m.x, m.y], art: { pin: 'marker-' + m.c },
      name: t('pgmM_' + m.c), where: '', on: null }));
    return out;
  }

  function pinsSvg(layers) {
    const showFound = !!prefs.pgMapFound;
    /* With no save (free mode, everything unlocked) the map is a reference: the 112%'s things show,
       not hidden nor dimmed as had (th.ref); the filter still counts them as the sandbox has them. */
    const ref = !App.activeSlot();
    const all = allThings().map((th) => (ref && REF_LAYERS.has(th.layer) ? { ...th, ref: true } : th));
    // In focus, only its things, whatever the filter (what you have, dimmed as always).
    const list = focus ? all.filter((th) => focus.ids.includes(th.id))
      : all.filter((th) => layers.has(th.layer) && !subHidden(th) && (th.on !== true || th.ref || showFound || th.id === selected));
    arrange(list);
    const mine = mineThings().filter((th) => layers.has(th.layer) && !subHidden(th));
    shown = new Map([...list, ...mine].map((th) => [th.id, th]));
    const since = arrive && performance.now() - arrive.at;
    if (arrive && since > ARRIVE_MS) arrive = null;
    const ring = (th) => (arrive && arrive.ids.has(th.id) ? `<circle class="pgm-arrive" r="0.5" style="animation-delay:${-Math.round(since)}ms"/>` : '');
    const pin = (th) => {
      const label = th.name + (th.where ? ' · ' + th.where : '');
      const at = th.at || th.p, o = th.off || [0, 0];
      return `<g class="pgm-pin${(th.on && !th.ref) || th.closed ? ' is-on' : ''}${th.id === selected ? ' is-sel' : ''}${th.p0 ? ' is-fixed' : ''}" style="--px:${at[0].toFixed(3)}px;--py:${(-at[1]).toFixed(3)}px;--ox:${o[0].toFixed(2)}px;--oy:${o[1].toFixed(2)}px"
        data-act="pgmPick" data-id="${esc(th.id)}" role="button" tabindex="0" aria-label="${esc(label)}">
        <title>${esc(label)}</title>
        ${ring(th)}<circle r="0.5"/>${artSvg(th.art)}
        <text class="pgm-lbl" y="1.02">${esc(th.name)}</text></g>`;
    };
    // Yours go on top, where they are (not spread; placeMarks moves one aside if it'd cover a pin), a little bigger, with no disc.
    const mark = (th) => `<g class="pgm-pin pgm-mark is-${th.layer}${th.id === selected ? ' is-sel' : ''}" style="--px:${th.p[0].toFixed(3)}px;--py:${(-th.p[1]).toFixed(3)}px"
        data-act="pgmPick" data-id="${esc(th.id)}" role="button" tabindex="0" aria-label="${esc(th.name + (th.where ? ' · ' + th.where : ''))}">
        <title>${esc(th.name + (th.where ? ' · ' + th.where : ''))}</title>${th.layer === 'my-bench' ? '<circle r="0.62"/>' : ''}${th.bare ? '' : artSvg(th.art, 1.2)}</g>`;
    return list.map(pin).join('') + mine.map(mark).join('') + (layers.has('my-bench') ? youSvg() : '');
  }
  /* You: the Knight standing by your bench, with your bench's layer (as the game shows you on
     its map). Not a pin to pick: nothing to say that the bench doesn't. When your bench moves,
     js/app-knight.js walks him here from the old one, room by room, stepping his run's frames
     (assets/knight/run.png) through this svg's viewBox and turning him with the inner group;
     until he's here, he's painted where that walk has him (pinAt). */
  function youSvg() {
    const pt = App.progress.bench && ((App.knight && App.knight.pinAt()) || benchPoint(App.progress.bench));
    if (!pt) return '';
    return `<g class="pgm-pin pgm-mark pgm-you" style="--px:${pt[0].toFixed(3)}px;--py:${(-pt[1]).toFixed(3)}px;--ox:0.85px" aria-hidden="true">
        <g class="pgm-you-art"><svg class="pgm-atlas" x="-0.52" y="-1.25" width="1.04" height="1.4" viewBox="0 0 104 140"><image href="assets/knight/idle.png" width="104" height="140"/></svg></g></g>`;
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
  let full = false;      // the map in full screen (setFull)
  const svg = () => el.pg.querySelector('.pgm-svg');
  // The pins' size on screen: about 26 px, whatever the zoom.
  function applyView() {
    const s = svg();
    if (!s) return;
    const r = s.getBoundingClientRect();
    if (!r.width) return;                  // still hidden: measured once it shows (afterPaint)
    if (!vb) vb = fitView(r.width, r.height);
    if (pendingFit) { vb = fitBox(pendingFit, r.height / r.width); pendingFit = null; }
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
    placeMarks(s);
    if (near) hideCrowdedLabels(s, zoom);
    paintCard();
  }
  /* Yours sit where they are, on top; but your shade, your Dreamgate or a marker that would cover
     another pin at this zoom steps aside, the nearest way that covers nothing (the pins already
     there, your bench, those of yours placed before it). In the pins' units, as their grid. */
  const MARK_STEPS = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]].map(([x, y]) => [x / Math.hypot(x, y), y / Math.hypot(x, y)]);
  function placeMarks(s) {
    const CLEAR = 1.1;   // a pin's radius (0.5) and a mark's (0.6)
    const taken = [];
    for (const th of shown.values()) {
      if (!MINE[th.layer]) { const [x, y] = pinAt(th); taken.push([x / pinK, -y / pinK]); }
      else if (th.layer === 'my-bench') taken.push([th.p[0] / pinK, -th.p[1] / pinK]);
    }
    for (const th of shown.values()) {
      if (!MINE[th.layer] || th.layer === 'my-bench') continue;
      const x = th.p[0] / pinK, y = -th.p[1] / pinK;
      const free = (o) => taken.every(([tx, ty]) => Math.hypot(x + o[0] - tx, y + o[1] - ty) >= CLEAR);
      let off = [0, 0];
      for (let r = CLEAR; !free(off) && r <= CLEAR * 3; r += CLEAR / 2) off = MARK_STEPS.map(([dx, dy]) => [dx * r, dy * r]).find(free) || off;
      th.at = th.p;
      th.off = off;
      taken.push([x + off[0], y + off[1]]);
      const g = s.querySelector(`.pgm-mark[data-id="${CSS.escape(th.id)}"]`);
      if (g) { g.style.setProperty('--ox', off[0].toFixed(2) + 'px'); g.style.setProperty('--oy', off[1].toFixed(2) + 'px'); }
    }
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
  // Whether you have it: a stag station says so in found (on is for what hides once you have it).
  const hasIt = (th) => (th.found !== undefined ? th.found : !!th.on);
  function btnHtml(th) {
    const a = th.act;
    return !a ? ''
      : a.journal ? `<button type="button" class="text-btn" data-act="pgmJournal" data-id="${esc(a.journal)}">${esc(t('pgmInJournal'))}</button>`
      : a.state ? `<span class="pgm-card-state">${esc(t(hasIt(th) ? STATE_ON[th.layer] || 'pgmGot' : STATE_OFF[th.layer] || 'notFound'))}</span>`
      : a.game ? `<button type="button" class="text-btn" data-act="view" data-value="inventory" title="${esc(t('pgInGameHint'))}">${esc(t('pgmGoInv'))}</button>`
        // In a save from the game (App.saveLock, js/app.js) the card says whether you have it, and marks nothing.
        : App.saveLock() ? `<span class="pgm-card-state">${esc(t(hasIt(th) ? 'pgmGot' : 'notFound'))}</span>`
        : `<button type="button" class="text-btn" ${a.find ? `data-act="pgFind" data-id="${esc(a.find)}"` : `data-act="pgMark" data-key="${a.cat}" data-id="${esc(a.id)}"`} aria-pressed="${hasIt(th)}">${esc(t(hasIt(th) ? 'pgUnmark' : 'pgMark'))}</button>`;
  }
  /* "How to get there": the way from your bench to the pin, on foot through the doors
     (js/app-knight.js, the same way the Knight walks); drawn under the pins while its card is open. */
  let route = null;   // { id, pts } of the way drawn, or { id, pts: null } when there's none
  // Hidden for now: the way-finding is to be improved (abilities, stags, trams) before it shows.
  const ROUTES = false;
  const canRoute = (th) => ROUTES && !!(App.progress.bench && th.scene && th.layer !== 'my-bench');
  function routeHtml(th) {
    if (!canRoute(th)) return '';
    const on = route && route.id === th.id;
    return `<span class="pgm-route-row">
      <button type="button" class="text-btn" data-act="pgmRoute" aria-pressed="${!!(on && route.pts)}">${esc(t(on && route.pts ? 'pgmRouteHide' : 'pgmRoute'))}</button>
      ${on ? `<span class="pgm-card-state">${esc(t(route.pts ? 'pgmRouteNote' : 'pgmRouteNone'))}</span>` : ''}</span>`;
  }
  function routeSvg() {
    const th = route && route.pts && shown.get(route.id);
    if (!th) return '';
    const pts = [...route.pts.slice(0, -1), pinAt(th)];
    return `<g class="pgm-route" aria-hidden="true"><polyline points="${pts.map((p) => `${p[0].toFixed(3)},${(-p[1]).toFixed(3)}`).join(' ')}"/>
      <circle cx="${pts[0][0].toFixed(3)}" cy="${(-pts[0][1]).toFixed(3)}" r="0.12"/></g>`;
  }
  // What the card says of those that aren't picked up: broken, opened, met.
  const STATE_ON = { walls: 'pgmOpened', hidden: 'pgmFoundPlace', chests: 'pgmOpened', rocks: 'pgmBroken', npcs: 'pgmMet' };
  const STATE_OFF = { walls: 'pgmNotOpened', hidden: 'pgmNotFoundPlace', chests: 'pgmNotOpened', rocks: 'pgmNotBroken', npcs: 'pgmNotMet' };
  function cardHtml(th) {
    const btn = btnHtml(th) + routeHtml(th);
    return `<div class="pgm-card${th.text ? ' has-text' : ''}" role="dialog" aria-label="${esc(th.name)}">
      <span class="pgm-card-art">${artHtml(th.art)}</span>
      <span class="pgm-card-t"><b${NT}>${esc(th.name)}</b>${th.where ? `<span${NT}>${esc(th.where)}</span>` : ''}${th.note ? `<span>${esc(th.note)}</span>` : ''}</span>
      ${btn}
      <button type="button" class="icon-btn pgm-card-x" data-act="pgmPick" data-id="" aria-label="${esc(t('importHintOff'))}">${App.cross}</button>
      ${th.text ? `<p class="pgm-card-text"${NT}>${esc(th.text)}</p>` : ''}
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
    // A card with a text: 30 em wide at most, and never wider than the box.
    if (th.text) c.firstElementChild.style.width = Math.min(br.width - 16, 30 * parseFloat(getComputedStyle(c.firstElementChild).fontSize)) + 'px';
    // Whole inside the box: centred on its pin unless that would cut it at an edge.
    const half = c.firstElementChild.offsetWidth / 2 + 8;
    c.style.left = (half * 2 > br.width ? br.width / 2 : Math.max(half, Math.min(br.width - half, sx))) + 'px';
    c.style.top = sy + 'px';
    c.classList.toggle('is-below', sy < c.firstElementChild.offsetHeight + 24);
  }
  const MINE = { 'my-bench': 1, shade: 1, gate: 1, markers: 1 };

  /* ── The filter, under the map (design/16, the sister's): its head with the three choices as
     switches and show all · hide all; then the groups, each folding (prefs.pgMapOpen, all open
     at first) with its total and its own all · none; a layer's picture is its switch, off in
     grey, with its name and how many of its things you have where that's counted ── */
  const openGroups = () => (Array.isArray(prefs.pgMapOpen) ? prefs.pgMapOpen : GROUPS.map((g) => g.id));
  const switchHtml = (value, on, text) =>
    `<button type="button" class="switch" role="switch" aria-checked="${on}" data-act="pgmOpt" data-value="${value}"><span class="switch-track" aria-hidden="true"></span>${esc(text)}</button>`;
  /* The sets of one kind (design/24, C): a caret beside them opens what each holds, read from its
     things on the map (one per member, with its picture), each a switch of its own, so you can
     show just what you want (prefs.pgMapSubOff: 'layer|member' hidden). A member is a stable key,
     not its name: the item, the relic, the foe, the character, the wall's kind, the marker's colour. */
  const INSIDE = ['keys', 'relics', 'other-bosses', 'npcs', 'people', 'walls', 'markers'];
  const insideOpen = new Set();
  const CARET = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1 L8 5 L3 9 Z" fill="currentColor"/></svg>';
  const subOf = (th) => th.sub || String(th.id).split(':').pop();
  const subOff = () => (Array.isArray(prefs.pgMapSubOff) ? prefs.pgMapSubOff : []);
  const subHidden = (th) => INSIDE.includes(th.layer) && subOff().includes(th.layer + '|' + subOf(th));
  // A set's members: { key, name, art }, each once, in its language's order.
  function membersOf(l, things = allThings()) {
    const seen = new Map();
    for (const th of [...things, ...mineThings()]) if (th.layer === l && !seen.has(subOf(th))) seen.set(subOf(th), { key: subOf(th), name: th.name, art: th.art });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, HK.i18n.current));
  }
  const setSubOff = (list) => { prefs.pgMapSubOff = [...new Set(list)]; };
  function insideHtml(l, things, layerOn) {
    const off = subOff();
    const items = membersOf(l, things).map((m) => {
      const on = layerOn && !off.includes(l + '|' + m.key);
      return `<button type="button" class="pgm-sub${on ? ' is-on' : ''}" data-act="pgmSub" data-value="${esc(l + '|' + m.key)}" aria-pressed="${on}">
        <span class="pgm-inside-art">${m.art ? artHtml(m.art) : ''}</span><span${NT}>${esc(m.name)}</span></button>`;
    }).join('');
    return `<div class="pgm-inside" role="group" aria-label="${esc(t('pgmChoose') + ' · ' + layerName(l))}">${items}</div>`;
  }
  function filterHtml(layers, things) {
    const count = (l) => {
      const of = things.filter((th) => th.layer === l && (th.on !== null || th.found !== undefined));
      return [of.filter(hasIt).length, of.length];
    };
    const n = (got, max) => (max ? `<span class="pgm-kind-n${got === max ? ' is-full' : ''}"><b>${App.NF[0].format(got)}</b><i class="u">/${App.NF[0].format(max)}</i></span>` : '');
    const chip = (l) => {
      const art = D.COLLECTIBLE_KINDS[l] ? kindArt(l) : LAYER_ART[l];
      const btn = `<button type="button" class="pgm-kind${layers.has(l) ? ' is-on' : ''}" data-act="pgmLayer" data-value="${l}" aria-pressed="${layers.has(l)}">
        <span class="pgm-kind-art${App.darkCls(art && art.src)}">${art ? artHtml(art) : '<i class="pgm-ico is-name" aria-hidden="true">A</i>'}</span><span class="pgm-kind-t"${NT}>${esc(layerName(l))}</span>${n(...count(l))}</button>`;
      if (!INSIDE.includes(l)) return btn;
      // A set of one kind: its caret opens its members as switches, in a row under the chips (insideHtml);
      // with some of them hidden, the set says so (is-some).
      const open = insideOpen.has(l), label = t('pgmChoose') + ' · ' + layerName(l);
      const some = layers.has(l) && subOff().some((x) => x.startsWith(l + '|'));
      return `<span class="pgm-set${some ? ' is-some' : ''}">${btn}<button type="button" class="pgm-more" data-act="pgmInside" data-value="${l}" aria-expanded="${open}" aria-label="${esc(label)}" title="${esc(label)}">${CARET}</button></span>${open ? insideHtml(l, things, layers.has(l)) : ''}`;
    };
    const title = (g) => (g === 'c112' ? t('pgmG_c112', { pct: pctSpace() }) : t('pgmG_' + g));
    const open = openGroups();
    const group = (g) => {
      const tot = g.layers.map(count).reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
      const someSub = subOff().some((x) => g.layers.includes(x.slice(0, x.indexOf('|'))));
      const isOpen = open.includes(g.id), on = g.layers.filter((l) => layers.has(l)).length, all = on === g.layers.length && !someSub;
      const state = all ? 'is-all' : on ? 'is-some' : 'is-none';
      /* Its caret folds it; its title switches the whole group on or off (Albert, 1 Oct 2026: it
         was an "All · None" button at the end of the line). */
      return `<section class="pgm-sec${isOpen ? ' is-open' : ''}">
        <div class="pgm-sec-h">
          <button type="button" class="pgm-fold" data-act="pgmFold" data-value="${g.id}" aria-expanded="${isOpen}" aria-label="${esc(t(isOpen ? 'pgmFoldClose' : 'pgmFoldOpen', { g: title(g.id) }))}">
            <svg class="pgm-caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1 L8 5 L3 9 Z" fill="currentColor"/></svg></button>
          <button type="button" class="pgm-sec-sw ${state}" role="switch" aria-checked="${all}" data-act="pgmGroup" data-value="${g.id}" title="${esc(t(all ? 'pgmGrpHide' : 'pgmGrpShow'))}">
            <span class="pgm-sec-t">${esc(title(g.id))}</span>${n(...tot)}</button>
        </div>
        ${isOpen ? `<div class="pgm-kinds" role="group" aria-label="${esc(title(g.id))}">${g.layers.map(chip).join('')}</div>` : ''}
      </section>`;
    };
    return `<section class="pgm-filter" aria-label="${esc(t('pgMapKinds'))}">
      <div class="pgm-filter-bar">
        <h3 class="pgm-filter-t">${esc(t('pgMapKinds'))}</h3>
        <div class="pgm-opts">${switchHtml('whole', !!prefs.pgMapWhole, t('pgMapWhole'))}${switchHtml('found', !!prefs.pgMapFound, t('pgMapShowFound'))}${switchHtml('names', layers.has('names'), t('pgMapNames'))}</div>
        <span class="pgm-all">
          <button type="button" class="text-btn" data-act="pgmAll" data-value="show">${esc(t('pgmShowAll'))}</button>
          <button type="button" class="text-btn" data-act="pgmAll" data-value="hide">${esc(t('pgmHideAll'))}</button>
        </span>
      </div>
      <div class="pgm-secs">${GROUPS.filter((g) => !g.save || App.activeSlot()).map(group).join('')}</div>
    </section>`;
  }

  // Full screen's button: the four corners of a frame, opening out, and closing in to leave it.
  const corners = (d) => `<svg class="ic is-lg" width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const FULL_IN = corners('M1.5 4.5 V1.5 H4.5 M7.5 1.5 H10.5 V4.5 M10.5 7.5 V10.5 H7.5 M4.5 10.5 H1.5 V7.5');
  const FULL_OUT = corners('M4.5 1.5 V4.5 H1.5 M10.5 4.5 H7.5 V1.5 M7.5 10.5 V7.5 H10.5 M1.5 7.5 H4.5 V10.5');

  /* ── The whole view ── */
  function renderPgMap() {
    const layers = shownLayers();
    const pins = pinsSvg(layers);
    return `<div class="pgm">
      <div class="pgm-bar">
        ${searchHtml()}
      </div>
      <div class="pgm-box">
        ${focusHtml()}
        ${admin() ? adminHtml() : ''}
        <span class="pgm-zoom">
          <button type="button" class="step" data-act="pgmZoom" data-value="in" aria-label="${esc(t('pgZoomIn'))}" title="${esc(t('pgZoomIn'))}">+</button>
          <button type="button" class="step" data-act="pgmZoom" data-value="out" aria-label="${esc(t('pgZoomOut'))}" title="${esc(t('pgZoomOut'))}">−</button>
          <button type="button" class="step pgm-big" data-act="pgmBig" aria-pressed="${!!prefs.pgMapBig}" aria-label="${esc(t('pgMapBig'))}" title="${esc(t(prefs.pgMapBig ? 'pgMapSmall' : 'pgMapBig'))}">${prefs.pgMapBig ? '⤡' : '⤢'}</button>
          <button type="button" class="step pgm-full" data-act="pgmFull" aria-pressed="${full}" aria-label="${esc(t('pgMapFull'))}" title="${esc(t(full ? 'pgMapFullExit' : 'pgMapFull'))}">${full ? FULL_OUT : FULL_IN}</button>
        </span>
        <svg class="pgm-svg${admin() ? ' is-admin' : ''}" viewBox="${vb ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : `${FIT.x} ${FIT.y} ${FIT.w} ${FIT.h}`}" role="img" aria-label="${esc(t('pgTabMap'))}">
          <g class="pgm-rooms">${roomsSvg()}</g>
          ${routeSvg()}
          ${admin() ? `<g class="pgm-fixes">${fixLinesSvg()}</g>` : ''}
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

  /* ── "See it on the map", from the other screens ──
     A thing elsewhere on the site (a Progress plate, the Inventory, a Journal entry, Your game's
     lists) names what it is as a target, "kind:id"; mapTargets says which of the map's things
     those are. One: the map centres on it and opens its card. Several: focus, the map shows only
     them, fitted, with a bar to step through them (the missing first, the nearest to your bench
     first) and to leave. Nothing on the map: no button (mapPinHtml). */
  let thingIds = null;   // every thing's id, once (they don't change with your game)
  function mapTargets(target) {
    if (!thingIds) thingIds = new Set([...allThings(), ...mineThings()].map((th) => th.id));
    const [kind, a, b] = String(target).split(':');
    let ids = [];
    const ofKind = (k) => CO.ITEMS.filter((it) => it.kind === k).map((it) => it.id);
    if (kind === 'collect') ids = CO.KINDS.includes(a) ? ofKind(a) : [a];
    else if (kind === 'c112') {
      ids = a === 'spells' ? (/\d$/.test(b) ? ['c:' + b] : ['c:' + b + '1', 'c:' + b + '2']) : a === 'masks' ? ofKind('mask-shard') : a === 'vessels' ? ofKind('vessel-fragment')
        : a === 'nail' ? [...ofKind('pale-ore'), 'people:nailsmith'] : b === 'godtuner' ? ['k:godtuner']
        : b === 'dreamgate' ? ['people:seer'] : ['c:' + b];   // the Seer gives the Dreamgate
    } else if (kind === 'key') ids = ['k:' + a, 'c:' + a];   // the King's Brand is the 112%'s
    else if (kind === 'foe') ids = [...thingIds].filter((id) => id.startsWith('f:') && id.endsWith(':' + a)).concat(['c:' + a, 'd:' + a]);
    else if (kind === 'cloak') ids = ['c:mothwing-cloak', 'c:shade-cloak'];
    else if (kind === 'npc') ids = [...thingIds].filter((id) => id.startsWith('n:' + a + ':'));
    return ids.filter((id) => thingIds.has(id));
  }
  // The view around some points, in the box's proportions (ratio: height / width), a room or two at
  // least; a little more room below, where focus's bar lies.
  function fitBox(pts, ratio) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => -p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys) + 2.5;
    const w = Math.min(FIT.w * 1.2, Math.max(6, x1 - x0 + 3, (y1 - y0 + 3) / ratio)), h = w * ratio;
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
  }
  function showOnMap(target, name) {
    const ids = mapTargets(target);
    if (!ids.length) return;
    const all = new Map([...allThings(), ...mineThings()].map((th) => [th.id, th]));
    const things = ids.map((id) => all.get(id)).filter(Boolean);
    query = ''; found = []; route = null;
    if (things.length === 1) {
      // Its layer shown, if you'd hidden it (as the search does).
      const l = things[0].layer;
      if (Array.isArray(prefs.pgMapOff) && prefs.pgMapOff.includes(l)) { prefs.pgMapOff = prefs.pgMapOff.filter((x) => x !== l); savePrefs(); }
      focus = null; selected = things[0].id; lookAt(things[0].p);
    } else {
      // The missing first; among them, the nearest to your bench (when there's one) first.
      const at = App.progress.bench && benchPoint(App.progress.bench);
      const d = (th) => (at ? Math.hypot(th.p[0] - at[0], th.p[1] - at[1]) : 0);
      const order = things.slice().sort((x, y) => (hasIt(x) - hasIt(y)) || (d(x) - d(y))).map((th) => th.id);
      focus = { ids, order, i: -1, name: name || things[0].name, art: things[0].art };
      selected = '';
      pendingFit = things.map((th) => th.p);
      vb = vb || { ...FIT };
    }
    arrive = { ids: new Set(things.map((th) => th.id)), at: performance.now() };
    actions.view({ dataset: { value: 'map' }, closest: () => null });
    render();
  }
  // The pin to go there, or '' when it has no place on the map.
  const PIN = '<svg class="ic" width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><path d="M6 0.6a4.9 4.9 0 0 0-4.9 4.9c0 3.5 4.9 8 4.9 8s4.9-4.5 4.9-8A4.9 4.9 0 0 0 6 0.6zm0 6.7a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z"/></svg>';
  function mapPinHtml(target, name, cls = '') {
    if (!mapTargets(target).length) return '';
    const label = t('seeOnMap') + (name ? ' · ' + name : '');
    return `<button type="button" class="icon-btn map-pin${cls ? ' ' + cls : ''}" data-act="toMap" data-target="${esc(target)}" data-name="${esc(name || '')}" aria-label="${esc(label)}" title="${esc(label)}">${PIN}</button>`;
  }
  // The same as words, a text button with the pin before them (the Journal's page), or other words (Progress's "See all 16").
  function mapLinkHtml(target, name, text = t('seeOnMap')) {
    if (!mapTargets(target).length) return '';
    return `<button type="button" class="text-btn map-link" data-act="toMap" data-target="${esc(target)}" data-name="${esc(name || '')}">${PIN}${esc(text)}</button>`;
  }
  // A plate with its pin beside it (css .gplate-wrap), or the plate as it was.
  const pinned = (plate, target, name) => { const pin = mapPinHtml(target, name); return pin ? `<span class="gplate-wrap">${plate}${pin}</span>` : plate; };
  // The bar over the map while in focus: what it is, how many (and how many you're missing), ‹ i of n ›, and out.
  function focusHtml() {
    if (!focus) return '';
    const all = new Map(allThings().map((th) => [th.id, th]));
    const things = focus.ids.map((id) => all.get(id)).filter(Boolean);
    const missing = things.filter((th) => th.on === false || th.found === false).length;
    const n = focus.order.length, i = focus.i;
    return `<div class="pgm-focus" role="group" aria-label="${esc(focus.name)}">
      <span class="pgm-card-art">${artHtml(focus.art)}</span>
      <span class="pgm-focus-t"><b${NT}>${esc(focus.name)}</b><span>${esc(t('pgmFocusCount', { n: App.NF[0].format(things.length) }))}${missing ? ' · ' + esc(t('pgmFocusMissing', { n: App.NF[0].format(missing) })) : ''}</span></span>
      <span class="pgm-focus-step">
        <button type="button" class="icon-btn" data-act="pgmStep" data-value="-1" aria-label="${esc(t('pgmFocusPrev'))}">‹</button>
        <span class="pgm-focus-i">${i < 0 ? '' : esc(t('pgmFocusOf', { i: App.NF[0].format(i + 1), n: App.NF[0].format(n) }))}</span>
        <button type="button" class="icon-btn" data-act="pgmStep" data-value="1" aria-label="${esc(t('pgmFocusNext'))}">›</button>
      </span>
      <button type="button" class="text-btn" data-act="pgmUnfocus">${esc(t('pgmFocusExit'))}</button>
    </div>`;
  }
  Object.assign(actions, {
    toMap(node) { showOnMap(node.dataset.target, node.dataset.name); },
    pgmStep(node) {
      if (!focus) return;
      const n = focus.order.length;
      focus.i = focus.i < 0 ? (Number(node.dataset.value) > 0 ? 0 : n - 1) : (focus.i + Number(node.dataset.value) + n) % n;
      const th = allThings().find((x) => x.id === focus.order[focus.i]);
      if (th) { selected = th.id; lookAt(th.p); }
      render();
    },
    pgmUnfocus() { focus = null; selected = ''; render(); },
  });

  /* ── The search, over the map: everything it can show (the hidden layers' and what you have
     too) and the map's own titles, matched by name and place, whatever the case and the accents.
     Typing repaints only the list (a repaint would take the focus); picking one shows its layer
     if hidden, centres the map on it close up and opens its card. A title only takes you there. */
  let query = '', found = [], cursor = 0;
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function searchHtml() {
    return `<div class="pgm-search" role="search">
      <label class="search">${App.lens}<input type="search" class="pgm-q" value="${esc(query)}" placeholder="${esc(t('pgmSearch'))}" aria-label="${esc(t('pgmSearch'))}"
        autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="pgm-results" aria-autocomplete="list"></label>
      <ul class="pgm-results" id="pgm-results" role="listbox" hidden></ul>
    </div>`;
  }
  function searchPool() {
    const things = [...allThings(), ...mineThings()].map((th) => ({ th, name: th.name, where: th.where || '', art: th.art }));
    const areas = M.AREA_IDS.map((id, i) => (id && R.AREAS[id] ? { p: AREA_AT[i], name: pick(R.AREAS[id]), where: t('pgmSearchTitle') } : null));
    const places = M.PLACE_LABELS.map(([scene, name]) => {
      const p = roomPoint(scene), a = R.areaOf(scene);
      return p && { p, name: pick(name).replace(/\n/g, ' '), where: [t('pgmSearchTitle'), a && pick(R.AREAS[a])].filter(Boolean).join(' · ') };
    });
    return [...areas, ...places].filter(Boolean).concat(things);
  }
  // Every word of the query in its name or place; those whose name starts with it first, then by name.
  function search(q) {
    const words = fold(q).split(' ').filter(Boolean);
    if (!words.length) return [];
    const whole = words.join(' ');
    return searchPool()
      .map((r) => ({ r, n: fold(r.name), all: fold(r.name + ' ' + r.where) }))
      .filter((x) => words.every((w) => x.all.includes(w)))
      .map((x) => ({ ...x, rank: x.n.startsWith(whole) ? 0 : x.n.includes(whole) ? 1 : 2 }))
      .sort((a, b) => a.rank - b.rank || (a.r.th ? 1 : 0) - (b.r.th ? 1 : 0) || a.n.localeCompare(b.n))
      .slice(0, 8).map((x) => x.r);
  }
  function paintResults() {
    const input = el.pg.querySelector('.pgm-q'), list = el.pg.querySelector('.pgm-results');
    if (!input || !list) return;
    const open = !!fold(query);
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) { list.innerHTML = ''; input.removeAttribute('aria-activedescendant'); return; }
    list.innerHTML = found.length ? found.map((r, i) => `<li id="pgm-r${i}" class="pgm-result${i === cursor ? ' is-cur' : ''}" role="option" aria-selected="${i === cursor}"
        data-act="pgmGo" data-i="${i}"><span class="pgm-card-art">${r.art ? artHtml(r.art) : '<i class="pgm-ico is-name" aria-hidden="true">A</i>'}</span>
        <span class="pgm-card-t"><b${NT}>${esc(r.name)}</b>${r.where ? `<span${NT}>${esc(r.where)}</span>` : ''}</span></li>`).join('')
      : App.emptyHtml(esc(t('pgmSearchNone')), '', { tag: 'li', cls: 'pgm-result is-inline' });
    if (found.length) input.setAttribute('aria-activedescendant', 'pgm-r' + cursor); else input.removeAttribute('aria-activedescendant');
  }
  // The map centred on a point, about six units across (a room or two around it).
  function lookAt(p) {
    const s = svg();
    const r = s && s.getBoundingClientRect();
    const ratio = vb ? vb.h / vb.w : r && r.width ? r.height / r.width : FIT.h / FIT.w;
    const w = Math.min(6, FIT.w), h = w * ratio;
    vb = { x: p[0] - w / 2, y: -p[1] - h / 2, w, h };
  }
  function go(r) {
    query = ''; found = []; cursor = 0; focus = null;
    if (r.th) {
      const l = r.th.layer;
      if (Array.isArray(prefs.pgMapOff) && prefs.pgMapOff.includes(l)) { prefs.pgMapOff = prefs.pgMapOff.filter((x) => x !== l); savePrefs(); }
      selected = r.th.id;
      lookAt(r.th.p);
    } else {
      lookAt(r.p);
    }
    render();
  }
  el.pg.addEventListener('input', (e) => {
    if (!e.target.matches || !e.target.matches('.pgm-q')) return;
    query = e.target.value;
    found = search(query);
    cursor = 0;
    paintResults();
  });
  el.pg.addEventListener('keydown', (e) => {
    if (!e.target.matches || !e.target.matches('.pgm-q')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!found.length) return;
      e.preventDefault();
      cursor = (cursor + (e.key === 'ArrowDown' ? 1 : found.length - 1)) % found.length;
      paintResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (found[cursor]) go(found[cursor]);
    } else if (e.key === 'Escape' && fold(query)) {
      e.preventDefault();
      query = ''; found = []; cursor = 0;
      e.target.value = '';
      paintResults();
    }
  });
  // A tap on the list keeps the focus in the box (the click then picks); leaving the box closes it.
  el.pg.addEventListener('mousedown', (e) => { if (e.target.closest && e.target.closest('.pgm-results')) e.preventDefault(); });
  el.pg.addEventListener('focusout', (e) => {
    if (!e.target.matches || !e.target.matches('.pgm-q')) return;
    const list = el.pg.querySelector('.pgm-results');
    if (list && !list.contains(e.relatedTarget)) { list.hidden = true; e.target.setAttribute('aria-expanded', 'false'); }
  });
  el.pg.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches('.pgm-q') && fold(query)) { found = search(query); paintResults(); } });
  Object.assign(actions, {
    pgmGo(node) { const r = found[Number(node.dataset.i)]; if (r) go(r); },
  });

  /* ── Moving around ── */
  const touches = new Map();
  let drag = null, pinch = null, moved = false, dragEnd = 0;
  let pinDrag = null;   // the admin mode: { id, g, p0, from, p } while a pin is being dragged
  el.pg.addEventListener('pointerdown', (e) => {
    const s = svg();
    if (!s || !s.contains(e.target)) return;
    // The admin mode: a pin (not one of your marks) comes along with the pointer, the map stays.
    if (admin() && !touches.size) {
      const g = e.target.closest('.pgm-pin[data-id]'), th = g && !g.classList.contains('pgm-mark') && shown.get(g.dataset.id);
      if (th) { pinDrag = { id: th.id, g, p0: th.p, from: toMap(e.clientX, e.clientY), p: null }; return; }
    }
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
    if (pinDrag) {
      // The pin's own point follows the pointer (the SVG's y is the map's, flipped); its place in its group stays.
      const [mx, my] = toMap(e.clientX, e.clientY);
      const p = [pinDrag.p0[0] + (mx - pinDrag.from[0]), pinDrag.p0[1] - (my - pinDrag.from[1])];
      if (!pinDrag.p && Math.hypot(p[0] - pinDrag.p0[0], p[1] - pinDrag.p0[1]) < pinK * 0.15) return;   // a tap, not a drag
      pinDrag.p = p;
      pinDrag.g.style.setProperty('--px', p[0].toFixed(3) + 'px');
      pinDrag.g.style.setProperty('--py', (-p[1]).toFixed(3) + 'px');
      return;
    }
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
    if (pinDrag) {
      const d = pinDrag;
      pinDrag = null;
      // Let go after a drag: the move is kept and the pin chosen; the click that follows picks nothing.
      if (d.p) { move(d.id, d.p); selected = d.id; dragEnd = performance.now(); render(); focusPin(); }
      return;
    }
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
    // The admin mode: the arrows nudge the pin by a fiftieth of a unit (a tenth with Shift).
    const ARROW = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const th = admin() && pin && ARROW[e.key] && !pin.classList.contains('pgm-mark') && shown.get(pin.dataset.id);
    if (th) {
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 0.02;
      move(th.id, [th.p[0] + ARROW[e.key][0] * step, th.p[1] + ARROW[e.key][1] * step]);
      selected = th.id;
      render();
      focusPin();
    }
  });
  /* The large Map leaves the page's column for the window's whole width (css: .pg.is-big). 100vw would
     count the scrollbar, so the page's real width goes to CSS as --page-w. */
  const pageWidth = () => document.documentElement.style.setProperty('--page-w', document.documentElement.clientWidth + 'px');
  pageWidth();
  window.addEventListener('resize', () => { pageWidth(); if (prefs.view === 'map') applyView(); });

  /* Full screen, a state and not a pref (the browser wants a tap to go in): the map's box over
     the whole window with the search on it (css: .pg.is-full), and the page itself full screen
     where the browser can; where it can't (an iPhone, an iframe), it fills the window. The page
     and not the box: the box is repainted with every render, and what hangs from <body> has to
     show. Out by its button, by Esc, or by leaving the Map (setView, js/app.js). */
  const root = document.documentElement;
  const fsEnter = root.requestFullscreen || root.webkitRequestFullscreen;
  const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
  const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const fsCan = !!(fsEnter && fsExit && (document.fullscreenEnabled || document.webkitFullscreenEnabled));
  const quiet = (f) => { try { const p = f(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* refused: it fills the window */ } };
  // Out of it without painting: whoever calls paints.
  function fullOff() {
    if (!full) return;
    full = false; vb = null;
    el.pg.classList.remove('is-full');
    if (fsCan && fsOn()) quiet(() => fsExit.call(document));
  }
  function setFull(on) {
    if (on === full) return;
    if (on) { full = true; vb = null; if (fsCan) quiet(() => fsEnter.call(root)); } else fullOff();
    render();
    const btn = el.pg.querySelector('.pgm-full');
    if (btn) btn.focus({ preventScroll: true });
  }
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
    if (full && !fsOn()) setFull(false);                          // Esc, or the browser's own way out
    else if (prefs.view === 'map') { vb = null; applyView(); }    // in, or out by its button: fitted to the window as it is now
  });
  // Esc where the browser doesn't take it (filling the window); the search's own Esc comes first.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && full && !e.defaultPrevented) setFull(false); });

  Object.assign(actions, {
    pgmFull() { setFull(!full); },
    pgmPick(node) {
      selected = node.dataset.id && node.dataset.id !== selected ? node.dataset.id : '';
      if (!route || route.id !== selected) route = null;
      render();
      if (admin()) focusPin();
    },
    // The way to the chosen pin, or away again; drawn, the map is fitted to it.
    pgmRoute() {
      const th = selected && shown.get(selected);
      if (!th) return;
      if (route && route.id === th.id && route.pts) { route = null; render(); return; }
      const pts = App.knight.route(App.progress.bench, th.scene, pinAt(th));
      route = { id: th.id, pts: pts && pts.length > 1 ? pts : null };
      if (route.pts) { const r = svg().getBoundingClientRect(); vb = fitBox(route.pts, r.height / r.width); }
      render();
    },
    // An enemy's entry, read in the Hunter's Journal.
    pgmJournal(node) {
      App.hjCursor = node.dataset.id;
      actions.view({ dataset: { value: 'journal' }, closest: () => null });
    },
    /* A layer's switch. A set with some members hidden: showing it whole first; otherwise on or
       off, and its members with it. */
    pgmLayer(node) {
      const l = node.dataset.value;
      const on = shownLayers().has(l), some = subOff().some((x) => x.startsWith(l + '|'));
      setSubOff(subOff().filter((x) => !x.startsWith(l + '|')));
      if (!(on && some)) prefs.pgMapOff = on ? [...prefs.pgMapOff, l] : prefs.pgMapOff.filter((x) => x !== l);
      savePrefs();
      render();
    },
    /* One member of a set. With the set hidden, it shows that member alone; hiding the last one
       shown hides the set (and its members come back whole the next time it's shown). */
    pgmSub(node) {
      const v = node.dataset.value, l = v.slice(0, v.indexOf('|'));
      const keys = membersOf(l).map((m) => l + '|' + m.key);
      if (!shownLayers().has(l)) {
        prefs.pgMapOff = prefs.pgMapOff.filter((x) => x !== l);
        setSubOff([...subOff().filter((x) => !x.startsWith(l + '|')), ...keys.filter((k) => k !== v)]);
      } else {
        const off = subOff().includes(v) ? subOff().filter((x) => x !== v) : [...subOff(), v];
        if (keys.every((k) => off.includes(k))) {
          prefs.pgMapOff = [...prefs.pgMapOff, l];
          setSubOff(off.filter((x) => !x.startsWith(l + '|')));
        } else setSubOff(off);
      }
      savePrefs();
      render();
    },
    // The three choices under the map. The whole map and what you have are choices of yours, not
    // the save's: a bench doesn't undo them. The area names are a layer.
    pgmOpt(node) {
      const v = node.dataset.value;
      if (v === 'whole') prefs.pgMapWhole = !prefs.pgMapWhole;
      else if (v === 'found') prefs.pgMapFound = !prefs.pgMapFound;
      else if (v === 'names') {
        const on = shownLayers().has('names');
        prefs.pgMapOff = on ? [...prefs.pgMapOff, 'names'] : prefs.pgMapOff.filter((x) => x !== 'names');
      }
      savePrefs();
      render();
    },
    pgmFold(node) {
      const id = node.dataset.value, open = openGroups();
      prefs.pgMapOpen = open.includes(id) ? open.filter((x) => x !== id) : [...open, id];
      savePrefs();
      render();
    },
    // A group's all · none: none when every layer in it is shown, all otherwise.
    pgmGroup(node) {
      const g = GROUPS.find((x) => x.id === node.dataset.value);
      if (!g) return;
      const shown = shownLayers(), all = g.layers.every((l) => shown.has(l)) && !subOff().some((x) => g.layers.includes(x.slice(0, x.indexOf('|'))));
      prefs.pgMapOff = all ? [...new Set([...prefs.pgMapOff, ...g.layers])] : prefs.pgMapOff.filter((x) => !g.layers.includes(x));
      setSubOff(subOff().filter((x) => !g.layers.includes(x.slice(0, x.indexOf('|')))));
      savePrefs();
      render();
    },
    pgmInside(node) {
      const l = node.dataset.value;
      if (insideOpen.has(l)) insideOpen.delete(l); else insideOpen.add(l);
      render();
    },
    pgmAll(node) {
      prefs.pgMapOff = node.dataset.value === 'hide' ? [...LAYERS] : [];
      setSubOff([]);
      savePrefs();
      render();
    },
    /* The large map, a choice (prefs.pgMapBig): the window's whole width and height (css:
       .pg.is-big), refitted, and brought under the bar so it's seen whole. */
    pgmBig() {
      prefs.pgMapBig = !prefs.pgMapBig;
      savePrefs();
      vb = null;
      render();
      const btn = el.pg.querySelector('.pgm-big'), b = box();
      if (btn) btn.focus({ preventScroll: true });
      if (prefs.pgMapBig && b) b.scrollIntoView({ block: 'start' });
    },
    pgmZoom(node) {
      const v = node.dataset.value;
      zoomAt(v === 'in' ? 1 / 1.4 : 1.4, vb.x + vb.w / 2, vb.y + vb.h / 2);
    },
  });

  // The map fitted to some points on the next paint (debug-walk.html fits it to a way).
  const fitTo = (pts) => { pendingFit = pts; vb = vb || { ...FIT }; render(); };
  Object.assign(App, { renderPgMap, pgMapAfterPaint: afterPaint, pgmIsFull: () => full, pgmFullOff: fullOff, pgmBenchPoint: benchPoint, pgmDoorPoint: doorPoint, pgmFitTo: fitTo, mapTargets, mapPinHtml, mapLinkHtml, pinned, showOnMap,
    // A room's area and place, and a collectible's price: the Progress plates of the shards say them too.
    placeName: where, priceOf,
    // One of the game's map pins as a picture (the Progress plates of the Dreamers and the Colosseum).
    pinArtHtml: (key) => atlasSvg(key, null, ' pg-atlas'),
    // Your game's map of the area you rest in (js/app-home.js): the same rooms, pins and places.
    pgmRoomsSvg: roomsSvg, pgmAtlasSvg: atlasSvg, pgmItemPoint: (id) => fixOf(id) || COL_POS[id] || null,
    // Whether the filter shows a collectible's kind (Your game's area map follows it).
    pgmKindShown: (kind) => shownLayers().has(layerOfKind(kind)) });
})();
