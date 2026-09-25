/* js/progress.js — what a game has beyond the Knight's numbers: a slot's hollow.progress.
   Pure: no DOM and no language. The build, the charms found, the Journal, the Hall and the door
   have their own keys; this one keeps the rest, as the game's playerData says it:
     ids     what you have or have done, only those: equipment and key items, the Dreamers, the
             Colosseum's trials, the pantheons cleared… (IDS, each with where the save says it)
     counts  what you carry, numbers: geo, essence, the loose mask shards and vessel fragments,
             pale ore, rancid eggs, simple keys, the four relics and the geo in Millibelle's bank
     bench   the room of the bench you'd wake up at (its area: js/rooms.js)
     shade   where your shade waits and the geo it carries, or null
   Everything is marked by hand as well, like the Journal; a save linked to the game overwrites
   it on every bench. bench and shade only come from a save. The 112% is counted in
   js/completion.js. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  const doorDone = (n) => (pd) => {
    const st = pd['bossDoorStateTier' + n];
    return !!st && typeof st === 'object' && !!st.completed;
  };
  // A fragile charm given to the Divine and not yet back unbreakable: it's gone meanwhile.
  const withDivine = (gave, unbreakable) => (pd) => !!pd[gave] && !pd[unbreakable];

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

  const EMPTY = Object.freeze({ ids: [], counts: {}, bench: '', shade: null });

  /* Anything → a valid progress: the known ids once each in IDS's order, the known counts
     clamped (a 0 isn't kept), a room name for the bench, and the shade with its room and geo. */
  function normalize(raw) {
    const o = raw && typeof raw === 'object' ? raw : {};
    const ids = Array.isArray(o.ids) ? ID_LIST.filter((id) => o.ids.includes(id)) : [];
    const counts = {};
    const c = o.counts && typeof o.counts === 'object' ? o.counts : {};
    for (const id of COUNT_LIST) { const v = clamp(id, c[id]); if (v) counts[id] = v; }
    const s = o.shade && typeof o.shade === 'object' ? o.shade : null;
    const shade = s && scene(s.scene) ? { scene: scene(s.scene), geo: Math.max(0, int(s.geo)) } : null;
    return { ids, counts, bench: scene(o.bench), shade };
  }

  // playerData → progress.
  function fromSave(pd) {
    const ids = ID_LIST.filter((id) => (typeof IDS[id] === 'function' ? IDS[id](pd) : !!pd[IDS[id]]));
    const counts = {};
    for (const id of COUNT_LIST) counts[id] = pd[COUNTS[id][0]];
    const shade = scene(pd.shadeScene) ? { scene: pd.shadeScene, geo: pd.geoPool } : null;
    return normalize({ ids, counts, bench: pd.respawnScene, shade });
  }

  const isEmpty = (p) => { const n = normalize(p); return !n.ids.length && !Object.keys(n.counts).length && !n.bench && !n.shade; };

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
  const has = (p, id) => normalize(p).ids.includes(id);
  const count = (p, id) => normalize(p).counts[id] || 0;

  HK.progress = { IDS, ID_LIST, COUNTS, COUNT_LIST, EMPTY, normalize, fromSave, isEmpty, toggle, setCount, has, count };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.progress;
})();
