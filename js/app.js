/* js/app.js — Hollow: state, storage, URL, rendering and events.
   The page is made of screens, like the game's pause menu: a one-row header, the screen bar
   (with the mini-bar and the Hunter's Journal button) and, one at a time, Charms (the sheet:
   the HUD, the charm band with its detail, the figures, the plates and the collapsible full
   sheet), Your game (nail, body, arts, spells and abilities) and Combat (the arena, the Hall of
   Gods and the Pantheons). The screen travels in the URL ("view=").
   Every state change repaints from templates; a single listener delegated by data-act handles
   the clicks. The language comes from js/i18n.js and applies to the whole render. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, C = HK.codec, I = HK.i18n, F = HK.foes, PN = HK.pantheons, J = HK.journal, HG = HK.hall;
  const FT = HK.fight;              // the combat rules (js/fight.js)
  const t = (k, v) => I.t(k, v);
  const pick = (v) => I.pick(v);

  const KEY = { build: 'hollow.build', baseline: 'hollow.baseline', prefs: 'hollow.prefs', run: 'hollow.run', hall: 'hollow.hall', owned: 'hollow.owned', door: 'hollow.bindings' };
  // With no enemy, half of Combat comes out empty: whoever has none starts with the first boss.
  const DEFAULT_FOE = 'false-knight';
  const $ = (sel) => document.querySelector(sel);
  const el = {
    page: $('.page'), masthead: $('#masthead'), colophon: $('#colophon'), nav: $('#nav'), guide: $('#guide'), panel: $('#panel'),
    mini: $('#minihud'), banner: $('#banner'), gear: $('#gear'), hj: $('#hj'),
    toast: $('#toast'), fx: $('#overcharm-fx'), fight: $('#fight'),
  };
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)');

  // The screens, like the pages of the game's pause menu: Charms, Your game, Combat and the Journal.
  const VIEWS = ['charms', 'game', 'fight', 'journal'];
  const SPELL_KEYS = ['vs', 'dd', 'hw'];
  const ART_KEYS = ['cyclone', 'dash', 'great'];
  const ART_STAT = { cyclone: 'nail.cyclone', dash: 'nail.dashSlash', great: 'nail.greatSlash' };
  // Positional charms: the arena doesn't simulate them, it names them (design/04 §3.3, family E).
  const POSITIONAL = ['sprintmaster', 'steady', 'heavy', 'longnail', 'pride', 'crest', 'unn'];

  // Example builds for first use: upgrades maxed out and a handful of charms with synergy.
  const EXAMPLES = [
    { id: 'nail', name: 'exNail', desc: 'exNailDesc', charms: ['ustrength', 'fury', 'quickslash', 'pride'], hp: 1 },
    { id: 'spells', name: 'exSpells', desc: 'exSpellsDesc', charms: ['shaman', 'twister', 'eater', 'catcher'], hp: 0 },
    { id: 'lifeblood', name: 'exLifeblood', desc: 'exLifebloodDesc', charms: ['joni', 'lbcore', 'lbheart', 'stalwart'], hp: 0 },
  ];

  const NEED_KEY = {
    'spell:vs': 'needSpellVs', 'spell:any': 'needSpellAny', 'art:any': 'needArtAny',
    'cloak:1': 'needCloak1', 'cloak:2': 'needCloak2', dream: 'needDream',
  };

  /* ── Utilities ───────────────────────────────────────────────────────── */
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const save = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* no storage */ } };
  let NF = {};
  const rebuildNF = () => { NF = { 0: I.nf(0), 1: I.nf(1), 2: I.nf(2), 3: I.nf(3) }; };
  const pctSpace = () => (I.current === 'es' ? ' %' : '%');

  function fmtValue(v, fmt, approx) {
    if (fmt === 'flag') return v ? t('yes') : t('no');
    let s;
    switch (fmt) {
      case 'int': s = NF[0].format(v); break;
      case 'dec1': s = NF[1].format(v); break;
      case 'dec2': s = NF[2].format(v); break;
      case 'dec3': s = NF[3].format(v); break;
      case 'sec': s = NF[3].format(v) + ' s'; break;
      case 'pct': s = NF[1].format(v) + pctSpace(); break;
      case 'mult': s = '×' + NF[2].format(v); break;
      case 'speed': s = NF[1].format(v) + ' u/s'; break;
      default: s = String(v);
    }
    return (approx ? '~' : '') + s;
  }
  const fmtStat = (s) => fmtValue(s.value, s.fmt, s.approx);

  /* Like fmtStat, but in HTML: the unit gets its own tag so it doesn't weigh the same as the
     number ("0.891 s", not "0.891 S"), and a value that doesn't apply comes out as a small
     dash rather than a huge figure. It escapes on its own: what comes out of here does NOT
     go through esc() again. */
  function fmtStatRich(s) {
    if (!s || !s.applies) return '<i class="na">—</i>';
    if (s.fmt === 'flag') return esc(fmtStat(s));
    const raw = fmtStat(s);
    if (s.fmt === 'mult') {
      const i = raw.indexOf('×');
      return esc(raw.slice(0, i)) + '<i class="u u-mult">×</i>' + esc(raw.slice(i + 1));
    }
    const unit = s.fmt === 'sec' ? ' s' : s.fmt === 'speed' ? ' u/s' : s.fmt === 'pct' ? pctSpace() : '';
    if (!unit) return esc(raw);
    return esc(raw.slice(0, raw.length - unit.length)) + '<i class="u">' + esc(unit) + '</i>';
  }
  const sign = (d) => (d > 0 ? '+' : '−');
  const masksText = (n) => (n === 1 ? t('maskOne') : t('maskMany', { n }));
  const notchText = (n) => (n === 1 ? t('notchOne') : t('notchMany', { n }));
  /* A spell's picture. With Flukenest, Vengeful Spirit is no longer its projectile but the flukes,
     which in the game change with the level and with Defender's Crest: grey, black or the volatile one. */
  const spellArt = (k, lvl, has) => (k === 'vs' && lvl && has('flukenest')
    ? D.art('spells', has('crest') ? 'fluke-dung' : lvl === 2 ? 'fluke2' : 'fluke')
    : D.art('spells', lvl === 2 ? k + '2' : k));

  // Text for a diff() change's delta: "+11", "−0.13 s", "+40%", "new", "now on".
  function fmtDelta(ch) {
    if (ch.kind === 'gain') return t('dNew');
    if (ch.kind === 'loss') return t('dGone');
    if (ch.fmt === 'flag') return ch.after.value ? t('dNowYes') : t('dNowNo');
    if (ch.fmt === 'mult' && ch.before.value) {
      const p = (ch.after.value / ch.before.value - 1) * 100;
      return sign(p) + NF[1].format(Math.abs(p)) + pctSpace();
    }
    return sign(ch.delta) + fmtValue(Math.abs(ch.delta), ch.fmt, false);
  }
  const shortOf = (id) => (D.STAT_BY_ID[id] ? pick(D.STAT_BY_ID[id].short) : id);
  // Short text for badges: "+11 damage", "weavers 3", "no recoil".
  // In a conversion the number isn't added to what you had, it replaces it: it's written
  // in full ("lifeblood 13"), because a "+13" on top of 9 masks that no longer exist is misleading.
  function badgeText(ch) {
    if (ch.fmt === 'flag') return ch.after.value ? ch.short : t('notShort', { what: ch.short });
    if (ch.transfer === 'out') return t('becomesShort', { what: shortOf(ch.into) });
    if (ch.kind === 'gain' || ch.transfer === 'in') return ch.short + ' ' + fmtStat(ch.after);
    if (ch.kind === 'loss') return t('withoutShort', { what: ch.short });
    return fmtDelta(ch) + ' ' + ch.short;
  }
  const goodClass = (good) => (good === true ? 'good' : good === false ? 'bad' : '');

  // Delta chip for a stat against the same stat on the reference sheet.
  function deltaChip(s, cmp, title) {
    if (!s || !s.applies || !cmp) return '';
    const ch = E.diff({ stats: { [s.id]: cmp } }, { stats: { [s.id]: s } })[0];
    if (!ch) return '';
    return `<span class="delta ${goodClass(ch.good)}" title="${esc(title || t('vsRef'))}: ${esc(cmp.applies ? fmtStat(cmp) : t('notApplicable'))}">${esc(fmtDelta(ch))}</span>`;
  }
  /* Chip for what your last action just moved, not for the distance to the reference: it only
     shows in commit()'s repaint (flashIds) and fades by itself (.delta.is-last). */
  function changeChip(id) {
    const ch = flashIds && flashIds.get(id);
    if (!ch) return '';
    const was = ch.before && ch.before.applies ? fmtStat(ch.before) : t('notApplicable');
    return `<span class="delta is-last ${goodClass(ch.good)}" title="${esc(t('dWas', { v: was }))}">${esc(fmtDelta(ch))}</span>`;
  }

  function needsMet(charm, st) {
    switch (charm.needs) {
      case 'spell:vs': return st.spells.vs > 0;
      case 'spell:any': return st.spells.vs > 0 || st.spells.dd > 0 || st.spells.hw > 0;
      case 'art:any': return st.arts.cyclone || st.arts.dash || st.arts.great;
      case 'cloak:1': return st.cloak >= 1;
      case 'cloak:2': return st.cloak >= 2;
      case 'dream': return st.dream;
      default: return true;
    }
  }

  /* ── State ───────────────────────────────────────────────────────────── */
  let state = C.normalize({});
  let baseline = null;              // state pinned for comparison, or null
  let prefs = { lang: 'en', langChosen: false, compare: 'base', open: [], view: 'charms', detailOpen: false, guideSeen: false,
                foeId: '', foeKind: 'all',
                fightTab: 'combat', pantheon: 'master',
                hallId: HG.STATUES[0].id, hallDiff: '',
                bindings: { nail: false, shell: false, charms: false, soul: false },
                melody: 0 };          // hits since the last Carefree Melody block: survives the fight, as in the game
  let sheet = null;                 // sheet for the current build
  let cmpSheet = null;              // sheet for the build being compared against
  let impacts = {};                 // charm id → impact on the current build, computed on demand (impact)
  let flashIds = null;              // id → diff() change for what just changed: only commit()'s render paints it (flash and chip)
  let detailSel = '';               // the charm in the band's detail: the last one touched, pressed or focused
  let detailHover = '';             // the one under the mouse: it takes over from the chosen one while it lasts
  let pickerOpen = false;           // the Hunter's Journal, open, to pick an enemy
  let pickerQuery = '';             // what has been typed in its search box
  let jrCursor = '';                // the entry being read on its page (not the enemy yet)
  let jrPeek = null;                // the one peeking on the page with the mouse over it, not picked
  let hjPeek = null;                // the same in your game's Journal

  function loadPrefs() {
    try { Object.assign(prefs, JSON.parse(load(KEY.prefs) || '{}')); } catch (e) { /* corrupt prefs */ }
    // English by default. Spanish used to be saved even when nobody had chosen it,
    // so only a language that was really chosen (selector or link) is honoured.
    if (!prefs.langChosen || !['es', 'en'].includes(prefs.lang)) prefs.lang = 'en';
    if (!['base', 'nocharms', 'pinned'].includes(prefs.compare)) prefs.compare = 'base';
    if (!Array.isArray(prefs.open)) prefs.open = [];
    delete prefs.diff;   // difficulty no longer belongs to Combat: it belongs to each statue in the Hall
    delete prefs.gearOpen; delete prefs.fightOpen;   // Gear and combat no longer collapse: they are screens
    if (!VIEWS.includes(prefs.view)) prefs.view = 'charms';
    if (!F.FOE_BY_ID[prefs.foeId]) prefs.foeId = DEFAULT_FOE;
    if (!['all', 'boss', 'enemy'].includes(prefs.foeKind)) prefs.foeKind = 'all';
    if (!['combat', 'hall', 'pantheon'].includes(prefs.fightTab)) prefs.fightTab = 'combat';
    if (!HG.STATUE_BY_ID[prefs.hallId]) prefs.hallId = HG.STATUES[0].id;
    if (!HG.DIFFS.includes(prefs.hallDiff)) prefs.hallDiff = '';
    if (!PN.PANTHEON_BY_ID[prefs.pantheon]) prefs.pantheon = 'master';
    prefs.melody = Math.max(0, Math.min(99, Math.floor(Number(prefs.melody) || 0)));
    const b = prefs.bindings && typeof prefs.bindings === 'object' ? prefs.bindings : {};
    prefs.bindings = { nail: !!b.nail, shell: !!b.shell, charms: !!b.charms, soul: !!b.soul };
  }
  const savePrefs = () => save(KEY.prefs, JSON.stringify(prefs));

  /* The language and the screen travel in the URL with the build, but aren't part of it: if
     "view=" were read as a build, a bare #view=fight would be read as the base Knight and wipe
     out yours. */
  function splitHash(hash) {
    const text = String(hash || '').replace(/^#/, '');
    const keep = [];
    let lang = null, view = null;
    for (const pair of text.split('&')) {
      if (/^lang=/.test(pair)) lang = pair.slice(5);
      else if (/^view=/.test(pair)) view = pair.slice(5);
      else if (pair) keep.push(pair);
    }
    return { build: keep.join('&'), lang: ['es', 'en'].includes(lang) ? lang : null, view: VIEWS.includes(view) ? view : null };
  }

  function loadState() {
    const { build } = splitHash(location.hash);
    if (!C.isEmpty(build)) return C.decode(build);
    const stored = load(KEY.build);
    if (stored) return C.decode(stored);
    return C.normalize(C.PRESETS.max);   // the first time, everything maxed out: that way everything shows
  }

  /* A screen's URL: the build, the language if it isn't English (the default) and the screen
     if it isn't Charms (the start screen). Share leaves it out: the fight doesn't travel in the
     link, so opening it on Combat would show the recipient's own fight. */
  const hashFor = (view = prefs.view) => '#' + C.encode(state) + (prefs.lang === 'es' ? '&lang=es' : '')
    + (view && view !== 'charms' ? '&view=' + view : '');
  /* Every screen change leaves a history entry, so that Back returns to the previous one;
     build changes rewrite the entry you're on. They all carry the mark {hk: 1}: going back
     to one of them changes the screen and nothing else (onHistory). */
  function writeUrl(push) {
    const url = hashFor();
    try {
      if (push) history.pushState({ hk: 1 }, '', url);
      else if (location.hash !== url || !(history.state && history.state.hk)) history.replaceState({ hk: 1 }, '', url);
    } catch (e) { if (location.hash !== url) location.hash = url; }
  }

  function persist() {
    save(KEY.build, C.encode(state));
    writeUrl(false);
  }

  function compareState() {
    if (prefs.compare === 'pinned' && baseline) return baseline;
    if (prefs.compare === 'nocharms') return C.normalize({ ...state, charms: [] });
    return C.normalize({ ...C.PRESETS.base, hp: state.hp });
  }
  const compareLabel = () => (prefs.compare === 'pinned' && baseline ? t('vsPinned') : prefs.compare === 'nocharms' ? t('vsNoCharms') : t('vsBase'));

  // A charm's impact on the current build: what changes when you equip it (or what it adds if you already wear it).
  function situationFor(charm, st) {
    if (charm.situational === 'hp:one' && st.hp !== 1) return { st: C.set(st, 'hp', 1), label: t('hpOne') };
    if (charm.situational === 'hp:full' && st.hp !== 0) return { st: C.set(st, 'hp', 0), label: t('hpFull') };
    return null;
  }
  // Stats that only change because of overcharming: they aren't "the charm's effect".
  const OVERCHARM_IDS = new Set(['health.damageMult', 'health.hitsToDie', 'abil.overcharmed']);
  const compute = (st) => E.compute(st, prefs.lang);

  function impactOf(id) {
    const charm = D.CHARM_BY_ID[id];
    const equipped = state.charms.includes(id);
    const action = C.charmAction(state, id);
    // With no free notches it's computed "as if you had them", to show what it would do anyway.
    const hypothetical = !equipped && action.action === 'blocked';
    const base = hypothetical ? C.set(state, 'notches', D.CHARM_NOTCHES.max) : state;
    let withSt, withoutSt;
    if (equipped) {
      withSt = base;
      withoutSt = C.normalize({ ...base, charms: base.charms.filter((x) => x !== id) });
    } else {
      withoutSt = base;
      withSt = C.toggleCharm(base, id) || C.normalize({ ...base, charms: [...base.charms, id] });
    }
    const withSheet = equipped && !hypothetical ? sheet : compute(withSt);
    const withoutSheet = !equipped && !hypothetical ? sheet : compute(withoutSt);
    let changes = E.diff(withoutSheet, withSheet);
    let cond = null, condSheet = withSheet;
    const onlyOvercharm = changes.every((ch) => OVERCHARM_IDS.has(ch.id));   // also when there are no changes
    if (onlyOvercharm) {
      const s = situationFor(charm, state);
      if (s) {
        const sBase = hypothetical ? C.set(s.st, 'notches', D.CHARM_NOTCHES.max) : s.st;
        const w2 = compute(C.normalize({ ...sBase, charms: withSt.charms }));
        const wo2 = compute(C.normalize({ ...sBase, charms: withoutSt.charms }));
        const ch2 = E.diff(wo2, w2);
        if (ch2.some((ch) => !OVERCHARM_IDS.has(ch.id))) { changes = ch2; cond = s.label; condSheet = w2; }
      }
    }
    // Overcharming goes last, after what the charm itself does.
    // In the hypothetical calculation (no free notches) overcharming is an artefact and is left out.
    const over = hypothetical ? [] : changes.filter((ch) => OVERCHARM_IDS.has(ch.id));
    changes = changes.filter((ch) => !OVERCHARM_IDS.has(ch.id)).concat(over);
    return { charm, equipped, action, changes, cond, hypothetical, withSheet: condSheet, unmet: !needsMet(charm, state) };
  }

  // It costs two compute() calls: only the charm being looked at is computed, and it holds until the next change.
  const impact = (id) => impacts[id] || (impacts[id] = impactOf(id));

  function recompute() {
    sheet = compute(state);
    cmpSheet = compute(compareState());
    impacts = {};
    fightSync();
  }

  /* Applies a new state and repaints. In the middle of a pantheon it rejects anything that
     touches charms or notches (see charmLock) and says so; returns whether it was applied. */
  function commit(next) {
    if (!next) return false;
    next = withFixed(next);
    const lock = charmLock();
    if (lock && touchesCharms(next)) { toast(lock); return false; }
    const prev = sheet;
    const wasOvercharmed = !!(prev && prev.notches.overcharmed);
    state = next;
    persist();
    recompute();
    const changes = prev ? E.diff(prev, sheet) : [];
    // What just changed flashes once, with its chip: on the next repaint, no longer.
    flashIds = new Map(changes.map((c) => [c.id, c]));
    render();
    flashIds = null;
    // Only on the jump to overcharmed: when equipping too much or when notches are taken away.
    if (!wasOvercharmed && sheet.notches.overcharmed) overcharmFx();
    return true;
  }

  /* ── Overcharm: the game's flash and shake ─────────────────────────────
     In the game, going over your notches lights the screen up in white and violet and
     shakes it, and the edges are tinted purple for a moment. Here it plays once, when you
     cross the threshold, and goes away: none of it stays while you remain overcharmed. The
     timer lasts as long as the longest animation: the purple edge, 2600 ms, which fades out slowly. With "prefers-reduced-motion" the CSS reduces the animations to nothing and
     the layer stays invisible; the timer removes it all the same, so no special case
     is needed. */
  let fxTimer = 0;
  function overcharmFx(gold = false) {
    const root = document.documentElement;
    const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
    const mood = gold ? 'is-binding-all' : 'is-overcharming';
    root.classList.remove('is-overcharming', 'is-binding-all');
    el.fx.classList.toggle('is-gold', gold);
    el.fx.hidden = false;
    restart(el.fx, 'is-on');
    restart(el.page, 'is-quaking');
    root.classList.add(mood);
    clearTimeout(fxTimer);
    // Without the purple edge, the gold lasts as long as the icons' pulse (3 × 420 ms).
    fxTimer = setTimeout(() => {
      el.fx.classList.remove('is-on', 'is-gold');
      el.fx.hidden = true;
      el.page.classList.remove('is-quaking');
      root.classList.remove(mood);
    }, gold ? 1300 : 2600);
  }
  /* Picking the pantheon's fourth binding: in the game, its icons light up in gold. Here, on top
     of that, the overcharm hit in that gold: flash, shake and the four of them pulsing. */
  const bindAllFx = () => overcharmFx(true);

  /* ── Mockup ornaments ────────────────────────────────────────────────── */
  const brackets = '<span class="bk tl"></span><span class="bk tr"></span><span class="bk bl"></span><span class="bk br"></span>';
  const chevron = (up) => `<svg class="chev ${up ? 'up' : ''}" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1.5 L6 6 L11 1.5"/></svg>`;
  const cross = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10"/></svg>';
  const rule = `<svg class="rule" width="220" height="12" viewBox="0 0 220 12" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M0 6 H92"/><path d="M128 6 H220"/><path d="M110 1 L116 6 L110 11 L104 6 Z"/></svg>`;
  /* Each screen's header, the same on all three: the title in Cinzel, centred, with its rule
     and the diamond, inside the black. Whatever goes below it (the presets, the combat
     tabs) arrives in "after". The title gets focus when arriving from another screen. */
  const screenHead = (title, after = '') => `<header class="inv-head"><h2 class="sec-title screen-title" tabindex="-1">${title}</h2>${rule}${after}</header>`;

  /* ── The soul orb and the vessels, traced from the HUD ─────────────────
     The game describes the orb like this: "a circular meter that fills with white liquid,
     revealing two eye holes that give it the look of a face". So it isn't drawn by hand:
     it's the game's sprite (assets/hud/soul-meter.png, Soul_Meter.png on the wiki), with
     the empty, dark container underneath. The measurements come from the sprite itself
     (130 × 125 px): the disc runs from (9.75, 7.75) to (118.25, 115.25), 108 px across, so
     to fill the orb's box it's scaled to 130/108 = 120.37% and shifted −9.03% and −7.18%
     (.hud-soul in css/app.css). The reserve vessels carry the interface's soul
     (assets/hud/soul.png, a 37 px white disc in a 45 px image: 121.6% and −10.8%). The
     item icon (vessel.png) doesn't work here: it's what you pick up. Both are painted by
     hudHtml(), on the sheet and in the arena. */

  /* ── Header and screen bar ───────────────────────────────────────────── */
  /* 20 dust motes rising slowly, like the ones in the game's main menu. They sit in fixed
     places, spread without randomness so that two paints come out the same; the CSS only moves
     them if reduced motion hasn't been requested, and places them relative to .page, across the
     full width. Between 4 and 92% of the width, with their ±30 px drift: none peeks over the edge. */
  const MOTES = Array.from({ length: 20 }, (_, i) => {
    const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return `<i style="--x:${(4 + r(1) * 88).toFixed(1)}%;--s:${(1 + r(2) * 2.6).toFixed(1)}px;--t:${(16 + r(3) * 14).toFixed(1)}s;--d:${(-r(4) * 30).toFixed(1)}s;--o:${(0.25 + r(5) * 0.5).toFixed(2)};--dx:${((r(6) - 0.5) * 60).toFixed(0)}px"></i>`;
  }).join('');

  /* The header, in one row: the title under the game's filigree —the one from the Hall of Gods
     screen (assets/hall/tablet-hdr.png, white stroke), small— and on the right what applies to
     the whole site: the language and Share. The filigree stays white, as in the game: over
     file:// it can't be tinted with mask-image. Title and filigree are a link to the start
     screen, Charms, like the logo on almost any website. */
  const VIEW_KEY = { charms: 'navCharms', game: 'navGame', fight: 'navFight', journal: 'navJournal' };
  function renderMasthead() {
    document.title = prefs.view === 'charms' ? t('title') : t(VIEW_KEY[prefs.view]) + ' · ' + t('title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('metaDescription'));
    // The screen labels are fixed in index.html: they change with the language.
    el.panel.setAttribute('aria-label', t('navCharms'));
    el.gear.setAttribute('aria-label', t('navGame'));
    el.fight.setAttribute('aria-label', t('navFight'));
    el.hj.setAttribute('aria-label', t('jrTitle'));
    // In the corner, as text: the abbreviation in view and the full name for screen readers and the mouse.
    const langBtn = (code, label) => `<button type="button" lang="${code}" data-act="lang" data-value="${code}" aria-pressed="${prefs.lang === code}" aria-label="${label}" title="${label}">${code.toUpperCase()}</button>`;
    el.masthead.innerHTML = `
      <div class="motes" aria-hidden="true">${MOTES}</div>
      <a class="brand" href="${hashFor('charms')}" data-act="view" data-value="charms" title="${esc(t('goHome'))}">
        <img class="mh-hdr" src="assets/hall/tablet-hdr.png" alt="" width="862" height="111">
        <h1 class="title">${esc(t('title'))}</h1>
      </a>
      <div class="mh-tools">
        <div class="langsel" role="group" aria-label="${esc(t('langGroup'))}">${langBtn('en', 'English')}${langBtn('es', 'Español')}</div>
        <button type="button" class="mh-link" data-act="share" title="${esc(t('shareHint'))}">${esc(t('share'))}</button>
      </div>`;
  }

  /* The footer, under every screen: that this is a fan project with Team Cherry's artwork, and
     where the numbers come from (README, "Credits and licences"). Small and muted, so it doesn't
     compete with the sheet; only its links take the accent. */
  function renderColophon() {
    const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${esc(text)}</a>`;
    el.colophon.setAttribute('aria-label', t('footLabel'));
    el.colophon.innerHTML = `
      <p>${t('footFan', { tc: ext('https://www.teamcherry.com.au/', 'Team Cherry') })}</p>
      <p>${t('footData', {
        wiki: ext('https://hollowknight.wiki/', 'hollowknight.wiki'),
        wikiEs: ext('https://hollowknight.fandom.com/es/', t('footWikiEs')),
        lic: ext('https://creativecommons.org/licenses/by-sa/3.0/', 'CC BY-SA 3.0'),
      })}</p>`;
  }

  /* The screen bar: Charms, Your game, Combat and the Journal, with your completed ones. It lives
     in index.html and here only its texts and which one is active change: repainted whole, the
     focus would be lost when switching screens. The Journal's text is set by paintHjNav. */
  function renderNav() {
    el.nav.setAttribute('aria-label', t('navLabel'));
    for (const a of el.nav.querySelectorAll('[data-act="view"]')) {
      const v = a.dataset.value;
      if (v !== 'journal') a.textContent = t(VIEW_KEY[v]);
      a.setAttribute('href', hashFor(v));
      if (v === prefs.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    paintHjNav();
  }

  /* Only the chosen screen shows. The others keep being painted, hidden: that way their animations
     don't start from something stale when you come back, and the sheet's HUD doesn't animate what
     happened while you were on another one. Not the Journal: its 168 rows are only painted when
     it shows (render). */
  function showScreen() {
    el.panel.hidden = prefs.view !== 'charms';
    el.gear.hidden = prefs.view !== 'game';
    el.fight.hidden = prefs.view !== 'fight';
    el.hj.hidden = prefs.view !== 'journal';
  }

  function exampleButtons() {
    return EXAMPLES.map((ex) => `<button type="button" class="example" data-act="example" data-value="${ex.id}" title="${esc(t(ex.desc))}">${ex.charms.slice(0, 3).map((id) => `<img src="assets/charms/${id}.png" alt="">`).join('')}${esc(t(ex.name))}</button>`).join('');
  }

  // The first-use guide, on Charms. Step 1 leads to Your game.
  function renderGuide() {
    if (prefs.guideSeen || prefs.view !== 'charms') { el.guide.innerHTML = ''; return; }
    const game = `<button type="button" class="guide-link" data-act="view" data-value="game">${esc(t('navGame'))}</button>`;
    el.guide.innerHTML = `<section class="guide">
      ${brackets}
      <button type="button" class="btn guide-close" data-act="guide-dismiss" title="${esc(t('guideDismissHint'))}">${esc(t('guideDismiss'))}</button>
      <h2>${esc(t('guideTitle'))}</h2>${rule}
      <p class="guide-lede">${esc(t('tagline'))}</p>
      <ol class="steps">
        <li><span class="n">1</span><span>${t('guideStep1', { game })}</span></li>
        <li><span class="n">2</span><span>${t('guideStep2')}</span></li>
        <li><span class="n">3</span><span>${t('guideStep3')}</span></li>
      </ol>
      <div class="examples"><span class="lbl">${esc(t('tryBuild'))}</span>${exampleButtons()}</div>
    </section>`;
  }

  /* ── Sheet panel: figures, meters, spells and arts ───────────────────── */
  // The flash class: only on the repaint that follows a change (flashIds, in commit()).
  const flashCls = (id) => (flashIds && flashIds.has(id) ? ' is-flash' : '');

  /* A figure in the status block. Its preview (paintPreview) takes the note's place, on top of
     it: that way it doesn't change the height or push the grid below. */
  function metric(id, label, opts = {}) {
    const s = sheet.stats[id];
    const value = opts.value !== undefined ? esc(opts.value) : fmtStatRich(s);
    const note = opts.note !== undefined ? opts.note : '';
    return `<button type="button" class="metric${flashCls(id)}" data-act="kpi" data-id="${id}" title="${esc(t('goTo', { label: s ? s.label : label }))}">
      <span class="lbl">${esc(label)}</span>
      <span class="val"><span>${value}</span>${changeChip(id)}</span>
      <span class="note"><span class="note-t">${note}</span><span class="pv" data-pv="${id}"></span></span>
    </button>`;
  }

  // What is giving you the reach you have: the charms that lengthen it, or "base reach".
  function rangeNote() {
    const names = sheet.stats['nail.range'].contribs
      .filter((c) => c.active !== false && c.source.startsWith('charm:'))
      .map((c) => c.label);
    return names.length ? names.join(' + ') : t('rangeBase');
  }

  // Almost everything that kills in the late game hits for 2 masks, so the figure for
  // hits until you die carries its equivalent at 2 alongside.
  function twoMaskNote() {
    const s = sheet.stats;
    if (!s['health.hitsToDie'].applies) return '';
    return t('twoMaskHits', { n: Math.ceil(s['health.total'].value / (2 * s['health.damageMult'].value)) });
  }

  function heroNote() {
    const s = sheet.stats;
    const beam = s['nail.elegy'];
    if (beam.applies && beam.value) return t('hitElegy', { nail: fmtStat(s['nail.damage']), beam: fmtStat(beam) });
    if (sheet.flags.fury) return t('hitFury');
    if (sheet.flags.strength) return t('hitStrength', { charm: pick(D.CHARM_BY_ID[sheet.flags.strength]) });
    return t('hitNoBonus');
  }

  /* The status block: the game's HUD (the same one as the arena, larger) with health and soul
     as figures below it, with no other text; the nail damage in large type with the nail next
     to it, and the six figures in one row. Everything that matters, above the charm grid.
     The masks are the health control: press the third and you're left with three, press the
     last and you're back to full health. Lifeblood is spent first, just as in the game, so
     what you have left fills the white ones first; a spent one leaves its slot dark so you can
     go back up. With health lost, the figure reads "6/9".
     Soul can also be spent by hand, even though no figure changes: it's there to see. It works
     as in the game: it's a single number, the orb fills first and the rest goes to the vessels,
     in order, so there's never a full vessel with the orb half-full, nor the second one full
     with the first empty. Each tap on the orb casts a spell from your build (33, or 24 with
     Spell Twister); if the vessels hold soul, the orb drops and they refill it right away
     (SOUL_REFILL_MS: the wiki says "after a short delay" without giving the figure). When
     there's not enough for another, the next tap fills everything. A full vessel, when
     tapped, empties along with the ones to its right; an empty one fills, and with it
     everything before it: the orb and the earlier vessels. It isn't saved: on reload, soul is
     full. How the masks and the orb are used is told by their title, not by a note. */
  let panelHudPrev = null;          // the last thing the sheet's HUD painted, to animate the change
  let soulSpent = 0;                // soul spent by hand, below what fits
  let soulDrain = null;             // while the vessels refill the orb: the level it has dropped to
  let soulTimer = 0;
  const SOUL_REFILL_MS = 500;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  // If the vessels were refilling the orb, it finishes now: the next tap starts from there.
  function settleSoul() {
    if (!soulTimer) return;
    clearTimeout(soulTimer);
    soulTimer = 0;
    soulDrain = null;
  }
  const soulLevels = () => {
    const s = sheet.stats, total = s['soul.total'].value;
    soulSpent = Math.max(0, Math.min(soulSpent, total));
    return { total, mainMax: s['soul.main'].value, cost: s['soul.spellCost'].value, now: total - soulSpent };
  };
  function renderStatus() {
    const s = sheet.stats;
    const masks = s['health.masks'].value, lb = s['health.lifeblood'].value;
    const maxHp = masks + lb, hp = sheet.currentHealth;
    const white = Math.min(hp, masks), lbOn = Math.max(0, hp - masks);
    const main = s['soul.main'].value;
    const vessels = Math.round(s['soul.reserve'].value / D.SOUL.vesselSize);
    // What's been spent never exceeds what fits: if you change build, it gets trimmed.
    const { total, now: soulNow, cost } = soulLevels();
    const mainNow = soulDrain != null ? soulDrain : Math.min(soulNow, main);
    const orbFull = soulNow >= main;
    const orbTitle = soulNow >= cost ? t('soulCastTitle', { n: cost }) : t('soulRefillTitle');
    const hud = hudHtml({
      masks: white, maxMasks: masks, lb: lbOn, lbSlots: lb, soul: soulNow, main: mainNow, mainMax: main, vessels,
      hive: sheetHas(sheet, 'hiveblood'), lbJoni: sheet.joniLifeblood || 0,
      over: !!sheet.notches.overcharmed,
      orbAttrs: ` data-act="soulOrb" title="${esc(orbTitle)}" aria-label="${esc(orbTitle)}"`,
      vesselAttrs: (i, full) => {
        const title = full ? t('vesselEmptyTitle') : orbFull ? t('vesselFillTitle') : t('vesselFillAllTitle');
        return ` data-act="soulVessel" data-value="${i}" aria-pressed="${full}" title="${esc(title)}" aria-label="${esc(title)}"`;
      },
      slot: (g, cls, inner, on) => {
        const to = g + 1 === maxHp ? 0 : g + 1;
        return `<button type="button" class="${cls} pip-mask" data-act="hp" data-value="${to}" aria-pressed="${on}"
          title="${esc(to ? t('hpSetTitle', { n: to }) : t('hpFullTitle'))}">${inner}</button>`;
      },
    }, panelHudPrev);
    panelHudPrev = { masks: white, lb: lbOn, soul: soulNow, main: mainNow };

    // Health and soul, as figures only; with health lost or soul spent, over the maximum.
    const of = (n, max) => (n < max ? `${NF[0].format(n)}<i class="of">/${NF[0].format(max)}</i>` : NF[0].format(max));
    const readout = (cls, id, label, html) => `<div class="rd ${cls}${flashCls(id)}">
        <span class="lbl">${esc(label)}</span>
        <span class="v"><span>${html}</span>${changeChip(id)}<span class="pv" data-pv="${id}"></span></span>
      </div>`;
    const heal = s['heal.timePerMask'];
    const burst = s['nail.bestBurst'];
    return `<div class="inv-status">
      <div class="inv-hud">
        ${hud}
        <div class="inv-read">
          ${readout('rd-hp', 'health.total', t('health'), of(hp, maxHp))}
          ${readout('rd-soul', 'soul.total', t('soul'), of(soulNow, total))}
        </div>
      </div>
      <div class="inv-lead">
        <div class="inv-nail"><img class="hero-nail" src="${D.art('nails', state.nail)}" alt="" width="80" height="360"></div>
        <div class="hero${flashCls('nail.damage')}">
          <div class="lbl">${esc(t('heroLabel'))}</div>
          <div class="hero-row">
            <span class="hero-num">${fmtStatRich(s['nail.damage'])}</span>
            ${changeChip('nail.damage')}<span class="pv" data-pv="nail.damage"></span>
          </div>
          <div class="hero-note">${esc(heroNote())}</div>
        </div>
      </div>
      <div class="inv-stats">
        ${metric('nail.dps', t('dps'), { note: esc(t('apsNote', { aps: fmtStat(s['nail.aps']) })) })}
        ${metric('nail.range', t('range'), { note: esc(rangeNote()) })}
        ${metric('nail.bestBurst', t('bestHit'), { note: esc(burst.applies ? burst.note : t('noBurstYet')) })}
        ${metric('health.hitsToDie', t('hitsToDie'), { note: esc(twoMaskNote()) })}
        ${metric('soul.perHit', t('soulPerHit'), { note: esc(t('hitsToHeal', { n: fmtStat(s['soul.hitsPerFocus']) })) })}
        ${metric('heal.timePerMask', t('healing'), { note: esc(heal.applies ? t('healNote', { masks: masksText(s['heal.masksPerFocus'].value) }) : t('noFocus')) })}
      </div>
    </div>`;
  }

  /* ── Equipped and notches: the pair of blocks from the game's screen ──
     In Hollow Knight, under "Equipped" go the charms you wear, and below them the row
     of "Notches": a lit white dot per notch used, a dark ring per free notch. When you
     overcharm, the notches of the charm that took you over the line come out in magenta
     and the row grows beyond your maximum. */
  /* What the equipped charms, the notches and the charm grid paint, and how they respond. The
     selection is always the page's; a pantheon's bench changes the lock and the help text.
     "locked" carries the reason when they can't be touched: the slots still receive the
     click, so the notice shows when you try. The equipped charms remove directly, like the
     grid (act: 'quick').
     "info" is the cheap part —whether you wear it and what would happen if you touched it—:
     the full impact is only requested by the detail, one charm at a time. The sheet adds its
     own to the context (charmBand): the detail's charm, "Clear" and the overcharm notice. */
  const pageCharms = () => {
    const locked = charmLock();
    return {
      st: state, notches: sheet.notches, act: 'quick', locked,
      info: (id) => ({ equipped: state.charms.includes(id), action: C.charmAction(state, id) }),
      hint: locked ? t('runLockShort') : hoverable.matches ? t('quickHintHover') : t('quickHintTouch'),
    };
  };

  function overcharmSplit(ctx = pageCharms()) {
    const n = ctx.notches;
    if (!n.overcharmed) return { white: n.used, over: 0 };
    // You can only overcharm with a charm starting from a legal build: the last one
    // you equipped. If the overcharm comes from lowering your maximum (something the game
    // doesn't allow), only the leftover notches are marked.
    const last = ctx.st.charms[ctx.st.charms.length - 1];
    const cost = last ? D.CHARM_BY_ID[last].notches : 0;
    const over = cost > 0 && n.used - cost <= n.max ? cost : n.used - n.max;
    return { white: n.used - over, over };
  }

  /* The row of notches and its label. Separate, because the grid's preview repaints them
     without redoing the sheet (paintNotchPreview). */
  function notchDots(ctx) {
    const n = ctx.notches;
    const { white, over } = overcharmSplit(ctx);
    const slots = Math.max(n.max, n.used);
    let dots = '';
    for (let i = 0; i < slots; i++) {
      const cls = i < white ? 'is-used' : i < white + over ? 'is-over' : 'is-free';
      dots += `<i class="notch ${cls}"></i>`;
    }
    return dots;
  }
  const notchFreeText = (n) => (n.overcharmed ? t('overcharmed') : n.free === 1 ? t('notchesFreeOne') : t('notchesFree', { n: n.free }));

  /* The two blocks separately: a pantheon's bench joins them (renderLoadout) and the sheet
     spreads them over its two columns (charmBand). */
  function loadoutBlocks(ctx = pageCharms()) {
    const n = ctx.notches;
    const dots = notchDots(ctx);
    const worn = ctx.st.charms.map((id) => D.CHARM_BY_ID[id]).filter(Boolean);
    const tiles = worn.map((c) => `<button type="button" class="eq" data-act="${ctx.act}" data-id="${c.id}" ${ctx.locked ? 'aria-disabled="true"' : ''} title="${esc(ctx.locked || (isFixed(c.id) ? pick(c) + ' · ' + t('inspFixed') : t('unequipTitle', { charm: pick(c) })))}">
      <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}">
    </button>`).join('');
    // The game leaves a dark dot marking the next slot while something still fits.
    const slot = !n.overcharmed && n.free > 0 ? '<span class="eq-slot" aria-hidden="true"></span>' : '';
    // "Clear", on the sheet: text in the screen's ink, unboxed, like the tablet's "Close".
    const clear = ctx.clear ? `<button type="button" class="eq-clear" data-act="clear" title="${esc(ctx.locked || t('clearCharmsHint'))}" ${worn.some((c) => !isFixed(c.id)) && !ctx.locked ? '' : 'disabled'}>${cross}${esc(t('clearCharms'))}</button>` : '';
    // And the overcharm notice, below the notches: at the top it wouldn't be seen while you touch the grid.
    const overNote = ctx.over && n.overcharmed ? `<div class="banner is-band" role="status"><span class="banner-tag">${esc(t('overcharmed'))}</span><span class="banner-text">${esc(t('overcharmBanner'))}</span></div>` : '';
    return {
      equipped: `<div class="loadout-block is-eq">
        <div class="block-head">${esc(t('equipped'))}${clear}</div>
        <div class="eq-row">${tiles}${slot}${worn.length ? '' : `<span class="sr-only">${esc(t('noCharmsYet'))}</span>`}</div>
      </div>`,
      notches: `<div class="loadout-block is-notches">
        <div class="block-head">${esc(t('notches'))}<span class="notch-free ${n.overcharmed ? 'is-over' : ''}">${esc(notchFreeText(n))}</span></div>
        <div class="notches">${dots}</div>
        ${overNote}
      </div>`,
    };
  }
  function renderLoadout(ctx = pageCharms()) {
    const b = loadoutBlocks(ctx);
    return `<div class="loadout">${b.equipped}${b.notches}</div>`;
  }

  /* ── Quick access to the charms ────────────────────────────────────────
     The grid from the game's charm screen: four rows of ten slots, numbered 1 to 40, with
     the even rows offset by half a slot. The proportions come from measuring an official
     screenshot (186 px pitch between slots, 103 px offset, 180 px between rows), hence the
     factors in css/app.css.
     Five slots change version in the game —the three fragile ones for their unbreakable
     versions, Kingsoul for Void Heart and Grimmchild for Carefree Melody—; if you have one
     (Charms found), the slot shows only that one, as the game does; if not, it splits into
     two shadowed halves (quickSlot). Only the artwork, no data: a click equips or removes, and what
     each charm does is read in the detail, alongside (charmDetail). */
  const QUICK_PER_ROW = 10;
  const QUICK_SLOTS = D.CHARMS.reduce((slots, c) => {
    const last = slots[slots.length - 1];
    if (last && last[0].num === c.num) last.push(c); else slots.push([c]);
    return slots;
  }, []);

  function quickTile(c, half, ctx) {
    const imp = ctx.info(c.id);
    const a = imp.action;
    const cls = ['qc'];
    if (half) cls.push('qc-half');
    if (imp.equipped) cls.push('is-on');
    if (a.action === 'blocked') cls.push('is-locked');
    if (!imp.equipped && a.overcharm && isOwned(c.id)) cls.push('is-over');
    if (ctx.sel === c.id) cls.push('is-sel');
    // One you don't have in your game is shadowed: it can be looked at, but not equipped.
    const missing = !imp.equipped && !isOwned(c.id);
    if (!isOwned(c.id)) cls.push('is-missing');
    const title = missing ? pick(c) + ' · ' + t('inspMissing')
      : a.action === 'blocked' ? pick(a.reason)
      : isFixed(c.id) ? pick(c) + ' · ' + t('inspFixed')
      : imp.equipped ? t('unequipTitle', { charm: pick(c) })
      : a.action === 'swap' ? t('swapTitle', { old: pick(D.CHARM_BY_ID[a.partner]), new: pick(c) })
      : t('equipTitle', { charm: pick(c) });
    return `<button type="button" class="${cls.join(' ')}" data-act="${ctx.act}" data-id="${c.id}" aria-pressed="${imp.equipped}" title="${esc(ctx.locked || title)}" ${ctx.locked || missing || a.action === 'blocked' ? 'aria-disabled="true"' : ''}>
      <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}" loading="lazy">
    </button>`;
  }

  /* The five two-version slots: if you have one, only that one shows, whole, as in the game;
     if you have neither, the two shadowed halves. */
  function quickSlot(slot, ctx) {
    if (slot.length === 1) return quickTile(slot[0], false, ctx);
    const tk = C.ownState(owned, slot[0].group);
    if (tk) return quickTile(D.CHARM_BY_ID[tk], false, ctx);
    return `<span class="qslot-pair">${slot.map((c) => quickTile(c, true, ctx)).join('')}</span>`;
  }

  function renderQuickCharms(ctx = pageCharms()) {
    let rows = '';
    for (let i = 0; i < QUICK_SLOTS.length; i += QUICK_PER_ROW) {
      rows += `<div class="qrow">${QUICK_SLOTS.slice(i, i + QUICK_PER_ROW).map((s) => quickSlot(s, ctx)).join('')}</div>`;
    }
    return `<div class="quick ${ctx.locked ? 'is-locked' : ''}">
      <div class="block-head">${esc(t('charmsTitle'))}<span class="quick-hint">${esc(ctx.hint)}</span></div>
      <div class="quick-grid">${rows}</div>
    </div>`;
  }

  /* ── The charm's detail, next to the grid ──────────────────────────────
     The game's charm screen describes the chosen charm next to the grid. Here: the name with
     its cost in notch points (in magenta if it would overcharm you), its line, a status line
     and what changes in your build, before → after. It shows the charm under the mouse and,
     if there's none, the last one touched, pressed or focused. It's read-only: equipping and
     removing happen in the grid and in Equipped (a button here repeated the same thing). With
     a finger, a tap equips, as always, and the detail tells what changed.
     It always has the same size (css: .charm-detail), so the band doesn't grow or shrink when
     going from one charm to another: the line takes two lines at most (whole in its title),
     the status one, each change one (the synergies at the end, trimmed) and the list is
     DETAIL_ROWS; if there are more —only Joni's Blessing and Shaman Stone—, the last one says
     how many remain and opens the full sheet at them. */
  const DETAIL_ROWS = 6;
  const detailId = () => detailHover || detailSel;

  function charmDetail() {
    const id = detailId();
    const c = D.CHARM_BY_ID[id];
    if (!c) return `<p class="detail-hint">${esc(hoverable.matches ? t('detailHintHover') : t('detailHintTouch'))}</p>`;
    const imp = impact(id), a = imp.action;
    // A single status line, the weightiest one. "Equipped" is already said by the list's title.
    const states = [];
    if (!imp.equipped && !isOwned(id)) states.push(['bad', t('inspMissing')]);
    else if (isFixed(id)) states.push(['', t('inspFixed')]);
    else if (a.action === 'blocked' && !imp.equipped) states.push(['bad', t('inspBlocked', { reason: pick(a.reason) })]);
    else if (a.action === 'swap') states.push(['', t('inspSwap', { charm: pick(D.CHARM_BY_ID[a.partner]) }) + (a.overcharm ? t('inspSwapOver') : '')]);
    else if (a.overcharm && !imp.equipped) states.push(['over', t('inspOver')]);
    if (imp.unmet) states.push(['bad', t('inspNeeds', { what: t(NEED_KEY[c.needs]) })]);
    if (imp.cond) states.push(['cond', t('inspCond', { cond: imp.cond })]);
    const state = states.length ? `<p class="insp-state ${states[0][0]}" title="${esc(states.map((x) => x[1]).join(' · '))}">${esc(states.map((x) => x[1]).join(' · '))}</p>` : '';
    const row = (ch) => {
      const after = imp.withSheet.stats[ch.id];
      const others = after.contribs.filter((k) => k.active && ((k.source.startsWith('charm:') && k.source !== 'charm:' + id) || k.source.startsWith('synergy:'))).map((k) => k.label);
      const from = ch.kind === 'gain' ? '' : ch.before.applies ? fmtStat(ch.before) : '—';
      const to = ch.kind === 'loss' ? '—' : fmtStat(ch.after);
      const notes = [];
      if (ch.transfer === 'out') notes.push(t('becomesShort', { what: shortOf(ch.into) }));
      if (others.length) notes.push(t('withCharms', { charms: [...new Set(others)].join(', ') }));
      const with_ = notes.length ? ' · ' + notes.join(' · ') : '';
      return `<li title="${esc(ch.label + with_)}"><span class="lbl">${esc(ch.label)}${with_ ? `<i class="with">${esc(with_)}</i>` : ''}</span><span class="vals">${from ? `<span class="from">${esc(from)}</span><span class="arrow">→</span>` : ''}<span class="to ${goodClass(ch.good)}">${esc(to)}</span></span></li>`;
    };
    const many = imp.changes.length > DETAIL_ROWS;
    const shown = many ? imp.changes.slice(0, DETAIL_ROWS - 1) : imp.changes;
    const more = many ? `<li class="insp-more"><button type="button" data-act="detailMore" data-id="${id}">${esc(t('detailMore', { n: imp.changes.length - shown.length }))}</button></li>` : '';
    const lock = charmLock();
    const over = imp.equipped ? sheet.notches.overcharmed : a.overcharm;
    const cost = c.notches
      ? `<span class="detail-cost" role="img" aria-label="${esc(notchText(c.notches))}" title="${esc(notchText(c.notches))}">${`<i class="notch ${over ? 'is-over' : 'is-used'}"></i>`.repeat(c.notches)}</span>`
      : `<span>${esc(t('notchFree'))}</span>`;
    return `<div class="insp-head">
        <span class="medal"><img src="assets/charms/${c.id}.png" alt=""></span>
        <div class="insp-id">
          <div class="insp-name">${esc(pick(c))}</div>
          <div class="insp-notch"><span class="insp-en">${esc(I.current === 'en' ? c.es : c.en)}</span>${cost}${c.fragile ? `<span>${esc(t('breaksOnDeath'))}</span>` : ''}</div>
        </div>
      </div>
      <p class="insp-blurb" title="${esc(pick(c.blurb))}">${esc(pick(c.blurb))}</p>
      ${lock ? `<p class="insp-state cond" title="${esc(lock)}">${esc(lock)}</p>` : state}
      <h3>${esc(imp.equipped ? t('inspEffectIn') : t('inspEffectIf'))}${imp.cond ? ' (' + esc(imp.cond.toLowerCase()) + ')' : ''}</h3>
      ${imp.changes.length ? `<ul class="insp-list">${shown.map(row).join('')}${more}</ul>` : `<p class="insp-empty">${esc(t('inspEmpty'))}</p>`}`;
  }

  /* Repinta solo el detalle y la vista previa, no la ficha: repintarla rehace la rejilla bajo el
     puntero. Con el ratón encima, las filas de la ficha completa que cambiaría se iluminan. */
  function paintDetail(live = true) {
    const box = el.panel.querySelector('#charm-detail');
    if (!box) return;
    // Al lector de pantalla solo se le dice lo que se toca o se enfoca: pasar el ratón por la
    // rejilla lo repinta a cada casilla y lo leería entero cada vez.
    box.setAttribute('aria-live', live ? 'polite' : 'off');
    box.innerHTML = charmDetail();
    const id = detailId();
    for (const n of el.panel.querySelectorAll('.quick-grid .qc')) n.classList.toggle('is-sel', n.dataset.id === id);
    if (detailHover) highlightRows(detailHover); else clearHits();
    paintPreview();
  }

  /* La vista previa, en las propias cifras del bloque de estado: con el ratón sobre un amuleto,
     cada cifra que cambiaría con un clic lleva al lado «→ lo que quedaría» (si ya lo llevas, lo que
     quedaría al quitarlo). Sin verde: una hipótesis no es una ventaja; lo que empeora, en rojo. Se
     apaga al hacer clic (entonces la cifra destella con su chip) hasta que el puntero pasa a otro
     amuleto. Si el amuleto no se puede tocar o su efecto depende de la vida (la Furia, la
     Elegía), un clic no cambiaría esas cifras ahora mismo: no hay vista previa. */
  let previewId = '';
  function paintPreview() {
    let next = null;
    if (previewId && !charmLock() && C.charmAction(state, previewId).action !== 'blocked') {
      const imp = impact(previewId);
      if (!imp.cond) {
        next = new Map(imp.changes.map((ch) => {
          const v = imp.equipped ? ch.before : ch.after;
          const worse = imp.equipped ? ch.good === true : ch.good === false;
          return [ch.id, { text: '→ ' + (v && v.applies ? fmtStat(v) : '—'), worse }];
        }));
      }
    }
    for (const slot of el.panel.querySelectorAll('.pv[data-pv]')) {
      const p = next && next.get(slot.dataset.pv);
      slot.textContent = p ? p.text : '';
      slot.classList.toggle('bad', !!(p && p.worse));
    }
    paintNotchPreview();
  }

  /* Y en las muescas: con el ratón sobre un amuleto, la fila enseña las que ocuparía antes de
     equiparlo. Dos estados más que los del juego, en la misma casilla de 23 px, para que ningún
     punto se mueva:
     - La que ocuparía (is-pending) es un aro encendido con el centro a medio tono: a medio camino
       entre el anillo oscuro de la libre y el punto lleno de la gastada, y respira despacio, porque
       es una hipótesis y no algo que ya tengas. Si te sobrecargaría va en magenta y la fila crece
       por encima de tu máximo, como en el juego.
     - La que dejaría (is-leaving) es el punto que ya tienes, apagándose: sin halo y casi a oscuras.
       Es lo que se ve sobre un amuleto que llevas, y lo que suelta un compañero al cambiarlo.
     Un cambio de pareja (Corazón frágil ↔ irrompible, Niño de Grimm ↔ Melodía, Alma del Monarca ↔
     Corazón del Vacío) no pide muescas nuevas: las del compañero pasan al nuevo. Van en su sitio
     como pendientes; si el nuevo cuesta menos, las que sobran se apagan detrás, y si cuesta más,
     las que faltan siguen pendientes. Así la fila solo crece si de verdad te sobrecargarías.
     Todo sale del estado que quedaría (C.toggleCharm): lo que se queda lleva ya su color de
     después —si quitar un amuleto te saca de la sobrecarga, el magenta vuelve a blanco— y lo que
     se va, el de ahora. Sin vista previa si el amuleto está bloqueado (el detalle dice por qué) o
     no mueve ninguna muesca (el Corazón del Vacío sin el Alma del Monarca). */
  function notchPreview(id) {
    if (!id || charmLock()) return null;
    if (!state.charms.includes(id) && !isOwned(id)) return null;   // no se puede equipar
    const a = C.charmAction(state, id);
    const next = C.toggleCharm(state, id);
    if (!next) return null;
    const cost = D.CHARM_BY_ID[id].notches;
    const take = a.action === 'unequip' ? 0 : cost;
    const give = a.action === 'unequip' ? cost : a.partner ? D.CHARM_BY_ID[a.partner].notches : 0;
    if (!take && !give) return null;
    const now = sheet.notches;
    const used = C.notchesUsed(next.charms);
    const after = { used, max: now.max, free: Math.max(0, now.max - used), overcharmed: used > now.max };
    const was = overcharmSplit({ st: state, notches: now });
    const will = overcharmSplit({ st: next, notches: after });
    const kept = used - take;                // las de ahora menos las que suelta: kept + give = now.used
    const slots = Math.max(now.max, now.used, used);
    let dots = '';
    for (let i = 0; i < slots; i++) {
      const cls = i < kept ? (i < will.white ? 'is-used' : 'is-over')
        : i < kept + take ? (i < will.white ? 'is-used' : 'is-over') + ' is-pending'
        : i < now.used ? (i < was.white ? 'is-used' : 'is-over') + ' is-leaving'
        : 'is-free';
      dots += `<i class="notch ${cls}"></i>`;
    }
    // The label, "2 free → 0": after the arrow the figure is enough, unless there were none before (overcharmed).
    const same = now.overcharmed ? after.overcharmed : !after.overcharmed && after.free === now.free;
    const to = after.overcharmed ? t('overcharmedTo') : now.overcharmed ? notchFreeText(after) : String(after.free);
    const label = esc(notchFreeText(now)) + (same ? '' : `<span class="nf-to${after.overcharmed ? ' is-over' : ''}"> → ${esc(to)}</span>`);
    return { dots, label };
  }

  /* Repaints only the row and its label, never the sheet: the grid stays under the pointer. On
     entering, the row's height is noted (--row-h): in one column, where it sits above the grid,
     the preview doesn't exceed that height (css: .notches.is-preview), because if it pushed
     the grid, the mouse would land on another slot. */
  function paintNotchPreview() {
    const box = el.panel.querySelector('.inv-band .is-notches');
    const row = box && box.querySelector('.notches');
    if (!row || !row.offsetParent) return;   // with Charms hidden there's nothing to measure: it's repainted on return
    const p = notchPreview(previewId);
    const on = row.classList.contains('is-preview');
    if (!p && !on) return;
    const lbl = box.querySelector('.notch-free');
    if (p) {
      if (!on) row.style.setProperty('--row-h', row.offsetHeight + 'px');
      row.innerHTML = p.dots;
      lbl.innerHTML = p.label;
    } else {
      const ctx = pageCharms();
      row.innerHTML = notchDots(ctx);
      lbl.textContent = notchFreeText(ctx.notches);
      row.style.removeProperty('--row-h');
    }
    row.classList.toggle('is-preview', !!p);
  }

  /* The sheet's band, in two columns that don't touch: Equipped and the grid on the left,
     Notches and the detail on the right. If the notches grow (when overcharming, more dots and
     the notice come out), their column grows, but the grid stays attached to Equipped. */
  function charmBand() {
    const ctx = { ...pageCharms(), sel: detailId(), clear: true, over: true };
    const b = loadoutBlocks(ctx);
    return `<div class="inv-band">
      <div class="band-col">${b.equipped}${renderQuickCharms(ctx)}</div>
      <div class="band-col">${b.notches}<div class="charm-detail" id="charm-detail" aria-live="polite">${charmDetail()}</div></div>
    </div>`;
  }

  function highlightRows(id) {
    clearHits();
    const imp = impact(id);
    for (const ch of imp.changes) {
      const row = el.panel.querySelector(`.stat[data-id="${ch.id}"]`);
      if (row) row.classList.add('is-hit');
    }
  }
  function clearHits() {
    for (const node of el.panel.querySelectorAll('.stat.is-hit')) node.classList.remove('is-hit');
  }

  /* Spells and arts, as plates: the game's artwork on black, frameless, with its light behind
     it. What you haven't learnt comes out as a silhouette and unlit, like a dimmed statue in the
     Hall, instead of a box with a dash. */
  function renderSpellPlates() {
    return SPELL_KEYS.map((k) => {
      const sp = D.SPELLS[k];
      const lvl = state.spells[k];
      const stat = sheet.stats['spell.' + k];
      const icon = spellArt(k, lvl, (id) => state.charms.includes(id));
      const name = lvl ? pick(sp.levels[lvl]) : pick(sp.slot);
      const note = lvl ? t('soulCost', { n: fmtStat(sheet.stats['soul.spellCost']) }) : t('notLearned');
      return `<button type="button" class="plate${lvl ? ' is-on' : ''}${flashCls('spell.' + k)}" data-act="kpi" data-id="spell.${k}" title="${esc(t('goTo', { label: name }))}">
        <span class="plate-art"><img src="${icon}" alt=""></span>
        <span class="plate-name">${esc(name)}</span>
        ${lvl ? `<span class="plate-val">${fmtStatRich(stat)}</span>` : ''}
        <span class="plate-note">${esc(note)}</span>
      </button>`;
    }).join('');
  }

  function renderArtPlates() {
    return ART_KEYS.map((k) => {
      const on = !!state.arts[k];
      const stat = sheet.stats[ART_STAT[k]];
      const name = pick(D.ARTS[k]);
      // With the art learnt, the note is the formula ("2.5 × base nail"), not the name again.
      const formula = (stat.contribs.find((c) => c.op === 'set' && c.text) || {}).text || '';
      const note = !on ? t('notLearned') : stat.applies ? formula : (stat.reason || '');
      return `<button type="button" class="plate${on ? ' is-on' : ''}${flashCls(ART_STAT[k])}" data-act="kpi" data-id="${ART_STAT[k]}" title="${esc(t('goTo', { label: name }))}">
        <span class="plate-art"><img src="${D.art('arts', k)}" alt=""></span>
        <span class="plate-name">${esc(name)}</span>
        ${on ? `<span class="plate-val">${fmtStatRich(stat)}</span>` : ''}
        <span class="plate-note">${esc(note)}</span>
      </button>`;
    }).join('');
  }

  /* ── Effects: what charms do that doesn't show in the figures ──────────
     Below the spell and art plates, one plate per effect in D.CHARM_EFFECTS, like the spell
     ones: the effect's artwork with its light (or the charm's), the figure and when it
     triggers. The charm's medal sits in the corner; if the figure comes from a synergy, both. */
  const pctOver = (m) => '+' + NF[0].format((m - 1) * 100) + pctSpace();

  function effectValue(s, show) {
    if (show === 'plus') return '+' + fmtStatRich(s);
    if (show === 'pctOver') return esc(pctOver(s.value));
    return fmtStatRich(s);
  }

  function effectsList() {
    const has = (id) => state.charms.includes(id);
    // The synergy that moves a figure, if there is one: its two charms show in the corner.
    const synergy = (s, charm) => s && s.contribs.find((c) => c.active && c.source.startsWith('synergy:') && c.charms && c.charms.includes(charm));
    const list = [];
    for (const fx of D.CHARM_EFFECTS) {
      const charm = [].concat(fx.charm).find(has);
      if (!charm) continue;
      const s = fx.stat ? (fx.hp ? compute({ ...state, hp: fx.hp }) : sheet).stats[fx.stat] : null;
      const ex = fx.extra && sheet.stats[fx.extra.stat];
      const extra = ex && ex.applies && ex.value ? { ...fx.extra, v: effectValue(ex, fx.extra.show) } : null;
      const syn = synergy(s, charm) || (extra && synergy(ex, charm));
      const withArt = Object.keys(fx.artWith || {}).find(has);
      const art = withArt ? fx.artWith[withArt] : fx.art;
      list.push({
        fx, when: fx.when, charms: syn ? [charm, ...syn.charms.filter((x) => x !== charm)] : [charm],
        art: art ? D.art(art[0], art[1]) : null, stat: s ? fx.stat : null,
        na: !!s && !s.applies, reason: s && !s.applies ? s.reason || '' : '',
        v: s && s.applies ? effectValue(s, fx.show) : '', extra,
      });
    }
    // If you fall: the fragile ones, all on one plate.
    const fragile = state.charms.filter((id) => D.CHARM_BY_ID[id] && D.CHARM_BY_ID[id].fragile);
    if (fragile.length) {
      const names = new Intl.ListFormat(prefs.lang, { type: 'conjunction' }).format(fragile.map((id) => pick(D.CHARM_BY_ID[id])));
      const one = fragile.length === 1;
      list.push({
        fx: { bad: true, title: t(one ? 'fragileTitleOne' : 'fragileTitle'), line: t(one ? 'fragileLineOne' : 'fragileLine', { charms: names }), note: names },
        when: 'fall', charms: fragile, art: D.art('knight', 'shade'), stat: null, na: false, reason: '', v: '', extra: null,
      });
    }
    const order = D.EFFECT_WHEN.map((w) => w.id);
    return list.sort((a, b) => order.indexOf(a.when) - order.indexOf(b.when));
  }

  function renderEffects() {
    if (!state.charms.length) return '';
    const list = effectsList();
    const withV = (text, v) => esc(pick(text)).replace('{v}', v);
    const plates = list.map((e) => {
      const { fx } = e;
      const src = `<span class="plate-src">${e.charms.map((id) => `<img src="assets/charms/${id}.png" alt="">`).join('')}</span>`;
      // The full sentence, for the title: already escaped, with no tags and the figure as text.
      const line = (e.na ? esc(`${pick(fx.title)}: ${e.reason}`) : withV(fx.line, e.v) + (e.extra ? withV(e.extra.line, e.extra.v) : '')).replace(/<[^>]+>/g, '');
      const note = e.na ? esc(e.reason) : e.extra ? withV(e.extra.note, `<b>${e.extra.v}</b>`) : esc(pick(fx.note));
      const when = D.EFFECT_WHEN.find((w) => w.id === e.when);
      const body = `<span class="plate-art"><img src="${e.art || `assets/charms/${e.charms[0]}.png`}" alt="">${e.art || e.charms.length > 1 ? src : ''}</span>
        <span class="plate-name">${esc(pick(fx.title))}</span>
        ${e.v ? `<span class="plate-val">${e.v}</span>` : ''}
        <span class="plate-note${e.na ? ' is-na' : ''}">${note}</span>
        <span class="plate-when">${esc(pick(when))}</span>`;
      const cls = `plate is-on${fx.bad ? ' is-bad' : ''}`;
      // With a figure, like the spell plates: it leads to its row in the full sheet and flashes on change.
      return e.stat && !fx.hp
        ? `<button type="button" class="${cls}${flashCls(e.stat)}" data-act="kpi" data-id="${e.stat}" title="${line}">${body}</button>`
        : `<div class="${cls}" title="${line}">${body}</div>`;
    }).join('');
    return `<div class="inv-effects">
      <div class="block-head">${esc(t('effectsTitle'))}<span class="quick-hint">${esc(t('effectsHint'))}</span></div>
      ${plates ? `<div class="eff-plates">${plates}</div>` : `<p class="muted-p">${esc(t('effectsNone'))}</p>`}
    </div>`;
  }

  function renderCharmEffects() {
    const equipped = state.charms.map((id) => D.CHARM_BY_ID[id]).filter(Boolean);
    const body = equipped.length
      ? `<div class="fx">${equipped.map((c) => `<div class="fx-item" data-charm="${c.id}">
          <span class="medal sm"><img src="assets/charms/${c.id}.png" alt=""></span>
          <span><span class="fx-name">${esc(pick(c))}</span><span class="fx-note">${esc(pick(c.blurb))}</span></span>
        </div>`).join('')}</div>`
      : `<p class="muted-p">${esc(t('noCharmsYet'))}</p>`;
    return `<div class="block-head">${esc(t('charmEffects'))}</div>${body}`;
  }

  /* The Charms screen is the game's Inventory: black, the corner brackets, the title with its
     diamond, the status block (the HUD, health and soul, nail damage and the six figures) and,
     below, the charms on a black band —Equipped and Notches, and the grid with the detail
     alongside, as on the game's charm screen—; then spells and arts as plates. Nothing sits
     behind a figure. */
  function renderPanel() {
    el.panel.innerHTML = `${brackets}
      ${screenHead(esc(t('navCharms')))}
      ${renderStatus()}
      ${charmBand()}

      <div class="inv-plates">
        <div class="plate-group"><div class="block-head">${esc(t('spells'))}</div><div class="plates">${renderSpellPlates()}</div></div>
        <div class="plate-group"><div class="block-head">${esc(t('arts'))}</div><div class="plates">${renderArtPlates()}</div></div>
      </div>

      ${renderEffects()}
      ${sheetToggle('top')}
      ${prefs.detailOpen ? `<div class="detail" id="sheet-detail">${renderSheetHead()}${renderGroups()}<div class="fx-wrap">${renderCharmEffects()}</div></div>
      ${sheetToggle('bottom')}` : ''}`;
  }

  /* The full sheet's button stays where you pressed it and the sheet opens below; when open, it
     carries an identical one at the end to close it without going back up. data-value tells
     them apart for focus. */
  const sheetToggle = (where) => `<button type="button" class="toggle-all" data-act="detail" data-value="${where}" aria-expanded="${prefs.detailOpen}" aria-controls="sheet-detail">
      <span>${esc(prefs.detailOpen ? t('hideAll') : t('seeAll'))}</span>${chevron(prefs.detailOpen)}
    </button>`;

  /* The mini-bar, in the screen bar: what you look at while touching charms, with the game's
     sprites instead of labels —the nail, the mask (the blue one if it's all lifeblood), soul and
     a notch— and the DPS, and the same flash as the sheet: on mobile, when you scroll down to the
     grid, the status block stays up top and this is what stays in view. The notch doesn't go in .notches: that row belongs
     to the panel. In combat it shows the figures of the build you're fighting with: in a pantheon
     room, the one frozen on entry and with its bindings (baseSheet), which may not be the sheet's. */
  // The mini-bar's mask: the HUD's, Hiveblood included (and Joni's Blessing, if it's all lifeblood).
  const maskArt = (sh, allLb) => (sheetHas(sh, 'hiveblood') ? (allLb ? 'hiveblood-joni' : 'hiveblood') : allLb ? 'mask-lb' : 'mask');
  function renderMiniHud() {
    const inFight = prefs.view === 'fight';
    // With an enemy in front of you (the arena, a Hall statue or a pantheon room), the mini-bar
    // is the fight's scoreboard: your attacks and theirs are a long list, and this keeps their health and
    // yours in view while you scroll down it.
    const score = inFight && foe() && fight.parts.length ? fightScoreHtml() : '';
    el.mini.classList.toggle('is-fight', !!score);
    if (score) { el.mini.innerHTML = score; return; }
    scorePrev = null;
    const sh = inFight ? baseSheet() : sheet;
    const s = sh.stats, n = sh.notches;
    const masks = s['health.masks'].value, lb = s['health.lifeblood'].value;
    el.mini.innerHTML = `
      <span class="${flashCls('nail.damage').trim()}"><img class="mini-nail" src="${D.art('nails', (inFight ? fst() : state).nail)}" alt="" width="80" height="360"><b>${esc(fmtStat(s['nail.damage']))}</b></span>
      <span class="${flashCls('nail.dps').trim()}"><i class="mini-lbl">${esc(t('dpsShort'))}</i><b>${esc(fmtStat(s['nail.dps']))}</b></span>
      <span class="${flashCls('health.total').trim()}"><img class="mini-mask" src="${D.art('hud', maskArt(sh, lb && !masks))}" alt=""><b>${esc(fmtStat(s['health.total']))}</b>${lb && masks ? `<em>(${lb})</em>` : ''}</span>
      <span class="${flashCls('soul.total').trim()}"><img class="mini-soul" src="${D.art('hud', 'soul')}" alt=""><b>${esc(fmtStat(s['soul.total']))}</b></span>
      <span class="${n.overcharmed ? 'is-over' : ''}"><i class="notch ${n.overcharmed ? 'is-over' : 'is-used'}"></i><b>${n.used}/${n.max}</b></span>`;
  }

  /* The scoreboard: your masks (with lifeblood) and your soul, and the bar of whoever you're hitting,
     the same one as on their card. Each figure flashes on change, like the build's. */
  let scorePrev = null;
  function fightScoreHtml() {
    const sh = fs();
    const lb = (fight.lbJoni || 0) + (fight.lbCharm || 0) + (fight.lbCocoon || 0);
    const [kind, i] = [fight.target[0], Number(fight.target.slice(1))];
    const part = targetOf() || (kind === 'm' ? fight.minions : fight.parts)[i] || fight.parts[0];
    const hp = Math.max(0, part.hp);
    const pct = part.max ? Math.max(0, Math.min(100, hp / part.max * 100)) : 0;
    const now = { masks: fight.masks, lb, soul: fight.soul, hp, who: fight.target };
    const flash = (k) => (scorePrev && scorePrev.who === now.who && scorePrev[k] !== now[k] ? ' is-flash' : '');
    const lbFlash = flash('lb');
    scorePrev = now;
    return `
      <span class="mini-me${flash('masks') || lbFlash}"><img class="mini-mask" src="${D.art('hud', maskArt(sh, lb && !fight.masks))}" alt=""><b>${fight.masks}</b><i class="mini-of">/${sh.stats['health.masks'].value}</i>${lb ? `<em>(${lb})</em>` : ''}</span>
      <span class="mini-me${flash('soul')}"><img class="mini-soul" src="${D.art('hud', 'soul')}" alt=""><b>${fight.soul}</b></span>
      <span class="mini-foe${flash('hp')}">
        <span class="mini-foe-name">${esc(pick(part.name))}</span>
        <span class="fbar ${pct <= 25 ? 'is-low' : ''}"><span style="width:${pct}%"></span></span>
        <b>${NF[0].format(hp)}</b>
      </span>`;
  }

  /* The notices above the screen. Overcharm, on Your game: on Charms it goes in the band, below
     the notches (charmBand), and in combat the HUD's aura already says it. */
  function renderBanner() {
    const over = prefs.view === 'game' && sheet.notches.overcharmed
      ? `<div class="banner"><span class="banner-tag">${esc(t('overcharmed'))}</span><span class="banner-text">${esc(t('overcharmBanner'))}</span></div>`
      : '';
    // On the Pantheons tab you're already there: the notice doesn't send you where you are.
    const lock = prefs.view === 'fight' && prefs.fightTab === 'pantheon' ? '' : runLockBanner();
    el.banner.innerHTML = over + lock;
  }

  /* The notice that you're in a pantheon, with the button that takes you to the room and the one
     that abandons it without having to go there. */
  function runLockBanner() {
    if (!charmLock()) return '';
    const p = PN.PANTHEON_BY_ID[run.pantheon];
    const where = t('runLockWhere', { name: pick(p.name), n: run.room + 1, total: p.rooms.length });
    const why = t(run.bindings.charms ? 'runLockWhyBound' : 'runLockWhy');
    return `<div class="banner is-run" role="status">
      <span class="banner-tag">${esc(t('runLockTag'))}</span>
      <span class="banner-text">${esc(where + ' ' + why)}</span>
      <button type="button" class="btn" data-act="runLockGo">${esc(t('runLockGo'))}</button>
      <button type="button" class="btn" data-act="runQuit">${esc(t('runQuit'))}</button>
    </div>`;
  }

  /* ── Full sheet ──────────────────────────────────────────────────────── */
  function renderSheetHead() {
    const cmpOpts = [
      ['base', t('cmpBase'), t('cmpBaseHint')],
      ['nocharms', t('cmpNoCharms'), t('cmpNoCharmsHint')],
      ['pinned', t('cmpPinned'), baseline ? t('cmpPinnedHint') : t('cmpPinFirst')],
    ];
    return `<div class="sheet-head">
      <div class="sheet-title"><h2>${esc(t('sheetTitle'))}</h2><span class="hint">${esc(t('rowHint'))}</span></div>
      <div class="compare">
        <span class="lbl">${esc(t('compareWith'))}</span>
        <span class="seg">${cmpOpts.map(([v, label, tip]) => `<button type="button" data-act="compare" data-value="${v}" aria-pressed="${prefs.compare === v}" title="${esc(tip)}" ${v === 'pinned' && !baseline ? 'disabled' : ''}>${esc(label)}</button>`).join('')}</span>
        <button type="button" class="btn" data-act="pin" title="${esc(t('pinHint'))}">${esc(t('pin'))}</button>
        ${baseline ? `<button type="button" class="btn" data-act="unpin">${esc(t('unpin'))}</button>` : ''}
      </div>
    </div>`;
  }

  function chipFor(c, stat) {
    const isCharm = c.source.startsWith('charm:');
    const isSyn = c.source.startsWith('synergy:');
    const charmAttr = isCharm ? ` data-charm="${c.source.slice(6)}"` : isSyn && c.charms ? ` data-charm="${c.charms.join(' ')}"` : '';
    let val = c.text;
    if (!val) {
      if (c.op === 'add') val = sign(c.value) + fmtValue(Math.abs(c.value), stat.fmt === 'mult' ? 'dec2' : stat.fmt, false);
      else if (c.op === 'mul') val = '×' + NF[2].format(c.value);
      else if (c.op === 'set' || c.op === 'replace') val = fmtValue(c.value, stat.fmt, false);
      else if (c.op === 'on') val = t('yes').toLowerCase();
      else if (c.op === 'off') val = t('no').toLowerCase();
      else val = '';
    }
    if (!c.active) val = c.cond || val;
    const cls = ['chip', isCharm ? 'chip-charm' : '', isSyn ? 'syn' : '', c.active ? '' : 'off'].filter(Boolean).join(' ');
    return `<span class="${cls}"${charmAttr}>${esc(c.label)}${val ? ' <b>' + esc(val) + '</b>' : ''}${c.active && c.cond ? ' <i>· ' + esc(c.cond) + '</i>' : ''}</span>`;
  }
  const contribText = (c, s) => c.text || (c.op === 'add' ? sign(c.value) + fmtValue(Math.abs(c.value), s.fmt === 'mult' ? 'dec2' : s.fmt, false) : c.op === 'mul' ? '×' + NF[2].format(c.value) : (c.op === 'set' || c.op === 'replace') ? fmtValue(c.value, s.fmt, false) : c.op === 'on' ? t('yes') : c.op === 'off' ? t('no') : '');

  function renderStat(s) {
    const cmp = cmpSheet.stats[s.id];
    const open = prefs.open.includes(s.id);
    const flash = flashIds && flashIds.has(s.id);
    const delta = deltaChip(s, cmp, compareLabel());
    // The row only shows charms and synergies; upgrades go in the detail.
    const shown = s.contribs.filter((c) => c.source.startsWith('charm:') || c.source.startsWith('synergy:'));
    const chips = shown.slice(0, 3).map((c) => chipFor(c, s)).join('') + (shown.length > 3 ? `<span class="chip more">${esc(t('andMore', { n: shown.length - 3 }))}</span>` : '');
    const detail = `<div class="stat-detail">
      ${s.contribs.length ? `<h4>${esc(t('howCalc'))}</h4><ul>` + s.contribs.map((c) => `<li class="${c.active ? '' : 'off'}"><span class="k">${esc(c.label)}${c.cond ? ' · ' + esc(c.cond) : ''}</span><span class="v">${esc(contribText(c, s))}</span></li>`).join('') + '</ul>' : ''}
      ${s.parts ? `<h4>${esc(t('breakdown'))}</h4><ul>` + s.parts.map((p) => `<li><span class="k">${esc(p.label)}</span><span class="v">${(p.approx ? '~' : '') + (p.fmt === 'pct' ? NF[1].format(p.v) + pctSpace() : NF[2].format(p.v))}${p.unit ? ' ' + esc(p.unit) : ''}</span></li>`).join('') + '</ul>' : ''}
      ${cmp && cmp.applies ? `<div class="note">${esc(compareLabel())}: ${esc(fmtStat(cmp))}</div>` : ''}
      ${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}
    </div>`;
    return `<div class="stat ${s.applies ? '' : 'is-na'} ${open ? 'is-open' : ''} ${flash ? 'is-flash' : ''}" data-act="row" data-id="${s.id}" role="button" tabindex="0" aria-expanded="${open}">
      <div class="stat-row">
        <span class="stat-label">${esc(s.label)}</span>
        <span class="stat-value">${delta}<span>${fmtStatRich(s)}</span></span>
        ${s.applies ? '' : `<span class="stat-reason">${esc(s.reason || '')}</span>`}
        ${chips ? `<span class="chips">${chips}</span>` : ''}
      </div>
      ${detail}
    </div>`;
  }

  function renderGroups() {
    return `<div class="groups">${sheet.groups.map((g) => {
      const rows = g.stats.filter((s) => !s.hidden);
      if (!rows.length) return '';
      return `<section class="group"><h3>${esc(g.label)}</h3>${rows.map(renderStat).join('')}</section>`;
    }).join('')}</div>`;
  }

  /* ── Your game ───────────────────────────────────────────────────────── */
  /* A line with the two main changes between two sheets, with the condition in front
     ("If you raise one:"): it's what you would have, not what you have. No green:
     green is what you've gained relative to your reference, not a hypothesis. A
     drawback is flagged, though. */
  function changeLine(from, to, leadKey) {
    const ch = E.diff(from, to).slice(0, 2);
    if (!ch.length) return '<span class="preview"></span>';
    const lead = leadKey ? `<i>${esc(t(leadKey))}:</i> ` : '';
    return '<span class="preview">' + lead
      + ch.map((c) => `<b class="${c.good === false ? 'bad' : ''}">${esc(badgeText(c))}</b>`).join(', ')
      + '</span>';
  }

  /* What would change if you took the next step (the Body steppers). */
  const previewOf = (next, leadKey) => (next ? changeLine(sheet, compute(next), leadKey) : '');

  /* A Body step: the game item that raises it —the mask, the vessel, the notch—, its name
     and its range, and the −/+ on the right. Below, what would change with one more. */
  function stepper(key, value, min, max, label, range, icon, previewNext) {
    return `<div class="field">
      <div class="field-row">
        <span class="field-icon"><img src="${D.art('hud', icon)}" alt=""></span>
        <span class="field-text"><span class="field-name">${esc(label)}</span><span class="field-note">${esc(range)}</span></span>
        <span class="step-row">
          <button type="button" class="step" data-act="step" data-key="${key}" data-delta="-1" ${value <= min ? 'disabled' : ''} aria-label="${esc(t('less') + ': ' + label)}">−</button>
          <span class="step-num">${value}</span>
          <button type="button" class="step" data-act="step" data-key="${key}" data-delta="1" ${value >= max ? 'disabled' : ''} aria-label="${esc(t('more') + ': ' + label)}">+</button>
        </span>
      </div>
      ${value < max ? previewOf(previewNext, 'ifOneMore') : ''}
    </div>`;
  }

  /* The nail: all five in a row and upright, like the large one on the sheet, with its damage
     below. The one you carry has the arena's cold spotlight behind it; the others wait in half-light. */
  function renderNailBlock() {
    const nails = D.NAILS.map((n) => {
      const on = state.nail === n.level;
      return `<button type="button" class="nailpick${on ? ' is-on' : ''}" data-act="seg" data-key="nail" data-value="${n.level}" aria-pressed="${on}" aria-label="${esc(pick(n) + ', ' + n.damage)}" title="${esc(pick(n))}">
        <span class="nailpick-art"><img src="${D.art('nails', n.level)}" alt="" width="80" height="360"></span>
        <span class="nailpick-num">${n.damage}</span>
      </button>`;
    }).join('');
    return `<section class="block">
      <h3 class="block-head">${esc(t('theNail'))}<span class="block-note">${esc(pick(D.NAILS[state.nail]))}</span></h3>
      <div class="nailpicks">${nails}</div>
    </section>`;
  }

  /* Arts and spells, like the sheet's plates but smaller and made to be touched: as a silhouette
     what you haven't learnt, with its light what you have, and below it what it gives. */
  function renderArtsBlock() {
    const plates = ART_KEYS.map((k) => {
      const on = !!state.arts[k];
      return `<button type="button" class="gplate${on ? ' is-on' : ''}" data-act="art" data-key="${k}" aria-pressed="${on}" title="${esc(D.ARTS[k].en)}">
        <span class="gplate-art"><img src="${D.art('arts', k)}" alt=""></span>
        <span class="gplate-name">${esc(pick(D.ARTS[k]))}</span>
        <span class="gplate-val${on ? '' : ' is-none'}">${on ? fmtStatRich(sheet.stats[ART_STAT[k]]) : esc(t('notLearned'))}</span>
      </button>`;
    }).join('');
    return `<section class="block"><h3 class="block-head">${esc(t('arts'))}</h3><div class="gplates">${plates}</div></section>`;
  }

  function renderSpellsBlock() {
    const plates = SPELL_KEYS.map((k) => {
      const sp = D.SPELLS[k];
      const lvl = state.spells[k];
      const opts = [{ text: '—', title: t('notLearned') }, { text: 'I', title: pick(sp.levels[1]) }, { text: 'II', title: pick(sp.levels[2]) }];
      return `<div class="gplate${lvl ? ' is-on' : ''}">
        <span class="gplate-art"><img src="${spellArt(k, lvl, (id) => state.charms.includes(id))}" alt=""></span>
        <span class="gplate-name">${esc(lvl ? pick(sp.levels[lvl]) : pick(sp.slot))}</span>
        <span class="gplate-val${lvl ? '' : ' is-none'}">${lvl ? fmtStatRich(sheet.stats['spell.' + k]) : esc(t('notLearned'))}</span>
        <span class="seg sm" role="group" aria-label="${esc(pick(sp.slot))}">${opts.map((o, i) => `<button type="button" data-act="seg" data-key="spells.${k}" data-value="${i}" aria-pressed="${i === lvl}" title="${esc(o.title)}">${o.text}</button>`).join('')}</span>
      </div>`;
    }).join('');
    return `<section class="block"><h3 class="block-head">${esc(t('spells'))}</h3><div class="gplates">${plates}</div></section>`;
  }

  /* The abilities that change some number: the Dream Nail, the cloak and Grimmchild's phase.
     The same plates as arts and spells. */
  function renderAbilitiesBlock() {
    const segmented = (key, value, opts, label) => `<span class="seg sm" role="group" aria-label="${esc(label)}">${opts.map((o, i) => `<button type="button" data-act="seg" data-key="${key}" data-value="${i + (o.from || 0)}" aria-pressed="${i + (o.from || 0) === value}" title="${esc(o.title)}" ${o.off ? 'disabled' : ''}>${o.text}</button>`).join('')}</span>`;
    const A = D.ABILITIES;
    const dream = `<button type="button" class="gplate${state.dream ? ' is-on' : ''}" data-act="seg" data-key="dream" data-value="${state.dream ? 0 : 1}" aria-pressed="${state.dream}" title="${esc(A.dream.en)}">
        <span class="gplate-art"><img src="${D.art('abilities', A.dream.art)}" alt=""></span>
        <span class="gplate-name">${esc(pick(A.dream))}</span>
        <span class="gplate-val${state.dream ? '' : ' is-none'}">${state.dream ? fmtStatRich(sheet.stats['soul.dreamNail']) : esc(t('notFound'))}</span>
      </button>`;
    const cloak = A.cloaks[state.cloak];
    const cloakPlate = `<div class="gplate${cloak ? ' is-on' : ''}">
        <span class="gplate-art"><img src="${D.art('abilities', (cloak || A.cloaks[1]).art)}" alt=""></span>
        <span class="gplate-name">${esc(pick(cloak || A.cloaks[1]))}</span>
        <span class="gplate-val${cloak ? '' : ' is-none'}">${cloak ? fmtStatRich(sheet.stats['move.dashCooldown']) : esc(t('notFound'))}</span>
        ${segmented('cloak', state.cloak, [{ text: '—', title: t('notFound') }, { text: 'I', title: pick(A.cloaks[1]) }, { text: 'II', title: pick(A.cloaks[2]) }], t('cloakLbl'))}
      </div>`;
    // The phase belongs to the charm: without Grimmchild in your collection there's no plate (whoever banishes
    // the troupe has Carefree Melody in its place). Phase IV needs the Dream Nail.
    const gdmg = D.PETS.grimmchildByPhase[state.grimm];
    const grimm = !isOwned('grimmchild') ? '' : `<div class="gplate is-on">
        <span class="gplate-art"><img src="${D.art('effects', 'grimmchild')}" alt=""></span>
        <span class="gplate-name">${esc(pick(D.CHARM_BY_ID.grimmchild))}</span>
        <span class="gplate-val${gdmg ? '' : ' is-none'}">${gdmg ? esc(String(gdmg)) : esc(t('grimmNoAttack'))}</span>
        ${segmented('grimm', state.grimm, ['I', 'II', 'III', 'IV'].map((text, i) => ({ text, from: 1,
          off: i === 3 && !state.dream, title: i === 3 && !state.dream ? t('grimmNeedsDream') : t('grimmPhase', { n: i + 1 }) })), pick(D.CHARM_BY_ID.grimmchild))}
      </div>`;
    return `<section class="block"><h3 class="block-head">${esc(t('abilities'))}</h3><div class="gplates">${dream}${cloakPlate}${grimm}</div></section>`;
  }

  /* The charms you've found, on the grid from the game's charm screen: the same one as on
     Charms (QUICK_SLOTS, four rows of ten with the even ones offset and the two-version slots
     split). Shadowed, the ones you don't have. A tap marks or unmarks; "All" and "None", in
     one go. */
  function renderOwnedBlock() {
    // Counts the game's slots (40): for the double ones, one of their two versions is enough.
    const n = QUICK_SLOTS.filter((sl) => sl.some((c) => isOwned(c.id))).length;
    const tile = (c, half) => {
      const on = isOwned(c.id);
      // The halves of a double slot: at most one marked; tapping the marked one removes it.
      const act = half ? `data-act="ownPick" data-value="${c.group}" data-token="${on ? '' : c.id}"` : `data-act="own" data-id="${c.id}"`;
      return `<button type="button" class="qc${half ? ' qc-half' : ''}${on ? '' : ' is-missing'}" ${act} aria-pressed="${on}" title="${esc(pick(c) + (on ? '' : ' · ' + t('notFound')))}">
        <img src="assets/charms/${c.id}.png" alt="${esc(pick(c))}" loading="lazy">
      </button>`;
    };
    const slot = (sl) => (sl.length === 1 ? tile(sl[0], false) : `<span class="qslot-pair">${sl.map((c) => tile(c, true)).join('')}</span>`);
    let rows = '';
    for (let i = 0; i < QUICK_SLOTS.length; i += QUICK_PER_ROW) {
      rows += `<div class="qrow">${QUICK_SLOTS.slice(i, i + QUICK_PER_ROW).map(slot).join('')}</div>`;
    }
    const total = QUICK_SLOTS.length;
    return `<section class="block quick quick-owned"><h3 class="block-head">${esc(t('ownedTitle'))}<span class="block-note">${n}/${total}</span>
        <span class="own-all">
          <button type="button" class="text-btn" data-act="ownAll" data-value="1" ${isMaxOwned() ? 'disabled' : ''}>${esc(t('ownAll'))}</button>
          <span class="presets-sep" aria-hidden="true">·</span>
          <button type="button" class="text-btn" data-act="ownAll" data-value="0" ${owned.length ? '' : 'disabled'}>${esc(t('ownNone'))}</button>
        </span></h3>
      <div class="quick-grid">${rows}</div>
    </section>`;
  }

  function renderBodyBlock() {
    return `<section class="block"><h3 class="block-head">${esc(t('body'))}</h3>
      ${stepper('masks', state.masks, D.HEALTH.baseMasks, D.HEALTH.maxMasks, t('masksField'), t('masksNote'), 'mask',
        state.masks < D.HEALTH.maxMasks ? C.set(state, 'masks', state.masks + 1) : null)}
      ${stepper('vessels', state.vessels, 0, D.SOUL.maxVessels, t('vesselsField'), t('vesselsNote'), 'vessel',
        state.vessels < D.SOUL.maxVessels ? C.set(state, 'vessels', state.vessels + 1) : null)}
      ${stepper('notches', state.notches, D.CHARM_NOTCHES.base, D.CHARM_NOTCHES.max, t('notchesField'), t('notchesNote'), 'notch',
        state.notches < D.CHARM_NOTCHES.max ? C.set(state, 'notches', state.notches + 1) : null)}
    </section>`;
  }

  /* Your game is another page of the Inventory: the same black with its corner brackets and no
     box. What you've achieved in the game —nail, body, arts, spells and abilities—, and under
     the title two starting points: the base Knight (which also clears the charms) and
     everything maxed out (which keeps them). */
  function renderGear() {
    const presets = `<div class="presets">
      <span class="lbl">${esc(t('presetsLbl'))}</span>
      <button type="button" class="text-btn" data-act="preset" data-value="base" title="${esc(t('presetBaseHint'))}">${esc(t('presetBase'))}</button>
      <span class="presets-sep" aria-hidden="true">·</span>
      <button type="button" class="text-btn" data-act="preset" data-value="max" title="${esc(t('presetMaxHint'))}">${esc(t('presetMax'))}</button>
    </div>`;
    el.gear.innerHTML = `<div class="gear-body">${brackets}
      ${screenHead(esc(t('navGame')), presets)}
      ${renderNailBlock()}
      ${renderBodyBlock()}
      ${renderArtsBlock()}
      ${renderSpellsBlock()}
      ${renderAbilitiesBlock()}
      ${renderOwnedBlock()}
    </div>`;
  }

  /* ── Combat simulator ──────────────────────────────────────────────────
     An exchange of blows by hand: you decide the order. Each button applies its number
     and writes it to the log, so what you see is arithmetic, not an animation. The
     Knight's damage comes from the sheet (js/engine.js) and therefore from your build;
     the enemy's health, phases and attacks, from js/enemies.js.

     An enemy is NOT a health bar. Some bosses are several at once (the three Mantis
     Lords, the three Sisters of Battle, Oro and Mato), some chain phases with their own
     health (False Knight alternates armour and maggot seven times) and some summon
     minions with health of their own. So the combat state is phases with parts, not a
     number:

       fight.parts     the bars alive NOW, from the current phase
       fight.queue     the ones waiting their turn (Watcher Knights: 6, never more than 2 standing)
       fight.minions   what it has summoned, killable and with its soul
       fight.target    who you're hitting, because with several bars you have to choose

     Godhome rules (kb/01-mechanics.md §1): Attuned and Ascended change health; Ascended
     also DOUBLES damage; on Radiant a single hit kills you. Being overcharmed multiplies
     the damage taken, and that already comes in health.damageMult.

     Health comes in three piles, because the Pantheons' rests treat them differently: the
     masks (Focus heals them), the charms' lifeblood (the bench restores it) and the
     Lifeblood Cocoon's (the bench wipes it). A hit takes lifeblood first —the cocoon's
     before the rest, since it's the one added on top— and then the masks. */
  const fight = { phase: 0, parts: [], queue: 0, minions: [], target: 'p0',
                  // Your side is handled by js/fight.js: four health piles, the shell, Carefree Melody,
                  // the heal window and the clock (design/04-charms-in-combat.md §3.3-3.4).
                  masks: 0, lbJoni: 0, lbCharm: 0, lbCocoon: 0, soul: 0,
                  shell: 0, melody: 0, focusing: false, healed: 0, elegyHalted: false,
                  clock: 0, sinceHit: 0, lostMask: false, sporeAt: 0, shieldAt: 0, acc: { kingsoul: 0, grimm: 0, womb: 0 },
                  // Which impacts of each spell land: { hw: { burst: 3 }, dd: { dive: 0, side: 'right' } }.
                  // Empty means "all", and it goes back to empty on reset or when the enemy changes.
                  spellSel: {},
                  dealt: 0, hits: 0, log: [], started: false, over: false, mark: '' };
  // The arena explanations that are open, by id ('spell:dd', 'focus', 'foe'…): see
  // helpBtn. They aren't saved (they're opened to read), but they survive each hit's repaint.
  const helpOpen = new Set();

  /* ── Standalone combat, Hall statue or pantheon room ───────────────────
     The same arena serves all three tabs. Combat is the fight out in the world, on
     Normal. In the Hall of Gods the statue sets the enemy and the difficulty, and you go
     in at full health, as in the game. In a pantheon room four things change: the room
     sets the enemy, the difficulty is Attuned, the build is the one you had on entry
     (frozen, with its bindings) and health and soul carry over from the previous
     room. */
  let run = null;          // pantheon run in progress, or null
  let runSheet = null;     // its frozen build's sheet, with the bindings applied
  const inRun = () => prefs.fightTab === 'pantheon' && !!run && !run.over;
  const runRooms = () => (run ? PN.PANTHEON_BY_ID[run.pantheon].rooms : []);
  const runRoom = () => (run ? runRooms()[run.room] || null : null);
  const runFight = () => inRun() && !!runRoom() && runRoom().type === 'fight';
  /* The combat sheet: the build's (with the bindings in a pantheon) computed with the fight's
     health (options.fight), which is what switches on Fury of the Fallen and Grubberfly's
     Elegy. The base one, without health, gives full health at the start and the caps. */
  let fightSheet = null;
  const baseSheet = () => (runFight() ? runSheet : sheet);
  const fs = () => fightSheet || baseSheet();
  function syncFightSheet() {
    fightSheet = sheet ? E.compute(fst(), prefs.lang, { bindings: runFight() ? run.bindings : null, fight: FT.health(fight) }) : null;
  }
  /* The pantheon build: nail, masks, vessels, spells and arts freeze on entry, as in the
     game; CHARMS don't, they're a single selection across the whole site —the sheet,
     combat and the benches—, and with them the notches, which decide what fits:
     otherwise the page and the pantheon could disagree on whether you're overcharmed.
     Whatever run.build stores for charms and notches is not used. */
  const runBuild = () => ({ ...run.build, charms: state.charms.slice(), notches: state.notches });
  const fst = () => (runFight() ? runBuild() : state);    // combat build

  /* While a pantheon lasts, charms can't be touched from ANYWHERE on the site —the grid,
     the equipped ones, the examples, the presets or a link— except at its benches: the
     game only lets you change them sitting on one, and here the benches are the rest
     rooms. The notches go with them, since they decide what fits. With the Charms
     binding, not even at the bench. It also holds from the Combat tab: the run is still
     half-done. Returns the reason, or '' if they can be changed. */
  function charmLock() {
    if (!run || run.over) return '';
    const name = pick(PN.PANTHEON_BY_ID[run.pantheon].name);
    if (run.bindings.charms) return t('runLockBound', { name });
    return runRoom() && runRoom().type === 'rest' ? '' : t('runLock', { name });
  }
  const touchesCharms = (next) => next.notches !== state.notches
    || next.charms.length !== state.charms.length || next.charms.some((id, i) => id !== state.charms[i]);
  const alive = () => FT.alive(fight);

  /* Fighting at a statue: with a difficulty chosen. Without one, the Hall shows. */
  const hallFight = () => prefs.fightTab === 'hall' && HG.DIFFS.includes(prefs.hallDiff) && !!HG.STATUE_BY_ID[prefs.hallId];

  const foe = () => (runFight() ? F.FOE_BY_ID[runRoom().foe]
    : prefs.fightTab === 'pantheon' ? null
    : prefs.fightTab === 'hall' ? (hallFight() ? F.FOE_BY_ID[prefs.hallId] : null)
    : F.FOE_BY_ID[prefs.foeId] || null);
  const foeName = (f) => pick(f.name);

  /* Health by difficulty and —for bosses that scale— your nail level. */
  function foeMaxHp(f, diff) {
    const raw = diff === 'base' ? f.hp : diff === 'at' ? f.at : f.asra;
    if (raw === null || raw === undefined) return null;
    return Array.isArray(raw) ? raw[Math.min(fst().nail, raw.length - 1)] : raw;
  }
  // All Pantheons are fought with Attuned health (Hallownest's too: what it
  // takes from Ascended is the arenas and the number of enemies, which go in the room).
  // Combat is always the fight out in the world; difficulty is the statues' business.
  const diffOf = () => (runFight() ? 'at' : hallFight() ? prefs.hallDiff : 'base');

  /* A standalone bar's health. Radiant shares health with Ascended. */
  function partHp(part, diff) {
    const raw = diff === 'base' ? part.hp : diff === 'at' ? part.at : part.asra;
    const v = raw === null || raw === undefined ? part.hp : raw;
    return Array.isArray(v) ? v[Math.min(fst().nail, v.length - 1)] : v;
  }

  // The phases as they come on the entry, with Godhome's own if it has them.
  const rawPhases = (f, d = diffOf()) =>
    (d === 'at' ? f.phasesAt : (d === 'asra' || d === 'radiant') ? f.phasesAsra : null) || f.phases;
  // The current phase's note, if it has one.
  const phaseNote = (f) => { const ph = (rawPhases(f) || [])[fight.phase]; return ph && ph.note ? pick(ph.note) : ''; };

  /* The phases of any entry, already resolved. An entry without `phases` is one phase
     with one bar: that way the render and the engine don't have two paths. A pantheon room
     can bring its own variation: `hp` (Hallownest's Brooding Mawlek has 750) and `count`
     (Hallownest's room 1 is TWO Vengefly Kings). */
  function phasesOf(f, d = diffOf()) {
    const base = rawPhases(f, d);
    let phaseList = base
      ? base.map((ph) => ph.parts.map((x) => ({ name: x.name, hp: partHp(x, d), decisive: !!x.decisive, noSoul: !!x.noSoul, art: x.art })))
      : [[{ name: f.name, hp: foeMaxHp(f, d) }]];
    const room = runFight() ? runRoom() : null;
    if (room && room.hp) phaseList = phaseList.map((ph) => ph.map((x) => ({ ...x, hp: room.hp })));
    if (room && room.count) phaseList = phaseList.map((ph) => Array.from({ length: room.count }, () => ph.map((x) => ({ ...x }))).flat());
    return phaseList;
  }

  /* Health for the whole fight, for the "N in total" and the hits needed. The Journal asks
     for it for entries that aren't the enemy yet, which is why a difficulty can come in. */
  function totalHp(f, d = diffOf()) {
    if (!f) return null;
    const phaseList = phasesOf(f, d);
    if (phaseList.length === 1 && phaseList[0].length === 1 && phaseList[0][0].hp === null) return null;
    let n = 0;
    for (const ph of phaseList) for (const part of ph) n += part.hp || 0;
    // Watcher Knights: the bar is a template repeated as many times as there are.
    if (f.pool) n = (phaseList[0][0].hp || 0) * f.pool;
    return n;
  }

  const newPart = (x) => ({ name: x.name, hp: x.hp, max: x.hp, decisive: x.decisive, noSoul: !!x.noSoul, art: x.art });

  function enterPhase(i) {
    const f = foe();
    const phaseList = phasesOf(f);
    fight.phase = i;
    const ph = phaseList[i] || [];
    const standing = f.pool ? Math.min(f.active || 1, f.pool) : ph.length;
    fight.parts = f.pool ? Array.from({ length: standing }, () => newPart(ph[0])) : ph.map(newPart);
    fight.queue = f.pool ? f.pool - standing : 0;
    fight.target = 'p' + fight.parts.findIndex((x) => x.hp > 0);
  }

  /* How much the surviving Oblobble gains and heals, by difficulty. */
  function frenzyOf(f) {
    const d = diffOf(), o = f.onDeath;
    if (d === 'at') return { hp: o.atHp, heal: o.atHeal };
    if (d === 'asra' || d === 'radiant') return { hp: o.asraHp, heal: o.asraHeal };
    return { hp: o.survivorHp, heal: o.survivorHeal };
  }

  /* The Hall of Gods marks: { id: ['at', 'asra', 'radiant'] }. They are your real game's,
     marked by hand on the plaque (HG.toggleMark), and saved apart from the build. The
     simulator doesn't touch them: it only shows how your build performs. */
  let marks = {};
  const loadMarks = () => {
    try { marks = HG.normalizeMarks(JSON.parse(load(KEY.hall) || '{}')); } catch (e) { marks = {}; }
  };
  const saveMarks = () => save(KEY.hall, Object.keys(marks).length ? JSON.stringify(marks) : null);

  /* Godhome's lifeblood door (js/pantheons.js): the bindings you've finished each pantheon
     with. Your real game, marked by hand. From here comes how many
     germs the cocoon at the pantheon's benches gives. */
  let door = PN.normalizeDoor(null);
  const loadDoor = () => {
    try { door = PN.normalizeDoor(JSON.parse(load(KEY.door) || 'null')); } catch (e) { door = PN.normalizeDoor(null); }
  };
  const saveDoor = () => save(KEY.door, PN.doorNotches(door) ? JSON.stringify(door) : null);

  /* The fight ends with the enemy on the ground. At a statue it leaves no symbol: the Hall's
     are those of your real game, and they're marked by hand on the plaque. */
  function winFight() {
    fight.over = true;
    endFresh = true;
  }

  /* What happens when a bar reaches zero. */
  function afterPartDeath(idx) {
    const f = foe(), p = fight.parts[idx];
    if (p.decisive) {
      winFight();
      logLine(t('logDecisive', { name: pick(p.name) }));
      return;
    }
    if (fight.queue > 0) {                       // Watcher Knights: the next one comes in
      fight.queue -= 1;
      fight.parts[idx] = newPart(phasesOf(f)[fight.phase][0]);
      logLine(t('logNextIn', { left: fight.queue }));
      return;
    }
    if (f.onDeath) {                             // Oblobbles: the other one goes berserk
      const survivor = fight.parts.find((x) => x.hp > 0);
      if (survivor) {
        const fr = frenzyOf(f);
        survivor.max = fr.hp;
        survivor.hp = Math.min(fr.hp, survivor.hp + fr.heal);
        logLine(t('logFrenzy', { n: NF[0].format(fr.hp) }));
      }
    }
    if (fight.parts.some((x) => x.hp > 0)) return;
    const phaseList = phasesOf(f);
    if (fight.phase + 1 < phaseList.length) {
      const endedPhase = fight.phase + 1;
      enterPhase(fight.phase + 1);
      logLine(t('logPhase', { n: endedPhase, next: fight.phase + 1 }));
      if (phaseNote(f)) logLine(phaseNote(f));
    } else {
      winFight();
      logLine(t('logKill', { foe: foeName(f), hits: fight.hits }));
    }
  }

  /* Masks one of their attacks takes from you, with overcharm already applied.
     Ascended is damage ×2, not "everything deals 2": the Hall of Gods page says
     "double damage", so Pure Vessel's Soul Daggers go from 2 to 4. */
  function foeDamage(f, atk, d = diffOf()) {
    const base = (atk && atk.dmg) || f.dmg || 1;
    const asc = d === 'asra' ? base * 2 : base;
    return Math.round(asc * fs().stats['health.damageMult'].value);
  }

  /* Your attacks: only what you've learnt, with your build's damage (in a pantheon, the
     one you had on entry, with its bindings). */
  function knightMoves() {
    const s = fs().stats, b = fst();
    // The soul it will really give: 11 while the main meter isn't full, 6 when it
    // is and it goes to the vessels, 0 with everything full (js/fight.js, nailSoul).
    // Against whoever gives no soul (the Collector, False Knight's armour…), "no soul".
    const ctx = fightCtx();
    const none = FT.soulless(ctx);
    const out = [{ id: 'nail', label: pick(D.NAILS[b.nail]), dmg: s['nail.damage'].value,
                   gain: FT.soulGain(fight, s, none), note: none ? t('noSoulNote') : '', art: D.art('nails', b.nail) }];
    for (const k of ART_KEYS) {
      if (!b.arts[k] || !s[ART_STAT[k]].applies) continue;   // Dash Slash, without a cloak, doesn't show
      out.push({ id: 'art:' + k, label: pick(D.ARTS[k]), dmg: s[ART_STAT[k]].value,
                 note: k === 'cyclone' ? t('perHitNote') : '', art: D.art('arts', k) });
    }
    for (const k of SPELL_KEYS) {
      if (!b.spells[k]) continue;
      // The damage of the impacts that land as chosen (js/fight.js, spellOutcome). The name
      // is the sheet's: with Flukenest it carries the charm, which is what sets the damage.
      out.push({ id: 'spell:' + k, label: s['spell.' + k].label, spell: k,
                 dmg: FT.spellOutcome(s['spell.' + k], fight.spellSel[k], ctx).dmg, cost: s['soul.spellCost'].value,
                 art: spellArt(k, b.spells[k], fightHas) });
    }
    if (s['heal.canFocus'].value) {
      out.push({ id: 'focus', label: t('focusMove'), heal: s['heal.masksPerFocus'].value,
                 cost: s['soul.focusCost'].value, art: D.art('abilities', 'focus') });
    }
    // What isn't hitting with the nail (design/04 §3.3, family C): the Shadow Dash
    // only if it deals damage (Sharp Shadow); the Dream Nail, always; the weaverlings, with their
    // charm; and "Wait", only when you wear a charm that works with the clock (§3.4):
    // it jumps straight to the first thing that will happen and says which charm it belongs to.
    if (s['nail.sharpShadow'].applies) {
      out.push({ id: 'dash', label: t('moveDash'), dmg: s['nail.sharpShadow'].value, note: t('noSoulNote'), art: D.art('charms', 'sharpshadow'), charm: true });
    }
    if (s['soul.dreamNail'].applies) out.push({ id: 'dream', label: t('moveDream'), gain: s['soul.dreamNail'].value, needsFoe: true, art: D.art('abilities', 'dream2') });
    if (s['pet.weaverling'].applies) {
      const per = s['pet.weaverling'].value, soul = s['pet.weaverlingSoul'].value * D.PETS.weaverlings;
      out.push({ id: 'weavers', label: t('moveWeavers'), dmg: per * D.PETS.weaverlings, note: D.PETS.weaverlings + ' × ' + per,
                 gain: soul || undefined, art: D.art('charms', 'weaversong'), charm: true });
    }
    // Dreamshield is positional, so it's done by hand: base nail with no soul, and it breaks for 2 s
    // on contact (design/04 §3.5). Broken, the button dims and says so.
    if (s['nail.dreamshield'].applies) {
      const ok = FT.shieldReady(fight);
      out.push({ id: 'shield', label: t('moveShield'), dmg: s['nail.dreamshield'].value, broken: !ok,
                 note: t(ok ? 'shieldNote' : 'shieldBroken'), art: D.art('charms', 'dreamshield'), charm: true });
    }
    const tick = FT.nextTick(fight, fightCtx());
    if (tick) out.push({ id: 'wait', label: t('moveWait', { s: NF[1].format(tick.s) }), wait: tick.s,
                         note: tick.bats ? t('waitBats') : t('waitFor', { charm: pick(D.CHARM_BY_ID[tick.charm]) }) });
    return out;
  }

  /* What the reducer needs to know about this fight. `has` honours the Charms binding. */
  const fightHas = (id) => !(runFight() && run.bindings.charms) && fst().charms.includes(id);
  function fightCtx() {
    const sh = fs();
    return { stats: sh.stats, has: fightHas, target: targetOf(), targetIsMinion: fight.target[0] === 'm',
             radiant: diffOf() === 'radiant', foe: foe(), phase: fight.phase, tab: prefs.fightTab,
             joniMax: sh.joniLifeblood || 0,
             fragile: fst().charms.filter((id) => D.CHARM_BY_ID[id] && D.CHARM_BY_ID[id].fragile),
             // The boss's stagger; in the Hall and the pantheons, Godhome's (Zote).
             stagger: staggerCfg(), parts: fight.parts };
  }
  const staggerCfg = () => FT.staggerOf(foe(), diffOf() !== 'base');

  /* What it summons, with the difficulty's rules: on Ascended the Collector changes its
     repertoire and in Godhome Gruz Mother no longer releases Gruzzers. In a pantheon the
     room rules: Hallownest's "Ascended arena" rooms summon as on Ascended even though
     they're fought with Attuned health. The index from the entry is kept, since that's
     what the button carries. */
  const summonDiff = () => (runFight() ? (runRoom().ascended ? 'asra' : 'at') : diffOf());
  const summonsOf = (f) => (f.summons || []).map((x, k) => ({ ...x, k }))
    .filter((x) => !x.diffs || x.diffs.includes(summonDiff()));

  const foeMoves = (f) => ((f.attacks && f.attacks.length)
    ? f.attacks.map((a, i) => ({ id: 'a' + i, label: pick(a), dmg: foeDamage(f, a), warn: a.warn ? pick(a.warn) : '', proj: a.proj || '', by: a.by || '' }))
    : [{ id: 'contact', label: t('contact'), dmg: foeDamage(f, null) }]);

  /* The bar you're hitting: "p0" a part, "m0" a minion. */
  function targetOf() {
    const [kind, i] = [fight.target[0], Number(fight.target.slice(1))];
    const pool = kind === 'm' ? fight.minions : fight.parts;
    return pool[i] && pool[i].hp > 0 ? pool[i] : null;
  }
  function retarget() {
    const i = fight.parts.findIndex((x) => x.hp > 0);
    const m = fight.minions.findIndex((x) => x.hp > 0);
    fight.target = i >= 0 ? 'p' + i : m >= 0 ? 'm' + m : 'p0';
  }

  function fightReset() {
    const f = foe();
    // In a pantheon you don't start topped up: you arrive with what you brought from the previous room.
    FT.reset(fight, baseSheet(), runFight() ? run : null);
    fight.melody = prefs.melody;   // Carefree Melody's counter survives the fight, as in the game
    fight.started = false;
    fight.over = false;
    fight.minions = [];
    fight.log = [];
    fight.spellSel = {};
    syncFightSheet();
    if (!f) { fight.parts = []; fight.queue = 0; fight.phase = 0; return; }
    enterPhase(0);
    const total = totalHp(f);
    if (total !== null) fight.log.push(t('logStart', { foe: foeName(f), hp: NF[0].format(total) }));
  }

  const logLine = (msg) => { fight.log.unshift(msg); if (fight.log.length > 9) fight.log.pop(); };

  /* The reducer's events (js/fight.js), turned into log lines: this is where the language comes in. */
  const moveLabel = (id) => { const m = knightMoves().find((x) => x.id === id); return m ? m.label : id; };

  /* Which impacts of a spell land, with the game's notches (design/05-spell-variants.html,
     variant B, chosen on 22 September 2026): one dot per impact, lit if it lands and a
     ring if not, with its figure below. The gesture is the health masks': tapping a dot
     lights up to it, and tapping the last lit one turns it off (that's how you get to zero,
     which is missing).
     The distinct parts (the dive, the Dark, the volatile one) light up or go out one by one; the
     Dark's side goes in text; Vengeful Spirit, against whoever takes it twice (spellTwice), carries a second dot
     "×2". The flukes, sixteen, go in small dots with their count. By default, all of them. */
  function spellSelHtml(key, label) {
    const st = fs().stats['spell.' + key];
    if (!st || !st.applies || !st.impacts) return '';
    const ctx = fightCtx();
    const sel = fight.spellSel[key] || {};
    const twiceOk = !!(ctx.foe && ctx.foe.spellTwice && !ctx.targetIsMinion);
    const multi = st.impacts.length > 1;
    const dot = (op, on, text, title) => `<button type="button" class="sd-dot${on ? '' : ' is-off'}" data-act="spellSel" data-id="${key}:${op}"
      aria-pressed="${on}" title="${esc(title)}" aria-label="${esc(title)}"><i class="notch${on ? '' : ' is-free'}"></i>${text ? `<small>${esc(text)}</small>` : ''}</button>`;
    const dots = [];
    let small = false, count = '', side = '';
    for (const im of st.impacts) {
      const n = FT.impactCount(im, sel, ctx);
      const v = im.alt && sel.side === 'right' ? im.alt : im.v;
      if (im.count > 1) {
        small = im.count > 8;
        for (let i = 0; i < im.count; i++) {
          dots.push(dot(`${im.id}:set:${i + 1}`, i < n, small ? '' : NF[0].format(v), t('selCount', { n: i + 1, max: im.count })));
        }
        if (small) count = `<span class="sd-count">${esc(t('selCount', { n, max: im.count }))}</span>`;
      } else if (im.twice) {
        if (!twiceOk) continue;
        dots.push(dot(`${im.id}:set:1`, true, NF[0].format(v), im.label));
        dots.push(dot(`${im.id}:twice`, n === 2, '×2', t('selTwice', { n: NF[0].format(2 * v) })));
      } else if (multi) {
        dots.push(dot(`${im.id}:toggle`, n > 0, (im.approx ? '~' : '') + NF[0].format(v), `${im.label} ${v}`));
        if (im.alt) {
          // "left" on its own doesn't say of what: the title and the group say it's where you have the enemy.
          side = `<span class="sd-side" role="group" aria-label="${esc(t('selSideGroup'))}">${['left', 'right'].map((k) => {
            const hint = esc(t(k === 'right' ? 'selRightHint' : 'selLeftHint', { n: NF[0].format(k === 'right' ? im.alt : im.v) }));
            return `<button type="button" data-act="spellSel" data-id="${key}:${im.id}:${k}" title="${hint}" aria-label="${hint}"
            aria-pressed="${(sel.side === 'right') === (k === 'right')}">${esc(t(k === 'right' ? 'selRight' : 'selLeft'))}</button>`;
          }).join('<i>·</i>')}</span>`;
        }
      }
    }
    // In front, a word that acts as a legend: "land". It says what lit means without the "?"
    // (for the screen reader the group already says it, so it's hidden from it).
    return dots.length ? `<div class="spell-dots${small ? ' is-small' : ''}" role="group" aria-label="${esc(t('selHint', { spell: label }))}"><span class="sd-lbl" aria-hidden="true">${esc(t('selLands'))}</span>${dots.join('')}${side}${count}</div>` : '';
  }

  /* ── The arena's explanations ────────────────────────────────────────────
     What a player without many hours can't read, explained where it is and only on request.
     There are few, the ones the game doesn't tell and that here change what you decide: each
     spell's notches (which impact each one is and why they don't always land), Cyclone Slash
     (its figure is one spin's, not the whole art's), Focus (the window in which a hit takes
     your heal away) and the Dream Nail (it doesn't hit: it draws soul). On the enemy's side, a
     single legend with what's on their cards: what pressing one of their attacks means, the
     stagger, "♪ Negated", "Blocked", "☠" and who you're hitting. The rest is already said by its
     note (the Shadow Dash's "no soul", Dreamshield, the weaverlings, "Wait… until the next…")
     or is what it looks like: explaining it would be noise.
     The gesture is a "?" that is a real button (aria-expanded, aria-controls), at the end of the
     row it explains, and it opens one to three lines below it that push what's underneath, like
     the Journal: no layers on top and no mouse as the only way, since on mobile it doesn't
     exist (title stays as a complement). The figures are the sheet's and the entry's, the same
     ones the arena uses, and the sum is shown (design/00 §5.14): "3 × 26 = 78". */
  const helpDom = (id) => 'help-' + id.replace(/[^a-z0-9]+/gi, '-');
  const helpBtn = (id, hint) => `<button type="button" class="help-q" data-act="help" data-id="${id}" aria-expanded="${helpOpen.has(id)}"
      aria-controls="${helpDom(id)}" title="${esc(hint)}" aria-label="${esc(hint)}"><span aria-hidden="true">?</span></button>`;
  const helpBox = (id, lines, cls = '') => `<div class="arena-help ${cls}" id="${helpDom(id)}"${helpOpen.has(id) ? '' : ' hidden'}>${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
  /* A line already in HTML: the text is escaped, the figures (nums) go in bone, and so does what
     the dictionary wraps in asterisks, which is the term as it appears on screen.
     words goes in as is (charm or impact names, from js/data.js and the engine). */
  const th = (key, nums = {}, words) => esc(t(key, words))
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/\{(\w+)\}/g, (m, k) => (k in nums ? `<b>${esc(nums[k])}</b>` : m));

  /* What each spell says, according to the impacts the sheet describes (js/engine.js, impacts):
     the same figures that come out under its notches, and in their order. Without notches there's nothing to explain. */
  function spellHelp(key) {
    const st = fs().stats['spell.' + key];
    if (!st || !st.impacts) return null;
    const n0 = (x) => NF[0].format(x);
    const ims = st.impacts;
    const by = (id) => ims.find((x) => x.id === id);
    const lines = [];
    if (by('fluke')) {
      const im = by('fluke');
      lines.push(th('helpFlukes', { n: n0(im.count), v: n0(im.v), total: n0(im.count * im.v) }, { label: im.label }));
    } else if (by('cloud')) {
      lines.push(th('helpVolatile', { a: n0(by('impact').v), b: '~' + n0(by('cloud').v), s: NF[1].format(D.SPELLS.vs.volatile.duration) }));
    } else if (by('bolt')) {
      // The "×2" only shows against whoever recoils (spellTwice); the projectile alone has no notches.
      return [th('helpTwice', { v: n0(by('bolt').v), n: n0(2 * by('bolt').v) })];
    } else if (key === 'hw') {
      const im = ims[0];
      lines.push(th('helpBursts', { n: n0(im.count), v: n0(im.v), total: n0(im.count * im.v) }));
    } else {
      // The dive and the Dark: one line per part, in the notches' order.
      for (const im of ims) {
        const k = im.id === 'dive' ? 'helpImDive' : im.alt ? 'helpImSide' : im.id === 'wave' || im.id === 'burst1' ? 'helpImBoth' : 'helpImPlain';
        lines.push(th(k, { v: n0(im.v), alt: n0(im.alt || 0) }, { label: im.label }));
      }
    }
    lines.push(th('helpNotches'));
    return lines;
  }

  /* Your attacks that carry an explanation (null, those that don't). */
  function moveHelp(m) {
    const s = fs().stats;
    const n0 = (x) => NF[0].format(x);
    if (m.spell) return spellHelp(m.spell);
    if (m.id === 'art:cyclone') {
      const a = D.NAIL.cycloneHits, b = D.NAIL.cycloneHitsMax;
      return [th('helpCyclone', { v: n0(m.dmg), a: n0(a), b: n0(b), ta: n0(a * m.dmg), tb: n0(b * m.dmg) })];
    }
    if (m.id === 'focus') {
      // What it really takes: the wind-up plus the heal (js/fight.js, duration), which is what the clock counts.
      const a = D.FOCUS.startup, b = s['heal.timePerFocus'].value, n = s['heal.masksPerFocus'].value;
      const lines = [th('helpFocus', { n: n0(n), t: NF[3].format(a + b), a: NF[3].format(a), b: NF[3].format(b), soul: n0(s['soul.focusCost'].value) },
        { unit: n === 1 ? t('maskUnitOne') : t('maskUnit'), done: t('fightFocusDone') })];
      if (fightHas('baldur')) lines.push(th('helpFocusBaldur', {}, { charm: pick(D.CHARM_BY_ID.baldur) }));
      return lines;
    }
    if (m.id === 'dream') return [th('helpDream', { soul: n0(s['soul.dreamNail'].value), s: NF[2].format(s['soul.dreamCharge'].value) })];
    return null;
  }

  /* The legend on the enemy's side: only what's on their cards right now. */
  function foeHelp(f) {
    const n0 = (x) => NF[0].format(x), n1 = (x) => NF[1].format(x);
    const radiant = diffOf() === 'radiant';
    const lines = [radiant ? th('helpFoeRadiant', {}, { diff: t('diffRa') }) : th('helpFoeAttacks')];
    // The stagger, with the figures from their card (Heavy Blow already subtracted, as there).
    const stg = staggerCfg();
    if (stg && !radiant) {
      const hb = fightHas('heavy') ? 1 : 0;
      lines.push(th(stg.bats ? 'helpStaggerBats' : 'helpStagger',
        { hits: n0(stg.hits - hb), max: n0(stg.combo - hb), w: n1(stg.window), s: n1(stg.bats || 0), cap: n0(stg.cap || 0) })
        + (hb ? ' ' + th('helpStaggerHeavy', {}, { charm: pick(D.CHARM_BY_ID.heavy) }) : ''));
    }
    if (fightHas('melody') && !radiant) {
      const steps = D.HEALTH.carefreeChances.map((x) => n1(x)).join(' → ') + pctSpace().replace(' ', '\u00a0');
      lines.push(th('helpMelody', { steps }, { neg: t('moveNegate'), charm: pick(D.CHARM_BY_ID.melody) }));
    }
    if (fightHas('dreamshield') && foeMoves(f).some((m) => m.proj === 'block')) {
      lines.push(th('helpBlock', { s: n0(D.PETS.dreamshieldBreak) }, { blocked: t('moveBlock'), charm: pick(D.CHARM_BY_ID.dreamshield) }));
    }
    const aliveCount = fight.parts.filter((x) => x.hp > 0).length + fight.minions.filter((x) => x.hp > 0).length;
    if (aliveCount > 1) lines.push(th('helpTarget'));
    return lines;
  }
  // Which hit it was, for the bats' notice: the nail or an art by its button; the rest,
  // by the charm or the action that gives it.
  const EV_CHARM = { elegy: 'elegy', thorns: 'thorns', womb: 'womb', spore: 'spore', grimmchild: 'grimmchild' };
  const evMove = (e) => (e.of === 'hit' ? moveLabel(e.move) : EV_CHARM[e.of] ? pick(D.CHARM_BY_ID[EV_CHARM[e.of]])
    : e.of === 'dash' ? t('moveDash') : e.of === 'weavers' ? t('moveWeavers') : e.of === 'shield' ? t('moveShield') : e.of);
  function logEvents(evs) {
    const f = foe();
    const n = (x) => NF[0].format(x);
    for (const e of evs) {
      switch (e.kind) {
        case 'hit':
          // A spell says how many of its impacts landed, if not all of them (or if more did).
          if (e.twice) logLine(t('logSpellTwice', { move: moveLabel(e.move), n: n(e.n), left: n(e.left) }));
          else if (e.of && e.landed < e.of) logLine(t('logSpellPartial', { move: moveLabel(e.move), k: e.landed, of: e.of, n: n(e.n), left: n(e.left) }));
          else logLine(t('logHit', { move: moveLabel(e.move), n: n(e.n), left: n(e.left) }));
          break;
        case 'spellMiss': logLine(t('logSpellMiss', { move: moveLabel(e.move) })); break;
        case 'minion': logLine(e.soul ? t('logMinion', { name: pick(e.name), soul: e.soul }) : t('logMinionNoSoul', { name: pick(e.name) })); break;
        case 'focus': logLine(t('logFocus', { n: e.n, left: e.left })); break;
        case 'take': logLine(t('logTake', { move: e.label, n: e.n, left: e.left })); break;
        case 'down': logLine(t('logDown', dealtOf(f))); break;
        case 'radiant': logLine(t('logRadiant', { move: e.label })); break;
        case 'elegy': logLine(t('logElegy', { n: n(e.n), left: n(e.left) })); break;
        case 'thorns': logLine(t('logThorns', { n: n(e.n), left: n(e.left) })); break;
        case 'grubsong': logLine(t('logGrubsong', { soul: e.soul })); break;
        case 'negated': logLine(t('logNegated', { move: e.label, n: e.n })); break;
        case 'shell': logLine(t('logShell', { move: e.label, left: e.left })); break;
        case 'focusLost': logLine(t('logFocusLost', { n: e.n, soul: e.soul })); break;
        case 'iframes': logLine(t('logIframes', { s: NF[2].format(e.s), hits: e.hits })); break;
        case 'fragile': logLine(t('logFragile', { charms: e.ids.map((id) => pick(D.CHARM_BY_ID[id])).join(', ') })); break;
        case 'spore': logLine(t('logSpore', { n: n(e.n), left: n(e.left) })); break;
        case 'dash': logLine(t('logDash', { n: n(e.n), left: n(e.left) })); break;
        case 'dream': logLine(t('logDream', { soul: e.soul })); break;
        case 'dreamNo': logLine(t('logDreamNo')); break;
        case 'weavers': logLine(t('logWeavers', { n: n(e.n), left: n(e.left) })); break;
        case 'weaversSoul': logLine(t('logWeaversSoul', { soul: e.soul })); break;
        case 'wait': logLine(t('logWait', { s: e.s })); break;
        case 'kingsoul': logLine(t('logKingsoul', { soul: e.soul })); break;
        case 'grimmchild': logLine(t('logGrimm', { n: n(e.n), shots: e.ticks, left: n(e.left) })); break;
        case 'womb': logLine(t('logWomb', { n: n(e.n), soul: e.soul, left: n(e.left) })); break;
        case 'hiveblood': logLine(t('logHiveblood', { left: e.left })); break;
        case 'blocked': logLine(t('logBlocked', { move: e.label, n: e.n })); break;
        case 'shield': logLine(t('logShield', { n: n(e.n), left: n(e.left) })); break;
        case 'stagger': logLine(t(e.combo ? 'logStaggerCombo' : 'logStagger', { name: pick(e.name), n: e.n })); break;
        case 'staggerEnd': logLine(t(e.wait ? 'logStaggerWait' : 'logStaggerEnd')); break;
        case 'bats': logLine(t('logBats', { name: pick(e.name), s: NF[1].format(e.s), cap: e.cap })); break;
        case 'batsEnd': logLine(t('logBatsEnd')); break;
        case 'batsCap': logLine(e.n ? t('logBatsCap', { move: evMove(e), n: n(e.n) }) : t('logBatsNone', { move: evMove(e) })); break;
        default: break;
      }
    }
  }

  /* After each action: settle the bars that have fallen (phases, Watcher Knights' queue,
     frenzy), log it, save Carefree Melody's counter and recompute the sheet with the new health. */
  function settle() {
    for (let i = 0; i < fight.parts.length; i++) {
      const p = fight.parts[i];
      if (p.hp <= 0 && !p.settled) { p.settled = true; afterPartDeath(i); }
    }
  }
  function afterAction(evs) {
    fight.started = true;
    logEvents(evs);
    settle();
    if (!targetOf()) retarget();
    if (prefs.melody !== fight.melody) { prefs.melody = fight.melody; savePrefs(); }
    syncFightSheet();
    render();
  }

  /* One of their attacks: "p0:2" = part 0 with its attack 2; "m1:0" = minion 1 with its own.
     negated: Carefree Melody negates it, and you decide that (design/04 §3.3). */
  function foeHitAct(node, negated, blocked) {
    const f = foe(); if (!f) return;
    if (fight.over || !alive()) return;
    const [who, j] = node.dataset.id.split(':');
    const foeData = who[0] === 'm' ? (F.FOE_BY_ID[(fight.minions[Number(who.slice(1))] || {}).id] || f) : f;
    const m = foeMoves(foeData)[Number(j)];
    if (!m) return;
    const part = who[0] === 'p' ? fight.parts[Number(who.slice(1))] : null;
    if (part && part.stag && part.stag.down) { toast(t('fightStaggeredToast')); return; }
    const evs = FT.apply(fight, { type: 'foeHit', dmg: m.dmg, label: m.label, negated: negated && fightHas('melody'),
                                  blocked: !!blocked && fightHas('dreamshield') && m.proj === 'block' }, fightCtx());
    hudEvent = 'hit';
    if (!alive()) endFresh = true;
    // In a pantheon, falling ends the run.
    if (!alive() && runFight()) { run.over = 'dead'; saveRun(); }
    afterAction(evs);
  }

  /* The build can change in the middle of everything, and then the caps move: some bosses'
     health grows with your nail, and removing a mask lowers your maximum. If the fight
     hasn't started it's rebuilt from scratch, so the numbers follow the build; if you've
     already landed a hit, what's been fought isn't touched, only what went over the cap is trimmed. */
  function fightSync() {
    const f = foe();
    if (!sheet) return;
    if (run) {
      // The pantheon's charms are the page's: if they change anywhere,
      // its caps change. Sitting on a bench also leaves you at full health.
      runSheet = E.compute(runBuild(), prefs.lang, { bindings: run.bindings });
      const seated = !run.over && runRoom() && runRoom().type === 'rest' && run.rest.sat;
      if (seated) runRefill(); else runClamp();
      run.soul = Math.min(run.soul, runSheet.stats['soul.total'].value);
      saveRun();
    }
    if (!f || !fight.started) { fightReset(); return; }
    for (const p of fight.parts) p.hp = Math.min(p.hp, p.max);
    for (const m of fight.minions) m.hp = Math.min(m.hp, m.max);
    FT.clamp(fight, baseSheet());
    syncFightSheet();
  }

  /* Search without accents or capitals: "campeon" has to find "Campeón fallido". */
  const plain = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ── The Hunter's Journal: the enemy picker ──────────────────────────────
     The list follows the game's Journal order (js/journal.js), which is roughly the order
     in which you run into them, and each row carries its medallion and the nail hits it
     takes with your build. Tapping a row only opens it on the facing page, like moving the
     cursor in the Journal; fighting is another gesture (the page's button, Enter or a double
     click). That way an entry can be read without throwing away a fight you're halfway through. */
  const JR_POS = Object.fromEntries(J.ORDER.map((id, i) => [id, i]));
  const JR_FOES = [...F.FOES].sort((a, b) => JR_POS[a.id] - JR_POS[b.id]);
  const JR_KINDS = [['all', 'jrAll'], ['boss', 'fightBosses'], ['enemy', 'fightEnemies']];
  const jrNarrow = matchMedia('(max-width: 699px)');   // the Journal switches to list or page

  /* The search runs in both languages at once: the community names bosses in English even
     when reading the site in Spanish, so "false knight" finds «Falso Caballero». */
  function foeMatches(kind) {
    const q = plain(pickerQuery.trim());
    return JR_FOES.filter((x) => (kind === 'all' || x.kind === kind)
      && (!q || plain(x.name.es).includes(q) || plain(x.name.en).includes(q)));
  }

  /* Nail hits an entry takes, with your build. The Journal is the fight out in the world,
     on Normal; the Hall asks for it at each difficulty. */
  function jrHits(x, d = 'base') {
    const total = totalHp(x, d);
    const nail = fs().stats['nail.damage'].value;
    return total && nail ? Math.ceil(total / nail) : null;
  }

  /* How many of their hits you survive at full health: those of their strongest attack, which
     on Ascended hits for double. On Radiant, one. */
  function enduranceOf(x, d) {
    const worstHit = Math.max(...(x.attacks && x.attacks.length ? x.attacks : [null]).map((a) => foeDamage(x, a, d)));
    return { worstHit, n: d === 'radiant' ? 1 : Math.ceil(fs().stats['health.total'].value / worstHit) };
  }

  /* An entry figure: label, value (already in HTML) and a note below. */
  const factHtml = (lbl, val, note) => `<div class="jr-fact"><dt>${esc(lbl)}</dt><dd>${val}</dd>${note ? `<small>${esc(note)}</small>` : ''}</div>`;

  /* The medallion in the Journal list. Entries without their own Journal entry (the dreams,
     Godhome) have none: they carry their portrait in a round well of the same size. */
  const jrMedal = (x) => (J.ENTRIES[x.id] && !J.ENTRIES[x.id].of
    ? `<img class="jr-medal" src="${D.art('journal', x.id)}" alt="" loading="lazy">`
    : `<span class="jr-medal is-art"><img src="${D.art('enemies', x.id)}" alt="" loading="lazy"></span>`);

  function jrRows() {
    const matches = foeMatches(prefs.foeKind);
    if (!matches.length) {
      const otherKind = prefs.foeKind === 'all' ? null : prefs.foeKind === 'boss' ? 'enemy' : 'boss';
      const anyOther = otherKind && foeMatches(otherKind).length;
      return `<li class="jr-empty" role="presentation">${esc(anyOther ? t('jrOtherKind', { kind: t(otherKind === 'boss' ? 'fightBosses' : 'fightEnemies') }) : t('fightNoMatch'))}</li>`;
    }
    return matches.map((x) => {
      const n = jrHits(x), cur = x.id === jrCursor;
      return `<li role="presentation"><button type="button" role="option" id="jr-${x.id}" class="jr-row ${cur ? 'is-cur' : ''} ${x.id === prefs.foeId ? 'is-on' : ''}"
        aria-selected="${cur}" tabindex="${cur ? 0 : -1}" data-act="foe" data-id="${x.id}">
        ${jrMedal(x)}<span class="jr-name">${esc(pick(x.name))}</span>
        <span class="jr-hits" title="${esc(n === null ? t('fightInvuln') : t('hitsToKill', { n }))}">${n === null ? '—' : NF[0].format(n)}</span>
      </button></li>`;
    }).join('');
  }

  /* The page: the portrait on black, the name in small caps, the Journal text and what the
     calculator adds, which is what the game doesn't say: how much it costs you. It's read by
     hovering the row (or with the arrows); picking is tapping the row (or Enter), so the
     page is read-only: no fight button, no go-to-its-statue button. */
  function jrPage(x) {
    if (!x) return `<p class="jr-blank">${esc(t('jrBlank'))}</p>`;
    const e = J.ENTRIES[x.id];
    const entry = e && e.of ? J.ENTRIES[e.of] : e;   // the ones that complete another show that one's
    const s = fs().stats;
    const total = totalHp(x, 'base');
    const nail = s['nail.damage'].value;
    const phaseCount = x.pool ? 1 : phasesOf(x, 'base').length;
    const { worstHit, n: endurance } = enduranceOf(x, 'base');
    const hpNote = phaseCount > 1 ? t('jrPhases', { n: phaseCount }) : '';
    const place = x.zone && x.zone.en !== 'Hallownest' ? ' · ' + pick(x.zone) : '';
    const text = entry && entry.desc
      ? `<p class="jr-desc">${esc(pick(entry.desc))}</p>
         ${entry.notes ? `<p class="jr-notes">${esc(pick(entry.notes))}</p>` : ''}
         ${entry.by ? `<p class="jr-by">— ${esc(pick(entry.by))}</p>` : ''}
         ${e.of ? `<p class="jr-aside">${esc(t('jrShared', { name: pick(F.FOE_BY_ID[e.of].name) }))}</p>` : ''}`
      : `<p class="jr-aside">${esc(t('jrNoEntry'))}</p>`;
    const fact = factHtml;
    return `${brackets}
      ${entry && entry.n ? `<span class="jr-num">${esc(t('jrNum', { n: entry.n }))}</span>` : ''}
      <div class="jr-art"><img src="${D.art('enemies', x.id)}" alt="" onerror="this.classList.add('is-missing')"></div>
      <h3 class="jr-title">${esc(pick(x.name))}</h3>
      ${rule}
      <p class="jr-kind">${esc(t(x.kind === 'boss' ? 'jrBoss' : 'jrEnemy'))}${esc(place)}</p>
      <div class="jr-text">${text}</div>
      <div class="jr-foot">
        <dl class="jr-facts">
          ${fact(t('jrHp'), total === null ? '<i class="na">—</i>' : NF[0].format(total), hpNote)}
          ${fact(t('jrNailHits'), total === null ? '<i class="na">—</i>' : NF[0].format(Math.ceil(total / nail)), t('jrNailNote', { n: NF[0].format(nail) }))}
          ${fact(t('hitsToDie'), NF[0].format(endurance), t(worstHit === 1 ? 'jrHitOfOne' : 'jrHitOf', { n: worstHit }))}
        </dl>

      </div>`;
  }

  /* When typing, changing filter or moving the cursor, ONLY the Journal is repainted: a
     full render would lose the cursor inside the search box and the list's scroll. */
  function paintJournal() {
    const box = el.fight.querySelector('.journal');
    if (!box) return;
    box.querySelector('.jr-list').innerHTML = jrRows();
    for (const n of box.querySelectorAll('[data-count]')) n.textContent = foeMatches(n.dataset.count).length;
    for (const b of box.querySelectorAll('[data-act="foeKind"]')) b.setAttribute('aria-pressed', String(prefs.foeKind === b.dataset.value));
    paintPage();
  }
  function paintPage() {
    const box = el.fight.querySelector('.journal');
    if (!box) return;
    jrPeek = null;
    box.querySelector('.jr-page').innerHTML = jrPage(F.FOE_BY_ID[jrCursor]);
    for (const r of box.querySelectorAll('.jr-row')) {
      const cur = r.dataset.id === jrCursor;
      r.classList.toggle('is-cur', cur);
      r.setAttribute('aria-selected', String(cur));
      r.tabIndex = cur ? 0 : -1;
    }
    const inp = box.querySelector('.jr-search');
    if (inp) inp.setAttribute('aria-activedescendant', jrCursor && box.querySelector('#jr-' + jrCursor) ? 'jr-' + jrCursor : '');
  }

  /* Brings the row being read into view by moving only the list's scroll: scrollIntoView
     would drag the page along too. */
  /* The two lists with a cursor (the enemy picker and the Hunter's Journal) move the same way:
     the row being read is centred on entry and, when moving, the list scrolls down or up just enough to show it. */
  function scrollToCur(listEl, rowEl, center) {
    if (!listEl || !rowEl) return;
    const rowTop = rowEl.offsetTop, rowBottom = rowTop + rowEl.offsetHeight;
    if (center) listEl.scrollTop = rowTop - (listEl.clientHeight - rowEl.offsetHeight) / 2;
    else if (rowTop < listEl.scrollTop) listEl.scrollTop = rowTop;
    else if (rowBottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = rowBottom - listEl.clientHeight;
  }
  // The cursor's step: ±n, 'first' or 'last', without leaving the list. Returns the new id.
  function stepCursor(items, cur, step) {
    const i = items.findIndex((x) => x.id === cur);
    const j = step === 'first' ? 0 : step === 'last' ? items.length - 1
      : Math.max(0, Math.min(items.length - 1, (i < 0 ? 0 : i) + step));
    return items[j].id;
  }
  function jrScroll(center) {
    const listEl = el.fight.querySelector('.jr-list');
    scrollToCur(listEl, listEl && listEl.querySelector('.jr-row.is-cur'), center);
  }

  /* If the entry being read is no longer in the list (filter, search), the first one is read. */
  function jrKeepCursor() {
    const matches = foeMatches(prefs.foeKind);
    if (!matches.some((x) => x.id === jrCursor)) jrCursor = matches.length ? matches[0].id : '';
  }

  function openJournal() {
    pickerOpen = true;
    jrCursor = prefs.foeId || jrCursor;
    // The filter can't hide whoever is in front of you: if it would, all of them show.
    if (prefs.foeId && prefs.foeKind !== 'all' && F.FOE_BY_ID[prefs.foeId].kind !== prefs.foeKind) prefs.foeKind = 'all';
    jrKeepCursor();
  }

  function jrMove(step, origin) {
    const matches = foeMatches(prefs.foeKind);
    if (!matches.length) return;
    jrCursor = stepCursor(matches, jrCursor, step);
    paintPage();
    jrScroll(false);
    // In the list, focus follows the cursor; in the search box it stays where it is.
    if (origin && origin.classList.contains('jr-row')) {
      const rowEl = el.fight.querySelector('#jr-' + jrCursor);
      if (rowEl) rowEl.focus();
    }
  }

  /* ── Header: COMBAT | HALL OF GODS | PANTHEONS ────────────────────────── */
  /* The combat header: the screen's title is its three tabs —the arena, the Hall of Gods and
     the Pantheons—, centred and with the rule below, like the other screens. */
  function fightHead() {
    // "Hall of Gods" doesn't fit on mobile: there that tab carries its short label.
    const tab = (id, key, short) => `<button type="button" role="tab" class="tab ${prefs.fightTab === id ? 'is-on' : ''}"
      data-act="fightTab" data-value="${id}" aria-selected="${prefs.fightTab === id}" ${short ? `aria-label="${esc(t(key))}"` : ''}>${short
        ? `<span class="tab-long" aria-hidden="true">${esc(t(key))}</span><span class="tab-short" aria-hidden="true">${esc(t(short))}</span>` : esc(t(key))}</button>`;
    const sep = '<span class="tab-sep" aria-hidden="true"></span>';
    return `<header class="inv-head fight-head">
      <h2 class="sr-only screen-title" tabindex="-1">${esc(t('navFight'))}</h2>
      <div class="tabs" role="tablist" aria-label="${esc(t('navFight'))}">
        ${tab('combat', 'fightTabCombat')}${sep}${tab('hall', 'fightTabHall', 'fightTabHallShort')}${sep}${tab('pantheon', 'fightTabPantheon')}
      </div>${rule}
    </header>`;
  }

  /* ── Your side of the arena: a scene from the game ────────────────────
     Top left, the HUD as the game paints it: the orb that fills with soul up to what you
     carry, the frame's tail with the masks on it and, below, the reserve vessels. At the
     bottom, the Knight on the ground as a black silhouette. The scene is decoration
     (aria-hidden): the figures are written in the header, like the enemy's opposite.

     The HUD is the same as the sheet's (hudHtml, below), with its fit measured alongside the
     panel's masks (.pip-mask). The orb fills from the bottom: the disc takes up 6.2% to 92.2% of
     soul-meter.png's height (7.75 and 115.25 out of 125 px), and the clip runs between those two.

     What changes with the last action is animated by comparing it with the last thing painted
     (hudPrev): the mask that breaks, the one that comes back and the soul that rises or falls.
     Lifeblood that goes simply disappears, as in the game: it leaves no gap, and painting it
     one more time to fade it out kept its place and separated the tail from the masks.
     What happens to the Knight —the hit's flicker, Focus's glow— isn't deduced from the
     numbers but from the action (hudEvent): sitting on the bench also takes away the
     cocoon's lifeblood, and that isn't a hit.
     And three states from the game: with a single mask the Knight gives off black smoke (as
     in Knight_One_Mask.gif on the wiki), on falling its Shade remains, and when overcharmed
     the HUD carries its purple aura behind the masks (Overcharm.png). */
  let hudPrev = null;
  let hudSeen = false;
  let hudEvent = '';          // 'hit' | 'focus': what the action just did
  let endFresh = false;       // the action just ended the fight: its title fades in
  const hudRing = `<svg class="hud-ring" viewBox="-10 -10 120 120" aria-hidden="true"><path fill-rule="evenodd" d="M104 50A54 54 0 1 0-4 50A54 54 0 1 0 104 50ZM101.3 49.2A50.5 50.5 0 1 1 .3 49.2A50.5 50.5 0 1 1 101.3 49.2Z"/></svg>`;
  /* The tail: a brush stroke that thins towards the tip and ends in a curl. */
  const hudTail = `<svg class="hud-tail" viewBox="0 0 230 16" aria-hidden="true"><path d="M0 5.2C50 3.4 120 8 200 6.1L200 7.5C120 9.6 50 6.6 0 10.4Z"/><path class="hud-curl" d="M199 6.8C210 6 218 8.6 216 12C214 15 208 13.6 210 10.6"/></svg>`;
  /* The game's foreground: pure black silhouette, no inner detail. The ground is a 900 × 44
     strip centred under the Knight that the SVG itself crops to the scene's width (slice),
     so it doesn't distort at any width; the rocks are pinned to the edges, framing it. */
  const sceneFloor = `<svg class="kfloor" viewBox="0 0 900 44" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 44V22C40 18 80 24 120 20C160 16 200 22 250 19C300 16 340 20 380 17L520 17C560 19 600 15 650 18C700 21 750 16 800 20C840 23 870 18 900 20V44Z
    M296 19Q297 11 292 5Q300 11 302 19ZM303 19Q306 12 311 9Q306 14 307 19Z
    M402 18Q403 10 398 4Q406 10 408 18ZM408 18Q411 11 417 8Q412 13 413 18Z
    M491 18Q493 9 497 3Q496 11 497 18ZM497 18Q501 12 507 11Q502 14 502 18Z
    M560 18C562 12 574 11 578 18ZM646 19Q649 10 646 4Q653 11 652 19ZM653 19Q657 13 663 12Q658 15 658 19Z"/></svg>
    <svg class="krock is-left" viewBox="0 0 100 110" aria-hidden="true"><path d="M0 110V30C6 24 14 26 18 34C24 44 30 52 40 60C52 70 60 80 74 88C84 94 92 100 100 110Z
    M17 33Q15 21 9 13Q19 21 21 37ZM26 46Q28 36 35 30Q30 40 30 50ZM48 66Q52 58 60 55Q54 62 53 70Z"/></svg>
    <svg class="krock is-right" viewBox="0 0 120 130" aria-hidden="true"><path d="M120 130V12C112 18 106 30 104 44C100 64 90 80 78 92C66 104 50 114 30 122C18 126 8 128 0 130Z
    M104 44Q98 34 99 22Q104 34 107 40ZM91 76Q82 70 78 60Q86 68 94 72ZM60 105Q53 99 51 91Q57 98 64 102Z"/></svg>`;
  const WISPS = 6;

  /* The HUD, as a pure function: the orb, the masks on the frame's tail, the vessels and the
     shell. The arena and the sheet paint it, and it neither reads nor writes anything outside:
     the last thing painted reaches it in "prev" ({ masks, lb, soul } or null, and then it
     animates nothing).
     "slot(g, cls, inner, on, isLb)" decides what each mask is —g is its number, the white ones
     first—: a decorative <span> in the arena, a button on the sheet, where the masks are the
     health control. "lbSlots" leaves room for spent lifeblood: in the arena no gap remains
     (lbSlots = lb), on the sheet it does, because you have to be able to press it again.
     Soul fills the orb first and the rest goes to the vessels. "main" sets the orb's level
     on its own (the sheet lets you empty the orb with the vessels full, as right after
     casting a spell); then "soul" is the orb plus the full vessels. With "orbAttrs" and
     "vesselAttrs(i, full)" the orb and the vessels are buttons. */
  function hudHtml(o, prev) {
    /* Soul: the orb first and the rest in the vessels, 33 at a time. Each sprite is
       clipped from the top (--cut, in % of its height) between the edges of its disc
       —soul-meter.png from 6.2% to 92.2%; soul.png, a 37 px disc in 45, from 8.9% to
       91.1%—; empty, nothing shows, not even the halo, and full, it's seen whole, with the halo. */
    const cut = (v, cap, top, span) => {
      const f = cap ? v / cap : 0;
      return (f >= 1 ? 0 : f <= 0 ? 100 : top + (1 - f) * span).toFixed(1) + '%';
    };
    const size = D.SOUL.vesselSize;
    const main = o.main != null ? o.main : Math.min(o.soul, o.mainMax);
    const soulWas = prev ? prev.soul : o.soul;
    const mainWas = prev && prev.main != null ? prev.main : prev ? Math.min(soulWas, o.mainMax) : main;
    const level = (now, was, cap, top, span) => {
      const a = cut(now, cap, top, span), b = cut(was, cap, top, span);
      return { moving: a !== b ? ' is-moving' : '', style: `--cut:${a};--cut-was:${b}` };
    };
    // A <span>, or a <button> with its attributes (data-act, title…) if it can be pressed.
    const piece = (btn, attrs, cls, style, inner) => (btn
      ? `<button type="button" class="${cls}" style="${style}"${attrs}>${inner}</button>`
      : `<span class="${cls}" style="${style}"${attrs}>${inner}</span>`);
    const lo = level(main, mainWas, o.mainMax, 6.2, 86);
    const orb = piece(!!o.orbAttrs, o.orbAttrs || (o.orbTitle ? ` title="${esc(o.orbTitle)}"` : ''), `hud-orb${lo.moving}`, lo.style,
      `<span class="orb-well"></span><img class="hud-soul" src="${D.art('hud', 'soul-meter')}" alt="">${hudRing}`);
    const vessels = Array.from({ length: o.vessels }, (_, i) => {
      const lv = level(o.soul - main - size * i, soulWas - mainWas - size * i, size, 8.9, 82.2);
      const attrs = o.vesselAttrs ? o.vesselAttrs(i, o.soul - main - size * i >= size) : '';
      return piece(!!attrs, attrs, `hud-vessel${lv.moving}`, lv.style, `<img src="${D.art('hud', 'soul')}" alt="">`);
    }).join('');

    const slot = o.slot || ((g, cls, inner, on, isLb, attrs) => `<span class="${cls}"${attrs || ''}>${inner}</span>`);
    /* With Hiveblood the game draws the masks in its honey hexagon, and Joni's Blessing's in the
       blue (wiki, "Hiveblood"; the sprites Hiveblood_Mask and Hiveblood_Jonis_Blessing_Mask).
       Lifeblood masks from elsewhere (Heart, Core, cocoon) stay as always. Joni's go first
       in the row (o.lbJoni). */
    const img = (lb, i = 0) => (o.hive && !lb ? `<img class="is-hive" src="${D.art('hud', 'hiveblood')}" alt="">`
      : o.hive && lb && i < (o.lbJoni || 0) ? `<img class="is-hive is-joni" src="${D.art('hud', 'hiveblood-joni')}" alt="">`
      : `<img src="${D.art('hud', lb ? 'mask-lb' : 'mask')}" alt="">`);
    // The slot that lights up or goes out relative to the last thing painted.
    const change = (on, was) => (on ? (was ? '' : ' is-mending') : (was ? ' is-empty is-breaking' : ' is-empty'));
    /* Hiveblood: the mask about to come back carries its honey, which rises with the time you've
       gone without damage (wiki, "Hiveblood": "a drop of honey that grows"). With Joni's Blessing it's one of hers. */
    const regenOn = o.regen != null;
    const honey = (joni) => `<img class="hud-honey${joni ? ' is-joni' : ''}" src="${D.art('hud', joni ? 'hiveblood-joni' : 'hiveblood')}" alt="">`;
    const regenStyle = regenOn ? ` style="--regen:${o.regen.toFixed(3)}"` : '';
    let masks = '', g = 0;
    for (let i = 0; i < o.maxMasks; i++) {
      const on = i < o.masks, was = prev ? i < prev.masks : on;
      const regen = !on && !o.joni && regenOn && i === o.masks;
      masks += slot(g++, `hud-mask${change(on, was)}${regen ? ' is-regen' : ''}`, img(false) + (regen ? honey(false) : ''), on, false, regen ? regenStyle : '');
    }
    const joniRegen = `<span class="hud-mask lb is-regen"${regenStyle}>${honey(true)}</span>`;
    const lbSlots = o.lbSlots === undefined ? o.lb : o.lbSlots;
    for (let i = 0; i < lbSlots; i++) {
      if (o.joni && regenOn && i === o.lbJoni) masks += joniRegen;
      const on = i < o.lb, was = prev ? i < prev.lb : on;
      masks += slot(g++, `hud-mask lb${change(on, was)}`, img(true, i), on, true);
    }
    if (o.joni && regenOn && o.lbJoni >= o.lb) masks += joniRegen;
    /* Baldur Shell under the orb, as in the game, with the hits it has left; broken, dimmed. */
    const shell = o.shell != null
      ? `<span class="hud-shell${o.shell ? '' : ' is-broken'}"><img src="${D.art('hud', 'baldur')}" alt=""><b>${o.shell}</b></span>` : '';
    return `<div class="hud">
          ${orb}
          <div class="hud-side">
            ${o.over ? `<img class="hud-over" src="assets/knight/overcharm.png" alt="">` : ''}
            <div class="hud-masks">${masks}</div>
            ${hudTail}
            ${vessels ? `<div class="hud-vessels"${o.vesselsTitle ? ` title="${esc(o.vesselsTitle)}"` : ''}>${vessels}</div>` : ''}
          </div>
          ${shell}
        </div>`;
  }

  function knightSideHtml(o) {
    // Only compared with the same health: standalone combat's isn't the pantheon's.
    const prev = hudPrev && hudPrev.key === o.key ? hudPrev : null;
    hudPrev = { key: o.key, masks: o.masks, lb: o.lb, soul: o.soul, down: o.down };
    hudSeen = true;
    const hp = o.masks + o.lb;
    const hit = !!prev && hudEvent === 'hit' && hp < prev.masks + prev.lb;
    const healed = !!prev && hudEvent === 'focus' && !o.down && o.masks > prev.masks;
    const dying = !!prev && o.down && !prev.down;
    const low = !o.down && hp === 1;
    const cls = [o.down && 'is-down', dying && 'is-dying', hit && !o.down && 'is-hit', healed && 'is-focus',
      low && 'is-low', o.over && 'is-over'].filter(Boolean).join(' ');
    const unit = o.maxMasks === 1 ? t('maskUnitOne') : t('maskUnit');
    return `<div class="kside-head">
        <h3>${esc(t('knight'))}</h3>
        <span class="kside-read"><b class="kside-masks">${o.masks}</b>/${o.maxMasks} ${esc(unit)}${o.lb ? ` · <span class="kside-lb">+<b>${o.lb}</b> ${esc(t('lifebloodLower'))}</span>` : ''} · ${esc(t('soul'))} <b class="kside-soul">${o.soul}</b>/${o.maxSoul}${o.shell != null ? ` · <span class="kside-shell">${esc(t('fightShell', { n: o.shell, max: o.shellMax }))}</span>` : ''}${o.melody != null ? ` · <span class="kside-melody">${esc(t('fightMelody', { pct: NF[1].format(o.melody) + pctSpace() }))}</span>` : ''}${o.clock ? ` · <span class="kside-clock">${esc(t('fightClock', { s: NF[1].format(o.clock) }))}</span>` : ''}${o.shield ? ` · <span class="kside-shield">${esc(t(o.shield === 'on' ? 'fightShieldOn' : 'fightShieldOff'))}</span>` : ''}</span>
      </div>
      ${o.focusing ? `<div class="kside-focus"><span>${esc(t('fightFocusing'))}</span><button type="button" class="btn" data-act="focusDone" title="${esc(t('fightFocusDoneHint'))}">${esc(t('fightFocusDone'))}</button></div>` : ''}
      <div class="kscene ${cls}" aria-hidden="true">
        ${hudHtml(o, prev)}
        <div class="kstage">
          <img class="kstage-art" src="assets/knight/${o.down ? 'shade' : 'knight'}.png" alt="">
          ${low ? '<span class="wisp"></span>'.repeat(WISPS) : ''}
        </div>
        ${sceneFloor}
      </div>`;
  }
  /* The scene from a sheet and a health state: standalone combat ('fight') or the
     pantheon run ('run'), which is a single life from room to room. */
  const sheetHas = (sh, id) => !(sh.bindings && sh.bindings.charms) && (sh.state.charms || []).includes(id);
  const knightSide = (sh, v, down, key) => knightSideHtml({
    key, masks: v.masks, lb: (v.lbJoni || 0) + v.lbCharm + v.lbCocoon, soul: v.soul, down,
    // What the charms add (design/04 §3.3): the shell, Carefree Melody, the open heal and the clock.
    shell: sheetHas(sh, 'baldur') ? (v.shell || 0) : null, shellMax: sh.stats['health.baldurBlocks'].value || 0,
    melody: sheetHas(sh, 'melody') ? FT.melodyChance(v) : null,
    focusing: !!v.focusing, clock: typeof v.clock === 'number' ? v.clock : 0,
    shield: sheetHas(sh, 'dreamshield') && typeof v.clock === 'number' ? (FT.shieldReady(v) ? 'on' : 'off') : null,
    // Hiveblood with a mask to come back: how much it has left, from 0 to 1 (only in a fight, which has a clock).
    joni: sheetHas(sh, 'joni'), lbJoni: v.lbJoni || 0, hive: sheetHas(sh, 'hiveblood'),
    regen: sheetHas(sh, 'hiveblood') && v.lostMask && typeof v.sinceHit === 'number'
      && (sheetHas(sh, 'joni') ? (v.lbJoni || 0) < (sh.joniLifeblood || 0) : v.masks < sh.stats['health.masks'].value)
      ? Math.min(1, v.sinceHit / sh.stats['health.hivebloodRegen'].value) : null,
    maxMasks: sh.stats['health.masks'].value, maxSoul: sh.stats['soul.total'].value,
    mainMax: sh.stats['soul.main'].value,
    vessels: Math.round(sh.stats['soul.reserve'].value / D.SOUL.vesselSize),
    over: !!(sh.notches && sh.notches.overcharmed),
  });

  /* The end of a fight, titled the way the game titles an area on entry: the word in
     spaced-out small caps, the flourish from the page title below and a line of text.
     No box and no traffic-light colour: the scene already tells it (the enemy dimmed, your Shade).
     Shared by combat, the Hall and the pantheons; in the Hall the symbol won takes the
     centre of the flourish. It fades in only when the action causes it (endFresh):
     repainting for anything else doesn't repeat it. */
  const endDiamond = `<svg viewBox="0 0 14 12" width="14" height="12"><path d="M7 1L13 6L7 11L1 6Z"/></svg>`;
  const fightEndHtml = (o) => `<div class="fight-end ${o.won ? 'is-won' : 'is-dead'} ${endFresh ? 'is-fresh' : ''} ${o.cls || ''}" role="status">
      <p class="fight-end-title">${esc(o.title)}</p>
      <span class="fight-end-rule" aria-hidden="true"><i></i>${o.badge || endDiamond}<i></i></span>
      ${o.note ? `<p class="fight-end-note">${esc(o.note)}</p>` : ''}
      ${o.acts ? `<div class="fight-end-acts">${o.acts}</div>` : ''}
    </div>`;
  // What it says below the title: how much it cost, or how far you got.
  const wonNote = (f) => t(fight.hits === 1 ? 'fightWonNoteOne' : 'fightWonNote', { foe: foeName(f), n: NF[0].format(fight.hits) })
    + (fight.clock > 0 ? ' ' + t('fightWonTime', { s: NF[1].format(fight.clock), dps: NF[0].format(fight.dealt / fight.clock) }) : '');
  const dealtOf = (f) => ({ done: NF[0].format(fight.dealt), total: NF[0].format(totalHp(f) || 0) });

  const logHtml = (lines) => `<div class="fight-log"><div class="block-head">${esc(t('fightLog'))}</div>
    <ol>${lines.map((l, i) => `<li ${i ? '' : 'class="is-last"'}>${esc(l)}</li>`).join('')}</ol></div>`;

  /* The arena: your sheet and your attacks facing one card per entity, and the log.
     Shared by the three tabs; in a pantheon, the room sets the enemy. The Hall and
     the pantheons title the ending in their own way (end); without it, standalone combat's. */
  function arenaHtml(end) {
    const f = foe();
    const s = fs().stats;
    const total = f ? totalHp(f) : null;
    const maxMasks = s['health.masks'].value;
    const dead = !alive();
    const won = !!f && fight.over;
    const nailDmg = s['nail.damage'].value;
    const toKill = total && nailDmg ? Math.ceil(total / nailDmg) : 0;

    /* Each entity is a card with its own buttons: the boss a normal one, each minion a
       small one. Doing it this way and not with a list of bars is what lets an Infected
       Balloon attack on its own and lets you choose who to hit. */
    function foeCardHtml(kind, i, foeData, part, isMinion) {
      const id = kind + i;
      const isTarget = fight.target === id;
      const isDead = part.hp <= 0;
      const pct = part.max ? Math.max(0, Math.min(100, part.hp / part.max * 100)) : 0;
      const calm = !!foeData.void && fightHas('voidheart');   // Void Heart: the Siblings don't attack
      // The stagger, in hits (js/fight.js): while it lasts, their attacks go dim.
      const stg = !isMinion && !isDead ? staggerCfg() : null;
      const st = stg && part.stag;
      const down = !!(st && st.down);
      const offFoe = dead || won || isDead || calm || down;
      let staggerLine = '';
      if (stg && diffOf() !== 'radiant') {
        const hb = fightHas('heavy') ? 1 : 0;
        const staggerLive = st && st.lastAt !== null && fight.clock - st.lastAt <= stg.window + 1e-9;
        staggerLine = !down
          ? `<span class="foecard-stagger">${esc(t('fightStaggerCount', { n: st ? st.n : 0, hits: stg.hits - hb, combo: staggerLive ? st.combo : 0, max: stg.combo - hb }))}</span>`
          : st.until
            ? `<span class="foecard-stagger is-down">${esc(t('fightBatsNow', { s: NF[1].format(Math.max(0, st.until - fight.clock)), cap: st.capLeft }))}</span>`
            : `<span class="foecard-stagger is-down">${esc(t('fightStaggered'))}</span>`;
      }
      const melody = fightHas('melody') && diffOf() !== 'radiant';
      // Dreamshield for the projectiles on its list (wiki, "Dreamshield"): the attack's
      // button says whether it blocks it or passes through, and the blockable ones carry a second "Blocked" button
      // while the shield is whole. Also on Radiant: the hit that doesn't land doesn't kill.
      const shield = fightHas('dreamshield'), shieldOk = FT.shieldReady(fight);
      // Each character, its attacks: the ones carrying by only show on that part's card.
      // The index j is the whole entry's, which is what foeHitAct resolves.
      const ownMove = (m) => !m.by || m.by === part.name.en;
      const moves = foeMoves(foeData).map((m, j) => {
        if (!ownMove(m)) return '';
        const proj = shield && m.proj ? `<span class="move-cost is-proj">${esc(t(m.proj === 'block' ? 'projBlock' : 'projPierce'))}</span>` : '';
        const btn = `<button type="button" class="move move-foe" data-act="foehit" data-id="${id}:${j}" ${offFoe ? 'disabled' : ''}>
          <span class="move-name">${esc(m.label)}</span>
          <span class="move-num">${diffOf() === 'radiant' ? '☠' : '−' + m.dmg}</span>
          ${m.warn ? `<span class="move-cost is-warn">${esc(m.warn)}</span>`
            : diffOf() === 'radiant' ? '' : `<span class="move-cost">${esc(m.dmg === 1 ? t('maskUnitOne') : t('maskUnit'))}</span>`}${proj}
        </button>`;
        const block = shield && m.proj === 'block'
          ? `<button type="button" class="move move-block" data-act="foeblock" data-id="${id}:${j}" ${offFoe || !shieldOk ? 'disabled' : ''} title="${esc(t(shieldOk ? 'projBlock' : 'shieldBroken'))}">
          <span class="move-name">${esc(t(shieldOk ? 'moveBlock' : 'fightShieldOff'))}</span>
          <span class="move-num">0</span>
        </button>` : '';
        // Carefree Melody doesn't roll dice: you decide it, with the probability in view.
        const negate = melody ? `<button type="button" class="move move-negate" data-act="foenegate" data-id="${id}:${j}" ${offFoe ? 'disabled' : ''}
          title="${esc(t('negateHint', { charm: pick(D.CHARM_BY_ID.melody) }))}">
          <span class="move-name">${esc(t('moveNegate'))}</span>
          <span class="move-num">${NF[1].format(FT.melodyChance(fight))}${esc(pctSpace())}</span>
        </button>` : '';
        return block || negate ? `<div class="move-pair">${btn}${block}${negate}</div>` : btn;
      }).join('') + (calm ? `<p class="foecard-note">${esc(t('fightVoidCalm'))}</p>` : '')
        + (foeMoves(foeData).some(ownMove) ? '' : `<p class="foecard-note">${esc(t('fightNoMoves'))}</p>`);
      const summonBtns = !isMinion
        ? summonsOf(foeData).map((x) => {
            const sub = F.FOE_BY_ID[x.id];
            if (!sub) return '';
            const hp = x.hp !== undefined ? x.hp : foeMaxHp(sub, 'base');
            return `<button type="button" class="move move-summon" data-act="summon" data-id="${x.k}" ${dead || won || isDead ? 'disabled' : ''}>
              <span class="move-name">${esc(t('fightSummonOne', { name: pick(sub.name) }))}</span>
              <span class="move-num">${NF[0].format(hp)}</span>
              <span class="move-cost">${esc(pick(x.note))}</span>
            </button>`;
          }).join('')
        : '';
      // The whole card picks who you hit, not just the header: the space next to the attacks
      // belongs to it too. An attack carries its own data-act, which wins by being further in;
      // the keyboard gets there through the header button.
      return `<div class="foecard ${isMinion ? 'is-minion' : ''} ${isTarget ? 'is-on' : ''} ${isDead ? 'is-down' : ''} ${down ? 'is-staggered' : ''}" ${isDead ? '' : `data-act="target" data-id="${id}"`}>
        <button type="button" class="foecard-head" data-act="target" data-id="${id}" ${isDead ? 'disabled' : ''} aria-pressed="${isTarget}">
          <img class="foecard-art" src="${D.art('enemies', part.art || foeData.id)}" alt="" loading="lazy" onerror="this.classList.add('is-missing')">
          <span class="foecard-body">
            <span class="foecard-name">${esc(pick(part.name))}</span>
            <span class="fbar ${pct <= 25 ? 'is-low' : ''}"><span style="width:${pct}%"></span></span>
            ${staggerLine}
          </span>
          <span class="foecard-num">${NF[0].format(Math.max(0, part.hp))}<i class="u">/${NF[0].format(part.max)}</i></span>
        </button>
        <div class="foecard-moves">${moves}${summonBtns}</div>
      </div>`;
    }

    let foeSide;
    if (!f) {
      foeSide = `<div class="foecard is-empty">
        <div class="foecard-head">
          <span class="foecard-body"><span class="foecard-name">${esc(t('fightPick'))}</span>
            <span class="foecard-note">${esc(t('fightNone'))}</span></span>
          <span class="foecard-num"><i class="na">—</i></span>
        </div>
        <div class="foecard-moves"><p class="moveset-empty">${esc(t('fightNoFoe'))}</p></div>
      </div>`;
    } else if (total === null) {
      foeSide = `<div class="foecard">
        <div class="foecard-head">
          <img class="foecard-art" src="${D.art('enemies', f.id)}" alt="" loading="lazy" onerror="this.classList.add('is-missing')">
          <span class="foecard-body"><span class="foecard-name">${esc(foeName(f))}</span>
            <span class="foecard-note">${esc(t('fightInvuln'))}</span></span>
        </div>
        <div class="foecard-moves">${foeMoves(f).map((m, j) => `<button type="button" class="move move-foe" data-act="foehit" data-id="p0:${j}" ${dead ? 'disabled' : ''}>
            <span class="move-name">${esc(m.label)}</span><span class="move-num">−${m.dmg}</span>
          </button>`).join('')}</div>
      </div>`;
    } else {
      const phaseList = phasesOf(f);
      const standing = fight.parts.filter((x) => x.hp > 0).length;
      const countLbl = f.pool
        ? t('fightStanding', { n: standing, total: standing + fight.queue })
        : phaseList.length > 1 ? t('fightPhase', { n: fight.phase + 1, total: phaseList.length }) : '';
      foeSide = `<div class="foes-head">
          <h3>${esc(foeName(f))}</h3>
          ${countLbl ? `<span class="fighter-phase">${esc(countLbl)}</span>` : ''}
          <span class="foes-total">${esc(t('fightTotal', { n: NF[0].format(total) }))} · ${esc(t('hitsToKill', { n: toKill }))} · ${esc(pick(f.zone))}</span>
          ${helpBtn('foe', t('helpFoe'))}
        </div>
        ${helpBox('foe', foeHelp(f), 'is-foe')}
        ${(f.notes || []).map((n) => `<p class="foecard-note is-warn">${esc(pick(n))}</p>`).join('')}
        ${phaseNote(f) ? `<p class="foecard-note">${esc(phaseNote(f))}</p>` : ''}
        ${fight.parts.map((x, i) => foeCardHtml('p', i, f, x, false)).join('')}
        ${fight.minions.map((m, i) => foeCardHtml('m', i, F.FOE_BY_ID[m.id] || f, m, true)).join('')}`;
    }

    const yours = knightMoves().map((m) => {
      const noSoul = m.cost && fight.soul < m.cost;
      const full = m.heal && fight.masks >= maxMasks;
      const needsFoe = m.dmg !== undefined || m.needsFoe;
      const off = !f || dead || won || noSoul || full || m.broken || (needsFoe && (total === null || !targetOf()));
      const why = !f ? t('fightNoTarget') : noSoul ? t('noSoulFor') : full ? t('fullHealth') : m.broken ? t('shieldBroken') : '';
      const num = m.heal ? '+' + m.heal + ' ' + esc(t('maskUnitOne')) : m.wait ? NF[1].format(m.wait) + ' s' : m.dmg !== undefined ? NF[0].format(m.dmg) : '+' + m.gain;
      const sub = m.cost ? `−${m.cost} ${esc(t('soulLower'))}` : m.gain && m.dmg !== undefined ? `+${m.gain} ${esc(t('soulLower'))}`
        : m.gain ? esc(t('soulLower')) : m.note ? esc(m.note) : '';
      const btn = `<button type="button" class="move ${m.art ? 'has-art' : ''}" data-act="hit" data-id="${m.id}" ${off ? 'disabled' : ''} ${why ? `title="${esc(why)}"` : ''}>
        ${m.art ? `<span class="move-art ${m.id === 'nail' ? 'is-nail' : ''}${m.charm ? ' is-charm' : ''}"><img src="${m.art}" alt=""></span>` : ''}
        <span class="move-name">${esc(m.label)}</span>
        <span class="move-num">${num}</span>
        ${sub ? `<span class="move-cost">${sub}</span>` : ''}
      </button>`;
      // With notches or an explanation, the button and its parts go in one block (a button can't
      // hold others inside): the "?" to the right of the figure, and below it the notches and what it opens.
      // A spell without notches (plain Shade Soul) has nothing to explain.
      const dots = m.spell ? spellSelHtml(m.spell, m.label) : '';
      const help = !m.spell || dots ? moveHelp(m) : null;
      if (!dots && !help) return btn;
      return `<div class="move-card${dots ? ' spell-card' : ''}">${btn}${help ? helpBtn(m.id, t('helpOf', { name: m.label })) : ''}${dots}${help ? helpBox(m.id, help) : ''}</div>`;
    }).join('');
    // The positional ones, named with their blurb: you can see you wear them and that they aren't simulated here.
    const notes = POSITIONAL.filter(fightHas).map((id) => `<li><b>${esc(pick(D.CHARM_BY_ID[id]))}</b>: ${esc(pick(D.CHARM_BY_ID[id].blurb))}</li>`);
    const notesHtml = notes.length ? `<ul class="moveset-notes" aria-label="${esc(t('fightNotes'))}">${notes.join('')}</ul>` : '';

    const endHtml = end !== undefined ? end
      : won ? fightEndHtml({ won: true, title: t('fightWon'), note: wonNote(f) })
      : dead ? fightEndHtml({ won: false, title: t('fightDead'), note: total === null ? '' : t('fightDeadNote', dealtOf(f)) })
      : '';

    return `${endHtml}
      <div class="arena">
        <div class="side-knight">
          ${knightSide(fs(), fight, dead, runFight() ? 'run' : 'fight')}
          <div class="moveset"><div class="block-head">${esc(t('yourMoves'))}</div>${yours}${notesHtml}</div>
        </div>
        <div class="side-foes">${foeSide}
          ${logHtml(fight.log)}${fight.clock > 0 ? `<p class="fight-clock-note">${esc(t('fightClockNote'))}</p>` : ''}
        </div>
      </div>`;
  }

  /* If your side of the arena wasn't painted this time (on another tab or outside a
     room), the next thing painted continues nothing: with no previous state, it doesn't animate. */
  function renderFight() {
    hudSeen = false;
    paintFight();
    if (!hudSeen) hudPrev = null;
    hudEvent = '';
    endFresh = false;
  }

  /* Reset, in the arena: text with its circled arrow, like the screen's other text buttons,
     level with the enemy's line. */
  const RESET_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.8-4.1"/><path d="M12.2 1.2v3.2H9"/></svg>';
  function paintFight() {
    const head = fightHead();
    // The Hall and the Pantheons are in Godhome: the section takes its tint (css: .fight.is-godhome).
    el.fight.classList.toggle('is-godhome', prefs.fightTab !== 'combat');
    if (prefs.fightTab === 'pantheon') { el.fight.innerHTML = renderPantheon(head); return; }
    if (prefs.fightTab === 'hall') { el.fight.innerHTML = renderHall(head); return; }

    const f = foe();
    const picker = `<div class="fight-pick">
      <span class="lbl" id="foe-lbl">${esc(t('fightPickLabel'))}</span>
      <button type="button" class="jr-toggle" data-act="picker" aria-expanded="${pickerOpen}" aria-controls="journal"
              aria-labelledby="foe-lbl jr-val">
        ${f ? jrMedal(f) : ''}
        <span class="jr-val ${f ? '' : 'is-empty'}" id="jr-val">${esc(f ? foeName(f) : t('fightPick'))}</span>
        <span class="jr-toggle-act">${esc(t(pickerOpen ? 'jrClose' : 'jrOpen'))}</span>${chevron(pickerOpen)}
      </button></div>`;
    const journal = pickerOpen ? `<div class="journal" id="journal">
        <div class="jr-index">
          <input type="search" class="jr-search" data-act="foeSearch" value="${esc(pickerQuery)}"
                 placeholder="${esc(t('jrSearch'))}" aria-label="${esc(t('jrSearch'))}"
                 role="combobox" aria-expanded="true" aria-controls="jr-list" aria-autocomplete="list"
                 aria-activedescendant="${jrCursor ? 'jr-' + jrCursor : ''}" autocomplete="off" spellcheck="false">
          <span class="seg sm jr-kinds">${JR_KINDS.map(([k, key]) => `<button type="button" data-act="foeKind" data-value="${k}" aria-pressed="${prefs.foeKind === k}">${esc(t(key))} <i data-count="${k}">${foeMatches(k).length}</i></button>`).join('')}</span>
          <div class="jr-head" aria-hidden="true"><span>${esc(t('jrEntry'))}</span><span>${esc(t('jrHitsHead'))}</span></div>
          <ul class="jr-list" id="jr-list" role="listbox" aria-label="${esc(t('jrTitle'))}">${jrRows()}</ul>
          ${f ? `<button type="button" class="jr-none" data-act="foeClear">${esc(t('fightClear'))}</button>` : ''}
        </div>
        <article class="jr-page" aria-live="polite">${jrPage(F.FOE_BY_ID[jrCursor])}</article>
      </div>` : '';

    el.fight.innerHTML = `<div class="fight-body">${brackets}${head}
      <div class="fight-tools">${picker}
        <button type="button" class="text-btn fight-reset" data-act="fightReset" title="${esc(t('fightResetHint'))}">${RESET_ICON}${esc(t('fightReset'))}</button></div>
      ${journal}
      ${arenaHtml()}
    </div>`;

    // When the Journal opens, the entry being read may be a hundred rows further down.
    if (pickerOpen) jrScroll(true);
  }

  /* ── Hall of Gods ──────────────────────────────────────────────────────
     One statue per boss, and each is challenged at three difficulties (wiki, "Hall of Gods"):
     Attuned is the fight as in Hallownest with Godhome's health; Ascended, damage ×2, more
     health and sometimes a new arena; Radiant, Ascended and one hit kills you. Entering heals
     you fully and falling sends you back to the statue, so nothing carries over here.

     There are 44 fights on 35 pedestals: the lever ones and the dreamcatcher ones carry two
     bosses, and here that pedestal splits into two halves. The symbols are your real game's: they're marked by hand on the plaque, each
     one on its own, and with all 44 beaten the Void Idol changes. Winning here marks
     nothing: the simulator only shows how your build performs. All three difficulties are always
     open.

     On mobile the plaque replaces the grid, like the Journal's page replaces its list. */
  const DIFF_KEY = { at: 'diffAt', asra: 'diffAs', radiant: 'diffRa' };
  let hallReading = false;          // on mobile: the plaque shows instead of the grid
  let hallTablet = false;           // the tablet is read in place of the grid and the plaque
  let hallFilter = '';              // 'at' | 'asra' | 'radiant': dims the ones already beaten there
  let hallBulk = false;             // the "Mark in bulk" panel, open
  let hallUndo = null;              // { prev, d, on, n }: the last bulk action, to undo it
  // Those who only fight in Godhome: their "usual" arena is the Pantheon's.
  const godhomeOnly = (x) => ['Godhome', 'Pantheon of Hallownest'].includes(x.zone && x.zone.en);
  // The glyph for a double pedestal's lever (the wiki has no sprite): base, rod and knob.
  const LEVER_SVG = `<svg class="ped-lever" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M3 15h12M9 15L5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5" cy="5" r="1.9" fill="currentColor"/></svg>`;
  const hasMark = (id, d) => (marks[id] || []).includes(d);
  const hallBadge = (d, on) => `<img class="hall-badge m-${d} ${on ? 'is-on' : ''}" src="assets/hall/badge-${d}.png" alt="" width="20" height="20">`;
  const statueName = (s) => pick(F.FOE_BY_ID[s.id].name);
  // A double pedestal's partner, both ways, and how to switch to it.
  const partnerOf = (s) => (s.of ? HG.STATUE_BY_ID[s.of] : HG.STATUES.find((y) => y.of === s.id) || null);

  function renderHall(head) {
    return `<div class="fight-body hall">${brackets}${head}${hallFight() ? hallFightHtml() : hallBoardHtml()}</div>`;
  }

  function hallBoardHtml() {
    const total = HG.STATUES.length;
    const tier = HG.idolTier(marks);
    const won = Object.fromEntries(HG.DIFFS.map((d) => [d, HG.STATUES.filter((s) => hasMark(s.id, d)).length]));
    /* Each count is a filter: tapping it dims on the grid the ones already beaten at that
       difficulty and leaves lit the ones still to go. Tapping the active one turns it off. */
    const counts = HG.DIFFS.map((d) => {
      const n = won[d], on = hallFilter === d;
      return `<li class="hall-count"><button type="button" class="hall-count-btn ${on ? 'is-on' : ''}" data-act="hallFilter" data-value="${d}"
        aria-pressed="${on}" title="${esc(t('hallFilterBtn', { diff: t(DIFF_KEY[d]) }))}">${hallBadge(d, n > 0)}
        <span class="hall-count-num"><b>${NF[0].format(n)}</b><i class="u">/${total}</i></span>
        <span class="hall-count-lbl">${esc(t(DIFF_KEY[d]))}</span></button></li>`;
    }).join('');
    const filterNote = hallFilter ? `<p class="hall-filter-note" role="status">${esc(t(
      won[hallFilter] === 0 ? 'hallFilterNone' : won[hallFilter] === 1 ? 'hallFilterOnOne' : 'hallFilterOn',
      { won: NF[0].format(won[hallFilter]), diff: t(DIFF_KEY[hallFilter]), left: NF[0].format(total - won[hallFilter]) }))}</p>` : '';
    /* Mark in bulk: one symbol on all 44 at once, by difficulty. It's rarely used, so it
       goes collapsed, and whatever wouldn't change anything is dimmed. Removing wipes your real
       game: the last action can be undone until the next change of marks. The lit badge
       marks and the dimmed one removes. */
    const rowEl = (on) => {
      const lbl = 'hall-bulk-' + (on ? 'set' : 'unset');
      return `<div class="hall-go-row" role="group" aria-labelledby="${lbl}">
        <span class="lbl" id="${lbl}">${esc(on ? t('hallBulkSet', { n: total }) : t('hallBulkUnset'))}</span>
        ${HG.DIFFS.map((d) => `<button type="button" class="btn hall-bulk-btn" data-act="hallMarkAll" data-value="${d}" data-on="${on ? 1 : 0}"
          ${(on ? won[d] < total : won[d] > 0) ? '' : 'disabled'}>${hallBadge(d, on)}${esc(t(DIFF_KEY[d]))}</button>`).join('')}
      </div>`;
    };
    const undoNote = hallUndo ? `<p class="hall-bulk-done"><span role="status">${esc(t(
      (hallUndo.on ? 'hallBulkDoneSet' : 'hallBulkDoneUnset') + (hallUndo.n === 1 ? 'One' : ''),
      { diff: t(DIFF_KEY[hallUndo.d]), n: NF[0].format(hallUndo.n) }))}</span>
      <button type="button" class="btn hall-undo" data-act="hallUndo">${esc(t('hallUndo'))}</button></p>` : '';
    const bulk = `<button type="button" class="btn hall-bulk-toggle" data-act="hallBulk" aria-expanded="${hallBulk}"
        title="${esc(t('hallBulkHint', { n: total }))}">${esc(t('hallBulk'))}${chevron(hallBulk)}</button>
      ${hallBulk ? `<div class="hall-bulk">${rowEl(true)}${rowEl(false)}
        <p class="hall-bulk-rule">${esc(t('hallBulkRule'))}</p>${undoNote}</div>` : ''}`;
    const idol = `<div class="hall-idol ${tier ? '' : 'is-off'} ${hallBulk ? 'is-bulk' : ''}">
      <span class="hall-idol-art"><img src="assets/hall/idol-${tier || 'at'}.png" alt=""></span>
      <div class="hall-idol-body">
        <h3>${esc(t('hallIdol'))}</h3>
        <p class="hall-idol-note">${esc(tier ? t('hallIdolOn', { n: total, diff: t(DIFF_KEY[tier]) }) : t('hallIdolOff', { n: total }))}</p>
        <ul class="hall-counts" aria-label="${esc(t('hallCountTitle'))}">${counts}</ul>
        ${filterNote}
        <p class="hall-rules">${esc(t('hallRules'))}</p>
        ${bulk}
      </div>
      <button type="button" class="btn hall-tablet-btn" data-act="tablet" aria-pressed="${hallTablet}" title="${esc(t('hallTabletHint'))}">
        <img src="assets/hall/tablet.png" alt="" width="28" height="40">${esc(t('hallTablet'))}</button>
    </div>`;

    const tile = (s) => {
      const on = s.id === prefs.hallId;
      const got = HG.DIFFS.filter((d) => hasMark(s.id, d)).map((d) => t(DIFF_KEY[d]));
      const title = statueName(s) + ' · ' + (got.length ? got.join(', ') : t('hallNoMarks'));
      // With a filter, the one already beaten at that difficulty dims: the ones still to go stay lit.
      const dim = !!hallFilter && hasMark(s.id, hallFilter);
      // A double pedestal's second fight carries its glyph: the Dream Nail or the lever.
      const via = s.via === 'dream' ? '<img class="ped-dream" src="assets/abilities/dream1.png" alt="">' : s.via === 'lever' ? LEVER_SVG : '';
      // A single tab stop in the grid: the chosen one; the arrows move (hallMove).
      return `<button type="button" class="ped-btn ${s.via === 'dream' ? 'is-dream' : ''} ${on ? 'is-on' : ''} ${dim ? 'is-dim' : ''}"
        data-act="hallPick" data-id="${s.id}" aria-pressed="${on}" tabindex="${on ? 0 : -1}" title="${esc(title)}">
        <span class="ped-niche"><img src="assets/hall/${HG.artOf(s)}.png" alt="" loading="lazy">${via}</span>
        <span class="ped-name">${esc(s.short ? pick(s.short) : statueName(s))}</span>
        <span class="ped-marks" aria-hidden="true">${HG.DIFFS.map((d) => hallBadge(d, hasMark(s.id, d))).join('')}</span>
        <span class="sr-only">${esc(got.length ? got.join(', ') : t('hallNoMarks'))}${s.via ? ' · ' + esc(t(s.via === 'dream' ? 'hallViaDream' : 'hallViaLever')) : ''}</span>
      </button>`;
    };
    const grid = HG.PEDESTALS.map((ped) => (ped.length === 1
      ? `<div class="ped">${tile(ped[0])}</div>`
      : `<div class="ped ped-pair" title="${esc(t(ped[1].via === 'dream' ? 'hallViaDream' : 'hallViaLever'))}">${ped.map(tile).join('')}</div>`)).join('');

    // The tablet, when open, takes the place of the grid and the plaque; the Idol stays on top.
    return `${idol}
      ${hallTablet ? tabletHtml() : `<div class="hall-room ${hallReading ? 'is-reading' : ''}">
        <div class="hall-grid" role="group" aria-label="${esc(t('fightTabHall'))}">${grid}</div>
        <article class="hall-plaque jr-page" aria-live="polite">${hallPlaqueHtml()}</article>
      </div>`}`;
  }

  /* The statue's plaque: who it is, its title on the pedestal and, difficulty by
     difficulty, what it costs you with your build. It's the sum the game doesn't show. */
  function hallPlaqueHtml() {
    const s = HG.STATUE_BY_ID[prefs.hallId];
    const x = F.FOE_BY_ID[s.id];
    const partner = partnerOf(s);
    const via = s.via || (partner && partner.via);
    const nail = fs().stats['nail.damage'].value;
    /* A table and not three cards: what matters is comparing the three difficulties. */
    const perDiff = Object.fromEntries(HG.DIFFS.map((d) => [d, { total: totalHp(x, d), ...enduranceOf(x, d) }]));
    /* Each difficulty is a button: it marks or removes your real game's symbol. */
    const diffRows = HG.DIFFS.map((d) => {
      const c = perDiff[d], won = hasMark(s.id, d);
      return `<tr class="${won ? 'is-won' : ''}">
        <th scope="row"><button type="button" class="hall-mark" data-act="hallMark" data-value="${d}" aria-pressed="${won}"
          title="${esc(t(won ? 'hallMarkUnset' : 'hallMarkSet', { diff: t(DIFF_KEY[d]) }))}">${hallBadge(d, won)}${esc(t(DIFF_KEY[d]))}</button></th>
        <td>${NF[0].format(c.total)}</td>
        <td>${NF[0].format(Math.ceil(c.total / nail))}</td>
        <td>${NF[0].format(c.n)}</td>
      </tr>`;
    }).join('');
    const phaseCount = x.pool ? 1 : phasesOf(x, 'at').length;
    const worstHitAt = perDiff.at.worstHit, worstHitAsra = perDiff.asra.worstHit;
    const hallNotes = [
      phaseCount > 1 ? t('hallNotePhases', { n: phaseCount }) : '',
      t('hallNoteHits', { n: NF[0].format(nail) }),
      t(worstHitAt === 1 ? 'hallNoteSurviveOne' : 'hallNoteSurvive', { at: worstHitAt, asra: worstHitAsra }),
    ].filter(Boolean).join(' ');
    const tableHtml = `<table class="hall-table">
        <thead><tr>
          <th scope="col"><span class="sr-only">${esc(t('hallColDiff'))}</span></th>
          <th scope="col">${esc(t('jrHp'))}</th>
          <th scope="col">${esc(t('hallColHits'))}</th>
          <th scope="col">${esc(t('hallColSurvive'))}</th>
        </tr></thead>
        <tbody>${diffRows}</tbody>
      </table>
      <p class="hall-mark-hint">${esc(t('hallMarkHint'))}</p>
      <p class="hall-notes">${esc(hallNotes)}</p>
      <p class="hall-arena"><b>${esc(t('hallArena'))}</b> ${esc(s.arena ? pick(s.arena) : t(godhomeOnly(x) ? 'hallArenaPantheon' : 'hallArenaSame'))}</p>
      <div class="hall-go-row" role="group" aria-labelledby="hall-go-lbl">
        <span class="lbl" id="hall-go-lbl">${esc(t('hallFightLbl'))}</span>
        ${HG.DIFFS.map((d) => `<button type="button" class="btn btn-primary hall-go" data-act="hallFight" data-value="${d}">${esc(t(DIFF_KEY[d]))}</button>`).join('')}
      </div>`;
    return `${brackets}
      <button type="button" class="btn jr-back" data-act="hallList">‹ ${esc(t('fightTabHall'))}</button>
      <div class="hall-art"><img src="assets/hall/${HG.artOf(s)}.png" alt=""></div>
      <h3 class="jr-title">${esc(pick(x.name))}</h3>
      <p class="hall-title">${esc(pick(s.title))}</p>
      ${rule}
      ${partner ? `<button type="button" class="btn hall-other" data-act="hallPick" data-id="${partner.id}">${esc(t(via === 'dream' ? 'hallDream' : 'hallLever', { name: statueName(partner) }))}</button>` : ''}
      ${tableHtml}`;
  }

  /* The arrows across the grid: left and right, the statue before and after; up and down,
     the one in the neighbouring row with the closest centre (the double pedestals and the
     "dense" packing make the columns not line up). They pick the statue without opening the
     plaque: on mobile, the arrows mustn't hide the grid. */
  function hallMove(key, origin) {
    const tiles = [...el.fight.querySelectorAll('.ped-btn')];
    const i = tiles.indexOf(origin);
    if (i < 0) return;
    let j = i;
    if (key === 'Home') j = 0;
    else if (key === 'End') j = tiles.length - 1;
    else if (key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (key === 'ArrowRight') j = Math.min(tiles.length - 1, i + 1);
    else {
      const boxes = tiles.map((b) => b.getBoundingClientRect());
      const mine = boxes[i], cx = (mine.left + mine.right) / 2;
      const rowTops = [...new Set(boxes.map((c) => Math.round(c.top)))].sort((a, b) => a - b);
      const k = rowTops.indexOf(Math.round(mine.top)) + (key === 'ArrowUp' ? -1 : 1);
      if (k < 0 || k >= rowTops.length) return;
      let bestDist = Infinity;
      boxes.forEach((c, n) => {
        if (Math.round(c.top) !== rowTops[k]) return;
        const dist = Math.abs((c.left + c.right) / 2 - cx);
        if (dist < bestDist) { bestDist = dist; j = n; }
      });
    }
    if (j === i) return;
    prefs.hallId = tiles[j].dataset.id;
    savePrefs();
    render();
    const b = el.fight.querySelector(`.ped-btn[data-id="${prefs.hallId}"]`);
    if (b) b.focus();
  }

  /* The entrance tablet, traced from its screen in the game: the two Godmaster ornaments,
     the title and the 44 in four columns of eleven, in the tablet's order (HG.TABLET),
     each with its statue name and the highest symbol you have in front of it
     (HG.tabletMark). As there, it's read-only. It doesn't cover the site: it's read inside the
     Hall, in place of the grid and the plaque, like the Journal's page in place of its list on
     mobile, and you go back to the statues with "‹ Statues", with Esc or with its own button.
     It has no box: the frame's black is already its screen's. */
  // The arrow of "‹ Statues", drawn like the cross of "Close": the serif's "‹" comes out tiny.
  const TABLET_BACK = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 L3.5 6 L8 10.5"/></svg>';
  function tabletHtml() {
    const rowEl = (id) => {
      const s = HG.STATUE_BY_ID[id], d = HG.tabletMark(marks, id);
      const markIcon = d ? `<img class="tablet-mark m-${d}" src="assets/hall/badge-${d}.png" alt="" width="36" height="36">` : '<span class="tablet-mark is-empty"></span>';
      return `<li class="tablet-row">${markIcon}<span class="tablet-name">${esc(s.tablet ? pick(s.tablet) : statueName(s))}</span>`
        + `<span class="sr-only"> · ${esc(d ? t(DIFF_KEY[d]) : t('hallNoMarks'))}</span></li>`;
    };
    return `<section class="tablet" aria-labelledby="tablet-title">
      <div class="tablet-bar"><button type="button" class="tablet-back" data-act="tabletClose">${TABLET_BACK}${esc(t('hallStatues'))}</button></div>
      <div class="tablet-page">
        <img class="tablet-hdr" src="assets/hall/tablet-hdr.png" alt="" width="862" height="111">
        <h3 class="tablet-title" id="tablet-title" tabindex="-1">${esc(t('fightTabHall'))}</h3>
        <ol class="tablet-list">${HG.TABLET.map(rowEl).join('')}</ol>
        <img class="tablet-ftr" src="assets/hall/tablet-ftr.png" alt="" width="520" height="70">
      </div>
    </section>`;
  }

  /* In front of the statue: the usual arena, with the chosen difficulty. On winning it says
     whether the symbol is new; on falling, as in the game, you go back to the statue. */
  function hallFightHtml() {
    const s = HG.STATUE_BY_ID[prefs.hallId], d = prefs.hallDiff;
    const acts = `<button type="button" class="btn btn-primary" data-act="fightReset">${esc(t('runAgain'))}</button>
      <button type="button" class="btn" data-act="hallBack">‹ ${esc(t('hallBack'))}</button>`;
    // Winning leaves no symbol: the Hall's are your real game's, and they're marked on the plaque.
    const ending = fight.over && alive()
      ? fightEndHtml({ won: true, cls: 'hall-done', title: t('fightWon'), acts, note: wonNote(foe()) })
      : !alive() ? fightEndHtml({ won: false, cls: 'hall-done', title: t('fightDead'), note: t('hallDied', dealtOf(foe())), acts }) : '';
    return `<div class="run-head hall-head">
        <h3>${esc(statueName(s))}</h3>
        <span class="fighter-phase hall-diff">${hallBadge(d, hasMark(s.id, d))}${esc(t(DIFF_KEY[d]))}</span>
        <span class="hall-head-acts">
          <button type="button" class="btn" data-act="fightReset" title="${esc(t('fightResetHint'))}">${esc(t('fightReset'))}</button>
          <button type="button" class="btn" data-act="hallBack">‹ ${esc(t('hallBack'))}</button>
        </span>
      </div>
      ${arenaHtml(ending)}`;
  }

  /* ── Pantheons ─────────────────────────────────────────────────────────
     A real run: health, lifeblood and soul carry from one room to the next, and the rests
     are the only thing that heals. At each rest you decide what to do and in what order,
     because the order matters: the bench wipes the Cocoon's lifeblood (and restores the
     Cocoon), so breaking it before sitting down wastes it.
     What's known about each rest comes from the wiki: the hot springs give 40 soul per
     second and refill the masks; the bench restores all health and the charms' lifeblood,
     wipes the cocoon's, puts the cocoon back and lets you change charms; the cocoon releases
     3, 4 or 5 lifeblood germs depending on the bindings completed (8, 12, 16).
     The bench doesn't restore soul. */
  const BINDS = PN.BINDS;
  const COCOONS = [0, ...PN.DOOR_STEPS.map(([, n]) => n).reverse()];   // what the cocoon can give
  const freshRest = () => ({ sat: false, cocoonTaken: false });
  const saveRun = () => save(KEY.run, run ? JSON.stringify(run) : null);
  /* Sitting on the bench: all health and the charms' lifeblood (Joni's Blessing's apart),
     Baldur Shell repaired and Grubberfly's Elegy back on under Joni's Blessing. The bench
     doesn't restore soul. */
  function runRefill() {
    const s = runSheet.stats, joni = runSheet.joniLifeblood || 0;
    run.masks = s['health.masks'].value; run.lbJoni = joni; run.lbCharm = s['health.lifeblood'].value - joni;
    run.shell = s['health.baldurBlocks'].value || 0; run.elegyHalted = false;
  }
  // The build changes and the caps drop: whatever's over is trimmed.
  function runClamp() {
    const s = runSheet.stats, joni = runSheet.joniLifeblood || 0;
    run.masks = Math.min(run.masks, s['health.masks'].value); run.lbJoni = Math.min(run.lbJoni || 0, joni);
    run.lbCharm = Math.min(run.lbCharm, s['health.lifeblood'].value - joni);
    run.shell = Math.min(run.shell || 0, s['health.baldurBlocks'].value || 0);
  }
  // What you take from the fight to the next room.
  function runCarry() {
    run.masks = fight.masks; run.lbJoni = fight.lbJoni; run.lbCharm = fight.lbCharm; run.lbCocoon = fight.lbCocoon;
    run.soul = fight.soul; run.shell = fight.shell; run.elegyHalted = fight.elegyHalted;
  }
  const runLog = (msg) => { run.log.unshift(msg); if (run.log.length > 9) run.log.pop(); };

  function loadRun() {
    try {
      const r = JSON.parse(load(KEY.run) || 'null');
      if (!r || !PN.PANTHEON_BY_ID[r.pantheon]) return null;
      const rooms = PN.PANTHEON_BY_ID[r.pantheon].rooms;
      if (!Number.isInteger(r.room) || r.room < 0 || r.room > rooms.length) return null;
      r.build = C.normalize(r.build || {});
      r.bindings = Object.fromEntries(BINDS.map((k) => [k, !!(r.bindings || {})[k]]));
      if (!COCOONS.includes(r.cocoon)) r.cocoon = 0;
      for (const k of ['masks', 'lbJoni', 'lbCharm', 'lbCocoon', 'soul', 'shell']) r[k] = Math.max(0, Number(r[k]) || 0);
      r.elegyHalted = !!r.elegyHalted;
      r.rest = { ...freshRest(), ...(r.rest || {}) };
      r.log = Array.isArray(r.log) ? r.log.slice(0, 9) : [];
      if (!['won', 'dead'].includes(r.over)) r.over = null;
      // The rooms really cleared. A run saved before skipping was possible didn't
      // carry them: back then they were all the rooms before the current one.
      r.cleared = Array.isArray(r.cleared)
        ? [...new Set(r.cleared.filter((i) => Number.isInteger(i) && i >= 0 && i < rooms.length))]
        : Array.from({ length: Math.min(r.room, rooms.length) }, (_, i) => i);
      return r;
    } catch (e) { return null; }
  }

  /* On entering a pantheon the masks fill and the cocoon's lifeblood is lost
     (wiki, "Pantheons"). The build is frozen with health topped up. */
  function startRun() {
    const bindings = { ...prefs.bindings };
    const build = C.normalize({ ...state, hp: 0 });
    runSheet = E.compute(build, prefs.lang, { bindings });
    const s = runSheet.stats;
    run = { pantheon: prefs.pantheon, bindings, cocoon: PN.cocoonOf(door), build, room: 0, over: null,
            masks: s['health.masks'].value, lbJoni: runSheet.joniLifeblood || 0,
            lbCharm: s['health.lifeblood'].value - (runSheet.joniLifeblood || 0), lbCocoon: 0,
            shell: s['health.baldurBlocks'].value || 0, elegyHalted: false,
            soul: Math.min(s['soul.main'].value, s['soul.total'].value), rest: freshRest(), log: [],
            cleared: [] };
    runLog(t('logEnter', { name: pick(PN.PANTHEON_BY_ID[run.pantheon].name) }));
    enterRoom();
  }

  function enterRoom() {
    run.rest = freshRest();
    if (runFight()) fightReset();
    else { fight.over = false; fight.started = false; fight.log = []; }
    saveRun();
  }

  function runNext() {
    if (runFight()) {
      if (!fight.over) return;
      runCarry();
    }
    if (!run.cleared.includes(run.room)) run.cleared.push(run.room);
    run.room += 1;
    if (run.room >= runRooms().length) { run.over = 'won'; endFresh = true; saveRun(); return; }
    enterRoom();
  }

  /* Go straight to a room by tapping its tile. You take whatever you have at that moment
     —also halfway through a fight, which is abandoned—, and what you skip does NOT count as
     cleared: the timeline marks it apart and the ending says how many rooms you skipped. */
  function runJump(i) {
    if (!run || run.over || i === run.room || i < 0 || i >= runRooms().length) return;
    if (runFight()) runCarry();
    runLog(t('logJump', { from: run.room + 1, to: i + 1 }));
    run.room = i;
    enterRoom();
  }

  function renderPantheon(head) {
    if (!run) return pantheonPickHtml(head);
    return `<div class="fight-body">${brackets}${head}${runHeadHtml()}${timelineHtml()}${run.over ? runEndHtml() : roomHtml()}</div>`;
  }

  function pantheonPickHtml(head) {
    const cards = PN.PANTHEONS.map((p) => {
      const lastFoe = F.FOE_BY_ID[p.rooms[p.rooms.length - 1].foe];
      const on = prefs.pantheon === p.id;
      // Below, the bindings you've finished it with in your game: the door's notches.
      const boundDone = door.done[p.id] || [], allDone = door.all.includes(p.id), pantheonName = pick(p.name);
      const bindBtns = `<div class="pdone ${allDone ? 'is-all' : ''}" role="group" aria-label="${esc(t('doorDoneLbl', { name: pantheonName }))}">
        ${BINDS.map((k) => `<button type="button" class="pdone-bind ${boundDone.includes(k) ? 'is-on' : ''}" data-act="doorBind" data-value="${p.id}:${k}"
          aria-pressed="${boundDone.includes(k)}" title="${esc(t('bind_' + k))}"><img src="assets/pantheon/bind-${k}.png" alt="${esc(t('bind_' + k))}" width="22" height="22"></button>`).join('')}
        <button type="button" class="pdone-all ${allDone ? 'is-on' : ''}" data-act="doorBind" data-value="${p.id}:all" aria-pressed="${allDone}"
          title="${esc(t('doorAllTip'))}" aria-label="${esc(t('doorAllTip'))}">×4</button>
      </div>`;
      return `<div class="pcard-wrap"><button type="button" class="pcard ${on ? 'is-on' : ''}" data-act="pantheonPick" data-value="${p.id}" aria-pressed="${on}">
        <img class="pcard-art" src="${D.art('enemies', lastFoe.id)}" alt="" loading="lazy">
        <span class="pcard-body">
          <span class="pcard-name">${esc(pick(p.name))}</span>
          <span class="pcard-motto">${esc(pick(p.motto))}</span>
          <span class="pcard-meta">${esc(t('runRooms', { n: p.rooms.length }))} · ${esc(pick(lastFoe.name))}</span>
        </span>
      </button>${bindBtns}</div>`;
    }).join('');
    const binds = BINDS.map((k) => {
      const on = !!prefs.bindings[k];
      return `<button type="button" class="bind ${on ? 'is-on' : ''}" data-act="bindToggle" data-value="${k}" aria-pressed="${on}">
        <img class="bind-art" src="assets/pantheon/bind-${k}.png" alt="" width="40" height="40">
        <span class="bind-name">${esc(t('bind_' + k))}</span>
        <span class="bind-note">${esc(t('bindNote_' + k))}</span>
      </button>`;
    }).join('');
    return `<div class="fight-body">${brackets}${head}
      <div class="block-head">${esc(t('pantheonPick'))}<span class="quick-hint">${esc(t('doorDoneHint'))}</span></div>
      <div class="pcards">${cards}</div>
      <div class="block-head">${esc(t('bindingsLabel'))}</div>
      <div class="binds ${BINDS.every((k) => prefs.bindings[k]) ? 'is-all' : ''}">${binds}</div>
      <div class="block-head">${esc(t('cocoonLabel'))}</div>
      ${doorHtml()}
      <div class="run-go"><button type="button" class="btn btn-primary" data-act="runStart">${esc(t('runEnter'))}</button></div>
    </div>`;
  }

  /* The lifeblood door, as in Godhome: its 20 notches (the 8, 12 and 16 ones larger), lit
     in blue according to your completed bindings; with 8, open, and the benches' cocoon
     with its lifeblood masks. */
  function doorHtml() {
    const n = PN.doorNotches(door), isOpen = PN.doorOpen(door), germs = PN.cocoonOf(door), nextStep = PN.nextStep(n);
    const majorNotches = PN.DOOR_STEPS.map(([at]) => at);
    const doorNotches = Array.from({ length: PN.DOOR_NOTCHES }, (_, i) =>
      `<i class="dn ${i < n ? 'is-lit' : ''} ${majorNotches.includes(i + 1) ? 'is-major' : ''}"></i>`).join('');
    const doorLine = isOpen ? t('doorOpenLine', { n, max: PN.DOOR_NOTCHES })
      : t(PN.DOOR_OPEN - n === 1 ? 'doorShutOne' : 'doorShut', { n, max: PN.DOOR_NOTCHES, left: PN.DOOR_OPEN - n });
    const cocoonHtml = germs ? `<div class="door-cocoon">
        <img class="door-cocoon-art" src="assets/pantheon/rest-cocoon.png" alt="" width="560" height="315">
        <div class="door-cocoon-body">
          <span class="door-seeds" aria-hidden="true">${'<img src="assets/hud/mask-lb.png" alt="">'.repeat(germs)}</span>
          <p>${esc(t('doorSeeds', { n: germs }))}${nextStep ? ' ' + esc(t('doorNext', { at: nextStep.at, n: nextStep.seeds })) : ''}</p>
        </div>
      </div>` : '';
    return `<div class="door">
        <div class="door-notches" role="img" aria-label="${esc(doorLine)}">${doorNotches}</div>
        <p class="door-state">${esc(doorLine)}</p>
        ${cocoonHtml}
        <p class="foecard-note">${esc(t('doorHelp'))}</p>
      </div>`;
  }

  function runHeadHtml() {
    const p = PN.PANTHEON_BY_ID[run.pantheon];
    const binds = BINDS.filter((k) => run.bindings[k]);
    return `<div class="run-head">
      <h3>${esc(pick(p.name))}</h3>
      <span class="fighter-phase">${esc(t('runRoom', { n: Math.min(run.room + 1, p.rooms.length), total: p.rooms.length }))}</span>
      ${binds.length ? `<span class="run-binds ${binds.length === BINDS.length ? 'is-all' : ''}">${binds.map((k) => `<img src="assets/pantheon/bind-${k}.png" alt="${esc(t('bind_' + k))}" title="${esc(t('bind_' + k))}" width="24" height="24">`).join('')}</span>` : ''}
      <button type="button" class="btn" data-act="runQuit">${esc(run.over ? t('runExit') : t('runQuit'))}</button>
    </div>`;
  }

  /* The timeline: one tile per room. Cleared ones dimmed and with ✔, skipped ones with a dash,
     the current one with the accent, the one you fell in red; the rest, off. While the
     run goes on, each tile is a button that takes you to that room. */
  function timelineHtml() {
    const clearedSet = new Set(run.cleared);
    const tiles = runRooms().map((r, i) => {
      const isCurrent = i === run.room && !run.over;
      const tileState = clearedSet.has(i) ? 'is-done'
        : i === run.room && run.over === 'dead' ? 'is-fail'
        : isCurrent ? 'is-current'
        : i < run.room || run.over === 'won' ? 'is-skipped' : 'is-todo';
      let img, name;
      if (r.type === 'fight') {
        const f = F.FOE_BY_ID[r.foe];
        img = D.art('enemies', f.id);
        name = pick(f.name) + (r.count ? ' ×' + r.count : '');
      } else if (r.type === 'rest') {
        img = 'assets/pantheon/bench.png'; name = t('restTitle');
      } else {
        img = 'assets/pantheon/godseeker.png'; name = t('godseeker') + (r.who ? ' (' + pick(r.who) + ')' : '');
      }
      const text = (i + 1) + '. ' + name + (r.note ? ' · ' + pick(r.note) : '')
        + (tileState === 'is-skipped' ? ' · ' + t('runSkippedMark') : '');
      const tileInner = `<span class="tl-n">${i + 1}</span>
        <img class="tl-art" src="${img}" alt="" loading="lazy">
        ${r.count ? `<span class="tl-count">×${r.count}</span>` : ''}
        <span class="sr-only">${esc(text)}</span>`;
      // You can go to any room except the one you're in, and only with the run alive.
      const jumpable = !run.over && !isCurrent;
      return `<li class="tl tl-${r.type} ${tileState}" ${isCurrent ? 'aria-current="step"' : ''}>
        ${jumpable
          ? `<button type="button" class="tl-go" data-act="runJump" data-value="${i}" title="${esc(t('runJumpTo', { room: text }))}">${tileInner}</button>`
          : `<span class="tl-go" title="${esc(text)}">${tileInner}</span>`}
      </li>`;
    }).join('');
    return `<ol class="timeline" aria-label="${esc(t('runTimeline'))}">${tiles}</ol>
      ${run.over ? '' : `<p class="timeline-hint">${esc(t('runJumpHint'))}</p>`}`;
  }

  function roomHtml() {
    const r = runRoom();
    if (r.type === 'rest') return restHtml();
    if (r.type === 'godseeker') return godseekerHtml(r);
    const next = fight.over
      ? fightEndHtml({ won: true, cls: 'room-done', title: t('runWonRoom'), note: wonNote(foe()),
          acts: `<button type="button" class="btn btn-primary" data-act="runNext">${esc(run.room + 1 >= runRooms().length ? t('runFinish') : t('runNext'))}</button>` })
      : '';
    return `${r.note ? `<p class="foecard-note is-warn">${esc(pick(r.note))}</p>` : ''}${arenaHtml(next)}`;
  }

  /* The rest: one card per station, with its corner of the room (crops of the wiki's
     screenshots) and what it would give you NOW, with the HUD icons. That way you can see
     without reading that the bench gives no soul, or that sitting down with cocoon lifeblood
     takes it away. The whole card is its action's button, because you decide the order. */
  function restHtml() {
    const rs = run.rest, s = runSheet.stats;
    const sprite = { mask: 'mask', lb: 'mask-lb', soul: 'soul' };
    const fx = (k, n, unit, loss) => `<span class="rs-fx${loss ? ' is-loss' : ''}">
        <span class="rs-ico is-${k}"><img src="${D.art('hud', sprite[k])}" alt=""></span><b>${loss ? '−' : '+'}${n}</b> ${esc(unit)}</span>`;
    const note = (text) => `<span class="rs-fx is-note">${esc(text)}</span>`;
    const station = (id, art, name, effects, rule, why) => `<button type="button" class="rest-station" data-act="${id}" ${why ? 'disabled' : ''}>
        <span class="rs-art"><img src="assets/pantheon/rest-${art}.png" alt="" width="560" height="315"></span>
        <span class="rs-body">
          <span class="rs-name">${esc(name)}</span>
          <span class="rs-fxs">${why ? note(why) : effects.filter(Boolean).join('') || note(t('restFull'))}</span>
          ${why ? '' : `<span class="rs-rule">${esc(rule)}</span>`}
        </span></button>`;
    const dMasks = s['health.masks'].value - run.masks;
    const dSoul = s['soul.total'].value - run.soul;
    const dLb = s['health.lifeblood'].value - run.lbCharm;
    const masks = dMasks > 0 && fx('mask', dMasks, t(dMasks === 1 ? 'maskUnitOne' : 'maskUnit'));
    const cocoonWhy = !run.cocoon ? t('restCocoonNone') : rs.cocoonTaken ? t('restCocoonTaken') : '';
    // The bench's grid is the page's: the same selection, the same action. A
    // charm equipped here shows as equipped on the sheet and in combat. Only the
    // Charms binding locks it, because then the pantheon doesn't let you wear any.
    const locked = run.bindings.charms ? t('restCharmsBound') : '';
    const ctx = { ...pageCharms(), locked,
      hint: locked || t('restCharmsHint', { screen: t('navCharms') }) };
    return `<div class="arena">
      <div class="side-knight">${knightSide(runSheet, run, false, 'run')}</div>
      <div class="side-foes rest-room">
        <div class="foes-head"><h3>${esc(t('restTitle'))}</h3><span class="foes-total">${esc(t('restHelp'))}</span></div>
        <div class="rest-stations">
          ${station('restBath', 'spring', t('restBath'),
            [masks, dSoul > 0 && fx('soul', dSoul, t('restUnitSoul'))], t('restBathNote'))}
          ${station('restSit', 'bench', t('restSit'),
            [masks, dLb > 0 && fx('lb', dLb, t('lifebloodLower')),
             run.lbCocoon > 0 && fx('lb', run.lbCocoon, t('restUnitCocoon'), true),
             run.cocoon && rs.cocoonTaken && note(t('restRespawn'))], t('restSitNote'))}
          ${station('restCocoon', 'cocoon', t('restCocoon'),
            [fx('lb', run.cocoon, t('lifebloodLower'))], t('restCocoonNote'), cocoonWhy)}
        </div>
        <div class="run-go"><button type="button" class="btn btn-primary" data-act="runNext">${esc(t('restGo'))}</button></div>
      </div>
    </div>
    <div class="sep-wrap loadout-wrap rest-charms">${renderLoadout(ctx)}${renderQuickCharms(ctx)}</div>
    ${logHtml(run.log)}`;
  }

  function godseekerHtml(r) {
    return `<div class="arena">
      <div class="side-knight">${knightSide(runSheet, run, false, 'run')}</div>
      <div class="side-foes">
        <div class="foecard"><div class="foecard-head">
          <img class="foecard-art" src="assets/pantheon/godseeker.png" alt="" loading="lazy">
          <span class="foecard-body"><span class="foecard-name">${esc(t('godseeker'))}${r.who ? ' · ' + esc(pick(r.who)) : ''}</span>
            <span class="foecard-note">${esc(t('godseekerNote'))}</span></span>
        </div></div>
        <div class="run-go"><button type="button" class="btn btn-primary" data-act="runNext">${esc(t('restGo'))}</button></div>
      </div>
    </div>
    ${logHtml(run.log)}`;
  }

  function runEndHtml() {
    const rooms = runRooms();
    const won = run.over === 'won';
    const r = rooms[run.room];
    const who = r && r.type === 'fight' ? pick(F.FOE_BY_ID[r.foe].name) : '';
    const pantheonName = pick(PN.PANTHEON_BY_ID[run.pantheon].name);
    // Finishing by skipping rooms isn't completing it: it says how many.
    const skipped = rooms.length - new Set(run.cleared).size;
    const acts = `<button type="button" class="btn btn-primary" data-act="runAgain">${esc(t('runAgain'))}</button>
        <button type="button" class="btn" data-act="runQuit">${esc(t('runExit'))}</button>`;
    const ending = !won
      ? { title: t('fightDead'), note: t('runDied', { n: run.room + 1, total: rooms.length, foe: who }) }
      : skipped ? { title: t('runWonSkipped'), note: t('runSkippedNote', { name: pantheonName, n: skipped }) }
      : { title: t('runWon'), note: pantheonName };
    return `${fightEndHtml({ won, cls: 'run-end', acts, ...ending })}
    ${fight.log.length ? logHtml(fight.log) : ''}`;
  }

  /* ── General render ──────────────────────────────────────────────────── */
  /* Focus goes back to the same control after repainting. A charm appears in Equipped and in
     the grid with the same data-act and id (and again at the pantheon's bench): it's looked for
     first in the same place, or when equipping from the grid focus would jump to Equipped. */
  let refocusing = false;           // focus is restored by the repaint, not moved by the person
  function restoreFocus(desc) {
    if (!desc) return;
    const node = (desc.scoped && document.querySelector(desc.scoped)) || document.querySelector(desc.sel);
    if (!node) return;
    refocusing = true;
    node.focus({ preventScroll: true });
    refocusing = false;
  }
  function focusDescriptor() {
    const node = document.activeElement;
    if (!node || !node.dataset || !node.dataset.act) return null;
    const parts = [`[data-act="${node.dataset.act}"]`];
    for (const k of ['id', 'key', 'value', 'delta']) if (node.dataset[k] !== undefined) parts.push(`[data-${k}="${node.dataset[k]}"]`);
    const sel = parts.join('');
    const where = ['.rest-charms', '#panel'].find((x) => node.closest(x));
    const box = ['.quick-grid', '.eq-row'].find((x) => node.closest(x));
    return { sel, scoped: where && box ? `${where} ${box} ${sel}` : '' };
  }

  function render() {
    const focus = focusDescriptor();
    renderMasthead();
    renderColophon();
    renderNav();                           // with your game's Journal button
    renderGuide();
    renderBanner();
    renderPanel();
    renderMiniHud();
    renderGear();
    renderFight();
    if (prefs.view === 'journal') { if (hjSec.querySelector('.hj-list')) paintHunter(); else renderHunter(); }
    showScreen();
    hjFit();
    // On entering the Journal, the entry you're reading shows in its list (already visible, so it can be measured).
    if (hjEnter && prefs.view === 'journal') { hjEnter = false; hjScroll(true); }
    restoreFocus(focus);
    if (detailHover) highlightRows(detailHover);
    if (previewId) paintPreview();
  }

  /* ── Switching screens ───────────────────────────────────────────────── */
  function setView(v) {
    const was = prefs.view;
    prefs.view = VIEWS.includes(v) ? v : 'charms';
    savePrefs();
    // The tablet is a view of the Hall, not a preference: whoever comes back, comes back to the statues.
    if (prefs.view !== was) hallTablet = false;
    if (prefs.view === 'journal' && was !== 'journal') hjEnter = true;
    // Entering combat does what opening it used to: the fight, ready, and with no enemy the
    // Journal open, which is where you start.
    if (prefs.view === 'fight' && was !== 'fight') {
      if (!fight.started) fightReset();
      if (prefs.fightTab === 'combat' && !prefs.foeId) openJournal();
    }
  }
  /* Leaves a history entry and scrolls up to the top of the screen, which sits just below the
     bar. If you arrive from inside another screen (the pantheon notice, the guide), focus goes
     to its title: the control that had it is no longer visible. */
  function go(v, focusHead) {
    const changed = v !== prefs.view;
    setView(v);
    writeUrl(changed);
    render();
    if (changed) {
      const start = el.masthead.offsetTop + el.masthead.offsetHeight;   // where the bar stays stuck
      if (scrollY > start) scrollTo(0, start);
    }
    if (focusHead) {
      const h = screenOf(prefs.view).querySelector('.screen-title');
      if (h) h.focus({ preventScroll: true });
    }
  }
  const screenOf = (v) => (v === 'game' ? el.gear : v === 'fight' ? el.fight : v === 'journal' ? el.hj : el.panel);
  // Is the sticky bar covering it? Then you have to scroll up to it.
  const underNav = (node) => node.getBoundingClientRect().top < el.nav.getBoundingClientRect().bottom;

  let toastTimer = 0;
  function toast(msg) {
    // Visible before writing: a hidden live region isn't announced when it changes.
    el.toast.hidden = false;
    el.toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2400);
  }

  /* ── Actions ─────────────────────────────────────────────────────────── */
  // Returns whether it was applied: if not, the reason shows in a notice.
  function doCharm(id) {
    const lock = charmLock();
    if (lock) { toast(lock); return false; }
    const a = C.charmAction(state, id);
    // One you haven't found can be looked at but not equipped: the detail says why. Removing it, yes.
    if (a.action !== 'unequip' && !isOwned(id)) return false;
    if (a.action === 'unequip' && isFixed(id)) return false;      // Void Heart: the detail says so
    if (a.action === 'blocked') { toast(pick(a.reason)); return false; }
    const done = commit(C.toggleCharm(state, id));
    if (done && a.overcharm && a.action !== 'unequip') toast(t('toastOvercharm'));
    return done;
  }

  const actions = {
    /* The grid and the equipped ones equip or remove directly, with mouse and finger: that's what
       they're for. On the sheet, what's touched goes to the detail, which tells what changed or,
       if it couldn't, why. */
    quick(node) {
      const id = node.dataset.id;
      if (node.closest('#panel')) detailSel = id;
      previewId = '';                      // once clicked, the figure flashes: the preview isn't needed
      if (!doCharm(id)) paintDetail();
    },
    // "and N more in the full sheet": opens it at the rows that don't fit in the detail.
    detailMore(node) {
      const imp = impact(node.dataset.id);
      if (!prefs.detailOpen) { prefs.detailOpen = true; savePrefs(); render(); }
      highlightRows(node.dataset.id);
      const first = imp.changes[DETAIL_ROWS - 1];
      const row = first && el.panel.querySelector(`.stat[data-id="${first.id}"]`);
      if (row) row.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'center' });
    },
    clear() { if (state.charms.length) commit(C.normalize({ ...state, charms: [] })); },
    'guide-dismiss'() { prefs.guideSeen = true; savePrefs(); render(); },
    detail(node) {
      prefs.detailOpen = !prefs.detailOpen;
      savePrefs();
      render();
      // Closed from below, the sheet shrinks above you: back to its button, the one that remains.
      if (!prefs.detailOpen && node.dataset.value === 'bottom') {
        const b = el.panel.querySelector('[data-act="detail"]');
        if (!b) return;
        b.focus({ preventScroll: true });
        const r = b.getBoundingClientRect();
        if (underNav(b) || r.bottom > innerHeight) b.scrollIntoView({ block: 'center' });
      }
    },
    lang(node) {
      const next = node.dataset.value;
      if (next === prefs.lang) return;
      prefs.lang = I.setLang(next);
      prefs.langChosen = true;
      savePrefs();
      rebuildNF();
      persist();
      recompute();
      render();
    },
    example(node) {
      const ex = EXAMPLES.find((x) => x.id === node.dataset.value);
      if (!ex) return;
      const next = C.normalize({ ...C.PRESETS.max, charms: ex.charms, hp: ex.hp });
      if (commit(next)) toast(t(ex.desc));
    },
    kpi(node) {
      const id = node.dataset.id;
      if (!prefs.detailOpen) { prefs.detailOpen = true; savePrefs(); render(); }
      const row = el.panel.querySelector(`.stat[data-id="${id}"]`);
      if (!row) return;
      if (!prefs.open.includes(id)) { prefs.open.push(id); savePrefs(); row.classList.add('is-open'); row.setAttribute('aria-expanded', 'true'); }
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
    },
    step(node) {
      const key = node.dataset.key, d = Number(node.dataset.delta);
      commit(C.set(state, key, state[key] + d));
    },
    seg(node) {
      const key = node.dataset.key;
      commit(C.set(state, key, Number(node.dataset.value)));
    },
    own(node) {
      const id = node.dataset.id;
      setOwned(owned.includes(id) ? owned.filter((x) => x !== id) : [...owned, id]);
    },
    ownPick(node) { setOwned(C.ownSet(owned, node.dataset.value, node.dataset.token || null)); },
    ownAll(node) { setOwned(node.dataset.value === '1' ? C.OWN_MAX : []); },
    art(node) {
      const k = node.dataset.key;
      commit(C.set(state, 'arts.' + k, !state.arts[k]));
    },
    hp(node) {
      const value = Number(node.dataset.value);
      commit(C.set(state, 'hp', value));
    },
    // The sheet's soul: it's only for show, it changes no figure (renderStatus).
    soulOrb() {
      settleSoul();
      const { total, mainMax, cost, now } = soulLevels();
      if (now < cost) { soulSpent = 0; render(); return; }      // not enough for another: it fills
      soulSpent = total - (now - cost);
      // With soul in the vessels, the orb drops and they refill it right away, as in the game.
      if (now > mainMax && !calm.matches) {
        soulDrain = mainMax - cost;
        soulTimer = setTimeout(() => { soulTimer = 0; soulDrain = null; render(); }, SOUL_REFILL_MS);
      }
      render();
    },
    soulVessel(node) {
      settleSoul();
      const { total, mainMax, now } = soulLevels();
      const i = Number(node.dataset.value), size = D.SOUL.vesselSize;
      const full = now - mainMax - size * i >= size;
      // Full: it empties along with the ones to its right. Empty or half-full: it fills, and with it everything before.
      soulSpent = total - Math.min(total, mainMax + size * (full ? i : i + 1));
      render();
    },
    compare(node) { prefs.compare = node.dataset.value; savePrefs(); recompute(); render(); },
    pin() { baseline = C.normalize(state); save(KEY.baseline, C.encode(baseline)); prefs.compare = 'pinned'; savePrefs(); recompute(); render(); toast(t('toastPinned')); },
    unpin() { baseline = null; save(KEY.baseline, null); if (prefs.compare === 'pinned') prefs.compare = 'base'; savePrefs(); recompute(); render(); },
    /* No notice: what each one does is said by its title, and the change shows on screen. The
       charms found go with them: a new game has none, and everything maxed out, all of
       them. */
    preset(node) {
      const max = node.dataset.value === 'max';
      const next = max ? C.normalize({ ...C.PRESETS.max, charms: state.charms, hp: state.hp }) : C.normalize(C.PRESETS.base);
      const was = owned;
      owned = max ? C.OWN_MAX.slice() : [];   // before commit(), so its repaint already carries it
      if (commit(next)) saveOwned(); else { owned = was; render(); }
    },
    // The link carries the build and the language, not the screen.
    share() {
      persist();
      const url = location.href.split('#')[0] + hashFor('');
      const done = () => toast(t('linkCopied'));
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => prompt(t('copyThis'), url));
      else prompt(t('copyThis'), url);
    },
    // From another screen (the notice, the guide), focus goes to the new one's title; from the bar or
    // the site's title, it stays on the link pressed.
    view(node) { go(node.dataset.value, !node.closest('#nav, .masthead')); },
    /* With no enemy the Journal stays open: it's the only place to pick another. */
    foeClear() {
      prefs.foeId = '';
      pickerQuery = '';
      savePrefs();
      fightReset();
      openJournal();
      render();
      const b = el.fight.querySelector('.jr-toggle');
      if (b) b.focus();
    },
    picker() {
      if (pickerOpen) { pickerOpen = false; pickerQuery = ''; } else openJournal();
      render();
      // Not with a finger: opening the keyboard would cover half the list before it's read.
      if (pickerOpen && hoverable.matches) {
        const inp = el.fight.querySelector('.jr-search');
        if (inp) inp.focus();
      }
    },
    /* Fight the row tapped (or the one being read, with Enter). If it already was the enemy, the
       Journal just closes: picking it again has no reason to throw away a half-done fight. */
    foe(node) {
      const id = node.dataset.id;
      const isNewFoe = id !== prefs.foeId;
      prefs.foeId = id;
      pickerOpen = false;
      pickerQuery = '';
      savePrefs();
      if (isNewFoe) fightReset();
      render();
      const b = el.fight.querySelector('.jr-toggle');   // focus goes back to the button, it isn't lost
      if (b) b.focus();
    },
    /* The filter only changes what shows: the chosen enemy stays chosen. */
    foeKind(node) {
      const kind = node.dataset.value;
      if (prefs.foeKind === kind) return;
      prefs.foeKind = kind;
      savePrefs();
      jrKeepCursor();
      paintJournal();
      jrScroll(true);
    },
    fightReset() { fightReset(); render(); },
    fightTab(node) {
      prefs.fightTab = node.dataset.value;
      pickerOpen = false;
      hallTablet = false;
      if (prefs.fightTab === 'combat' && !prefs.foeId) openJournal();
      savePrefs();
      fightReset();
      render();
    },
    /* Hall of Gods. Choosing a statue only reads it on the plaque; fighting is each difficulty's
       button. On mobile the plaque replaces the grid, and the page scrolls up to it. */
    hallPick(node) {
      const id = node.dataset.id;
      if (!HG.STATUE_BY_ID[id]) return;
      prefs.hallId = id;
      hallReading = true;
      hallTablet = false;
      savePrefs();
      render();
      const plaque = el.fight.querySelector('.hall-plaque');
      if (jrNarrow.matches) {
        if (plaque && underNav(plaque)) plaque.scrollIntoView({ block: 'start' });
      } else {
        const b = el.fight.querySelector(`.ped-btn[data-id="${id}"]`);
        if (b) b.focus();
      }
    },
    hallList() {
      hallReading = false;
      render();
      const b = el.fight.querySelector(`.ped-btn[data-id="${prefs.hallId}"]`);
      if (b) { b.scrollIntoView({ block: 'nearest' }); b.focus(); }
    },
    hallFight(node) {
      const d = node.dataset.value;
      if (!HG.DIFFS.includes(d)) return;
      prefs.hallDiff = d;
      hallTablet = false;               // on returning from the fight, to the plaque
      savePrefs();
      fightReset();
      render();
      if (underNav(el.fight)) el.fight.scrollIntoView({ block: 'start' });
      const b = el.fight.querySelector('.hall-head [data-act="hallBack"]');
      if (b) b.focus({ preventScroll: true });
    },
    /* Mark or remove a difficulty's symbol by hand: it's your real game, not the simulator. */
    hallMark(node) {
      const d = node.dataset.value;
      marks = HG.toggleMark(marks, prefs.hallId, d);
      hallUndo = null;
      saveMarks();
      render();
      const b = el.fight.querySelector(`.hall-mark[data-value="${d}"]`);
      if (b) b.focus({ preventScroll: true });
    },
    hallBulk() {
      hallBulk = !hallBulk;
      render();
      const b = el.fight.querySelector('[data-act="hallBulk"]');
      if (b) b.focus({ preventScroll: true });
    },
    /* One symbol on all 44 at once. The pressed button dims (it would no longer change anything), so
       focus moves to "Undo". */
    hallMarkAll(node) {
      const d = node.dataset.value, on = node.dataset.on === '1';
      if (!HG.DIFFS.includes(d)) return;
      const n = HG.STATUES.filter((s) => hasMark(s.id, d) !== on).length;
      if (!n) return;
      hallUndo = { prev: marks, d, on, n };
      marks = HG.markAll(marks, d, on);
      saveMarks();
      render();
      const b = el.fight.querySelector('[data-act="hallUndo"]');
      if (b) b.focus({ preventScroll: true });
    },
    hallUndo() {
      if (!hallUndo) return;
      const { prev, d, on } = hallUndo;
      marks = prev;
      hallUndo = null;
      saveMarks();
      render();
      const b = el.fight.querySelector(`[data-act="hallMarkAll"][data-value="${d}"][data-on="${on ? 1 : 0}"]`);
      if (b) b.focus({ preventScroll: true });
    },
    /* The entrance tablet, in place of the grid and the plaque. Its button, next to the Idol,
       opens and closes it; inside, "‹ Statues" (or Esc) goes back to the grid. */
    tablet() { if (hallTablet) actions.tabletClose(); else actions.tabletOpen(); },
    tabletOpen() {
      hallTablet = true;
      hallReading = false;              // back to the grid: on mobile, not to the plaque that was being read
      render();
      const tab = el.fight.querySelector('.tablet'), h = el.fight.querySelector('.tablet-title');
      if (!tab) return;
      /* Make it visible: if it isn't already fully in view, scroll up to it. If it fits under the bar
         (the four columns), whole; if not (two columns or one), from its top. */
      const r = tab.getBoundingClientRect();
      const fitsBelow = r.height <= innerHeight - el.nav.offsetHeight;
      if (underNav(tab) || r.bottom > innerHeight) tab.scrollIntoView({ block: fitsBelow ? 'nearest' : 'start' });
      // Focus goes to its title and not to "‹ Statues": it's read from the top and not left by accident.
      h.focus({ preventScroll: true });
    },
    tabletClose() {
      hallTablet = false;
      render();
      const b = el.fight.querySelector('.hall-tablet-btn');
      if (b) b.focus();
    },
    /* A difficulty's count filters the grid; tapping the active one turns it off. With the
       tablet open, it goes back to the grid: that's where the filter shows. */
    hallFilter(node) {
      const d = node.dataset.value;
      hallFilter = hallFilter === d || !HG.DIFFS.includes(d) ? '' : d;
      hallTablet = false;
      render();
      const b = el.fight.querySelector(`.hall-count-btn[data-value="${d}"]`);
      if (b) b.focus({ preventScroll: true });
    },
    /* Back to the statue: the fight is left, the plaque stays on the one it was on. */
    hallBack() {
      prefs.hallDiff = '';
      savePrefs();
      fightReset();
      render();
      const plaque = el.fight.querySelector('.hall-plaque');
      if (plaque && underNav(plaque)) plaque.scrollIntoView({ block: 'start' });
    },
    pantheonPick(node) { prefs.pantheon = node.dataset.value; savePrefs(); render(); },
    bindToggle(node) {
      const k = node.dataset.value;
      prefs.bindings[k] = !prefs.bindings[k];
      savePrefs(); render();
      if (prefs.bindings[k] && BINDS.every((x) => prefs.bindings[x])) bindAllFx();
    },
    // Your game: the bindings you finished each pantheon with.
    doorBind(node) {
      const [pid, k] = node.dataset.value.split(':');
      door = k === 'all' ? PN.toggleAll(door, pid) : PN.toggleBind(door, pid, k);
      saveDoor(); render();
    },
    runStart() { startRun(); render(); },
    runAgain() {
      // Same pantheon and same bindings as the attempt that just ended.
      prefs.pantheon = run.pantheon; prefs.bindings = { ...run.bindings };
      savePrefs(); startRun(); render();
    },
    runLockGo() {
      pickerOpen = false;
      // Combat is only rebuilt when switching tabs: if you were already in the room, the
      // half-done fight stays as it was.
      if (prefs.fightTab !== 'pantheon') { prefs.fightTab = 'pantheon'; fightReset(); }
      savePrefs();
      go('fight', true);
    },
    runQuit(node) {
      const name = run ? pick(PN.PANTHEON_BY_ID[run.pantheon].name) : '';
      const fromBanner = !!node.closest('#banner');
      run = null; runSheet = null; saveRun(); fightReset(); render();
      // From the notice, the button goes away with it: it says what happened and focus moves to the screen's title.
      if (fromBanner) {
        toast(t('runQuitDone', { name }));
        const h = screenOf(prefs.view).querySelector('.screen-title');
        if (h) h.focus({ preventScroll: true });
      }
    },
    runNext() { runNext(); render(); },
    runJump(node) { runJump(Number(node.dataset.value)); render(); },
    restBath() {
      const s = runSheet.stats;
      run.soul = s['soul.total'].value;
      run.masks = s['health.masks'].value;
      runLog(t('logBath', { soul: run.soul, masks: run.masks }));
      saveRun(); render();
    },
    restSit() {
      const lostCocoon = run.lbCocoon;
      runRefill();
      run.lbCocoon = 0;
      run.rest.sat = true;
      run.rest.cocoonTaken = false;          // the bench puts the cocoon back
      runLog(lostCocoon ? t('logSitLost', { n: lostCocoon }) : t('logSit'));
      saveRun(); render();
    },
    restCocoon() {
      if (!run.cocoon || run.rest.cocoonTaken) return;
      run.lbCocoon += run.cocoon;
      run.rest.cocoonTaken = true;
      runLog(t('logCocoon', { n: run.cocoon }));
      saveRun(); render();
    },
    target(node) { fight.target = node.dataset.id; render(); },
    summon(node) {
      const f = foe(); if (!f) return;
      const x = summonsOf(f).find((y) => y.k === Number(node.dataset.id));
      const sub = x && F.FOE_BY_ID[x.id];
      if (!sub) return;
      const hp = x.hp !== undefined ? x.hp : foeMaxHp(sub, 'base');
      fight.minions.push({ id: sub.id, name: sub.name, hp, max: hp, noSoul: !!sub.noSoul });
      logLine(t('logSummon', { name: pick(sub.name), n: NF[0].format(hp) }));
      fight.started = true;
      render();
    },
    hit(node) {
      const f = foe(); if (!f) return;
      // A finished fight doesn't carry on: neither the Hall mark nor the log is touched.
      if (fight.over || !alive()) return;
      const m = knightMoves().find((x) => x.id === node.dataset.id);
      if (!m) return;
      if (m.cost && fight.soul < m.cost) { toast(t('noSoulFor')); return; }
      if (m.heal && fight.masks >= fs().stats['health.masks'].value) { toast(t('fullHealth')); return; }
      if (m.broken) { toast(t('shieldBroken')); return; }
      if ((m.dmg !== undefined || m.needsFoe) && !targetOf()) { toast(t('fightInvuln')); return; }
      // The numbers and the rules are in js/fight.js; here the button is only translated into an action.
      const [type, key] = m.id.split(':');
      const action = type === 'nail' ? { type: 'strike' } : type === 'wait' ? { type: 'wait', s: m.wait }
        : type === 'spell' ? { type, key, sel: fight.spellSel[key] } : { type, key };
      const evs = FT.apply(fight, action, fightCtx());
      if (m.heal) hudEvent = 'focus';
      afterAction(evs);
    },
    foehit(node) { foeHitAct(node, false); },
    foenegate(node) { foeHitAct(node, true); },
    // Up to which notch they land, a part yes or no, the side or Vengeful Spirit's double (spellSelHtml).
    spellSel(node) {
      const [key, id, op, arg] = node.dataset.id.split(':');
      const st = fs().stats['spell.' + key];
      const im = st && st.impacts && st.impacts.find((x) => x.id === id);
      if (!im) return;
      const sel = fight.spellSel[key] || (fight.spellSel[key] = {});
      const cur = FT.impactCount(im, sel, fightCtx());
      if (op === 'left' || op === 'right') sel.side = op;
      else if (op === 'toggle') sel[id] = cur > 0 ? 0 : im.count;
      else if (op === 'twice') sel[id] = cur === 2 ? 1 : 2;
      else if (op === 'set') {
        // Like the health masks: lights up to the dot tapped; the last lit one goes out.
        const k = Math.max(0, Math.min(im.twice ? 1 : im.count, Number(arg)));
        sel[id] = k === cur && !im.twice ? k - 1 : k;
      }
      render();
    },
    // The "?" of an attack or of the enemy's side: opens or closes its explanation (helpBtn). Focus
    // comes back to it on repaint, so with the keyboard it opens and closes without losing your place.
    help(node) {
      const id = node.dataset.id;
      if (helpOpen.has(id)) helpOpen.delete(id); else helpOpen.add(id);
      render();
    },
    foeblock(node) { foeHitAct(node, false, true); },   // "Blocked": Dreamshield swallows it
    // "Done": the heal finished before the next hit (closes the window without acting).
    focusDone() {
      if (!fight.focusing) return;
      afterAction(FT.apply(fight, { type: 'focusDone' }, fightCtx()));
    },
    row(node) {
      const id = node.dataset.id;
      const i = prefs.open.indexOf(id);
      if (i >= 0) prefs.open.splice(i, 1); else prefs.open.push(id);
      savePrefs();
      node.classList.toggle('is-open', i < 0);
      node.setAttribute('aria-expanded', i < 0);
    },
  };

  /* When typing, the cursor jumps to the first match, as in any search box. */
  document.addEventListener('input', (ev) => {
    if (!ev.target.matches('.jr-search')) return;
    pickerQuery = ev.target.value;
    const matches = foeMatches(prefs.foeKind);
    jrCursor = matches.length ? matches[0].id : '';
    paintJournal();
    const l = el.fight.querySelector('.jr-list');
    if (l) l.scrollTop = 0;
  });
  // The Journal isn't a dropdown: it doesn't close on a tap outside, only with its button or Esc.
  document.addEventListener('click', (ev) => {
    const node = ev.target.closest('[data-act]');
    if (!node) return;
    // A link with Ctrl, Shift or the middle button opens wherever the browser asks.
    if (node.tagName === 'A' && (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button)) return;
    const act = node.dataset.act;
    if (act === 'row' && ev.target.closest('.chip, a, button')) return;
    if (actions[act]) { ev.preventDefault(); actions[act](node); }   // the action already repaints
  });
  /* Hovering a row peeks it on the page, without moving the rectangle (the cursor);
     leaving the list without tapping any brings back the rectangle's one. Tapping it picks it. The
     same in your game's Journal, where tapping selects it for marking. */
  const inList = (n, sel) => !!(n && n.closest && n.closest(sel));
  document.addEventListener('mouseover', (ev) => {
    const rowEl = ev.target.closest && ev.target.closest('.jr-row, .hj-row');
    if (!rowEl) return;
    if (rowEl.matches('.jr-row')) {
      if (rowEl.dataset.id === (jrPeek || jrCursor)) return;
      jrPeek = rowEl.dataset.id;
      const page = el.fight.querySelector('.journal .jr-page');
      if (page) page.innerHTML = jrPage(F.FOE_BY_ID[jrPeek]);
    } else if (!jrNarrow.matches) {
      if (rowEl.dataset.id === (hjPeek || hjCursor)) return;
      hjPeek = rowEl.dataset.id;
      hjShowPage(hjPeek);
    }
  });
  document.addEventListener('mouseout', (ev) => {
    if (jrPeek && inList(ev.target, '.jr-list') && !inList(ev.relatedTarget, '.jr-list')) { jrPeek = null; paintPage(); }
    if (hjPeek && inList(ev.target, '.hj-list') && !inList(ev.relatedTarget, '.hj-list')) { hjPeek = null; hjShowPage(hjCursor); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (pickerOpen && ev.target.closest && ev.target.closest('.journal, .jr-toggle')) {
        // First it clears what's typed; if nothing is typed, it closes.
        const inp = el.fight.querySelector('.jr-search');
        if (pickerQuery) { pickerQuery = ''; if (inp) inp.value = ''; jrKeepCursor(); paintJournal(); jrScroll(true); }
        else { pickerOpen = false; render(); const b = el.fight.querySelector('.jr-toggle'); if (b) b.focus(); }
      }
      // With the tablet open, Esc goes back to the statues from anywhere in the Hall
      // (or with no focus, after tapping a row, which isn't a control).
      else if (hallTablet && !el.fight.hidden && el.fight.querySelector('.tablet')
        && (ev.target === document.body || (ev.target.closest && ev.target.closest('.fight-body.hall')))) actions.tabletClose();
      return;
    }
    // In the Hall the arrows move the chosen statue across the grid.
    if (ev.target.matches && ev.target.matches('.ped-btn') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ev.key)) {
      ev.preventDefault();
      hallMove(ev.key, ev.target);
      return;
    }
    // In the Journal the arrows move the cursor, from the search box or from the list.
    if (pickerOpen && ev.target.matches && ev.target.matches('.jr-search, .jr-row')) {
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[ev.key]
        || (ev.target.matches('.jr-row') && { Home: 'first', End: 'last' }[ev.key]);
      if (step) { ev.preventDefault(); jrMove(step, ev.target); return; }
    }
    // Enter in the search box fights the entry being read (in the list, Enter already
    // presses the row, which is a button).
    if (ev.key === 'Enter' && ev.target.matches('.jr-search')) {
      ev.preventDefault();
      const rowEl = jrCursor && el.fight.querySelector('#jr-' + jrCursor);
      if (rowEl) actions.foe(rowEl);
      return;
    }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.stat[data-act="row"]')) { ev.preventDefault(); actions.row(ev.target); }
  });

  /* With a mouse, the detail follows the pointer across the grid and the equipped ones, and on
     leaving them goes back to the chosen one; between slots the last one stays, so it doesn't
     flicker. With the keyboard, the focused charm is the chosen one. And hovering a chip in the
     full sheet lights up on the grid the charm that moves it. */
  const charmTile = (n) => (n && n.closest ? n.closest('.quick-grid .qc, .eq-row .eq') : null);
  el.panel.addEventListener('mouseover', (ev) => {
    const chip = ev.target.closest('[data-charm]');
    if (chip) for (const id of chip.dataset.charm.split(' ')) {
      const tile = el.panel.querySelector(`.quick-grid .qc[data-id="${id}"]`);
      if (tile) tile.classList.add('is-hot');
    }
    if (!hoverable.matches) return;
    const tile = charmTile(ev.target);
    if (!tile || tile.dataset.id === detailHover) return;
    detailHover = previewId = tile.dataset.id;
    paintDetail(false);
  });
  el.panel.addEventListener('mouseout', (ev) => {
    if (ev.target.closest('[data-charm]')) for (const tile of el.panel.querySelectorAll('.qc.is-hot')) tile.classList.remove('is-hot');
    if (!detailHover || !charmTile(ev.target)) return;
    const to = ev.relatedTarget;
    if (to && to.closest && to.closest('.quick-grid, .eq-row')) return;
    detailHover = previewId = '';
    paintDetail(false);
  });
  el.panel.addEventListener('focusin', (ev) => {
    const tile = charmTile(ev.target);
    if (refocusing || !tile || tile.dataset.id === detailSel) return;
    detailSel = tile.dataset.id;
    paintDetail();
  });
  /* Back and Forward. The entries the site leaves (marked with {hk: 1}) only change the
     screen: the build is the current one, and the entry is rewritten with it. Otherwise, going
     back from Your game would return the nail you used to have. A link typed or pasted by hand
     does bring its build, its language and its screen (without "view=", Charms). On going back,
     popstate and hashchange fire at once: the second call finds nothing left to do. */
  function onHistory() {
    const h = splitHash(location.hash);
    if (history.state && history.state.hk) {
      const v = h.view || 'charms';
      if (v === prefs.view && location.hash === hashFor()) return;
      if (v !== prefs.view) setView(v);
      writeUrl(false);
      render();
      return;
    }
    if (h.lang && h.lang !== prefs.lang) { prefs.lang = I.setLang(h.lang); prefs.langChosen = true; savePrefs(); rebuildNF(); }
    setView(h.view || 'charms');
    let kept = false;
    if (!C.isEmpty(h.build)) {
      let next = C.decode(h.build);
      // Halfway through a pantheon, a link changes the rest of the build but not the charms.
      kept = charmLock() && touchesCharms(next);
      if (kept) next = C.normalize({ ...next, charms: state.charms, notches: state.notches });
      next = withFixed(next);
      if (!C.equal(next, state)) { state = next; save(KEY.build, C.encode(state)); }
    }
    writeUrl(false);
    recompute();
    render();
    if (kept) toast(t('runLockUrl'));
  }
  window.addEventListener('popstate', onHistory);
  window.addEventListener('hashchange', onHistory);

  /* ── The Hunter's Journal: your game ─────────────────────────────────
     The Journal's quest, as in the game: the 168 entries in their order, and for each one
     where you stand in your real game, marked by hand (the rules, in js/hunter.js). It isn't
     the combat Journal, which picks an enemy: this is its own screen, the fourth in the bar,
     and the simulator never touches it.
     As in the game: what hasn't been encountered is shadowed, the description appears on
     encountering it and the Hunter's notes on completing it; until then, "Defeat N more to
     decipher the Hunter's notes", and that sentence is the control itself. Everything carries
     the hj- prefix: the combat Journal (.journal, .jr-row) has global handlers that mustn't fire. */
  const HJ = HK.hunter;
  const KEY_JOURNAL = 'hollow.journal';
  const hjSec = el.hj;
  const hjNav = $('#nav-hj');
  let hjEnter = false;              // the Journal was just entered: the entry being read, in view
  let book = {};                    // { id: defeats left }, the same thing the game saves
  let hjCursor = null;              // the entry being read: on mount, the first one you're missing
  let hjReading = false;            // on mobile: the page shows instead of the list
  /* What the list shows, by state, with the words of each entry's control: 'unseen'
     (not encountered), 'seen' (encountered, with the notes still to decipher) and 'done'
     (completed). Only the tabs above the list choose it: the Hunter's counts are figures, not
     buttons (Albert doesn't want them clickable). */
  const HJ_STATES = ['unseen', 'seen', 'done'];
  let hjShow = new Set(HJ_STATES);
  const hjStateKey = (s) => (s.done ? 'done' : s.seen ? 'seen' : 'unseen');
  const hjShowAll = () => hjShow.size === HJ_STATES.length;
  let hjQuery = '';
  let hjTimer = 0;
  let hjBulkOpen = false;           // the "Mark in bulk" panel, open
  let hjInk = null;                 // the entry just completed: its notes ink in
  let hjUndo = null;                // { prev, what, n, picked }: the last bulk action, to undo it
  let hjPicked = new Set();         // the ones picked with their checkbox, to mark in bulk
  let hjPickAnchor = '';            // the last checkbox touched: with Shift the range up to it is picked
  let hjShift = false;              // whether the last click inside the Journal had Shift held
  /* The charms you've found in your real game, marked by hand on Your game. They don't go in
     the build or the URL: the build is what you wear; this, what you have. With nothing
     saved, all of them, which is what the site took for granted before. */
  let owned = C.OWN_MAX.slice();   // C.ownNormalize tokens: charms, broken ones and the White Fragment
  const isMaxOwned = () => owned.length === C.OWN_MAX.length && C.OWN_MAX.every((tk) => owned.includes(tk));
  const loadOwned = () => {
    try {
      const list = JSON.parse(load(KEY.owned) || 'null');
      owned = Array.isArray(list) ? C.ownNormalize(list) : C.OWN_MAX.slice();   // with nothing, the maximum
    } catch (e) { owned = C.OWN_MAX.slice(); }
  };
  const saveOwned = () => save(KEY.owned, isMaxOwned() ? null : JSON.stringify(owned));
  const isOwned = (id) => C.ownEquippable(owned, id);
  /* Void Heart can't be removed (wiki, "Void Heart"): if you have it, it's always equipped. It
     costs 0 notches, and the Pantheons' Charms binding already removes it in the engine. */
  const withFixed = (st) => (isOwned('voidheart') && !st.charms.includes('voidheart')
    ? C.normalize({ ...st, charms: [...st.charms, 'voidheart'] }) : st);
  const isFixed = (id) => id === 'voidheart' && isOwned('voidheart');
  /* Changes the collection. You never wear something you don't have: whatever leaves is removed,
     and Void Heart goes in by itself. */
  function setOwned(list) {
    const was = owned;
    owned = C.ownNormalize(list);
    const next = withFixed(C.normalize({ ...state, charms: state.charms.filter((id) => isOwned(id)) }));
    if (C.equal(next, state)) { saveOwned(); render(); return; }
    if (commit(next)) saveOwned(); else { owned = was; render(); }
  }

  const loadJournal = () => {
    try { book = HJ.normalize(JSON.parse(load(KEY_JOURNAL) || '{}')); } catch (e) { book = {}; }
  };
  const saveJournal = () => save(KEY_JOURNAL, Object.keys(book).length ? JSON.stringify(book) : null);

  const hjState = (id) => HJ.stateOf(book, id, marks);   // the Idol looks at the Hall's marks
  const hjEntry = (id) => HJ.EXTRAS[id] || J.ENTRIES[id] || {};
  const hjNameOf = (r) => r.name || (HJ.EXTRAS[r.id] || F.FOE_BY_ID[r.id]).name;
  // The portrait: the entry's; the extras, their own; the Idol, its level's in the Hall; the
  // Seal of Binding has no artwork of its own and shows its medallion large.
  const hjArt = (r, s) => (r.id === HJ.IDOL ? `assets/hall/idol-${s.tier || 'at'}.png`
    : r.id === 'seal-of-binding' ? D.art('journal', r.id)
    : HJ.EXTRAS[r.id] ? D.art('hunter', r.id) : D.art('enemies', r.id));
  const hjMedal = (r, s) => `<span class="hj-medal"><img src="${D.art('journal', r.id)}" alt="" loading="lazy">${s.done
    ? `<img class="hj-frame" src="${D.art('hunter', 'frame')}" alt="">` : ''}</span>`;
  const hjStateText = (s) => t(s.done ? 'hjDone' : s.seen ? 'hjSeen' : 'hjUnseen');

  /* The list: the search removes what doesn't match, in both languages; the tabs keep the
     chosen states, but never hide the entry being read: marking it doesn't make it
     disappear under your finger. Mark in bulk uses the strict list, without that exception:
     otherwise, completing "encountered" would also complete the one you're reading. */
  const hjMatches = (r) => {
    const q = plain(hjQuery.trim()), n = hjNameOf(r);
    return !q || plain(n.es).includes(q) || plain(n.en).includes(q);
  };
  function hjVisible(strict = false) {
    return HJ.BOOK.filter((r) => hjMatches(r)
      && ((r.id === hjCursor && !strict) || hjShowAll() || hjShow.has(hjStateKey(hjState(r.id)))));
  }

  /* The state tabs, with how many of each there are among what matches the search.
     From "All", a tab keeps only those; with one already chosen, another adds or removes
     itself; with none, "All" comes back. That way the combinations fit: not encountered plus
     encountered is what you're missing. The labels are those of each entry's control (hjUnseen, hjSeen, hjDone). */
  const HJ_TABS = [['all', 'hjShowAll'], ['unseen', 'hjUnseen'], ['seen', 'hjSeen'], ['done', 'hjDone']];
  function hjTabsHtml() {
    const base = HJ.BOOK.filter(hjMatches);
    const n = { all: base.length, unseen: 0, seen: 0, done: 0 };
    // They count like the header: without the 4 the game doesn't count (the Hunter's Mark, the Seal, the Idol and
    // the Weathered Mask), which are still listed. That way "Completed" says the same up there and here.
    for (const r of base) if (!r.uncounted) n[hjStateKey(hjState(r.id))]++;
    return `<span class="hj-tabs" role="group" aria-label="${esc(t('hjShowLbl'))}">${HJ_TABS.map(([v, key]) => {
      const on = v === 'all' ? hjShowAll() : !hjShowAll() && hjShow.has(v);
      return `<button type="button" data-act="hjShowState" data-value="${v}" aria-pressed="${on}" ${v === 'all' ? '' : `title="${esc(t('hjShowTip'))}"`}>
        <span>${esc(t(key))}</span>${v === 'all' ? '' : `<i>${NF[0].format(n[v])}</i>`}</button>`;
    }).join('')}</span>`;
  }

  /* With "Mark in bulk" open, each row carries its checkbox to pick several. The
     checkbox isn't a tab stop (there would be 168): from the keyboard, Space on the row
     being read ticks it. The ones that never change (Crawlid, the Shade, the Idol) have none. */
  const hjPickable = (id) => !['start', 'idol'].includes(HJ.kindOf(id));
  const HJ_CHECK = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 5.2 L4.6 8.2 L10.5 1.8"/></svg>';
  function hjRowsHtml() {
    const visibleRows = hjVisible();
    if (!visibleRows.length) return `<li class="hj-empty" role="presentation">${esc(t('fightNoMatch'))}</li>`;
    return visibleRows.map((r) => {
      const s = hjState(r.id), cur = r.id === hjCursor, entryName = pick(hjNameOf(r));
      const isPicked = hjBulkOpen && hjPicked.has(r.id);
      const leftBadge = s.seen && !s.done && HJ.kindOf(r.id) === 'count'
        ? `<span class="hj-left" title="${esc(t('hjLeftShort', { n: NF[0].format(s.left) }))}">${NF[0].format(s.left)}</span>` : '';
      const pickBox = !hjBulkOpen ? '' : hjPickable(r.id)
        ? `<button type="button" class="hj-pick" role="checkbox" aria-checked="${isPicked}" tabindex="-1" data-act="hjPick" data-id="${r.id}"
            aria-label="${esc(t('hjPick', { name: entryName }))}"><span class="hj-box">${isPicked ? HJ_CHECK : ''}</span></button>`
        : '<span class="hj-pick is-fixed" aria-hidden="true"></span>';
      return `<li role="presentation" class="${hjBulkOpen ? 'is-picking' : ''}">${pickBox}<button type="button" role="option" id="hj-e-${r.id}"
        class="hj-row ${cur ? 'is-cur' : ''} ${s.seen ? '' : 'is-unseen'} ${s.done ? 'is-done' : ''} ${isPicked ? 'is-picked' : ''}"
        aria-selected="${cur}" tabindex="${cur ? 0 : -1}" data-act="hjRead" data-id="${r.id}">
        ${hjMedal(r, s)}<span class="hj-name">${esc(entryName)}</span>${leftBadge}
        <span class="sr-only"> · ${esc(hjStateText(s))}${isPicked ? ' · ' + esc(t('hjPicked')) : ''}</span></button></li>`;
    }).join('');
  }

  /* The entry's control. The counted ones carry the three states; the yes-or-no ones, two;
     the Hunter's Mark, the Hunter's button once he can give it; and the ones that aren't
     marked, nothing. No boxes: text at the foot of the page, like the Combat tabs. */
  function hjControlHtml(r, s) {
    const k = HJ.kindOf(r.id);
    if (k === 'start' || k === 'idol') return '';
    if (k === 'mark' && !s.done) {
      return HJ.markReady(book)
        ? `<button type="button" class="btn btn-primary hj-reward" data-act="hjSet" data-id="${r.id}" data-value="done">${esc(t('hjReward'))}</button>` : '';
    }
    const opts = k === 'count' ? ['none', 'seen', 'done'] : ['none', 'done'];
    const on = s.done ? 'done' : s.seen ? 'seen' : 'none';
    const lbl = { none: 'hjUnseen', seen: 'hjSeen', done: 'hjDone' };
    // With its label in view: the list's tabs use the same words, but they filter;
    // this marks your game.
    return `<span class="hj-state" role="group" aria-labelledby="hj-state-lbl"><span class="hj-state-lbl" id="hj-state-lbl">${esc(t('hjStateLbl'))}</span>${opts.map((v) =>
      `<button type="button" data-act="hjSet" data-id="${r.id}" data-value="${v}" aria-pressed="${on === v}">${esc(t(lbl[v]))}</button>`)
      .join('<span class="hj-state-sep" aria-hidden="true">·</span>')}</span>`;
  }

  /* "Defeat [−] N [+] more to decipher the Hunter's notes.": the game's sentence, and the
     number is the control. "−" is one more defeat (fewer left). */
  function hjKillsHtml(r, s) {
    const max = HJ.maxLeft(r.id);
    return `<p class="hj-kills">${esc(t('hjKill1'))}
      <span class="hj-stepper">
        <button type="button" class="hj-step" data-act="hjStep" data-id="${r.id}" data-value="-1" title="${esc(t('hjStepDown'))}" aria-label="${esc(t('hjStepDown'))}">−</button>
        <input type="number" class="hj-count" data-id="${r.id}" value="${s.left}" min="0" max="${max}" step="1" inputmode="numeric" aria-label="${esc(t('hjLeftLbl'))}">
        <button type="button" class="hj-step" data-act="hjStep" data-id="${r.id}" data-value="1" title="${esc(t('hjStepUp'))}" aria-label="${esc(t('hjStepUp'))}" ${s.left >= max ? 'disabled' : ''}>+</button>
      </span>
      ${esc(t('hjKill2'))}</p>`;
  }

  /* The page, like the game's: portrait with its light, name, the flourish, the description and
     the Hunter's notes in his handwriting. Only what the game shows, plus what's needed to
     mark it. Encountered and not completed, the notes are there but can't be read: blurred
     ink under "Defeat N more to decipher…". On completing it, the ink settles (hjInk). */
  function hjPageHtml(id = hjCursor) {
    const r = HJ.ROW[id];
    if (!r) return '';
    const s = hjState(r.id), k = HJ.kindOf(r.id), e = hjEntry(r.id);
    const desc = e.desc && (e.desc.at ? e.desc[s.tier || 'at'] : e.desc);   // the Idol, by level
    const aside = (key, vars) => `<p class="hj-aside">${esc(t(key, vars))}</p>`;
    let text = '';
    if (s.seen && desc) text += `<p class="hj-desc">${esc(pick(desc))}</p>`;
    if (s.done && e.notes) text += `<p class="hj-notes ${hjInk === r.id ? 'is-inking' : ''}">${esc(pick(e.notes))}</p>${e.by ? `<p class="hj-by">— ${esc(pick(e.by))}</p>` : ''}`;
    if (s.seen && !s.done && k === 'count') text += hjKillsHtml(r, s);
    if (s.seen && !s.done && e.notes) text += `<p class="hj-sealed" aria-hidden="true">${esc(pick(e.notes))}</p>`;
    if (!s.seen && k !== 'idol' && k !== 'mark') text += aside('hjNotYet');
    if (k === 'start') text += aside('hjStart');
    if (r.auto && !s.seen) text += aside('hjAuto');
    if (r.inspect && !s.done) text += aside(r.kills == null ? 'hjInspect' : 'hjInspectOr') + `<p class="hj-inspect">${esc(pick(r.inspect))}</p>`;
    if (k === 'idol') text += s.tier ? aside('hjIdolTier', { diff: t(DIFF_KEY[s.tier]) }) : aside('hjIdolFrom');
    if (k === 'mark' && !s.done && !HJ.markReady(book)) {
      const n = HJ.markLeft(book);
      text += aside(n === 1 ? 'hjMarkLockedOne' : 'hjMarkLocked', { n: NF[0].format(n), total: NF[0].format(HJ.REQUIRED) });
    }
    /* The control goes at the top, before the portrait: at the foot it sat 600 px below the edge
       of the window, and whoever came in for the first time didn't know the page can be marked. */
    const control = hjControlHtml(r, s);
    return `<button type="button" class="btn hj-back" data-act="hjBack">‹ ${esc(t('jrBack'))}</button>
      ${control ? `<div class="hj-mark">${control}</div>` : ''}
      <div class="hj-art ${s.seen ? '' : 'is-shadow'} ${r.id === 'seal-of-binding' ? 'is-medal' : ''}"><img src="${hjArt(r, s)}" alt="" onerror="this.classList.add('is-missing')"><span class="hj-folio" aria-hidden="true">${esc(t('hjFolio', { n: NF[0].format(r.n) }))}</span></div>
      <h3 class="hj-page-name">${esc(pick(hjNameOf(r)))}</h3>
      <img class="hj-fleur" src="${D.art('hunter', 'fleur')}" alt="" width="237" height="37">
      <div class="hj-text">${text}</div>`;
  }

  /* The Hunter and the counts, loose on the black like the Charms sheet. He says what he'd say if you went to see him (hunterLine); the
     counts are the game's with World Sense, and they're read-only: filtering is the list
     tabs' job. */
  function hjTopHtml() {
    const c = HJ.counts(book);
    const lineKey = HJ.hunterLine(book);
    const saysHtml = t('hjSays' + lineKey[0].toUpperCase() + lineKey.slice(1)).split(/\n\n+/).map((p) => `<p>${esc(p.trim())}</p>`).join('');
    const tally = (key, n) => `<li class="hj-tally">
        <span class="hj-count-num"><b>${NF[0].format(n)}</b><i class="u">/${NF[0].format(c.total)}</i></span>
        <span class="hj-count-lbl">${esc(t(key))}</span></li>`;
    const markDone = hjState(HJ.MARK).done;
    const feat = (key, textKey, n, isDone) => `<li class="hj-feat ${isDone ? 'is-done' : ''}" title="${esc(t(textKey))}">
      <span class="hj-feat-lbl">${esc(t(key))}</span>
      <span class="hj-feat-num"><b>${NF[0].format(n)}</b><i class="u">/${NF[0].format(c.required)}</i></span></li>`;
    return `<div class="hj-hunter">
        <span class="hj-hunter-fig"><img class="hj-hunter-art" src="${D.art('hunter', 'hunter')}" alt=""></span>
        <div class="hj-hunter-body">
          <h3 class="hj-hunter-name"><small>${esc(t('hjSuper'))}</small> ${esc(t('hjMain'))}</h3>
          <blockquote class="hj-says">${saysHtml}</blockquote>
        </div>
        <div class="hj-hunter-side">
          <ul class="hj-counts" aria-label="${esc(t('hjCountsTitle'))}" title="${esc(t('hjRules'))}">${tally('hjSeen', c.encountered)}${tally('hjDone', c.completed)}</ul>
          <p class="hj-total-note">${esc(t('hjTotalNote', { req: NF[0].format(c.required), max: NF[0].format(c.max) }))}</p>
          <ul class="hj-feats">${feat('hjKeen', 'hjKeenText', c.reqSeen, c.reqSeen === c.required)}${feat('hjTrue', 'hjTrueText', c.reqDone, markDone)}</ul>
          <p class="hj-howto">${esc(t('hjHowTo'))}</p>
        </div>
      </div>`;
  }

  /* Mark in bulk, as in the Hall, but at the foot of the list, which is where you pick:
     collapsed, and on opening it, checkboxes on the rows and encounter, complete or unmark at
     once the ones picked; with none picked, whatever is in the list (with no filter or search, all
     168). The rules are the one-by-one ones (HJ.bulk). Each button says how many would change
     and, if none, it's dimmed. Unmarking wipes your real game: the last action can be undone
     until the next change. */
  const HJ_BULK = [['seen', 'hjBulkSeen'], ['done', 'hjBulkDone'], ['none', 'hjBulkNone']];
  const hjBulkIds = () => {
    const pickedIds = HJ.BOOK.filter((r) => hjPicked.has(r.id)).map((r) => r.id);
    return pickedIds.length ? { ids: pickedIds, picked: true } : { ids: hjVisible(true).map((r) => r.id), picked: false };
  };
  function hjBulkHtml() {
    const toggle = `<button type="button" class="text-btn hj-bulk-toggle" data-act="hjBulk" aria-expanded="${hjBulkOpen}"
      title="${esc(t('hjBulkHint'))}">${esc(t('hjBulk'))}${chevron(hjBulkOpen)}</button>`;
    if (!hjBulkOpen) return `<div class="hj-bulk-head">${toggle}</div>`;
    const { ids, picked } = hjBulkIds();
    const scopeLbl = picked
      ? (ids.length === 1 ? t('hjBulkScopePickedOne') : t('hjBulkScopePicked', { n: NF[0].format(ids.length) }))
      : (ids.length === 1 ? t('hjBulkScopeOne') : t('hjBulkScope', { n: NF[0].format(ids.length) }));
    const sep = '<span class="hj-bulk-sep" aria-hidden="true">·</span>';
    const bulkBtns = HJ_BULK.map(([v, key]) => {
      const n = HJ.changed(book, HJ.bulk(book, ids, v));
      return `<button type="button" class="hj-bulk-btn" data-act="hjBulkDo" data-value="${v}" ${n ? '' : 'disabled'}
        title="${esc(t('hjBulkCount', { n: NF[0].format(n) }))}">${esc(t(key))} <i>${NF[0].format(n)}</i></button>`;
    }).join('');
    const undoNote = hjUndo ? `<p class="hj-bulk-done"><span role="status">${esc(t(
      'hjBulkDid' + hjUndo.what[0].toUpperCase() + hjUndo.what.slice(1) + (hjUndo.n === 1 ? 'One' : ''), { n: NF[0].format(hjUndo.n) }))}</span>
      <button type="button" class="text-btn hj-undo" data-act="hjUndo">${esc(t('hallUndo'))}</button></p>` : '';
    const pickable = hjVisible(true).filter((r) => hjPickable(r.id));
    const pickBtns = `<span class="hj-bulk-picks">
        <button type="button" class="hj-pick-btn" data-act="hjPickAll" ${pickable.every((r) => hjPicked.has(r.id)) ? 'disabled' : ''}>${esc(t('hjPickAll'))}</button>${sep}<button
          type="button" class="hj-pick-btn" data-act="hjPickNone" ${hjPicked.size ? '' : 'disabled'}>${esc(t('hjPickNone'))}</button>
      </span>`;
    // In the DOM, the button that opens it comes first; on screen, at the very bottom (column-reverse), so
    // it doesn't move on opening and the panel grows upwards, eating as little of the list as possible.
    return `<div class="hj-bulk-head">${toggle}${pickBtns}</div>
      <div class="hj-bulk">
        <p class="hj-bulk-scope" title="${esc(t('hjBulkPickHint'))}"><span class="lbl" id="hj-bulk-scope">${esc(scopeLbl)}</span>${picked ? '' : `<span class="hj-bulk-rule">${esc(t('hjBulkPickShort'))}</span>`}</p>
        <div class="hj-bulk-acts" role="group" aria-labelledby="hj-bulk-scope">${bulkBtns}</div>
        ${undoNote}
      </div>`;
  }

  /* The screen is mounted the first time it's entered; after that its parts are repainted,
     keeping the search box (with its cursor), the list's and the page's scroll, and the notice.
     It goes like the others: the black with its corner brackets and its centred title; below,
     the Hunter, and the list and the page, which measure what's left of the window under the
     bar and scroll inside. */
  function renderHunter() {
    // It opens on the first entry you're missing that can be marked: Crawlid and the Shade
    // come complete and have no control, and opening on them hid that the Journal can be marked.
    if (!hjCursor) hjCursor = (HJ.BOOK.find((r) => hjPickable(r.id) && !hjState(r.id).done) || HJ.BOOK[0]).id;
    hjSec.innerHTML = `<div class="hj-body">${brackets}
        <div class="hj-head"></div>
        <section class="hj-top"></section>
        <div class="hj-pane">
          <div class="hj-index">
            <input type="search" class="hj-search" autocomplete="off" spellcheck="false" aria-controls="hj-list">
            <div class="hj-show"></div>
            <ul class="hj-list" id="hj-list" role="listbox"></ul>
            <div class="hj-bulkbar"></div>
          </div>
          <article class="hj-page" aria-live="polite"></article>
        </div>
      </div>
      <div class="hj-note" role="status" hidden></div>`;
    paintHunter();
  }
  function paintHunter(focusCount = false) {
    const listEl = hjSec.querySelector('.hj-list');
    if (!listEl) return;
    const page = hjSec.querySelector('.hj-page');
    const listScroll = listEl.scrollTop, pageScroll = page.scrollTop;
    const focus = focusDescriptor();
    hjSec.querySelector('.hj-head').innerHTML = screenHead(esc(t('jrTitle')));
    hjSec.querySelector('.hj-head h2').id = 'hj-title';
    hjSec.querySelector('.hj-top').innerHTML = hjTopHtml();
    const searchBox = hjSec.querySelector('.hj-search');
    searchBox.placeholder = t('jrSearch');
    searchBox.setAttribute('aria-label', t('jrSearch'));
    if (searchBox.value !== hjQuery) searchBox.value = hjQuery;
    listEl.setAttribute('aria-label', t('jrTitle'));
    listEl.innerHTML = hjRowsHtml();
    hjSec.querySelector('.hj-show').innerHTML = hjTabsHtml();
    hjSec.querySelector('.hj-bulkbar').innerHTML = hjBulkHtml();
    hjPeek = null;
    page.innerHTML = hjPageHtml();
    hjInk = null;
    listEl.scrollTop = listScroll;
    page.scrollTop = pageScroll;
    hjSec.querySelector('.hj-pane').classList.toggle('is-reading', hjReading);
    hjSec.querySelector('.hj-top').classList.toggle('is-reading', hjReading);
    if (focusCount) { const n = hjSec.querySelector('.hj-count'); if (n) { n.focus({ preventScroll: true }); n.select(); } }
    else restoreFocus(focus);
    hjFit();   // the Hunter's line can change length when marking
  }

  /* The book measures what's left of the window below the Hunter, so the whole screen fits
     without scrolling: the list and the page scroll inside. It's measured on the document (not
     on the window), so it doesn't matter where the scroll is; with little room, never less than
     300 px, and then the page does scroll. On mobile the list and the page take turns and measure their own. */
  function hjFit() {
    const pane = hjSec.querySelector('.hj-pane');
    if (!pane || prefs.view !== 'journal') return;
    if (jrNarrow.matches) { pane.style.removeProperty('--hj-pane-h'); return; }
    const body = hjSec.querySelector('.hj-body');
    const padBottom = parseFloat(getComputedStyle(body).paddingBottom);
    const paneTop = pane.getBoundingClientRect().top + scrollY;
    pane.style.setProperty('--hj-pane-h', Math.max(300, Math.floor(innerHeight - paneTop - padBottom)) + 'px');
  }
  addEventListener('resize', hjFit);
  if (document.fonts) document.fonts.ready.then(hjFit);

  /* Only the page, to peek an entry on hover (or go back to the selected one when leaving the
     list) without repainting the 168 rows. */
  function hjShowPage(id) {
    const page = hjSec.querySelector('.hj-page');
    if (!page) return;
    page.innerHTML = hjPageHtml(id);
    page.scrollTop = 0;
  }

  /* The Journal's tab in the bar: its name and your completed entries over the game's total. */
  function paintHjNav() {
    const c = HJ.counts(book);
    hjNav.querySelector('.nav-lbl').textContent = t('navJournal');
    hjNav.querySelector('.nav-num').textContent = `${NF[0].format(c.completed)}/${NF[0].format(c.total)}`;
    const lbl = t('hjNav', { title: t('jrTitle'), done: NF[0].format(c.completed), total: NF[0].format(c.total) });
    hjNav.setAttribute('aria-label', lbl);
    hjNav.title = lbl;
  }

  /* The game's notice when an entry changes, with the entry's artwork, just below the bar. */
  function hjNotify(text, id) {
    const n = hjSec.querySelector('.hj-note');
    if (!n) return;
    n.innerHTML = `<img src="${D.art('journal', id)}" alt="" width="42" height="48"><span>${esc(text).replace(/\d+/g, '<b class="hj-note-num">$&</b>')}</span>`;
    n.hidden = false;
    clearTimeout(hjTimer);
    hjTimer = setTimeout(() => { n.hidden = true; }, 2400);
  }

  /* Each change: it's saved, announced like the game does and repainted. If the Hunter's Mark
     goes because the 146 are no longer all there, that's said too. */
  function hjCommit(next, id, focusCount = false) {
    const prev = book;
    book = next;
    hjUndo = null;                  // a change by hand: the bulk one can no longer be undone
    saveJournal();
    const kind = HJ.change(prev, next, id);
    if (kind === 'full') hjInk = id;
    const markLost = HJ.stateOf(prev, HJ.MARK).done && !HJ.stateOf(next, HJ.MARK).done && id !== HJ.MARK;
    paintHunter(focusCount);
    paintHjNav();
    if (markLost) hjNotify(t('hjMarkDropped', { total: NF[0].format(HJ.REQUIRED) }), HJ.MARK);
    else if (kind) hjNotify(id === HJ.MARK ? t('hjMarkKept') : t(kind === 'full' ? 'hjUpdated' : 'hjNewEntry'), id);
  }

  /* Moves the entry being read through the list, like the combat Journal. */
  function hjMove(step, origin) {
    const matches = hjVisible();
    if (!matches.length) return;
    hjCursor = stepCursor(matches, hjCursor, step);
    paintHunter();
    hjScroll(false);
    if (origin && origin.classList.contains('hj-row')) {
      const rowEl = hjSec.querySelector('#hj-e-' + hjCursor);
      if (rowEl) rowEl.focus({ preventScroll: true });
    }
  }
  function hjScroll(center) {
    const listEl = hjSec.querySelector('.hj-list');
    scrollToCur(listEl, listEl && listEl.querySelector('.hj-row.is-cur'), center);
  }

  Object.assign(actions, {
    hjRead(node) {
      hjCursor = node.dataset.id;
      hjReading = true;
      paintHunter();
      // On mobile the page replaces the list: scroll up to it.
      if (jrNarrow.matches) {
        const pane = hjSec.querySelector('.hj-pane');
        if (pane && underNav(pane)) pane.scrollIntoView({ block: 'start' });
      }
    },
    hjBack() {
      hjReading = false;
      paintHunter();
      hjScroll(true);
      const rowEl = hjSec.querySelector('.hj-row.is-cur');
      if (rowEl) rowEl.focus({ preventScroll: true });
    },
    hjSet(node) {
      const id = node.dataset.id, v = node.dataset.value;
      const next = v === 'none' ? HJ.clear(book, id) : v === 'seen' ? HJ.encounter(book, id) : HJ.complete(book, id);
      hjCommit(next, id);
    },
    hjStep(node) { hjCommit(HJ.step(book, node.dataset.id, Number(node.dataset.value)), node.dataset.id); },
    hjShowState(node) {
      const v = node.dataset.value;
      if (v === 'all') hjShow = new Set(HJ_STATES);
      else if (!HJ_STATES.includes(v)) return;
      else if (hjShowAll()) hjShow = new Set([v]);
      else {
        if (hjShow.has(v)) hjShow.delete(v); else hjShow.add(v);
        if (!hjShow.size) hjShow = new Set(HJ_STATES);
      }
      paintHunter();
    },
    hjBulk() {
      hjBulkOpen = !hjBulkOpen;
      if (!hjBulkOpen) { hjPicked = new Set(); hjPickAnchor = ''; }   // collapsing drops the selection
      paintHunter();
    },
    /* One checkbox. With Shift, the range of the list from the last one touched, to the same state. */
    hjPick(node) {
      const id = node.dataset.id;
      if (!hjPickable(id)) return;
      const on = !hjPicked.has(id);
      const ids = hjVisible().map((r) => r.id);
      const a = ids.indexOf(hjPickAnchor), b = ids.indexOf(id);
      const span = hjShift && a >= 0 && b >= 0 ? ids.slice(Math.min(a, b), Math.max(a, b) + 1) : [id];
      for (const x of span.filter(hjPickable)) { if (on) hjPicked.add(x); else hjPicked.delete(x); }
      hjPickAnchor = id;
      paintHunter();
    },
    hjPickAll() {
      for (const r of hjVisible(true)) if (hjPickable(r.id)) hjPicked.add(r.id);
      paintHunter();
    },
    hjPickNone() {
      hjPicked = new Set();
      hjPickAnchor = '';
      paintHunter();
      const b = hjSec.querySelector('[data-act="hjPickAll"]');
      if (b) b.focus({ preventScroll: true });
    },
    /* In bulk, over the ones picked or the current list. Once done, the selection is dropped (it
       has served), and focus moves to "Undo", which brings it back along with what was there. No
       game notice: it isn't something that happens while playing. */
    hjBulkDo(node) {
      const what = node.dataset.value;
      if (!HJ_BULK.some(([v]) => v === what)) return;
      const next = HJ.bulk(book, hjBulkIds().ids, what);
      const n = HJ.changed(book, next);
      if (!n) return;
      hjUndo = { prev: book, what, n, picked: hjPicked };
      hjPicked = new Set();
      hjPickAnchor = '';
      book = next;
      saveJournal();
      paintHunter();
      paintHjNav();
      const b = hjSec.querySelector('[data-act="hjUndo"]');
      if (b) b.focus({ preventScroll: true });
    },
    hjUndo() {
      if (!hjUndo) return;
      const { prev, what, picked } = hjUndo;
      book = prev;
      hjPicked = new Set(picked);
      hjUndo = null;
      saveJournal();
      paintHunter();
      paintHjNav();
      const b = hjSec.querySelector(`[data-act="hjBulkDo"][data-value="${what}"]`);
      if (b) b.focus({ preventScroll: true });
    },
  });

  /* The number is confirmed on release (change) or with Enter, not on every key: repainting
     would take its cursor away. With Enter the focus stays on the new number, to carry on. */
  function hjCount(inp, focusCount) {
    const v = inp.value.trim();
    if (v === '' || !Number.isFinite(Number(v))) { paintHunter(focusCount); return; }
    if (Number(v) === hjState(inp.dataset.id).left) return;
    hjCommit(HJ.set(book, inp.dataset.id, Number(v)), inp.dataset.id, focusCount);
  }
  hjSec.addEventListener('change', (ev) => {
    if (ev.target.matches('.hj-count') && ev.target.isConnected) hjCount(ev.target, false);
  });
  hjSec.addEventListener('input', (ev) => {
    if (!ev.target.matches('.hj-search')) return;
    hjQuery = ev.target.value;
    const matches = hjVisible();
    if (matches.length && !matches.some((r) => r.id === hjCursor)) hjCursor = matches[0].id;
    paintHunter();
    hjSec.querySelector('.hj-list').scrollTop = 0;
  });
  // The actions don't receive the event: the click's Shift is noted earlier, in the capture phase.
  hjSec.addEventListener('click', (ev) => { hjShift = ev.shiftKey; }, true);
  hjSec.addEventListener('keydown', (ev) => {
    // With the checkboxes in view, Space on the row being read picks it (Shift+Space, the range).
    if (ev.key === ' ' && hjBulkOpen && ev.target.matches('.hj-row')) {
      ev.preventDefault();
      const b = hjSec.querySelector(`.hj-pick[data-id="${ev.target.dataset.id}"]`);
      if (b) { hjShift = ev.shiftKey; actions.hjPick(b); }
      return;
    }
    // Esc in the search box with something typed clears it.
    if (ev.key === 'Escape' && ev.target.matches('.hj-search') && hjQuery) {
      ev.preventDefault();
      hjQuery = '';
      paintHunter();
      hjScroll(true);
      return;
    }
    if (ev.key === 'Enter' && ev.target.matches('.hj-count')) { ev.preventDefault(); hjCount(ev.target, true); return; }
    if (ev.target.matches('.hj-search, .hj-row')) {
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[ev.key]
        || (ev.target.matches('.hj-row') && { Home: 'first', End: 'last' }[ev.key]);
      if (step) { ev.preventDefault(); hjMove(step, ev.target); }
    }
  });

  /* ── Startup ─────────────────────────────────────────────────────────── */
  loadPrefs();
  run = loadRun();         // a half-done pantheon survives a page reload
  loadMarks();             // and the Hall of Gods marks, anything
  loadDoor();              // and the lifeblood door's completed bindings
  loadJournal();           // and your game's Hunter's Journal
  loadOwned();             // and the charms you have
  const fromUrl = splitHash(location.hash).lang;
  // The screen: the link's; without it, a link with a build opens Charms, and with no link, wherever you left it.
  const urlHash = splitHash(location.hash);
  prefs.view = urlHash.view || (C.isEmpty(urlHash.build) ? prefs.view : 'charms');
  I.setLang(fromUrl || prefs.lang);
  prefs.lang = I.current;
  if (fromUrl) prefs.langChosen = true;   // a link with a language counts as choosing it
  rebuildNF();
  state = withFixed(loadState());
  // The same when opening a link with a half-done pantheon: the saved charms rule.
  const storedBuild = load(KEY.build);
  if (charmLock() && storedBuild) {
    const kept = C.decode(storedBuild);
    if (touchesCharms(kept)) { state = C.normalize({ ...state, charms: kept.charms, notches: kept.notches }); toast(t('runLockUrl')); }
  }
  const storedBaseline = load(KEY.baseline);
  if (storedBaseline) baseline = C.decode(storedBaseline);
  if (prefs.compare === 'pinned' && !baseline) prefs.compare = 'base';
  persist();
  recompute();           // and with it fightSync(), which hands out combat health and soul
  render();
})();
