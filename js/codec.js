/* js/codec.js — Hollow: the build's state.
   Defaults, presets, normalisation (clamps ranges and resolves mutually exclusive charms),
   the rules for equipping/removing charms, and a readable encoding for the URL and localStorage:
   #v=1&nail=4&masks=9&vessels=3&notches=11&spells=222&arts=111
    &charms=ustrength,quickslash,fury&hp=1&dream=0&cloak=1&grimm=2
   Only the keys that differ from the base Knight are written. The abilities (the Dream
   Nail, the cloak and Grimmchild's level) default to what the site took for granted before
   it had them, everything acquired: that way an older link still gives the same sheet. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const D = HK.data || require('./data.js');

  const VERSION = 1;
  /* hp: the masks you have left right now; 0 means "full", which works for any build.
     The real cap is set by the engine, which is what knows your total health: here it's
     only clamped to a number that makes sense in a URL. */
  const MAX_HP = 99;

  const DEFAULTS = Object.freeze({
    nail: 0, masks: D.HEALTH.baseMasks, vessels: 0, notches: D.CHARM_NOTCHES.base,
    spells: Object.freeze({ vs: 0, dd: 0, hw: 0 }),
    arts: Object.freeze({ cyclone: false, dash: false, great: false }),
    charms: Object.freeze([]),
    hp: 0,
    dream: true, cloak: 2, grimm: 4,
  });

  /* DEFAULTS is the URL's reference (what isn't written); the presets are starting points.
     The base Knight is a new game's: no Dream Nail and no cloak. */
  const PRESETS = {
    base: Object.freeze({
      ...DEFAULTS, spells: DEFAULTS.spells, arts: DEFAULTS.arts, charms: DEFAULTS.charms,
      dream: false, cloak: 0, grimm: 1,
    }),
    max: Object.freeze({
      nail: 4, masks: D.HEALTH.maxMasks, vessels: D.SOUL.maxVessels, notches: D.CHARM_NOTCHES.max,
      spells: Object.freeze({ vs: 2, dd: 2, hw: 2 }),
      arts: Object.freeze({ cyclone: true, dash: true, great: true }),
      charms: Object.freeze([]),
      hp: 0,
      dream: true, cloak: 2, grimm: 4,
    }),
  };

  function clampInt(n, lo, hi, def) {
    const x = Number(n);
    if (!Number.isFinite(x)) return def;
    return Math.min(hi, Math.max(lo, Math.round(x)));
  }

  /* ── normalize: any partial object → valid state ─────────────────────── */
  function normalize(partial) {
    const p = partial || {};
    const spells = p.spells || {};
    const arts = p.arts || {};
    const st = {
      nail: clampInt(p.nail, 0, D.NAILS.length - 1, 0),
      masks: clampInt(p.masks, D.HEALTH.baseMasks, D.HEALTH.maxMasks, D.HEALTH.baseMasks),
      vessels: clampInt(p.vessels, 0, D.SOUL.maxVessels, 0),
      notches: clampInt(p.notches, D.CHARM_NOTCHES.base, D.CHARM_NOTCHES.max, D.CHARM_NOTCHES.base),
      spells: { vs: clampInt(spells.vs, 0, 2, 0), dd: clampInt(spells.dd, 0, 2, 0), hw: clampInt(spells.hw, 0, 2, 0) },
      arts: { cyclone: !!arts.cyclone, dash: !!arts.dash, great: !!arts.great },
      charms: [],
      hp: clampInt(p.hp, 0, MAX_HP, 0),
      // No cloak (0), Mothwing Cloak (1) or Shade Cloak (2); Grimmchild, phase 1 to 4.
      dream: p.dream === undefined ? DEFAULTS.dream : !!p.dream && p.dream !== '0',
      cloak: clampInt(p.cloak, 0, 2, DEFAULTS.cloak),
      grimm: clampInt(p.grimm, 1, 4, DEFAULTS.grimm),
    };
    // Phase 4 comes from defeating Nightmare King Grimm, and that fight is opened with the Dream Nail
    // (wiki, "Grimmchild"): without it, 3 at most.
    if (!st.dream && st.grimm > 3) st.grimm = 3;
    // Charms: unknown and repeated ones are dropped; in each exclusive group the last one wins.
    const seen = [];
    for (const id of Array.isArray(p.charms) ? p.charms : []) {
      if (D.CHARM_BY_ID[id] && !seen.includes(id)) seen.push(id);
    }
    st.charms = seen.filter((id, i) => {
      const g = D.CHARM_BY_ID[id].group;
      return !g || !seen.slice(i + 1).some((o) => D.CHARM_BY_ID[o].group === g);
    });
    // Void Heart can't be removed, so it's always the first one equipped: whatever you wear came after it.
    if (st.charms.includes('voidheart')) st.charms = ['voidheart', ...st.charms.filter((id) => id !== 'voidheart')];
    return st;
  }

  const clone = (st) => normalize(st);

  /* ── Notches and equipping rules ─────────────────────────────────────── */
  const notchesUsed = (charms) => charms.reduce((n, id) => n + (D.CHARM_BY_ID[id] ? D.CHARM_BY_ID[id].notches : 0), 0);

  // Reasons why a charm can't be equipped; the interface picks the language.
  const REASON = {
    unknown:      { es: 'Amuleto desconocido',      en: 'Unknown charm' },
    overcharmed:  { es: 'Ya estás sobrecargado',    en: 'You are already overcharmed' },
    noFreeNotch:  { es: 'No te quedan muescas libres', en: 'You have no free notches left' },
  };

  // What happens if I press this charm?
  // → { action: 'unequip' | 'equip' | 'swap' | 'blocked', overcharm, partner, reason: { es, en } }
  function charmAction(st, id) {
    const c = D.CHARM_BY_ID[id];
    if (!c) return { action: 'blocked', reason: REASON.unknown };
    if (st.charms.includes(id)) return { action: 'unequip' };
    const partner = c.group ? st.charms.find((x) => D.CHARM_BY_ID[x].group === c.group) : null;
    const without = partner ? st.charms.filter((x) => x !== partner) : st.charms;
    const used = notchesUsed(without);
    const free = st.notches - used;
    const overcharmedNow = used > st.notches;
    if (c.notches > 0 && free <= 0) {
      return { action: 'blocked', partner, reason: overcharmedNow ? REASON.overcharmed : REASON.noFreeNotch };
    }
    return { action: partner ? 'swap' : 'equip', partner, overcharm: c.notches > free };
  }

  // Returns the new state, or null if the action is blocked.
  function toggleCharm(st, id) {
    const a = charmAction(st, id);
    if (a.action === 'blocked') return null;
    if (a.action === 'unequip') return normalize({ ...st, charms: st.charms.filter((x) => x !== id) });
    const without = a.partner ? st.charms.filter((x) => x !== a.partner) : st.charms;
    return normalize({ ...st, charms: [...without, id] });
  }

  // Changes an upgrade or the health: set(st, 'nail', 4), set(st, 'spells.vs', 2), set(st, 'hp', 1),
  // set(st, 'dream', false)
  function set(st, path, value) {
    const next = { ...st, spells: { ...st.spells }, arts: { ...st.arts }, charms: [...st.charms] };
    const [a, b] = path.split('.');
    if (b) next[a][b] = value; else next[a] = value;
    return normalize(next);
  }

  /* ── Charms found ────────────────────────────────────────────────────────
     What you have in your real game (it doesn't go in the build or the URL): a list of charms.
     Five of the game's slots change version and each holds at most one at a time (wiki,
     "Fragile Heart", "Kingsoul", "Void Heart"): Divine makes the fragile one unbreakable
     for good, Void Heart replaces Kingsoul for good, and Grimmchild and Carefree Melody
     exclude each other once the troupe is banished. */
  const OWN_SLOTS = [
    { id: 'heart',    states: ['fheart', 'uheart'] },
    { id: 'greed',    states: ['fgreed', 'ugreed'] },
    { id: 'strength', states: ['fstrength', 'ustrength'] },
    { id: 'king',     states: ['kingsoul', 'voidheart'] },
    { id: 'grimm',    states: ['grimmchild', 'melody'] },
  ];
  const OWN_SLOT_BY_ID = Object.fromEntries(OWN_SLOTS.map((sl) => [sl.id, sl]));
  const OWN_SLOT_OF = Object.fromEntries(OWN_SLOTS.flatMap((sl) => sl.states.map((tk) => [tk, sl.id])));
  const OWN_TOKENS = new Set(D.CHARMS.map((c) => c.id));
  // Everything maxed: the end of the game. The unbreakable ones, Void Heart and Grimmchild.
  const OWN_MAX = Object.freeze([
    ...D.CHARMS.map((c) => c.id).filter((id) => !OWN_SLOT_OF[id]),
    'uheart', 'ugreed', 'ustrength', 'voidheart', 'grimmchild',
  ]);

  // Any list → valid: no unknown or repeated tokens, and one state per slot (the last one).
  function ownNormalize(list) {
    const seen = [];
    for (const tk of Array.isArray(list) ? list : []) if (OWN_TOKENS.has(tk) && !seen.includes(tk)) seen.push(tk);
    return seen.filter((tk, i) => !OWN_SLOT_OF[tk] || !seen.slice(i + 1).some((o) => OWN_SLOT_OF[o] === OWN_SLOT_OF[tk]));
  }
  const ownState = (list, slotId) => list.find((tk) => OWN_SLOT_OF[tk] === slotId) || null;
  // Puts that state in the slot (null: none). One that doesn't belong to the slot changes nothing.
  function ownSet(list, slotId, token) {
    const sl = OWN_SLOT_BY_ID[slotId];
    if (!sl || (token && !sl.states.includes(token))) return ownNormalize(list);
    return ownNormalize(list.filter((tk) => OWN_SLOT_OF[tk] !== slotId).concat(token ? [token] : []));
  }
  // Only a charm you have can be equipped.
  const ownEquippable = (list, id) => !!D.CHARM_BY_ID[id] && list.includes(id);

  /* ── Encoding ────────────────────────────────────────────────────────── */
  function encode(st) {
    const s = normalize(st);
    const out = ['v=' + VERSION];
    const put = (k, v) => out.push(k + '=' + v);
    if (s.nail) put('nail', s.nail);
    if (s.masks !== DEFAULTS.masks) put('masks', s.masks);
    if (s.vessels) put('vessels', s.vessels);
    if (s.notches !== DEFAULTS.notches) put('notches', s.notches);
    const sp = '' + s.spells.vs + s.spells.dd + s.spells.hw;
    if (sp !== '000') put('spells', sp);
    const ar = '' + (+s.arts.cyclone) + (+s.arts.dash) + (+s.arts.great);
    if (ar !== '000') put('arts', ar);
    if (s.charms.length) put('charms', s.charms.join(','));
    if (s.hp) put('hp', s.hp);
    if (!s.dream) put('dream', 0);
    if (s.cloak !== DEFAULTS.cloak) put('cloak', s.cloak);
    if (s.grimm !== DEFAULTS.grimm) put('grimm', s.grimm);
    return out.join('&');
  }

  function decode(str) {
    const text = String(str || '').replace(/^#/, '');
    const p = {};
    for (const pair of text.split('&')) {
      const i = pair.indexOf('=');
      if (i < 0) continue;
      // A link cut short when pasted (a stray "%E") doesn't bring the page down: that pair is skipped.
      try { p[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1)); } catch { /* unreadable pair */ }
    }
    const digit = (s, i) => (s && /^\d$/.test(s[i] || '') ? Number(s[i]) : 0);
    return normalize({
      nail: p.nail, masks: p.masks, vessels: p.vessels, notches: p.notches,
      spells: { vs: digit(p.spells, 0), dd: digit(p.spells, 1), hw: digit(p.spells, 2) },
      arts: { cyclone: digit(p.arts, 0) === 1, dash: digit(p.arts, 1) === 1, great: digit(p.arts, 2) === 1 },
      charms: p.charms ? p.charms.split(',').map((x) => x.trim()).filter(Boolean) : [],
      hp: p.hp, dream: p.dream, cloak: p.cloak, grimm: p.grimm,
    });
  }

  const isEmpty = (str) => { const t = String(str || '').replace(/^#/, ''); return !t || t === 'v=' + VERSION; };
  const equal = (a, b) => encode(a) === encode(b);

  HK.codec = { VERSION, DEFAULTS, PRESETS, MAX_HP, REASON, OWN_SLOTS, OWN_SLOT_OF, OWN_MAX, ownNormalize, ownState, ownSet, ownEquippable, normalize, clone, notchesUsed, charmAction, toggleCharm, set, encode, decode, isEmpty, equal };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.codec;
})();
