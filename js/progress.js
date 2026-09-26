/* js/progress.js — what a game has beyond the Knight's numbers: a slot's hollow.progress.
   Pure: no DOM and no language. The build, the charms found, the Journal, the Hall and the door
   have their own keys; this one keeps the rest, as the game's playerData says it:
     ids     what you have or have done, only those: equipment and key items, the Dreamers, the
             Colosseum's trials, the pantheons cleared… (IDS, each with where the save says it)
     counts  what you carry, numbers: geo, essence, the loose mask shards and vessel fragments,
             pale ore, rancid eggs, simple keys, the four relics and the geo in Millibelle's bank
     found   the collectibles you have (js/collectibles.js): each grub, shard, relic, root…
     bench   the room of the bench you'd wake up at (its area: js/rooms.js)
     shade   where your shade waits (its room, and x, y on the game's map) and the geo it carries, or null
     gate    where your Dreamgate is (its room, and x, y on the map), or null
     statues the Hall of Gods' statues unlocked (statueState<X>.isUnlocked: the boss beaten in the
             kingdom), or null when it isn't known (no save): then none is shown locked
     markers the markers you've placed on the game's map (placedMarkers_r/b/y/w: its Shell,
             Scarab, Token and Gleaming markers), each with its colour and x, y on the map
     mapped  the rooms you know: the ones you've been to (scenesVisited) and the ones the Quill
             has drawn (scenesMapped). The map draws them whole; the game only would with the
             area's map bought, but the site's map is for seeing where you've been
   Everything is marked by hand as well, like the Journal; a save linked to the game overwrites
   it on every bench. bench and shade only come from a save. The 112% is counted in
   js/completion.js. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const CO = HK.collectibles || require('./collectibles.js');
  const FOUND = CO.ITEMS.map((it) => it.id);

  const doorDone = (n) => (pd) => {
    const st = pd['bossDoorStateTier' + n];
    return !!st && typeof st === 'object' && !!st.completed;
  };
  // A fragile charm given to the Divine and not yet back unbreakable: it's gone meanwhile.
  const withDivine = (gave, unbreakable) => (pd) => !!pd[gave] && !pd[unbreakable];
  // One broken by dying with it on (brokenCharm_<n>): you have it, but it can't be worn until
  // Leg Eater repairs it (wiki, "Fragile Heart"). An unbreakable one never is.
  const broken = (n, unbreakable) => (pd) => !!pd['brokenCharm_' + n] && !pd[unbreakable];

  /* id → the playerData bool that says it, or a test. The order is the one they're shown in. */
  const IDS = Object.freeze({
    // Equipment (the 112%'s, two points each) and the rest of the inventory's abilities.
    'mantis-claw': 'hasWalljump', 'monarch-wings': 'hasDoubleJump', 'crystal-heart': 'hasSuperDash',
    'isma-tear': 'hasAcidArmour', 'kings-brand': 'hasKingsBrand', 'dreamgate': 'hasDreamGate',
    'lumafly-lantern': 'hasLantern',
    // Key items. A key stays found once used.
    'city-crest': (pd) => !!pd.hasCityKey || !!pd.openedCityGate, 'shopkeepers-key': (pd) => !!pd.hasSlykey || !!pd.gaveSlykey,
    'elegant-key': (pd) => !!pd.hasWhiteKey || !!pd.usedWhiteKey, 'love-key': (pd) => !!pd.hasLoveKey || !!pd.openedLoveDoor,
    'tram-pass': 'hasTramPass',
    // The Dream Nail's two steps after finding it.
    'dream-awakened': 'dreamNailUpgraded', 'seer-ascended': 'mothDeparted',
    // Bosses the Journal can't tell apart: it has one Hornet for her two fights.
    'hornet-sentinel': 'hornetOutskirtsDefeated',
    'monomon': 'monomonDefeated', 'lurien': 'lurienDefeated', 'herrah': 'hegemolDefeated',
    'trial-warrior': 'colosseumBronzeCompleted', 'trial-conqueror': 'colosseumSilverCompleted',
    'trial-fool': 'colosseumGoldCompleted',
    'banishment': 'destroyedNightmareLantern',
    'godtuner': 'hasGodfinder',
    // The door keeps the bindings (hollow.bindings); whether a pantheon was cleared at all, here.
    'pantheon-master': doorDone(1), 'pantheon-artist': doorDone(2), 'pantheon-sage': doorDone(3),
    'pantheon-knight': doorDone(4), 'pantheon-hallownest': doorDone(5),
    'divine-heart': withDivine('gaveFragileHeart', 'fragileHealth_unbreakable'),
    'divine-greed': withDivine('gaveFragileGreed', 'fragileGreed_unbreakable'),
    'divine-strength': withDivine('gaveFragileStrength', 'fragileStrength_unbreakable'),
    'broken-heart': broken(23, 'fragileHealth_unbreakable'), 'broken-greed': broken(24, 'fragileGreed_unbreakable'),
    'broken-strength': broken(25, 'fragileStrength_unbreakable'),
  });
  const ID_LIST = Object.keys(IDS);

  /* id → [the playerData int, the most there can be]. The shards and fragments are the loose
     ones: the fourth shard makes a mask and the third fragment a vessel, and they go back to 0.
     The relics' maximum is how many there are in the kingdom, the eggs' what the wiki counts
     ("Rancid Egg": 80 from Tuk and 21 elsewhere). */
  const COUNTS = Object.freeze({
    geo: ['geo', 9999999], essence: ['dreamOrbs', 9999],
    shards: ['heartPieces', 3], fragments: ['vesselFragments', 2],
    'pale-ore': ['ore', 6], 'rancid-egg': ['rancidEggs', 101], 'simple-key': ['simpleKeys', 4],
    'wanderers-journal': ['trinket1', 14], 'hallownest-seal': ['trinket2', 17],
    'kings-idol': ['trinket3', 8], 'arcane-egg': ['trinket4', 4],
    bank: ['bankerBalance', 9999999],
  });
  const COUNT_LIST = Object.keys(COUNTS);

  const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);
  const clamp = (id, v) => Math.max(0, Math.min(COUNTS[id][1], int(v)));
  const SCENE = /^[A-Za-z0-9_]{1,64}$/;
  const scene = (s) => (typeof s === 'string' && SCENE.test(s) && s !== 'None' ? s : '');

  const EMPTY = Object.freeze({ ids: [], counts: {}, found: [], bench: '', shade: null, gate: null, statues: null, mapped: [], markers: [] });
  // The game's four markers, by the letter of their playerData list, six of each at most.
  const MARKERS = ['r', 'b', 'y', 'w'];
  // A point on the game's map, in its units (js/map.js), or null.
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1000 ? Math.round(v * 1000) / 1000 : null);
  const point = (o) => { const x = num(o && o.x), y = num(o && o.y); return x === null || y === null ? null : { x, y }; };

  /* Anything → a valid progress: the known ids once each in IDS's order, the known counts
     clamped (a 0 isn't kept), the known collectibles in the catalogue's order, a room name for
     the bench, and the shade with its room and geo. */
  function normalize(raw) {
    const o = raw && typeof raw === 'object' ? raw : {};
    const ids = Array.isArray(o.ids) ? ID_LIST.filter((id) => o.ids.includes(id)) : [];
    const found = Array.isArray(o.found) ? FOUND.filter((id) => o.found.includes(id)) : [];
    const counts = {};
    const c = o.counts && typeof o.counts === 'object' ? o.counts : {};
    for (const id of COUNT_LIST) { const v = clamp(id, c[id]); if (v) counts[id] = v; }
    const s = o.shade && typeof o.shade === 'object' ? o.shade : null;
    const shade = s && scene(s.scene) ? { scene: scene(s.scene), geo: Math.max(0, int(s.geo)), ...point(s) } : null;
    const g = o.gate && typeof o.gate === 'object' ? o.gate : null;
    const gp = g && point(g);
    const gate = g && scene(g.scene) && gp ? { scene: scene(g.scene), ...gp } : null;
    const mapped = Array.isArray(o.mapped) ? [...new Set(o.mapped.map(scene).filter(Boolean))].slice(0, 800) : [];
    const statues = Array.isArray(o.statues) ? [...new Set(o.statues.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x)))] : null;
    const markers = Array.isArray(o.markers)
      ? o.markers.map((m) => (m && MARKERS.includes(m.c) && point(m) ? { c: m.c, ...point(m) } : null)).filter(Boolean).slice(0, 24) : [];
    return { ids, counts, found, bench: scene(o.bench), shade, gate, statues, mapped, markers };
  }

  /* Which collectibles a save says you have (js/collectibles.js, `how`). sd is the save's
     sceneData: a thing picked up from the floor is its room's object, activated. */
  function detect(pd, sd) {
    const picked = new Set();
    const items = sd && Array.isArray(sd.persistentBoolItems) ? sd.persistentBoolItems : [];
    for (const x of items) if (x && x.activated && typeof x.sceneName === 'string' && typeof x.id === 'string') picked.add(x.sceneName + '|' + x.id);
    const list = (k) => (Array.isArray(pd[k]) ? pd[k] : []);
    const flames = list('scenesFlameCollected'), roots = list('scenesEncounteredDreamPlantC');
    // Once the Troupe's ritual is over, every flame was taken, whatever the lists say now.
    const ritualDone = int(pd.grimmChildLevel) >= 4 || !!pd.killedNightmareGrimm || !!pd.destroyedNightmareLantern;
    const has = (it) => {
      const [t, a] = it.how;
      if (t === 'o') return picked.has(it.scene + '|' + a);
      if (t === 'pd') return !!pd[a];
      if (t === 'seer') return !!pd['dreamReward' + a];
      if (t === 'grubs') return picked.has('Crossroads_38|Reward ' + a) || int(pd.grubRewards) >= a;
      if (t === 'root') return picked.has(it.scene + '|Dream Plant') || roots.includes(it.scene);
      if (t === 'flame') return ritualDone || flames.includes(it.scene);
      return false;
    };
    return CO.ITEMS.filter(has).map((it) => it.id);
  }

  // playerData (and its sceneData) → progress. The statues come from js/savefile.js, which knows their fields.
  function fromSave(pd, sd, statues = null) {
    const list = (k) => (Array.isArray(pd[k]) ? pd[k] : []);
    const ids = ID_LIST.filter((id) => (typeof IDS[id] === 'function' ? IDS[id](pd) : !!pd[IDS[id]]));
    const counts = {};
    for (const id of COUNT_LIST) counts[id] = pd[COUNTS[id][0]];
    const shade = scene(pd.shadeScene) ? { scene: pd.shadeScene, geo: pd.geoPool, ...point(pd.shadeMapPos) } : null;
    const gate = pd.hasDreamGate && scene(pd.dreamGateScene) ? { scene: pd.dreamGateScene, ...point(pd.dreamgateMapPos) } : null;
    const mapped = [...list('scenesVisited'), ...list('scenesMapped')];
    // Placed in the map's own frame, as the shade's (MapMarkerMenu.PlaceMarker: the map's local position).
    const markers = MARKERS.flatMap((c) => list('placedMarkers_' + c).map((m) => ({ c, ...point(m) })));
    return normalize({ ids, counts, found: detect(pd, sd), bench: pd.respawnScene, shade, gate, statues, mapped, markers });
  }

  const isEmpty = (p) => {
    const n = normalize(p);
    return !n.ids.length && !Object.keys(n.counts).length && !n.found.length && !n.bench && !n.shade && !n.gate
      && !(n.statues && n.statues.length) && !n.mapped.length && !n.markers.length;
  };

  /* Marking by hand, like the Journal's: they return a new progress without touching the one
     they receive. */
  function toggle(p, id, on) {
    const n = normalize(p);
    if (!IDS[id]) return n;
    const has = n.ids.includes(id);
    const want = on === undefined ? !has : !!on;
    return normalize({ ...n, ids: want ? [...n.ids, id] : n.ids.filter((x) => x !== id) });
  }
  function setCount(p, id, v) {
    const n = normalize(p);
    if (!COUNTS[id]) return n;
    return normalize({ ...n, counts: { ...n.counts, [id]: v } });
  }
  // A collectible found, by hand.
  function toggleFound(p, id, on) {
    const n = normalize(p);
    if (!FOUND.includes(id)) return n;
    const had = n.found.includes(id);
    const want = on === undefined ? !had : !!on;
    return normalize({ ...n, found: want ? [...n.found, id] : n.found.filter((x) => x !== id) });
  }
  const has = (p, id) => normalize(p).ids.includes(id);
  const hasFound = (p, id) => normalize(p).found.includes(id);
  const count = (p, id) => normalize(p).counts[id] || 0;

  HK.progress = { MARKERS, IDS, ID_LIST, COUNTS, COUNT_LIST, EMPTY, normalize, detect, fromSave, isEmpty, toggle, toggleFound, setCount, has, hasFound, count };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.progress;
})();
