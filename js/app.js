/* js/app.js — Hollow's core: state, storage, URL, header, general render and events.
   The page is made of screens, like the game's pause menu: a one-row header, the screen bar
   (with the mini-bar and the Hunter's Journal button) and, one at a time, Charms (the sheet:
   the HUD, the charm band with its detail, the figures, the plates and the collapsible full
   sheet), Your game (nail, body, arts, spells and abilities) and Combat (the arena, the Hall of
   Gods and the Pantheons). The screen travels in the URL ("view=").
   Every state change repaints from templates; a single listener delegated by data-act handles
   the clicks. The language comes from js/i18n.js and applies to the whole render.
   Each screen has its own classic script (js/app-*.js), loaded after this one; they share
   HK.app ("App"). What changes value lives in App and is read as App.state; what doesn't is
   exported once with Object.assign(App, …) and each script takes it at the top from the
   scripts before it. A script reaches what's defined in a later one as App.name, which only
   happens at run time. js/app-boot.js, the last one, starts the page. */
(() => {
  'use strict';
  const HK = globalThis.HK;
  const D = HK.data, E = HK.engine, C = HK.codec, I = HK.i18n, F = HK.foes, PN = HK.pantheons, HG = HK.hall;
  const App = HK.app = {};

  const t = (k, v) => I.t(k, v);
  const pick = (v) => I.pick(v);

  const KEY = { build: 'hollow.build', baseline: 'hollow.baseline', prefs: 'hollow.prefs', run: 'hollow.run', hall: 'hollow.hall', owned: 'hollow.owned', door: 'hollow.bindings' };
  // With no enemy, half of Combat comes out empty: whoever has none starts with the first boss.
  const DEFAULT_FOE = 'false-knight';
  /* The page's own language: es/index.html is the Spanish copy, with its own address so that
     search engines index the Spanish too (the hash's lang= never reaches them). Read before
     setLang() rewrites <html lang>. */
  const PAGE_LANG = document.documentElement.lang === 'es' ? 'es' : 'en';
  const $ = (sel) => document.querySelector(sel);
  const el = {
    page: $('.page'), masthead: $('#masthead'), colophon: $('#colophon'), nav: $('#nav'), panel: $('#panel'),
    mini: $('#minihud'), banner: $('#banner'), gear: $('#gear'), hj: $('#hj'),
    toast: $('#toast'), fx: $('#overcharm-fx'), fight: $('#fight'), saves: $('#saves'),
  };
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)');

  /* The screens, like the pages of the game's pause menu: Charms, Your game, Combat and the
     Journal. And the save slots (js/app-saves.js), which aren't in the bar: the header opens them. */
  const VIEWS = ['charms', 'game', 'fight', 'journal', 'saves'];
  const SPELL_KEYS = ['vs', 'dd', 'hw'];
  const ART_KEYS = ['cyclone', 'dash', 'great'];
  const ART_STAT = { cyclone: 'nail.cyclone', dash: 'nail.dashSlash', great: 'nail.greatSlash' };
  // Positional charms: the arena doesn't simulate them, it names them (design/04 §3.3, family E).
  const POSITIONAL = ['sprintmaster', 'steady', 'heavy', 'longnail', 'pride', 'crest', 'unn'];

  const NEED_KEY = {
    'spell:vs': 'needSpellVs', 'spell:any': 'needSpellAny', 'art:any': 'needArtAny',
    'cloak:1': 'needCloak1', 'cloak:2': 'needCloak2', dream: 'needDream',
  };

  /* ── Utilities ───────────────────────────────────────────────────────── */
  /* Game names stay as the game says them even if a browser translator translates the page:
     Chrome, Edge, Safari and Firefox skip what carries translate="no" (and its title and alt). */
  const NT = ' translate="no"';
  // A contribution's label is a game name when it comes from one (js/engine.js, SRC): not «Knight», masks, vessels or overcharm.
  const namedSrc = (src) => /^(charm|synergy|binding|upgrade:(nail|spell|art))\b/.test(src);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const save = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* no storage */ } };
  App.NF = {};
  const rebuildNF = () => { App.NF = { 0: I.nf(0), 1: I.nf(1), 2: I.nf(2), 3: I.nf(3) }; };
  const pctSpace = () => (I.current === 'es' ? ' %' : '%');

  function fmtValue(v, fmt, approx) {
    if (fmt === 'flag') return v ? t('yes') : t('no');
    let s;
    switch (fmt) {
      case 'int': s = App.NF[0].format(v); break;
      case 'dec1': s = App.NF[1].format(v); break;
      case 'dec2': s = App.NF[2].format(v); break;
      case 'dec3': s = App.NF[3].format(v); break;
      case 'sec': s = App.NF[3].format(v) + ' s'; break;
      case 'pct': s = App.NF[1].format(v) + pctSpace(); break;
      case 'mult': s = '×' + App.NF[2].format(v); break;
      case 'speed': s = App.NF[1].format(v) + ' u/s'; break;
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
      return sign(p) + App.NF[1].format(Math.abs(p)) + pctSpace();
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
  /* What just arrived with the last change (App.was): a charm equipped or found. */
  const justWorn = (id) => !!(App.was && App.state.charms.includes(id) && !App.was.state.charms.includes(id));
  const justFound = (id) => !!(App.was && App.owned.includes(id) && !App.was.owned.includes(id));
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
    const ch = App.flashIds && App.flashIds.get(id);
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
  App.state = C.normalize({});
  App.baseline = null;              // state pinned for comparison, or null
  let prefs = { lang: 'en', langChosen: false, compare: 'base', open: [], view: 'charms', detailOpen: false,
                foeId: '', foeKind: 'all',
                fightTab: 'combat', pantheon: 'master',
                hallId: HG.STATUES[0].id, hallDiff: '',
                bindings: { nail: false, shell: false, charms: false, soul: false },
                melody: 0 };          // hits since the last Carefree Melody block: survives the fight, as in the game
  App.sheet = null;                 // sheet for the current build
  App.cmpSheet = null;              // sheet for the build being compared against
  let impacts = {};                 // charm id → impact on the current build, computed on demand (impact)
  App.flashIds = null;              // id → diff() change for what just changed: only commit()'s render paints it (flash and chip)
  /* What there was before the change, only during the repaint that follows it: the build (commit())
     and the charms found (setOwned()). What just arrived compares against it to light up once
     —the charm equipped, the notches it fills, the mask you add—; the next repaint no longer has it. */
  App.was = null;                   // { state, owned } or null
  App.detailSel = '';               // the charm in the band's detail: the last one touched, pressed or focused
  App.detailHover = '';             // the one under the mouse: it takes over from the chosen one while it lasts
  App.pickerOpen = false;           // the Hunter's Journal, open, to pick an enemy
  App.pickerQuery = '';             // what has been typed in its search box
  App.jrCursor = '';                // the entry being read on its page (not the enemy yet)
  App.jrPeek = null;                // the one peeking on the page with the mouse over it, not picked
  App.hjPeek = null;                // the same in your game's Journal

  function loadPrefs() {
    try { Object.assign(prefs, JSON.parse(load(KEY.prefs) || '{}')); } catch (e) { /* corrupt prefs */ }
    // Until someone chooses (selector or link), the browser's language: the first of its list
    // that the site speaks, and English if none. Spanish used to be saved even when nobody had
    // chosen it, so a saved language that wasn't really chosen isn't honoured.
    if (!prefs.langChosen || !['es', 'en'].includes(prefs.lang)) prefs.lang = browserLang();
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

  function browserLang() {
    let list = [];
    try { list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]; } catch (e) { /* no navigator */ }
    for (const tag of list) {
      const base = String(tag || '').toLowerCase().split('-')[0];
      if (base === 'es' || base === 'en') return base;
    }
    return 'en';
  }

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

  /* A screen's URL: the build, the language if it isn't the page's (English, or Spanish in es/)
     and the screen if it isn't Charms (the start screen). Share leaves it out: the fight doesn't
     travel in the link, so opening it on Combat would show the recipient's own fight. */
  const hashFor = (view = prefs.view) => '#' + C.encode(App.state) + (prefs.lang !== PAGE_LANG ? '&lang=' + prefs.lang : '')
    + (view && view !== 'charms' ? '&view=' + view : '');
  /* The same, as a path to this page. es/index.html carries <base href="../">, and against it a
     bare "#…" would point at the English page. */
  const here = (hash) => location.pathname + location.search + hash;
  /* Every screen change leaves a history entry, so that Back returns to the previous one;
     build changes rewrite the entry you're on. They all carry the mark {hk: 1}: going back
     to one of them changes the screen and nothing else (onHistory). */
  function writeUrl(push) {
    const url = hashFor();
    try {
      if (push) history.pushState({ hk: 1 }, '', here(url));
      else if (location.hash !== url || !(history.state && history.state.hk)) history.replaceState({ hk: 1 }, '', here(url));
    } catch (e) { if (location.hash !== url) location.hash = url; }
  }

  /* A GoatCounter event (index.html loads it). Only the name travels, never the hash with the
     build. Without the script (blocked, offline, file://) it does nothing. */
  function track(name) {
    try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: name, title: name, event: true }); } catch (e) {}
  }

  function persist() {
    save(KEY.build, C.encode(App.state));
    writeUrl(false);
  }

  function compareState() {
    if (prefs.compare === 'pinned' && App.baseline) return App.baseline;
    if (prefs.compare === 'nocharms') return C.normalize({ ...App.state, charms: [] });
    return C.normalize({ ...C.PRESETS.base, hp: App.state.hp });
  }
  const compareLabel = () => (prefs.compare === 'pinned' && App.baseline ? t('vsPinned') : prefs.compare === 'nocharms' ? t('vsNoCharms') : t('vsBase'));

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
    const equipped = App.state.charms.includes(id);
    const action = C.charmAction(App.state, id);
    // With no free notches it's computed "as if you had them", to show what it would do anyway.
    const hypothetical = !equipped && action.action === 'blocked';
    const base = hypothetical ? C.set(App.state, 'notches', D.CHARM_NOTCHES.max) : App.state;
    let withSt, withoutSt;
    if (equipped) {
      withSt = base;
      withoutSt = C.normalize({ ...base, charms: base.charms.filter((x) => x !== id) });
    } else {
      withoutSt = base;
      withSt = C.toggleCharm(base, id) || C.normalize({ ...base, charms: [...base.charms, id] });
    }
    const withSheet = equipped && !hypothetical ? App.sheet : compute(withSt);
    const withoutSheet = !equipped && !hypothetical ? App.sheet : compute(withoutSt);
    let changes = E.diff(withoutSheet, withSheet);
    let cond = null, condSheet = withSheet;
    const onlyOvercharm = changes.every((ch) => OVERCHARM_IDS.has(ch.id));   // also when there are no changes
    if (onlyOvercharm) {
      const s = situationFor(charm, App.state);
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
    return { charm, equipped, action, changes, cond, hypothetical, withSheet: condSheet, unmet: !needsMet(charm, App.state) };
  }

  // It costs two compute() calls: only the charm being looked at is computed, and it holds until the next change.
  const impact = (id) => impacts[id] || (impacts[id] = impactOf(id));

  function recompute() {
    App.sheet = compute(App.state);
    App.cmpSheet = compute(compareState());
    impacts = {};
    App.fightSync();
  }

  /* Applies a new state and repaints. In the middle of a pantheon it rejects anything that
     touches charms or notches (see charmLock) and says so; returns whether it was applied. */
  function commit(next) {
    if (!next) return false;
    next = withFixed(next);
    const lock = App.charmLock();
    if (lock && App.touchesCharms(next)) { toast(lock); return false; }
    const prev = App.sheet;
    const wasOvercharmed = !!(prev && prev.notches.overcharmed);
    const before = App.state;
    App.state = next;
    persist();
    recompute();
    const changes = prev ? E.diff(prev, App.sheet) : [];
    // What just changed flashes once, with its chip: on the next repaint, no longer.
    App.flashIds = new Map(changes.map((c) => [c.id, c]));
    App.was = App.was || { state: before, owned: App.owned };
    render();
    App.flashIds = null;
    App.was = null;
    // Only on the jump to overcharmed: when equipping too much or when notches are taken away.
    if (!wasOvercharmed && App.sheet.notches.overcharmed) overcharmFx();
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
     screen (assets/hall/tablet-hdr.png, white stroke), small—, on its left what belongs to the
     site (the language and Share) and on its right what's yours: the save selector (js/app-saves.js).
     In the markup, in the order they're seen on a wide screen; on mobile the CSS reorders them. The filigree stays white, as in the game: over
     file:// it can't be tinted with mask-image. Title and filigree are a link to the start
     screen, Charms, like the logo on almost any website. */
  /* The save selector: the Knight and the save you're playing, or «Select save» in free mode
     (js/app-saves.js), which is nobody's game. On mobile, the Knight with the save's number, or alone. */
  function saveLink() {
    const n = App.activeSlot();
    const label = n ? t('saveSlot', { n }) : t('saveSelect');
    return `<a class="mh-link mh-save" href="${here(hashFor('saves'))}" data-act="view" data-value="saves"${prefs.view === 'saves' ? ' aria-current="page"' : ''}
          aria-label="${esc(label)}" title="${esc(t('saveBtnHint'))}"><img src="${D.art('hud', 'knight')}" alt=""><span class="mh-save-lbl">${esc(label)}</span>${n ? `<span class="mh-save-n">${n}</span>` : ''}</a>`;
  }
  const VIEW_KEY = { charms: 'navCharms', game: 'navGame', fight: 'navFight', journal: 'navJournal', saves: 'savesTitle' };
  function renderMasthead() {
    document.title = prefs.view === 'charms' ? t('docTitle') : t(VIEW_KEY[prefs.view]) + ' · ' + t('title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('metaDescription'));
    // The screen labels are fixed in index.html: they change with the language.
    el.panel.setAttribute('aria-label', t('navCharms'));
    el.gear.setAttribute('aria-label', t('navGame'));
    el.fight.setAttribute('aria-label', t('navFight'));
    el.hj.setAttribute('aria-label', t('jrTitle'));
    el.saves.setAttribute('aria-label', t('savesTitle'));
    // In the corner, as text: the abbreviation in view and the full name for screen readers and the mouse.
    const langBtn = (code, label) => `<button type="button" lang="${code}" data-act="lang" data-value="${code}" aria-pressed="${prefs.lang === code}" aria-label="${label}" title="${label}">${code.toUpperCase()}</button>`;
    el.masthead.innerHTML = `
      <div class="motes" aria-hidden="true">${MOTES}</div>
      <div class="mh-tools">
        <div class="langsel" role="group" aria-label="${esc(t('langGroup'))}">${langBtn('en', 'English')}${langBtn('es', 'Español')}</div>
        <button type="button" class="mh-link" data-act="share" title="${esc(t('shareHint'))}">${esc(t('share'))}</button>
      </div>
      <a class="brand" href="${here(hashFor('charms'))}" data-act="view" data-value="charms" title="${esc(t('goHome'))}">
        <img class="mh-hdr" src="assets/hall/tablet-hdr.png" alt="" width="862" height="111">
        <h1 class="title">${esc(t('title'))}</h1>
      </a>
      ${saveLink()}`;
  }

  // GitHub's mark (Octicons mark-github), in currentColor so it takes the links' accent.
  const GITHUB = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

  /* The footer, under every screen: that this is a fan project with Team Cherry's artwork, where
     the numbers come from (docs/guide.md, "Credits and licences") and who to write to (docs/guide.md, "Contact"). Small and muted, so it doesn't
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
      })}</p>
      <p>${t('footMade', { mail: '<a href="mailto:betorzdev@gmail.com">betorzdev@gmail.com</a>' })}
        <a class="gh" href="https://github.com/betorzdev/hallownest-calculator" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">${GITHUB}</a></p>`;
  }

  /* The screen bar: Charms, Your game, Combat and the Journal, with your completed ones. It lives
     in index.html and here only its texts and which one is active change: repainted whole, the
     focus would be lost when switching screens. The Journal's text is set by paintHjNav. */
  function renderNav() {
    el.nav.setAttribute('aria-label', t('navLabel'));
    for (const a of el.nav.querySelectorAll('[data-act="view"]')) {
      const v = a.dataset.value;
      if (v !== 'journal') a.textContent = t(VIEW_KEY[v]);
      a.setAttribute('href', here(hashFor(v)));
      if (v === prefs.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    App.paintHjNav();
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
    el.saves.hidden = prefs.view !== 'saves';
  }

  /* The mini-bar, in the screen bar: what you look at while touching charms, with the game's
     sprites instead of labels —the nail, the mask (the blue one if it's all lifeblood), soul and
     a notch— and the DPS, and the same flash as the sheet: on mobile, when you scroll down to the
     grid, the status block stays up top and this is what stays in view. The notch doesn't go in .notches: that row belongs
     to the panel. In combat it shows the figures of the build you're fighting with: in a pantheon
     room, the one frozen on entry and with its bindings (baseSheet), which may not be the sheet's. */
  // The mini-bar's mask: the HUD's, Hiveblood included (and Joni's Blessing, if it's all lifeblood).
  const maskArt = (sh, allLb) => (App.sheetHas(sh, 'hiveblood') ? (allLb ? 'hiveblood-joni' : 'hiveblood') : allLb ? 'mask-lb' : 'mask');
  function renderMiniHud() {
    const inFight = prefs.view === 'fight';
    // With an enemy in front of you (the arena, a Hall statue or a pantheon room), the mini-bar
    // is the fight's scoreboard: your attacks and theirs are a long list, and this keeps their health and
    // yours in view while you scroll down it.
    const score = inFight && App.foe() && App.fight.parts.length ? fightScoreHtml() : '';
    el.mini.classList.toggle('is-fight', !!score);
    if (score) { el.mini.innerHTML = score; return; }
    scorePrev = null;
    const sh = inFight ? App.baseSheet() : App.sheet;
    const s = sh.stats, n = sh.notches;
    const masks = s['health.masks'].value, lb = s['health.lifeblood'].value;
    el.mini.innerHTML = `
      <span class="${App.flashCls('nail.damage').trim()}"><img class="mini-nail" src="${D.art('nails', (inFight ? App.fst() : App.state).nail)}" alt="" width="80" height="360"><b>${esc(fmtStat(s['nail.damage']))}</b></span>
      <span class="${App.flashCls('nail.dps').trim()}"><i class="mini-lbl">${esc(t('dpsShort'))}</i><b>${esc(fmtStat(s['nail.dps']))}</b></span>
      <span class="${App.flashCls('health.total').trim()}"><img class="mini-mask" src="${D.art('hud', maskArt(sh, lb && !masks))}" alt=""><b>${esc(fmtStat(s['health.total']))}</b>${lb && masks ? `<em>(${lb})</em>` : ''}</span>
      <span class="${App.flashCls('soul.total').trim()}"><img class="mini-soul" src="${D.art('hud', 'soul')}" alt=""><b>${esc(fmtStat(s['soul.total']))}</b></span>
      <span class="${n.overcharmed ? 'is-over' : ''}"><i class="notch ${n.overcharmed ? 'is-over' : 'is-used'}"></i><b>${n.used}/${n.max}</b></span>`;
  }

  /* The scoreboard: your masks (with lifeblood) and your soul, and the bar of whoever you're hitting,
     the same one as on their card. Each figure flashes on change, like the build's. */
  let scorePrev = null;
  function fightScoreHtml() {
    const sh = App.fs();
    const lb = (App.fight.lbJoni || 0) + (App.fight.lbCharm || 0) + (App.fight.lbCocoon || 0);
    const [kind, i] = [App.fight.target[0], Number(App.fight.target.slice(1))];
    const part = App.targetOf() || (kind === 'm' ? App.fight.minions : App.fight.parts)[i] || App.fight.parts[0];
    const hp = Math.max(0, part.hp);
    const pct = part.max ? Math.max(0, Math.min(100, hp / part.max * 100)) : 0;
    const now = { masks: App.fight.masks, lb, soul: App.fight.soul, hp, who: App.fight.target };
    const flash = (k) => (scorePrev && scorePrev.who === now.who && scorePrev[k] !== now[k] ? ' is-flash' : '');
    const lbFlash = flash('lb');
    scorePrev = now;
    return `
      <span class="mini-me${flash('masks') || lbFlash}"><img class="mini-mask" src="${D.art('hud', maskArt(sh, lb && !App.fight.masks))}" alt=""><b>${App.fight.masks}</b><i class="mini-of">/${sh.stats['health.masks'].value}</i>${lb ? `<em>(${lb})</em>` : ''}</span>
      <span class="mini-me${flash('soul')}"><img class="mini-soul" src="${D.art('hud', 'soul')}" alt=""><b>${App.fight.soul}</b></span>
      <span class="mini-foe${flash('hp')}">
        <span class="mini-foe-name"${NT}>${esc(pick(part.name))}</span>
        <span class="fbar ${pct <= 25 ? 'is-low' : ''}"><span style="width:${pct}%"></span></span>
        <b>${App.NF[0].format(hp)}</b>
      </span>`;
  }

  /* The notices above the screen. Overcharm, on Your game: on Charms it goes in the band, below
     the notches (charmBand), and in combat the HUD's aura already says it. And, for whoever's
     new on a computer, that the game's save can be imported (js/app-saves.js). */
  function renderBanner() {
    const over = prefs.view === 'game' && App.sheet.notches.overcharmed
      ? `<div class="banner"><span class="banner-tag">${esc(t('overcharmed'))}</span><span class="banner-text">${esc(t('overcharmBanner'))}</span></div>`
      : '';
    // On the Pantheons tab you're already there: the notice doesn't send you where you are.
    const lock = prefs.view === 'fight' && prefs.fightTab === 'pantheon' ? '' : runLockBanner();
    el.banner.innerHTML = over + lock + App.importHint();
  }

  /* The notice that you're in a pantheon, with the button that takes you to the room and the one
     that abandons it without having to go there. */
  function runLockBanner() {
    if (!App.charmLock()) return '';
    const p = PN.PANTHEON_BY_ID[App.run.pantheon];
    const where = t('runLockWhere', { name: pick(p.name), n: App.run.room + 1, total: p.rooms.length });
    const why = t(App.run.bindings.charms ? 'runLockWhyBound' : 'runLockWhy');
    return `<div class="banner is-run" role="status">
      <span class="banner-tag">${esc(t('runLockTag'))}</span>
      <span class="banner-text">${esc(where + ' ' + why)}</span>
      <button type="button" class="btn" data-act="runLockGo">${esc(t('runLockGo'))}</button>
      <button type="button" class="btn" data-act="runQuit">${esc(t('runQuit'))}</button>
    </div>`;
  }
  const hudRing = `<svg class="hud-ring" viewBox="-10 -10 120 120" aria-hidden="true"><path fill-rule="evenodd" d="M104 50A54 54 0 1 0-4 50A54 54 0 1 0 104 50ZM101.3 49.2A50.5 50.5 0 1 1 .3 49.2A50.5 50.5 0 1 1 101.3 49.2Z"/></svg>`;
  /* The tail: a brush stroke that thins towards the tip and ends in a curl. */
  const hudTail = `<svg class="hud-tail" viewBox="0 0 230 16" aria-hidden="true"><path d="M0 5.2C50 3.4 120 8 200 6.1L200 7.5C120 9.6 50 6.6 0 10.4Z"/><path class="hud-curl" d="M199 6.8C210 6 218 8.6 216 12C214 15 208 13.6 210 10.6"/></svg>`;

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

  /* ── General render ──────────────────────────────────────────────────── */
  /* Focus goes back to the same control after repainting. A charm appears in Equipped and in
     the grid with the same data-act and id (and again at the pantheon's bench): it's looked for
     first in the same place, or when equipping from the grid focus would jump to Equipped. */
  App.refocusing = false;           // focus is restored by the repaint, not moved by the person
  function restoreFocus(desc) {
    if (!desc) return;
    const node = (desc.scoped && document.querySelector(desc.scoped)) || document.querySelector(desc.sel);
    if (!node) return;
    App.refocusing = true;
    node.focus({ preventScroll: true });
    App.refocusing = false;
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
    renderBanner();
    App.renderPanel();
    renderMiniHud();
    App.renderGear();
    App.renderFight();
    App.renderSaves();
    if (prefs.view === 'journal') { if (App.hjSec.querySelector('.hj-list')) App.paintHunter(); else App.renderHunter(); }
    showScreen();
    App.bandCheck();                       // the arena's band measures the stage once it's visible
    App.hjFit();
    // On entering the Journal, the entry you're reading shows in its list (already visible, so it can be measured).
    if (App.hjEnter && prefs.view === 'journal') { App.hjEnter = false; App.hjScroll(true); }
    restoreFocus(focus);
    if (App.detailHover) App.highlightRows(App.detailHover);
    if (App.previewId) App.paintPreview();
  }

  /* ── Switching screens ───────────────────────────────────────────────── */
  function setView(v) {
    const was = prefs.view;
    prefs.view = VIEWS.includes(v) ? v : 'charms';
    savePrefs();
    // The tablet is a view of the Hall, not a preference: whoever comes back, comes back to the statues.
    if (prefs.view !== was) App.hallTablet = false;
    if (prefs.view === 'journal' && was !== 'journal') App.hjEnter = true;
    // Entering combat does what opening it used to: the fight, ready, and with no enemy the
    // Journal open, which is where you start.
    if (prefs.view === 'fight' && was !== 'fight') {
      if (!App.fight.started) App.fightReset();
      if (prefs.fightTab === 'combat' && !prefs.foeId) App.openJournal();
    }
  }
  /* Leaves a history entry and scrolls up to the top of the screen, which sits just below the
     bar. If you arrive from inside another screen (the pantheon notice), focus goes
     to its title: the control that had it is no longer visible. */
  function go(v, focusHead) {
    const changed = v !== prefs.view;
    setView(v);
    writeUrl(changed);
    render();
    if (changed) { track('screen-' + prefs.view); fadeIn(screenOf(prefs.view)); }
    if (changed) {
      const start = el.masthead.offsetTop + el.masthead.offsetHeight;   // where the bar stays stuck
      if (scrollY > start) scrollTo(0, start);
    }
    if (focusHead) {
      const h = screenOf(prefs.view).querySelector('.screen-title');
      if (h) h.focus({ preventScroll: true });
    }
  }
  /* The screen you arrive at fades in, like the game's fades between areas (css: .is-entering). */
  const fadeIn = (node) => { node.classList.remove('is-entering'); void node.offsetWidth; node.classList.add('is-entering'); };
  const screenOf = (v) => (v === 'game' ? el.gear : v === 'fight' ? el.fight : v === 'journal' ? el.hj : v === 'saves' ? el.saves : el.panel);
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
  /* What each data-act does. Here, the header's and the link's; each screen's
     script adds its own with Object.assign(actions, …). */
  const actions = {
    lang(node) {
      const next = node.dataset.value;
      if (next === prefs.lang) return;
      prefs.lang = I.setLang(next);
      prefs.langChosen = true;
      track('lang-' + prefs.lang);
      savePrefs();
      rebuildNF();
      persist();
      recompute();
      render();
    },
    // The link carries the build and the language, not the screen.
    share() {
      persist();
      track('share');
      const url = location.href.split('#')[0] + hashFor('');
      const done = () => toast(t('linkCopied'));
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => prompt(t('copyThis'), url));
      else prompt(t('copyThis'), url);
    },
    // From another screen (the notice), focus goes to the new one's title; from the bar or
    // the site's title, it stays on the link pressed.
    view(node) { go(node.dataset.value, !node.closest('#nav, .masthead')); },
  };

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
      if (rowEl.dataset.id === (App.jrPeek || App.jrCursor)) return;
      App.jrPeek = rowEl.dataset.id;
      const page = el.fight.querySelector('.journal .jr-page');
      if (page) page.innerHTML = App.jrPage(F.FOE_BY_ID[App.jrPeek]);
    } else if (!App.jrNarrow.matches) {
      if (rowEl.dataset.id === (App.hjPeek || App.hjCursor)) return;
      App.hjPeek = rowEl.dataset.id;
      App.hjShowPage(App.hjPeek);
    }
  });
  document.addEventListener('mouseout', (ev) => {
    if (App.jrPeek && inList(ev.target, '.jr-list') && !inList(ev.relatedTarget, '.jr-list')) { App.jrPeek = null; App.paintPage(); }
    if (App.hjPeek && inList(ev.target, '.hj-list') && !inList(ev.relatedTarget, '.hj-list')) { App.hjPeek = null; App.hjShowPage(App.hjCursor); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (App.pickerOpen && ev.target.closest && ev.target.closest('.journal, .jr-toggle')) {
        // First it clears what's typed; if nothing is typed, it closes.
        const inp = el.fight.querySelector('.jr-search');
        if (App.pickerQuery) { App.pickerQuery = ''; if (inp) inp.value = ''; App.jrKeepCursor(); App.paintJournal(); App.jrScroll(true); }
        else { App.pickerOpen = false; render(); const b = el.fight.querySelector('.jr-toggle'); if (b) b.focus(); }
      }
      // With the tablet open, Esc goes back to the statues from anywhere in the Hall
      // (or with no focus, after tapping a row, which isn't a control).
      else if (App.hallTablet && !el.fight.hidden && el.fight.querySelector('.tablet')
        && (ev.target === document.body || (ev.target.closest && ev.target.closest('.fight-body.hall')))) actions.tabletClose();
      return;
    }
    // In the Hall the arrows move the chosen statue across the grid.
    if (ev.target.matches && ev.target.matches('.ped-btn') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ev.key)) {
      ev.preventDefault();
      App.hallMove(ev.key, ev.target);
      return;
    }
    // In the Journal the arrows move the cursor, from the search box or from the list.
    if (App.pickerOpen && ev.target.matches && ev.target.matches('.jr-search, .jr-row')) {
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[ev.key]
        || (ev.target.matches('.jr-row') && { Home: 'first', End: 'last' }[ev.key]);
      if (step) { ev.preventDefault(); App.jrMove(step, ev.target); return; }
    }
    // Enter in the search box fights the entry being read (in the list, Enter already
    // presses the row, which is a button).
    if (ev.key === 'Enter' && ev.target.matches('.jr-search')) {
      ev.preventDefault();
      const rowEl = App.jrCursor && el.fight.querySelector('#jr-' + App.jrCursor);
      if (rowEl) actions.foe(rowEl);
      return;
    }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.stat[data-act="row"]')) { ev.preventDefault(); actions.row(ev.target); }
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
      const changed = v !== prefs.view;
      if (changed) setView(v);
      writeUrl(false);
      render();
      if (changed) fadeIn(screenOf(prefs.view));
      return;
    }
    if (h.lang && h.lang !== prefs.lang) { prefs.lang = I.setLang(h.lang); prefs.langChosen = true; savePrefs(); rebuildNF(); }
    setView(h.view || 'charms');
    let kept = false;
    if (!C.isEmpty(h.build)) {
      let next = C.decode(h.build);
      // Halfway through a pantheon, a link changes the rest of the build but not the charms.
      kept = App.charmLock() && App.touchesCharms(next);
      if (kept) next = C.normalize({ ...next, charms: App.state.charms, notches: App.state.notches });
      next = withFixed(next);
      if (!C.equal(next, App.state)) { App.state = next; save(KEY.build, C.encode(App.state)); }
    }
    writeUrl(false);
    recompute();
    render();
    if (kept) toast(t('runLockUrl'));
  }
  window.addEventListener('popstate', onHistory);
  window.addEventListener('hashchange', onHistory);
  /* The charms you've found in your real game, marked by hand on Your game. They don't go in
     the build or the URL: the build is what you wear; this, what you have. With nothing
     saved, all of them, which is what the site took for granted before. */
  App.owned = C.OWN_MAX.slice();   // C.ownNormalize tokens: charms, broken ones and the White Fragment
  const isMaxOwned = () => App.owned.length === C.OWN_MAX.length && C.OWN_MAX.every((tk) => App.owned.includes(tk));
  const loadOwned = () => {
    try {
      const list = JSON.parse(load(KEY.owned) || 'null');
      App.owned = Array.isArray(list) ? C.ownNormalize(list) : C.OWN_MAX.slice();  // with nothing, the maximum
    } catch (e) { App.owned = C.OWN_MAX.slice(); }
  };
  const saveOwned = () => save(KEY.owned, isMaxOwned() ? null : JSON.stringify(App.owned));
  const isOwned = (id) => C.ownEquippable(App.owned, id);
  /* Void Heart can't be removed (wiki, "Void Heart"): if you have it, it's always equipped. It
     costs 0 notches, and the Pantheons' Charms binding already removes it in the engine. */
  const withFixed = (st) => (isOwned('voidheart') && !st.charms.includes('voidheart')
    ? C.normalize({ ...st, charms: [...st.charms, 'voidheart'] }) : st);
  const isFixed = (id) => id === 'voidheart' && isOwned('voidheart');
  /* Changes the collection. You never wear something you don't have: whatever leaves is removed,
     and Void Heart goes in by itself. */
  function setOwned(list) {
    const was = App.owned;
    App.owned = C.ownNormalize(list);
    const next = withFixed(C.normalize({ ...App.state, charms: App.state.charms.filter((id) => isOwned(id)) }));
    App.was = { state: App.state, owned: was };
    if (C.equal(next, App.state)) { saveOwned(); render(); App.was = null; return; }
    if (commit(next)) saveOwned(); else { App.owned = was; App.was = null; render(); }
    App.was = null;
  }

  Object.assign(App, { t, pick, KEY, PAGE_LANG, $, el, hoverable, SPELL_KEYS, ART_KEYS, ART_STAT, POSITIONAL,
    NEED_KEY, NT, namedSrc, esc, load, save, rebuildNF, pctSpace, fmtValue, fmtStat, fmtStatRich, sign,
    masksText, notchText, spellArt, shortOf, badgeText, goodClass, deltaChip, changeChip, prefs, loadPrefs,
    savePrefs, justWorn, justFound, splitHash, here, loadState, persist, compareLabel, compute, impact, recompute, commit, bindAllFx,
    brackets, chevron, cross, rule, screenHead, hudHtml, restoreFocus, focusDescriptor, render, go, screenOf,
    underNav, toast, track, actions, isMaxOwned, loadOwned, saveOwned, isOwned, withFixed, isFixed, setOwned });
})();
