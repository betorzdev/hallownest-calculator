/* js/engine.js — Hollow: the stats engine.
   compute(state) → a sheet with every stat, its value and who has modified it.
   Pure: no DOM, no storage. Loadable from the browser (global HK) and from Node (tests).

   The game's rounding rules (Unity Mathf.RoundToInt = round half to even):
   - Nail damage: base → ×1.5 (Strength) and round → ×1.75 (Fury) and round.
   - Arts: base × multiplier × (Fury) with a single rounding; Strength doesn't affect them.
   - Elegy: 50% of the nail (Strength already applied) and round → ×1.5 (Fury) and round.
   - Joni's Blessing: floor(masks × 1.4f) + 1, with 1.4f in single precision. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const D = HK.data || require('./data.js');

  /* ── Language ────────────────────────────────────────────────────────────
     The engine emits text meant to be read: labels, conditions and reasons.
     compute(state, lang) sets the language for that pass; tx() resolves any
     { es, en } and num()/pct() apply the decimal separator and the % spacing
     each language uses. T holds the engine's own phrases. */
  let LANG = 'es';
  const tx = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[LANG] || v.es) : v);
  const num = (n, d = 2) => {
    let out = Number(n).toFixed(d);
    if (out.includes('.')) out = out.replace(/0+$/, '').replace(/\.$/, '');
    return LANG === 'es' ? out.replace('.', ',') : out;
  };
  const pct = (n) => num(n, 0) + (LANG === 'es' ? ' %' : '%');
  const pctText = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + pct(Math.abs(n));
  const mult = (n) => '×' + num(n);
  const T = {
    knight:        { es: 'Caballero',                   en: 'Knight' },
    masksFound:    { es: 'Máscaras conseguidas',        en: 'Masks collected' },
    vesselsFound:  { es: 'Vasijas conseguidas',     en: 'Vessels collected' },
    overcharmed:   { es: 'Sobrecarga',                  en: 'Overcharmed' },   // CHARM_TXT_OVERCHARMED
    requires:      { es: 'Requiere',                    en: 'Requires' },
    requiresLearn: { es: 'Requiere aprender',           en: 'Requires learning' },
    // Health
    allLifeblood:  { es: 'todas pasan a ser saviavida', en: 'all of it becomes Lifeblood' },
    masksTimes:    { es: ' máscaras × 1,4',             en: ' masks × 1.4' },
    masksPlusLb:   { es: 'máscaras + saviavida',        en: 'masks + lifeblood' },
    notchesOf:     { es: ' de ',                        en: ' of ' },
    notches:       { es: ' muescas',                    en: ' notches' },
    doubleDamage:  { es: ': recibes el doble de daño',  en: ': you take double damage' },
    healthOverDmg: { es: 'salud total ÷ daño por golpe', en: 'total health ÷ damage per hit' },
    after10s:      { es: 'tras 10 s sin recibir daño',  en: 'after 10 s without damage' },
    doubleJoni:    { es: 'el doble con saviavida de Joni', en: "double with Joni's Lifeblood" },
    growsPerHit:   { es: 'crece con cada golpe recibido', en: 'grows with every hit you take' },
    sevenOrMore:   { es: '7 o más golpes',              en: '7 or more hits' },
    hit:           { es: ' golpe',                      en: ' hit' },
    hits:          { es: ' golpes',                     en: ' hits' },
    sinceBlock:    { es: ' desde el último bloqueo',    en: ' since the last block' },
    repairsRest:   { es: 'se repara al descansar',      en: 'it repairs when you rest' },
    // Soul
    vessel:        { es: ' vasija',                 en: ' vessel' },
    vessels:       { es: ' vasijas',                en: ' vessels' },
    ofThirtyThree: { es: ' de 33)',                     en: ' of 33)' },
    mainPlusRes:   { es: 'principal + reserva',         en: 'main + reserve' },
    mainVesselFull:{ es: 'con el medidor principal lleno', en: 'with the main soul meter full' },
    soulEvery2s:   { es: '4 de alma cada 2 s',          en: '4 soul every 2 s' },
    noSpells:      { es: 'Sin efecto sin hechizos',     en: 'No effect without spells' },
    focusOverSoul: { es: '33 ÷ alma por golpe',         en: '33 ÷ soul per hit' },
    costOverSoul:  { es: 'coste ÷ alma por golpe',      en: 'cost ÷ soul per hit' },
    needAnySpell:  { es: 'Requiere aprender un hechizo', en: 'Requires learning a spell' },
    soulOverCost:  { es: 'alma total ÷ coste',          en: 'total soul ÷ cost' },
    // Nail
    atOneMask:     { es: 'Con 1 máscara',               en: 'At 1 mask' },
    onlyOneMask:   { es: 'Solo con 1 máscara',          en: 'Only at 1 mask' },
    oneOverCd:     { es: '1 ÷ tiempo entre golpes',     en: '1 ÷ time between hits' },
    iframesOverCd: { es: 'invulnerabilidad ÷ tiempo entre golpes', en: 'invulnerability ÷ time between hits' },
    dmgTimesAps:   { es: 'daño × golpes por segundo',   en: 'damage × hits per second' },
    needAnyArt:    { es: 'Requiere aprender un arte del aguijón', en: 'Requires learning a Nail Art' },
    noArts:        { es: 'Sin efecto sin artes',        en: 'No effect without Nail Arts' },
    timesBaseNail: { es: ' × aguijón base',             en: ' × base nail' },
    notArts:       { es: 'No afecta a las artes',       en: 'It does not affect Nail Arts' },
    notShadeCloak: { es: 'No afecta a la Capa sombría', en: 'It does not affect the Shade Cloak' },
    mashing:       { es: ' golpes machacando el botón', en: ' hits mashing the button' },
    nailNoBonus:   { es: 'daño del aguijón sin bonos',  en: 'nail damage with no bonuses' },
    elegyNeedsFury:{ es: 'Con 1 máscara solo dispara si llevas Furia de los caídos',
                     en: 'At 1 mask it only fires if you wear Fury of the Fallen' },
    onlyFullHealth:{ es: 'Solo con la vida completa',   en: 'Only at full health' },
    onlyFullMasks: { es: 'Solo con las máscaras completas; la saviavida no cuenta',
                     en: 'Only with every mask intact; Lifeblood does not count' },
    elegyJoniHit:  { es: 'Con la Bendición de Joni, cualquier golpe la apaga hasta descansar',
                     en: "With Joni's Blessing any hit turns it off until you rest" },
    lbNotHealth:   { es: 'La saviavida no cuenta como vida: perderla no apaga el rayo',
                     en: 'Lifeblood does not count as health: losing it keeps the beam' },
    quickCancel:   { es: 'Girándote o embistiendo entre golpes baja a 0,25 s (−39 %)',
                     en: 'Turning around or dashing between hits brings it down to 0.25 s (−39%)' },
    heavyStagger:  { es: 'El Gran corte empuja un 33 % más y los jefes se aturden con un golpe menos',
                     en: 'Great Slash knocks back 33% further and bosses stagger one hit sooner' },
    halfNail:      { es: '50 % del aguijón',            en: '50% of the nail' },
    inNailDamage:  { es: 'incluida en el daño del aguijón', en: 'included in the nail damage' },
    redBeams:      { es: ', rayos rojos',         en: ', red beams' },
    baseNailTwice: { es: 'daño base del aguijón, hasta 2 golpes', en: 'base nail damage, up to 2 hits' },
    baseNailDmg:   { es: 'daño base del aguijón',       en: 'base nail damage' },
    // Strongest hit
    needArtOrSpell:{ es: 'Requiere aprender un arte del aguijón o un hechizo',
                     en: 'Requires learning a Nail Art or a spell' },
    freeNoSoul:    { es: 'sin gastar alma',             en: 'no soul spent' },
    soulEach:      { es: ' de alma',                    en: ' soul' },
    // Spells
    dmgOverSoul:   { es: 'daño ÷ coste en alma',        en: 'damage ÷ soul cost' },
    costDrop:      { es: 'coste 33 → 24',               en: 'cost 33 → 24' },
    noSpell:       { es: 'Sin efecto sin el hechizo',   en: 'No effect without the spell' },
    volatileNest:  { es: 'Tremanido volátil',           en: 'volatile Flukenest' },
    volatileFluke: { es: 'un trematodo volátil que explota en una nube',
                     en: 'a volatile fluke that bursts into a cloud' },
    impact:        { es: 'Impacto',                     en: 'Impact' },
    cloud:         { es: 'Nube',                        en: 'Cloud' },
    allImpacts:    { es: 'Con todos los impactos.',     en: 'With every impact landing.' },
    cloudFor:      { es: 'Nube durante ',               en: 'Cloud for ' },
    cloudHarder:   { es: 'la nube hace más daño',       en: 'the cloud deals more damage' },
    flukes:        { es: ' trematodos',                 en: ' flukes' },
    perFluke:      { es: '4 → 5 por trematodo',         en: '4 → 5 per fluke' },
    each:          { es: 'cada uno',                    en: 'each' },
    // Healing
    lbNoFocus:     { es: 'la saviavida no se cura con Concentración',
                     en: 'Lifeblood cannot be healed with Focus' },
    joniNoHeal:    { es: 'La Bendición de Joni impide curarse',
                     en: "Joni's Blessing prevents healing" },
    noEffectJoni:  { es: 'Sin efecto con Bendición de Joni', en: "No effect with Joni's Blessing" },
    plusStartup:   { es: 'más 0,25 s de arranque',      en: 'plus 0.25 s of startup' },
    twoMasksSlower:{ es: '2 máscaras un 10 % más lento que 1 sin amuletos',
                     en: '2 masks, 10% slower than 1 with no charms' },
    timeOverMasks: { es: 'tiempo ÷ máscaras por Concentración', en: 'time ÷ masks per Focus' },
    soulOverMasks: { es: '33 ÷ máscaras por Concentración', en: '33 ÷ masks per Focus' },
    focusesTimes:  { es: 'Concentraciones posibles × máscaras', en: 'possible Focuses × masks' },
    over41s:       { es: 'en 4,1 s',                    en: 'over 4.1 s' },
    denserCloud:   { es: 'nube más densa',              en: 'a denser cloud' },
    becomeSlug:    { es: 'te conviertes en una babosa', en: 'you turn into a slug' },
    // Movement
    inTotal:       { es: ' en total',                   en: ' in total' },
    speedAndRange: { es: ' de velocidad y distancia',   en: ' speed and distance' },
    // Companions
    weaverlings:   { es: ' tejedoras',                  en: ' Weaverlings' },
    evenNoSoul:    { es: 'incluso de enemigos que no dan alma',
                     en: 'even from enemies that give no soul' },
    hatchlingRate: { es: 'hasta 4 crías, una cada 4 s', en: 'up to 4 hatchlings, one every 4 s' },
    restToCloud:   { es: 'el resto pasa a una nube',    en: 'the rest becomes a cloud' },
    oneSecCloud:   { es: 'nube de 1 s',                 en: '1 s cloud' },
    grimmShot:     { es: 'un disparo cada 1,8 s',       en: 'one shot every 1.8 s' },
    grimmDps:      { es: 'daño ÷ 1,8 s',                en: 'damage ÷ 1.8 s' },
    crestClouds:   { es: 'nubes de 1,1 s a tu paso',    en: '1.1 s clouds in your wake' },
    // Abilities
    shieldBreaks:  { es: 'se rompe al chocar y vuelve a los 2 s',
                     en: 'it breaks on impact and returns after 2 s' },
    voidNeutral:   { es: 'los Hermanos y los Tentáculos del vacío dejan de atacar',
                     en: 'the Siblings and Void tendrils stop attacking' },
    everyCoin:     { es: ' en cada moneda',             en: ' on every coin' },
    itemsRepairs:  { es: 'en objetos y reparaciones',   en: 'on items and repairs' },
    ofChance:      { es: ' de probabilidad',            en: ' chance' },
    breaksOnDeath: { es: 'se rompe al morir',           en: 'breaks on death' },
    requiresAbil:  { es: 'Requiere la',                 en: 'Requires the' },
    requiresNail:  { es: 'Requiere el',                 en: 'Requires the' },
    grimmNoAttack: { es: 'En la fase 1 no ataca',       en: 'In phase 1 it does not attack' },
    grimmPhase:    { es: 'fase ',                       en: 'phase ' },
  };

  /* ── Numeric utilities ───────────────────────────────────────────────── */
  function roundEven(x) {
    const f = Math.floor(x);
    const d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  // The game does (int)(maxHealth * 1.4f) + 1: 1.4f is slightly less than 1.4,
  // so 5 → 7, 9 → 13, 10 → 14 and 11 → 16.
  const JONI_F = Math.fround(D.HEALTH.joniMult);
  const joniLifeblood = (masks) => Math.floor(masks * JONI_F) + 1;

  /* ── Pantheon bindings ───────────────────────────────────────────────────
     Formulas from the wiki's "Pantheons" page (kb/05-godhome.md §1):
       Nail      damage ×0.8 and, if it's still above 13, 13: by level 4/7/10/13/13. The arts are
                 computed on that value; Sharp Shadow, Thorns of Agony and Dreamshield, NOT.
       Shell     4 masks at most, without touching lifeblood or Lifeblood Heart's +2.
       Charms    none.
       Soul      33 soul and the extra vessels disabled.
     Names copied, not translated: in English, the wiki's labels ("NAIL BINDING"…);
     in Spanish, the Spanish wiki's, which calls the set «Vínculos» and each one AGUIJÓN,
     CORAZA, AMULETOS and ALMA. */
  const BIND = {
    nailMult: 0.8, nailCap: 13, shellMasks: 4, soulMax: 33,
    names: {
      nail:   { es: 'Vínculos: Aguijón',  en: 'Nail Binding' },
      shell:  { es: 'Vínculos: Coraza',   en: 'Shell Binding' },
      charms: { es: 'Vínculos: Amuletos', en: 'Charms Binding' },
      soul:   { es: 'Vínculos: Alma',     en: 'Soul Binding' },
    },
    nailText:  { es: '×0,8, con tope 13',   en: '×0.8, capped at 13' },
    shellText: { es: 'máximo 4',            en: 'at most 4' },
    shellJoniText: { es: 'una máscara más con Joni', en: 'one more mask with Joni' },
    soulText:  { es: 'vasijas inhabilitadas', en: 'vessels disabled' },
  };
  const boundNail = (raw) => Math.min(roundEven(raw * BIND.nailMult), BIND.nailCap);

  /* ── Contribution sources ────────────────────────────────────────────── */
  const SRC = {
    binding: (k) => ({ source: 'binding:' + k, label: tx(BIND.names[k]) }),
    get base() { return { source: 'base', label: tx(T.knight) }; },
    charm: (id) => ({ source: 'charm:' + id, label: tx(D.CHARM_BY_ID[id]) }),
    synergy: (a, b) => ({ source: 'synergy:' + a + '+' + b, label: tx(D.CHARM_BY_ID[a]) + ' + ' + tx(D.CHARM_BY_ID[b]), charms: [a, b] }),
    nail: (lvl) => ({ source: 'upgrade:nail', label: tx(D.NAILS[lvl]) }),
    get masks() { return { source: 'upgrade:masks', label: tx(T.masksFound) }; },
    get vessels() { return { source: 'upgrade:vessels', label: tx(T.vesselsFound) }; },
    spell: (key, lvl) => ({ source: 'upgrade:spell:' + key, label: tx(D.SPELLS[key].levels[lvl]) }),
    art: (key) => ({ source: 'upgrade:art:' + key, label: tx(D.ARTS[key]) }),
    get overcharm() { return { source: 'rule:overcharm', label: tx(T.overcharmed) }; },
  };

  /* ── A stat's accumulator ────────────────────────────────────────────── */
  function stat(id) {
    const def = D.STAT_BY_ID[id];
    if (!def) throw new Error('Unknown stat: ' + id);
    const s = {
      id, group: def.group, label: tx(def.label), fmt: def.fmt, better: def.better, weight: def.weight,
      value: def.fmt === 'flag' ? false : 0,
      contribs: [], parts: null, impacts: null, applies: true, reason: null, hidden: false, approx: false, note: null, into: null,
    };
    const push = (op, value, src, o = {}) => {
      if (!src) return;
      s.contribs.push({
        op, value, source: src.source, label: src.label, charms: src.charms || null,
        text: o.text || null, cond: o.cond || null, active: o.active !== false,
      });
    };
    const api = {
      set(v, src, o)     { s.value = v; push('set', v, src, o); return api; },
      add(v, src, o)     { s.value += v; push('add', v, src, o); return api; },
      mul(v, src, o)     { s.value *= v; push('mul', v, src, o); return api; },
      replace(v, src, o) { s.value = v; push('replace', v, src, o); return api; },
      on(src, o)         { s.value = true; push('on', true, src, o); return api; },
      off(src, o)        { s.value = false; push('off', false, src, o); return api; },
      // Contributes without changing the value (e.g. "included in nail damage").
      via(src, o)        { push('via', null, src, o); return api; },
      // Equipped charm whose effect doesn't apply right now (e.g. Fury without being at 1 mask).
      inactive(src, o)   { push('note', null, src, { ...o, active: false }); return api; },
      roundEven()        { s.value = roundEven(s.value); return api; },
      na(reason, hidden) { s.applies = false; s.reason = reason; s.hidden = !!hidden; return api; },
      parts(p)           { s.parts = p; return api; },
      /* Which impacts a spell is made of, so the arena knows which ones land:
         [{ id, label, v, count, alt?, twice?, approx?, stagger?, nest? }]. The row's value is
         still the total with all of them (the left side for Descending Dark), which is what the tables give.
         nest: it belongs to Flukenest, which doesn't damage entries with noFlukes. */
      impacts(list)      { s.impacts = list; return api; },
      note(t)            { s.note = t; return api; },
      approx()           { s.approx = true; return api; },
      label(t)           { s.label = t; return api; },
      // The value isn't lost: it moves to another stat (Joni's Blessing: the masks become lifeblood).
      into(id)           { s.into = id; return api; },
      get value()        { return s.value; },
      done()             { return s; },
    };
    return api;
  }

  /* ── Build context ───────────────────────────────────────────────────── */
  function context(st) {
    const eq = new Set(st.charms);
    const has = (id) => eq.has(id);
    const used = st.charms.reduce((n, id) => n + (D.CHARM_BY_ID[id] ? D.CHARM_BY_ID[id].notches : 0), 0);
    const notches = { used, max: st.notches, free: Math.max(0, st.notches - used), overcharmed: used > st.notches };
    const pick = (a, b) => (has(a) ? a : has(b) ? b : null);
    const flags = {
      strength: pick('ustrength', 'fstrength'),
      heart: pick('uheart', 'fheart'),
      greed: pick('ugreed', 'fgreed'),
      // Fury and Elegy depend on the health you have left, and that isn't known until
      // the total health is: health() switches them on.
      fury: false,
      elegy: false,
      joni: has('joni'),
      overcharmed: notches.overcharmed,
      anySpell: st.spells.vs > 0 || st.spells.dd > 0 || st.spells.hw > 0,
      anyArt: !!(st.arts.cyclone || st.arts.dash || st.arts.great),
      // Abilities: when the state doesn't have them, acquired, as before they existed.
      dream: st.dream !== false,
      cloak: st.cloak === undefined ? 2 : st.cloak,
      grimm: st.grimm === undefined ? 4 : st.grimm,
    };
    return { st, has, notches, flags, bind: st.bind || {}, fight: st.fight || null };
  }

  // "Doesn't apply" reasons that name a charm or a spell.
  const needCharm = (id) => tx(T.requires) + ' ' + tx(D.CHARM_BY_ID[id]);
  const needSpell = (key) => tx(T.requiresLearn) + ' ' + tx(D.SPELLS[key].levels[1]);
  const needDream = () => tx(T.requiresNail) + ' ' + tx(D.ABILITIES.dream);
  const needCloak = (lvl) => tx(T.requiresAbil) + ' ' + tx(D.ABILITIES.cloaks[lvl]);

  // A row that only exists with a charm: without it, it stays hidden.
  function onlyWith(c, s, charmId) {
    if (c.has(charmId)) return true;
    s.na(tx(T.requires) + ' ' + tx(D.CHARM_BY_ID[charmId]), true);
    return false;
  }

  /* ── Health ──────────────────────────────────────────────────────────── */
  function health(c, out, v) {
    const { st, has, flags } = c;
    const H = D.HEALTH;

    const masks = stat('health.masks').set(H.baseMasks, SRC.base);
    const extra = st.masks - H.baseMasks;
    if (extra) masks.add(extra, SRC.masks);
    // Shell Binding trims your own masks; Lifeblood Heart's +2 is added afterwards and is untouched.
    if (c.bind.shell && masks.value > BIND.shellMasks) {
      masks.replace(BIND.shellMasks, SRC.binding('shell'), { text: tx(BIND.shellText) });
    }
    if (flags.heart) masks.add(H.heartBonus, SRC.charm(flags.heart));
    const whiteMasks = masks.value;

    const lb = stat('health.lifeblood');
    const joniLb = flags.joni ? joniLifeblood(whiteMasks) : 0;
    v.joniLifeblood = joniLb;
    if (flags.joni) {
      lb.add(joniLb, SRC.charm('joni'), { text: whiteMasks + tx(T.masksTimes) });
      /* With Shell Binding, the wiki ("Joni's Blessing") gives 7 Joni masks, and 10 with
         Lifeblood Heart: one more than the formula (6 and 9). It fits with the game computing
         the bound total with its +1 already applied and on top keeping Joni's white mask, which
         here is also counted as lifeblood, since that's how it looks. */
      if (c.bind.shell) lb.add(1, SRC.binding('shell'), { text: tx(BIND.shellJoniText) });
      masks.replace(0, SRC.charm('joni'), { text: tx(T.allLifeblood) }).into('health.lifeblood');
    }
    for (const [id, n] of [['lbheart', H.lifebloodHeart], ['lbcore', H.lifebloodCore]]) {
      if (has(id)) lb.add(n, SRC.charm(id));
    }
    out(masks.done()); out(lb.done());
    v.masks = masks.value; v.lifeblood = lb.value;

    const total = stat('health.total').set(masks.value + lb.value, SRC.base, { text: tx(T.masksPlusLb) });
    out(total.done()); v.totalHealth = total.value;

    /* The health you have left: st.hp is masks, and 0 means "full" (it works for any build).
       It's clamped here, the only place that knows your total. Lifeblood is lost first,
       just as in the game, so current health reads from left to right.
       It's what switches on the game's two conditional charms. */
    const fight = c.fight;
    if (fight) {
      /* The arena keeps health in four piles (cocoon, Heart/Core, Joni, masks) and the flags
         come from there (design/04-charms-in-combat.md §3.2). Fury looks at the masks
         —with Joni's Blessing, hers— and lifeblood gained afterwards doesn't switch it off.
         Elegy only counts full masks, and at 1 mask it needs Fury and no lifeblood on top.
         With Joni's Blessing, any damage switches it off until the bench (elegyHalted, kept by the arena). */
      const own = flags.joni ? (fight.lbJoni || 0) : (fight.masks || 0);
      const ownMax = flags.joni ? joniLb : whiteMasks;   // only Joni's: Heart and Core are counted apart
      const extra = (fight.lbExtra || 0) + (fight.lbCocoon || 0);
      v.currentHealth = (fight.masks || 0) + (fight.lbJoni || 0) + extra;
      flags.fury = has('fury') && own === 1;
      v.masksFull = own === ownMax && !fight.elegyHalted;
      flags.elegy = has('elegy') && !fight.elegyHalted && (v.masksFull || (flags.fury && extra === 0));
    } else {
      const current = st.hp ? Math.min(st.hp, total.value) : total.value;
      v.currentHealth = current;
      flags.fury = has('fury') && current === 1;
      /* Elegy only counts the white masks as full health: losing Lifeblood Heart's or Lifeblood
         Core's lifeblood doesn't switch it off (wiki: "Lifeblood Heart", "Lifeblood Core"). Since
         lifeblood is lost first, the white ones are whole as long as at least as many remain
         as there are masks. With Joni's Blessing all health is lifeblood and any hit switches it
         off until the bench. At 1 mask it only fires if you wear Fury (red projectiles). */
      v.masksFull = flags.joni ? current === total.value : current >= masks.value;
      flags.elegy = has('elegy') && (v.masksFull || (current === 1 && has('fury')));
    }

    const mult = stat('health.damageMult').set(1, SRC.base);
    if (flags.overcharmed) mult.mul(H.overcharmMult, SRC.overcharm, { text: c.notches.used + tx(T.notchesOf) + c.notches.max + tx(T.notches) });
    out(mult.done());

    out(stat('health.hitsToDie').set(Math.ceil(total.value / mult.value), SRC.base, { text: tx(T.healthOverDmg) }).done());

    const ifr = stat('health.iframes').set(H.iframes, SRC.base);
    if (has('stalwart')) ifr.replace(H.iframesStalwart, SRC.charm('stalwart'), { text: pctText(35) });
    out(ifr.done()); v.iframes = ifr.value;

    const rec = stat('health.recoil').set(H.recoil, SRC.base);
    if (has('stalwart')) rec.replace(H.recoilStalwart, SRC.charm('stalwart'), { text: pctText(-60) });
    out(rec.done());

    const hive = stat('health.hivebloodRegen');
    if (onlyWith(c, hive, 'hiveblood')) {
      hive.set(H.hivebloodSeconds, SRC.charm('hiveblood'), { text: tx(T.after10s) });
      if (flags.joni) hive.replace(H.hivebloodSecondsJoni, SRC.synergy('hiveblood', 'joni'), { text: tx(T.doubleJoni) });
    }
    out(hive.done());

    const care = stat('health.carefreeAvg');
    if (onlyWith(c, care, 'melody')) {
      care.set(H.carefreeAverage, SRC.charm('melody'), { text: tx(T.growsPerHit) }).approx()
        .parts(H.carefreeChances.map((p, i) => ({ label: i === 7 ? tx(T.sevenOrMore) : i + tx(i === 1 ? T.hit : T.hits) + tx(T.sinceBlock), v: p, fmt: 'pct' })));
    }
    out(care.done());

    const bald = stat('health.baldurBlocks');
    if (onlyWith(c, bald, 'baldur')) bald.set(H.baldurHits, SRC.charm('baldur'), { text: tx(T.repairsRest) });
    out(bald.done());
  }

  /* ── Soul ────────────────────────────────────────────────────────────── */
  function soul(c, out, v) {
    const { st, has, flags } = c;
    const S = D.SOUL;

    const main = stat('soul.main').set(S.main, SRC.base);
    if (c.bind.soul) main.replace(BIND.soulMax, SRC.binding('soul'));
    out(main.done());

    // Soul Binding disables the extra vessels: having them adds nothing.
    const vessels = c.bind.soul ? 0 : st.vessels;
    const reserve = stat('soul.reserve').set(0, SRC.base);
    if (vessels) reserve.add(vessels * S.vesselSize, SRC.vessels, { text: '+' + vessels * S.vesselSize + ' (' + vessels + tx(vessels === 1 ? T.vessel : T.vessels) + tx(T.ofThirtyThree) });
    if (c.bind.soul && st.vessels) reserve.via(SRC.binding('soul'), { text: tx(BIND.soulText) });
    out(reserve.done());

    const total = stat('soul.total').set(main.value + reserve.value, SRC.base, { text: tx(T.mainPlusRes) });
    out(total.done()); v.totalSoul = total.value;

    const perHit = stat('soul.perHit').set(S.perHit, SRC.base);
    if (has('catcher')) perHit.add(S.catcherBonus, SRC.charm('catcher'));
    if (has('eater')) perHit.add(S.eaterBonus, SRC.charm('eater'));
    out(perHit.done());

    const perRes = stat('soul.perHitReserve').set(S.reservePerHit, SRC.base, { text: tx(T.mainVesselFull) });
    if (has('catcher')) perRes.add(S.catcherReserveBonus, SRC.charm('catcher'));
    if (has('eater')) perRes.add(S.eaterReserveBonus, SRC.charm('eater'));
    out(perRes.done());

    const dn = stat('soul.dreamNail');
    const dc = stat('soul.dreamCharge');
    if (!flags.dream) {
      dn.na(needDream()); dc.na(needDream());
      if (has('wielder')) { dn.inactive(SRC.charm('wielder'), { cond: needDream() }); dc.inactive(SRC.charm('wielder'), { cond: needDream() }); }
    } else {
      dn.set(S.dreamNail, SRC.base); dc.set(S.dreamCharge, SRC.base);
      if (has('wielder')) {
        dn.replace(S.dreamNailWielder, SRC.charm('wielder'), { text: '+33' });
        dc.replace(S.dreamChargeWielder, SRC.charm('wielder'), { text: pctText(-37) });
      }
    }
    out(dn.done()); out(dc.done());

    const onHit = stat('soul.onHit');
    if (onlyWith(c, onHit, 'grubsong')) {
      onHit.set(S.grubsong, SRC.charm('grubsong'));
      if (has('elegy')) onHit.replace(S.grubsongElegy, SRC.synergy('grubsong', 'elegy'), { text: '+10' });
    }
    out(onHit.done());

    const passive = stat('soul.passive');
    if (onlyWith(c, passive, 'kingsoul')) passive.set(S.kingsoulAmount / S.kingsoulEvery, SRC.charm('kingsoul'), { text: tx(T.soulEvery2s) });
    out(passive.done());

    const cost = stat('soul.spellCost').set(D.SPELL_COST, SRC.base);
    if (has('twister')) {
      if (flags.anySpell) cost.replace(D.SPELL_COST_TWISTER, SRC.charm('twister'), { text: '−9' });
      else cost.inactive(SRC.charm('twister'), { cond: tx(T.noSpells) });
    }
    out(cost.done()); v.spellCost = cost.value;

    out(stat('soul.focusCost').set(D.FOCUS.cost, SRC.base).done());

    out(stat('soul.hitsPerFocus').set(Math.ceil(D.FOCUS.cost / perHit.value), SRC.base, { text: tx(T.focusOverSoul) }).done());
    const hps = stat('soul.hitsPerSpell').set(Math.ceil(cost.value / perHit.value), SRC.base, { text: tx(T.costOverSoul) });
    if (!flags.anySpell) hps.na(tx(T.needAnySpell));
    out(hps.done());
    const casts = stat('soul.castsPerFull').set(Math.floor(total.value / cost.value), SRC.base, { text: tx(T.soulOverCost) });
    if (!flags.anySpell) casts.na(tx(T.needAnySpell));
    out(casts.done());
  }

  /* ── Nail ────────────────────────────────────────────────────────────── */
  function nail(c, out, v) {
    const { st, has, flags } = c;
    const N = D.NAIL;
    // Two base damages: the nail's as is, used by Sharp Shadow, Thorns of Agony and
    // Dreamshield (the binding doesn't touch them), and the bound one, used by the swing and the arts.
    const rawDmg = D.NAILS[st.nail].damage;
    const baseDmg = c.bind.nail ? boundNail(rawDmg) : rawDmg;

    const dmg = stat('nail.damage').set(rawDmg, SRC.nail(st.nail));
    if (c.bind.nail) dmg.replace(baseDmg, SRC.binding('nail'), { text: tx(BIND.nailText) });
    if (flags.strength) dmg.mul(N.strengthMult, SRC.charm(flags.strength)).roundEven();
    const dmgWithStrength = dmg.value;
    if (has('fury')) {
      if (flags.fury) dmg.mul(N.furyMult, SRC.charm('fury'), { cond: tx(T.atOneMask) }).roundEven();
      else dmg.inactive(SRC.charm('fury'), { cond: tx(T.onlyOneMask) });
    }
    out(dmg.done()); v.nailDamage = dmg.value;

    const cd = stat('nail.cooldown').set(Math.max(N.attackCooldown, N.attackDuration), SRC.base);
    // The real time is max(cooldown, swing duration): 0.25 and 0.28 with Quick Slash.
    // Turning or dashing cuts the duration short and the cooldown remains (wiki: "Quick Slash").
    if (has('quickslash')) cd.replace(Math.max(N.attackCooldownQuick, N.attackDurationQuick), SRC.charm('quickslash'), { text: pctText(-32) }).note(tx(T.quickCancel));
    out(cd.done());
    const aps = stat('nail.aps').set(1 / cd.value, SRC.base, { text: tx(T.oneOverCd) });
    out(aps.done());
    out(stat('nail.dps').set(dmg.value * aps.value, SRC.base, { text: tx(T.dmgTimesAps) }).done());
    // Nail swings that fit after taking a hit, while you're invulnerable: 1.3 ÷ 0.41 = 3;
    // 4 with Stalwart Shell, 4 with Quick Slash and 6 with both (design/04, row 3).
    const fit = stat('nail.hitsInIframes').set(Math.floor(v.iframes / cd.value), SRC.base, { text: tx(T.iframesOverCd) });
    if (has('stalwart')) fit.via(SRC.charm('stalwart'), { text: num(v.iframes) + ' s' });
    if (has('quickslash')) fit.via(SRC.charm('quickslash'), { text: num(cd.value) + ' s' });
    out(fit.done());

    const range = stat('nail.range').set(1, SRC.base);
    if (has('longnail')) range.add(N.rangeLongnail, SRC.charm('longnail'), { text: pctText(15) });
    if (has('pride')) range.add(N.rangePride, SRC.charm('pride'), { text: pctText(25) });
    out(range.done());

    const charge = stat('nail.artCharge');
    if (flags.anyArt) {
      charge.set(N.artCharge, SRC.base);
      if (has('glory')) charge.replace(N.artChargeGlory, SRC.charm('glory'), { text: pctText(-44) });
    } else {
      charge.na(tx(T.needAnyArt));
      if (has('glory')) charge.inactive(SRC.charm('glory'), { cond: tx(T.noArts) });
    }
    out(charge.done());

    const art = (id, key, m) => {
      const s = stat(id);
      if (!st.arts[key]) { s.na(tx(T.requiresLearn) + ' ' + tx(D.ARTS[key])); return s; }
      // Dash Slash is released in the middle of a dash: without a cloak there's none (wiki, "Dash Slash").
      if (key === 'dash' && !flags.cloak) { s.na(needCloak(1)); return s; }
      s.set(roundEven(baseDmg * m), SRC.art(key), { text: num(m) + tx(T.timesBaseNail) });
      if (flags.strength) s.inactive(SRC.charm(flags.strength), { cond: tx(T.notArts) });
      if (has('fury')) {
        if (flags.fury) s.replace(roundEven(baseDmg * m * N.furyMult), SRC.charm('fury'), { text: mult(N.furyMult), cond: tx(T.atOneMask) });
        else s.inactive(SRC.charm('fury'), { cond: tx(T.onlyOneMask) });
      }
      return s;
    };
    out(art('nail.greatSlash', 'great', N.greatSlashMult).done());
    out(art('nail.dashSlash', 'dash', N.dashSlashMult).done());
    const cyc = art('nail.cyclone', 'cyclone', N.cycloneMult);
    if (cyc.done().applies) cyc.parts([
      { label: N.cycloneHits + tx(T.hits), v: cyc.value * N.cycloneHits },
      { label: N.cycloneHitsMax + tx(T.mashing), v: cyc.value * N.cycloneHitsMax },
    ]);
    out(cyc.done());

    const shadow = stat('nail.sharpShadow');
    if (onlyWith(c, shadow, 'sharpshadow')) {
      if (flags.cloak < 2) shadow.na(needCloak(2));
      else {
        shadow.set(rawDmg, SRC.charm('sharpshadow'), { text: tx(T.nailNoBonus) });
        if (has('dashmaster')) shadow.replace(roundEven(rawDmg * N.sharpShadowDashmasterMult), SRC.synergy('sharpshadow', 'dashmaster'), { text: mult(N.sharpShadowDashmasterMult) });
      }
    }
    out(shadow.done());

    const beam = stat('nail.elegy');
    if (onlyWith(c, beam, 'elegy')) {
      if (!flags.elegy) {
        beam.na(tx(v.currentHealth === 1 ? T.elegyNeedsFury : flags.joni ? T.elegyJoniHit : v.lifeblood ? T.onlyFullMasks : T.onlyFullHealth));
      } else {
        beam.set(roundEven(dmgWithStrength * N.elegyMult), SRC.charm('elegy'), { text: tx(T.halfNail) });
        if (v.lifeblood && !flags.joni) beam.note(tx(T.lbNotHealth));
        if (flags.strength) beam.via(SRC.charm(flags.strength), { text: tx(T.inNailDamage) });
        if (flags.fury) beam.replace(roundEven(beam.value * N.elegyFuryMult), SRC.charm('fury'), { text: mult(N.elegyFuryMult) + tx(T.redBeams), cond: tx(T.atOneMask) });
      }
    }
    out(beam.done());

    const thorns = stat('nail.thorns');
    if (onlyWith(c, thorns, 'thorns')) thorns.set(rawDmg, SRC.charm('thorns'), { text: tx(T.baseNailTwice) });
    out(thorns.done());

    const shield = stat('nail.dreamshield');
    if (onlyWith(c, shield, 'dreamshield')) shield.set(rawDmg, SRC.charm('dreamshield'), { text: tx(T.baseNailDmg) });
    out(shield.done());

    const kb = stat('nail.knockback').set(1, SRC.base);
    if (has('heavy')) kb.mul(N.heavyBlowKnockback, SRC.charm('heavy'), { text: pctText(75) }).note(tx(T.heavyStagger));
    out(kb.done());
  }

  /* ── Spells ──────────────────────────────────────────────────────────── */
  function spells(c, out, v) {
    const { st, has, flags } = c;
    const shaman = has('shaman');
    const cost = v.spellCost;
    const perSoul = (id, total, applies, reason, extras) => {
      const s = stat(id);
      if (!applies) { s.na(reason); return s; }
      s.set(total / cost, SRC.base, { text: tx(T.dmgOverSoul) });
      for (const src of extras) s.via(src);
      if (has('twister')) s.via(SRC.charm('twister'), { text: tx(T.costDrop) });
      return s;
    };

    // Vengeful Spirit / Shade Soul
    {
      const lvl = st.spells.vs;
      const sp = D.SPELLS.vs;
      const s = stat('spell.vs');
      const extras = [];
      if (!lvl) {
        s.na(needSpell('vs'));
        if (has('flukenest')) s.inactive(SRC.charm('flukenest'), { cond: tx(T.noSpell) });
      } else {
        const L = sp.levels[lvl];
        s.label(tx(L)).set(L.total, SRC.spell('vs', lvl));
        if (has('flukenest')) {
          const n = sp.flukes[lvl];
          if (has('crest')) {
            const cloud = shaman ? sp.volatile.cloudShaman : sp.volatile.cloud;
            s.label(tx(L) + ' · ' + tx(T.volatileNest))
              .replace(sp.volatile.impact + cloud, SRC.synergy('flukenest', 'crest'), { text: tx(T.volatileFluke) })
              .approx()
              .parts([{ label: tx(T.impact), v: sp.volatile.impact }, { label: tx(T.cloudFor) + num(sp.volatile.duration) + ' s', v: cloud, approx: true }])
              // The cloud hits while it stays inside and doesn't count towards stagger, like Defender's Crest's on its own.
              .impacts([{ id: 'impact', label: tx(T.impact), v: sp.volatile.impact, count: 1, nest: true },
                        { id: 'cloud', label: tx(T.cloud), v: cloud, count: 1, approx: true, stagger: false, nest: true }]);
            if (shaman) { s.via(SRC.charm('shaman'), { text: tx(T.cloudHarder) }); extras.push(SRC.charm('shaman')); }
            extras.push(SRC.synergy('flukenest', 'crest'));
          } else {
            const per = shaman ? sp.flukeDamageShaman : sp.flukeDamage;
            s.label(tx(L) + ' · ' + tx(D.CHARM_BY_ID.flukenest))
              .replace(n * per, SRC.charm('flukenest'), { text: n + tx(T.flukes) + ' × ' + per })
              .parts([{ label: n + tx(T.flukes), v: per, unit: tx(T.each) }])
              .impacts([{ id: 'fluke', label: tx(T.flukes).trim(), v: per, count: n, nest: true }]);
            if (shaman) { s.via(SRC.charm('shaman'), { text: tx(T.perFluke) }); extras.push(SRC.charm('shaman')); }
            extras.push(SRC.charm('flukenest'));
          }
        } else if (shaman) {
          s.replace(L.shaman, SRC.charm('shaman'), { text: pctText(33) });
          extras.push(SRC.charm('shaman'));
        }
        // One projectile; bosses that recoil, and Xero, can be hit twice (spellTwice on the entry).
        if (!has('flukenest')) s.impacts([{ id: 'bolt', label: tx(L), v: s.value, count: 1, twice: true }]);
      }
      out(s.done());
      out(perSoul('spell.vsPerSoul', s.value, !!lvl, needSpell('vs'), extras).done());
    }

    // Desolate Dive / Descending Dark
    {
      const lvl = st.spells.dd;
      const s = stat('spell.dd');
      const extras = [];
      if (!lvl) s.na(needSpell('dd'));
      else {
        const L = D.SPELLS.dd.levels[lvl];
        const sum = (arr) => arr.reduce((a, b) => a + b, 0);
        s.label(tx(L)).set(sum(L.parts.map((p) => p.v)), SRC.spell('dd', lvl)).parts(L.parts.map((p) => ({ label: tx(p), v: p.v })));
        if (L.note) s.note(tx(T.allImpacts) + ' ' + tx(L.note));
        else s.note(tx(T.allImpacts));
        if (shaman) {
          s.replace(sum(L.shaman), SRC.charm('shaman'), { text: pctText(lvl === 1 ? 51 : 47) })
            .parts(L.parts.map((p, i) => ({ label: tx(p), v: L.shaman[i] })));
          extras.push(SRC.charm('shaman'));
        }
        // One slot per part. Descending Dark's 1st blast, 35 on the left and 30 on the right;
        // with Shaman Stone, 50 on both sides, and there's no side to pick any more.
        const ids = lvl === 1 ? ['dive', 'wave'] : ['dive', 'burst1', 'burst2'];
        s.impacts(L.parts.map((p, i) => ({ id: ids[i], label: tx(p), v: shaman ? L.shaman[i] : p.v, count: 1,
          ...(p.right && !shaman ? { alt: p.right } : {}) })));
      }
      out(s.done());
      out(perSoul('spell.ddPerSoul', s.value, !!lvl, needSpell('dd'), extras).done());
    }

    // Howling Wraiths / Abyss Shriek
    {
      const lvl = st.spells.hw;
      const s = stat('spell.hw');
      const extras = [];
      if (!lvl) s.na(needSpell('hw'));
      else {
        const L = D.SPELLS.hw.levels[lvl];
        s.label(tx(L)).set(L.hits * L.perHit, SRC.spell('hw', lvl)).parts([{ label: L.hits + tx(T.hits), v: L.perHit, unit: tx(T.each) }]);
        if (shaman) {
          s.replace(L.hits * L.shamanPerHit, SRC.charm('shaman'), { text: pctText(50) }).parts([{ label: L.hits + tx(T.hits), v: L.shamanPerHit, unit: tx(T.each) }]);
          extras.push(SRC.charm('shaman'));
        }
        // Equal bursts: "not all of them always land, depending on movement and the hitbox" (wiki).
        s.note(tx(T.allImpacts)).impacts([{ id: 'burst', label: tx(L), v: shaman ? L.shamanPerHit : L.perHit, count: L.hits }]);
      }
      out(s.done());
      out(perSoul('spell.hwPerSoul', s.value, !!lvl, needSpell('hw'), extras).done());
    }

    if (shaman && !flags.anySpell) {
      // Without spells, Shaman Stone adds nothing: it shows in the cost.
    }
  }

  /* ── Strongest hit ────────────────────────────────────────────────────
     The biggest damage spike you can deal right now, with arts and spells measured in
     the same unit: Cyclone Slash counts by the total of its three hits, because its
     "per hit" figure can't be compared with a Great Slash.
     Only what's been learnt counts, and ties go to the art, which costs no soul.
     It's computed here, after the spells, because it needs to read both groups. */
  function burst(c, stats, v) {
    const { st } = c;
    const N = D.NAIL;
    const s = stat('nail.bestBurst');
    const opts = [];
    const add = (from, total, src, name, note, o = {}) => {
      if (from && from.applies && total > 0) opts.push({ from, total, src, name, note, ...o });
    };

    const gs = stats['nail.greatSlash'];
    add(gs, gs && gs.value, SRC.art('great'), tx(D.ARTS.great), tx(T.freeNoSoul));
    const ds = stats['nail.dashSlash'];
    add(ds, ds && ds.value, SRC.art('dash'), tx(D.ARTS.dash), tx(T.freeNoSoul));
    const cyc = stats['nail.cyclone'];
    add(cyc, cyc && cyc.value * N.cycloneHits, SRC.art('cyclone'), tx(D.ARTS.cyclone),
      N.cycloneHits + tx(T.hits), {
        text: N.cycloneHits + tx(T.hits) + ' × ' + num(cyc && cyc.value, 0),
        parts: cyc && cyc.applies ? [
          { label: N.cycloneHits + tx(T.hits), v: cyc.value * N.cycloneHits },
          { label: N.cycloneHitsMax + tx(T.mashing), v: cyc.value * N.cycloneHitsMax },
        ] : null,
      });

    const soulNote = num(v.spellCost, 0) + tx(T.soulEach);
    for (const key of ['hw', 'dd', 'vs']) {
      const sp = stats['spell.' + key];
      add(sp, sp && sp.value, SRC.spell(key, st.spells[key]), sp && sp.label, soulNote);
    }

    if (!opts.length) return s.na(tx(T.needArtOrSpell)).done();

    let best = opts[0];
    for (const o of opts) if (o.total > best.total) best = o;

    s.set(best.total, best.src, best.text ? { text: best.text } : undefined);
    if (best.parts) s.parts(best.parts);
    if (best.from.approx) s.approx();
    // The charms that have shaped that hit (Shaman Stone, Fury, Flukenest…)
    // are repeated here so the row shows their chips.
    for (const ct of best.from.contribs) {
      if (ct.active === false || !/^(charm|synergy):/.test(ct.source)) continue;
      s.via({ source: ct.source, label: ct.label, charms: ct.charms }, { text: ct.text });
    }
    return s.note(best.name + ' · ' + best.note).done();
  }

  /* ── Healing ─────────────────────────────────────────────────────────── */
  function heal(c, out, v) {
    const { has, flags } = c;
    const F = D.FOCUS;

    const can = stat('heal.canFocus').on(SRC.base);
    if (flags.joni) can.off(SRC.charm('joni'), { text: tx(T.lbNoFocus) });
    out(can.done());

    const quick = has('quickfocus'), deep = has('deepfocus');
    const mpf = stat('heal.masksPerFocus');
    const tpf = stat('heal.timePerFocus');
    const tpm = stat('heal.timePerMask');
    const spm = stat('heal.soulPerMask');
    const full = stat('heal.fullHeal');
    if (flags.joni) {
      for (const s of [mpf, tpf, tpm, spm, full]) s.na(tx(T.joniNoHeal));
      if (quick) tpf.inactive(SRC.charm('quickfocus'), { cond: tx(T.noEffectJoni) });
      if (deep) mpf.inactive(SRC.charm('deepfocus'), { cond: tx(T.noEffectJoni) });
    } else {
      mpf.set(1, SRC.base);
      if (deep) mpf.replace(F.deep.masks, SRC.charm('deepfocus'), { text: mult(2) });
      tpf.set(F.perMask, SRC.base, { text: tx(T.plusStartup) });
      if (quick && deep) {
        tpf.replace(F.deepQuick.time, SRC.synergy('quickfocus', 'deepfocus'), { text: tx(T.twoMasksSlower) });
      } else if (quick) {
        tpf.replace(F.perMaskQuick, SRC.charm('quickfocus'), { text: pctText(-33) });
      } else if (deep) {
        tpf.replace(F.deep.time, SRC.charm('deepfocus'), { text: pctText(65) });
      }
      tpm.set(tpf.value / mpf.value, SRC.base, { text: tx(T.timeOverMasks) });
      spm.set(F.cost / mpf.value, SRC.base, { text: tx(T.soulOverMasks) });
      full.set(Math.floor(v.totalSoul / F.cost) * mpf.value, SRC.base, { text: tx(T.focusesTimes) });
    }
    out(mpf.done()); out(tpf.done()); out(tpm.done()); out(spm.done()); out(full.done());

    const spore = stat('heal.spore');
    if (onlyWith(c, spore, 'spore')) {
      spore.set(F.sporeDamage, SRC.charm('spore'), { text: tx(T.over41s) }).approx();
      if (has('crest')) spore.replace(F.sporeDamageCrest, SRC.synergy('spore', 'crest'), { text: tx(T.denserCloud) });
    }
    out(spore.done());

    const radius = stat('heal.sporeRadius');
    if (onlyWith(c, radius, 'spore')) {
      radius.set(1, SRC.charm('spore'));
      if (deep) radius.mul(F.sporeRadiusDeep, SRC.synergy('spore', 'deepfocus'), { text: pctText(35) });
    }
    out(radius.done());

    const move = stat('heal.moveWhileFocus').off(SRC.base);
    if (has('unn')) move.on(SRC.charm('unn'), { text: tx(T.becomeSlug) });
    out(move.done());
  }

  /* ── Movement ────────────────────────────────────────────────────────── */
  function move(c, out) {
    const { has, flags } = c;
    const M = D.MOVE;

    const run = stat('move.run').set(M.run, SRC.base);
    if (has('sprintmaster')) {
      run.replace(M.runSprint, SRC.charm('sprintmaster'), { text: pctText(20) });
      if (has('dashmaster')) run.replace(M.runSprintDash, SRC.synergy('sprintmaster', 'dashmaster'), { text: pctText(39) + tx(T.inTotal) });
    }
    out(run.done());

    // Without a cloak there's no dash; without the Shade Cloak, neither its cooldown nor Sharp Shadow.
    const dash = stat('move.dashCooldown');
    const down = stat('move.dashDown');
    if (!flags.cloak) {
      dash.na(needCloak(1)); down.na(needCloak(1));
      if (has('dashmaster')) dash.inactive(SRC.charm('dashmaster'), { cond: needCloak(1) });
    } else {
      dash.set(M.dashCooldown, SRC.base); down.off(SRC.base);
      if (has('dashmaster')) {
        dash.replace(M.dashCooldownDashmaster, SRC.charm('dashmaster'), { text: pctText(-33) });
        down.on(SRC.charm('dashmaster'));
      }
    }
    out(dash.done()); out(down.done());

    const scd = stat('move.shadowCooldown');
    const ssp = stat('move.shadowSpeed');
    if (flags.cloak < 2) {
      scd.na(needCloak(2)); ssp.na(needCloak(2));
      if (has('sharpshadow')) ssp.inactive(SRC.charm('sharpshadow'), { cond: needCloak(2) });
    } else {
      scd.set(M.shadowCooldown, SRC.base); ssp.set(M.dashSpeed, SRC.base);
      if (has('dashmaster')) scd.inactive(SRC.charm('dashmaster'), { cond: tx(T.notShadeCloak) });
      if (has('sharpshadow')) ssp.replace(M.shadowSpeedSharp, SRC.charm('sharpshadow'), { text: pctText(40) + tx(T.speedAndRange) });
    }
    out(scd.done()); out(ssp.done());

    const unn = stat('move.unnSpeed');
    if (onlyWith(c, unn, 'unn')) {
      unn.set(M.unnSpeed, SRC.charm('unn'));
      if (has('quickfocus')) unn.replace(M.unnSpeedQuick, SRC.synergy('unn', 'quickfocus'), { text: mult(2) });
    }
    out(unn.done());
  }

  /* ── Companions ──────────────────────────────────────────────────────── */
  function pets(c, out) {
    const { st, has, flags } = c;
    const P = D.PETS;

    const wv = stat('pet.weaverling');
    if (onlyWith(c, wv, 'weaversong')) wv.set(P.weaverlingDamage, SRC.charm('weaversong'), { text: P.weaverlings + tx(T.weaverlings) });
    out(wv.done());
    const wvs = stat('pet.weaverlingSoul');
    if (onlyWith(c, wvs, 'weaversong')) {
      wvs.set(0, SRC.charm('weaversong'));
      if (has('grubsong')) wvs.replace(D.SOUL.weaverlingGrubsong, SRC.synergy('weaversong', 'grubsong'), { text: tx(T.evenNoSoul) });
    }
    out(wvs.done());
    const wvv = stat('pet.weaverlingSpeed');
    if (onlyWith(c, wvv, 'weaversong')) {
      wvv.set(1, SRC.charm('weaversong'));
      if (has('sprintmaster')) wvv.mul(D.MOVE.weaverlingSprintMult, SRC.synergy('weaversong', 'sprintmaster'), { text: pctText(50) });
    }
    out(wvv.done());

    const hat = stat('pet.hatchling');
    const hatCloud = stat('pet.hatchlingCloud');
    const hatCost = stat('pet.hatchlingCost');
    if (onlyWith(c, hat, 'womb')) {
      hat.set(P.hatchlingDamage, SRC.charm('womb'), { text: tx(T.hatchlingRate) });
      if (has('crest')) hat.replace(P.hatchlingCrestDamage, SRC.synergy('womb', 'crest'), { text: tx(T.restToCloud) });
      if (has('fury')) {
        if (flags.fury) hat.add(P.hatchlingFuryBonus, SRC.charm('fury'), { cond: tx(T.atOneMask) });
        else hat.inactive(SRC.charm('fury'), { cond: tx(T.onlyOneMask) });
      }
      hatCost.set(D.SOUL.hatchlingCost, SRC.charm('womb'));
      if (has('crest')) hatCloud.set(P.hatchlingCrestCloud, SRC.synergy('womb', 'crest'), { text: tx(T.oneSecCloud) }).approx();
      else hatCloud.na(needCharm('crest'), true);
    } else {
      hatCloud.na(needCharm('womb'), true);
      hatCost.na(needCharm('womb'), true);
    }
    out(hat.done()); out(hatCloud.done()); out(hatCost.done());

    const gc = stat('pet.grimmchild');
    const gcd = stat('pet.grimmchildDps');
    if (onlyWith(c, gc, 'grimmchild')) {
      const dmg = P.grimmchildByPhase[flags.grimm];
      if (!dmg) { gc.na(tx(T.grimmNoAttack)); gcd.na(tx(T.grimmNoAttack), true); } else {
        gc.set(dmg, SRC.charm('grimmchild'), { text: tx(T.grimmPhase) + flags.grimm + ', ' + tx(T.grimmShot) });
        gcd.set(dmg / P.grimmchildEvery, SRC.base, { text: tx(T.grimmDps) });
      }
    } else gcd.na(needCharm('grimmchild'), true);
    out(gc.done()); out(gcd.done());

    const cloud = stat('pet.crestCloud');
    if (onlyWith(c, cloud, 'crest')) cloud.set(P.crestCloudDamage, SRC.charm('crest'), { text: tx(T.crestClouds) }).approx();
    out(cloud.done());

    const ds = stat('pet.dreamshieldSize');
    if (onlyWith(c, ds, 'dreamshield')) {
      ds.set(1, SRC.charm('dreamshield'));
      if (has('wielder')) ds.mul(P.dreamshieldWielderSize, SRC.synergy('dreamshield', 'wielder'), { text: pctText(15) });
    }
    out(ds.done());
  }

  /* ── Abilities and effects ───────────────────────────────────────────── */
  function abilities(c, out) {
    const { st, has, flags } = c;

    const over = stat('abil.overcharmed').off(SRC.base);
    if (flags.overcharmed) over.on(SRC.overcharm, { text: c.notches.used + tx(T.notchesOf) + c.notches.max + tx(T.notches) + tx(T.doubleDamage) });
    out(over.done());

    const flag = (id, charmId, o) => {
      const s = stat(id).off(SRC.base);
      if (has(charmId)) s.on(SRC.charm(charmId), o);
      out(s.done());
    };
    flag('abil.noRecoil', 'steady');
    flag('abil.geoPickup', 'swarm');
    flag('abil.mapPosition', 'compass');
    flag('abil.blockProjectiles', 'dreamshield', { text: tx(T.shieldBreaks) });
    flag('abil.voidNeutral', 'voidheart', { text: tx(T.voidNeutral) });

    const geo = stat('abil.geoBonus').set(1, SRC.base);
    if (flags.greed) geo.mul(1.2, SRC.charm(flags.greed), { text: pctText(20) + tx(T.everyCoin) });
    out(geo.done());

    const leg = stat('abil.legEater').set(0, SRC.base);
    if (has('crest')) leg.replace(20, SRC.charm('crest'), { text: tx(T.itemsRepairs) });
    out(leg.done());

    // Essence is collected with the Dream Nail.
    const ess = stat('abil.essence');
    if (!flags.dream) {
      ess.na(needDream());
      if (has('wielder')) ess.inactive(SRC.charm('wielder'), { cond: needDream() });
    } else {
      ess.set(1, SRC.base);
      if (has('wielder')) ess.mul(1.5, SRC.charm('wielder'), { text: pctText(50) + tx(T.ofChance) });
    }
    out(ess.done());

    const frag = stat('abil.fragile').set(0, SRC.base);
    for (const id of st.charms) if (D.CHARM_BY_ID[id] && D.CHARM_BY_ID[id].fragile) frag.add(1, SRC.charm(id), { text: tx(T.breaksOnDeath) });
    out(frag.done());
  }

  /* ── compute ─────────────────────────────────────────────────────────── */
  /* options.bindings = { nail, shell, charms, soul }: a Pantheon's bindings. With no
     options, the sheet is exactly the usual one. The Charms binding needs no hook:
     it's the build without charms. */
  /* options.fight = { masks, lbJoni, lbExtra, lbCocoon, elegyHalted }: the arena fight's health,
     which overrides st.hp for Fury and Elegy (see health()). */
  function compute(state, lang, options) {
    LANG = lang === 'en' ? 'en' : 'es';
    const bind = (options && options.bindings) || null;
    const fight = (options && options.fight) || null;
    const st = (bind || fight) ? { ...state, charms: bind && bind.charms ? [] : state.charms, bind, fight } : state;
    const c = context(st);
    const stats = {};
    const out = (s) => { stats[s.id] = s; };
    const v = {};   // values shared between groups (damage, total soul, cost…)
    health(c, out, v);
    soul(c, out, v);
    nail(c, out, v);
    spells(c, out, v);
    out(burst(c, stats, v));
    heal(c, out, v);
    move(c, out, v);
    pets(c, out, v);
    abilities(c, out, v);
    const groups = D.GROUPS.map((g) => ({
      id: g.id, label: tx(g),
      stats: D.STAT_DEFS.filter((d) => d.group === g.id).map((d) => stats[d.id]).filter(Boolean),
    }));
    return { state, bindings: bind, notches: c.notches, flags: c.flags, currentHealth: v.currentHealth, joniLifeblood: v.joniLifeblood, stats, groups };
  }

  /* ── diff: what changes between two sheets ───────────────────────────── */
  function statsEqual(a, b) {
    if (a.applies !== b.applies) return false;
    if (!a.applies) return true;
    if (typeof a.value === 'number' && typeof b.value === 'number') return Math.abs(a.value - b.value) < 1e-9;
    return a.value === b.value;
  }

  /* Conversions: a stat whose value moves to another (Joni's Blessing moves the masks to
     lifeblood). It's neither lost nor appears out of nowhere: it changes place, and the balance
     shows in total health. Both sides are marked so as not to read half the story:
     the one that empties ('out') is never a change for the worse. */
  function transfersBetween(sheetA, sheetB) {
    const moved = new Map();          // stat that empties → the one that receives the value
    for (const def of D.STAT_DEFS) {
      const a = sheetA.stats[def.id], b = sheetB.stats[def.id];
      if (!a || !b || statsEqual(a, b)) continue;
      const into = b.into || a.into;  // the direction doesn't matter: equipping the charm or removing it
      if (into) moved.set(def.id, into);
    }
    return moved;
  }

  // List of changes sorted by relevance: [{ id, label, before, after, delta, kind }]
  // kind: 'value' (the number/flag changes) | 'gain' (appears) | 'loss' (disappears)
  // transfer: 'out' (its value moves to another) | 'in' (receives it) | null
  function diff(sheetA, sheetB) {
    const changes = [];
    const moved = transfersBetween(sheetA, sheetB);
    const landed = new Set(moved.values());
    for (const def of D.STAT_DEFS) {
      const a = sheetA.stats[def.id], b = sheetB.stats[def.id];
      if (!a || !b || statsEqual(a, b)) continue;
      let kind = 'value';
      if (!a.applies && b.applies) kind = 'gain';
      else if (a.applies && !b.applies) kind = 'loss';
      const numeric = kind === 'value' && typeof a.value === 'number';
      const delta = numeric ? b.value - a.value : null;
      let good = null;
      if (def.fmt === 'flag') {
        if (kind === 'value') good = def.better === 'on' ? b.value === true : b.value === false;
        else if (kind === 'gain') good = def.better === 'on' ? b.value === true : b.value === false;
      } else if (def.better !== 'none') {
        if (numeric) good = def.better === 'up' ? delta > 0 : delta < 0;
        else if (kind === 'gain') good = true;
        else if (kind === 'loss') good = false;
      }
      const transfer = moved.has(def.id) ? 'out' : landed.has(def.id) ? 'in' : null;
      if (transfer === 'out') good = null;
      changes.push({ id: def.id, label: b.label, short: tx(def.short) || b.label, weight: def.weight, fmt: def.fmt, before: a, after: b, delta, kind, good, transfer, into: moved.get(def.id) || null });
    }
    changes.sort((x, y) => y.weight - x.weight || D.STAT_DEFS.findIndex((d) => d.id === x.id) - D.STAT_DEFS.findIndex((d) => d.id === y.id));
    return changes;
  }

  HK.engine = { compute, diff, roundEven, joniLifeblood, SRC };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.engine;
})();
